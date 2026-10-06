---
project: Irontion
type: tech-stack
status: in-development
---

**context:** #project #irontion #tech-stack #time-management

# Irontion: Tech Stack

> [!info] Project Overview
> - **App Name:** Irontion
> - **Target:** Desktop App, Mobile App, Web App
> - **Focus First:** Desktop App (for personal use)
> - **Tags:** Time Tracking, Habit Tracker, Productivity Management, Time Management
> - **Priority:** Performance first. Each platform can use a separate stack.
> - **Storage:** Local only (no cloud database). Backup to Google Drive later.
> - **Languages:** English, Thai, Chinese, Japanese, Korean (more later). See [[#Languages (i18n)]]
> - **Look:** Light, Dark or follow the OS; user-chosen accent color; square or circle blocks; time fill direction with an optional water wave; date format, week start and 12/24-hour time. See [[F003]]
> - **Templates:** 67 built-in activity templates in nine groups, with search and category filter. See [[F005]]
> - **Notes, Calendar and Reminders:** a board of sticky notes on paper (9 colors, pin, drag to reorder, max 200 characters, `#tags`), each note on a day; the Calendar shows, adds and moves them; any note can have a reminder. See [[F006]], [[F007]] and [[F008]]
> - **Your data:** Settings → Danger zone (behind an Advanced fold-out) deletes time blocks (all, or a date range), all activities or all notes (tags are kept). See [[F003]]
> - **Layout:** Responsive from 390px to wide screens; the sidebar can be folded away. See [[F004]]
> - **License:** Apache License 2.0 (free to use for anything), plus a `NOTICE` file that asks for credit to **dewakuneiei** (https://github.com/dewakuneiei) and https://github.com/dewakuneiei/irontion

Related features: [[F001]] [[F002]] [[F003]] [[F004]] [[F005]] [[F006]] [[F007]] [[F008]] [[F008]]

## Platform Roadmap

- [ ] Phase 1: Linux Desktop (Ubuntu) ← **in progress** (project initialized in `apps/desktop`)
- [ ] Phase 2: Windows Desktop
- [ ] Phase 3: macOS Desktop
- [ ] Phase 4: Android / iOS
- [ ] Phase 5: Web App
- [ ] Later: Google Drive backup

> [!note]
> No release plan yet. The order can change.

## Desktop Stack (Phase 1–3)

| Layer           | Choice                           | Why                                                        |
| --------------- | -------------------------------- | ---------------------------------------------------------- |
| App framework   | **Tauri 2**                      | Small app size, low RAM, uses the system webview           |
| Core / backend  | **Rust**                         | Fast, memory-safe, handles database and file work          |
| Frontend UI     | **Svelte 5 + TypeScript** (SvelteKit, SPA mode) | Very light, no virtual DOM, good for a 144-cell grid |
| Build tool      | **Vite**                         | Fast dev server, works with Tauri out of the box           |
| Styling         | **Tailwind CSS 4** + CSS variables | Quick UI building; theme tokens switch light/dark ([[F003]]) |
| Charts          | **Apache ECharts** (tree-shaken, canvas) | Smooth built-in animation, bar/heatmap/calendar charts, fast on large data |
| Animation       | **Svelte transitions + `svelte/motion`** | Built in, no extra library; respects "reduce motion" |
| Layout          | Tailwind breakpoints + CSS variables | Responsive from phone width up; cell size, sidebar and sheets adapt ([[F004]]) |
| Icons           | **Lucide** (`@lucide/svelte`)    | Clean, consistent line icons; only used icons are bundled  |
| Fonts           | **Inter** + **Noto Sans Thai** (bundled), **Noto Sans CJK** (system) | Readable in every supported language |
| i18n            | Small built-in module (typed keys) | No dependency; see [[#Languages (i18n)]]   |
| OS integration  | `tauri-plugin-os`                | Read the OS language for auto-detection                    |
| Database        | **SQLite** (via `rusqlite` or `sqlx`) | One local file, no server, easy to back up            |
| Migrations      | `sqlx migrate` or `refinery`     | Version the database schema                                |
| Package manager | **pnpm**                         | Already installed                                          |
| Packaging       | Linux: `.AppImage`, `.deb`, `.rpm` / Windows: `.msi`, `.exe` / macOS: `.app`, `.dmg` | Built into the Tauri bundler |

> [!tip] Why Tauri instead of Electron?
> Discord uses Electron, which ships a full Chromium with every app. It is heavier in size and RAM.
> Tauri uses the webview the OS already has:
> - Linux → WebKitGTK
> - Windows → WebView2
> - macOS → WKWebView
>
> The result is a much smaller app with lower memory use.

> [!warning] Linux caveat
> WebKitGTK can render a little differently from Chrome, and some animations can be slower. Test the grid and drag behavior early on Ubuntu.

> [!info] Building for Windows and macOS
> The same code builds for all three desktops, but each installer must be built **on its own OS** (or in CI):
> - Windows `.msi` / `.exe` → build on Windows (or GitHub Actions `windows-latest`)
> - macOS `.app` / `.dmg` → build on a Mac (or GitHub Actions `macos-latest`)
> - Linux `.deb` / `.AppImage` / `.rpm` → build on Ubuntu
>
> Plan: add a GitHub Actions workflow with `tauri-apps/tauri-action` when Phase 2 starts.

### Alternatives (if Tauri doesn't fit)

| Option                | Language   | Good for                                      | Trade-off                        |
| --------------------- | ---------- | --------------------------------------------- | -------------------------------- |
| **Avalonia UI**       | C# / .NET  | Already know C# from Unity, native rendering  | Larger runtime than Tauri        |
| **Slint** or **iced** | Rust       | Maximum performance, no webview at all        | Smaller ecosystem, more UI work  |
| **Flutter**           | Dart       | One codebase for desktop and mobile           | New language, larger app size    |

## Architecture

```
irontion/
├── irontion_docs/        # Obsidian notes (this vault)
├── apps/
│   ├── desktop/          # Tauri 2 app: Linux, Windows, macOS  ← now
│   │   ├── src/          #   Svelte UI (routes, components, i18n, theme)
│   │   └── src-tauri/    #   Rust side (commands, plugins, bundling)
│   ├── web/              # Future: browser app
│   ├── android/          # Future: if native (Kotlin + Compose)
│   └── ios/              # Future: if native (Swift + SwiftUI)
└── crates/
    └── irontion-core/    # Shared Rust logic + SQLite (used by desktop now)
```

> [!note] Naming
> - Every runnable app lives in `apps/<platform>`
> - Shared Rust libraries live in `crates/`
> - If mobile uses Tauri mobile instead of native, it can live in `apps/mobile`

> [!info] Shared Rust core
> Put all logic in `irontion-core` (activities, tags, time blocks, notes, summaries, bulk delete).
> It can be reused later:
> - Desktop → called directly by Tauri
> - Mobile → through **UniFFI** (Kotlin / Swift bindings)
> - Web → compiled to **WebAssembly**

## Languages (i18n)

The app supports multiple languages from day one. All UI text comes from translation files, never hard-coded.

| Code    | Language            | Native name | Status |
| ------- | ------------------- | ----------- | ------ |
| `en`    | English             | English     | ✅ Base language (fallback) |
| `th`    | Thai                | ไทย         | ✅ |
| `zh-CN` | Chinese, Simplified | 简体中文     | ✅ |
| `ja`    | Japanese            | 日本語       | ✅ |
| `ko`    | Korean              | 한국어       | ✅ |
| `zh-TW` | Chinese, Traditional | 繁體中文    | ⬜ Later |
| `vi`    | Vietnamese          | Tiếng Việt  | ⬜ Later |
| `es`    | Spanish             | Español     | ⬜ Later |

### How It Works

- [x] Default is **System**: the app reads the OS language (`tauri-plugin-os`) and picks the closest match (e.g., `th_TH.UTF-8` → `th`, any `zh-*` → `zh-CN`)
- [x] User can override in **Settings → Language**; the choice is saved
- [x] Missing text falls back to English, so a new key never shows as blank
- [x] Language names are always shown in their own language (ไทย, 日本語, …)
- [x] Dates, weekdays, months and numbers use `Intl` with the current language
- [x] Charts use translated labels and localized month / weekday names
- [x] `<html lang>` is set, so the right font is used for Chinese / Japanese / Korean (same characters, different glyph shapes)
- [ ] Plurals with `Intl.PluralRules` when a language needs it
- [ ] Move the saved language from `localStorage` into the SQLite settings table
- [ ] User-created content (activity and tag names) is **not** translated; it stays as typed

### Fonts

| Script | Font | Source |
| ------ | ---- | ------ |
| Latin  | Inter | Bundled with the app |
| Thai   | Noto Sans Thai | Bundled with the app |
| Chinese / Japanese / Korean | Noto Sans CJK SC / JP / KR | System font (`fonts-noto-cjk` on Ubuntu) |

> [!note]
> CJK fonts are large (~20 MB each), so they are not bundled. Windows and macOS already ship good CJK fonts; on Linux the stack falls back to system fonts if Noto CJK is missing.

### Adding a New Language

1. Copy `apps/desktop/src/lib/i18n/locales/en.ts` to `<code>.ts` and translate the values
2. Register it in `LOCALES` in `apps/desktop/src/lib/i18n/index.svelte.ts`
3. TypeScript checks that the new file has every key (`pnpm check`)

## Data Storage (Local)

- One SQLite file, **WAL mode** and foreign keys on (`rusqlite`, SQLite bundled)
- Location (Tauri app data folder, named after the app ID `com.irontion.app`):
  - Linux: `~/.local/share/com.irontion.app/irontion.db`
  - Windows: `%APPDATA%\com.irontion.app\irontion.db`
  - macOS: `~/Library/Application Support/com.irontion.app/irontion.db`
- Migrations: `crates/irontion-core/migrations/NNN_name.sql`, applied in order at startup and tracked with `PRAGMA user_version`

### Schema

| Table           | Main Fields                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `activities`    | `id`, `parent_id`, `name`, `color` (NULL = inherit), `position`, `archived_at` |
| `tags`          | `id`, `name` (unique, case-insensitive), `color`                         |
| `activity_tags` | `activity_id`, `tag_id`                                                  |
| `time_blocks`   | `date` (YYYY-MM-DD), `slot` (0–143), `activity_id`                       |
| `notes`         | `id`, `text` (max 200 characters), `date` (YYYY-MM-DD, NOT NULL), `color`, `pinned`, `position` (board order), `remind_at`, `reminded_at` (UTC), `created_at`, `updated_at` (UTC). Indexes on `date` and `remind_at`. See [[F006]], [[F008]] |
| `note_tags`     | `note_id`, `tag_id` (cascade both ways; the same tags as activities, max 5 per note) |

Rules enforced in Rust (and covered by tests): assignment only to active activities (parents included), max 5 levels, archive cascades down, restore brings back parents, permanent delete only after archive. See [[F002]]. Notes: every note has a date (only `move_note` changes it), a color from the palette, a well-formed UTC reminder, trimmed text of 1 to 200 characters without its `#tags`, at most 5 tags with valid names; tags are created in the note's transaction. See [[F006]].

> [!note]
> One day = at most 144 rows in `time_blocks`. One year ≈ 52,000 rows, which is very small for SQLite.

## Testing

| What | Command | Where |
| ---- | ------- | ----- |
| Rust core (rules + SQL) | `cargo test` | `crates/irontion-core` |
| Tauri commands over real IPC (mock runtime) | `cargo test` | `apps/desktop/src-tauri` |
| Domain logic (grid editing, tree, streaks, note `#tag` parsing, counting, board order and columns, filters, reminders, save queue, calendar helpers) and the preview backend's rules | `pnpm test` | `apps/desktop` |
| Note rules shared by Rust and TypeScript | both suites read `crates/irontion-core/fixtures/note_rules.json` | |
| Types and translations complete | `pnpm check` | `apps/desktop` |
| Lint | `cargo clippy --all-targets -- -D warnings` | both Rust crates |

## AI Agent Setup

So every Claude session or agent works the same way on this repo:

- `CLAUDE.md` (repo root): project map, commands, hard rules
- Project skills in `.claude/skills/`:
  - `irontion-architecture`: layers, where code goes, schema, data flow
  - `irontion-clean-code`: naming, size, errors, code-smell checklist
  - `irontion-design-patterns`: repository, strategy (Backend), command (day changes), stores, composite tree
  - `irontion-ui-rules`: theme tokens ([[F003]]), i18n, motion, charts, accessibility, copy
- Plugins (project scope, `.claude/settings.json`): `feature-dev`, `frontend-design`, `pr-review-toolkit`, `rust-analyzer-lsp`, `typescript-lsp`

## Backup to Google Drive (Future)

- [ ] Login with **OAuth 2.0** (Google)
- [ ] Use the `drive.appdata` scope (a hidden app folder that only Irontion can see)
- [ ] Create a safe snapshot with `VACUUM INTO 'backup.db'`
- [ ] Compress and upload with a timestamp (e.g., `irontion-2026-10-05.db.gz`)
- [ ] Keep the last N backups and delete older ones
- [ ] Store the refresh token in the OS keyring (`keyring` crate)
  - Linux → Secret Service (GNOME Keyring)
  - Windows → Credential Manager

## Mobile Stack (Future)

| Option                     | Android                         | iOS                          |
| -------------------------- | ------------------------------- | ---------------------------- |
| A: Reuse (faster to build) | Tauri 2 mobile                  | Tauri 2 mobile               |
| B: Native (best performance) | Kotlin + Jetpack Compose + Room | Swift + SwiftUI + GRDB     |

> [!tip]
> With the shared Rust core, option B can still reuse the logic through UniFFI.

## Web Stack (Future)

- Reuse the **Svelte** frontend
- Local storage: **SQLite WASM + OPFS** (or IndexedDB)
- Add a server only if real-time sync is needed later

## Reference: Discord Stack (Comparison)

| Area    | Discord                 | Irontion                    |
| ------- | ----------------------- | --------------------------- |
| Desktop | Electron + React        | Tauri + Svelte              |
| Mobile  | React Native            | Tauri mobile or native      |
| Backend | Elixir, Rust, Python    | None (local-first)          |
| Data    | Cassandra, BigQuery     | SQLite (local file)         |

## Open Questions

- ~~Svelte or React for the UI?~~ → **Svelte 5** chosen
- Should the backup be manual, automatic, or both?
- Is sync between devices needed, or only backup?
- Export format: CSV, JSON, or both?