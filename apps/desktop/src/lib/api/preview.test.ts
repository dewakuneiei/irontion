import { describe, expect, it } from "vitest";
import { BackendError } from "./backend";
import { PreviewBackend } from "./preview";

/** Two activities, blocks on three days (3 + 2 + 4), like the core's `data` tests. */
async function sample() {
  const b = new PreviewBackend();
  const study = (await b.createActivity({ parentId: null, name: "Study", color: "#2a78d6", tagIds: [] })).id;
  const rest = (await b.createActivity({ parentId: null, name: "Rest", color: "#eda100", tagIds: [] })).id;
  const fill = (date: string, id: number, cells: number) =>
    b.applyDayChanges(date, Array.from({ length: cells }, (_, slot) => ({ slot, activityId: id })));
  await fill("2026-10-03", study, 3);
  await fill("2026-10-04", rest, 2);
  await fill("2026-10-05", study, 4);
  return b;
}

const range = (from: string, to: string) => ({ kind: "blocksInRange" as const, from, to });
const total = async (b: PreviewBackend) => (await b.countData({ kind: "allBlocks" })).blocks;

describe("preview backend: delete data", () => {
  it("counts without changing anything", async () => {
    const b = await sample();
    expect(await b.countData({ kind: "allActivities" })).toEqual({ blocks: 9, activities: 2 });
    expect(await b.countData({ kind: "allBlocks" })).toEqual({ blocks: 9, activities: 0 });
    expect(await total(b)).toBe(9);
  });

  it("deletes all blocks and keeps the activities", async () => {
    const b = await sample();
    expect(await b.deleteData({ kind: "allBlocks" })).toEqual({ blocks: 9, activities: 0 });
    expect(await total(b)).toBe(0);
    expect(await b.listActivities()).toHaveLength(2);
  });

  it("deletes one day, or a range with both ends included", async () => {
    const b = await sample();
    expect((await b.deleteData(range("2026-10-04", "2026-10-04"))).blocks).toBe(2);
    expect(await total(b)).toBe(7);
    expect((await b.deleteData(range("2026-10-03", "2026-10-04"))).blocks).toBe(3);
    expect((await b.getDay("2026-10-05")).filter((s) => s !== null)).toHaveLength(4);
  });

  it("deletes all activities with their blocks", async () => {
    const b = await sample();
    expect(await b.deleteData({ kind: "allActivities" })).toEqual({ blocks: 9, activities: 2 });
    expect(await b.listActivities()).toEqual([]);
    expect(await total(b)).toBe(0);
  });

  it("refuses a backwards or malformed range and deletes nothing", async () => {
    const b = await sample();
    for (const scope of [range("2026-10-05", "2026-10-03"), range("nope", "2026-10-03"), range("2026-10-03", "2026-13-01")]) {
      await expect(b.deleteData(scope)).rejects.toMatchObject({ kind: "invalidDate" });
      await expect(b.countData(scope)).rejects.toBeInstanceOf(BackendError);
    }
    expect(await total(b)).toBe(9);
  });
});
