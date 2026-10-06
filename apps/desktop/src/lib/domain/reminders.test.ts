import { describe, expect, it } from "vitest";
import type { Note } from "$lib/api/types";
import { fromLocal, localParts, presetTime, reminderState, splitReminders, toUtc } from "./reminders";

const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, m - 1, d, h, mi, s);
const note = (id: number, remindAt: string | null): Note => ({
  id,
  text: `n${id}`,
  date: "2026-10-06",
  color: "yellow",
  pinned: false,
  tagIds: [],
  remindAt,
  remindedAt: null,
  createdAt: "2026-10-06T00:00:00.000Z",
  updatedAt: "2026-10-06T00:00:00.000Z",
});

describe("quick reminder times", () => {
  it("in an hour: one hour on, with the seconds dropped", () => {
    expect(presetTime("inOneHour", at(2026, 10, 6, 14, 20, 45))).toEqual(at(2026, 10, 6, 15, 20));
    expect(presetTime("inOneHour", at(2026, 10, 6, 23, 30))).toEqual(at(2026, 10, 7, 0, 30));
  });

  it("tomorrow: 09:00 the next day, across month ends", () => {
    expect(presetTime("tomorrow", at(2026, 10, 6, 22, 0))).toEqual(at(2026, 10, 7, 9, 0));
    expect(presetTime("tomorrow", at(2026, 10, 31, 8, 0))).toEqual(at(2026, 11, 1, 9, 0));
  });

  it("next week: the coming Monday at 09:00, and a full week when today is Monday", () => {
    // 2026-10-06 is a Tuesday; the next Monday is 2026-10-12.
    expect(presetTime("nextWeek", at(2026, 10, 6, 10, 0))).toEqual(at(2026, 10, 12, 9, 0));
    expect(presetTime("nextWeek", at(2026, 10, 12, 10, 0))).toEqual(at(2026, 10, 19, 9, 0));
    expect(presetTime("nextWeek", at(2026, 10, 11, 10, 0))).toEqual(at(2026, 10, 12, 9, 0)); // Sunday
  });
});

describe("local time and UTC", () => {
  it("round-trips the local day and clock the user picked", () => {
    const picked = fromLocal("2026-10-06", "08:30")!;
    expect(picked).toEqual(at(2026, 10, 6, 8, 30));
    expect(localParts(toUtc(picked))).toEqual({ date: "2026-10-06", time: "08:30" });
    expect(toUtc(picked)).toMatch(/^2026-10-0[56]T\d{2}:\d{2}:00\.000Z$/);
  });

  it("refuses a clock that is not a time", () => {
    for (const bad of ["", "8:30", "24:00", "12:60", "ab:cd", "12:30:00"]) expect(fromLocal("2026-10-06", bad)).toBeNull();
    expect(fromLocal("tomorrow", "08:30")).toBeNull();
    expect(fromLocal("2026-10-06", "23:59")).not.toBeNull();
  });
});

describe("what a reminder is now", () => {
  const now = at(2026, 10, 6, 12, 0);
  it("none, upcoming or past", () => {
    expect(reminderState(note(1, null), now)).toBe("none");
    expect(reminderState(note(2, toUtc(at(2026, 10, 6, 13, 0))), now)).toBe("upcoming");
    expect(reminderState(note(3, toUtc(at(2026, 10, 6, 12, 0))), now)).toBe("past");
    expect(reminderState(note(4, toUtc(at(2026, 10, 5, 8, 0))), now)).toBe("past");
  });

  it("splits notes: upcoming soonest first, past latest first, no reminder left out", () => {
    const list = [
      note(1, toUtc(at(2026, 10, 9, 8))),
      note(2, null),
      note(3, toUtc(at(2026, 10, 7, 8))),
      note(4, toUtc(at(2026, 10, 5, 8))),
      note(5, toUtc(at(2026, 10, 6, 9))),
    ];
    const { upcoming, past } = splitReminders(list, now);
    expect(upcoming.map((n) => n.id)).toEqual([3, 1]);
    expect(past.map((n) => n.id)).toEqual([5, 4]);
  });
});
