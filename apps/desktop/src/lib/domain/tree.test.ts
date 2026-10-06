import { describe, expect, it } from "vitest";
import type { Activity } from "$lib/api/types";
import { buildTree, effectiveColor, effectiveTagIds, flatten, indexById, isAssignable, rollUp } from "./tree";

const activity = (id: number, parentId: number | null, extra: Partial<Activity> = {}): Activity => ({
  id,
  parentId,
  name: `a${id}`,
  color: null,
  position: id,
  archived: false,
  tagIds: [],
  ...extra,
});

// 1 Study (blue, #deep) > 2 Math > 4 Algebra ; 1 > 3 Notes (archived) ; 5 Rest
const activities = [
  activity(1, null, { color: "#2a78d6", tagIds: [10] }),
  activity(2, 1, { tagIds: [11] }),
  activity(3, 1, { archived: true }),
  activity(4, 2, { color: "#eb6834" }),
  activity(5, null, { color: "#1baf7a" }),
];
const byId = indexById(activities);

describe("tree", () => {
  it("builds the tree without archived activities by default", () => {
    const tree = buildTree(activities);
    expect(flatten(tree).map((n) => [n.activity.id, n.depth])).toEqual([
      [1, 1],
      [2, 2],
      [4, 3],
      [5, 1],
    ]);
    expect(flatten(buildTree(activities, true)).map((n) => n.activity.id)).toContain(3);
  });

  it("skips children of collapsed nodes", () => {
    expect(flatten(buildTree(activities), new Set([1])).map((n) => n.activity.id)).toEqual([1, 5]);
  });

  it("inherits the color from an ancestor", () => {
    expect(effectiveColor(2, byId)).toBe("#2a78d6");
    expect(effectiveColor(4, byId)).toBe("#eb6834");
  });

  it("counts as its own tags, else the nearest ancestor's, never both", () => {
    expect([...effectiveTagIds(1, byId)]).toEqual([10]);
    expect([...effectiveTagIds(2, byId)]).toEqual([11]); // own tag B, not the parent's A
    expect([...effectiveTagIds(4, byId)]).toEqual([11]); // none of its own: the nearest ancestor's
    expect([...effectiveTagIds(3, byId)]).toEqual([10]);
    expect([...effectiveTagIds(5, byId)]).toEqual([]);
  });

  it("any active activity is assignable, a parent included; archived ones are not", () => {
    expect(isAssignable(1, activities)).toBe(true);
    expect(isAssignable(4, activities)).toBe(true);
    expect(isAssignable(3, activities)).toBe(false);
  });

  it("rolls totals up to every ancestor", () => {
    const totals = rollUp(buildTree(activities, true), new Map([[4, 3], [3, 2], [1, 1], [5, 4]]));
    expect(totals.get(2)).toBe(3);
    expect(totals.get(1)).toBe(6);
    expect(totals.get(5)).toBe(4);
  });
});
