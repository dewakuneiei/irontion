**context:** #bug #tauri #routing #packaged-app

# B001: Back does nothing in the installed app (empty root path)

Fixed in 0.2.1 (`ecfcd55`).

## Symptom

In **Settings**, the **Back** button (bottom of the sidebar) did nothing. It worked in `pnpm dev`, in the browser preview and in headless Chrome, and failed only in the app built with `pnpm app:build` and installed (`.deb`). Today's sidebar item was probably also not highlighted when the installed app first opened.

## Cause

The packaged app loads its pages from **`tauri://localhost`**. For that kind of URL (a scheme the URL standard does not treat as "special") the path of the home page is the **empty string**:

```
new URL("tauri://localhost").pathname      // ""
new URL("http://localhost:1420/").pathname // "/"
```

`pnpm dev` and browsers use `http://`, so they always give `"/"`. Back returns to the last page outside Settings, which `routes/+layout.svelte` remembered from `to.url.pathname` after each navigation. At startup that was `""`, so Back was `<a href="">`: a link to nowhere, and a click navigated to the same page.

It was found by building the real release binary (`pnpm app:build --no-bundle`), adding a temporary probe script to `app.html` that clicked Settings and Back and reported `location`, the Back link's `href` and what sat under it. The probe showed `href=` (empty) and the page staying on `/settings/appearance`. It was removed afterwards.

Things that were **not** the cause (tried first, kept as harmless hardening where noted): the button being covered by another element (it was not), an unknown-section redirect firing while leaving Settings (a real race, now guarded by `page.route.id`), `goto` versus a real link (Back is now a real `<a>`, like the Settings link).

## Fix

- `lib/nav.ts`: `pathOf(url)` returns `url.pathname || "/"`. `isActive` also treats `""` as `/`.
- `lib/layout.svelte.ts`: `rememberApp(url)` stores `pathOf(url) + url.search`.
- `routes/+layout.svelte`: uses `pathOf` and `layout.rememberApp`.
- `lib/nav.test.ts`: checks that `tauri://localhost` has an empty path and that `pathOf`, `isActive` and `contextFor` handle it.

## How to reproduce / check

1. Unit: `pnpm test` (`nav.test.ts` fails if the empty path is not handled).
2. Real app, without installing: `pnpm app:build --no-bundle`, then run `src-tauri/target/release/irontion` (through `node scripts/with-clean-env.mjs` from a Snap terminal), open Settings, press Back.
3. In the console or a probe: `document.querySelector("[data-nav-back]").getAttribute("href")` must be `/` (or the page you came from), never empty.

## Lesson

**Never read `url.pathname` raw.** Use `pathOf(url)`. Anything that compares a path to `"/"`, builds a link from a path, or stores a path must expect `""` in the installed app. A test that passes in `pnpm dev` and in a browser proves nothing about the packaged app: when a bug is reported "after build and install", reproduce it with the release binary first (steps above) before guessing.
