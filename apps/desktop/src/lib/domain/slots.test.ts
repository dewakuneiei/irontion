import { describe, expect, it } from "vitest";
import {
  assign,
  clampOffset,
  diff,
  emptyDay,
  moveSelection,
  range,
  summarizeSelection,
  addRange,
  toggleSlot,
} from "./slots";

const A = 1;
const B = 2;
const day = (cells: Record<number, number>) => emptyDay().map((_, i) => cells[i] ?? null);

describe("ranges", () => {
  it("builds ranges in either direction", () => {
    expect(range(2, 5)).toEqual([2, 3, 4, 5]);
    expect(range(5, 2)).toEqual([2, 3, 4, 5]);
    expect(range(7, 7)).toEqual([7]);
  });
});

describe("building up a selection", () => {
  const slots = day({ 10: A, 11: A, 12: A, 20: B });

  it("clicking a filled cell selects only that cell, never its neighbours of the same activity", () => {
    const first = toggleSlot(new Set(), 11);
    expect([...first]).toEqual([11]);
    const second = toggleSlot(first, 20);
    expect([...second].sort((a, b) => a - b)).toEqual([11, 20]);
    expect(toggleSlot(second, 40).size).toBe(3);
  });

  it("clicking a selected cell takes just that cell out", () => {
    const next = toggleSlot(new Set([10, 11, 12, 20]), 11);
    expect([...next].sort((a, b) => a - b)).toEqual([10, 12, 20]);
  });

  it("dragging a range adds to the selection instead of replacing it", () => {
    const next = addRange(new Set([1, 2]), 6, 4);
    expect([...next].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6]);
  });

  it("does not change the selection it was given", () => {
    const selection = new Set([1]);
    toggleSlot(selection, 10);
    addRange(selection, 5, 6);
    expect([...selection]).toEqual([1]);
  });
});

describe("allocating", () => {
  it("fills or clears every selected cell", () => {
    const filled = assign(emptyDay(), [3, 4, 9], A);
    expect([3, 4, 9].map((s) => filled[s])).toEqual([A, A, A]);
    expect(filled[5]).toBeNull();
    expect(assign(filled, [4], null)[4]).toBeNull();
  });

  it("diff lists only changed cells", () => {
    const before = assign(emptyDay(), [0, 1, 2], A);
    const after = assign(before, [2, 3], B);
    expect(diff(before, after)).toEqual([
      { slot: 2, activityId: B },
      { slot: 3, activityId: B },
    ]);
  });
});

describe("moving", () => {
  it("shifts the selection and moves only filled cells, overwriting the destination", () => {
    const slots = day({ 0: A, 1: A, 3: B });
    const moved = moveSelection(slots, new Set([0, 1, 2]), 3);
    expect(moved.slots.slice(0, 7)).toEqual([null, null, null, A, A, null, null]);
    expect([...moved.selection]).toEqual([3, 4, 5]);
    expect(moved.offset).toBe(3);
  });

  it("clamps so the whole selection stays inside the day", () => {
    const selection = new Set([140, 141]);
    expect(clampOffset(selection, 50)).toBe(2);
    expect(clampOffset(selection, -500)).toBe(-140);
    expect(clampOffset(new Set(), 5)).toBe(0);
    const moved = moveSelection(day({ 140: A, 141: A }), selection, 50);
    expect(moved.slots.slice(-2)).toEqual([A, A]);
  });

  it("leaves empty selected cells alone", () => {
    const slots = day({ 20: B });
    const moved = moveSelection(slots, new Set([10, 11]), 5);
    expect(moved.slots[20]).toBe(B);
  });
});

describe("summarizeSelection", () => {
  it("reports blocks, time, share of the day and the activities inside", () => {
    const slots = day({ 126: A, 127: A, 128: B });
    const summary = summarizeSelection(slots, new Set([126, 127, 128, 129]));
    expect(summary).toMatchObject({ blocks: 4, minutes: 40, filled: 3 });
    expect(summary.share).toBeCloseTo(4 / 144);
    expect(summary.byActivity).toEqual([
      [A, 2],
      [B, 1],
    ]);
    expect(summary.span).toEqual({ first: 126, last: 129 });
  });

  it("has no span when the selection has gaps", () => {
    expect(summarizeSelection(emptyDay(), new Set([1, 3])).span).toBeNull();
  });
});
