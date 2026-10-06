//! Tauri commands. Each one locks the database and delegates to `irontion_core`;
//! no business logic or SQL lives here.

use std::sync::Mutex;

use irontion_core::model::{
    Activity, ActivityId, ActivityPatch, ActivityTotal, DailyTotal, DataCounts, DayChange, DaySlots, DeleteScope,
    NewActivity, NewNote, Note, NoteDayCount, NoteEdit, NoteFilter, NoteId, NoteQuery, Tag, TagId, TagInput, TagUsage,
    TreeNode, TreePlanItem, TreeReport,
};
use irontion_core::Connection;
use irontion_core::{activities, activity_tree, blocks, data, notes, summary, tags};
use serde::Serialize;
use tauri::State;

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
pub async fn due_reminders(db: State<'_, Db>) -> CmdResult<Vec<Note>> {
    with_db(&db, |c| notes::due_reminders(c))
}

#[tauri::command]
pub async fn mark_note_reminded(db: State<'_, Db>, id: NoteId) -> CmdResult<Note> {
    with_db(&db, |c| notes::mark_reminded(c, id))
}
