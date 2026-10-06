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
        commands::tag_usage,
        commands::get_day,
        commands::apply_day_changes,
        commands::activity_totals,
        commands::daily_totals,
        commands::count_data,
        commands::delete_data,
        commands::list_notes,
        commands::create_note,
        commands::update_note,
        commands::move_note,
        commands::delete_note,
        commands::restore_note,
        commands::note_month_counts,
        commands::pin_note,
        commands::reorder_notes,
        commands::set_note_reminder,
        commands::due_reminders,
        commands::mark_note_reminded,
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

    #[test]
    fn deleting_data_by_scope_over_ipc() {
        let (_app, w) = app();
        let study = call(
            &w,
            "create_activity",
            json!({ "input": { "parentId": null, "name": "Study", "color": "#123456", "tagIds": [] } }),
        )
        .unwrap();
        let changes: Vec<Value> = (0..3)
            .map(|slot| json!({ "slot": slot, "activityId": study["id"] }))
            .collect();
        for date in ["2026-10-04", "2026-10-05"] {
            call(&w, "apply_day_changes", json!({ "date": date, "changes": changes })).unwrap();
        }

        // Counting is a preview: nothing is removed.
        let one_day = json!({ "kind": "blocksInRange", "from": "2026-10-04", "to": "2026-10-04" });
        assert_eq!(
            call(&w, "count_data", json!({ "scope": one_day })).unwrap(),
            json!({ "blocks": 3, "activities": 0, "notes": 0 })
        );
        assert_eq!(
            call(
                &w,
                "activity_totals",
                json!({ "from": "2026-10-01", "to": "2026-10-31" })
            )
            .unwrap()[0]["blocks"],
            json!(6)
        );

        // One day goes; the other stays.
        assert_eq!(
            call(&w, "delete_data", json!({ "scope": one_day })).unwrap(),
            json!({ "blocks": 3, "activities": 0, "notes": 0 })
        );
        assert_eq!(
            call(
                &w,
                "activity_totals",
                json!({ "from": "2026-10-01", "to": "2026-10-31" })
            )
            .unwrap()[0]["blocks"],
            json!(3)
        );

        // A backwards range is refused with a stable kind.
        let backwards = json!({ "kind": "blocksInRange", "from": "2026-10-05", "to": "2026-10-01" });
        assert_eq!(
            call(&w, "delete_data", json!({ "scope": backwards })).unwrap_err()["kind"],
            json!("invalidDate")
        );

        // All blocks keep the activity; all activities remove everything.
        call(&w, "delete_data", json!({ "scope": { "kind": "allBlocks" } })).unwrap();
        assert_eq!(
            call(&w, "list_activities", json!({}))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            call(&w, "delete_data", json!({ "scope": { "kind": "allActivities" } })).unwrap(),
            json!({ "blocks": 0, "activities": 1, "notes": 0 })
        );
        assert!(call(&w, "list_activities", json!({}))
            .unwrap()
            .as_array()
            .unwrap()
            .is_empty());
    }
    #[test]
    fn notes_are_written_moved_listed_counted_deleted_and_restored_over_ipc() {
        let (_app, w) = app();
        let note = |date: &str, text: &str| json!({ "input": { "date": date, "text": text, "tags": [] } });
        let texts = |notes: Value| -> Vec<String> {
            notes
                .as_array()
                .unwrap()
                .iter()
                .map(|n| n["text"].as_str().unwrap().to_owned())
                .collect()
        };

        // A #tag leaves the text and becomes a tag, created in the same transaction.
        let created = call(&w, "create_note", note("2026-10-06", "  Study two hours #school ")).unwrap();
        assert_eq!(created["text"], json!("Study two hours"));
        assert_eq!(created["date"], json!("2026-10-06"));
        assert!(created.get("template").is_none(), "notes have no template");
        assert!(created["createdAt"].is_string() && created["updatedAt"].is_string());
        let school = call(&w, "list_tags", json!({})).unwrap()[0].clone();
        assert_eq!(school["name"], json!("school"));
        assert_eq!(created["tagIds"], json!([school["id"]]));
        let id = created["id"].clone();

        call(&w, "create_note", note("2026-10-30", "Hand in the thesis #School")).unwrap();
        call(&w, "create_note", note("2026-10-05", "Ran 5 km")).unwrap();

        let all = call(&w, "list_notes", json!({ "query": { "kind": "all" } })).unwrap();
        assert_eq!(
            texts(all),
            ["Ran 5 km", "Hand in the thesis", "Study two hours"],
            "board order: the newest note first"
        );
        let filtered = call(
            &w,
            "list_notes",
            json!({ "query": { "kind": "range", "from": "2026-10-01", "to": "2026-10-31" },
                    "filter": { "tagId": school["id"], "keyword": "THESIS" } }),
        )
        .unwrap();
        assert_eq!(texts(filtered), ["Hand in the thesis"]);
        assert_eq!(
            call(&w, "tag_usage", json!({})).unwrap(),
            json!([{ "tagId": school["id"], "activities": 0, "notes": 2 }])
        );

        assert_eq!(
            call(
                &w,
                "note_month_counts",
                json!({ "from": "2026-10-01", "to": "2026-10-31" })
            )
            .unwrap(),
            json!([
                { "date": "2026-10-05", "notes": 1 },
                { "date": "2026-10-06", "notes": 1 },
                { "date": "2026-10-30", "notes": 1 }
            ])
        );

        // An edit never carries a date; moving is its own command.
        let edit = json!({ "id": id, "edit": { "text": "Studied", "tags": [] } });
        let edited = call(&w, "update_note", edit).unwrap();
        assert_eq!(
            (edited["date"].clone(), edited["tagIds"].clone()),
            (json!("2026-10-06"), json!([]))
        );
        let moved = call(&w, "move_note", json!({ "id": id, "date": "2026-10-07" })).unwrap();
        assert_eq!(moved["date"], json!("2026-10-07"));
        assert_eq!(moved["createdAt"], created["createdAt"]);

        // Delete hands the note back, and restore puts it back for Undo.
        let deleted = call(&w, "delete_note", json!({ "id": id })).unwrap();
        assert_eq!(deleted, moved);
        assert_eq!(call(&w, "restore_note", json!({ "note": deleted })).unwrap(), moved);

        let kind = |cmd: &str, args: Value| call(&w, cmd, args).unwrap_err()["kind"].clone();
        assert_eq!(
            kind("create_note", note("2026-10-06", &"a".repeat(201))),
            json!("noteTooLong")
        );
        assert_eq!(
            kind("create_note", note("2026-10-06", " #only-a-tag ")),
            json!("noteEmpty")
        );
        assert_eq!(kind("create_note", note("", "x")), json!("invalidDate"));
        assert_eq!(
            kind("create_note", note("2026-10-06", "x #a #b #c #d #e #f")),
            json!("noteTooManyTags")
        );
        assert_eq!(kind("move_note", json!({ "id": id, "date": "" })), json!("invalidDate"));
        assert_eq!(kind("delete_note", json!({ "id": 999 })), json!("notFound"));

        // Danger zone: counts are exact, other scopes leave notes alone, and tags stay.
        assert_eq!(
            call(&w, "count_data", json!({ "scope": { "kind": "allNotes" } })).unwrap(),
            json!({ "blocks": 0, "activities": 0, "notes": 3 })
        );
        call(&w, "delete_data", json!({ "scope": { "kind": "allActivities" } })).unwrap();
        assert_eq!(
            texts(call(&w, "list_notes", json!({ "query": { "kind": "all" } })).unwrap()).len(),
            3
        );
        assert_eq!(
            call(&w, "delete_data", json!({ "scope": { "kind": "allNotes" } })).unwrap(),
            json!({ "blocks": 0, "activities": 0, "notes": 3 })
        );
        assert!(texts(call(&w, "list_notes", json!({ "query": { "kind": "all" } })).unwrap()).is_empty());
        assert_eq!(call(&w, "list_tags", json!({})).unwrap().as_array().unwrap().len(), 1);
    }

    #[test]
    fn color_pin_order_and_reminders_over_ipc() {
        let (_app, w) = app();
        let new = |text: &str, color: &str| json!({ "input": { "date": "2026-10-06", "text": text, "color": color, "tags": [] } });
        let mut ids = Vec::new();
        for (text, color) in [("a", "yellow"), ("b", "blue"), ("c", "teal")] {
            let note = call(&w, "create_note", new(text, color)).unwrap();
            assert_eq!(note["color"], json!(color));
            assert_eq!(
                (note["pinned"].clone(), note["remindAt"].clone()),
                (json!(false), Value::Null)
            );
            ids.push(note["id"].clone());
        }
        let order = |w: &WebviewWindow<MockRuntime>| -> Vec<String> {
            call(w, "list_notes", json!({ "query": { "kind": "all" } }))
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .map(|n| n["text"].as_str().unwrap().to_owned())
                .collect()
        };
        assert_eq!(order(&w), ["c", "b", "a"], "a new note goes first");

        // A color is part of an edit, and must be one of the palette.
        let edit = json!({ "id": ids[0], "edit": { "text": "a", "color": "pink", "tags": [] } });
        assert_eq!(call(&w, "update_note", edit).unwrap()["color"], json!("pink"));
        let bad = json!({ "id": ids[0], "edit": { "text": "a", "color": "neon", "tags": [] } });
        assert_eq!(call(&w, "update_note", bad).unwrap_err()["kind"], json!("invalidColor"));

        // Pin, then drag into a new order (a whole group at a time).
        assert_eq!(
            call(&w, "pin_note", json!({ "id": ids[0], "pinned": true })).unwrap()["pinned"],
            json!(true)
        );
        assert_eq!(order(&w), ["a", "c", "b"]);
        call(&w, "reorder_notes", json!({ "ids": [ids[1], ids[2]] })).unwrap();
        assert_eq!(order(&w), ["a", "b", "c"]);
        assert_eq!(
            call(&w, "reorder_notes", json!({ "ids": [ids[1], 999] })).unwrap_err()["kind"],
            json!("notFound")
        );

        // Reminders: set, due, shown once, cleared.
        let set = call(
            &w,
            "set_note_reminder",
            json!({ "id": ids[1], "remindAt": "2001-01-01T08:00:00Z" }),
        )
        .unwrap();
        assert_eq!(set["remindAt"], json!("2001-01-01T08:00:00.000Z"));
        let due = call(&w, "due_reminders", json!({})).unwrap();
        assert_eq!(due.as_array().unwrap().len(), 1);
        assert_eq!(due[0]["id"], ids[1]);
        let shown = call(&w, "mark_note_reminded", json!({ "id": ids[1] })).unwrap();
        assert!(shown["remindedAt"].is_string());
        assert!(call(&w, "due_reminders", json!({}))
            .unwrap()
            .as_array()
            .unwrap()
            .is_empty());
        assert_eq!(
            call(&w, "set_note_reminder", json!({ "id": ids[1], "remindAt": "tomorrow" })).unwrap_err()["kind"],
            json!("invalidReminder")
        );
        let cleared = call(&w, "set_note_reminder", json!({ "id": ids[1], "remindAt": null })).unwrap();
        assert_eq!(cleared["remindAt"], Value::Null);
    }
}
