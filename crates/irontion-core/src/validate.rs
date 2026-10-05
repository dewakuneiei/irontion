//! Input checks shared by the repositories.

use crate::{Error, MAX_NAME_LEN, Result, SLOTS_PER_DAY};

/// Trim and check a user-entered name.
pub fn name(raw: &str) -> Result<String> {
    let trimmed = raw.trim();
    let len = trimmed.chars().count();
    if len == 0 || len > MAX_NAME_LEN {
        return Err(Error::InvalidName);
    }
    Ok(trimmed.to_owned())
}

/// `#rrggbb`, normalized to lowercase.
pub fn color(raw: &str) -> Result<String> {
    let valid = raw.len() == 7 && raw.starts_with('#') && raw[1..].chars().all(|c| c.is_ascii_hexdigit());
    if !valid {
        return Err(Error::InvalidColor);
    }
    Ok(raw.to_ascii_lowercase())
}

pub fn optional_color(raw: Option<&str>) -> Result<Option<String>> {
    raw.map(color).transpose()
}

/// A calendar date as `YYYY-MM-DD` (local date chosen by the UI).
pub fn date(raw: &str) -> Result<()> {
    let bytes = raw.as_bytes();
    let shape_ok = bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && raw
            .chars()
            .enumerate()
            .all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit());
    if !shape_ok {
        return Err(Error::InvalidDate);
    }
    let month: u32 = raw[5..7].parse().map_err(|_| Error::InvalidDate)?;
    let day: u32 = raw[8..10].parse().map_err(|_| Error::InvalidDate)?;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(Error::InvalidDate);
    }
    Ok(())
}

pub fn slot(slot: usize) -> Result<()> {
    if slot >= SLOTS_PER_DAY {
        return Err(Error::InvalidSlot);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_trimmed_and_bounded() {
        assert_eq!(name("  Study ").unwrap(), "Study");
        assert!(matches!(name("   "), Err(Error::InvalidName)));
        assert!(matches!(name(&"a".repeat(MAX_NAME_LEN + 1)), Err(Error::InvalidName)));
        assert_eq!(name("งานที่ต้องโฟกัส").unwrap(), "งานที่ต้องโฟกัส");
    }

    #[test]
    fn colors_must_be_hex() {
        assert_eq!(color("#2A78D6").unwrap(), "#2a78d6");
        assert!(color("red").is_err());
        assert!(color("#12345").is_err());
        assert!(color("#12345g").is_err());
    }

    #[test]
    fn dates_must_be_iso() {
        assert!(date("2026-10-05").is_ok());
        assert!(date("2026-13-05").is_err());
        assert!(date("2026-1-05").is_err());
        assert!(date("20261005xx").is_err());
    }
}
