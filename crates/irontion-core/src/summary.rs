//! Totals over a date range. Roll-ups through the activity tree happen in the UI,
//! which already has the tree; the core returns direct counts only.

use rusqlite::Connection;

use crate::model::{ActivityTotal, DailyTotal};
use crate::{Result, validate};

/// Blocks per activity between `from` and `to`, both inclusive.
pub fn activity_totals(conn: &Connection, from: &str, to: &str) -> Result<Vec<ActivityTotal>> {
    validate::date(from)?;
    validate::date(to)?;
    let mut stmt = conn.prepare(
        "SELECT activity_id, COUNT(*) FROM time_blocks
         WHERE date BETWEEN ?1 AND ?2
         GROUP BY activity_id ORDER BY COUNT(*) DESC",
    )?;
    let rows = stmt.query_map([from, to], |r| {
        Ok(ActivityTotal {
            activity_id: r.get(0)?,
            blocks: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

/// Blocks per day between `from` and `to`, both inclusive. Days without blocks are omitted.
pub fn daily_totals(conn: &Connection, from: &str, to: &str) -> Result<Vec<DailyTotal>> {
    validate::date(from)?;
    validate::date(to)?;
    let mut stmt = conn.prepare(
        "SELECT date, COUNT(*) FROM time_blocks
         WHERE date BETWEEN ?1 AND ?2
         GROUP BY date ORDER BY date",
    )?;
    let rows = stmt.query_map([from, to], |r| {
        Ok(DailyTotal {
            date: r.get(0)?,
            blocks: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::model::{DayChange, NewActivity};
    use crate::{activities, blocks};

    #[test]
    fn totals_respect_the_date_range() {
        let mut conn = open_in_memory().unwrap();
        let id = activities::create(
            &mut conn,
            NewActivity {
                parent_id: None,
                name: "Study".into(),
                color: Some("#2a78d6".into()),
                tag_ids: vec![],
            },
        )
        .unwrap()
        .id;
        let three: Vec<DayChange> = (0..3)
            .map(|slot| DayChange {
                slot,
                activity_id: Some(id),
            })
            .collect();
        blocks::apply_day_changes(&mut conn, "2026-10-04", &three).unwrap();
        blocks::apply_day_changes(&mut conn, "2026-10-05", &three[..2]).unwrap();
        blocks::apply_day_changes(&mut conn, "2026-10-09", &three).unwrap();

        let totals = activity_totals(&conn, "2026-10-04", "2026-10-05").unwrap();
        assert_eq!(
            totals,
            vec![ActivityTotal {
                activity_id: id,
                blocks: 5
            }]
        );

        let daily = daily_totals(&conn, "2026-10-01", "2026-10-31").unwrap();
        assert_eq!(daily.iter().map(|d| d.blocks).collect::<Vec<_>>(), vec![3, 2, 3]);
    }
}
