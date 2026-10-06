import { describe, expect, it } from "vitest";
import { countsByDate, NO_NOTES, relativeDay, stepMonth, visibleRange } from "./calendar";
import { monthGrid } from "./datetime";

describe("visibleRange", () => {
  it("spans the 42 days of the grid, with the neighbouring months' days", () => {
    // October 2026 starts on a Thursday; weeks start on Monday.
    expect(visibleRange(monthGrid(2026, 9, 1))).toEqual({ from: "2026-09-28", to: "2026-11-08" });
    // Weeks starting on Sunday move the first day.
    expect(visibleRange(monthGrid(2026, 9, 0))).toEqual({ from: "2026-09-27", to: "2026-11-07" });
  });

  it("crosses the end of the year", () => {
    expect(visibleRange(monthGrid(2026, 11, 1))).toEqual({ from: "2026-11-30", to: "2027-01-10" });
  });
});

describe("countsByDate", () => {
  it("finds a day's count in one lookup", () => {
    const map = countsByDate([
      { date: "2026-10-06", notes: 2 },
      { date: "2026-10-30", notes: 1 },
    ]);
    expect(map.get("2026-10-30")).toEqual({ date: "2026-10-30", notes: 1 });
    expect(map.get("2026-10-07")).toBeUndefined();
    expect(NO_NOTES).toMatchObject({ notes: 0 });
  });
});

describe("stepMonth", () => {
  it("moves by whole months and years, always to the first day", () => {
    expect(stepMonth(new Date(2026, 9, 1), 1)).toEqual(new Date(2026, 10, 1));
    expect(stepMonth(new Date(2026, 11, 1), 1)).toEqual(new Date(2027, 0, 1));
    expect(stepMonth(new Date(2026, 0, 1), -1)).toEqual(new Date(2025, 11, 1));
  });
});

describe("relativeDay", () => {
  it("names today, tomorrow and yesterday, across month ends", () => {
    expect(relativeDay("2026-10-31", "2026-10-31")).toBe("today");
    expect(relativeDay("2026-11-01", "2026-10-31")).toBe("tomorrow");
    expect(relativeDay("2026-10-30", "2026-10-31")).toBe("yesterday");
    expect(relativeDay("2026-11-02", "2026-10-31")).toBeNull();
  });
});
