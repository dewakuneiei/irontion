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
}

/// How much a delete removes (or would remove).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataCounts {
    pub blocks: i64,
    pub activities: i64,
}
