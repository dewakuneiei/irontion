import { describe, expect, it } from "vitest";
import { BackendError } from "./backend";
import { PreviewBackend } from "./preview";
import type { NoteColor } from "./types";

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
    expect(await b.countData({ kind: "allActivities" })).toEqual({ blocks: 9, activities: 2, notes: 0 });
    expect(await b.countData({ kind: "allBlocks" })).toEqual({ blocks: 9, activities: 0, notes: 0 });
    expect(await total(b)).toBe(9);
  });

  it("deletes all blocks and keeps the activities", async () => {
    const b = await sample();
    expect(await b.deleteData({ kind: "allBlocks" })).toEqual({ blocks: 9, activities: 0, notes: 0 });
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
    expect(await b.deleteData({ kind: "allActivities" })).toEqual({ blocks: 9, activities: 2, notes: 0 });
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

const note = (text: string, date = "2026-10-06", tags: string[] = [], color: NoteColor = "yellow") => ({ text, date, color, tags });
const edit = (text: string, tags: string[] = [], color: NoteColor = "yellow") => ({ text, color, tags });
const texts = (notes: { text: string }[]) => notes.map((n) => n.text);
const all = { kind: "all" } as const;

async function kind(promise: Promise<unknown>) {
  return promise.then(
    () => "ok",
    (err) => (err instanceof BackendError ? err.kind : "other"),
  );
}

describe("preview backend: notes follow the core's rules", () => {
  it("creates a note on its day, trimming the text", async () => {
    const b = new PreviewBackend();
    const created = await b.createNote(note("  Hand in \n", "2026-10-30"));
    expect(created).toMatchObject({ text: "Hand in", date: "2026-10-30", tagIds: [] });
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it("checks text, length, date and tags in the core's order", async () => {
    const b = new PreviewBackend();
    expect(await kind(b.createNote(note("   ")))).toBe("noteEmpty");
    expect(await kind(b.createNote(note("#only-a-tag")))).toBe("noteEmpty");
    expect(await kind(b.createNote(note("a".repeat(201))))).toBe("noteTooLong");
    expect(await kind(b.createNote(note("a".repeat(200) + " #tag")))).toBe("ok");
    expect(await kind(b.createNote(note("ที่".repeat(200))))).toBe("ok");
    expect(await kind(b.createNote(note("ที่".repeat(201))))).toBe("noteTooLong");
    expect(await kind(b.createNote(note("x", "2026-13-01")))).toBe("invalidDate");
    expect(await kind(b.createNote(note("x", "")))).toBe("invalidDate");
    expect(await kind(b.createNote(note("x #a #b #c #d #e #f")))).toBe("noteTooManyTags");
    expect(await kind(b.createNote(note("x", "2026-10-06", ["two words"])))).toBe("invalidNoteTag");
    expect(await b.listTags()).toHaveLength(1);
  });

  it("lists in board order (newest first), whatever the day, and filters together", async () => {
    const b = new PreviewBackend();
    await b.createNote(note("Ran 5 km #health", "2026-10-05"));
    await b.createNote(note("Study #school", "2026-10-06"));
    await b.createNote(note("Thesis #school", "2026-10-30"));
    await b.createNote(note("Calm", "2026-10-06"));
    expect(texts(await b.listNotes(all))).toEqual(["Calm", "Thesis", "Study", "Ran 5 km"]);
    expect(texts(await b.listNotes({ kind: "date", date: "2026-10-06" }))).toEqual(["Calm", "Study"]);
    expect(texts(await b.listNotes({ kind: "range", from: "2026-10-05", to: "2026-10-06" }))).toHaveLength(3);
    const school = (await b.listTags()).find((t) => t.name === "school")!.id;
    expect(texts(await b.listNotes(all, { tagId: school, keyword: "THESIS" }))).toEqual(["Thesis"]);
    expect(await kind(b.listNotes({ kind: "range", from: "2026-10-06", to: "2026-10-05" }))).toBe("invalidDate");
  });

  it("counts notes per day", async () => {
    const b = new PreviewBackend();
    await b.createNote(note("a", "2026-10-06"));
    await b.createNote(note("b", "2026-10-30"));
    await b.createNote(note("c", "2026-10-30"));
    expect(await b.noteMonthCounts("2026-10-01", "2026-10-31")).toEqual([
      { date: "2026-10-06", notes: 1 },
      { date: "2026-10-30", notes: 2 },
    ]);
    expect(await kind(b.noteMonthCounts("2026-10-31", "2026-10-01"))).toBe("invalidDate");
  });

  it("edits never change the date; only move does", async () => {
    const b = new PreviewBackend();
    const created = await b.createNote(note("Old"));
    const edited = await b.updateNote(created.id, edit(" New #home "));
    expect(edited).toMatchObject({ id: created.id, text: "New", date: "2026-10-06" });
    const moved = await b.moveNote(created.id, "2026-10-30");
    expect(moved).toMatchObject({ date: "2026-10-30", createdAt: created.createdAt });
    expect(await kind(b.moveNote(created.id, ""))).toBe("invalidDate");
    expect(await kind(b.updateNote(created.id, edit("")))).toBe("noteEmpty");
    expect(await kind(b.updateNote(999, edit("x")))).toBe("notFound");
  });

  it("delete returns the note, and restore brings it back as it was", async () => {
    const b = new PreviewBackend();
    const created = await b.createNote(note("Hand in #school", "2026-10-30"));
    const deleted = await b.deleteNote(created.id);
    expect(deleted).toEqual(created);
    expect(await b.listNotes(all)).toEqual([]);
    expect(await b.restoreNote(deleted)).toEqual(created);
    expect(await kind(b.deleteNote(999))).toBe("notFound");
  });
});

describe("preview backend: note tags", () => {
  it("reuses existing tags ignoring case and creates new ones from #tags", async () => {
    const b = new PreviewBackend();
    const work = (await b.createTag({ name: "Work", color: null })).id;
    const created = await b.createNote(note("Plan #work #สำเร็จ", "2026-10-06", ["WORK"]));
    expect(created.text).toBe("Plan");
    const names = (await b.listTags()).map((t) => t.name);
    expect(names).toContain("สำเร็จ");
    expect(created.tagIds[0]).toBe(work);
    expect(created.tagIds).toHaveLength(2);
  });

  it("deleting a tag unlinks it from notes, and usage counts activities and notes", async () => {
    const b = new PreviewBackend();
    await b.createNote(note("x #work #home"));
    const [home, work] = await b.listTags();
    expect(await b.tagUsage()).toEqual([
      { tagId: home.id, activities: 0, notes: 1 },
      { tagId: work.id, activities: 0, notes: 1 },
    ]);
    await b.deleteTag(work.id);
    expect((await b.listNotes(all))[0].tagIds).toEqual([home.id]);
  });
});

describe("preview backend: delete data and notes", () => {
  it("All notes counts and removes every note, and keeps tags", async () => {
    const b = await sample();
    await b.createNote(note("x #kept"));
    await b.createNote(note("y", "2026-10-03"));
    expect(await b.countData({ kind: "allNotes" })).toEqual({ blocks: 0, activities: 0, notes: 2 });
    expect(await b.deleteData({ kind: "allNotes" })).toEqual({ blocks: 0, activities: 0, notes: 2 });
    expect(await b.listNotes(all)).toEqual([]);
    expect(await total(b)).toBe(9);
    expect(await b.listActivities()).toHaveLength(2);
    expect(await b.listTags()).toHaveLength(1);
  });

  it("deleting blocks or activities never deletes notes", async () => {
    const b = await sample();
    await b.createNote(note("x"));
    await b.createNote(note("y", "2026-10-03"));
    for (const scope of [range("2026-10-03", "2026-10-05"), { kind: "allBlocks" as const }, { kind: "allActivities" as const }]) {
      expect((await b.countData(scope)).notes).toBe(0);
      expect((await b.deleteData(scope)).notes).toBe(0);
      expect(await b.listNotes(all)).toHaveLength(2);
    }
  });
});

describe("preview backend: color, pin, order and reminders follow the core", () => {
  const order = async (b: PreviewBackend) => texts(await b.listNotes(all));

  it("a note has one of the palette colors, yellow by default", async () => {
    const b = new PreviewBackend();
    expect((await b.createNote(note("x"))).color).toBe("yellow");
    expect((await b.createNote(note("x", "2026-10-06", [], "teal"))).color).toBe("teal");
    expect(await kind(b.createNote(note("x", "2026-10-06", [], "neon" as NoteColor)))).toBe("invalidColor");
    const created = await b.createNote(note("y"));
    expect(await kind(b.updateNote(created.id, edit("y", [], "#FF0000" as NoteColor)))).toBe("invalidColor");
    expect((await b.updateNote(created.id, edit("y", [], "#12ab9f"))).color).toBe("#12ab9f");
    const blue = await b.updateNote(created.id, edit("y", [], "blue"));
    expect(blue.color).toBe("blue");
    expect(blue.updatedAt >= created.updatedAt).toBe(true);
  });

  it("pinned notes come first, and a pinned note goes to the top of the pins", async () => {
    const b = new PreviewBackend();
    const [a, bb] = [await b.createNote(note("a")), await b.createNote(note("b"))];
    await b.createNote(note("c"));
    expect(await order(b)).toEqual(["c", "b", "a"]);
    await b.pinNote(a.id, true);
    expect(await order(b)).toEqual(["a", "c", "b"]);
    await b.pinNote(bb.id, true);
    expect(await order(b)).toEqual(["b", "a", "c"]);
    await b.pinNote(a.id, false);
    expect(await order(b)).toEqual(["b", "a", "c"]);
    expect(await kind(b.pinNote(999, true))).toBe("notFound");
  });

  it("reorder puts a whole group in the given order and refuses unknown ids", async () => {
    const b = new PreviewBackend();
    const ids: number[] = [];
    for (const text of ["a", "b", "c"]) ids.push((await b.createNote(note(text))).id);
    expect(await order(b)).toEqual(["c", "b", "a"]);
    await b.reorderNotes([ids[0], ids[1], ids[2]]);
    expect(await order(b)).toEqual(["a", "b", "c"]);
    // A part of the board (what a search shows) trades its own places; the rest stays put.
    await b.reorderNotes([ids[2], ids[0]]);
    expect(await order(b)).toEqual(["c", "b", "a"]);
    await b.reorderNotes([ids[0], ids[2]]);
    expect(await order(b)).toEqual(["a", "b", "c"]);
    expect(await kind(b.reorderNotes([ids[2], 999]))).toBe("notFound");
    expect(await order(b)).toEqual(["a", "b", "c"]);
  });

  it("a reminder is a UTC time; setting it makes it due again; shown once", async () => {
    const b = new PreviewBackend();
    const created = await b.createNote(note("x"));
    expect((await b.setNoteReminder(created.id, "2001-01-01T08:00:00Z")).remindAt).toBe("2001-01-01T08:00:00.000Z");
    for (const bad of ["", "2001-01-01", "2001-01-01T08:00:00", "2001-01-01T24:00:00Z", "2001-01-01T08:00:00+07:00", "2001-01-01T08:00:00.5Z"]) {
      expect(await kind(b.setNoteReminder(created.id, bad))).toBe("invalidReminder");
    }
    expect((await b.dueReminders()).map((n) => n.id)).toEqual([created.id]);
    expect((await b.markNoteReminded(created.id)).remindedAt).not.toBeNull();
    expect(await b.dueReminders()).toEqual([]);
    await b.setNoteReminder(created.id, "2001-01-01T08:00:00Z");
    expect(await b.dueReminders()).toHaveLength(1);
    await b.setNoteReminder(created.id, "2999-01-01T00:00:00Z");
    expect(await b.dueReminders()).toEqual([]);
    expect((await b.setNoteReminder(created.id, null)).remindAt).toBeNull();
  });

  it("restore brings back the color, the pin and the reminder", async () => {
    const b = new PreviewBackend();
    const created = await b.createNote(note("keep", "2026-10-06", [], "teal"));
    await b.createNote(note("other"));
    await b.pinNote(created.id, true);
    await b.setNoteReminder(created.id, "2999-01-01T00:00:00Z");
    const deleted = await b.deleteNote(created.id);
    const back = await b.restoreNote(deleted);
    expect(back).toMatchObject({ color: "teal", pinned: true, remindAt: "2999-01-01T00:00:00.000Z" });
    expect(await order(b)).toEqual(["keep", "other"]);
  });
});

describe("preview backend: stickers", () => {
  // A 1x1 PNG.
  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const star = { kind: "preset" as const, preset: "star" };

  it("refuses an image that is not a small square PNG", async () => {
    const b = new PreviewBackend();
    expect(await kind(b.createSticker({ name: "x", image: "data:image/jpeg;base64,AAAA" }))).toBe("invalidStickerImage");
    expect(await kind(b.createSticker({ name: "x", image: "data:image/png;base64,R0lGODlh" }))).toBe("invalidStickerImage");
    expect(await kind(b.createSticker({ name: " ", image: PNG }))).toBe("invalidName");
    expect((await b.createSticker({ name: " Cat ", image: PNG })).name).toBe("Cat");
  });

  it("puts stickers on days, up to the limit, and deleting one takes it off every day", async () => {
    const b = new PreviewBackend();
    const cat = await b.createSticker({ name: "Cat", image: PNG });
    const own = { kind: "custom" as const, stickerId: cat.id };
    await b.addDaySticker("2026-10-08", own);
    await b.addDaySticker("2026-10-20", own);
    for (let i = 0; i < 5; i++) await b.addDaySticker("2026-10-08", star);
    expect(await kind(b.addDaySticker("2026-10-08", star))).toBe("tooManyStickers");
    expect(await kind(b.addDaySticker("2026-10-09", { kind: "preset", preset: "unicorn" }))).toBe("notFound");
    expect((await b.listStickers())[0].days).toBe(2);

    await b.deleteSticker(cat.id);
    const left = await b.dayStickers("2026-10-01", "2026-10-31");
    expect(left.map((d) => d.sticker)).toEqual(Array(5).fill(star));
  });
});

describe("preview backend: notification permission", () => {
  it("asks until the user chooses, then shows reminders in the window when not allowed", async () => {
    const b = new PreviewBackend();
    expect(await b.notificationPermission()).toBe("ask");
    await b.setNotificationPermission("denied");
    expect(await b.notificationPermission()).toBe("denied");
  });

  it("turning on needs a notification the system can show; if it cannot, nothing is saved", async () => {
    const b = new PreviewBackend();
    // No notification support here (a plain test environment), like a system that blocks them.
    await expect(b.enableNotifications("Reminders", "Test")).rejects.toThrow();
    expect(await b.notificationPermission()).toBe("ask");
    await b.setNotificationPermission("denied");
    await expect(b.enableNotifications("Reminders", "Test")).rejects.toThrow();
    expect(await b.notificationPermission()).toBe("denied");
  });
});
