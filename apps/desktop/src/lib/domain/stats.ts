import type { DailyTotal } from "$lib/api/types";
import { addDays } from "./time";

/**
 * Consecutive tracked days ending today. If today has nothing yet, the streak
 * still counts up to yesterday, so it doesn't reset every morning.
 */
export function currentStreak(daily: DailyTotal[], today: string): number {
  const tracked = new Set(daily.filter((d) => d.blocks > 0).map((d) => d.date));
  let day = tracked.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (tracked.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function blocksOn(daily: DailyTotal[], date: string): number {
  return daily.find((d) => d.date === date)?.blocks ?? 0;
}

export function totalBlocks(daily: DailyTotal[]): number {
  return daily.reduce((sum, d) => sum + d.blocks, 0);
}

/**
 * Activities worth offering first: the most used recently, then the rest in tree
 * order. Only `candidates` (activities that can take blocks) are ever returned.
 */
export function suggestActivities(usage: ReadonlyMap<number, number>, candidates: number[], limit: number): number[] {
  const used = (id: number) => usage.get(id) ?? 0;
  // Array.sort is stable, so ties keep tree order.
  return [...candidates].sort((a, b) => used(b) - used(a)).slice(0, limit);
}
