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
