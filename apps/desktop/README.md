# Irontion Desktop

Desktop app for Linux, Windows and macOS, built with **Tauri 2**, **Svelte 5**, **TypeScript**, **Tailwind CSS 4** and **Apache ECharts**.

## Setup (Ubuntu)

Rust, Node.js and pnpm must already be installed. Then install the Tauri system libraries once:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Optional, for Chinese / Japanese / Korean text: `sudo apt install fonts-noto-cjk`

Install the JS dependencies:

```sh
pnpm install
```

## Commands

| Command | What it does |
| ------- | ------------ |
| `pnpm app` | Run the desktop app with hot reload |
| `pnpm app:build` | Build installers (Linux: `.deb`, `.rpm`, `.AppImage`) into `src-tauri/target/release/bundle/` |
| `pnpm dev` | Run only the UI in a browser at http://127.0.0.1:1420 (no Rust needed, uses example data that is not saved) |
| `pnpm check` | Type-check Svelte and TypeScript, and check every language has every text |
| `pnpm test` | Unit tests for the grid, tree, stats and accent-color logic |
| `cargo test` (in `src-tauri`) | Calls every Tauri command over IPC with a test database |

Windows (`.msi`, `.exe`) and macOS (`.app`, `.dmg`) installers are built with the same `pnpm app:build`, run on that OS.

## Run Without Installing (Linux)

None of these install Irontion on your system. Run them from `apps/desktop`.

**1. In the browser** (no `sudo`, no Rust needed)

```sh
pnpm dev
```

Open http://127.0.0.1:1420 in Chrome or Firefox. Good for quickly checking the UI, themes, languages and charts.
The native title bar and OS language detection only work in the real window (option 2 or 3).

**2. As a desktop window, with hot reload**

```sh
pnpm app
```

Opens the real Irontion window straight from the project folder. Needs the system libraries from [Setup](#setup-ubuntu).
The first run takes a few minutes while Rust compiles.

**3. As a standalone program** (no installer)

```sh
pnpm tauri build --no-bundle
./src-tauri/target/release/irontion
```

Builds an optimized binary and runs it directly. Nothing is added to the system.

Want a single double-click file instead? `pnpm tauri build --bundles appimage` writes an `.AppImage` into
`src-tauri/target/release/bundle/appimage/`; run `chmod +x` on it and open it.

> Options 2 and 3 need the system libraries from [Setup](#setup-ubuntu). Without `sudo`, only option 1 works.

## Project Layout

```
src/
├── routes/             # Pages: Today, blocks/ (F001), activities/ (F002), insights/, settings/
├── lib/
│   ├── api/            # Backend interface: Tauri (real app) and preview (browser)
│   ├── stores/         # Shared state: catalog (activities + tags), day, reports, notices
│   ├── domain/         # Pure logic: slots, tree, time, stats, colors (unit-tested)
│   ├── components/     # UI: blocks/, activities/, settings/, Sidebar, Modal, Button, Chart, ...
│   ├── charts/         # ECharts setup, theme-aware palette, shared chart builders
│   ├── i18n/           # Translations (en, th, zh-CN, ja, ko) and t()
│   ├── theme.svelte.ts       # Light / Dark / System theme (F003)
│   ├── preferences.svelte.ts # Accent color and block shape (F003)
│   └── layout.svelte.ts      # Sidebar fold in / out (F004)
└── app.css             # Design tokens for both themes
src-tauri/              # Thin Tauri commands over crates/irontion-core, window config, bundling
assets/app-icon.svg     # Source for all app icons (`pnpm tauri icon assets/app-icon.svg`)
```

Your data is saved in `~/.local/share/com.irontion.app/irontion.db` (one SQLite file).
