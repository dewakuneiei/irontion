-- Short sticky notes (F006). `date` is optional: NULL is a plain undated note, a date puts it on the Calendar (F007).
-- `template` is one of the ids in `notes::TEMPLATES`; the templates themselves are app data, not rows.
CREATE TABLE notes (
    id         INTEGER PRIMARY KEY,
    template   TEXT NOT NULL,
    text       TEXT NOT NULL,
    date       TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX notes_date ON notes(date);
