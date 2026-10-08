//! Reminders (F008) are delivered from Rust, not from the webview: a background thread checks the
//! database every few seconds, so a hidden or throttled window cannot make a reminder late.
//!
//! Delivery sends a system notification (D-Bus on Linux) when the user allowed it, opens a popup
//! window when the user turned that on, tells the main window (which shows an in-app notice only
//! when neither was shown) and records `reminded_at`, so a reminder is delivered once and never lost.
//! `plan` is the decision, pure apart from the database, and takes the clock as an argument.

use std::sync::Mutex;
use std::time::Duration;

use chrono::{DateTime, Local, SecondsFormat, TimeZone, Utc};
use irontion_core::model::{Note, NotificationPermission};
use irontion_core::model::NoteId;
use irontion_core::{notes, settings, Connection};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::commands::Db;

/// How often the thread looks for due reminders.
const TICK: Duration = Duration::from_secs(20);
/// Wait before the first check, so the window has registered its listener to hear about it.
const FIRST_CHECK_DELAY: Duration = Duration::from_secs(3);
/// A reminder delivered later than this after its time is worded as missed.
const ON_TIME_GRACE_SECS: i64 = 120;
const EVENT: &str = "reminder-delivered";
/// What the popup window is, in points. Tall enough for a 200-character note.
const ALERT_SIZE: (f64, f64) = (460.0, 280.0);
/// The popup window's label for a note (or for the preview, which has no note).
const SAMPLE_LABEL: &str = "alert-sample";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    /// Due now (or within the grace): a normal reminder.
    OnTime,
    /// Today's, but the app was closed or the machine asleep at the time.
    Missed,
    /// From an earlier day: not announced, only marked delivered. It stays in the Past list.
    Stale,
}

/// The words of the system notification, in the user's language. The window sends them (the
/// translations live there); until it does these English ones are used.
#[derive(Debug, Clone)]
pub struct Texts {
    pub reminder: String,
    pub missed: String,
}

impl Default for Texts {
    fn default() -> Self {
        Self {
            reminder: "Reminder".into(),
            missed: "Missed reminder".into(),
        }
    }
}

pub struct NotificationTexts(pub Mutex<Texts>);

/// What the window gets for every delivered reminder.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Delivery {
    pub note: Note,
    pub missed: bool,
    /// A system notification or the popup window was shown, so the main window need not show it again.
    pub shown: bool,
    /// Why the system notification could not be shown; the window then shows the reminder itself.
    pub error: Option<String>,
}

/// Midnight at the start of `now`'s local day, as a UTC instant.
pub fn local_day_start<Tz: TimeZone>(now: &DateTime<Tz>) -> DateTime<Utc> {
    let midnight = now.date_naive().and_hms_opt(0, 0, 0).expect("midnight exists");
    // A DST gap at midnight has no midnight: the clock's first moment of that day is the nearest.
    now.timezone()
        .from_local_datetime(&midnight)
        .earliest()
        .unwrap_or_else(|| now.clone())
        .with_timezone(&Utc)
}

/// The stored shape of an instant (`2026-10-07T06:00:00.000Z`), which compares correctly as text.
pub fn stored_time(at: DateTime<Utc>) -> String {
    at.to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn classify(remind_at: DateTime<Utc>, now: DateTime<Utc>, today_start: DateTime<Utc>) -> Verdict {
    if remind_at < today_start {
        Verdict::Stale
    } else if (now - remind_at).num_seconds() > ON_TIME_GRACE_SECS {
        Verdict::Missed
    } else {
        Verdict::OnTime
    }
}

/// Reminders to announce at `now`, with how to word each. Stale ones (an earlier day) are marked
/// delivered here and left out. The others stay undelivered until `deliver` has handled them.
pub fn plan<Tz: TimeZone>(conn: &Connection, now: &DateTime<Tz>) -> irontion_core::Result<Vec<(Note, Verdict)>> {
    let today_start = local_day_start(now);
    let now = now.with_timezone(&Utc);
    let mut announce = Vec::new();
    for note in notes::due_reminders_at(conn, &stored_time(now))? {
        let Some(at) = note.remind_at.as_deref().and_then(|s| DateTime::parse_from_rfc3339(s).ok()) else {
            continue;
        };
        match classify(at.with_timezone(&Utc), now, today_start) {
            Verdict::Stale => {
                notes::mark_reminded(conn, note.id)?;
            }
            verdict => announce.push((note, verdict)),
        }
    }
    Ok(announce)
}

/// Shows one system notification. The error says why it could not (no notification service, ...).
pub fn show_notification(title: &str, body: &str) -> Result<(), String> {
    let mut notification = notify_rust::Notification::new();
    notification.appname("Irontion").summary(title).body(body).auto_icon();
    notification.show().map(|_| ()).map_err(|err| err.to_string())
}

/// Whether the system can show notifications right now. On Linux this asks the notification
/// service on D-Bus; the other systems do not need a permission for a desktop app.
pub fn availability() -> Result<(), String> {
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        notify_rust::get_server_information().map(|_| ()).map_err(|err| err.to_string())
    }
    #[cfg(not(all(unix, not(target_os = "macos"))))]
    {
        Ok(())
    }
}

/// Opens the reminder popup: a small borderless window on the `/alert` page, in front of other
/// windows. `note` is the note it announces; `None` opens a sample, to preview the window. A popup
/// that is already open is brought forward instead of opened twice.
pub fn show_alert_window<R: Runtime>(
    app: &AppHandle<R>,
    note: Option<NoteId>,
    missed: bool,
    title: &str,
) -> tauri::Result<()> {
    let label = note.map_or_else(|| SAMPLE_LABEL.to_owned(), |id| format!("alert-{id}"));
    if let Some(open) = app.get_webview_window(&label) {
        open.show()?;
        return open.set_focus();
    }
    let route = match note {
        Some(id) => format!("alert?note={id}&missed={}", u8::from(missed)),
        None => "alert?sample=1".to_owned(),
    };
    WebviewWindowBuilder::new(app, label, WebviewUrl::App(route.into()))
        .title(title)
        .inner_size(ALERT_SIZE.0, ALERT_SIZE.1)
        .resizable(false)
        .maximizable(false)
        .decorations(false)
        .always_on_top(true)
        .center()
        .focused(true)
        .build()?;
    Ok(())
}

/// Turns system notifications on. `send` shows one real notification (the proof that the system
/// lets Irontion notify); only when it works is the choice saved as allowed. A failure saves
/// nothing and says why, so the caller can leave the switch off.
pub fn enable_with(conn: &Connection, send: impl FnOnce() -> Result<(), String>) -> Result<(), String> {
    send()?;
    settings::set_notification_permission(conn, NotificationPermission::Allowed).map_err(|err| err.to_string())
}

fn deliver<R: Runtime>(app: &AppHandle<R>, conn: &Connection, note: Note, verdict: Verdict) {
    let missed = verdict == Verdict::Missed;
    let title = {
        let texts = app.state::<NotificationTexts>();
        let texts = texts.0.lock().map(|t| t.clone()).unwrap_or_default();
        if missed { texts.missed } else { texts.reminder }
    };
    // Not asked yet, or refused: the window shows the reminder instead.
    let allowed = match settings::notification_permission(conn) {
        Ok(permission) => permission == NotificationPermission::Allowed,
        Err(err) => {
            eprintln!("[reminders] could not read the notification setting, showing in the window: {err}");
            false
        }
    };
    let error = if allowed { show_notification(&title, &note.text).err() } else { None };
    if let Some(reason) = &error {
        eprintln!("[reminders] system notification failed for note {}: {reason}", note.id);
    }
    let window_on = settings::reminder_window(conn).unwrap_or_else(|err| {
        eprintln!("[reminders] could not read the popup setting: {err}");
        false
    });
    let popped = window_on
        && show_alert_window(app, Some(note.id), missed, &title)
            .map_err(|err| eprintln!("[reminders] could not open the popup for note {}: {err}", note.id))
            .is_ok();
    let shown = (allowed && error.is_none()) || popped;
    // Delivered either way: the window shows the reminder itself when the system could not, and
    // it stays in the Past list, so it is never shown twice and never silently dropped.
    match notes::mark_reminded(conn, note.id) {
        Ok(note) => {
            if let Err(err) = app.emit(EVENT, Delivery { note, missed, shown, error }) {
                eprintln!("[reminders] could not tell the window: {err}");
            }
        }
        Err(err) => eprintln!("[reminders] could not record delivery of note {}: {err}", note.id),
    }
}

fn check<R: Runtime>(app: &AppHandle<R>) {
    let db = app.state::<Db>();
    let Ok(conn) = db.0.lock() else {
        eprintln!("[reminders] database lock poisoned");
        return;
    };
    match plan(&conn, &Local::now()) {
        Ok(announce) => {
            for (note, verdict) in announce {
                deliver(app, &conn, note, verdict);
            }
        }
        Err(err) => eprintln!("[reminders] check failed: {err}"),
    }
}

/// Starts the background thread. The first check is also the catch-up for reminders that came
/// due while the app was closed.
pub fn start<R: Runtime>(app: AppHandle<R>) {
    std::thread::spawn(move || {
        std::thread::sleep(FIRST_CHECK_DELAY);
        loop {
            check(&app);
            std::thread::sleep(TICK);
        }
    });
}

#[cfg(test)]
mod tests {
    use chrono::FixedOffset;
    use irontion_core::db::open_in_memory;
    use irontion_core::model::NewNote;

    use super::*;

    /// Asia/Bangkok, where the bug was reported: UTC+7, no daylight saving.
    fn bangkok() -> FixedOffset {
        FixedOffset::east_opt(7 * 3600).unwrap()
    }

    fn at(local: &str) -> DateTime<FixedOffset> {
        bangkok().from_local_datetime(&chrono::NaiveDateTime::parse_from_str(local, "%Y-%m-%d %H:%M:%S").unwrap()).unwrap()
    }

    fn note_with_reminder(conn: &mut Connection, text: &str, remind_at: &str) -> Note {
        let note = notes::create_note(
            conn,
            NewNote {
                date: "2026-10-07".into(),
                text: text.into(),
                color: "yellow".into(),
                tags: vec![],
            },
        )
        .unwrap();
        notes::set_reminder(conn, note.id, Some(remind_at)).unwrap()
    }

    fn texts(planned: &[(Note, Verdict)]) -> Vec<(&str, Verdict)> {
        planned.iter().map(|(n, v)| (n.text.as_str(), *v)).collect()
    }

    #[test]
    fn the_local_day_starts_at_local_midnight_not_utc_midnight() {
        // 06:00 on 7 Oct in Bangkok is 23:00 UTC on 6 Oct; the Bangkok day began at 17:00 UTC.
        assert_eq!(stored_time(local_day_start(&at("2026-10-07 06:00:00"))), "2026-10-06T17:00:00.000Z");
        assert_eq!(stored_time(local_day_start(&at("2026-10-07 00:00:00"))), "2026-10-06T17:00:00.000Z");
        assert_eq!(stored_time(local_day_start(&at("2026-10-07 23:59:59"))), "2026-10-06T17:00:00.000Z");
    }

    #[test]
    fn not_due_before_the_time_and_on_time_exactly_at_it() {
        let mut conn = open_in_memory().unwrap();
        // 06:00 Bangkok = 23:00 UTC the day before: the local-time boundary case.
        note_with_reminder(&mut conn, "wake", "2026-10-06T23:00:00Z");
        assert!(plan(&conn, &at("2026-10-07 05:59:59")).unwrap().is_empty());
        assert_eq!(texts(&plan(&conn, &at("2026-10-07 06:00:00")).unwrap()), [("wake", Verdict::OnTime)]);
    }

    #[test]
    fn a_little_late_is_still_on_time_and_a_lot_late_is_missed() {
        let mut conn = open_in_memory().unwrap();
        note_with_reminder(&mut conn, "wake", "2026-10-06T23:00:00Z");
        assert_eq!(texts(&plan(&conn, &at("2026-10-07 06:02:00")).unwrap()), [("wake", Verdict::OnTime)]);
        assert_eq!(texts(&plan(&conn, &at("2026-10-07 06:02:01")).unwrap()), [("wake", Verdict::Missed)]);
        assert_eq!(texts(&plan(&conn, &at("2026-10-07 21:00:00")).unwrap()), [("wake", Verdict::Missed)]);
    }

    #[test]
    fn notifications_are_allowed_only_after_one_could_be_shown() {
        let conn = open_in_memory().unwrap();
        enable_with(&conn, || Ok(())).unwrap();
        assert_eq!(settings::notification_permission(&conn).unwrap(), NotificationPermission::Allowed);
    }

    #[test]
    fn a_notification_that_cannot_be_shown_leaves_the_choice_alone_and_says_why() {
        let conn = open_in_memory().unwrap();
        let err = enable_with(&conn, || Err("no notification service".into())).unwrap_err();
        assert_eq!(err, "no notification service");
        assert_eq!(settings::notification_permission(&conn).unwrap(), NotificationPermission::Ask);

        settings::set_notification_permission(&conn, NotificationPermission::Denied).unwrap();
        enable_with(&conn, || Err("blocked".into())).unwrap_err();
        assert_eq!(settings::notification_permission(&conn).unwrap(), NotificationPermission::Denied);
    }

    #[test]
    fn a_delivered_reminder_is_never_planned_again() {
        let mut conn = open_in_memory().unwrap();
        let note = note_with_reminder(&mut conn, "wake", "2026-10-06T23:00:00Z");
        assert_eq!(plan(&conn, &at("2026-10-07 06:00:00")).unwrap().len(), 1);
        notes::mark_reminded(&conn, note.id).unwrap();
        assert!(plan(&conn, &at("2026-10-07 06:00:20")).unwrap().is_empty());
    }

    #[test]
    fn a_reminder_from_an_earlier_day_is_not_announced_but_is_marked_delivered() {
        let mut conn = open_in_memory().unwrap();
        // 23:30 Bangkok on 6 Oct: still yesterday locally, though UTC says 16:30 the same date.
        let old = note_with_reminder(&mut conn, "yesterday", "2026-10-06T16:30:00Z");
        note_with_reminder(&mut conn, "today", "2026-10-06T17:00:00Z");
        let planned = plan(&conn, &at("2026-10-07 09:00:00")).unwrap();
        assert_eq!(texts(&planned), [("today", Verdict::Missed)], "midnight local belongs to the new day");
        assert!(notes::get(&conn, old.id).unwrap().reminded_at.is_some());
    }

    #[test]
    fn a_reminder_on_another_days_note_fires_on_its_own_day() {
        let mut conn = open_in_memory().unwrap();
        // The note is dated 7 Oct; the reminder is for the 9th.
        note_with_reminder(&mut conn, "later", "2026-10-09T02:00:00Z");
        assert!(plan(&conn, &at("2026-10-08 12:00:00")).unwrap().is_empty());
        assert_eq!(texts(&plan(&conn, &at("2026-10-09 09:00:00")).unwrap()), [("later", Verdict::OnTime)]);
    }

    #[test]
    fn a_reminder_in_the_future_is_left_alone() {
        let mut conn = open_in_memory().unwrap();
        let note = note_with_reminder(&mut conn, "far", "2999-01-01T00:00:00Z");
        assert!(plan(&conn, &at("2026-10-07 06:00:00")).unwrap().is_empty());
        assert!(notes::get(&conn, note.id).unwrap().reminded_at.is_none());
    }
}
