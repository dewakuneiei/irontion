//! Short sticky notes (F006), shown on the Notes page and on the Calendar (F007).
//!
//! Every note belongs to exactly one day. Creating a note sets that day; after that only
//! `move_note` changes it (the Calendar's "Move to another day"), and nothing clears it: taking a
//! note off the Calendar means deleting it. The Notes page and the Calendar are two views of the
//! same rows.
//!
//! A note is up to `MAX_NOTE_LEN` characters of plain text, with up to
//! `MAX_NOTE_TAGS` of the user's tags (the same tags activities use, F002). Tags are written as
//! `#name` while typing: the `#name` leaves the text and becomes a tag, so it never uses up the
//! character limit. The rules here are the authority; `domain/notes.ts` mirrors them and both
//! sides run the cases in `fixtures/note_rules.json`.

use std::collections::{HashMap, HashSet};

use rusqlite::{Connection, OptionalExtension, Row, Transaction, params, params_from_iter, types::Value};
use unicode_segmentation::UnicodeSegmentation;

use crate::model::{NewNote, Note, NoteDayCount, NoteEdit, NoteFilter, NoteId, NoteQuery, TagId, TagInput};
use crate::{Error, MAX_NAME_LEN, MAX_NOTE_LEN, MAX_NOTE_TAGS, NOTE_COLORS, Result, tags, validate};

/// Length of a note as the user sees it: extended grapheme clusters (Unicode UAX #29).
///
/// A Thai word with vowel and tone marks, a Japanese character, an emoji with a skin tone or a
/// family emoji joined by zero-width joiners each count once. The frontend counts the same way
/// with `Intl.Segmenter`.
pub fn text_len(text: &str) -> usize {
    text.graphemes(true).count()
}

/// Whether one user-visible character may be part of a `#tag`: its first scalar is a letter or a
/// digit in any script, `_` or `-`.
///
/// Looking at the whole grapheme cluster is what lets Thai through: tone marks such as `็` or `่`
/// are combining marks that `char::is_alphanumeric` rejects, but they always sit in the same
/// cluster as the consonant they belong to. Emoji start with a symbol, so they are never tag
/// characters.
pub fn is_tag_char(cluster: &str) -> bool {
    cluster
        .chars()
        .next()
        .is_some_and(|c| c.is_alphanumeric() || c == '_' || c == '-')
}

/// A note's text with its `#tags` taken out, and those tags (first spelling wins, ignoring case).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extracted {
    pub text: String,
    pub tags: Vec<String>,
}

/// Take every `#tag` out of `text`.
///
/// A tag starts with `#` at the start of the text or after whitespace, followed by one or more
/// tag characters (`is_tag_char`), and is at most `MAX_NAME_LEN` characters long. Anything else
/// (`C#`, `# heading`, `#🎉`) stays plain text. One blank next to a removed tag goes with it (the
/// one after it, else the one before it) so no double spaces are left behind; line breaks stay.
pub fn extract_tags(text: &str) -> Extracted {
    let clusters: Vec<(usize, &str)> = text.grapheme_indices(true).collect();
    let offset = |i: usize| clusters.get(i).map_or(text.len(), |&(at, _)| at);
    let mut removed: Vec<(usize, usize)> = Vec::new();
    let mut tags: Vec<String> = Vec::new();
    let mut i = 0;
    while i < clusters.len() {
        let starts_word = i == 0 || is_space(clusters[i - 1].1);
        if clusters[i].1 != "#" || !starts_word {
            i += 1;
            continue;
        }
        let name_end = (i + 1..clusters.len())
            .find(|&j| !is_tag_char(clusters[j].1))
            .unwrap_or(clusters.len());
        let name = &text[offset(i + 1)..offset(name_end)];
        if name.is_empty() || name.chars().count() > MAX_NAME_LEN {
            i += 1;
            continue;
        }
        let (mut start, mut next) = (offset(i), name_end);
        let previous_end = removed.last().map_or(0, |&(_, end)| end);
        if clusters.get(name_end).is_some_and(|&(_, c)| is_blank(c)) {
            next += 1;
        } else if i > 0 && is_blank(clusters[i - 1].1) && clusters[i - 1].0 >= previous_end {
            start = clusters[i - 1].0;
        }
        removed.push((start, offset(next)));
        push_unique(&mut tags, name);
        i = next;
    }
    let mut rest = String::with_capacity(text.len());
    let mut at = 0;
    for (start, end) in removed {
        rest.push_str(&text[at..start]);
        at = end;
    }
    rest.push_str(&text[at..]);
    Extracted { text: rest, tags }
}

/// Check the name of a tag a note is about to create. Existing tags are reused by name whatever
/// characters they have (they may come from the Activities page, where spaces are fine).
pub fn tag_name(raw: &str) -> Result<String> {
    let trimmed = raw.trim();
    let name = trimmed.strip_prefix('#').unwrap_or(trimmed);
    if name.is_empty() || !name.graphemes(true).all(is_tag_char) {
        return Err(Error::InvalidNoteTag);
    }
    validate::name(name)
}

pub fn create_note(conn: &mut Connection, input: NewNote) -> Result<Note> {
    let content = Content::check(&input.text, &input.tags)?;
    check_color(&input.color)?;
    validate::date(&input.date)?;
    let tx = conn.transaction()?;
    let tag_ids = resolve_tags(&tx, &content.tags)?;
    // A new note goes to the top of the board, like a note stuck on top of the pile.
    tx.execute(
        "INSERT INTO notes (text, date, color, position)
         VALUES (?1, ?2, ?3, (SELECT COALESCE(MIN(position) - 1, 0) FROM notes))",
        params![content.text, input.date, input.color],
    )?;
    let id = tx.last_insert_rowid();
    link_tags(&tx, id, &tag_ids)?;
    tx.commit()?;
    get(conn, id)
}

/// Change a note's text, tags and color. The date is not part of an edit: see `move_note`; the pin,
/// the order and the reminder have their own functions.
/// An edit that changes nothing writes nothing, so `updated_at` only moves on a real change.
pub fn update_note(conn: &mut Connection, id: NoteId, edit: NoteEdit) -> Result<Note> {
    let content = Content::check(&edit.text, &edit.tags)?;
    check_color(&edit.color)?;
    let tx = conn.transaction()?;
    let before = get(&tx, id)?;
    let tag_ids = resolve_tags(&tx, &content.tags)?;
    let same_tags = tag_ids.iter().collect::<HashSet<_>>() == before.tag_ids.iter().collect::<HashSet<_>>();
    if before.text == content.text && same_tags && before.color == edit.color {
        return Ok(before);
    }
    tx.execute(
        "UPDATE notes SET text = ?2, color = ?3, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
        params![id, content.text, edit.color],
    )?;
    tx.execute("DELETE FROM note_tags WHERE note_id = ?1", [id])?;
    link_tags(&tx, id, &tag_ids)?;
    tx.commit()?;
    get(conn, id)
}

/// Put a note on another day: the only way a date changes, used by the Calendar only.
/// `created_at` stays; `updated_at` moves (unless the day is the same, which changes nothing).
pub fn move_note(conn: &Connection, id: NoteId, date: &str) -> Result<Note> {
    validate::date(date)?;
    let note = get(conn, id)?;
    if note.date == date {
        return Ok(note);
    }
    conn.execute(
        "UPDATE notes SET date = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![id, date],
    )?;
    get(conn, id)
}

/// Delete one note for good, and return it so the UI can offer Undo (`restore_note`).
/// Its tag links go with it; the tags themselves stay.
pub fn delete_note(conn: &Connection, id: NoteId) -> Result<Note> {
    let note = get(conn, id)?;
    conn.execute("DELETE FROM notes WHERE id = ?1", [id])?;
    Ok(note)
}

/// Put back a note `delete_note` returned (Undo), with its id, date and times when the id is
/// still free. Tags deleted in the meantime are left off.
pub fn restore_note(conn: &mut Connection, note: &Note) -> Result<Note> {
    let content = Content::check(&note.text, &[])?;
    check_color(&note.color)?;
    validate::date(&note.date)?;
    let remind_at = note.remind_at.as_deref().map(validate::timestamp).transpose()?;
    if note.created_at.is_empty() || note.updated_at.is_empty() {
        return Err(Error::InvalidDate);
    }
    let tx = conn.transaction()?;
    let id_taken = tx
        .query_row("SELECT 1 FROM notes WHERE id = ?1", [note.id], |_| Ok(()))
        .optional()?
        .is_some();
    tx.execute(
        "INSERT INTO notes (id, text, date, color, pinned, position, remind_at, reminded_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MIN(position) - 1, 0) FROM notes), ?6, ?7, ?8, ?9)",
        params![
            (!id_taken).then_some(note.id),
            content.text,
            note.date,
            note.color,
            note.pinned,
            remind_at,
            note.reminded_at,
            note.created_at,
            note.updated_at
        ],
    )?;
    let id = tx.last_insert_rowid();
    let mut link = tx.prepare("INSERT INTO note_tags (note_id, tag_id) SELECT ?1, id FROM tags WHERE id = ?2")?;
    for &tag_id in &note.tag_ids {
        link.execute([id, tag_id])?;
    }
    drop(link);
    tx.commit()?;
    get(conn, id)
}

/// Notes in board order: pinned ones first, then the order the user gave them (`reorder_notes`);
/// a new note goes first. `filter` narrows the list by tag and keyword together.
pub fn list(conn: &Connection, query: &NoteQuery, filter: &NoteFilter) -> Result<Vec<Note>> {
    let mut clauses: Vec<&str> = Vec::new();
    let mut args: Vec<Value> = Vec::new();
    match query {
        NoteQuery::All => {}
        NoteQuery::Date { date } => {
            validate::date(date)?;
            clauses.push("date = ?");
            args.push(Value::Text(date.clone()));
        }
        NoteQuery::Range { from, to } => {
            check_range(from, to)?;
            clauses.push("date BETWEEN ? AND ?");
            args.extend([Value::Text(from.clone()), Value::Text(to.clone())]);
        }
    }
    if let Some(tag_id) = filter.tag_id {
        clauses.push("EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id AND tag_id = ?)");
        args.push(Value::Integer(tag_id));
    }
    let where_sql = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };
    let sql = format!("SELECT {COLUMNS} FROM notes {where_sql} ORDER BY pinned DESC, position ASC, id DESC");
    let mut stmt = conn.prepare(&sql)?;
    let mut notes = stmt
        .query_map(params_from_iter(args), from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut links = tag_ids_by_note(conn)?;
    for note in &mut notes {
        note.tag_ids = links.remove(&note.id).unwrap_or_default();
    }
    if let Some(keyword) = filter.keyword.as_deref().filter(|k| !k.trim().is_empty()) {
        let names: HashMap<TagId, String> = tags::list(conn)?
            .into_iter()
            .map(|tag| (tag.id, tag.name.to_lowercase()))
            .collect();
        notes.retain(|note| matches_keyword(note, keyword, &names));
    }
    Ok(notes)
}

/// Pin or unpin a note. A note changes place when its pin changes: it goes to the top of its new
/// group. Nothing else changes, not even `updated_at`: pinning is arranging, not editing.
pub fn pin_note(conn: &Connection, id: NoteId, pinned: bool) -> Result<Note> {
    let note = get(conn, id)?;
    if note.pinned == pinned {
        return Ok(note);
    }
    conn.execute(
        "UPDATE notes SET pinned = ?2, position = (SELECT COALESCE(MIN(position) - 1, 0) FROM notes) WHERE id = ?1",
        params![id, pinned],
    )?;
    get(conn, id)
}

/// Put these notes in this order (the user dragged them). The first gets the lowest position.
/// Send a whole group at a time, pinned or not: the groups never mix, because pinned notes sort
/// first whatever their positions. Unknown ids refuse the whole change; repeated ids count once.
pub fn reorder_notes(conn: &mut Connection, ids: &[NoteId]) -> Result<()> {
    let tx = conn.transaction()?;
    let mut seen = HashSet::new();
    let mut set = tx.prepare("UPDATE notes SET position = ?2 WHERE id = ?1")?;
    for (index, &id) in ids.iter().filter(|id| seen.insert(**id)).enumerate() {
        if set.execute(params![id, index as i64])? == 0 {
            return Err(Error::NotFound);
        }
    }
    drop(set);
    tx.commit()?;
    Ok(())
}

/// Set or clear a note's reminder (`remind_at` is UTC, like `2026-10-06T08:30:00Z`). Setting one
/// makes it due again, even if an earlier reminder was already shown. A time in the past is
/// accepted: it is shown at the next check. Pinning-style change: `updated_at` stays.
pub fn set_reminder(conn: &Connection, id: NoteId, remind_at: Option<&str>) -> Result<Note> {
    let remind_at = remind_at.map(validate::timestamp).transpose()?;
    get(conn, id)?;
    conn.execute(
        "UPDATE notes SET remind_at = ?2, reminded_at = NULL WHERE id = ?1",
        params![id, remind_at],
    )?;
    get(conn, id)
}

/// Notes whose reminder time has come and that were not shown yet, soonest first.
pub fn due_reminders(conn: &Connection) -> Result<Vec<Note>> {
    let sql = format!(
        "SELECT {COLUMNS} FROM notes
         WHERE remind_at IS NOT NULL AND reminded_at IS NULL AND remind_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         ORDER BY remind_at, id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let mut due = stmt.query_map([], from_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
    let mut links = tag_ids_by_note(conn)?;
    for note in &mut due {
        note.tag_ids = links.remove(&note.id).unwrap_or_default();
    }
    Ok(due)
}

/// Remember that a note's reminder was shown, so it is not shown again.
pub fn mark_reminded(conn: &Connection, id: NoteId) -> Result<Note> {
    get(conn, id)?;
    conn.execute(
        "UPDATE notes SET reminded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1 AND remind_at IS NOT NULL",
        [id],
    )?;
    get(conn, id)
}

/// Per day from `from` to `to`: how many notes. Days with no notes
/// are left out; oldest first.
pub fn month_counts(conn: &Connection, from: &str, to: &str) -> Result<Vec<NoteDayCount>> {
    check_range(from, to)?;
    let mut stmt = conn.prepare(
        "SELECT date, COUNT(*)
         FROM notes WHERE date BETWEEN ?1 AND ?2 GROUP BY date ORDER BY date",
    )?;
    let rows = stmt.query_map(params![from, to], |r| {
        Ok(NoteDayCount {
            date: r.get(0)?,
            notes: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

/// Text and tags after the rules: the text trimmed and free of `#tags`, and every tag
/// name the note should carry (the ones given plus the ones taken out of the text).
struct Content {
    text: String,
    tags: Vec<String>,
}

impl Content {
    /// The rules every note obeys, in this order: text not empty, text not too long, a known
    /// at most `MAX_NOTE_TAGS` tags. (Tag names are checked when they are resolved.)
    fn check(text: &str, given: &[String]) -> Result<Self> {
        let extracted = extract_tags(text);
        let text = extracted.text.trim();
        if text.is_empty() {
            return Err(Error::NoteEmpty);
        }
        if text_len(text) > MAX_NOTE_LEN {
            return Err(Error::NoteTooLong);
        }
        let mut tags = Vec::new();
        for name in given.iter().chain(&extracted.tags) {
            let trimmed = name.trim();
            push_unique(&mut tags, trimmed.strip_prefix('#').unwrap_or(trimmed));
        }
        if tags.len() > MAX_NOTE_TAGS {
            return Err(Error::NoteTooManyTags);
        }
        Ok(Self {
            text: text.to_owned(),
            tags,
        })
    }
}

/// Tag ids for these names: an existing tag with the same name (ignoring case) is reused as it is
/// spelled; any other name must pass `tag_name` and becomes a new tag with no color. Runs inside
/// the note's transaction, so a refused note creates no tags.
fn resolve_tags(tx: &Transaction, names: &[String]) -> Result<Vec<TagId>> {
    let existing: HashMap<String, TagId> = tags::list(tx)?
        .into_iter()
        .map(|tag| (tag.name.to_lowercase(), tag.id))
        .collect();
    let mut ids = Vec::with_capacity(names.len());
    for name in names {
        let id = match existing.get(&name.to_lowercase()) {
            Some(&id) => id,
            None => {
                let name = tag_name(name)?;
                tags::create(tx, TagInput { name, color: None })?.id
            }
        };
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
    Ok(ids)
}

fn link_tags(tx: &Transaction, id: NoteId, tag_ids: &[TagId]) -> Result<()> {
    let mut insert = tx.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)")?;
    for &tag_id in tag_ids {
        insert.execute([id, tag_id])?;
    }
    Ok(())
}

const COLUMNS: &str = "id, text, date, color, pinned, remind_at, reminded_at, created_at, updated_at";

fn get(conn: &Connection, id: NoteId) -> Result<Note> {
    let sql = format!("SELECT {COLUMNS} FROM notes WHERE id = ?1");
    let mut note = conn
        .query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(Error::NotFound)?;
    let mut stmt = conn.prepare("SELECT tag_id FROM note_tags WHERE note_id = ?1 ORDER BY tag_id")?;
    note.tag_ids = stmt.query_map([id], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    Ok(note)
}

fn tag_ids_by_note(conn: &Connection) -> Result<HashMap<NoteId, Vec<TagId>>> {
    let mut stmt = conn.prepare("SELECT note_id, tag_id FROM note_tags ORDER BY tag_id")?;
    let mut map: HashMap<NoteId, Vec<TagId>> = HashMap::new();
    for row in stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))? {
        let (note_id, tag_id) = row?;
        map.entry(note_id).or_default().push(tag_id);
    }
    Ok(map)
}

fn from_row(row: &Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        text: row.get(1)?,
        date: row.get(2)?,
        color: row.get(3)?,
        pinned: row.get(4)?,
        tag_ids: Vec::new(),
        remind_at: row.get(5)?,
        reminded_at: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

/// Every word appears in the text or in one of the note's tag names, ignoring case.
fn matches_keyword(note: &Note, keyword: &str, tag_names: &HashMap<TagId, String>) -> bool {
    let text = note.text.to_lowercase();
    keyword.to_lowercase().split_whitespace().all(|word| {
        text.contains(word)
            || note
                .tag_ids
                .iter()
                .any(|id| tag_names.get(id).is_some_and(|name| name.contains(word)))
    })
}

fn check_color(color: &str) -> Result<()> {
    if NOTE_COLORS.contains(&color) || is_hex_color(color) {
        Ok(())
    } else {
        Err(Error::InvalidColor)
    }
}

/// A custom paper color: `#` and six lowercase hex digits, the form a color input gives.
fn is_hex_color(color: &str) -> bool {
    color.len() == 7 && color.starts_with('#') && color[1..].bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'))
}

fn check_range(from: &str, to: &str) -> Result<()> {
    validate::date(from)?;
    validate::date(to)?;
    if from > to {
        return Err(Error::InvalidDate);
    }
    Ok(())
}

/// Whitespace of any kind, line breaks included: what may come before a `#tag`.
fn is_space(cluster: &str) -> bool {
    cluster.chars().next().is_some_and(char::is_whitespace)
}

/// Whitespace on one line (not a line break): what goes away with a removed `#tag`.
fn is_blank(cluster: &str) -> bool {
    cluster
        .chars()
        .next()
        .is_some_and(|c| c.is_whitespace() && !matches!(c, '\n' | '\r'))
}

/// Add `name` unless the list already has it, ignoring case (the first spelling wins).
fn push_unique(names: &mut Vec<String>, name: &str) {
    let lower = name.to_lowercase();
    if !name.is_empty() && !names.iter().any(|n| n.to_lowercase() == lower) {
        names.push(name.to_owned());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use serde_json::Value as Json;

    const DAY: &str = "2026-10-06";

    fn new(text: &str) -> NewNote {
        NewNote {
            date: DAY.into(),
            text: text.into(),
            color: "yellow".into(),
            tags: vec![],
        }
    }

    fn on(date: &str, text: &str) -> NewNote {
        NewNote {
            date: date.into(),
            ..new(text)
        }
    }

    fn edit(text: &str) -> NoteEdit {
        NoteEdit {
            text: text.into(),
            color: "yellow".into(),
            tags: vec![],
        }
    }

    fn add(conn: &mut Connection, input: NewNote) -> Note {
        create_note(conn, input).unwrap()
    }

    fn texts(notes: &[Note]) -> Vec<&str> {
        notes.iter().map(|n| n.text.as_str()).collect()
    }

    fn all(conn: &Connection) -> Vec<Note> {
        list(conn, &NoteQuery::All, &NoteFilter::default()).unwrap()
    }

    fn tag_names(conn: &Connection, note: &Note) -> Vec<String> {
        let names: HashMap<TagId, String> = tags::list(conn).unwrap().into_iter().map(|t| (t.id, t.name)).collect();
        note.tag_ids.iter().map(|id| names[id].clone()).collect()
    }

    fn tag(conn: &Connection, name: &str) -> TagId {
        tags::create(
            conn,
            TagInput {
                name: name.into(),
                color: None,
            },
        )
        .unwrap()
        .id
    }

    fn rules() -> Json {
        serde_json::from_str(include_str!("../fixtures/note_rules.json")).unwrap()
    }

    fn strings(value: &Json) -> Vec<String> {
        value
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_owned())
            .collect()
    }

    // ---------- The shared rules (fixtures/note_rules.json) ----------

    #[test]
    fn constants_match_the_shared_fixture() {
        let rules = rules();
        assert_eq!(rules["maxNoteLen"], MAX_NOTE_LEN);
        assert_eq!(rules["maxNoteTags"], MAX_NOTE_TAGS);
        assert_eq!(strings(&rules["noteColors"]), NOTE_COLORS);
    }

    #[test]
    fn extracts_tags_like_the_shared_cases() {
        for case in rules()["extract"].as_array().unwrap() {
            let text = case["text"].as_str().unwrap();
            let got = extract_tags(text);
            assert_eq!(
                got.text.trim(),
                case["expectText"].as_str().unwrap(),
                "text of {text:?}"
            );
            assert_eq!(got.tags, strings(&case["expectTags"]), "tags of {text:?}");
        }
    }

    #[test]
    fn checks_new_tag_names_like_the_shared_cases() {
        let rules = rules();
        for name in strings(&rules["tagNames"]["valid"]) {
            assert_eq!(tag_name(&name).unwrap(), name, "{name:?} is valid");
        }
        for name in strings(&rules["tagNames"]["invalid"]) {
            assert!(tag_name(&name).is_err(), "{name:?} is invalid");
        }
        assert_eq!(
            tag_name("#work").unwrap(),
            "work",
            "a leading # is not part of the name"
        );
    }

    #[test]
    fn thai_tone_marks_need_the_cluster_rule() {
        // ็ (U+0E47) is a combining mark: on its own, char::is_alphanumeric says no.
        assert!(!'\u{0E47}'.is_alphanumeric());
        assert!(is_tag_char("ร็"));
        assert_eq!(extract_tags("#สำเร็จ").tags, ["สำเร็จ"]);
    }

    // ---------- Counting ----------

    #[test]
    fn thai_cjk_and_emoji_count_as_what_the_user_sees() {
        assert_eq!(text_len("ก็"), 1);
        assert_eq!(text_len("ที่"), 1);
        assert_eq!(text_len("วันนี้ฉันจะ"), 7, "วั·น·นี้·ฉั·น·จ·ะ");
        assert_eq!(text_len("今日は頑張る"), 6);
        assert_eq!(text_len("오늘의 목표"), 6);
        assert_eq!(text_len("👍🏽"), 1, "emoji with a skin tone");
        assert_eq!(text_len("👨‍👩‍👧"), 1, "joined family emoji");
        assert_eq!(text_len("🇹🇭"), 1, "flag");
        assert_eq!(text_len("e\u{301}"), 1, "letter plus combining accent");
        assert_eq!(text_len("a\r\nb"), 3, "a Windows line break is one character");

        let mut conn = open_in_memory().unwrap();
        add(&mut conn, new(&"ที่".repeat(200)));
        assert!(matches!(
            create_note(&mut conn, new(&"ที่".repeat(201))),
            Err(Error::NoteTooLong)
        ));
        add(&mut conn, new(&"👨‍👩‍👧".repeat(200)));
    }

    #[test]
    fn the_limit_is_200_characters_after_trimming_and_tags_do_not_count() {
        let mut conn = open_in_memory().unwrap();
        add(&mut conn, new(&"a".repeat(200)));
        add(&mut conn, new(&format!("  {}  ", "a".repeat(200))));
        add(&mut conn, new(&format!("{} #work #home", "a".repeat(200))));
        assert!(matches!(
            create_note(&mut conn, new(&"a".repeat(201))),
            Err(Error::NoteTooLong)
        ));
    }

    // ---------- Create ----------

    #[test]
    fn creates_a_note_on_its_day() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, on("2026-10-30", "  Hand in the thesis \n"));
        assert_eq!(note.text, "Hand in the thesis");
        assert_eq!(note.date, "2026-10-30");
        assert!(note.created_at.ends_with('Z'));
        assert_eq!(note.created_at, note.updated_at);
    }

    #[test]
    fn every_note_needs_a_valid_date() {
        let mut conn = open_in_memory().unwrap();
        for bad in ["", "2026-13-01", "2026-1-1", "tomorrow"] {
            assert!(matches!(create_note(&mut conn, on(bad, "x")), Err(Error::InvalidDate)));
        }
    }

    #[test]
    fn text_is_trimmed_keeps_inner_line_breaks_and_may_not_be_empty() {
        let mut conn = open_in_memory().unwrap();
        assert_eq!(add(&mut conn, new("one\ntwo")).text, "one\ntwo");
        for blank in ["", "   ", "\n\t ", "#work", " #work #home "] {
            assert!(
                matches!(create_note(&mut conn, new(blank)), Err(Error::NoteEmpty)),
                "{blank:?}"
            );
        }
        assert_eq!(all(&conn).len(), 1);
        assert!(tags::list(&conn).unwrap().is_empty(), "nothing half-written");
    }

    #[test]
    fn one_date_can_have_many_notes() {
        let mut conn = open_in_memory().unwrap();
        for text in ["a", "b", "c"] {
            add(&mut conn, new(text));
        }
        let day = list(&conn, &NoteQuery::Date { date: DAY.into() }, &NoteFilter::default()).unwrap();
        assert_eq!(texts(&day), ["c", "b", "a"], "newest first within a day");
    }

    // ---------- Tags ----------

    #[test]
    fn hashtags_leave_the_text_and_become_tags_in_the_same_transaction() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("Finish the report #work"));
        assert_eq!(note.text, "Finish the report");
        assert_eq!(tag_names(&conn, &note), ["work"]);
        assert_eq!(tags::list(&conn).unwrap()[0].color, None, "a new tag has no color");
    }

    #[test]
    fn existing_tags_are_reused_ignoring_case_and_keep_their_spelling() {
        let mut conn = open_in_memory().unwrap();
        tag(&conn, "Deep-Work");
        tag(&conn, "on the go");
        let mut input = new("Write #deep-work");
        input.tags = vec!["ON THE GO".into()];
        let note = add(&mut conn, input);
        assert_eq!(tag_names(&conn, &note), ["Deep-Work", "on the go"]);
        assert_eq!(tags::list(&conn).unwrap().len(), 2, "nothing new was created");
    }

    #[test]
    fn a_new_tag_must_use_tag_characters() {
        let mut conn = open_in_memory().unwrap();
        let mut input = new("x");
        input.tags = vec!["two words".into()];
        assert!(matches!(create_note(&mut conn, input), Err(Error::InvalidNoteTag)));
        let mut input = new("x");
        input.tags = vec!["สำเร็จ".into(), "勉強".into(), "공부".into()];
        let note = add(&mut conn, input);
        assert_eq!(tag_names(&conn, &note), ["สำเร็จ", "勉強", "공부"]);
    }

    #[test]
    fn at_most_five_tags_and_a_refused_note_creates_no_tags() {
        let mut conn = open_in_memory().unwrap();
        add(&mut conn, new("ok #a #b #c #d #e #A"));
        assert!(matches!(
            create_note(&mut conn, new("no #a #b #c #d #e #f")),
            Err(Error::NoteTooManyTags)
        ));
        assert_eq!(tags::list(&conn).unwrap().len(), 5, "#f was never created");
    }

    #[test]
    fn deleting_a_tag_keeps_the_notes_and_renaming_shows_everywhere() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x #work #home"));
        let work = note.tag_ids[0];
        tags::update(
            &conn,
            work,
            TagInput {
                name: "Office".into(),
                color: None,
            },
        )
        .unwrap();
        assert_eq!(tag_names(&conn, &all(&conn)[0]), ["Office", "home"]);
        tags::delete(&conn, work).unwrap();
        assert_eq!(all(&conn)[0].tag_ids.len(), 1, "the note stays, without that tag");
    }

    // ---------- Update and move ----------

    #[test]
    fn update_changes_text_and_tags_but_never_the_date() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("Old #work"));
        conn.execute("UPDATE notes SET updated_at = '2000-01-01T00:00:00.000Z'", [])
            .unwrap();
        let edited = update_note(&mut conn, note.id, edit(" New #home ")).unwrap();
        assert_eq!((edited.id, edited.date.as_str()), (note.id, DAY));
        assert_eq!(edited.created_at, note.created_at);
        assert_eq!(edited.text, "New");
        assert_eq!(tag_names(&conn, &edited), ["home"], "tags are replaced");
        assert_ne!(edited.updated_at, "2000-01-01T00:00:00.000Z");
    }

    #[test]
    fn an_edit_that_changes_nothing_writes_nothing() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("Same #work"));
        conn.execute("UPDATE notes SET updated_at = '2000-01-01T00:00:00.000Z'", [])
            .unwrap();
        let mut same = edit("Same");
        same.tags = vec!["WORK".into()];
        assert_eq!(
            update_note(&mut conn, note.id, same).unwrap().updated_at,
            "2000-01-01T00:00:00.000Z"
        );
    }

    #[test]
    fn update_follows_the_same_rules_and_changes_nothing_when_refused() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("Keep me"));
        for (bad, kind) in [
            (edit(" "), "noteEmpty"),
            (edit(&"a".repeat(201)), "noteTooLong"),
            (edit("y #a #b #c #d #e #f"), "noteTooManyTags"),
        ] {
            assert_eq!(update_note(&mut conn, note.id, bad).unwrap_err().kind(), kind);
        }
        assert_eq!(all(&conn), vec![note]);
        assert!(tags::list(&conn).unwrap().is_empty());
    }

    #[test]
    fn move_is_the_only_way_to_change_a_date() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x"));
        conn.execute("UPDATE notes SET updated_at = '2000-01-01T00:00:00.000Z'", [])
            .unwrap();
        let moved = move_note(&conn, note.id, "2026-10-30").unwrap();
        assert_eq!(moved.date, "2026-10-30");
        assert_eq!(moved.created_at, note.created_at, "created_at stays");
        assert_ne!(moved.updated_at, "2000-01-01T00:00:00.000Z", "updated_at moves");
        for bad in ["", "2026-02-xx"] {
            assert!(
                matches!(move_note(&conn, note.id, bad), Err(Error::InvalidDate)),
                "a date cannot be cleared"
            );
        }
        assert!(matches!(move_note(&conn, 99, DAY), Err(Error::NotFound)));
    }

    #[test]
    fn missing_notes_are_not_found() {
        let mut conn = open_in_memory().unwrap();
        assert!(matches!(update_note(&mut conn, 99, edit("x")), Err(Error::NotFound)));
        assert!(matches!(delete_note(&conn, 99), Err(Error::NotFound)));
    }

    // ---------- Delete and undo ----------

    #[test]
    fn delete_returns_the_note_and_restore_puts_it_back_as_it_was() {
        let mut conn = open_in_memory().unwrap();
        add(&mut conn, new("keep"));
        let note = add(&mut conn, on("2026-10-30", "Hand in #school"));
        let deleted = delete_note(&conn, note.id).unwrap();
        assert_eq!(deleted, note);
        assert_eq!(texts(&all(&conn)), ["keep"]);
        assert_eq!(tags::list(&conn).unwrap().len(), 1, "the tag stays");

        assert_eq!(restore_note(&mut conn, &deleted).unwrap(), note);
        assert_eq!(all(&conn).len(), 2);
    }

    #[test]
    fn restore_skips_tags_deleted_meanwhile_and_takes_a_new_id_if_needed() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x #work #home"));
        let deleted = delete_note(&conn, note.id).unwrap();
        tags::delete(&conn, deleted.tag_ids[0]).unwrap();
        conn.execute(
            "INSERT INTO notes (id, text, date) VALUES (?1, 'other', ?2)",
            params![note.id, DAY],
        )
        .unwrap();
        let back = restore_note(&mut conn, &deleted).unwrap();
        assert_ne!(back.id, note.id);
        assert_eq!(back.tag_ids, vec![deleted.tag_ids[1]]);
        assert_eq!(back.created_at, note.created_at);
    }

    // ---------- Lists and counts ----------

    fn sample() -> Connection {
        let mut conn = open_in_memory().unwrap();
        add(&mut conn, on("2026-10-05", "Ran 5 km #health"));
        add(&mut conn, on(DAY, "Study two hours #school"));
        add(&mut conn, on("2026-10-30", "Hand in the thesis #school"));
        add(&mut conn, on(DAY, "Calm and rested"));
        conn
    }

    fn filtered(conn: &Connection, filter: NoteFilter) -> String {
        texts(&list(conn, &NoteQuery::All, &filter).unwrap()).join(" | ")
    }

    #[test]
    fn a_new_note_goes_first_and_the_date_does_not_decide_the_order() {
        let conn = sample();
        assert_eq!(
            texts(&all(&conn)),
            ["Calm and rested", "Hand in the thesis", "Study two hours", "Ran 5 km"]
        );
    }

    #[test]
    fn list_by_day_and_range() {
        let conn = sample();
        let none = NoteFilter::default();
        let day = list(&conn, &NoteQuery::Date { date: DAY.into() }, &none).unwrap();
        assert_eq!(
            texts(&day),
            ["Calm and rested", "Study two hours"],
            "board order, not date order"
        );
        let range = NoteQuery::Range {
            from: "2026-10-05".into(),
            to: DAY.into(),
        };
        assert_eq!(list(&conn, &range, &none).unwrap().len(), 3, "both ends are included");
        let backwards = NoteQuery::Range {
            from: DAY.into(),
            to: "2026-10-05".into(),
        };
        for bad in [NoteQuery::Date { date: "x".into() }, backwards] {
            assert!(matches!(list(&conn, &bad, &none), Err(Error::InvalidDate)));
        }
    }

    #[test]
    fn filters_by_tag_and_keyword_together() {
        let conn = sample();
        let school = tags::list(&conn)
            .unwrap()
            .into_iter()
            .find(|t| t.name == "school")
            .unwrap()
            .id;
        let by_tag = NoteFilter {
            tag_id: Some(school),
            ..Default::default()
        };
        assert_eq!(
            filtered(&conn, by_tag),
            "Hand in the thesis | Study two hours",
            "board order"
        );
        let words = NoteFilter {
            keyword: Some("SCHOOL two".into()),
            ..Default::default()
        };
        assert_eq!(
            filtered(&conn, words),
            "Study two hours",
            "every word, in the text or a tag name, ignoring case"
        );
        let together = NoteFilter {
            tag_id: Some(school),
            keyword: Some("study".into()),
        };
        assert_eq!(filtered(&conn, together), "Study two hours");
    }

    #[test]
    fn month_counts_group_by_day() {
        let mut conn = sample();
        add(&mut conn, on("2026-10-30", "Buy flowers"));
        let counts = month_counts(&conn, "2026-10-01", "2026-10-31").unwrap();
        let got: Vec<(&str, i64)> = counts.iter().map(|c| (c.date.as_str(), c.notes)).collect();
        assert_eq!(got, [("2026-10-05", 1), (DAY, 2), ("2026-10-30", 2)]);
        assert_eq!(month_counts(&conn, DAY, "2026-10-29").unwrap().len(), 1);
        assert!(matches!(
            month_counts(&conn, "2026-10-31", "2026-10-01"),
            Err(Error::InvalidDate)
        ));
    }

    // ---------- Color, pin, order, reminder ----------

    fn by_text(conn: &Connection, text: &str) -> Note {
        all(conn).into_iter().find(|n| n.text == text).unwrap()
    }

    #[test]
    fn a_note_can_have_a_custom_hex_color() {
        let mut conn = open_in_memory().unwrap();
        let input = NewNote {
            color: "#12ab9f".into(),
            ..new("x")
        };
        assert_eq!(add(&mut conn, input).color, "#12ab9f");
    }

    #[test]
    fn a_note_has_one_of_the_colors_and_yellow_is_the_default() {
        let mut conn = open_in_memory().unwrap();
        assert_eq!(add(&mut conn, new("plain")).color, "yellow");
        for color in NOTE_COLORS {
            let input = NewNote {
                color: color.into(),
                ..new("x")
            };
            assert_eq!(add(&mut conn, input).color, color);
        }
        for bad in ["", "Yellow", "#FFCC00", "#fc0", "#ffcc0", "#gggggg", "ffcc00", "neon"] {
            let input = NewNote {
                color: bad.into(),
                ..new("x")
            };
            assert!(
                matches!(create_note(&mut conn, input), Err(Error::InvalidColor)),
                "{bad}"
            );
            let change = NoteEdit {
                color: bad.into(),
                ..edit("x")
            };
            let note = add(&mut conn, new("y"));
            assert!(matches!(
                update_note(&mut conn, note.id, change),
                Err(Error::InvalidColor)
            ));
        }
    }

    #[test]
    fn changing_only_the_color_is_an_edit() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("Same"));
        conn.execute("UPDATE notes SET updated_at = '2000-01-01T00:00:00.000Z'", [])
            .unwrap();
        let blue = NoteEdit {
            color: "blue".into(),
            ..edit("Same")
        };
        let changed = update_note(&mut conn, note.id, blue).unwrap();
        assert_eq!(changed.color, "blue");
        assert_ne!(changed.updated_at, "2000-01-01T00:00:00.000Z");
    }

    #[test]
    fn pinned_notes_come_first_and_a_pinned_note_goes_to_the_top_of_the_pins() {
        let mut conn = open_in_memory().unwrap();
        for text in ["a", "b", "c"] {
            add(&mut conn, new(text));
        }
        assert_eq!(texts(&all(&conn)), ["c", "b", "a"]);
        let a = by_text(&conn, "a");
        assert!(pin_note(&conn, a.id, true).unwrap().pinned);
        assert_eq!(texts(&all(&conn)), ["a", "c", "b"]);
        let b = by_text(&conn, "b");
        pin_note(&conn, b.id, true).unwrap();
        assert_eq!(texts(&all(&conn)), ["b", "a", "c"], "the newest pin is first");
        pin_note(&conn, a.id, false).unwrap();
        assert_eq!(texts(&all(&conn)), ["b", "a", "c"], "an unpinned note tops the others");
        assert!(!by_text(&conn, "a").pinned);
        assert!(matches!(pin_note(&conn, 999, true), Err(Error::NotFound)));
    }

    #[test]
    fn pinning_is_arranging_so_it_does_not_touch_updated_at() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x"));
        conn.execute("UPDATE notes SET updated_at = '2000-01-01T00:00:00.000Z'", [])
            .unwrap();
        assert_eq!(
            pin_note(&conn, note.id, true).unwrap().updated_at,
            "2000-01-01T00:00:00.000Z"
        );
    }

    #[test]
    fn reorder_puts_notes_in_the_order_given_and_never_mixes_pinned_with_the_rest() {
        let mut conn = open_in_memory().unwrap();
        for text in ["a", "b", "c", "d"] {
            add(&mut conn, new(text));
        }
        let [a, b, c, d] = ["a", "b", "c", "d"].map(|t| by_text(&conn, t).id);
        pin_note(&conn, a, true).unwrap();
        assert_eq!(texts(&all(&conn)), ["a", "d", "c", "b"]);
        reorder_notes(&mut conn, &[b, c, d]).unwrap();
        assert_eq!(texts(&all(&conn)), ["a", "b", "c", "d"], "the pin stays first");
        reorder_notes(&mut conn, &[d, d, b, c]).unwrap();
        assert_eq!(
            texts(&all(&conn))[1..],
            ["d", "b", "c"].map(String::from)[..],
            "a repeated id counts once"
        );
        // Reordering is not editing.
        assert!(all(&conn).iter().all(|n| n.updated_at == n.created_at));
    }

    #[test]
    fn reorder_with_an_unknown_id_changes_nothing() {
        let mut conn = open_in_memory().unwrap();
        for text in ["a", "b"] {
            add(&mut conn, new(text));
        }
        let ids: Vec<_> = all(&conn).iter().map(|n| n.id).collect();
        assert!(matches!(
            reorder_notes(&mut conn, &[ids[1], 999, ids[0]]),
            Err(Error::NotFound)
        ));
        assert_eq!(texts(&all(&conn)), ["b", "a"]);
    }

    #[test]
    fn a_reminder_is_a_utc_time_and_setting_it_makes_it_due_again() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x"));
        let set = set_reminder(&conn, note.id, Some("2999-01-01T08:30:00Z")).unwrap();
        assert_eq!(
            set.remind_at.as_deref(),
            Some("2999-01-01T08:30:00.000Z"),
            "one fixed shape"
        );
        assert_eq!(set.reminded_at, None);
        assert_eq!(set.updated_at, note.updated_at, "a reminder is not an edit");
        let millis = set_reminder(&conn, note.id, Some("2999-01-01T08:30:00.250Z")).unwrap();
        assert_eq!(millis.remind_at.as_deref(), Some("2999-01-01T08:30:00.250Z"));
        let cleared = set_reminder(&conn, note.id, None).unwrap();
        assert_eq!(cleared.remind_at, None);
    }

    #[test]
    fn a_bad_reminder_is_refused_and_changes_nothing() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x"));
        set_reminder(&conn, note.id, Some("2999-01-01T08:30:00Z")).unwrap();
        for bad in [
            "",
            "2999-01-01",
            "2999-01-01T08:30:00",
            "2999-01-01 08:30:00Z",
            "2999-01-01T24:00:00Z",
            "2999-01-01T08:60:00Z",
            "2999-13-01T08:30:00Z",
            "2999-01-01T08:30:00+07:00",
            "2999-01-01T8:30:00Z",
            "2999-01-01T08:30:00.5Z",
        ] {
            assert!(
                matches!(set_reminder(&conn, note.id, Some(bad)), Err(Error::InvalidReminder)),
                "{bad}"
            );
        }
        assert_eq!(
            by_text(&conn, "x").remind_at.as_deref(),
            Some("2999-01-01T08:30:00.000Z")
        );
        assert!(matches!(set_reminder(&conn, 999, None), Err(Error::NotFound)));
    }

    #[test]
    fn due_reminders_are_the_past_ones_not_yet_shown_soonest_first() {
        let mut conn = open_in_memory().unwrap();
        let [late, early, future, none] = ["late", "early", "future", "none"].map(|t| add(&mut conn, new(t)));
        set_reminder(&conn, late.id, Some("2001-01-02T00:00:00Z")).unwrap();
        set_reminder(&conn, early.id, Some("2001-01-01T00:00:00Z")).unwrap();
        set_reminder(&conn, future.id, Some("2999-01-01T00:00:00Z")).unwrap();
        let _ = none;
        assert_eq!(texts(&due_reminders(&conn).unwrap()), ["early", "late"]);
        let shown = mark_reminded(&conn, early.id).unwrap();
        assert!(shown.reminded_at.is_some());
        assert_eq!(texts(&due_reminders(&conn).unwrap()), ["late"], "shown once");
        // Setting it again makes it due again; clearing removes it from the list.
        set_reminder(&conn, early.id, Some("2001-01-01T00:00:00Z")).unwrap();
        assert_eq!(texts(&due_reminders(&conn).unwrap()), ["early", "late"]);
        set_reminder(&conn, late.id, None).unwrap();
        assert_eq!(texts(&due_reminders(&conn).unwrap()), ["early"]);
        assert!(matches!(mark_reminded(&conn, 999), Err(Error::NotFound)));
    }

    #[test]
    fn marking_a_note_without_a_reminder_does_nothing() {
        let mut conn = open_in_memory().unwrap();
        let note = add(&mut conn, new("x"));
        assert_eq!(mark_reminded(&conn, note.id).unwrap().reminded_at, None);
    }

    #[test]
    fn restore_brings_back_color_pin_order_and_reminder() {
        let mut conn = open_in_memory().unwrap();
        let input = NewNote {
            color: "teal".into(),
            ..new("keep")
        };
        let note = add(&mut conn, input);
        add(&mut conn, new("other"));
        pin_note(&conn, note.id, true).unwrap();
        set_reminder(&conn, note.id, Some("2999-01-01T08:30:00Z")).unwrap();
        let deleted = delete_note(&conn, note.id).unwrap();
        let back = restore_note(&mut conn, &deleted).unwrap();
        assert_eq!((back.color.as_str(), back.pinned), ("teal", true));
        assert_eq!(back.remind_at, deleted.remind_at);
        assert_eq!(
            texts(&all(&conn)),
            ["keep", "other"],
            "a pinned note is back at the top"
        );
    }
}
