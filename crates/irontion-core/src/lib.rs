//! Irontion core: business rules and SQLite storage, shared by every app.
//!
//! Each module is a repository for one concept. Functions take a `rusqlite`
//! connection so they run the same against a file or an in-memory database.

pub mod activities;
pub mod activity_tree;
pub mod blocks;
pub mod data;
pub mod db;
mod error;
pub mod model;
pub mod notes;
pub mod summary;
pub mod tags;
mod validate;

pub use error::{Error, Result};
pub use rusqlite::Connection;

/// Ten-minute cells in one day (24 hours x 6).
pub const SLOTS_PER_DAY: usize = 144;
/// Deepest allowed activity nesting; a top-level activity is level 1.
pub const MAX_DEPTH: usize = 3;
/// Longest activity or tag name, in characters.
pub const MAX_NAME_LEN: usize = 60;
/// Longest note, in user-visible characters (grapheme clusters). See `notes::text_len`.
pub const MAX_NOTE_LEN: usize = 200;
/// Most tags one note can carry.
pub const MAX_NOTE_TAGS: usize = 5;
/// The colors a note's paper can have, in the order the picker shows them. The first is the default.
/// The frontend has a light and a dark step for each (`--note-<id>` in `app.css`). A note may also
/// carry a custom color, `#rrggbb` in lowercase, used as it is in both themes.
pub const NOTE_COLORS: [&str; 9] = [
    "yellow", "orange", "red", "pink", "purple", "blue", "teal", "green", "gray",
];
