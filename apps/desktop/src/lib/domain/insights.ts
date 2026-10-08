// Insights charts (F002): pure data builders. Pass the loaded days and the rules for which
// activity counts, and get what a chart needs. No I/O, so the edge cases (empty range, today with
// blocks still ahead, filters) are easy to test.

import type { DaySlots } from "$lib/api/types";
import { SLOTS_PER_DAY, SLOTS_PER_HOUR } from "./time";

/** One loaded day: its date and what is in each of its 144 slots. */
export interface LoadedDay {
  date: string;
  slots: DaySlots;
}

/** What the builders need to know about the catalog, as plain functions. */
export interface ActivityRules {
  /** The top-level activity a block rolls up to (the same roll-up as the summary). */
  topOf: (activityId: number) => number;
  /** Does this activity pass the tag filter? */
  included: (activityId: number) => boolean;
}

/** Where "now" is: today's date and the index of the slot that is in progress. */
export interface Clock {
  today: string;
  /** 0-143. Slots after it have not happened yet. */
  nowSlot: number;
}

/** Has this slot happened? Every slot of an earlier day, and up to the current one today. */
export function hasHappened(date: string, slot: number, clock: Clock): boolean {
  return date < clock.today || (date === clock.today && slot <= clock.nowSlot);
}

export type ShareKind = "activity" | "other" | "unallocated" | "ahead";

export interface ShareSlice {
  kind: ShareKind;
  /** The top-level activity, for `activity` slices. */
  activityId: number | null;
  blocks: number;
}

export interface DayShare {
  /** Activities (largest first), then other, unallocated and ahead; empty slices are left out. */
  slices: ShareSlice[];
  /** Every block of the range: days x 144. */
  total: number;
  /** Blocks of included activities in slots that have happened. */
  tracked: number;
  /** Slots that have happened. */
  past: number;
  /** `tracked` over `past`, 0 to 1 (0 when nothing has happened). */
  trackedShare: number;
}

/**
 * How the range's blocks divide up. The whole range is the denominator (days x 144):
 * - a block with an included activity is a slice of that activity's top-level activity,
 * - a block with an activity the tag filter leaves out is "other",
 * - an empty block that has happened is "unallocated",
 * - an empty block that has not happened yet (later today) is "ahead", so today does not look empty.
 */
export function buildShare(days: readonly LoadedDay[], rules: ActivityRules, clock: Clock): DayShare {
  const byActivity = new Map<number, number>();
  let other = 0;
  let unallocated = 0;
  let ahead = 0;
  let tracked = 0;
  let past = 0;
  for (const { date, slots } of days) {
    slots.forEach((id, slot) => {
      const happened = hasHappened(date, slot, clock);
      if (happened) past++;
      if (id === null) {
        if (happened) unallocated++;
        else ahead++;
      } else if (rules.included(id)) {
        const top = rules.topOf(id);
        byActivity.set(top, (byActivity.get(top) ?? 0) + 1);
        if (happened) tracked++;
      } else {
        other++;
      }
    });
  }
  const activities = [...byActivity]
    .map(([activityId, blocks]): ShareSlice => ({ kind: "activity", activityId, blocks }))
    .sort((a, b) => b.blocks - a.blocks || a.activityId! - b.activityId!);
  const slices = [
    ...activities,
    { kind: "other", activityId: null, blocks: other } satisfies ShareSlice,
    { kind: "unallocated", activityId: null, blocks: unallocated } satisfies ShareSlice,
    { kind: "ahead", activityId: null, blocks: ahead } satisfies ShareSlice,
  ].filter((s) => s.blocks > 0);
  return { slices, total: days.length * SLOTS_PER_DAY, tracked, past, trackedShare: past === 0 ? 0 : tracked / past };
}

/** The slices biggest first, for the legend (the ring keeps activities first). */
export function bySize(slices: readonly ShareSlice[]): ShareSlice[] {
  return [...slices].sort((a, b) => b.blocks - a.blocks);
}

export interface DailyStack {
  dates: string[];
  /** One series per activity (biggest overall first), then "other" for the rest. Blocks per date. */
  series: { activityId: number | null; blocks: number[] }[];
}

/** Blocks per day, stacked by top-level activity: the `limit` biggest, the rest together as other. */
export function buildDailyStack(days: readonly LoadedDay[], rules: ActivityRules, limit = 6): DailyStack {
  const perDay = days.map(({ slots }) => {
    const counts = new Map<number, number>();
    for (const id of slots) {
      if (id === null || !rules.included(id)) continue;
      const top = rules.topOf(id);
      counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    return counts;
  });
  const overall = new Map<number, number>();
  for (const counts of perDay) for (const [id, n] of counts) overall.set(id, (overall.get(id) ?? 0) + n);
  const ranked = [...overall].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id]) => id);
  const shown = ranked.slice(0, limit);
  const series: DailyStack["series"] = shown.map((id) => ({ activityId: id, blocks: perDay.map((c) => c.get(id) ?? 0) }));
  if (ranked.length > limit) {
    const rest = new Set(ranked.slice(limit));
    series.push({
      activityId: null,
      blocks: perDay.map((counts) => [...counts].filter(([id]) => rest.has(id)).reduce((sum, [, n]) => sum + n, 0)),
    });
  }
  return { dates: days.map((d) => d.date), series };
}

export const PARTS_OF_DAY = ["night", "morning", "afternoon", "evening"] as const;
export type PartOfDay = (typeof PARTS_OF_DAY)[number];
/** Each part is six hours: night 00-06, morning 06-12, afternoon 12-18, evening 18-24. */
const SLOTS_PER_PART = 6 * SLOTS_PER_HOUR;

export function partOfSlot(slot: number): PartOfDay {
  return PARTS_OF_DAY[Math.floor(slot / SLOTS_PER_PART)];
}

/** Tracked blocks in each part of the day, over the whole range. */
export function buildPartsOfDay(days: readonly LoadedDay[], rules: ActivityRules): Record<PartOfDay, number> {
  const parts: Record<PartOfDay, number> = { night: 0, morning: 0, afternoon: 0, evening: 0 };
  for (const { slots } of days) {
    slots.forEach((id, slot) => {
      if (id !== null && rules.included(id)) parts[partOfSlot(slot)]++;
    });
  }
  return parts;
}
