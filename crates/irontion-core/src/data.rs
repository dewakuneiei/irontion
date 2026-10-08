//! Bulk deletion of the user's data (Settings, Danger zone).

use rusqlite::{Connection, params};

use crate::model::{DataCounts, DeleteScope};
use crate::{Result, validate};

/// What `delete` would remove for this scope. Changes nothing.
pub fn count(conn: &Connection, scope: &DeleteScope) -> Result<DataCounts> {
    check(scope)?;
    let none = DataCounts {
        blocks: 0,
        activities: 0,
        notes: 0,
    };
    Ok(match scope {
        DeleteScope::AllBlocks => DataCounts {
            blocks: table_count(conn, "time_blocks")?,
            ..none
        },
        DeleteScope::AllActivities => DataCounts {
            blocks: table_count(conn, "time_blocks")?,
            activities: table_count(conn, "activities")?,
            ..none
        },
        DeleteScope::AllNotes => DataCounts {
            notes: table_count(conn, "notes")?,
            ..none
        },
        DeleteScope::BlocksInRange { from, to } => DataCounts {
            blocks: conn.query_row(
                "SELECT COUNT(*) FROM time_blocks WHERE date BETWEEN ?1 AND ?2",
                params![from, to],
                |r| r.get(0),
            )?,
            ..none
        },
    })
}

/// Delete everything in the scope in one transaction and say how much went.
///
/// Deleting activities also deletes their time blocks and tag links (foreign-key
/// cascade). Tags stay, and notes are never touched by activity or block scopes.
pub fn delete(conn: &mut Connection, scope: &DeleteScope) -> Result<DataCounts> {
    check(scope)?;
    let tx = conn.transaction()?;
    let counts = count(&tx, scope)?;
    match scope {
        DeleteScope::AllBlocks => tx.execute("DELETE FROM time_blocks", [])?,
        DeleteScope::BlocksInRange { from, to } => tx.execute(
            "DELETE FROM time_blocks WHERE date BETWEEN ?1 AND ?2",
            params![from, to],
        )?,
        DeleteScope::AllActivities => tx.execute("DELETE FROM activities", [])?,
        DeleteScope::AllNotes => tx.execute("DELETE FROM notes", [])?,
    };
    tx.commit()?;
    Ok(counts)
}

fn check(scope: &DeleteScope) -> Result<()> {
    if let DeleteScope::BlocksInRange { from, to } = scope {
        validate::date_range(from, to)?;
    }
    Ok(())
}

fn table_count(conn: &Connection, table: &str) -> Result<i64> {
    Ok(conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Error;
    use crate::db::open_in_memory;
    use crate::model::{ActivityId, DayChange, NewActivity, NewNote, TagInput};
    use crate::{activities, blocks, notes, tags};

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

    fn fill(conn: &mut Connection, date: &str, id: ActivityId, cells: usize) {
        let changes: Vec<DayChange> = (0..cells)
            .map(|slot| DayChange {
                slot,
                activity_id: Some(id),
            })
            .collect();
        blocks::apply_day_changes(conn, date, &changes).unwrap();
    }

    fn range(from: &str, to: &str) -> DeleteScope {
        DeleteScope::BlocksInRange {
            from: from.into(),
            to: to.into(),
        }
    }

    /// Two activities, blocks on three days: 3 + 2 + 4 = 9.
    fn sample() -> (Connection, ActivityId, ActivityId) {
        let mut conn = open_in_memory().unwrap();
        let study = activity(&mut conn, None, "Study");
        let rest = activity(&mut conn, None, "Rest");
        fill(&mut conn, "2026-10-03", study, 3);
        fill(&mut conn, "2026-10-04", rest, 2);
        fill(&mut conn, "2026-10-05", study, 4);
        (conn, study, rest)
    }

    fn block_total(conn: &Connection) -> i64 {
        table_count(conn, "time_blocks").unwrap()
    }

    #[test]
    fn counting_changes_nothing() {
        let (conn, ..) = sample();
        let all = count(&conn, &DeleteScope::AllActivities).unwrap();
        assert_eq!(
            all,
            DataCounts {
                blocks: 9,
                activities: 2,
                notes: 0
            }
        );
        assert_eq!(
            count(&conn, &DeleteScope::AllBlocks).unwrap(),
            DataCounts {
                blocks: 9,
                activities: 0,
                notes: 0
            }
        );
        assert_eq!(block_total(&conn), 9);
    }

    #[test]
    fn all_blocks_keeps_the_activities() {
        let (mut conn, ..) = sample();
        let gone = delete(&mut conn, &DeleteScope::AllBlocks).unwrap();
        assert_eq!(
            gone,
            DataCounts {
                blocks: 9,
                activities: 0,
                notes: 0
            }
        );
        assert_eq!(block_total(&conn), 0);
        assert_eq!(activities::list(&conn).unwrap().len(), 2);
    }

    #[test]
    fn one_day_is_a_range_from_and_to_the_same_date() {
        let (mut conn, ..) = sample();
        let gone = delete(&mut conn, &range("2026-10-04", "2026-10-04")).unwrap();
        assert_eq!(gone.blocks, 2);
        assert_eq!(block_total(&conn), 7);
        assert!(
            blocks::get_day(&conn, "2026-10-04")
                .unwrap()
                .iter()
                .all(Option::is_none)
        );
    }

    #[test]
    fn a_range_includes_both_ends_and_nothing_outside() {
        let (mut conn, ..) = sample();
        assert_eq!(count(&conn, &range("2026-10-03", "2026-10-04")).unwrap().blocks, 5);
        delete(&mut conn, &range("2026-10-03", "2026-10-04")).unwrap();
        assert_eq!(block_total(&conn), 4);
        assert_eq!(
            blocks::get_day(&conn, "2026-10-05").unwrap().iter().flatten().count(),
            4
        );
    }

    #[test]
    fn a_range_with_no_blocks_deletes_nothing() {
        let (mut conn, ..) = sample();
        let gone = delete(&mut conn, &range("2025-01-01", "2025-12-31")).unwrap();
        assert_eq!(
            gone,
            DataCounts {
                blocks: 0,
                activities: 0,
                notes: 0
            }
        );
        assert_eq!(block_total(&conn), 9);
    }

    #[test]
    fn a_bad_or_backwards_range_is_refused_and_deletes_nothing() {
        let (mut conn, ..) = sample();
        for scope in [
            range("2026-10-05", "2026-10-03"),
            range("nope", "2026-10-03"),
            range("2026-10-03", "2026-13-01"),
        ] {
            assert!(
                matches!(delete(&mut conn, &scope), Err(Error::InvalidDate)),
                "{scope:?}"
            );
            assert!(matches!(count(&conn, &scope), Err(Error::InvalidDate)));
        }
        assert_eq!(block_total(&conn), 9);
    }

    #[test]
    fn all_activities_takes_their_blocks_sub_activities_and_archived_ones_but_not_tags() {
        let (mut conn, study, rest) = sample();
        let math = activity(&mut conn, Some(study), "Math");
        activities::archive(&conn, rest).unwrap();
        tags::create(
            &conn,
            TagInput {
                name: "health".into(),
                color: None,
            },
        )
        .unwrap();
        fill(&mut conn, "2026-10-06", math, 1);

        let gone = delete(&mut conn, &DeleteScope::AllActivities).unwrap();
        assert_eq!(
            gone,
            DataCounts {
                blocks: 10,
                activities: 3,
                notes: 0
            }
        );
        assert!(activities::list(&conn).unwrap().is_empty());
        assert_eq!(block_total(&conn), 0);
        assert_eq!(tags::list(&conn).unwrap().len(), 1, "tags are kept");
    }

    fn note(conn: &mut Connection, date: &str) {
        notes::create_note(
            conn,
            NewNote {
                date: date.into(),
                text: "x #kept".into(),
                color: "yellow".into(),
                tags: vec![],
            },
        )
        .unwrap();
    }

    fn note_total(conn: &Connection) -> i64 {
        table_count(conn, "notes").unwrap()
    }

    #[test]
    fn all_notes_counts_and_deletes_every_note_and_keeps_tags() {
        let (mut conn, ..) = sample();
        note(&mut conn, "2026-10-01");
        note(&mut conn, "2026-10-03");
        note(&mut conn, "2026-10-30");

        let counts = count(&conn, &DeleteScope::AllNotes).unwrap();
        assert_eq!(
            counts,
            DataCounts {
                blocks: 0,
                activities: 0,
                notes: 3
            }
        );
        assert_eq!(delete(&mut conn, &DeleteScope::AllNotes).unwrap(), counts);
        assert_eq!(note_total(&conn), 0);
        assert_eq!(block_total(&conn), 9, "time blocks stay");
        assert_eq!(activities::list(&conn).unwrap().len(), 2, "activities stay");
        assert!(
            tags::list(&conn).unwrap().iter().any(|t| t.name == "kept"),
            "tags used by notes stay"
        );
    }

    #[test]
    fn deleting_blocks_or_activities_never_deletes_notes() {
        let (mut conn, ..) = sample();
        note(&mut conn, "2026-10-01");
        note(&mut conn, "2026-10-03");
        for scope in [
            range("2026-10-03", "2026-10-05"),
            DeleteScope::AllBlocks,
            DeleteScope::AllActivities,
        ] {
            assert_eq!(count(&conn, &scope).unwrap().notes, 0, "{scope:?}");
            assert_eq!(delete(&mut conn, &scope).unwrap().notes, 0, "{scope:?}");
            assert_eq!(note_total(&conn), 2, "{scope:?}");
        }
    }

    #[test]
    fn deleting_from_an_empty_database_is_fine() {
        let mut conn = open_in_memory().unwrap();
        for scope in [
            DeleteScope::AllBlocks,
            DeleteScope::AllActivities,
            DeleteScope::AllNotes,
            range("2026-10-01", "2026-10-31"),
        ] {
            assert_eq!(
                delete(&mut conn, &scope).unwrap(),
                DataCounts {
                    blocks: 0,
                    activities: 0,
                    notes: 0
                }
            );
        }
    }
}
