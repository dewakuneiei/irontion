# Irontion

Local-first time-blocking and habit tracker. Desktop first (Linux, then Windows/macOS), later web and mobile.

- Product notes and feature specs: `irontion_docs/` (Obsidian vault). `info.md` is the tech stack; `features/F00X.md` are specs (F006 Notes, F007 Calendar, F008 Reminders). Update a spec's checklist when you ship part of it.
- Desktop app: `apps/desktop` (Tauri 2 + SvelteKit SPA + Svelte 5 runes + Tailwind 4 + ECharts).
- Shared Rust logic and SQLite: `crates/irontion-core` (no Tauri dependency, unit-tested).

## Project skills (load before working in these areas)

| Skill | Load when |
| ----- | --------- |
| `irontion-architecture` | Adding a feature, a command, a table, or deciding where code goes |
| `irontion-clean-code` | Writing or reviewing any code; run its smell checklist before finishing |
| `irontion-design-patterns` | Introducing a new abstraction, store, or backend method |
| `irontion-ui-rules` | Touching any page or component: theme tokens, i18n, motion, charts, a11y |

## Commands

```sh
# Desktop app (from apps/desktop)
pnpm app            # real window, hot reload
pnpm dev            # UI only in a browser (uses the in-memory preview backend)
pnpm check          # svelte-check + TypeScript (also catches missing translations)
pnpm test           # Vitest: pure domain logic in src/lib/domain
pnpm build          # frontend production build

# Rust (from crates/irontion-core or apps/desktop/src-tauri)
cargo test
cargo clippy --all-targets -- -D warnings
```

`pnpm app` and `pnpm app:build` run through `scripts/with-clean-env.mjs`, which strips Snap's environment. Without it, a native app started from VS Code's Snap terminal crashes with `symbol lookup error ... libpthread ... __libc_pthread_init`. Keep new launch scripts going through it.

Before saying a change is done: `pnpm check`, `pnpm test`, and `cargo test` in both `crates/irontion-core` and `apps/desktop/src-tauri` must pass.

## Hard rules

- Every user-visible string goes through `t()` and exists in all five locales (`en`, `th`, `zh-CN`, `ja`, `ko`). `en.ts` is the source of truth; `pnpm check` fails if a locale misses a key.
- Colors come from theme tokens (`bg-surface`, `text-ink-2`, `bg-accent`, ...) so light, dark and the user's accent color all work. Never hard-code a UI color or assume the accent is blue. User-chosen activity colors are the only exception.
- Every page must work from 390px to wide screens with no sideways scroll (see `irontion-ui-rules`, Responsive).
- The database is the source of truth. The UI never invents IDs or keeps state that the backend does not know about.
- Any active activity can be assigned to new time blocks, a parent ("Don't do") as well as its sub-activities. Tags are not stacked: a block counts as its activity's own tags, or the nearest ancestor's when it has none. Deleting an activity archives it; history stays. The one exception is Settings → Danger zone, which permanently deletes on purpose (behind an Advanced fold-out, with counts and a confirmation). Notes are deleted for good too: one at a time from the paper (with an Undo notice), or all at once there. Deleting activities or time blocks never deletes notes. Every note has a date; only "Move to another day" (on the note's paper, from the Notes page or the Calendar) changes it, and the Notes board never shows it.
