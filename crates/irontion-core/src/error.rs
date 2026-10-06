/// Errors returned by the core. `kind()` is a stable code the UI translates.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("not found")]
    NotFound,
    #[error("name must be 1-{max} characters", max = crate::MAX_NAME_LEN)]
    InvalidName,
    #[error("color must be #rrggbb")]
    InvalidColor,
    #[error("a top-level activity needs its own color")]
    ColorRequired,
    #[error("date must be YYYY-MM-DD")]
    InvalidDate,
    #[error("slot must be 0-143")]
    InvalidSlot,
    #[error("only activities without sub-activities can fill time blocks")]
    NotLeaf,
    #[error("activities can be nested at most {max} levels", max = crate::MAX_DEPTH)]
    TooDeep,
    #[error("activity is archived")]
    Archived,
    #[error("only archived activities can be deleted permanently")]
    NotArchived,
    #[error("a tag with this name already exists")]
    DuplicateTag,
    #[error("a note can't be empty")]
    NoteEmpty,
    #[error("a note can have at most {max} characters", max = crate::MAX_NOTE_LEN)]
    NoteTooLong,
    #[error("a note can have at most {max} tags", max = crate::MAX_NOTE_TAGS)]
    NoteTooManyTags,
    #[error("a tag from a note may only use letters, marks, digits, _ and -")]
    InvalidNoteTag,
    #[error("a reminder must be a UTC time like 2026-10-06T08:30:00Z")]
    InvalidReminder,
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("could not prepare the data folder: {0}")]
    Io(#[from] std::io::Error),
}

impl Error {
    pub fn kind(&self) -> &'static str {
        match self {
            Error::NotFound => "notFound",
            Error::InvalidName => "invalidName",
            Error::InvalidColor => "invalidColor",
            Error::ColorRequired => "colorRequired",
            Error::InvalidDate => "invalidDate",
            Error::InvalidSlot => "invalidSlot",
            Error::NotLeaf => "notLeaf",
            Error::TooDeep => "tooDeep",
            Error::Archived => "archived",
            Error::NotArchived => "notArchived",
            Error::DuplicateTag => "duplicateTag",
            Error::NoteEmpty => "noteEmpty",
            Error::NoteTooLong => "noteTooLong",
            Error::NoteTooManyTags => "noteTooManyTags",
            Error::InvalidNoteTag => "invalidNoteTag",
            Error::InvalidReminder => "invalidReminder",
            Error::Database(_) => "database",
            Error::Io(_) => "io",
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
