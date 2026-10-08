**context:** #bug #reminders #linux

# B002: A note reminder never showed (Ubuntu)

Fixed in 0.3.0.

- **Symptom**: a reminder set for 06:00 on a note never showed anything. No notification, no notice.
- **Cause**: reminders were only ever an **in-app notice**, driven by a `setInterval` in the **webview** (every 30 s). Nothing sent a system notification (no notification plugin was installed, initialised or allowed in `capabilities`), so with the window hidden, minimized, throttled or the machine asleep at 06:00 there was nothing to see; a window that was open only got the notice if the timer had not been suspended. The notice was also the only evidence: nothing could report a failure.
  - Time and storage were fine: `remind_at` is a UTC instant, compared with `now` in SQLite, so Asia/Bangkok does not shift it, the note's date is not involved, and `reminded_at` was set only after a delivery.
  - `notify-send` works on the dev machine, so D-Bus was not the problem.
- **Fix**: delivery moved to Rust (`apps/desktop/src-tauri/src/reminders.rs`): a thread checks every 20 s, sends a real system notification with `notify-rust`, records `reminded_at`, and tells the window. Catch-up at start for today's missed reminders; a failed send shows a notice with the reason. Settings → Notes → Notifications has a status line and **Send test notification**. `tauri-plugin-notification` was **not** used because its desktop `show()` discards the send's result, so failures could not be reported ([[F008]]).
- **How to check**: Settings → Notes → Notifications → Send test notification. Set a reminder for 2 minutes ahead with the window minimized. `cargo test` in `src-tauri` covers before, exactly at, after, other day, already delivered and the Bangkok local-day boundary.
- **Lesson**: anything that must happen when the window is not looking belongs in Rust, and anything that can fail must say so. Reminders still cannot fire when the app is **not running** (no tray, autostart or service yet).
