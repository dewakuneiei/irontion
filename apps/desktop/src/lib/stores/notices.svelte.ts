import { errorKind } from "$lib/api/backend";
import { t } from "$lib/i18n/index.svelte";

export interface Notice {
  id: number;
  message: string;
  tone: "info" | "error";
}

const DISMISS_MS = 4500;

/** Short messages shown at the bottom of the window. */
class NoticeStore {
  items = $state<Notice[]>([]);
  private nextId = 1;

  info(message: string) {
    this.push(message, "info");
  }

  /** Show a translated message for any backend error. */
  error(err: unknown) {
    console.error(err);
    this.push(t(`errors.${errorKind(err)}`), "error");
  }

  dismiss(id: number) {
    this.items = this.items.filter((n) => n.id !== id);
  }

  private push(message: string, tone: Notice["tone"]) {
    const id = this.nextId++;
    this.items = [...this.items, { id, message, tone }];
    setTimeout(() => this.dismiss(id), DISMISS_MS);
  }
}

export const notices = new NoticeStore();
