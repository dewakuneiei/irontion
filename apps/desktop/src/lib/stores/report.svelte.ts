import { getBackend } from "$lib/api/backend";
import type { ActivityTotal, DailyTotal } from "$lib/api/types";
import { notices } from "./notices.svelte";

/**
 * Totals for one date range. Each page that shows statistics owns an instance and
 * calls `load` from an `$effect`, so it refetches when the range or the data changes.
 */
export class RangeReport {
  activityTotals = $state<ActivityTotal[]>([]);
  dailyTotals = $state<DailyTotal[]>([]);
  loaded = $state(false);

  private request = 0;

  async load(from: string, to: string) {
    const request = ++this.request;
    try {
      const backend = await getBackend();
      const [activityTotals, dailyTotals] = await Promise.all([
        backend.activityTotals(from, to),
        backend.dailyTotals(from, to),
      ]);
      if (request !== this.request) return;
      this.activityTotals = activityTotals;
      this.dailyTotals = dailyTotals;
      this.loaded = true;
    } catch (err) {
      notices.error(err);
    }
  }

  /** Direct block counts keyed by activity id, ready for `rollUp`. */
  get direct(): Map<number, number> {
    return new Map(this.activityTotals.map((t) => [t.activityId, t.blocks]));
  }
}
