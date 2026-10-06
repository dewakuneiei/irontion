//! Time blocks: the 144 ten-minute cells of a day.

use std::collections::HashSet;

use rusqlite::{Connection, params};

use crate::model::{ActivityId, DayChange, DaySlots};
use crate::{Result, SLOTS_PER_DAY, activities, validate};

pub fn get_day(conn: &Connection, date: &str) -> Result<DaySlots> {
    validate::date(date)?;
    let mut slots: DaySlots = vec![None; SLOTS_PER_DAY];
    let mut stmt = conn.prepare("SELECT slot, activity_id FROM time_blocks WHERE date = ?1")?;
    for row in stmt.query_map([date], |r| Ok((r.get::<_, i64>(0)?, r.get(1)?)))? {
        let (slot, activity_id) = row?;
        // The schema's CHECK keeps slot within 0..144.
        if let Some(cell) = usize::try_from(slot).ok().and_then(|s| slots.get_mut(s)) {
            *cell = Some(activity_id);
        }
    }
    Ok(slots)
}

/// Apply every cell edit of one user action atomically and return the updated day.
///
/// New blocks must use an active activity, a parent included. An activity that is already on
/// this day may be reused even if it is archived, so that moving or resizing an existing block
/// never fails.
pub fn apply_day_changes(conn: &mut Connection, date: &str, changes: &[DayChange]) -> Result<DaySlots> {
    validate::date(date)?;
    for change in changes {
        validate::slot(change.slot)?;
    }

    let tx = conn.transaction()?;
    let already_on_day = activities_on_day(&tx, date)?;
    let mut checked: HashSet<ActivityId> = HashSet::new();
    for id in changes.iter().filter_map(|c| c.activity_id) {
        if !already_on_day.contains(&id) && checked.insert(id) {
            activities::ensure_assignable(&tx, id)?;
        }
    }

    {
        let mut upsert = tx.prepare(
            "INSERT INTO time_blocks (date, slot, activity_id) VALUES (?1, ?2, ?3)
             ON CONFLICT (date, slot) DO UPDATE SET activity_id = excluded.activity_id",
        )?;
        let mut clear = tx.prepare("DELETE FROM time_blocks WHERE date = ?1 AND slot = ?2")?;
        for change in changes {
            match change.activity_id {
                Some(id) => upsert.execute(params![date, change.slot as i64, id])?,
                None => clear.execute(params![date, change.slot as i64])?,
            };
        }
    }
    tx.commit()?;
    get_day(conn, date)
}

fn activities_on_day(conn: &Connection, date: &str) -> Result<HashSet<ActivityId>> {
    let mut stmt = conn.prepare("SELECT DISTINCT activity_id FROM time_blocks WHERE date = ?1")?;
    let ids = stmt.query_map([date], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    Ok(ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Error;
    use crate::db::open_in_memory;
    use crate::model::NewActivity;

    const DAY: &str = "2026-10-05";

    fn activity(conn: &mut Connection, parent_id: Option<ActivityId>, name: &str) -> ActivityId {
        let color = parent_id.is_none().then(|| "#2a78d6".to_string());
        activities::create(
            conn,
            NewActivity {
                parent_id,
                name: name.into(),
                color,
                tag_ids: vec![],
            },
        )
        .unwrap()
        .id
    }

    fn paint(slots: std::ops::Range<usize>, id: Option<ActivityId>) -> Vec<DayChange> {
        slots.map(|slot| DayChange { slot, activity_id: id }).collect()
    }

    #[test]
    fn empty_day_has_144_empty_slots() {
        let conn = open_in_memory().unwrap();
        let day = get_day(&conn, DAY).unwrap();
        assert_eq!(day.len(), SLOTS_PER_DAY);
        assert!(day.iter().all(Option::is_none));
    }

    #[test]
    fn paint_overwrite_and_clear() {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        let rest = activity(&mut conn, None, "Rest");

        let day = apply_day_changes(&mut conn, DAY, &paint(0..6, Some(study))).unwrap();
        assert_eq!(day[..6], [Some(study); 6]);

        let day = apply_day_changes(&mut conn, DAY, &paint(3..6, Some(rest))).unwrap();
        assert_eq!(day[2], Some(study));
        assert_eq!(day[3], Some(rest));

        let day = apply_day_changes(&mut conn, DAY, &paint(0..6, None)).unwrap();
        assert!(day.iter().all(Option::is_none));
    }

    #[test]
    fn a_parent_can_fill_blocks_and_so_can_its_children() {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        let math = activity(&mut conn, Some(study), "Math");
        let mut changes = paint(0..2, Some(study));
        changes.extend(paint(2..4, Some(math)));
        let day = apply_day_changes(&mut conn, DAY, &changes).unwrap();
        assert_eq!(day[..4], [Some(study), Some(study), Some(math), Some(math)]);
    }

    #[test]
    fn new_blocks_require_an_active_activity_but_existing_ones_can_move() {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        apply_day_changes(&mut conn, DAY, &paint(0..2, Some(study))).unwrap();
        activities::archive(&conn, study).unwrap();

        let err = apply_day_changes(&mut conn, "2026-10-06", &paint(0..2, Some(study)));
        assert!(matches!(err, Err(Error::Archived)));

        // Moving the existing Study block on the same day still works.
        let mut moving = paint(0..2, None);
        moving.extend(paint(10..12, Some(study)));
        let day = apply_day_changes(&mut conn, DAY, &moving).unwrap();
        assert_eq!(day[10], Some(study));
        assert_eq!(day[0], None);
    }

    #[test]
    fn a_failed_change_writes_nothing() {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        let mut changes = paint(0..3, Some(study));
        changes.push(DayChange {
            slot: 5,
            activity_id: Some(9999),
        });
        assert!(apply_day_changes(&mut conn, DAY, &changes).is_err());
        assert!(get_day(&conn, DAY).unwrap().iter().all(Option::is_none));
    }

    #[test]
    fn rejects_bad_slots_and_dates() {
        let mut conn = open_in_memory().unwrap();
        assert!(matches!(
            apply_day_changes(&mut conn, DAY, &paint(144..145, None)),
            Err(Error::InvalidSlot)
        ));
        assert!(matches!(get_day(&conn, "yesterday"), Err(Error::InvalidDate)));
    }

    #[test]
    fn archived_activity_blocks_stay_and_permanent_delete_removes_them() {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        apply_day_changes(&mut conn, DAY, &paint(0..4, Some(study))).unwrap();

        activities::archive(&conn, study).unwrap();
        assert_eq!(get_day(&conn, DAY).unwrap()[0], Some(study));
        assert_eq!(activities::block_count(&conn, study).unwrap(), 4);

        activities::delete_permanently(&conn, study).unwrap();
        assert!(get_day(&conn, DAY).unwrap().iter().all(Option::is_none));
    }
}
