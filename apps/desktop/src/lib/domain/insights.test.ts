import { describe, expect, it } from "vitest";
import type { DaySlots } from "$lib/api/types";
import {
  buildDailyStack,
  buildPartsOfDay,
  buildShare,
  bySize,
  hasHappened,
  partOfSlot,
  type ActivityRules,
  type Clock,
  type LoadedDay,
} from "./insights";

const day = (date: string, fill: Record<number, number> = {}): LoadedDay => {
  const slots: DaySlots = Array.from({ length: 144 }, () => null);
  for (const [slot, id] of Object.entries(fill)) slots[Number(slot)] = id;
  return { date, slots };
};
/** `n` slots from `from` all with activity `id`. */
const run = (from: number, n: number, id: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [from + i, id]));

// Activities 1 and 2 are top-level; 11 is a sub-activity of 1; 3 is top-level.
const TOP: Record<number, number> = { 1: 1, 2: 2, 3: 3, 11: 1 };
const all: ActivityRules = { topOf: (id) => TOP[id], included: () => true };
/// Late in the evening of 7 Oct, so "today" is almost all behind us.
const clock = (nowSlot: number): Clock => ({ today: "2026-10-07", nowSlot });

describe("hasHappened", () => {
  it("is true for earlier days, and up to the current slot today", () => {
    expect(hasHappened("2026-10-06", 143, clock(0))).toBe(true);
    expect(hasHappened("2026-10-07", 36, clock(36))).toBe(true);
    expect(hasHappened("2026-10-07", 37, clock(36))).toBe(false);
  });
});

describe("buildShare", () => {
  it("an empty past range is one full unallocated ring with nothing tracked", () => {
    const share = buildShare([day("2026-10-05"), day("2026-10-06")], all, clock(0));
    expect(share.total).toBe(288);
    expect(share.slices).toEqual([{ kind: "unallocated", activityId: null, blocks: 288 }]);
    expect(share.tracked).toBe(0);
    expect(share.trackedShare).toBe(0);
  });

  it("rolls sub-activities up to their top-level activity, biggest first", () => {
    const share = buildShare([day("2026-10-06", { ...run(0, 6, 1), ...run(6, 3, 11), ...run(20, 12, 2) })], all, clock(0));
    expect(share.slices).toEqual([
      { kind: "activity", activityId: 2, blocks: 12 },
      { kind: "activity", activityId: 1, blocks: 9 },
      { kind: "unallocated", activityId: null, blocks: 144 - 21 },
    ]);
    expect(share.tracked).toBe(21);
    expect(share.trackedShare).toBeCloseTo(21 / 144);
  });

  it("today: blocks that have not happened yet are 'ahead', not unallocated", () => {
    // 09:00 is slot 54, and the user tracked 6 blocks (one hour) before it.
    const share = buildShare([day("2026-10-07", run(30, 6, 1))], all, clock(54));
    const blocks = Object.fromEntries(share.slices.map((s) => [s.kind, s.blocks]));
    expect(blocks).toEqual({ activity: 6, unallocated: 55 - 6, ahead: 144 - 55 });
    expect(share.past).toBe(55);
    expect(share.trackedShare).toBeCloseTo(6 / 55);
    expect(share.slices.reduce((sum, s) => sum + s.blocks, 0)).toBe(share.total);
  });

  it("a block planned for later today is the activity's slice, not ahead", () => {
    const share = buildShare([day("2026-10-07", run(100, 4, 2))], all, clock(54));
    expect(share.slices.find((s) => s.kind === "ahead")!.blocks).toBe(144 - 55 - 4);
    expect(share.tracked, "it has not happened, so it is not tracked yet").toBe(0);
  });

  it("a three-day range ending today adds up to 3 x 144", () => {
    const days = [day("2026-10-05", run(0, 10, 1)), day("2026-10-06", run(0, 5, 2)), day("2026-10-07", run(0, 20, 3))];
    const share = buildShare(days, all, clock(71));
    expect(share.total).toBe(432);
    expect(share.slices.reduce((sum, s) => sum + s.blocks, 0)).toBe(432);
    expect(share.past).toBe(288 + 72);
    expect(share.tracked).toBe(35);
    expect(share.slices.find((s) => s.kind === "ahead")!.blocks).toBe(144 - 72);
  });

  it("blocks the tag filter leaves out become 'other' and do not count as tracked", () => {
    const onlyOne: ActivityRules = { ...all, included: (id) => id === 1 };
    const share = buildShare([day("2026-10-06", { ...run(0, 6, 1), ...run(10, 4, 2) })], onlyOne, clock(0));
    expect(share.slices.map((s) => [s.kind, s.blocks])).toEqual([
      ["activity", 6],
      ["other", 4],
      ["unallocated", 134],
    ]);
    expect(share.tracked).toBe(6);
  });

  it("no days at all is an empty share", () => {
    expect(buildShare([], all, clock(0))).toEqual({ slices: [], total: 0, tracked: 0, past: 0, trackedShare: 0 });
  });
});

describe("bySize", () => {
  it("sorts every slice by size, whatever it is", () => {
    const share = buildShare([day("2026-10-06", run(0, 6, 1))], all, clock(0));
    expect(bySize(share.slices).map((s) => s.kind)).toEqual(["unallocated", "activity"]);
  });
});

describe("buildDailyStack", () => {
  it("stacks blocks per day by top-level activity, and groups the smallest as other", () => {
    const days = [
      day("2026-10-05", { ...run(0, 5, 1), ...run(10, 3, 2), ...run(20, 1, 3) }),
      day("2026-10-06", { ...run(0, 2, 11), ...run(10, 1, 3) }),
    ];
    const stack = buildDailyStack(days, all, 2);
    expect(stack.dates).toEqual(["2026-10-05", "2026-10-06"]);
    expect(stack.series).toEqual([
      { activityId: 1, blocks: [5, 2] },
      { activityId: 2, blocks: [3, 0] },
      { activityId: null, blocks: [1, 1] },
    ]);
  });

  it("has no 'other' series when everything fits, and skips filtered-out activities", () => {
    const stack = buildDailyStack([day("2026-10-05", { ...run(0, 2, 1), ...run(5, 2, 2) })], { ...all, included: (id) => id === 1 });
    expect(stack.series).toEqual([{ activityId: 1, blocks: [2] }]);
    expect(buildDailyStack([], all).series).toEqual([]);
  });
});

describe("parts of the day", () => {
  it("splits the day in four six-hour parts", () => {
    expect([0, 35, 36, 71, 72, 107, 108, 143].map(partOfSlot)).toEqual([
      "night", "night", "morning", "morning", "afternoon", "afternoon", "evening", "evening",
    ]);
  });

  it("counts tracked blocks in each part across days, honoring the filter", () => {
    const days = [day("2026-10-05", { ...run(30, 12, 1), 100: 2 }), day("2026-10-06", { 140: 1 })];
    expect(buildPartsOfDay(days, all)).toEqual({ night: 6, morning: 6, afternoon: 1, evening: 1 });
    expect(buildPartsOfDay(days, { ...all, included: (id) => id === 2 })).toEqual({ night: 0, morning: 0, afternoon: 1, evening: 0 });
  });
});
