import { describe, expect, it } from "vitest";
import { dayProgress } from "./time";

const at = (h: number, m: number, s = 0) => new Date(2026, 9, 6, h, m, s);

describe("dayProgress", () => {
  it("fills the current block as its ten minutes pass: 4:05 is half", () => {
    expect(dayProgress("2026-10-06", at(4, 5))).toEqual({ elapsed: 24, progress: 0.5, isToday: true });
    expect(dayProgress("2026-10-06", at(4, 0))).toMatchObject({ elapsed: 24, progress: 0 });
    expect(dayProgress("2026-10-06", at(4, 7, 30)).progress).toBeCloseTo(0.75);
  });

  it("is full by the time the next block starts", () => {
    expect(dayProgress("2026-10-06", at(4, 10))).toMatchObject({ elapsed: 25, progress: 0 });
    expect(dayProgress("2026-10-06", at(4, 9, 59)).progress).toBeCloseTo(599 / 600);
  });

  it("covers midnight and the last block of the day", () => {
    expect(dayProgress("2026-10-06", at(0, 0))).toMatchObject({ elapsed: 0, progress: 0 });
    expect(dayProgress("2026-10-06", at(23, 55))).toMatchObject({ elapsed: 143, progress: 0.5 });
  });

  it("a past day is all filled and a future day all hollow", () => {
    expect(dayProgress("2026-10-05", at(4, 5))).toEqual({ elapsed: 144, progress: 0, isToday: false });
    expect(dayProgress("2026-10-07", at(4, 5))).toEqual({ elapsed: 0, progress: 0, isToday: false });
  });
});
