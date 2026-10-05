//! Tags: flat labels that cut across the activity tree.

use rusqlite::{Connection, ErrorCode, OptionalExtension, params};

use crate::model::{Tag, TagId, TagInput};
use crate::{Error, Result, validate};

pub fn list(conn: &Connection) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE")?;
    let rows = stmt.query_map([], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
            color: r.get(2)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn create(conn: &Connection, input: TagInput) -> Result<Tag> {
    let name = validate::name(&input.name)?;
    let color = validate::optional_color(input.color.as_deref())?;
    conn.execute("INSERT INTO tags (name, color) VALUES (?1, ?2)", params![name, color])
        .map_err(map_unique)?;
    Ok(Tag {
        id: conn.last_insert_rowid(),
        name,
        color,
    })
}

/// Rename or recolor a tag. Every activity using it sees the change.
pub fn update(conn: &Connection, id: TagId, input: TagInput) -> Result<Tag> {
    let name = validate::name(&input.name)?;
    let color = validate::optional_color(input.color.as_deref())?;
    let changed = conn
        .execute(
            "UPDATE tags SET name = ?2, color = ?3 WHERE id = ?1",
            params![id, name, color],
        )
        .map_err(map_unique)?;
    if changed == 0 {
        return Err(Error::NotFound);
    }
    Ok(Tag { id, name, color })
}

/// Delete a tag and remove it from every activity.
pub fn delete(conn: &Connection, id: TagId) -> Result<()> {
    let exists = conn
        .query_row("SELECT 1 FROM tags WHERE id = ?1", [id], |_| Ok(()))
        .optional()?;
    if exists.is_none() {
        return Err(Error::NotFound);
    }
    conn.execute("DELETE FROM tags WHERE id = ?1", [id])?;
    Ok(())
}

fn map_unique(err: rusqlite::Error) -> Error {
    match err.sqlite_error_code() {
        Some(ErrorCode::ConstraintViolation) => Error::DuplicateTag,
        _ => Error::Database(err),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn input(name: &str) -> TagInput {
        TagInput {
            name: name.into(),
            color: None,
        }
    }

    #[test]
    fn names_are_unique_ignoring_case() {
        let conn = open_in_memory().unwrap();
        create(&conn, input("deep-work")).unwrap();
        assert!(matches!(create(&conn, input("Deep-Work")), Err(Error::DuplicateTag)));
    }

    #[test]
    fn rename_and_delete() {
        let conn = open_in_memory().unwrap();
        let tag = create(&conn, input("health")).unwrap();
        let renamed = update(
            &conn,
            tag.id,
            TagInput {
                name: "wellbeing".into(),
                color: Some("#0CA30C".into()),
            },
        )
        .unwrap();
        assert_eq!(renamed.color.as_deref(), Some("#0ca30c"));
        delete(&conn, tag.id).unwrap();
        assert!(list(&conn).unwrap().is_empty());
        assert!(matches!(delete(&conn, tag.id), Err(Error::NotFound)));
    }
}
