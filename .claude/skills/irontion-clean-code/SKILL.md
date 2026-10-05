---
name: irontion-clean-code
description: Clean code rules and a code-smell checklist for Irontion's TypeScript, Svelte 5 and Rust. Load when writing or reviewing any code, and run the checklist before calling work done.
---

# Clean code for Irontion

## Naming

- Name by the user's concept, not the mechanism: `activity`, `block`, `slot`, `day`, `tag`, `archive`. Use the same word in Rust, TypeScript, SQL and the docs.
- `slot` = index 0–143 within a day. `block` = a filled slot. `run` = consecutive slots with the same activity. Don't mix these.
- Booleans read as questions: `isLeaf`, `hasChildren`, `archived`.
- Functions are verbs: `buildTree`, `applyDayChanges`. Pure getters can be nouns: `effectiveColor`.

## Size and shape

- Components: one job each. Split when a component passes ~200 lines of markup or has two unrelated `$state` groups.
- Functions: aim for under ~30 lines. Extract a named helper instead of commenting a block.
- Prefer early returns over nested `if`.
- No boolean parameters that switch behavior (`save(true)`); use two functions or an options object.

## TypeScript / Svelte 5

- Runes only: `$state`, `$derived`, `$effect`, `$props`. No `writable` stores, no `export let`.
- `$derived` for anything computed. `$effect` only for syncing with the outside world (DOM, Tauri, timers), never to set other state.
- Strict types; no `any`. DTO types in `src/lib/api/types.ts` mirror the Rust structs exactly (camelCase over the wire).
- Keyed `{#each}` always.
- Event handlers are named functions when longer than one expression.

## Rust

- `irontion-core` returns `Result<T, core::Error>`; no `unwrap()`/`expect()` outside tests and startup.
- One module per concept (`activities.rs`, `tags.rs`, `blocks.rs`, `summary.rs`). SQL stays next to the function that uses it.
- Every invariant has a unit test using an in-memory database (`Db::open_in_memory()`).
- `cargo clippy -- -D warnings` is clean.

## Errors

- Core errors have a stable `kind` (e.g. `NotFound`, `NotLeaf`, `Validation`, `TooDeep`). The UI maps `kind` to a translated message (`errors.<kind>`). Never show raw SQL errors.
- Never swallow an error silently. Either recover with a clear fallback (and a comment why) or surface it.

## Comments

- Explain *why*, not *what*. Delete comments that restate the code.
- Match the surrounding comment density.

## Code-smell checklist (run before finishing)

- [ ] **Duplicated logic**: same computation in two components? Move it to `src/lib/domain/`.
- [ ] **Hard-coded strings or colors** in a component (see `irontion-ui-rules`).
- [ ] **Business rule only in the UI** (e.g. leaf-only check without a Rust check).
- [ ] **SQL or `invoke()` outside its layer** (see `irontion-architecture`).
- [ ] **God store**: a store that knows about unrelated features. Split it.
- [ ] **Prop drilling** more than two levels: read the store directly instead.
- [ ] **Magic numbers**: use `SLOTS_PER_DAY`, `SLOT_MINUTES`, `MAX_DEPTH` constants.
- [ ] **Dead code**, unused exports, commented-out code, leftover `console.log`.
- [ ] **Long parameter lists** (> 3): pass an object.
- [ ] **Feature envy**: a function mostly reading another module's data belongs in that module.
- [ ] **Speculative generality**: an abstraction with one implementation and no planned second one.
- [ ] **Silent failure**: `catch {}` without a reason, or a promise without error handling.
