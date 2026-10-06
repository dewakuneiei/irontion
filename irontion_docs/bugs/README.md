**context:** #bugs #index

# Bug reports

One file per bug that cost real time to find: what the user saw, the cause, the fix, and how to spot it again. **Read these before debugging something that "works in dev but not in the installed app".** Add a new file (`B00X-short-name.md`) when you fix a bug like that.

| # | Bug | Seen in |
| - | --- | ------- |
| [[B001-tauri-empty-root-path]] | Settings → Back does nothing in the installed app | Packaged app only (0.2.0) |

## Template

- **Symptom**: what the user saw, and where (dev, browser, installed app)
- **Cause**: the real reason, with the evidence
- **Fix**: what changed and where
- **How to reproduce / check**: a command or test that fails before the fix
- **Lesson**: the rule to keep
