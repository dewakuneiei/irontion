-- Activities form a tree through parent_id. color NULL = inherit the parent's color.
CREATE TABLE activities (
    id          INTEGER PRIMARY KEY,
    parent_id   INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    color       TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX activities_parent ON activities(parent_id);

CREATE TABLE tags (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT
);

CREATE TABLE activity_tags (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, tag_id)
) WITHOUT ROWID;

-- One row per filled 10-minute cell. An empty cell has no row.
CREATE TABLE time_blocks (
    date        TEXT    NOT NULL,
    slot        INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 143),
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    PRIMARY KEY (date, slot)
) WITHOUT ROWID;
CREATE INDEX time_blocks_activity ON time_blocks(activity_id, date);
