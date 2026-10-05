import { getBackend } from "$lib/api/backend";
import type { DayChange, DaySlots } from "$lib/api/types";
import { diff, emptyDay } from "$lib/domain/slots";
import { todayISO } from "$lib/domain/time";
import { notices } from "./notices.svelte";

/** The day shown on the Blocks page, and every edit made to it. */
class DayStore {
  date = $state(todayISO());
  slots = $state<DaySlots>(emptyDay());
  loaded = $state(false);
  /** Bumped after every saved edit, so reports know to refetch. */
  version = $state(0);

  private request = 0;
  /** Saves run one at a time, in order. This is the tail of that line. */
  private saving: Promise<void> = Promise.resolve();
  private pendingSaves = 0;

  async open(date: string) {
    const request = ++this.request;
    this.date = date;
    try {
      const slots = await (await getBackend()).getDay(date);
      // Ignore answers for a day the user already navigated away from.
      if (request === this.request) {
        this.slots = slots;
        this.loaded = true;
      }
    } catch (err) {
      notices.error(err);
    }
  }

  /**
   * Show `next` right away and save the difference.
   *
   * Saves are queued instead of sent at once: the Tauri commands run concurrently, so
   * two quick edits (allocate, then deallocate) could reach the database in the wrong
   * order and the older one would silently undo the newer one.
   */
  apply(next: DaySlots): Promise<void> {
    const changes = diff(this.slots, next);
    if (changes.length === 0) return Promise.resolve();
    const date = this.date;
    this.slots = next;
    this.pendingSaves++;
    this.saving = this.saving.then(() => this.save(date, changes));
    return this.saving;
  }

  private async save(date: string, changes: DayChange[]) {
    try {
      const saved = await (await getBackend()).applyDayChanges(date, changes);
      this.pendingSaves--;
      // While newer edits are still queued, the screen already shows them; an older
      // answer would flash them away.
      if (this.pendingSaves === 0 && date === this.date) this.slots = saved;
      this.version++;
    } catch (err) {
      this.pendingSaves--;
      notices.error(err);
      // The screen may show edits that never saved: show what the database really has.
      if (date === this.date) await this.open(date);
    }
  }
}

export const day = new DayStore();
