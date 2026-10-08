import { getBackend } from "$lib/api/backend";
import type { ActivityTotal, DailyTotal } from "$lib/api/types";
import type { LoadedDay } from "$lib/domain/insights";
import { addDays } from "$lib/domain/time";
import { notices } from "./notices.svelte";

/**
 * Totals for one date range. Each page that shows statistics owns an instance and
 * calls `load` from an `$effect`, so it refetches when the range or the data changes.
 */
export class RangeReport {
  activityTotals = $state<ActivityTotal[]>([]);
  dailyTotals = $state<DailyTotal[]>([]);
  /** Every day of the range with its slots, after `loadDays` (the Insights charts need them). */
  days = $state<LoadedDay[]>([]);
  loaded = $state(false);

  private request = 0;
  private daysRequest = 0;

  /** Load each day from `from` to `to`, both included. Oldest first. */
  async loadDays(from: string, to: string) {
    const request = ++this.daysRequest;
    try {
      const backend = await getBackend();
      const dates: string[] = [];
      for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
      const days = await Promise.all(dates.map(async (date) => ({ date, slots: await backend.getDay(date) })));
      if (request === this.daysRequest) this.days = days;
    } catch (err) {
      notices.error(err);
    }
  }

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
