-- Every note has a date and a template (F006). Migrations 002 to 004 already ran on real databases,
-- so this one rebuilds the table instead of editing them:
--  * an undated note gets the local day it was written (`created_at` is UTC, `localtime` turns it
--    into the user's own day), so no note is lost and each lands on the Calendar where it began;
--  * every existing note becomes a "free" note (the template ids are app data, see notes::TEMPLATES).
-- `note_tags` is copied aside and rebuilt too: dropping `notes` with foreign keys on would cascade
-- and delete every link.
CREATE TABLE note_tags_before AS SELECT note_id, tag_id FROM note_tags;
CREATE TABLE notes_before AS SELECT id, text, date, created_at, updated_at FROM notes;
DROP TABLE note_tags;
DROP TABLE notes;

CREATE TABLE notes (
    id         INTEGER PRIMARY KEY,
    template   TEXT NOT NULL,
    text       TEXT NOT NULL,
    date       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX notes_date ON notes(date);

INSERT INTO notes (id, template, text, date, created_at, updated_at)
SELECT id, 'free', text, COALESCE(date, date(created_at, 'localtime')), created_at, updated_at
FROM notes_before;

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
) WITHOUT ROWID;
CREATE INDEX note_tags_tag ON note_tags(tag_id);

INSERT INTO note_tags (note_id, tag_id) SELECT note_id, tag_id FROM note_tags_before;

DROP TABLE note_tags_before;
DROP TABLE notes_before;
