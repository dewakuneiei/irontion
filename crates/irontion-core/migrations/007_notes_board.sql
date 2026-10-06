-- The notes board (F006, F008): a color, a pin, a position the user can drag, and a reminder.
--  * `position` orders notes inside the board (pinned notes first); smaller comes first. Existing
--    notes keep the order they had on screen (latest day first, newest created first).
--  * `remind_at` is UTC; `reminded_at` is set once the reminder has been shown.
ALTER TABLE notes ADD COLUMN color       TEXT    NOT NULL DEFAULT 'yellow';
ALTER TABLE notes ADD COLUMN pinned      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN position    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN remind_at   TEXT;
ALTER TABLE notes ADD COLUMN reminded_at TEXT;

UPDATE notes SET position = (
    SELECT COUNT(*) FROM notes AS other
    WHERE other.date > notes.date
       OR (other.date = notes.date AND other.created_at > notes.created_at)
       OR (other.date = notes.date AND other.created_at = notes.created_at AND other.id > notes.id)
);
CREATE INDEX notes_remind ON notes(remind_at) WHERE remind_at IS NOT NULL;
