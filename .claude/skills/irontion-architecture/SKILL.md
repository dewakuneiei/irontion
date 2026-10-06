---
name: irontion-architecture
description: System design for Irontion. Load before adding a feature, a Tauri command, a database table, a store, or when unsure where code belongs. Covers layers, data flow, the SQLite schema, the Rust core, and how the app grows to web and mobile.
---

# Irontion architecture

## Layers (dependencies point down only)

```
Svelte pages / components        apps/desktop/src/routes, src/lib/components
        │  read reactive state, call store actions
Stores (Svelte 5 runes classes)  apps/desktop/src/lib/stores/*.svelte.ts
        │  call the Backend interface, then refresh their state
Backend interface                apps/desktop/src/lib/api/backend.ts
   ├─ TauriBackend   → invoke()  apps/desktop/src/lib/api/tauri.ts
   └─ PreviewBackend (browser)   apps/desktop/src/lib/api/preview.ts
        │
Tauri commands (thin)            apps/desktop/src-tauri/src/commands.rs
        │  lock the DB, call one core function, map errors
irontion-core (Rust, no Tauri)   crates/irontion-core/src/*.rs
        │
SQLite file (WAL)                <app data dir>/irontion.db
```

Pure domain helpers (no I/O, no Svelte) live in `apps/desktop/src/lib/domain/`: tree building, roll-ups, slot math, date math. Pages and stores both use them. They are unit-testable and must stay framework-free.

## Where does this code go?

| You are writing... | Put it in |
| ------------------ | --------- |
| A rule that protects data (validation, invariants, cascades) | `irontion-core` (Rust). The UI may *also* check it for UX, but Rust is the authority. |
| SQL | `irontion-core` only. Never in commands or the frontend. |
| A Tauri command | `src-tauri/src/commands.rs`: one line of work, delegate to core. |
| Derived data for display (tree, totals, runs of cells) | `src/lib/domain/*.ts` pure functions |
| Shared reactive state for several pages | a store in `src/lib/stores/` |
| State used by one component only | `$state` inside that component |
| Strings | `src/lib/i18n/locales/*.ts` (all five) |

## Data model

| Table | Key columns | Notes |
| ----- | ----------- | ----- |
| `activities` | `id`, `parent_id`, `name`, `color` (NULL = inherit parent), `position`, `archived_at` | Tree, max depth 5. Archive cascades down the subtree. |
| `tags` | `id`, `name` (unique, case-insensitive), `color` | Flat. |
| `activity_tags` | `activity_id`, `tag_id` | Many-to-many. Effective tags = own + ancestors' (computed in domain). |
| `time_blocks` | `date` (YYYY-MM-DD, local), `slot` 0–143, `activity_id` | One row per filled 10-minute cell. Empty cell = no row. |
| `notes` | `id`, `text` (≤200 graphemes, without its `#tags`), `date` (NOT NULL), `color`, `pinned`, `position`, `remind_at`, `reminded_at`, `created_at`, `updated_at` | Sticky notes (F006 in `irontion_docs/features`). Only `notes::move_note` changes a date. Independent of activities and blocks: deleting those never deletes notes. |
| `note_tags` | `note_id`, `tag_id` | Notes use the same tags as activities, max 5; `#name` creates or reuses one in the note's transaction. |
| `schema_version` via `PRAGMA user_version` | | Migrations in `crates/irontion-core/migrations/NNN_name.sql`, applied in order at startup. |

Invariants (enforced in core, covered by tests):
- New blocks may only use an **active** activity, a parent as well as a sub-activity. Moving or resizing a block that is already on the day keeps its activity even if it is archived. A block counts as its activity's own tags, or the nearest ancestor's when it has none.
- Archiving hides an activity and its subtree from pickers; blocks and summaries keep them. Restore brings back the subtree and any archived ancestors. Permanent delete removes the subtree and its blocks.
- All writes for one user action happen in one transaction (`apply_day_changes` takes the whole diff).
- Adding a tree of activities (a template) is one transaction in `activity_tree.rs`: nodes match existing activities by name among siblings (ignoring case, skipping archived), existing ones are kept (or recolored when asked) and never duplicated, and any invalid node adds nothing. Templates themselves are system data in `src/lib/templates/data.ts`, never in the database; core knows only "a tree of activities".

## Data flow for one user action (painting cells)

1. Grid component collects a drag → calls `dayStore.apply(changes)`.
2. Store updates its state optimistically, calls `backend.applyDayChanges(date, changes)`.
3. On success it replaces state with the returned day. On error it restores the previous state and shows the translated error.

## Growth plan

- Web: implement `Backend` against SQLite WASM; pages and stores stay the same.
- Mobile: reuse `irontion-core` through UniFFI, or Tauri mobile with the same commands.
- Do not import `@tauri-apps/*` outside `src/lib/api/`, `src/lib/theme.svelte.ts` and `src/lib/i18n/` so the UI stays portable.
