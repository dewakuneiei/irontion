---
name: irontion-design-patterns
description: The design patterns Irontion uses, where each lives, and when to add or avoid one. Load before introducing a new abstraction, store, backend method, or extending an existing pattern.
---

# Design patterns in Irontion

Use a pattern only when it removes a real problem in this codebase. Each entry says where it already lives; extend those before inventing new ones.

## Repository (Rust core)

**Where:** `crates/irontion-core/src/{activities,tags,blocks,summary,data}.rs`, each a set of functions taking `&Connection` (or `&Transaction`).
**Why:** keeps SQL in one place per concept and lets tests run on an in-memory DB.
**Rule:** commands never write SQL; a new query goes in the matching module with a test.

## Strategy behind an interface (frontend Backend)

**Where:** `src/lib/api/backend.ts` defines `Backend`. `TauriBackend` (real app) and `PreviewBackend` (browser `pnpm dev`, in-memory) implement it. `getBackend()` picks one once.
**Why:** the UI runs in a plain browser for fast design work, and later on the web with a WASM SQLite backend.
**Rule:** add a method to the interface and *both* implementations together. `PreviewBackend` may be simpler but must respect the same invariants (leaf-only, archive cascade) so the preview never lies.

## Command (one user action = one diff)

**Where:** `DayChange { slot, activityId | null }[]` sent through `applyDayChanges`. Allocate, deallocate and move all produce a diff in `src/lib/domain/slots.ts`; the backend applies it in one transaction.
**Why:** one code path for every grid edit, atomic writes, and a natural place to add undo later (store the inverse diff).
**Rule:** new grid actions produce a `DayChange[]`. Don't add a backend method per action.

## Observable store (Svelte 5 runes class)

**Where:** `src/lib/stores/*.svelte.ts`: `catalog` (activities + tags) and `day` (blocks of the selected date). Also `theme`, `preferences` (accent, block shape), `layout` (sidebar) and `i18n`. Selection is page state (`routes/blocks`), not a store.
**Why:** several pages share the same data; runes give fine-grained reactivity without subscriptions.
**Rule:** stores hold state and actions; derived views use `$derived`. Components never call the backend directly.

## Composite (activity tree)

**Where:** `src/lib/domain/tree.ts` builds `ActivityNode { activity, children, depth }` from the flat list; roll-ups walk it recursively.
**Rule:** the database stays flat (`parent_id`); the tree exists only in memory and is rebuilt with `$derived`.

## Optimistic update with rollback

**Where:** `day` store `apply()`.
**Rule:** keep the previous snapshot, apply locally, call the backend, replace with the server result or roll back and report the error.

## Anti-patterns to avoid here

- **God store**: one store for everything. Keep `catalog` and `day` separate.
- **Anemic wrapper layers**: a TS function that only renames `invoke()` with no added value. `TauriBackend` is the single place that calls `invoke`.
- **Inheritance for UI variations**: use props and snippets, not component hierarchies.
- **Event bus / global emitter**: stores already notify via runes.
- **Premature generic CRUD**: write the specific function the feature needs.
