import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_DAYS,
  currentPeriod,
  periodSpan,
  setRangeFrom,
  setRangeTo,
  spanDays,
  stepPeriod,
  switchKind,
  type Period,
} from "./period";

// Thursday 8 October 2026.
const TODAY = "2026-10-08";
const MONDAY = 1;
const SUNDAY = 0;

describe("periodSpan", () => {
  it("a day is itself", () => {
    expect(periodSpan({ kind: "day", anchor: TODAY }, MONDAY)).toEqual({ from: TODAY, to: TODAY });
  });

  it("a week follows the user's week start", () => {
    expect(periodSpan({ kind: "week", anchor: TODAY }, MONDAY)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(periodSpan({ kind: "week", anchor: TODAY }, SUNDAY)).toEqual({ from: "2026-10-04", to: "2026-10-10" });
    // The start day itself begins its week.
    expect(periodSpan({ kind: "week", anchor: "2026-10-05" }, MONDAY).from).toBe("2026-10-05");
  });

  it("a month runs from the 1st to its last day, leap years included", () => {
    expect(periodSpan({ kind: "month", anchor: TODAY }, MONDAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodSpan({ kind: "month", anchor: "2028-02-10" }, MONDAY)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("stepPeriod", () => {
  it("moves a day, a week or a month, into the past or the future", () => {
    expect(stepPeriod({ kind: "day", anchor: TODAY }, -1, MONDAY)).toEqual({ kind: "day", anchor: "2026-10-07" });
    expect(stepPeriod({ kind: "day", anchor: "2026-12-31" }, 1, MONDAY)).toEqual({ kind: "day", anchor: "2027-01-01" });
    const nextWeek = stepPeriod({ kind: "week", anchor: TODAY }, 1, MONDAY);
    expect(periodSpan(nextWeek, MONDAY)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("goes from 31 January to February, not March", () => {
    const next = stepPeriod({ kind: "month", anchor: "2026-01-31" }, 1, MONDAY);
    expect(periodSpan(next, MONDAY)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodSpan(stepPeriod(next, -2, MONDAY), MONDAY).from).toBe("2025-12-01");
  });

  it("moves a range by its own length", () => {
    const range: Period = { kind: "range", from: "2026-10-01", to: "2026-10-10" };
    expect(stepPeriod(range, 1, MONDAY)).toEqual({ kind: "range", from: "2026-10-11", to: "2026-10-20" });
  });
});

describe("switching and today", () => {
  it("stays on today when the current period has it", () => {
    expect(switchKind({ kind: "month", anchor: "2026-10-20" }, "day", TODAY, MONDAY)).toEqual({ kind: "day", anchor: TODAY });
  });

  it("otherwise starts at the first day on show", () => {
    expect(switchKind({ kind: "month", anchor: "2026-03-20" }, "week", TODAY, MONDAY)).toEqual({ kind: "week", anchor: "2026-03-01" });
  });

  it("a new range is the days that were on show", () => {
    expect(switchKind({ kind: "week", anchor: TODAY }, "range", TODAY, MONDAY)).toEqual({
      kind: "range",
      from: "2026-10-05",
      to: "2026-10-11",
    });
  });

  it("today's period, and a range of the same length ending today", () => {
    expect(currentPeriod({ kind: "week", anchor: "2025-01-01" }, TODAY)).toEqual({ kind: "week", anchor: TODAY });
    expect(currentPeriod({ kind: "range", from: "2026-01-01", to: "2026-01-07" }, TODAY)).toEqual({
      kind: "range",
      from: "2026-10-02",
      to: TODAY,
    });
  });
});

describe("ranges", () => {
  it("counts both ends, across a daylight-saving change", () => {
    expect(spanDays({ from: TODAY, to: TODAY })).toBe(1);
    expect(spanDays({ from: "2026-03-01", to: "2026-03-31" })).toBe(31);
    expect(spanDays({ from: "2026-01-01", to: "2026-12-31" })).toBe(365);
  });

  it("keeps the ends in order when one passes the other", () => {
    const range = { from: "2026-10-01", to: "2026-10-10" };
    expect(setRangeFrom(range, "2026-10-20")).toEqual({ kind: "range", from: "2026-10-20", to: "2026-10-20" });
    expect(setRangeTo(range, "2026-09-01")).toEqual({ kind: "range", from: "2026-09-01", to: "2026-09-01" });
  });

  it("is never longer than the limit", () => {
    const range = { from: "2026-10-01", to: "2026-10-10" };
    const longFrom = setRangeFrom(range, "2020-01-01");
    expect(spanDays(periodSpan(longFrom, MONDAY))).toBe(MAX_RANGE_DAYS);
    const longTo = setRangeTo(range, "2030-01-01");
    expect(longTo).toMatchObject({ to: "2030-01-01" });
    expect(spanDays(periodSpan(longTo, MONDAY))).toBe(MAX_RANGE_DAYS);
  });

  it("can lie entirely in the future", () => {
    expect(setRangeTo({ from: "2027-01-01", to: "2027-01-05" }, "2027-01-31")).toEqual({
      kind: "range",
      from: "2027-01-01",
      to: "2027-01-31",
    });
  });
});
