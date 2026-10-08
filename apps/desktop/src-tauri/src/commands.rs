//! Tauri commands. Each one locks the database and delegates to `irontion_core`;
//! no business logic or SQL lives here.

use std::sync::Mutex;

use irontion_core::model::{
    Activity, ActivityId, ActivityPatch, ActivityTotal, DailyTotal, DataCounts, DayChange, DaySlots, DaySticker,
    DayStickerId, DeleteScope, NewActivity, NewNote, NewSticker, Note, NoteDayCount, NoteEdit, NoteFilter, NoteId,
    NoteQuery, NotificationPermission, Sticker, StickerId, StickerRef, Tag, TagId, TagInput, TagUsage, TreeNode,
    TreePlanItem, TreeReport,
};
use irontion_core::Connection;
use irontion_core::{activities, activity_tree, blocks, data, notes, settings, stickers, summary, tags};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WebviewWindow};

use crate::reminders;

pub struct Db(pub Mutex<Connection>);

/// What the frontend receives on failure: a stable `kind` to translate, plus detail for logs.
#[derive(Debug, Serialize)]
pub struct CommandError {
    kind: &'static str,
    message: String,
}

impl From<irontion_core::Error> for CommandError {
    fn from(err: irontion_core::Error) -> Self {
        Self {
            kind: err.kind(),
            message: err.to_string(),
        }
    }
}

type CmdResult<T> = Result<T, CommandError>;

fn with_db<T>(db: &State<'_, Db>, f: impl FnOnce(&mut Connection) -> irontion_core::Result<T>) -> CmdResult<T> {
    let mut conn = db.0.lock().map_err(|_| CommandError {
        kind: "database",
        message: "database lock poisoned".into(),
    })?;
    Ok(f(&mut conn)?)
}

#[tauri::command]
pub async fn list_activities(db: State<'_, Db>) -> CmdResult<Vec<Activity>> {
    with_db(&db, |c| activities::list(c))
}

#[tauri::command]
pub async fn create_activity(db: State<'_, Db>, input: NewActivity) -> CmdResult<Activity> {
    with_db(&db, |c| activities::create(c, input))
}

#[tauri::command]
pub async fn update_activity(db: State<'_, Db>, id: ActivityId, patch: ActivityPatch) -> CmdResult<Activity> {
    with_db(&db, |c| activities::update(c, id, patch))
}

#[tauri::command]
pub async fn archive_activity(db: State<'_, Db>, id: ActivityId) -> CmdResult<()> {
    with_db(&db, |c| activities::archive(c, id))
}

#[tauri::command]
pub async fn restore_activity(db: State<'_, Db>, id: ActivityId) -> CmdResult<()> {
    with_db(&db, |c| activities::restore(c, id))
}

#[tauri::command]
pub async fn delete_activity(db: State<'_, Db>, id: ActivityId) -> CmdResult<()> {
    with_db(&db, |c| activities::delete_permanently(c, id))
}

#[tauri::command]
pub async fn activity_block_count(db: State<'_, Db>, id: ActivityId) -> CmdResult<i64> {
    with_db(&db, |c| activities::block_count(c, id))
}

#[tauri::command]
pub async fn plan_activity_tree(db: State<'_, Db>, nodes: Vec<TreeNode>) -> CmdResult<Vec<TreePlanItem>> {
    with_db(&db, |c| activity_tree::plan(c, &nodes))
}

#[tauri::command]
pub async fn import_activity_tree(
    db: State<'_, Db>,
    nodes: Vec<TreeNode>,
    overwrite: Vec<Vec<String>>,
) -> CmdResult<TreeReport> {
    with_db(&db, |c| activity_tree::apply(c, &nodes, &overwrite))
}

#[tauri::command]
pub async fn list_tags(db: State<'_, Db>) -> CmdResult<Vec<Tag>> {
    with_db(&db, |c| tags::list(c))
}

#[tauri::command]
pub async fn create_tag(db: State<'_, Db>, input: TagInput) -> CmdResult<Tag> {
    with_db(&db, |c| tags::create(c, input))
}

#[tauri::command]
pub async fn update_tag(db: State<'_, Db>, id: TagId, input: TagInput) -> CmdResult<Tag> {
    with_db(&db, |c| tags::update(c, id, input))
}

#[tauri::command]
pub async fn delete_tag(db: State<'_, Db>, id: TagId) -> CmdResult<()> {
    with_db(&db, |c| tags::delete(c, id))
}

#[tauri::command]
pub async fn get_day(db: State<'_, Db>, date: String) -> CmdResult<DaySlots> {
    with_db(&db, |c| blocks::get_day(c, &date))
}

#[tauri::command]
pub async fn apply_day_changes(db: State<'_, Db>, date: String, changes: Vec<DayChange>) -> CmdResult<DaySlots> {
    with_db(&db, |c| blocks::apply_day_changes(c, &date, &changes))
}

#[tauri::command]
pub async fn activity_totals(db: State<'_, Db>, from: String, to: String) -> CmdResult<Vec<ActivityTotal>> {
    with_db(&db, |c| summary::activity_totals(c, &from, &to))
}

#[tauri::command]
pub async fn daily_totals(db: State<'_, Db>, from: String, to: String) -> CmdResult<Vec<DailyTotal>> {
    with_db(&db, |c| summary::daily_totals(c, &from, &to))
}

#[tauri::command]
pub async fn count_data(db: State<'_, Db>, scope: DeleteScope) -> CmdResult<DataCounts> {
    with_db(&db, |c| data::count(c, &scope))
}

#[tauri::command]
pub async fn delete_data(db: State<'_, Db>, scope: DeleteScope) -> CmdResult<DataCounts> {
    with_db(&db, |c| data::delete(c, &scope))
}

#[tauri::command]
pub async fn tag_usage(db: State<'_, Db>) -> CmdResult<Vec<TagUsage>> {
    with_db(&db, |c| tags::usage(c))
}

#[tauri::command]
pub async fn list_notes(db: State<'_, Db>, query: NoteQuery, filter: Option<NoteFilter>) -> CmdResult<Vec<Note>> {
    with_db(&db, |c| notes::list(c, &query, &filter.unwrap_or_default()))
}

#[tauri::command]
pub async fn create_note(db: State<'_, Db>, input: NewNote) -> CmdResult<Note> {
    with_db(&db, |c| notes::create_note(c, input))
}

#[tauri::command]
pub async fn update_note(db: State<'_, Db>, id: NoteId, edit: NoteEdit) -> CmdResult<Note> {
    with_db(&db, |c| notes::update_note(c, id, edit))
}

#[tauri::command]
pub async fn move_note(db: State<'_, Db>, id: NoteId, date: String) -> CmdResult<Note> {
    with_db(&db, |c| notes::move_note(c, id, &date))
}

#[tauri::command]
pub async fn delete_note(db: State<'_, Db>, id: NoteId) -> CmdResult<Note> {
    with_db(&db, |c| notes::delete_note(c, id))
}

#[tauri::command]
pub async fn restore_note(db: State<'_, Db>, note: Note) -> CmdResult<Note> {
    with_db(&db, |c| notes::restore_note(c, &note))
}

#[tauri::command]
pub async fn note_month_counts(db: State<'_, Db>, from: String, to: String) -> CmdResult<Vec<NoteDayCount>> {
    with_db(&db, |c| notes::month_counts(c, &from, &to))
}

#[tauri::command]
pub async fn pin_note(db: State<'_, Db>, id: NoteId, pinned: bool) -> CmdResult<Note> {
    with_db(&db, |c| notes::pin_note(c, id, pinned))
}

#[tauri::command]
pub async fn reorder_notes(db: State<'_, Db>, ids: Vec<NoteId>) -> CmdResult<()> {
    with_db(&db, |c| notes::reorder_notes(c, &ids))
}

#[tauri::command]
pub async fn set_note_reminder(db: State<'_, Db>, id: NoteId, remind_at: Option<String>) -> CmdResult<Note> {
    with_db(&db, |c| notes::set_reminder(c, id, remind_at.as_deref()))
}

#[tauri::command]
pub async fn notification_permission(db: State<'_, Db>) -> CmdResult<NotificationPermission> {
    with_db(&db, |c| settings::notification_permission(c))
}

#[tauri::command]
pub async fn set_notification_permission(db: State<'_, Db>, permission: NotificationPermission) -> CmdResult<()> {
    with_db(&db, |c| settings::set_notification_permission(c, permission))
}

/// Turns system notifications on: shows one notification now and, only if the system showed it,
/// remembers the user's yes. Fails with the reason otherwise, so the window can leave the switch off.
#[tauri::command]
pub async fn enable_notifications(db: State<'_, Db>, title: String, body: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "database lock poisoned".to_owned())?;
    reminders::enable_with(&conn, || reminders::show_notification(&title, &body))
}

#[tauri::command]
pub async fn reminder_window(db: State<'_, Db>) -> CmdResult<bool> {
    with_db(&db, |c| settings::reminder_window(c))
}

#[tauri::command]
pub async fn set_reminder_window(db: State<'_, Db>, enabled: bool) -> CmdResult<()> {
    with_db(&db, |c| settings::set_reminder_window(c, enabled))
}

/// Opens the reminder popup with a sample, so the user can see what it looks like.
#[tauri::command]
pub async fn preview_reminder_alert<R: Runtime>(
    app: AppHandle<R>,
    texts: State<'_, reminders::NotificationTexts>,
) -> Result<(), String> {
    let title = texts.0.lock().map_err(|_| "lock poisoned".to_owned())?.reminder.clone();
    reminders::show_alert_window(&app, None, false, &title).map_err(|err| err.to_string())
}

/// Closes the popup that called it.
#[tauri::command]
pub async fn dismiss_alert<R: Runtime>(window: WebviewWindow<R>) -> Result<(), String> {
    window.close().map_err(|err| err.to_string())
}

/// The popup's "Open note": brings the main window forward on that note, then closes the popup.
#[tauri::command]
pub async fn open_note_from_alert<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    id: NoteId,
) -> Result<(), String> {
    let main = app.get_webview_window("main").ok_or("the main window is not open")?;
    main.show().map_err(|err| err.to_string())?;
    main.unminimize().map_err(|err| err.to_string())?;
    main.set_focus().map_err(|err| err.to_string())?;
    app.emit_to("main", "open-note", id).map_err(|err| err.to_string())?;
    window.close().map_err(|err| err.to_string())
}

/// Whether the system can show notifications: `"granted"`, or `"unavailable"` with the reason.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationStatus {
    state: &'static str,
    reason: Option<String>,
}

#[tauri::command]
pub async fn notification_status() -> NotificationStatus {
    match reminders::availability() {
        Ok(()) => NotificationStatus {
            state: "granted",
            reason: None,
        },
        Err(reason) => NotificationStatus {
            state: "unavailable",
            reason: Some(reason),
        },
    }
}

/// Shows one notification now, so the user can check it works without waiting for a reminder.
#[tauri::command]
pub async fn send_test_notification(title: String, body: String) -> Result<(), String> {
    reminders::show_notification(&title, &body)
}

/// The window tells Rust the words of the system notification in the user's language.
#[tauri::command]
pub async fn set_notification_texts(
    texts: State<'_, reminders::NotificationTexts>,
    reminder: String,
    missed: String,
) -> Result<(), String> {
    let mut texts = texts.0.lock().map_err(|_| "lock poisoned".to_owned())?;
    *texts = reminders::Texts { reminder, missed };
    Ok(())
}

#[tauri::command]
pub async fn list_stickers(db: State<'_, Db>) -> CmdResult<Vec<Sticker>> {
    with_db(&db, |c| stickers::list(c))
}

#[tauri::command]
pub async fn create_sticker(db: State<'_, Db>, input: NewSticker) -> CmdResult<Sticker> {
    with_db(&db, |c| stickers::create(c, input))
}

#[tauri::command]
pub async fn delete_sticker(db: State<'_, Db>, id: StickerId) -> CmdResult<()> {
    with_db(&db, |c| stickers::delete(c, id))
}

#[tauri::command]
pub async fn day_stickers(db: State<'_, Db>, from: String, to: String) -> CmdResult<Vec<DaySticker>> {
    with_db(&db, |c| stickers::on_days(c, &from, &to))
}

#[tauri::command]
pub async fn add_day_sticker(db: State<'_, Db>, date: String, sticker: StickerRef) -> CmdResult<DaySticker> {
    with_db(&db, |c| stickers::add_to_day(c, &date, &sticker))
}

#[tauri::command]
pub async fn remove_day_sticker(db: State<'_, Db>, id: DayStickerId) -> CmdResult<()> {
    with_db(&db, |c| stickers::remove_from_day(c, id))
}
