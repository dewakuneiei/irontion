import { describe, expect, it } from "vitest";
import {
  DATE_FORMATS,
  WEEK_STARTS,
  formatClock,
  formatDate,
  formatHour,
  isDateFormat,
  monthGrid,
  parseWeekStart,
  weekdayName,
  weekdayNames,
} from "./datetime";

const oct6 = new Date(2026, 9, 6); // Tuesday

describe("formatDate", () => {
  it.each([
    ["dd/mm/yyyy", "06/10/2026"],
    ["mm/dd/yyyy", "10/06/2026"],
    ["yyyy-mm-dd", "2026-10-06"],
    ["dd.mm.yyyy", "06.10.2026"],
    ["dd-mm-yyyy", "06-10-2026"],
    ["yyyy/mm/dd", "2026/10/06"],
    ["d mmm yyyy", "6 Oct 2026"],
    ["mmm d, yyyy", "Oct 6, 2026"],
  ] as const)("%s gives %s", (format, expected) => {
    expect(formatDate(oct6, format, "en")).toBe(expected);
  });

  it("system follows the language", () => {
    expect(formatDate(oct6, "system", "en-GB")).toBe("06/10/2026");
    expect(formatDate(oct6, "system", "en-US")).toBe("10/06/2026");
  });

  it("month names follow the language", () => {
    expect(formatDate(oct6, "d mmm yyyy", "th")).toContain("ต.ค.");
  });

  it("every listed format is valid and unknown values are rejected", () => {
    expect(DATE_FORMATS.every(isDateFormat)).toBe(true);
    expect(isDateFormat("dd/mm/yy")).toBe(false);
  });
});

describe("time", () => {
  it("writes minutes since midnight in 24h or 12h", () => {
    expect(formatClock(8 * 60 + 10, "24h")).toBe("08:10");
    expect(formatClock(0, "12h")).toBe("12:00");
    expect(formatClock(13 * 60 + 40, "12h")).toBe("1:40");
    expect(formatClock(24 * 60, "24h")).toBe("00:00");
  });

  it("labels hour rows", () => {
    expect(formatHour(8, "24h", "en")).toBe("08");
    expect(formatHour(13, "12h", "en")).toMatch(/^1\s?PM$/);
  });
});

describe("calendar", () => {
  it.each([0, 1, 2, 3, 4, 5, 6] as const)("a grid starting on weekday %i starts on that weekday and covers the month", (start) => {
    const grid = monthGrid(2026, 9, start);
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(start);
    expect(grid[0] <= new Date(2026, 9, 1)).toBe(true);
    expect(grid.some((d) => d.getMonth() === 9 && d.getDate() === 31)).toBe(true);
  });

  it("names weekdays in calendar order from any start", () => {
    expect(weekdayNames(1, "en", "short")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(weekdayNames(0, "en", "short")[0]).toBe("Sun");
    expect(weekdayNames(6, "en", "short").slice(0, 2)).toEqual(["Sat", "Sun"]);
    expect(weekdayName(3, "en", "long")).toBe("Wednesday");
  });

  it("lists all seven weekdays for a menu, starting Monday", () => {
    expect(WEEK_STARTS).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("reads saved week starts, including the old words", () => {
    expect(parseWeekStart("sunday")).toBe(0);
    expect(parseWeekStart("monday")).toBe(1);
    expect(parseWeekStart("6")).toBe(6);
    expect(parseWeekStart("9")).toBe(1);
    expect(parseWeekStart(null)).toBe(1);
    expect(parseWeekStart("soon")).toBe(1);
  });
});
