mod commands;

use std::sync::Mutex;

use tauri::{ipc::Invoke, Manager, Runtime};

const DB_FILE: &str = "irontion.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Linux: ~/.local/share/com.irontion.app/irontion.db
            let path = app.path().app_data_dir()?.join(DB_FILE);
            let conn = irontion_core::db::open(&path)?;
            app.manage(commands::Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(handlers())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Every command the frontend may call. Shared by the app and the IPC tests.
fn handlers<R: Runtime>() -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        commands::list_activities,
        commands::create_activity,
        commands::update_activity,
        commands::archive_activity,
        commands::restore_activity,
        commands::delete_activity,
        commands::activity_block_count,
        commands::plan_activity_tree,
        commands::import_activity_tree,
        commands::list_tags,
        commands::create_tag,
        commands::update_tag,
        commands::delete_tag,
        commands::get_day,
        commands::apply_day_changes,
        commands::activity_totals,
        commands::daily_totals,
    ]
}

/// Calls commands the way the frontend does (JSON args, camelCase), through Tauri's mock runtime.
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    use tauri::ipc::{CallbackFn, InvokeBody};
    use tauri::test::{get_ipc_response, mock_builder, MockRuntime, INVOKE_KEY};
    use tauri::webview::InvokeRequest;
    use tauri::{App, WebviewWindow, WebviewWindowBuilder};

    fn app() -> (App<MockRuntime>, WebviewWindow<MockRuntime>) {
        let conn = irontion_core::db::open_in_memory().unwrap();
        let app = mock_builder()
            .manage(commands::Db(Mutex::new(conn)))
            .invoke_handler(handlers())
            // The real generated context, so the app's actual permissions are exercised.
            .build(tauri::generate_context!(test = true))
            .unwrap();
        let window = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        (app, window)
    }

    fn call(window: &WebviewWindow<MockRuntime>, cmd: &str, args: Value) -> Result<Value, Value> {
        let request = InvokeRequest {
            cmd: cmd.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            // The app's own origin (Linux/macOS); remote origins are denied app commands.
            url: "tauri://localhost".parse().unwrap(),
            body: InvokeBody::Json(args),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.into(),
        };
        get_ipc_response(window, request).map(|body| body.deserialize::<Value>().unwrap())
    }

    #[test]
    fn create_paint_and_summarize_over_ipc() {
        let (_app, w) = app();
        let study = call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": null, "name": "Study", "color": "#2a78d6", "tagIds": [] } }),
        )
        .unwrap();
        let id = study["id"].as_i64().unwrap();
        assert_eq!(study["archived"], json!(false));

        let changes: Vec<Value> = (0..3).map(|slot| json!({ "slot": slot, "activityId": id })).collect();
        let day = call(
            &w,
            "apply_day_changes",
            json!({ "date": "2026-10-05", "changes": changes }),
        )
        .unwrap();
        assert_eq!(day.as_array().unwrap().len(), 144);
        assert_eq!(day[2], json!(id));

        let totals = call(
            &w,
            "activity_totals",
            json!({ "from": "2026-10-01", "to": "2026-10-31" }),
        )
        .unwrap();
        assert_eq!(totals, json!([{ "activityId": id, "blocks": 3 }]));
        let daily = call(&w, "daily_totals", json!({ "from": "2026-10-01", "to": "2026-10-31" })).unwrap();
        assert_eq!(daily, json!([{ "date": "2026-10-05", "blocks": 3 }]));
    }

    #[test]
    fn errors_reach_the_frontend_with_a_stable_kind() {
        let (_app, w) = app();
        let parent = call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": null, "name": "Study", "color": "#2a78d6", "tagIds": [] } }),
        )
        .unwrap();
        let pid = parent["id"].as_i64().unwrap();
        call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": pid, "name": "Math", "color": null, "tagIds": [] } }),
        )
        .unwrap();

        let err = call(
            &w,
            "apply_day_changes",
            json!({ "date": "2026-10-05", "changes": [{ "slot": 0, "activityId": pid }] }),
        )
        .unwrap_err();
        assert_eq!(err["kind"], json!("notLeaf"));

        let err = call(&w, "create_tag", json!({ "input": { "name": "", "color": null } })).unwrap_err();
        assert_eq!(err["kind"], json!("invalidName"));
    }

    #[test]
    fn a_template_is_planned_and_added_without_overlap_over_ipc() {
        let (_app, w) = app();
        call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": null, "name": "Study", "color": "#123456", "tagIds": [] } }),
        )
        .unwrap();
        let tree = json!([
            { "name": "study", "color": "#2a78d6", "children": [{ "name": "Math", "color": null, "children": [] }] },
            { "name": "Rest", "color": "#eda100", "children": [] }
        ]);

        // The plan says which already exist (same name, ignoring case), and changes nothing.
        let plan = call(&w, "plan_activity_tree", json!({ "nodes": tree })).unwrap();
        assert_eq!(
            plan,
            json!([
                { "path": ["study"], "exists": true },
                { "path": ["study", "Math"], "exists": false },
                { "path": ["Rest"], "exists": false }
            ])
        );
        assert_eq!(
            call(&w, "list_activities", json!({}))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            1
        );

        // Adding keeps the existing one, adds the rest, and reports it.
        let report = call(&w, "import_activity_tree", json!({ "nodes": tree, "overwrite": [] })).unwrap();
        assert_eq!(report, json!({ "created": 2, "recolored": 0, "kept": 1 }));
        let all = call(&w, "list_activities", json!({})).unwrap();
        assert_eq!(all.as_array().unwrap().len(), 3);
        assert_eq!(all[0]["color"], json!("#123456"), "the user's own color is kept");

        // Choosing to overwrite recolors just that one.
        let report = call(
            &w,
            "import_activity_tree",
            json!({ "nodes": tree, "overwrite": [["study"]] }),
        )
        .unwrap();
        assert_eq!(report, json!({ "created": 0, "recolored": 1, "kept": 2 }));
        assert_eq!(
            call(&w, "list_activities", json!({})).unwrap()[0]["color"],
            json!("#2a78d6")
        );

        // A bad tree is refused with a stable error kind and adds nothing.
        let bad = json!([{ "name": "Fine", "color": "#2a78d6", "children": [] }, { "name": "No color", "color": null, "children": [] }]);
        let err = call(&w, "import_activity_tree", json!({ "nodes": bad, "overwrite": [] })).unwrap_err();
        assert_eq!(err["kind"], json!("colorRequired"));
        assert_eq!(
            call(&w, "list_activities", json!({}))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            3
        );
    }

    #[test]
    fn archive_restore_delete_and_tags_over_ipc() {
        let (_app, w) = app();
        let tag = call(
            &w,
            "create_tag",
            json!({ "input": { "name": "health", "color": null } }),
        )
        .unwrap();
        let rest = call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": null, "name": "Rest", "color": "#eda100", "tagIds": [tag["id"]] } }),
        )
        .unwrap();
        let id = rest["id"].clone();

        call(&w, "archive_activity", json!({ "id": id })).unwrap();
        assert_eq!(
            call(&w, "list_activities", json!({})).unwrap()[0]["archived"],
            json!(true)
        );
        call(&w, "restore_activity", json!({ "id": id })).unwrap();
        assert_eq!(call(&w, "activity_block_count", json!({ "id": id })).unwrap(), json!(0));

        let err = call(&w, "delete_activity", json!({ "id": id })).unwrap_err();
        assert_eq!(err["kind"], json!("notArchived"));

        call(
            &w,
            "update_tag",
            json!({ "id": tag["id"], "input": { "name": "wellbeing", "color": "#0ca30c" } }),
        )
        .unwrap();
        call(&w, "delete_tag", json!({ "id": tag["id"] })).unwrap();
        assert_eq!(call(&w, "list_activities", json!({})).unwrap()[0]["tagIds"], json!([]));
        assert_eq!(
            call(&w, "get_day", json!({ "date": "2026-10-05" }))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            144
        );
    }
}
