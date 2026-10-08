import { getBackend } from "$lib/api/backend";
import type { NotificationPermission, ReminderDelivery } from "$lib/api/types";
import { t } from "$lib/i18n/index.svelte";
import { notes } from "./notes.svelte";
import { notices } from "./notices.svelte";

/** How much of a note's text a reminder shows. */
const EXCERPT = 90;

/**
 * Shows what the backend delivers (F008). The backend decides what is due, sends the system
 * notification (only if the user allowed it) and records it, even while this window is hidden.
 * A reminder that neither the system notification nor the popup window showed becomes a notice here
 * that stays until dismissed, with an Open note button. When the system notification failed, a
 * second notice says why.
 *
 * It also asks the user, once, whether reminders may be system notifications.
 */
class ReminderWatcher {
  /** The user's choice; `null` until it has been read from the backend. */
  permission = $state<NotificationPermission | null>(null);
  /** A due reminder opens a popup window. */
  popup = $state(false);
  /** The "Allow notifications?" dialog is open. */
  asking = $state(false);

  async loadPermission(): Promise<NotificationPermission> {
    const permission = await (await getBackend()).notificationPermission();
    this.permission = permission;
    return permission;
  }

  async setPermission(permission: NotificationPermission): Promise<void> {
    await (await getBackend()).setNotificationPermission(permission);
    this.permission = permission;
  }

  /** After the user sets a reminder: ask, if they have never answered. */
  async askIfUndecided(): Promise<void> {
    const permission = this.permission ?? (await this.loadPermission());
    if (permission === "ask") this.asking = true;
  }

  /**
   * Turn system notifications on. The system must really show one: if it cannot, or the user
   * refuses its permission prompt, they stay off, a notice says why, and the answer is saved as
   * "denied" (the Settings switch is the way to try again). Returns whether they are on.
   */
  async turnOn(): Promise<boolean> {
    try {
      await (await getBackend()).enableNotifications(t("reminders.title"), t("settings.notifications.testBody"));
      this.permission = "allowed";
      return true;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      notices.failure(t("settings.notifications.enableFailed", { reason }), { sticky: true });
      await this.setPermission("denied");
      return false;
    }
  }

  /** The user answered the dialog. Closing it without an answer asks again next time. */
  async answer(allow: boolean): Promise<void> {
    this.asking = false;
    if (allow) await this.turnOn();
    else await this.setPermission("denied");
  }

  async loadPopup(): Promise<boolean> {
    this.popup = await (await getBackend()).reminderWindow();
    return this.popup;
  }

  async setPopup(enabled: boolean): Promise<void> {
    await (await getBackend()).setReminderWindow(enabled);
    this.popup = enabled;
  }

  /**
   * Start listening for deliveries, and for a popup asking to open a note. Returns a function that
   * stops both. `open` shows a note by its id (the notice's button, and the popup's).
   */
  start(open: (id: number) => void): () => void {
    const stops: (() => void)[] = [];
    let stopped = false;
    const keep = (unlisten: () => void) => (stopped ? unlisten() : stops.push(unlisten));
    const fail = (err: unknown) => console.error("[reminders] could not start watching", err);
    void getBackend()
      .then((backend) => backend.watchReminders((delivery) => void this.show(delivery, open)))
      .then(keep)
      .catch(fail);
    void getBackend()
      .then((backend) => backend.watchOpenNote(open))
      .then(keep)
      .catch(fail);
    return () => {
      stopped = true;
      stops.forEach((stop) => stop());
    };
  }

  /** Send the system notification's words in the user's language; call again when it changes. */
  async sendTexts(): Promise<void> {
    const backend = await getBackend();
    await backend.setNotificationTexts({ reminder: t("reminders.title"), missed: t("reminders.missedTitle") });
  }

  private async show({ note, missed, shown, error }: ReminderDelivery, open: (id: number) => void): Promise<void> {
    if (shown) {
      await notes.reload();
      return;
    }
    const chars = [...note.text];
    const text = chars.length > EXCERPT ? `${chars.slice(0, EXCERPT).join("")}…` : note.text;
    notices.info(t(missed ? "reminders.missed" : "reminders.due", { text }), {
      sticky: true,
      action: { label: t("reminders.open"), run: () => open(note.id) },
    });
    if (error) notices.failure(t("reminders.notShown", { reason: error }), { sticky: true });
    await notes.reload();
  }
}

export const reminders = new ReminderWatcher();
