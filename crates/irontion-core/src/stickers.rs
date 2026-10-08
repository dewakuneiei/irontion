//! Stickers on calendar days (F007): built-in presets and the user's own images.
//!
//! The user's image is cropped and scaled in the app; here it is only checked (a square PNG of at
//! most `STICKER_MAX_PX`, at most `MAX_STICKER_BYTES`) and stored as it is.

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::model::{DaySticker, DayStickerId, NewSticker, Sticker, StickerId, StickerRef};
use crate::{Error, MAX_DAY_STICKERS, MAX_STICKER_BYTES, Result, STICKER_MAX_PX, STICKER_PRESETS, validate};

const DATA_URL_PREFIX: &str = "data:image/png;base64,";
const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];

/// The user's own stickers, oldest first, each with how many days carry it.
pub fn list(conn: &Connection) -> Result<Vec<Sticker>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.image, s.created_at,
                (SELECT COUNT(*) FROM day_stickers d WHERE d.sticker_id = s.id)
         FROM stickers s ORDER BY s.id",
    )?;
    let rows = stmt.query_map([], sticker_from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn create(conn: &Connection, input: NewSticker) -> Result<Sticker> {
    let name = validate::name(&input.name)?;
    let image = decode_png(&input.image)?;
    conn.execute(
        "INSERT INTO stickers (name, image) VALUES (?1, ?2)",
        params![name, image],
    )?;
    get(conn, conn.last_insert_rowid())
}

/// Delete one of the user's stickers for good. It comes off every day that carried it.
pub fn delete(conn: &Connection, id: StickerId) -> Result<()> {
    if conn.execute("DELETE FROM stickers WHERE id = ?1", [id])? == 0 {
        return Err(Error::NotFound);
    }
    Ok(())
}

/// Stickers on the days from `from` to `to` (both included), by day and then in the order added.
pub fn on_days(conn: &Connection, from: &str, to: &str) -> Result<Vec<DaySticker>> {
    validate::date_range(from, to)?;
    let mut stmt = conn.prepare(
        "SELECT id, date, preset, sticker_id FROM day_stickers
         WHERE date BETWEEN ?1 AND ?2 ORDER BY date, position, id",
    )?;
    let rows = stmt.query_map(params![from, to], day_sticker_from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

/// Put a sticker on a day, after the ones already there. The same sticker may go on twice.
pub fn add_to_day(conn: &mut Connection, date: &str, sticker: &StickerRef) -> Result<DaySticker> {
    validate::date(date)?;
    let tx = conn.transaction()?;
    let (preset, sticker_id) = match sticker {
        StickerRef::Preset { preset } if STICKER_PRESETS.contains(&preset.as_str()) => (Some(preset.as_str()), None),
        StickerRef::Preset { .. } => return Err(Error::NotFound),
        StickerRef::Custom { sticker_id } => {
            let exists: Option<i64> = tx
                .query_row("SELECT id FROM stickers WHERE id = ?1", [sticker_id], |r| r.get(0))
                .optional()?;
            exists.ok_or(Error::NotFound)?;
            (None, Some(*sticker_id))
        }
    };
    let (count, next): (i64, i64) = tx.query_row(
        "SELECT COUNT(*), COALESCE(MAX(position) + 1, 0) FROM day_stickers WHERE date = ?1",
        [date],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    if count as usize >= MAX_DAY_STICKERS {
        return Err(Error::TooManyStickers);
    }
    tx.execute(
        "INSERT INTO day_stickers (date, preset, sticker_id, position) VALUES (?1, ?2, ?3, ?4)",
        params![date, preset, sticker_id, next],
    )?;
    let id = tx.last_insert_rowid();
    tx.commit()?;
    Ok(DaySticker {
        id,
        date: date.to_owned(),
        sticker: sticker.clone(),
    })
}

/// Take one sticker off its day. The sticker itself stays in the library.
pub fn remove_from_day(conn: &Connection, id: DayStickerId) -> Result<()> {
    if conn.execute("DELETE FROM day_stickers WHERE id = ?1", [id])? == 0 {
        return Err(Error::NotFound);
    }
    Ok(())
}

fn get(conn: &Connection, id: StickerId) -> Result<Sticker> {
    conn.query_row(
        "SELECT s.id, s.name, s.image, s.created_at,
                (SELECT COUNT(*) FROM day_stickers d WHERE d.sticker_id = s.id)
         FROM stickers s WHERE s.id = ?1",
        [id],
        sticker_from_row,
    )
    .optional()?
    .ok_or(Error::NotFound)
}

fn sticker_from_row(row: &Row) -> rusqlite::Result<Sticker> {
    let image: Vec<u8> = row.get(2)?;
    Ok(Sticker {
        id: row.get(0)?,
        name: row.get(1)?,
        image: format!("{DATA_URL_PREFIX}{}", STANDARD.encode(image)),
        created_at: row.get(3)?,
        days: row.get(4)?,
    })
}

fn day_sticker_from_row(row: &Row) -> rusqlite::Result<DaySticker> {
    let preset: Option<String> = row.get(2)?;
    let sticker_id: Option<StickerId> = row.get(3)?;
    // The table's CHECK guarantees exactly one of the two.
    let sticker = match (preset, sticker_id) {
        (Some(preset), _) => StickerRef::Preset { preset },
        (None, Some(sticker_id)) => StickerRef::Custom { sticker_id },
        (None, None) => return Err(rusqlite::Error::InvalidColumnType(2, "preset".into(), rusqlite::types::Type::Null)),
    };
    Ok(DaySticker {
        id: row.get(0)?,
        date: row.get(1)?,
        sticker,
    })
}

/// The PNG bytes of a `data:image/png;base64,...` URL, if they are a square PNG small enough.
fn decode_png(data_url: &str) -> Result<Vec<u8>> {
    let encoded = data_url.strip_prefix(DATA_URL_PREFIX).ok_or(Error::InvalidStickerImage)?;
    // Refuse a huge string before decoding it: base64 is 4 characters for every 3 bytes.
    if encoded.len() > MAX_STICKER_BYTES.div_ceil(3) * 4 {
        return Err(Error::InvalidStickerImage);
    }
    let bytes = STANDARD.decode(encoded).map_err(|_| Error::InvalidStickerImage)?;
    if bytes.len() > MAX_STICKER_BYTES {
        return Err(Error::InvalidStickerImage);
    }
    match png_size(&bytes) {
        Some((width, height)) if width == height && (1..=STICKER_MAX_PX).contains(&width) => Ok(bytes),
        _ => Err(Error::InvalidStickerImage),
    }
}

/// Width and height from a PNG's header (the IHDR chunk always comes first).
fn png_size(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 24 || bytes[..8] != PNG_SIGNATURE || &bytes[12..16] != b"IHDR" {
        return None;
    }
    let read = |at: usize| u32::from_be_bytes(bytes[at..at + 4].try_into().expect("4 bytes"));
    Some((read(16), read(20)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    const DAY: &str = "2026-10-08";

    /// The start of a PNG: enough for the size check, which is all the core reads.
    fn png(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = PNG_SIGNATURE.to_vec();
        bytes.extend_from_slice(&13u32.to_be_bytes());
        bytes.extend_from_slice(b"IHDR");
        bytes.extend_from_slice(&width.to_be_bytes());
        bytes.extend_from_slice(&height.to_be_bytes());
        bytes.extend_from_slice(&[8, 6, 0, 0, 0]);
        bytes
    }

    fn data_url(bytes: &[u8]) -> String {
        format!("{DATA_URL_PREFIX}{}", STANDARD.encode(bytes))
    }

    fn new(name: &str) -> NewSticker {
        NewSticker {
            name: name.into(),
            image: data_url(&png(256, 256)),
        }
    }

    fn preset(id: &str) -> StickerRef {
        StickerRef::Preset { preset: id.into() }
    }

    #[test]
    fn a_sticker_keeps_its_name_and_image() {
        let conn = open_in_memory().unwrap();
        let input = new("  My cat ");
        let sticker = create(&conn, input.clone()).unwrap();
        assert_eq!(sticker.name, "My cat");
        assert_eq!(sticker.image, input.image, "the same PNG comes back");
        assert_eq!(sticker.days, 0);
        assert_eq!(list(&conn).unwrap(), [sticker]);
    }

    #[test]
    fn a_sticker_needs_a_name() {
        let conn = open_in_memory().unwrap();
        assert!(matches!(create(&conn, new("   ")), Err(Error::InvalidName)));
        assert!(list(&conn).unwrap().is_empty());
    }

    #[test]
    fn only_a_small_square_png_is_accepted() {
        let conn = open_in_memory().unwrap();
        let mut too_heavy = png(256, 256);
        too_heavy.resize(MAX_STICKER_BYTES + 1, 0);
        for image in [
            data_url(&png(256, 200)),
            data_url(&png(257, 257)),
            data_url(&png(0, 0)),
            data_url(b"GIF89a not a png at all"),
            data_url(&too_heavy),
            format!("data:image/jpeg;base64,{}", STANDARD.encode(png(64, 64))),
            format!("{DATA_URL_PREFIX}not base64!"),
            String::new(),
        ] {
            let input = NewSticker {
                name: "x".into(),
                image: image.clone(),
            };
            assert!(
                matches!(create(&conn, input), Err(Error::InvalidStickerImage)),
                "{}",
                &image[..image.len().min(40)]
            );
        }
        let small = NewSticker {
            name: "tiny".into(),
            image: data_url(&png(32, 32)),
        };
        assert!(create(&conn, small).is_ok(), "smaller than 256 px is fine");
    }

    #[test]
    fn presets_and_own_stickers_go_on_a_day_in_order() {
        let mut conn = open_in_memory().unwrap();
        let cat = create(&conn, new("Cat")).unwrap();
        let own = StickerRef::Custom { sticker_id: cat.id };
        add_to_day(&mut conn, DAY, &preset("star")).unwrap();
        add_to_day(&mut conn, DAY, &own).unwrap();
        add_to_day(&mut conn, DAY, &preset("star")).unwrap();
        add_to_day(&mut conn, "2026-10-09", &preset("sun")).unwrap();

        let on_day: Vec<StickerRef> = on_days(&conn, DAY, DAY).unwrap().into_iter().map(|d| d.sticker).collect();
        assert_eq!(on_day, [preset("star"), own, preset("star")], "the same sticker may go on twice");
        assert_eq!(on_days(&conn, DAY, "2026-10-09").unwrap().len(), 4);
        assert_eq!(list(&conn).unwrap()[0].days, 1);
    }

    #[test]
    fn an_unknown_sticker_is_not_found() {
        let mut conn = open_in_memory().unwrap();
        assert!(matches!(add_to_day(&mut conn, DAY, &preset("unicorn")), Err(Error::NotFound)));
        let missing = StickerRef::Custom { sticker_id: 99 };
        assert!(matches!(add_to_day(&mut conn, DAY, &missing), Err(Error::NotFound)));
        assert!(matches!(add_to_day(&mut conn, "2026-13-01", &preset("star")), Err(Error::InvalidDate)));
        assert!(on_days(&conn, "2026-01-01", "2026-12-31").unwrap().is_empty());
    }

    #[test]
    fn a_day_holds_a_limited_number_of_stickers() {
        let mut conn = open_in_memory().unwrap();
        for _ in 0..MAX_DAY_STICKERS {
            add_to_day(&mut conn, DAY, &preset("heart")).unwrap();
        }
        assert!(matches!(add_to_day(&mut conn, DAY, &preset("heart")), Err(Error::TooManyStickers)));
        assert_eq!(on_days(&conn, DAY, DAY).unwrap().len(), MAX_DAY_STICKERS);
        assert!(add_to_day(&mut conn, "2026-10-09", &preset("heart")).is_ok(), "another day is free");
    }

    #[test]
    fn removing_from_a_day_keeps_the_sticker() {
        let mut conn = open_in_memory().unwrap();
        let cat = create(&conn, new("Cat")).unwrap();
        let placed = add_to_day(&mut conn, DAY, &StickerRef::Custom { sticker_id: cat.id }).unwrap();
        remove_from_day(&conn, placed.id).unwrap();
        assert!(on_days(&conn, DAY, DAY).unwrap().is_empty());
        assert_eq!(list(&conn).unwrap().len(), 1);
        assert!(matches!(remove_from_day(&conn, placed.id), Err(Error::NotFound)));
    }

    #[test]
    fn deleting_a_sticker_takes_it_off_every_day() {
        let mut conn = open_in_memory().unwrap();
        let cat = create(&conn, new("Cat")).unwrap();
        let own = StickerRef::Custom { sticker_id: cat.id };
        add_to_day(&mut conn, DAY, &own).unwrap();
        add_to_day(&mut conn, "2026-10-20", &own).unwrap();
        add_to_day(&mut conn, DAY, &preset("moon")).unwrap();
        assert_eq!(list(&conn).unwrap()[0].days, 2);

        delete(&conn, cat.id).unwrap();
        let left: Vec<StickerRef> = on_days(&conn, "2026-10-01", "2026-10-31").unwrap().into_iter().map(|d| d.sticker).collect();
        assert_eq!(left, [preset("moon")], "presets stay");
        assert!(matches!(delete(&conn, cat.id), Err(Error::NotFound)));
    }

    #[test]
    fn a_backwards_range_is_refused() {
        let conn = open_in_memory().unwrap();
        assert!(matches!(on_days(&conn, "2026-10-31", "2026-10-01"), Err(Error::InvalidDate)));
    }
}
