//! Activities: a user-defined tree. Archive instead of delete keeps history intact.

use std::collections::HashMap;

use rusqlite::{Connection, OptionalExtension, params};

use crate::model::{Activity, ActivityId, ActivityPatch, NewActivity, TagId};
use crate::{Error, MAX_DEPTH, Result, validate};

// Recursive CTE fragments. Use as `WITH RECURSIVE {SUBTREE}` or `WITH RECURSIVE {SUBTREE}, {ANCESTORS}`.
const SUBTREE: &str = "subtree(id) AS (
        SELECT ?1
        UNION ALL
        SELECT a.id FROM activities a JOIN subtree s ON a.parent_id = s.id
    )";

const ANCESTORS: &str = "ancestors(id, parent_id) AS (
        SELECT id, parent_id FROM activities WHERE id = ?1
        UNION ALL
        SELECT a.id, a.parent_id FROM activities a JOIN ancestors s ON a.id = s.parent_id
    )";

/// Every activity, archived ones included, ordered for display.
pub fn list(conn: &Connection) -> Result<Vec<Activity>> {
    let mut tags = tag_ids_by_activity(conn)?;
    let mut stmt = conn.prepare(
        "SELECT id, parent_id, name, color, position, archived_at IS NOT NULL
         FROM activities ORDER BY position, id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Activity {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            position: row.get(4)?,
            archived: row.get(5)?,
            tag_ids: Vec::new(),
        })
    })?;
    rows.map(|row| {
        let mut activity = row?;
        activity.tag_ids = tags.remove(&activity.id).unwrap_or_default();
        Ok(activity)
    })
    .collect()
}

pub fn get(conn: &Connection, id: ActivityId) -> Result<Activity> {
    let mut activity = conn
        .query_row(
            "SELECT id, parent_id, name, color, position, archived_at IS NOT NULL
             FROM activities WHERE id = ?1",
            [id],
            |row| {
                Ok(Activity {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    position: row.get(4)?,
                    archived: row.get(5)?,
                    tag_ids: Vec::new(),
                })
            },
        )
        .optional()?
        .ok_or(Error::NotFound)?;
    let mut stmt = conn.prepare("SELECT tag_id FROM activity_tags WHERE activity_id = ?1 ORDER BY tag_id")?;
    activity.tag_ids = stmt.query_map([id], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    Ok(activity)
}

pub fn create(conn: &mut Connection, input: NewActivity) -> Result<Activity> {
    let name = validate::name(&input.name)?;
    let color = validate::optional_color(input.color.as_deref())?;
    let tx = conn.transaction()?;

    match input.parent_id {
        None if color.is_none() => return Err(Error::ColorRequired),
        None => {}
        Some(parent_id) => {
            if get(&tx, parent_id)?.archived {
                return Err(Error::Archived);
            }
            if depth(&tx, parent_id)? >= MAX_DEPTH {
                return Err(Error::TooDeep);
            }
        }
    }

    let position: i64 = tx.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM activities WHERE parent_id IS ?1",
        [input.parent_id],
        |r| r.get(0),
    )?;
    tx.execute(
        "INSERT INTO activities (parent_id, name, color, position) VALUES (?1, ?2, ?3, ?4)",
        params![input.parent_id, name, color, position],
    )?;
    let id = tx.last_insert_rowid();
    set_tags(&tx, id, &input.tag_ids)?;
    tx.commit()?;
    get(conn, id)
}

pub fn update(conn: &mut Connection, id: ActivityId, patch: ActivityPatch) -> Result<Activity> {
    let name = validate::name(&patch.name)?;
    let color = validate::optional_color(patch.color.as_deref())?;
    let tx = conn.transaction()?;
    if get(&tx, id)?.parent_id.is_none() && color.is_none() {
        return Err(Error::ColorRequired);
    }
    tx.execute(
        "UPDATE activities SET name = ?2, color = ?3 WHERE id = ?1",
        params![id, name, color],
    )?;
    set_tags(&tx, id, &patch.tag_ids)?;
    tx.commit()?;
    get(conn, id)
}

/// Hide an activity and all its sub-activities. Their time blocks stay.
pub fn archive(conn: &Connection, id: ActivityId) -> Result<()> {
    get(conn, id)?;
    conn.execute(
        &format!(
            "WITH RECURSIVE {SUBTREE} UPDATE activities
             SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id IN (SELECT id FROM subtree) AND archived_at IS NULL"
        ),
        [id],
    )?;
    Ok(())
}

/// Bring back an activity, its sub-activities, and any archived parents above it.
pub fn restore(conn: &Connection, id: ActivityId) -> Result<()> {
    get(conn, id)?;
    conn.execute(
        &format!(
            "WITH RECURSIVE {SUBTREE}, {ANCESTORS}
             UPDATE activities SET archived_at = NULL
             WHERE id IN (SELECT id FROM subtree) OR id IN (SELECT id FROM ancestors)"
        ),
        [id],
    )?;
    Ok(())
}

/// Permanently delete an archived activity, its sub-activities and their time blocks.
pub fn delete_permanently(conn: &Connection, id: ActivityId) -> Result<()> {
    if !get(conn, id)?.archived {
        return Err(Error::NotArchived);
    }
    conn.execute("DELETE FROM activities WHERE id = ?1", [id])?;
    Ok(())
}

/// Number of time blocks recorded for an activity and its sub-activities.
pub fn block_count(conn: &Connection, id: ActivityId) -> Result<i64> {
    get(conn, id)?;
    Ok(conn.query_row(
        &format!(
            "WITH RECURSIVE {SUBTREE} SELECT COUNT(*) FROM time_blocks WHERE activity_id IN (SELECT id FROM subtree)"
        ),
        [id],
        |r| r.get(0),
    )?)
}

/// Fails unless new time blocks may use this activity: it must exist, be active,
/// and have no active sub-activities.
pub fn ensure_assignable(conn: &Connection, id: ActivityId) -> Result<()> {
    if get(conn, id)?.archived {
        return Err(Error::Archived);
    }
    let active_children: i64 = conn.query_row(
        "SELECT COUNT(*) FROM activities WHERE parent_id = ?1 AND archived_at IS NULL",
        [id],
        |r| r.get(0),
    )?;
    if active_children > 0 {
        return Err(Error::NotLeaf);
    }
    Ok(())
}

/// Level of an activity in the tree: a top-level activity is 1.
fn depth(conn: &Connection, id: ActivityId) -> Result<usize> {
    let levels: i64 = conn.query_row(
        &format!("WITH RECURSIVE {ANCESTORS} SELECT COUNT(*) FROM ancestors"),
        [id],
        |r| r.get(0),
    )?;
    match usize::try_from(levels) {
        Ok(0) | Err(_) => Err(Error::NotFound),
        Ok(levels) => Ok(levels),
    }
}

fn set_tags(conn: &Connection, id: ActivityId, tag_ids: &[TagId]) -> Result<()> {
    conn.execute("DELETE FROM activity_tags WHERE activity_id = ?1", [id])?;
    let mut insert = conn.prepare("INSERT OR IGNORE INTO activity_tags (activity_id, tag_id) VALUES (?1, ?2)")?;
    let mut exists = conn.prepare("SELECT 1 FROM tags WHERE id = ?1")?;
    for &tag_id in tag_ids {
        if !exists.exists([tag_id])? {
            return Err(Error::NotFound);
        }
        insert.execute([id, tag_id])?;
    }
    Ok(())
}

fn tag_ids_by_activity(conn: &Connection) -> Result<HashMap<ActivityId, Vec<TagId>>> {
    let mut stmt = conn.prepare("SELECT activity_id, tag_id FROM activity_tags ORDER BY tag_id")?;
    let mut map: HashMap<ActivityId, Vec<TagId>> = HashMap::new();
    for row in stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))? {
        let (activity_id, tag_id) = row?;
        map.entry(activity_id).or_default().push(tag_id);
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn top(conn: &mut Connection, name: &str) -> Activity {
        create(
            conn,
            NewActivity {
                parent_id: None,
                name: name.into(),
                color: Some("#2a78d6".into()),
                tag_ids: vec![],
            },
        )
        .unwrap()
    }

    fn child(conn: &mut Connection, parent: ActivityId, name: &str) -> Activity {
        create(
            conn,
            NewActivity {
                parent_id: Some(parent),
                name: name.into(),
                color: None,
                tag_ids: vec![],
            },
        )
        .unwrap()
    }

    #[test]
    fn top_level_needs_a_color_but_children_inherit() {
        let mut conn = open_in_memory().unwrap();
        let err = create(
            &mut conn,
            NewActivity {
                parent_id: None,
                name: "x".into(),
                color: None,
                tag_ids: vec![],
            },
        );
        assert!(matches!(err, Err(Error::ColorRequired)));
        let study = top(&mut conn, "Study");
        let math = child(&mut conn, study.id, "Math");
        assert_eq!(math.color, None);
        assert_eq!(math.parent_id, Some(study.id));
    }

    #[test]
    fn siblings_get_increasing_positions() {
        let mut conn = open_in_memory().unwrap();
        let a = top(&mut conn, "A");
        let b = top(&mut conn, "B");
        assert!(b.position > a.position);
    }

    #[test]
    fn nesting_is_limited() {
        let mut conn = open_in_memory().unwrap();
        let mut parent = top(&mut conn, "L1");
        for level in 2..=MAX_DEPTH {
            parent = child(&mut conn, parent.id, &format!("L{level}"));
        }
        let err = create(
            &mut conn,
            NewActivity {
                parent_id: Some(parent.id),
                name: "too deep".into(),
                color: None,
                tag_ids: vec![],
            },
        );
        assert!(matches!(err, Err(Error::TooDeep)));
    }

    #[test]
    fn archive_cascades_down_and_restore_brings_back_ancestors() {
        let mut conn = open_in_memory().unwrap();
        let study = top(&mut conn, "Study");
        let math = child(&mut conn, study.id, "Math");
        let algebra = child(&mut conn, math.id, "Algebra");

        archive(&conn, study.id).unwrap();
        assert!(list(&conn).unwrap().iter().all(|a| a.archived));

        restore(&conn, algebra.id).unwrap();
        assert!(list(&conn).unwrap().iter().all(|a| !a.archived));
    }

    #[test]
    fn only_active_leaves_are_assignable() {
        let mut conn = open_in_memory().unwrap();
        let study = top(&mut conn, "Study");
        assert!(ensure_assignable(&conn, study.id).is_ok());

        let math = child(&mut conn, study.id, "Math");
        assert!(matches!(ensure_assignable(&conn, study.id), Err(Error::NotLeaf)));
        assert!(ensure_assignable(&conn, math.id).is_ok());

        // A parent whose children are all archived is a leaf again.
        archive(&conn, math.id).unwrap();
        assert!(ensure_assignable(&conn, study.id).is_ok());
        assert!(matches!(ensure_assignable(&conn, math.id), Err(Error::Archived)));
    }

    #[test]
    fn permanent_delete_requires_archive_and_removes_subtree() {
        let mut conn = open_in_memory().unwrap();
        let study = top(&mut conn, "Study");
        child(&mut conn, study.id, "Math");
        assert!(matches!(delete_permanently(&conn, study.id), Err(Error::NotArchived)));

        archive(&conn, study.id).unwrap();
        delete_permanently(&conn, study.id).unwrap();
        assert!(list(&conn).unwrap().is_empty());
    }

    #[test]
    fn tags_are_replaced_on_update_and_unknown_tags_rejected() {
        let mut conn = open_in_memory().unwrap();
        let tag = crate::tags::create(
            &conn,
            crate::model::TagInput {
                name: "deep-work".into(),
                color: None,
            },
        )
        .unwrap();
        let study = top(&mut conn, "Study");
        let updated = update(
            &mut conn,
            study.id,
            ActivityPatch {
                name: "Study".into(),
                color: Some("#123456".into()),
                tag_ids: vec![tag.id],
            },
        )
        .unwrap();
        assert_eq!(updated.tag_ids, vec![tag.id]);

        let err = update(
            &mut conn,
            study.id,
            ActivityPatch {
                name: "Study".into(),
                color: Some("#123456".into()),
                tag_ids: vec![999],
            },
        );
        assert!(matches!(err, Err(Error::NotFound)));
        // The failed update rolled back: the old tag is still there.
        assert_eq!(get(&conn, study.id).unwrap().tag_ids, vec![tag.id]);
    }
}
