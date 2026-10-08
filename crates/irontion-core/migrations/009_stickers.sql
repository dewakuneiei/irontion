-- Stickers on calendar days (F007).
--  * `stickers` are the user's own: a name and a square PNG (at most 256 px), cropped in the app.
--  * `day_stickers` puts a sticker on a day: either a built-in preset (by its id, see
--    `STICKER_PRESETS`) or one of the user's own. Deleting the user's sticker takes it off every day.
CREATE TABLE stickers (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    image      BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE day_stickers (
    id         INTEGER PRIMARY KEY,
    date       TEXT NOT NULL,
    preset     TEXT,
    sticker_id INTEGER REFERENCES stickers(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    CHECK ((preset IS NULL) <> (sticker_id IS NULL))
);
CREATE INDEX day_stickers_date ON day_stickers(date, position);
