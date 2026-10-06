import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/** Open a web address in the user's browser (the app's own window never navigates away). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
