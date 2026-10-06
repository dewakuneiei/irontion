use serde::{Deserialize, Serialize};

pub type ActivityId = i64;
pub type TagId = i64;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: ActivityId,
    pub parent_id: Option<ActivityId>,
    pub name: String,
    /// `None` = inherit the parent's color.
    pub color: Option<String>,
    pub position: i64,
    pub archived: bool,
    pub tag_ids: Vec<TagId>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewActivity {
    pub parent_id: Option<ActivityId>,
    pub name: String,
    pub color: Option<String>,
    #[serde(default)]
    pub tag_ids: Vec<TagId>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityPatch {
    pub name: String,
    pub color: Option<String>,
    pub tag_ids: Vec<TagId>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: TagId,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInput {
    pub name: String,
    pub color: Option<String>,
}

/// One cell edit. `activity_id: None` clears the cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayChange {
    pub slot: usize,
    pub activity_id: Option<ActivityId>,
}

/// The 144 cells of one day, in order. `None` = empty.
pub type DaySlots = Vec<Option<ActivityId>>;

/// An activity to add, with the sub-activities that go inside it.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub name: String,
    /// `None` = inherit the parent's color (not allowed at the top level).
    pub color: Option<String>,
    #[serde(default)]
    pub children: Vec<TreeNode>,
}

/// One node of a tree, in display order, and whether an activity with that name is already there.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TreePlanItem {
    /// Names from the top level down to this node.
    pub path: Vec<String>,
    pub exists: bool,
}

/// What adding a tree did.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeReport {
    pub created: usize,
    /// Existing activities whose color was overwritten.
    pub recolored: usize,
    /// Existing activities left exactly as they were.
    pub kept: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityTotal {
    pub activity_id: ActivityId,
    pub blocks: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyTotal {
    pub date: String,
    pub blocks: i64,
}

/// Which data a "delete data" action removes. Tags are never touched.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DeleteScope {
    /// Every recorded time block; activities stay.
    AllBlocks,
    /// Time blocks from `from` to `to`, both included (`YYYY-MM-DD`). One day: `from == to`.
    BlocksInRange { from: String, to: String },
    /// Every activity, archived ones too, and with them all their time blocks.
    AllActivities,
    /// Every note. Activities and time blocks never delete notes; tags stay.
    AllNotes,
}

/// How much a delete removes (or would remove).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataCounts {
    pub blocks: i64,
    pub activities: i64,
    pub notes: i64,
}

pub type NoteId = i64;

/// A short sticky note (F006). Every note belongs to exactly one day (`date`), which is where it
/// shows on the Calendar (F007); one day can have many notes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: NoteId,
    pub text: String,
    /// `YYYY-MM-DD`, never empty.
    pub date: String,
    /// One of `NOTE_COLORS`.
    pub color: String,
    /// Pinned notes come first on the board.
    pub pinned: bool,
    pub tag_ids: Vec<TagId>,
    /// When to remind the user (UTC, ISO 8601), if at all.
    pub remind_at: Option<String>,
    /// When the reminder was shown; `None` while it is still to come.
    pub reminded_at: Option<String>,
    /// UTC, ISO 8601.
    pub created_at: String,
    pub updated_at: String,
}

fn default_color() -> String {
    crate::NOTE_COLORS[0].to_owned()
}

/// A new note. `tags` are tag names: an existing tag (ignoring case) is reused, any other name
/// becomes a new tag in the same transaction. `#tags` still in `text` are taken out and added.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewNote {
    pub date: String,
    pub text: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// An edit of a note. There is no date here on purpose: only `notes::move_note` changes it.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteEdit {
    pub text: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Which days to list notes from.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum NoteQuery {
    All,
    /// Notes on one day (`YYYY-MM-DD`).
    Date {
        date: String,
    },
    /// Notes from `from` to `to`, both days included.
    Range {
        from: String,
        to: String,
    },
}

/// Narrows a note list. Every field is optional; they combine.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NoteFilter {
    pub tag_id: Option<TagId>,
    /// Every word must appear in the text or in a tag name, in any order, ignoring case.
    pub keyword: Option<String>,
}

/// One day's notes, for the Calendar's indicators. Days with none are left out.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteDayCount {
    pub date: String,
    pub notes: i64,
}

/// How many activities and notes use one tag (F002 tags panel).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagUsage {
    pub tag_id: TagId,
    pub activities: i64,
    pub notes: i64,
}
