# Irontion

Time blocks, habits and productivity tracking. Local-first, fast, and private.

| Folder | What it is |
| ------ | ---------- |
| [apps/desktop](apps/desktop) | Desktop app for Linux, Windows and macOS (Tauri 2 + Svelte 5) |
| [crates/irontion-core](crates/irontion-core) | Shared Rust logic and SQLite storage |
| [irontion_docs](irontion_docs) | Project notes and feature specs (Obsidian vault) |

Future apps go in `apps/<platform>` (`web`, `android`, `ios`), and shared Rust code goes in `crates/`.
Notes for AI agents working on this repo are in [CLAUDE.md](CLAUDE.md) and `.claude/skills/`.
See [irontion_docs/info.md](irontion_docs/info.md) for the tech stack and roadmap.

## Try It Without Installing (Linux)

```sh
cd apps/desktop
pnpm install
pnpm dev     # UI in the browser at http://127.0.0.1:1420 (no sudo, no Rust)
pnpm app     # real desktop window (needs the Tauri system libraries)
```

Full details are in [apps/desktop/README.md](apps/desktop/README.md#run-without-installing-linux).
