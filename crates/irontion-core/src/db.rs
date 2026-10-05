use std::path::Path;

use rusqlite::Connection;

use crate::Result;

/// Migrations in order. Index + 1 is the schema version stored in `PRAGMA user_version`.
const MIGRATIONS: &[&str] = &[include_str!("../migrations/001_init.sql")];

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
    fn enables_foreign_keys() {
        let conn = open_in_memory().unwrap();
        let on: i64 = conn.pragma_query_value(None, "foreign_keys", |r| r.get(0)).unwrap();
        assert_eq!(on, 1);
    }
}
