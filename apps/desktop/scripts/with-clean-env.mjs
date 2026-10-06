// Runs a command with Snap's environment removed, then forwards its exit code.
//
// VS Code installed as a Snap gives its terminal Snap's own library and GTK paths. A
// native app started from there (like this one) loads Snap's old libraries instead of the
// system's and crashes at startup:
//   symbol lookup error: /snap/core20/.../libpthread.so.0: undefined symbol: __libc_pthread_init
// Outside a Snap terminal, and on Windows and macOS, this changes nothing.

import { spawn } from "node:child_process";

const SNAP_ONLY = new Set([
  "GTK_PATH",
  "GTK_EXE_PREFIX",
  "GTK_IM_MODULE_FILE",
  "GDK_PIXBUF_MODULE_FILE",
  "GDK_PIXBUF_MODULEDIR",
  "GIO_MODULE_DIR",
  "LOCPATH",
  "GSETTINGS_SCHEMA_DIR",
  "GIO_LAUNCHED_DESKTOP_FILE",
  "GIO_LAUNCHED_DESKTOP_FILE_PID",
]);
const ORIGINAL_SUFFIX = "_VSCODE_SNAP_ORIG";

/** A copy of `env` as it was before the Snap launcher changed it. */
export function withoutSnap(env) {
  if (!env.SNAP) return env;
  const clean = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("SNAP") || SNAP_ONLY.has(key) || key.endsWith(ORIGINAL_SUFFIX)) continue;
    clean[key] = value;
  }
  // The launcher saved the real values of the paths it replaced; put them back.
  for (const [key, value] of Object.entries(env)) {
    if (key.endsWith(ORIGINAL_SUFFIX)) clean[key.slice(0, -ORIGINAL_SUFFIX.length)] = value;
  }
  return clean;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-clean-env.mjs <command> [args...]");
  process.exit(2);
}

const child = spawn(command, args, {
  env: withoutSnap(process.env),
  stdio: "inherit",
  shell: process.platform === "win32", // finds tauri.cmd
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (err) => {
  console.error(`could not start ${command}: ${err.message}`);
  process.exit(127);
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
