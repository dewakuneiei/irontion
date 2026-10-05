import { describe, expect, it } from "vitest";
import { currentStreak, suggestActivities } from "./stats";

const day = (date: string, blocks = 6) => ({ date, blocks });

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak([day("2026-10-03"), day("2026-10-04"), day("2026-10-05")], "2026-10-05")).toBe(3);
  });

  it("still counts up to yesterday when today is empty", () => {
    expect(currentStreak([day("2026-10-03"), day("2026-10-04")], "2026-10-05")).toBe(2);
  });

  it("stops at a gap and crosses month boundaries", () => {
    expect(currentStreak([day("2026-09-28"), day("2026-09-30"), day("2026-10-01")], "2026-10-01")).toBe(2);
  });

  it("is zero without recent days", () => {
    expect(currentStreak([day("2026-09-01")], "2026-10-05")).toBe(0);
  });
});

describe("suggestActivities", () => {
  it("puts the most used first and keeps tree order for ties", () => {
    const usage = new Map([[3, 10], [1, 2], [7, 2]]);
    expect(suggestActivities(usage, [1, 2, 3, 7], 3)).toEqual([3, 1, 7]);
  });

  it("fills up with unused candidates and never invents ids", () => {
    expect(suggestActivities(new Map([[99, 50]]), [4, 5], 5)).toEqual([4, 5]);
  });
});
