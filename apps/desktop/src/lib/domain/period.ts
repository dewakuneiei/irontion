// The period Insights shows (F002): one day, a week, a month, or a range of the user's choosing,
// in the past or the future. Pure date math on local "YYYY-MM-DD" strings.

import type { WeekStart } from "./datetime";
import { addDays, fromISODate, toISODate } from "./time";

export const PERIOD_KINDS = ["day", "week", "month", "range"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];

/** Day, week and month are found from any date inside them; a range has its own two ends. */
export type Period =
  | { kind: "day" | "week" | "month"; anchor: string }
  | { kind: "range"; from: string; to: string };

/** The longest range: every day of it is loaded for the charts. */
export const MAX_RANGE_DAYS = 366;

export interface DateSpan {
  from: string;
  to: string;
}

/** First and last day of the period, both included. */
export function periodSpan(period: Period, weekStart: WeekStart): DateSpan {
  switch (period.kind) {
    case "day":
      return { from: period.anchor, to: period.anchor };
    case "week": {
      const date = fromISODate(period.anchor);
      const from = addDays(period.anchor, -((date.getDay() - weekStart + 7) % 7));
      return { from, to: addDays(from, 6) };
    }
    case "month": {
      const date = fromISODate(period.anchor);
      return {
        from: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
        to: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
      };
    }
    case "range":
      return { from: period.from, to: period.to };
  }
}

/** How many days from `from` to `to`, both included. */
export function spanDays({ from, to }: DateSpan): number {
  // Noon to noon, so a daylight-saving change cannot make a day 23 or 25 hours long.
  const noon = (iso: string) => fromISODate(iso).setHours(12);
  return Math.round((noon(to) - noon(from)) / 86_400_000) + 1;
}

export function contains(span: DateSpan, date: string): boolean {
  return span.from <= date && date <= span.to;
}

/** The period before (`-1`) or after (`1`). A range moves by its own length. */
export function stepPeriod(period: Period, delta: number, weekStart: WeekStart): Period {
  switch (period.kind) {
    case "day":
      return { kind: "day", anchor: addDays(period.anchor, delta) };
    case "week":
      return { kind: "week", anchor: addDays(periodSpan(period, weekStart).from, 7 * delta) };
    case "month": {
      // From the 1st, so 31 January + 1 month is February, not March.
      const date = fromISODate(period.anchor);
      return { kind: "month", anchor: toISODate(new Date(date.getFullYear(), date.getMonth() + delta, 1)) };
    }
    case "range": {
      const shift = spanDays(period) * delta;
      return { kind: "range", from: addDays(period.from, shift), to: addDays(period.to, shift) };
    }
  }
}

/**
 * Switch to another kind of period and stay near what is on show: around today if the current
 * period has it, else around its first day. A new range starts as the current period's days.
 */
export function switchKind(period: Period, kind: PeriodKind, today: string, weekStart: WeekStart): Period {
  const span = periodSpan(period, weekStart);
  if (kind === "range") return { kind, ...span };
  return { kind, anchor: contains(span, today) ? today : span.from };
}

/** The period of this kind that has today in it. A range keeps its length and ends today. */
export function currentPeriod(period: Period, today: string): Period {
  if (period.kind !== "range") return { kind: period.kind, anchor: today };
  return { kind: "range", from: addDays(today, 1 - spanDays(period)), to: today };
}

/**
 * A range with a new first day. The last day follows when it would come first or the range would
 * be longer than `MAX_RANGE_DAYS`; `setRangeTo` is the same from the other end.
 */
export function setRangeFrom(range: DateSpan, from: string): Period {
  const to = range.to < from ? from : range.to;
  const longest = addDays(from, MAX_RANGE_DAYS - 1);
  return { kind: "range", from, to: to > longest ? longest : to };
}

export function setRangeTo(range: DateSpan, to: string): Period {
  const from = range.from > to ? to : range.from;
  const earliest = addDays(to, 1 - MAX_RANGE_DAYS);
  return { kind: "range", from: from < earliest ? earliest : from, to };
}
