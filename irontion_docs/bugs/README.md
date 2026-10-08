**context:** #bugs #index

# Bug reports

One file per bug that cost real time to find: what the user saw, the cause, the fix, and how to spot it again. **Read these before debugging something that "works in dev but not in the installed app".** Add a new file (`B00X-short-name.md`) when you fix a bug like that.

| # | Bug | Seen in |
| - | --- | ------- |
| [[B001-tauri-empty-root-path]] | Settings → Back does nothing in the installed app | Packaged app only (0.2.0) |
| [[B002-reminders-never-fired]] | A note reminder never showed anything | Ubuntu, 0.2.x |
| [[B003-drag-to-first-place]] | Dropping a note on the first place did nothing | Notes board, 0.2.x |

## Template

- **Symptom**: what the user saw, and where (dev, browser, installed app)
- **Cause**: the real reason, with the evidence
- **Fix**: what changed and where
- **How to reproduce / check**: a command or test that fails before the fix
- **Lesson**: the rule to keep
