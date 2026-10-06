import { errorKind } from "$lib/api/backend";
import { t } from "$lib/i18n/index.svelte";

/** A button on a notice, such as Undo. Running it dismisses the notice. */
export interface NoticeAction {
  label: string;
  run: () => unknown;
}

export interface NoticeOptions {
  action?: NoticeAction;
  /** Stays until the user dismisses it (a reminder), instead of fading after a few seconds. */
  sticky?: boolean;
}

export interface Notice {
  id: number;
  message: string;
  tone: "info" | "error";
  action?: NoticeAction;
}

const DISMISS_MS = 4500;

/** Short messages shown at the bottom of the window. */
class NoticeStore {
  items = $state<Notice[]>([]);
  private nextId = 1;

  info(message: string, options: NoticeOptions = {}) {
    this.push(message, "info", options);
  }

  /** Show a translated message for any backend error. */
  error(err: unknown) {
    console.error(err);
    this.push(t(`errors.${errorKind(err)}`), "error");
  }

  dismiss(id: number) {
    this.items = this.items.filter((n) => n.id !== id);
  }

  private push(message: string, tone: Notice["tone"], { action, sticky = false }: NoticeOptions = {}) {
    const id = this.nextId++;
    this.items = [...this.items, { id, message, tone, action }];
    if (!sticky) setTimeout(() => this.dismiss(id), DISMISS_MS);
  }
}

export const notices = new NoticeStore();
