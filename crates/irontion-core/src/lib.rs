//! Irontion core: business rules and SQLite storage, shared by every app.
//!
//! Each module is a repository for one concept. Functions take a `rusqlite`
//! connection so they run the same against a file or an in-memory database.

pub mod activities;
pub mod activity_tree;
pub mod blocks;
pub mod db;
mod error;
pub mod model;
pub mod summary;
pub mod tags;
mod validate;

pub use error::{Error, Result};
pub use rusqlite::Connection;

/// Ten-minute cells in one day (24 hours x 6).
pub const SLOTS_PER_DAY: usize = 144;
/// Deepest allowed activity nesting; a top-level activity is level 1.
pub const MAX_DEPTH: usize = 5;
/// Longest activity or tag name, in characters.
pub const MAX_NAME_LEN: usize = 60;
