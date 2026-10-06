use std::path::Path;

use rusqlite::Connection;

use crate::Result;

/// Migrations in order. Index + 1 is the schema version stored in `PRAGMA user_version`.
const MIGRATIONS: &[&str] = &[
    include_str!("../migrations/001_init.sql"),
    include_str!("../migrations/002_notes.sql"),
    include_str!("../migrations/003_notes_free_text.sql"),
    include_str!("../migrations/004_note_tags.sql"),
    include_str!("../migrations/005_notes_dated_with_templates.sql"),
    include_str!("../migrations/006_notes_without_templates.sql"),
    include_str!("../migrations/007_notes_board.sql"),
];

/// Open (or create) the database file, enable WAL and foreign keys, and migrate.
pub fn open(path: &Path) -> Result<Connection> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let mut conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    prepare(&mut conn)?;
    Ok(conn)
}

/// A fresh database in memory, for tests and previews.
pub fn open_in_memory() -> Result<Connection> {
    let mut conn = Connection::open_in_memory()?;
    prepare(&mut conn)?;
    Ok(conn)
}

fn prepare(conn: &mut Connection) -> Result<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(conn)
}

fn migrate(conn: &mut Connection) -> Result<()> {
    let current: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    let applied = usize::try_from(current).unwrap_or(0);
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(applied) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", index as i64 + 1)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrates_to_latest_version_and_is_idempotent() {
        let mut conn = open_in_memory().unwrap();
        migrate(&mut conn).unwrap();
        let version: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0)).unwrap();
        assert_eq!(version, MIGRATIONS.len() as i64);
    }

    #[test]
    fn a_database_with_template_notes_upgrades_and_keeps_its_notes() {
        let mut conn = Connection::open_in_memory().unwrap();
        for sql in &MIGRATIONS[..2] {
            conn.execute_batch(sql).unwrap();
        }
        conn.pragma_update(None, "user_version", 2).unwrap();
        conn.execute(
            "INSERT INTO notes (template, text, date) VALUES ('deadline', 'Hand in', '2026-10-30')",
            [],
        )
        .unwrap();

        migrate(&mut conn).unwrap();

        let (text, date): (String, String) = conn
            .query_row("SELECT text, date FROM notes", [], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap();
        assert_eq!((text.as_str(), date.as_str()), ("Hand in", "2026-10-30"));
        assert!(
            conn.prepare("SELECT template FROM notes").is_err(),
            "templates are gone"
        );
    }

    /// Version 4 had undated notes. Version 5 gives every note a date (the local day it was
    /// written), and keeps the notes, their times and their tags.
    #[test]
    fn undated_notes_get_the_day_they_were_written_and_keep_their_tags() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        for sql in &MIGRATIONS[..4] {
            conn.execute_batch(sql).unwrap();
        }
        conn.pragma_update(None, "user_version", 4).unwrap();
        conn.execute_batch(
            "INSERT INTO tags (id, name) VALUES (7, 'work');
             INSERT INTO notes (id, text, date, created_at, updated_at)
                 VALUES (1, 'Loose', NULL, '2026-10-05T23:30:00.000Z', '2026-10-06T01:00:00.000Z'),
                        (2, 'Dated', '2026-10-30', '2026-10-01T08:00:00.000Z', '2026-10-01T08:00:00.000Z');
             INSERT INTO note_tags (note_id, tag_id) VALUES (1, 7), (2, 7);",
        )
        .unwrap();

        migrate(&mut conn).unwrap();

        let local_day: String = conn
            .query_row("SELECT date('2026-10-05T23:30:00.000Z', 'localtime')", [], |r| r.get(0))
            .unwrap();
        let rows: Vec<(i64, String, String, String)> = conn
            .prepare("SELECT id, date, created_at, updated_at FROM notes ORDER BY id")
            .unwrap()
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
            .unwrap()
            .collect::<rusqlite::Result<_>>()
            .unwrap();
        assert_eq!(
            rows[0],
            (
                1,
                local_day,
                "2026-10-05T23:30:00.000Z".into(),
                "2026-10-06T01:00:00.000Z".into()
            )
        );
        assert_eq!(rows[1].1, "2026-10-30");
        let links: i64 = conn
            .query_row("SELECT COUNT(*) FROM note_tags", [], |r| r.get(0))
            .unwrap();
        assert_eq!(links, 2, "tag links survive the rebuild");
        assert!(
            conn.execute("INSERT INTO notes (text) VALUES ('x')", []).is_err(),
            "a date is now required"
        );
    }

    /// Version 5 had a template on every note. Version 6 drops it and keeps everything else.
    #[test]
    fn dropping_templates_keeps_text_dates_and_tags() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        for sql in &MIGRATIONS[..5] {
            conn.execute_batch(sql).unwrap();
        }
        conn.pragma_update(None, "user_version", 5).unwrap();
        conn.execute_batch(
            "INSERT INTO tags (id, name) VALUES (7, 'work');
             INSERT INTO notes (id, template, text, date) VALUES (1, 'deadline', 'Hand in', '2026-10-30');
             INSERT INTO note_tags (note_id, tag_id) VALUES (1, 7);",
        )
        .unwrap();

        migrate(&mut conn).unwrap();

        let (text, date): (String, String) = conn
            .query_row("SELECT text, date FROM notes WHERE id = 1", [], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .unwrap();
        assert_eq!((text.as_str(), date.as_str()), ("Hand in", "2026-10-30"));
        let links: i64 = conn
            .query_row("SELECT COUNT(*) FROM note_tags", [], |r| r.get(0))
            .unwrap();
        assert_eq!(links, 1);
        assert!(conn.prepare("SELECT template FROM notes").is_err());
    }

    /// Version 6 had no board columns. Version 7 adds them, and keeps the order notes were shown in
    /// (latest day first, newest created first).
    #[test]
    fn the_board_columns_keep_the_old_order() {
        let mut conn = Connection::open_in_memory().unwrap();
        for sql in &MIGRATIONS[..6] {
            conn.execute_batch(sql).unwrap();
        }
        conn.pragma_update(None, "user_version", 6).unwrap();
        conn.execute_batch(
            "INSERT INTO notes (id, text, date, created_at) VALUES
               (1, 'old', '2026-10-05', '2026-10-05T08:00:00.000Z'),
               (2, 'soon', '2026-10-30', '2026-10-01T08:00:00.000Z'),
               (3, 'today first', '2026-10-06', '2026-10-06T08:00:00.000Z'),
               (4, 'today second', '2026-10-06', '2026-10-06T09:00:00.000Z');",
        )
        .unwrap();

        migrate(&mut conn).unwrap();

        let order: Vec<String> = conn
            .prepare("SELECT text FROM notes ORDER BY pinned DESC, position, id DESC")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .collect::<rusqlite::Result<_>>()
            .unwrap();
        assert_eq!(order, ["soon", "today second", "today first", "old"]);
        let (color, pinned, remind): (String, i64, Option<String>) = conn
            .query_row("SELECT color, pinned, remind_at FROM notes WHERE id = 1", [], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?))
            })
            .unwrap();
        assert_eq!((color.as_str(), pinned, remind), ("yellow", 0, None));
    }

    #[test]
    fn enables_foreign_keys() {
        let conn = open_in_memory().unwrap();
        let on: i64 = conn.pragma_query_value(None, "foreign_keys", |r| r.get(0)).unwrap();
        assert_eq!(on, 1);
    }
}
