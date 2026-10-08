import { describe, expect, it } from "vitest";
import rules from "../../../../../crates/irontion-core/fixtures/note_rules.json";
import type { Note, Tag } from "$lib/api/types";
import {
  MAX_NOTE_LEN,
  MAX_NOTE_TAGS,
  NO_FILTER,
  commitTags,
  countTags,
  extractTags,
  filterNotes,
  columnCount,
  deal,
  dropIndex,
  moveTo,
  type CardBox,
  nudge,
  splitPinned,
  NOTE_COLORS,
  DEFAULT_NOTE_COLOR,
  isNoteColor,
  isFiltering,
  isTagChar,
  isValidTagName,
  noteLength,
  removeToken,
  removeTypedToken,
  resolveTagName,
  savedText,
  suggestTags,
  tagIdsInUse,
  tagTokenAt,
  withoutTokenAt,
} from "./notes";

let nextId = 1;
const note = (
  text: string,
  { date = "2026-10-06", tagIds = [] as number[], pinned = false, created = "", updated = "" } = {},
): Note => {
  const id = nextId++;
  const createdAt = created || `2026-10-06T00:00:${String(id).padStart(2, "0")}.000Z`;
  return {
    id,
    text,
    date,
    color: "yellow",
    pinned,
    tagIds,
    remindAt: null,
    remindedAt: null,
    createdAt,
    updatedAt: updated || createdAt,
  };
};

const tag = (id: number, name: string): Tag => ({ id, name, color: null });

describe("the rules shared with irontion-core (fixtures/note_rules.json)", () => {
  it("has the same limits", () => {
    expect(MAX_NOTE_LEN).toBe(rules.maxNoteLen);
    expect(MAX_NOTE_TAGS).toBe(rules.maxNoteTags);
  });

  it.each(rules.extract)("takes the tags out of $text", ({ text, expectText, expectTags }) => {
    const got = extractTags(text);
    expect(got.text.trim()).toBe(expectText);
    expect(got.tags).toEqual(expectTags);
  });

  it("accepts and refuses the same new tag names", () => {
    for (const name of rules.tagNames.valid) expect(isValidTagName(name), name).toBe(true);
    for (const name of rules.tagNames.invalid) expect(isValidTagName(name), name).toBe(false);
  });
});

describe("note length", () => {
  it("counts what the user sees: Thai marks, CJK, emoji", () => {
    expect(noteLength("ที่")).toBe(1);
    expect(noteLength("วันนี้ฉันจะ")).toBe(7);
    expect(noteLength("今日は頑張る")).toBe(6);
    expect(noteLength("오늘의 목표")).toBe(6);
    expect(noteLength("👍🏽")).toBe(1);
    expect(noteLength("👨‍👩‍👧")).toBe(1);
    expect(noteLength("🇹🇭")).toBe(1);
  });

  it("does not count tags or the space around the text", () => {
    expect(savedText("  Run 5 km #health ")).toBe("Run 5 km");
    expect(noteLength(savedText("a".repeat(200) + " #work"))).toBe(200);
  });
});

describe("typing a #tag", () => {
  it("Thai tone marks are tag characters inside their cluster, emoji are not", () => {
    expect(isTagChar("ร็")).toBe(true);
    expect(isTagChar("🎉")).toBe(false);
  });

  it("finds the tag at the caret, even when only # is typed", () => {
    expect(tagTokenAt("Plan #", 6)).toEqual({ start: 5, end: 6, name: "" });
    expect(tagTokenAt("Plan #wo", 8)).toEqual({ start: 5, end: 8, name: "wo" });
    expect(tagTokenAt("Plan #work today", 7)).toEqual({ start: 5, end: 10, name: "work" });
    expect(tagTokenAt("#สำเร็จ", 7)).toEqual({ start: 0, end: 7, name: "สำเร็จ" });
  });

  it("ignores a # inside a word or a caret past the tag", () => {
    expect(tagTokenAt("C#", 2)).toBeNull();
    expect(tagTokenAt("#work today", 11)).toBeNull();
    expect(tagTokenAt("no tag", 3)).toBeNull();
  });

  it("removing a tag takes one blank with it and puts the caret where it was", () => {
    expect(removeToken("Plan #work today", { start: 5, end: 10, name: "work" })).toEqual({ text: "Plan today", caret: 5 });
    expect(removeToken("Plan #work", { start: 5, end: 10, name: "work" })).toEqual({ text: "Plan", caret: 4 });
  });

  it("autosave leaves out the tag still being typed", () => {
    expect(withoutTokenAt("Plan #wo", 8)).toBe("Plan");
    expect(withoutTokenAt("Plan more", 9)).toBe("Plan more");
  });

  it("suggests existing tags by prefix, ignoring case, skipping ones already on the note", () => {
    const tags = [tag(1, "Work"), tag(2, "workout"), tag(3, "home")];
    expect(suggestTags(tags, "wO", []).map((t) => t.name)).toEqual(["Work", "workout"]);
    expect(suggestTags(tags, "", ["HOME"]).map((t) => t.name)).toEqual(["Work", "workout"]);
    expect(resolveTagName(tags, "WORK")).toBe("Work");
    expect(resolveTagName(tags, "new")).toBe("new");
  });
});

describe("the board", () => {
  it("has the palette of the core, yellow first", () => {
    expect([...NOTE_COLORS]).toEqual(rules.noteColors);
    expect(DEFAULT_NOTE_COLOR).toBe("yellow");
    expect(isNoteColor("teal")).toBe(true);
    expect(isNoteColor("neon")).toBe(false);
    expect(isNoteColor("#12ab9f")).toBe(true);
    expect(["#12AB9F", "#fc0", "12ab9f", "#12ab9"].some(isNoteColor)).toBe(false);
  });

  it("splits pinned notes from the rest, keeping each group's order", () => {
    const list = [note("a"), note("b", { pinned: true }), note("c"), note("d", { pinned: true })];
    const { pinned, others } = splitPinned(list);
    expect(pinned.map((n) => n.text)).toEqual(["b", "d"]);
    expect(others.map((n) => n.text)).toEqual(["a", "c"]);
  });

  describe("moving a note to a place", () => {
    const six = [1, 2, 3, 4, 5, 6];

    it("takes the note's place: last, middle and first all land exactly where asked", () => {
      expect(moveTo(six, 6, 0)).toEqual([6, 1, 2, 3, 4, 5]);
      expect(moveTo(six, 3, 0)).toEqual([3, 1, 2, 4, 5, 6]);
      expect(moveTo(six, 2, 0)).toEqual([2, 1, 3, 4, 5, 6]);
      expect(moveTo(six, 1, 5)).toEqual([2, 3, 4, 5, 6, 1]);
      expect(moveTo(six, 2, 4)).toEqual([1, 3, 4, 5, 2, 6]);
    });

    it("leaves the list alone for the same place, one note, two notes, or a place that does not exist", () => {
      expect(moveTo(six, 1, 0)).toEqual(six);
      expect(moveTo([7], 7, 0)).toEqual([7]);
      expect(moveTo([7, 8], 8, 0)).toEqual([8, 7]);
      expect(moveTo([7, 8], 7, 1)).toEqual([8, 7]);
      expect(moveTo(six, 99, 0)).toEqual(six);
      expect(moveTo(six, 1, -1)).toEqual(six);
      expect(moveTo(six, 1, 6)).toEqual(six);
    });

    it("moves only the notes it was given, so a filtered list keeps its hidden notes in place", () => {
      const board = [1, 2, 3, 4, 5];
      const shown = [2, 4, 5]; // a search hides 1 and 3
      expect(moveTo(shown, 5, 0)).toEqual([5, 2, 4]);
      expect(board.filter((id) => !shown.includes(id))).toEqual([1, 3]);
    });
  });

  describe("where a dropped note goes", () => {
    // Two columns of cards, dealt in turn: ids 1, 3, 5 on the left and 2, 4, 6 on the right.
    const ids = [1, 2, 3, 4, 5, 6];
    const box = (id: number, column: number, row: number): CardBox => ({
      id,
      left: column * 260,
      right: column * 260 + 240,
      top: 100 + row * 200,
      bottom: 100 + row * 200 + 180,
    });
    const boxes = [box(1, 0, 0), box(2, 1, 0), box(3, 0, 1), box(4, 1, 1), box(5, 0, 2), box(6, 1, 2)];
    const drop = (dragged: number, x: number, y: number) => {
      const index = dropIndex(boxes, ids, dragged, x, y);
      return index === null ? ids : moveTo(ids, dragged, index);
    };

    it("puts a note first when it is dropped anywhere on the first card", () => {
      expect(drop(2, 120, 120)[0]).toBe(2); // upper half
      expect(drop(2, 120, 240)[0]).toBe(2); // lower half: the case that used to place it second
      expect(drop(6, 120, 190)[0]).toBe(6);
      expect(drop(3, 10, 110)[0]).toBe(3); // the corner
    });

    it("puts a note first when it is dropped above or beside the first card", () => {
      expect(drop(4, 120, 40)[0]).toBe(4); // above the board
      expect(drop(4, -30, 150)[0]).toBe(4); // left of the board
    });

    it("drops on the nearest card when the pointer is in a gap between cards", () => {
      expect(drop(1, 255, 150)).toEqual(moveTo(ids, 1, 1)); // the gap between the columns, near card 2
      expect(drop(1, 125, 292)).toEqual(moveTo(ids, 1, 2)); // the gap under card 1, nearer card 3
    });

    it("does nothing when dropped on its own place, or far from the board", () => {
      expect(drop(3, 120, 400)).toEqual(ids);
      expect(dropIndex(boxes, ids, 3, 900, 900)).toBeNull();
      expect(dropIndex(boxes, ids, 3, 120, -500)).toBeNull();
      expect(dropIndex([], ids, 3, 120, 120)).toBeNull();
    });
  });

  it("nudges a note one place, and stops at the ends", () => {
    expect(nudge([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(nudge([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(nudge([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(nudge([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
  });

  it("fits columns to the width, at least one", () => {
    expect(columnCount(100, 240, 20)).toBe(1);
    expect(columnCount(500, 240, 20)).toBe(2);
    expect(columnCount(1000, 240, 20)).toBe(3);
    expect(columnCount(1020, 240, 20)).toBe(4);
  });

  it("deals items into columns in turn, so reading order is the list order", () => {
    expect(deal([1, 2, 3, 4, 5], 2)).toEqual([[1, 3, 5], [2, 4]]);
    expect(deal([1, 2], 3)).toEqual([[1], [2], []]);
    expect(deal([1, 2, 3], 1)).toEqual([[1, 2, 3]]);
  });
});

describe("filters", () => {
  const names = new Map([
    [1, "school"],
    [2, "health"],
  ]);
  const notes = [
    note("Study two hours", { tagIds: [1] }),
    note("Ran 5 km", { tagIds: [2] }),
    note("Hand in the thesis", { tagIds: [1] }),
  ];
  const texts = (list: Note[]) => list.map((n) => n.text);

  it("combines tag and keyword (text or tag name, every word, any case)", () => {
    expect(texts(filterNotes(notes, { ...NO_FILTER, tagId: 2 }, names))).toEqual(["Ran 5 km"]);
    expect(texts(filterNotes(notes, { ...NO_FILTER, tagId: 1 }, names))).toHaveLength(2);
    expect(texts(filterNotes(notes, { ...NO_FILTER, query: "SCHOOL two" }, names))).toEqual(["Study two hours"]);
    expect(filterNotes(notes, { tagId: 2, query: "thesis" }, names)).toEqual([]);
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_FILTER, query: " x " })).toBe(true);
  });

  it("counts each tag chip with the search kept", () => {
    expect([...countTags(notes, NO_FILTER, names, [1, 2])]).toEqual([
      [null, 3],
      [1, 2],
      [2, 1],
    ]);
    expect([...countTags(notes, { ...NO_FILTER, query: "thesis" }, names, [1, 2])]).toEqual([
      [null, 1],
      [1, 1],
      [2, 0],
    ]);
    expect(tagIdsInUse(notes)).toEqual(new Set([1, 2]));
  });
});

describe("commitTags", () => {
  it("commits finished tags and keeps the caret in place", () => {
    const text = "Plan #work today";
    const result = commitTags(text, text.length);
    expect(result).toEqual({ text: "Plan today", caret: "Plan today".length, tags: ["work"] });
  });

  it("leaves the tag being typed at the caret alone", () => {
    expect(commitTags("Plan #wo", 8)).toEqual({ text: "Plan #wo", caret: 8, tags: [] });
    expect(commitTags("#a and #b", 9)).toEqual({ text: "and #b", caret: 6, tags: ["a"] });
    expect(commitTags("Note #", 6)).toEqual({ text: "Note #", caret: 6, tags: [] });
  });

  it("commits the tag at the caret too when leaving", () => {
    expect(commitTags("Plan #work", 10, { live: true })).toEqual({ text: "Plan", caret: 4, tags: ["work"] });
  });

  it("keeps Thai tags whole", () => {
    expect(commitTags("งาน #สำเร็จ วันนี้", 0).tags).toEqual(["สำเร็จ"]);
  });
});

describe("removeTypedToken", () => {
  const at = (text: string, caret: number) => removeTypedToken(text, tagTokenAt(text, caret)!);
  it("keeps the blank before the tag, so typing goes on", () => {
    expect(at("Ship it #health", 15)).toEqual({ text: "Ship it ", caret: 8 });
  });
  it("does not leave a double blank", () => {
    expect(at("x #a y", 4)).toEqual({ text: "x y", caret: 2 });
    expect(at("#a rest", 2)).toEqual({ text: "rest", caret: 0 });
  });
  it("keeps line breaks", () => {
    expect(at("one\n#a\ntwo", 6)).toEqual({ text: "one\n\ntwo", caret: 4 });
  });
});
