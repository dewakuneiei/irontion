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
            Error::Database(_) => "database",
            Error::Io(_) => "io",
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
