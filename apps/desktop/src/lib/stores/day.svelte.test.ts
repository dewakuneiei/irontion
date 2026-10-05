import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayChange, DaySlots } from "$lib/api/types";
import { assign, emptyDay } from "$lib/domain/slots";

// A backend whose answers the test releases by hand, in any order, like concurrent Tauri commands.
interface PendingSave {
  changes: DayChange[];
  release: () => void;
  fail: () => void;
}
let database: DaySlots;
let pending: PendingSave[];

const backend = {
  getDay: async () => [...database],
  applyDayChanges: (_date: string, changes: DayChange[]) =>
    new Promise<DaySlots>((resolve, reject) => {
      pending.push({
        changes,
        release: () => {
          for (const c of changes) database[c.slot] = c.activityId;
          resolve([...database]);
        },
        fail: () => reject(new Error("disk full")),
      });
    }),
};

vi.mock("$lib/api/backend", () => ({ getBackend: async () => backend, errorKind: () => "database" }));
vi.mock("./notices.svelte", () => ({ notices: { error: vi.fn() } }));

const { day } = await import("./day.svelte");
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Answer whatever the backend is holding, newest first, until nothing is left. */
async function answerNewestFirst() {
  for (let guard = 0; guard < 10; guard++) {
    await tick();
    const next = pending.pop();
    if (!next) return;
    next.release();
  }
}

beforeEach(async () => {
  database = emptyDay();
  pending = [];
  await day.open("2026-10-06");
});

describe("day store", () => {
  it("shows an edit right away", async () => {
    const saving = day.apply(assign(day.slots, [0, 1], 7));
    expect(day.slots[0]).toBe(7);
    await answerNewestFirst();
    await saving;
  });

  it("allocate then deallocate quickly: the blocks end up empty, on screen and saved", async () => {
    const allocating = day.apply(assign(day.slots, [0, 1], 7));
    const deallocating = day.apply(assign(day.slots, [0, 1], null));
    await answerNewestFirst();
    await Promise.all([allocating, deallocating]);

    expect(database[0]).toBeNull();
    expect(day.slots[0]).toBeNull();
  });

  it("an older answer never overwrites a newer edit on screen", async () => {
    const first = day.apply(assign(day.slots, [5], 7));
    const second = day.apply(assign(day.slots, [6], 8));
    await tick();
    pending.shift()?.release(); // only the first save has answered so far
    await tick();
    expect(day.slots[6]).toBe(8);
    await answerNewestFirst();
    await Promise.all([first, second]);
    expect(day.slots.slice(5, 7)).toEqual([7, 8]);
  });

  it("a failed save shows what the database really has", async () => {
    const saving = day.apply(assign(day.slots, [3], 7));
    await tick();
    pending.pop()?.fail();
    await saving;
    await tick();
    expect(day.slots[3]).toBeNull();
  });
});
