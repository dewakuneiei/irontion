import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

const STORAGE_KEY = "irontion.theme";

function readSavedMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Storage unavailable: fall back to following the OS.
  }
  return "system";
}

class ThemeState {
  mode = $state<ThemeMode>(readSavedMode());
  systemDark = $state(false);
  resolved = $derived<ResolvedTheme>(
    this.mode === "system" ? (this.systemDark ? "dark" : "light") : this.mode,
  );

  /** Start watching the OS theme. Returns a cleanup function. */
  init(): () => void {
    const media = matchMedia("(prefers-color-scheme: dark)");
    this.systemDark = media.matches;
    const onMedia = (e: MediaQueryListEvent) => (this.systemDark = e.matches);
    media.addEventListener("change", onMedia);

    let unlistenTauri: (() => void) | undefined;
    if (isTauri()) {
      const win = getCurrentWindow();
      // Tauri reads the OS theme directly (GTK / portal on Linux), which is more
      // reliable than the webview media query on some desktops.
      void this.syncWindow().then(async () => {
        if (this.mode === "system") this.systemDark = (await win.theme()) === "dark";
      });
      void win
        .onThemeChanged(({ payload }) => {
          if (this.mode === "system") this.systemDark = payload === "dark";
        })
        .then((fn) => (unlistenTauri = fn));
    }

    return () => {
      media.removeEventListener("change", onMedia);
      unlistenTauri?.();
    };
  }

  async set(mode: ThemeMode) {
    if (mode === this.mode) return;
    const root = document.documentElement;
    root.classList.add("theme-switching");
    this.mode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not persisted; the choice still applies for this session.
    }
    await this.syncWindow();
    if (mode === "system" && isTauri()) {
      this.systemDark = (await getCurrentWindow().theme()) === "dark";
    }
    setTimeout(() => root.classList.remove("theme-switching"), 300);
  }

  /** Match the native title bar / window decorations to the chosen theme. */
  private async syncWindow() {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().setTheme(this.mode === "system" ? null : this.mode);
    } catch (err) {
      console.warn("[theme] could not set window theme", err);
    }
  }
}

export const theme = new ThemeState();
