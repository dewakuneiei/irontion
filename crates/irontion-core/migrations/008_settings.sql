-- App settings the backend itself must read (F008): one row per setting, absent until chosen.
--  * `notifications`: 'allowed' or 'denied'. Absent means the user has not been asked yet.
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
