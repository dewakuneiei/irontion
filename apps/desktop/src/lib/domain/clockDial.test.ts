import { describe, expect, it } from "vitest";
import {
  angleFromPoint,
  dialMarks,
  dialValue,
  from12,
  handOf,
  hourFromDial,
  joinClock,
  parseClock,
  stepValue,
  to12,
  valueAtPoint,
} from "./clockDial";

const R = 128;

/** A point at `angle` degrees clockwise from the top and `radius` from the center. */
const at = (angle: number, radius: number): [number, number] => [
  radius * Math.sin((angle * Math.PI) / 180),
  -radius * Math.cos((angle * Math.PI) / 180),
];

describe("clock values", () => {
  it("reads and writes HH:MM and refuses anything else", () => {
    expect(parseClock("09:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("9:05")).toBeNull();
    expect(parseClock("12:60")).toBeNull();
    expect(joinClock(9, 5)).toBe("09:05");
  });

  it("moves between the 24-hour and the 12-hour clock", () => {
    expect(to12(0)).toEqual({ hour12: 12, pm: false });
    expect(to12(12)).toEqual({ hour12: 12, pm: true });
    expect(to12(15)).toEqual({ hour12: 3, pm: true });
    expect(from12(12, false)).toBe(0);
    expect(from12(12, true)).toBe(12);
    expect(from12(3, true)).toBe(15);
    for (let h = 0; h < 24; h++) expect(from12(to12(h).hour12, to12(h).pm)).toBe(h);
  });
});

describe("the dial's numbers", () => {
  it("12-hour: 12 at the top, then 1 to 11 clockwise", () => {
    const marks = dialMarks("hour", "12h");
    expect(marks.map((m) => m.label)).toEqual(["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
    expect(marks[3]).toMatchObject({ value: 3, angle: 90 });
  });

  it("24-hour: an outer ring of 1-12 and an inner ring of 00 and 13-23", () => {
    const marks = dialMarks("hour", "24h");
    expect(marks).toHaveLength(24);
    expect(marks.filter((m) => !m.inner).map((m) => m.value)).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(marks.filter((m) => m.inner).map((m) => m.label)).toEqual(["00", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"]);
  });

  it("minutes: every five, 00 at the top", () => {
    expect(dialMarks("minute", "24h").map((m) => m.label)).toEqual(["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
  });
});

describe("what a pointer chose", () => {
  it("measures the angle clockwise from the top", () => {
    expect(angleFromPoint(0, -10)).toBeCloseTo(0);
    expect(angleFromPoint(10, 0)).toBeCloseTo(90);
    expect(angleFromPoint(0, 10)).toBeCloseTo(180);
    expect(angleFromPoint(-10, 0)).toBeCloseTo(270);
  });

  it("picks the nearest hour on a 12-hour dial", () => {
    expect(valueAtPoint("hour", "12h", 0, -100, R)).toBe(12);
    expect(valueAtPoint("hour", "12h", 100, 0, R)).toBe(3);
    expect(valueAtPoint("hour", "12h", 0, 100, R)).toBe(6);
    expect(valueAtPoint("hour", "12h", -100, 0, R)).toBe(9);
    // 7 o'clock is 210 degrees; 14 degrees either side still rounds to it.
    expect(valueAtPoint("hour", "12h", ...at(196, 100), R)).toBe(7);
    expect(valueAtPoint("hour", "12h", ...at(224, 100), R)).toBe(7);
    expect(valueAtPoint("hour", "12h", ...at(226, 100), R)).toBe(8);
  });

  it("picks the ring by distance on a 24-hour dial", () => {
    expect(valueAtPoint("hour", "24h", 0, -104, R)).toBe(12);
    expect(valueAtPoint("hour", "24h", 0, -68, R)).toBe(0);
    expect(valueAtPoint("hour", "24h", 104, 0, R)).toBe(3);
    expect(valueAtPoint("hour", "24h", 68, 0, R)).toBe(15);
    expect(valueAtPoint("hour", "24h", -68, 0, R)).toBe(21);
  });

  it("picks the nearest minute", () => {
    expect(valueAtPoint("minute", "24h", 0, -100, R)).toBe(0);
    expect(valueAtPoint("minute", "24h", 100, 0, R)).toBe(15);
    expect(valueAtPoint("minute", "24h", 0, 100, R)).toBe(30);
    expect(valueAtPoint("minute", "24h", -100, 0, R)).toBe(45);
    // A minute is 6 degrees: 8 degrees left of the top is 59, 2 degrees left is still 0.
    expect(valueAtPoint("minute", "24h", ...at(-8, 100), R)).toBe(59);
    expect(valueAtPoint("minute", "24h", ...at(-2, 100), R)).toBe(0);
  });
});

describe("the hand and the time", () => {
  it("shows the hour of a time in the dial's terms", () => {
    expect(dialValue("hour", "12h", 15, 20)).toBe(3);
    expect(dialValue("hour", "12h", 0, 20)).toBe(12);
    expect(dialValue("hour", "24h", 15, 20)).toBe(15);
    expect(dialValue("minute", "12h", 15, 20)).toBe(20);
  });

  it("keeps morning or afternoon when the hour changes on a 12-hour dial", () => {
    expect(hourFromDial("12h", 7, 9)).toBe(7);
    expect(hourFromDial("12h", 7, 21)).toBe(19);
    expect(hourFromDial("12h", 12, 9)).toBe(0);
    expect(hourFromDial("12h", 12, 15)).toBe(12);
    expect(hourFromDial("24h", 18, 9)).toBe(18);
  });

  it("points the hand, shorter for the inner ring", () => {
    expect(handOf("hour", "12h", 7)).toEqual({ angle: 210, inner: false });
    expect(handOf("hour", "12h", 12)).toEqual({ angle: 0, inner: false });
    expect(handOf("hour", "24h", 15)).toEqual({ angle: 90, inner: true });
    expect(handOf("hour", "24h", 0)).toEqual({ angle: 0, inner: true });
    expect(handOf("hour", "24h", 12)).toEqual({ angle: 0, inner: false });
    expect(handOf("minute", "24h", 7)).toEqual({ angle: 42, inner: false });
  });

  it("steps with the arrow keys and wraps around", () => {
    expect(stepValue("minute", "24h", 59, 1)).toBe(0);
    expect(stepValue("minute", "24h", 0, -1)).toBe(59);
    expect(stepValue("hour", "12h", 12, 1)).toBe(1);
    expect(stepValue("hour", "12h", 1, -1)).toBe(12);
    expect(stepValue("hour", "24h", 23, 1)).toBe(0);
    expect(stepValue("hour", "24h", 0, -1)).toBe(23);
  });
});
