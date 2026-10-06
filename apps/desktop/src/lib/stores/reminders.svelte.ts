import { getBackend } from "$lib/api/backend";
import type { Note } from "$lib/api/types";
import { t } from "$lib/i18n/index.svelte";
import { notes } from "./notes.svelte";
import { notices } from "./notices.svelte";

const CHECK_MS = 30_000;
/** How much of a note's text a reminder shows. */
const EXCERPT = 90;

/**
 * Shows a reminder when its time comes (F008). While the app is open it asks the backend every 30
 * seconds which reminders are due; each one is shown once as a notice that stays until dismissed,
 * and is marked as shown so it does not come back. Reminders do not reach the user when the app is closed.
 */
class ReminderWatcher {
  private checking = false;

  /** Start watching. Returns a function that stops it. `open` shows a note (the notice's button). */
  start(open: (note: Note) => void): () => void {
    void this.check(open);
    const timer = setInterval(() => void this.check(open), CHECK_MS);
    return () => clearInterval(timer);
  }

  async check(open: (note: Note) => void): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      const backend = await getBackend();
      const due = await backend.dueReminders();
      for (const note of due) {
        await backend.markNoteReminded(note.id);
        const text = [...note.text].length > EXCERPT ? `${[...note.text].slice(0, EXCERPT).join("")}…` : note.text;
        notices.info(t("reminders.due", { text }), {
          sticky: true,
          action: { label: t("reminders.open"), run: () => open(note) },
        });
      }
      if (due.length > 0) await notes.reload();
    } catch (err) {
      console.error("[reminders] check failed", err);
    } finally {
      this.checking = false;
    }
  }
}

export const reminders = new ReminderWatcher();
