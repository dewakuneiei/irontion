// Grid editing as pure functions. The grid works by selection: pick cells, then
// allocate, deallocate or move them. `diff` turns the result into the `DayChange[]`
// the backend applies atomically.

import type { DayChange, DaySlots } from "$lib/api/types";
import { SLOTS_PER_DAY, SLOT_MINUTES } from "./time";

export interface Moved {
  slots: DaySlots;
  selection: Set<number>;
  /** The shift actually applied, after clamping to the day. */
  offset: number;
}

export interface SelectionSummary {
  blocks: number;
  minutes: number;
  /** Fraction of the day, 0 to 1. */
  share: number;
  /** Selected cells that already have an activity. */
  filled: number;
  /** First and last selected slot, when the selection has no gaps. */
  span: { first: number; last: number } | null;
  /** Activities in the selection with their block counts, largest first. */
  byActivity: [activityId: number, blocks: number][];
}

export function emptyDay(): DaySlots {
  return Array<number | null>(SLOTS_PER_DAY).fill(null);
}

/** Slots from `a` to `b` inclusive, in either order. */
export function range(a: number, b: number): number[] {
  const first = Math.min(a, b);
  return Array.from({ length: Math.max(a, b) - first + 1 }, (_, i) => first + i);
}

/** The selection with one cell added, or taken out if it is already selected. Never its neighbours. */
export function toggleSlot(selection: ReadonlySet<number>, slot: number): Set<number> {
  const next = new Set(selection);
  if (!next.delete(slot)) next.add(slot);
  return next;
}

/** The selection plus every slot from `from` to `to`. Nothing already selected is dropped. */
export function addRange(selection: ReadonlySet<number>, from: number, to: number): Set<number> {
  return new Set([...selection, ...range(from, to)]);
}

/** Give every selected cell this activity, or clear them with `null`. */
export function assign(slots: DaySlots, selection: Iterable<number>, activityId: number | null): DaySlots {
  const next = [...slots];
  for (const slot of selection) next[slot] = activityId;
  return next;
}

/** Keep a shift inside the day: the whole selection must stay on the grid. */
export function clampOffset(selection: ReadonlySet<number>, offset: number): number {
  if (selection.size === 0) return 0;
  const slots = [...selection];
  return Math.max(-Math.min(...slots), Math.min(SLOTS_PER_DAY - 1 - Math.max(...slots), offset));
}

/**
 * Shift the selection and the activities in it by `offset` slots. Only cells that
 * have an activity move; they overwrite whatever they land on.
 */
export function moveSelection(slots: DaySlots, selection: ReadonlySet<number>, offset: number): Moved {
  const shift = clampOffset(selection, offset);
  const next = [...slots];
  const filled = [...selection].filter((slot) => slots[slot] !== null);
  for (const slot of filled) next[slot] = null;
  for (const slot of filled) next[slot + shift] = slots[slot];
  return { slots: next, selection: new Set([...selection].map((slot) => slot + shift)), offset: shift };
}

/** Only the cells that changed. */
export function diff(before: DaySlots, after: DaySlots): DayChange[] {
  const changes: DayChange[] = [];
  for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
    if (before[slot] !== after[slot]) changes.push({ slot, activityId: after[slot] });
  }
  return changes;
}

/** Blocks per activity for one day. */
export function countByActivity(slots: DaySlots): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of slots) if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

export function summarizeSelection(slots: DaySlots, selection: ReadonlySet<number>): SelectionSummary {
  const chosen = [...selection];
  const first = Math.min(...chosen);
  const last = Math.max(...chosen);
  const byActivity = [...countByActivity(chosen.map((slot) => slots[slot]))].sort((a, b) => b[1] - a[1]);
  return {
    blocks: selection.size,
    minutes: selection.size * SLOT_MINUTES,
    share: selection.size / SLOTS_PER_DAY,
    filled: byActivity.reduce((sum, [, blocks]) => sum + blocks, 0),
    span: selection.size > 0 && last - first + 1 === selection.size ? { first, last } : null,
    byActivity,
  };
}
