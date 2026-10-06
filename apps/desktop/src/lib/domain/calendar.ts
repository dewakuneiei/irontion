// Calendar (F007): turning a month grid and the backend's per-day counts into what the cells show.
// The grid itself is `monthGrid` in `datetime.ts`; there is no second one.

import type { NoteDayCount } from "$lib/api/types";
import { addDays, toISODate } from "./time";

/** First and last day on show (as `YYYY-MM-DD`), including the dimmed days of the neighbouring months. */
export function visibleRange(grid: readonly Date[]): { from: string; to: string } {
  return { from: toISODate(grid[0]), to: toISODate(grid[grid.length - 1]) };
}

export const NO_NOTES: NoteDayCount = { date: "", notes: 0 };

/** Counts by date, so a cell finds its own in one lookup. */
export function countsByDate(counts: readonly NoteDayCount[]): Map<string, NoteDayCount> {
  return new Map(counts.map((count) => [count.date, count]));
}

/** The first day of the month `delta` months from `shown` (negative goes back). */
export function stepMonth(shown: Date, delta: number): Date {
  return new Date(shown.getFullYear(), shown.getMonth() + delta, 1);
}

export type RelativeDay = "today" | "tomorrow" | "yesterday";

/** "today", "tomorrow" or "yesterday" when `date` is one of those, else `null` (show the date). */
export function relativeDay(date: string, today: string): RelativeDay | null {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  if (date === addDays(today, -1)) return "yesterday";
  return null;
}
