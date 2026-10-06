import { describe, expect, it } from "vitest";
import { createSaveQueue } from "./saveQueue";

const later = <T>(value: T, ms = 5) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("save queue", () => {
  it("runs saves one at a time, in order, so an older one never lands after a newer one", async () => {
    const queue = createSaveQueue();
    const landed: string[] = [];
    const first = queue.run(async () => landed.push(await later("first", 20)));
    await later(null, 1); // the first save has started
    const second = queue.run(async () => landed.push(await later("second", 1)));
    await Promise.all([first, second]);
    expect(landed).toEqual(["first", "second"]);
  });

  it("skips a waiting save when a newer one arrives", async () => {
    const queue = createSaveQueue();
    const ran: number[] = [];
    const first = queue.run(() => later(ran.push(1), 10));
    await later(null, 1); // the first save has started, so it is not skipped
    const skipped = queue.run(async () => ran.push(2));
    const newest = queue.run(async () => ran.push(3));
    expect(await skipped).toBeUndefined();
    await Promise.all([first, newest]);
    expect(ran).toEqual([1, 3]);
  });

  it("keeps going after a failure, which only its own caller sees", async () => {
    const queue = createSaveQueue();
    const failing = queue.run(() => Promise.reject(new Error("disk full")));
    await expect(failing).rejects.toThrow("disk full");
    expect(await queue.run(async () => "ok")).toBe("ok");
    await expect(queue.idle()).resolves.toBeUndefined();
  });
});
