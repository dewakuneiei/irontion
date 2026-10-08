//! Settings the backend itself needs (F008). Display preferences stay in the window; only what
//! Rust acts on without the window lives here.

use rusqlite::{Connection, OptionalExtension, params};

use crate::Result;
use crate::model::NotificationPermission;

const NOTIFICATIONS: &str = "notifications";
const REMINDER_WINDOW: &str = "reminder_window";

/// Whether reminders may be shown as system notifications. `Ask` until the user has chosen.
pub fn notification_permission(conn: &Connection) -> Result<NotificationPermission> {
    Ok(match get(conn, NOTIFICATIONS)?.as_deref() {
        Some("allowed") => NotificationPermission::Allowed,
        Some("denied") => NotificationPermission::Denied,
        _ => NotificationPermission::Ask,
    })
}

/// Record the user's choice. `Ask` forgets it, so the user is asked again.
pub fn set_notification_permission(conn: &Connection, permission: NotificationPermission) -> Result<()> {
    match permission {
        NotificationPermission::Ask => forget(conn, NOTIFICATIONS),
        NotificationPermission::Allowed => put(conn, NOTIFICATIONS, "allowed"),
        NotificationPermission::Denied => put(conn, NOTIFICATIONS, "denied"),
    }
}

/// Whether a due reminder opens a small popup window of its own (F008). Off until the user turns it on.
pub fn reminder_window(conn: &Connection) -> Result<bool> {
    Ok(get(conn, REMINDER_WINDOW)?.as_deref() == Some("on"))
}

pub fn set_reminder_window(conn: &Connection, enabled: bool) -> Result<()> {
    put(conn, REMINDER_WINDOW, if enabled { "on" } else { "off" })
}

fn get(conn: &Connection, key: &str) -> Result<Option<String>> {
    Ok(conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0))
        .optional()?)
}

fn put(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

fn forget(conn: &Connection, key: &str) -> Result<()> {
    conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn notifications_are_asked_about_until_chosen() {
        let conn = open_in_memory().unwrap();
        assert_eq!(notification_permission(&conn).unwrap(), NotificationPermission::Ask);
    }

    #[test]
    fn the_choice_is_kept_and_can_change_or_be_forgotten() {
        let conn = open_in_memory().unwrap();
        for choice in [
            NotificationPermission::Allowed,
            NotificationPermission::Denied,
            NotificationPermission::Allowed,
            NotificationPermission::Ask,
        ] {
            set_notification_permission(&conn, choice).unwrap();
            assert_eq!(notification_permission(&conn).unwrap(), choice);
        }
    }

    #[test]
    fn the_reminder_window_is_off_until_turned_on() {
        let conn = open_in_memory().unwrap();
        assert!(!reminder_window(&conn).unwrap());
        set_reminder_window(&conn, true).unwrap();
        assert!(reminder_window(&conn).unwrap());
        set_reminder_window(&conn, false).unwrap();
        assert!(!reminder_window(&conn).unwrap());
    }

    #[test]
    fn the_two_settings_do_not_touch_each_other() {
        let conn = open_in_memory().unwrap();
        set_reminder_window(&conn, true).unwrap();
        set_notification_permission(&conn, NotificationPermission::Allowed).unwrap();
        set_notification_permission(&conn, NotificationPermission::Ask).unwrap();
        assert!(reminder_window(&conn).unwrap(), "forgetting the notification answer keeps the window setting");
        assert_eq!(notification_permission(&conn).unwrap(), NotificationPermission::Ask);
    }
}
