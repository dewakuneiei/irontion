// Sticky notes (F006): the limits, the `#tag` rules and the pure helpers for the Notes page and the
// Calendar. `irontion_core::notes` is the authority; these mirror it, and both sides run the cases
// in `crates/irontion-core/fixtures/note_rules.json`.

import type { Note, NoteColor, NotePalette, Tag } from "$lib/api/types";

/** Longest note, in user-visible characters. Mirrors `irontion_core::MAX_NOTE_LEN`. */
export const MAX_NOTE_LEN = 200;
/** Most tags one note can carry. Mirrors `irontion_core::MAX_NOTE_TAGS`. */
export const MAX_NOTE_TAGS = 5;
/** Longest tag name, in code points. Mirrors `irontion_core::MAX_NAME_LEN`. */
export const MAX_TAG_NAME_LEN = 60;

/** The paper colors, in the order the picker shows them; the first is the default. Mirrors `irontion_core::NOTE_COLORS`. */
export const NOTE_COLORS: readonly NotePalette[] = ["yellow", "orange", "red", "pink", "purple", "blue", "teal", "green", "gray"];
export const DEFAULT_NOTE_COLOR: NotePalette = NOTE_COLORS[0];

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function isCustomColor(value: string): value is `#${string}` {
  return HEX_COLOR.test(value);
}

export function isNoteColor(value: string): value is NoteColor {
  return (NOTE_COLORS as readonly string[]).includes(value) || isCustomColor(value);
}

/** The CSS color of a note: its palette variable (light and dark step), or the custom hex as it is. */
export function noteColorCss(color: NoteColor): string {
  return isCustomColor(color) ? color : `var(--note-${color})`;
}

// ---------- Counting ----------

interface Cluster {
  text: string;
  /** UTF-16 offset in the string. */
  at: number;
}

const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/**
 * The user-visible characters of `text` (extended grapheme clusters, as the Rust side counts).
 * Without `Intl.Segmenter`: code points, with combining marks folded into the one before.
 */
function clusters(text: string): Cluster[] {
  if (segmenter) return [...segmenter.segment(text)].map((s) => ({ text: s.segment, at: s.index }));
  const out: Cluster[] = [];
  let at = 0;
  for (const char of text) {
    const last = out.at(-1);
    if (last && /^\p{M}$/u.test(char)) last.text += char;
    else out.push({ text: char, at });
    at += char.length;
  }
  return out;
}

/**
 * Length as the user sees it. A Thai word with its vowel and tone marks, a Japanese character, an
 * emoji with a skin tone or a family emoji each count once.
 */
export function noteLength(text: string): number {
  return clusters(text).length;
}

// ---------- #tags ----------

/**
 * Whether one user-visible character may be part of a `#tag`: it starts with a letter or digit in
 * any script, `_` or `-`. Judging the whole cluster lets Thai tone marks through (they are
 * combining marks, but they always ride on a consonant); emoji start with a symbol and never pass.
 */
export function isTagChar(cluster: string): boolean {
  return /^[\p{Alphabetic}\p{N}_-]/u.test(cluster);
}

const isSpace = (cluster: string | undefined) => cluster !== undefined && /^\p{White_Space}/u.test(cluster);
/** Whitespace on one line: what goes away with a removed tag. */
const isBlank = (cluster: string | undefined) => isSpace(cluster) && !/^[\n\r]/.test(cluster!);
const codePoints = (text: string) => [...text].length;

/** A name the user may give a new tag from a note (a leading `#` is ignored). */
export function isValidTagName(raw: string): boolean {
  const trimmed = raw.trim();
  const name = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  const parts = clusters(name);
  return parts.length > 0 && codePoints(name) <= MAX_TAG_NAME_LEN && parts.every((c) => isTagChar(c.text));
}

/** A `#tag` in the text: `start` is the `#`, `end` is just past the name (UTF-16 offsets). */
export interface TagToken {
  start: number;
  end: number;
  name: string;
}

/** Every complete `#tag` in the text, in order (the rule of `irontion_core::notes::extract_tags`). */
function tokens(text: string, parts: Cluster[]): TagToken[] {
  const found: TagToken[] = [];
  const offset = (i: number) => parts[i]?.at ?? text.length;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].text !== "#" || (i > 0 && !isSpace(parts[i - 1].text))) continue;
    let end = i + 1;
    while (end < parts.length && isTagChar(parts[end].text)) end++;
    const name = text.slice(offset(i + 1), offset(end));
    if (name === "" || codePoints(name) > MAX_TAG_NAME_LEN) continue;
    found.push({ start: offset(i), end: offset(end), name });
    i = end - 1;
  }
  return found;
}

/**
 * Take every `#tag` out of `text`: one blank next to a removed tag goes with it (the one after it,
 * else the one before it); line breaks stay. Tags come back without duplicates, ignoring case.
 */
export function extractTags(text: string): { text: string; tags: string[] } {
  const parts = clusters(text);
  const indexAt = new Map(parts.map((c, i) => [c.at, i]));
  const removed: [number, number][] = [];
  const tags: string[] = [];
  for (const token of tokens(text, parts)) {
    let [start, end] = [token.start, token.end];
    const after = parts[indexAt.get(token.end) ?? parts.length];
    const before = parts[(indexAt.get(token.start) ?? 0) - 1];
    const previousEnd = removed.at(-1)?.[1] ?? 0;
    if (after && isBlank(after.text)) end += after.text.length;
    else if (before && isBlank(before.text) && before.at >= previousEnd) start = before.at;
    removed.push([start, end]);
    addTagName(tags, token.name);
  }
  let rest = "";
  let at = 0;
  for (const [start, end] of removed) {
    rest += text.slice(at, start);
    at = end;
  }
  return { text: rest + text.slice(at), tags };
}

/**
 * The tag being typed at the caret: a `#` at the start of a word, with the caret inside or right
 * after it. `name` can be empty (the user just typed `#`), which opens the suggestions.
 */
export function tagTokenAt(text: string, caret: number): TagToken | null {
  const hash = text.lastIndexOf("#", caret - 1);
  if (hash < 0 || (hash > 0 && !/\p{White_Space}$/u.test(text.slice(0, hash)))) return null;
  const typed = text.slice(hash + 1, caret);
  if (typed !== "" && !clusters(typed).every((c) => isTagChar(c.text))) return null;
  let end = caret;
  for (const c of clusters(text.slice(caret))) {
    if (!isTagChar(c.text)) break;
    end += c.text.length;
  }
  return { start: hash, end, name: text.slice(hash + 1, end) };
}

/** Remove a tag token from the text with the same blank rule, and say where the caret goes. */
export function removeToken(text: string, token: TagToken): { text: string; caret: number } {
  let [start, end] = [token.start, token.end];
  if (/^[^\S\n\r]/u.test(text.slice(end))) end += 1;
  else if (start > 0 && /[^\S\n\r]$/u.test(text.slice(0, start))) start -= 1;
  return { text: text.slice(0, start) + text.slice(end), caret: start };
}

/**
 * Remove a tag the user just turned into a chip while typing. Unlike `removeToken`, the blank
 * before it stays, so the next word (or the next `#tag`) can follow straight away.
 */
export function removeTypedToken(text: string, token: TagToken): { text: string; caret: number } {
  const before = text.slice(0, token.start);
  let end = token.end;
  if ((before === "" || /[^\S\n\r]$/u.test(before)) && /^[^\S\n\r]/u.test(text.slice(end))) end += 1;
  return { text: before + text.slice(end), caret: token.start };
}

/** The text without the tag still being typed at the caret: autosave leaves a half-typed tag out. */
export function withoutTokenAt(text: string, caret: number): string {
  const token = tagTokenAt(text, caret);
  return token ? removeToken(text, token).text : text;
}

/** Marks the caret while the text goes through `extractTags`; it is never typed. */
const CARET = "\u0001";

/**
 * Take the finished `#tags` out of the text, keeping the caret where it was. A tag still being
 * typed at the caret stays in the text (the user is not done with it), unless `live` is set:
 * leaving the paper commits that one too, like the save rule in Rust.
 */
export function commitTags(
  text: string,
  caret: number,
  options: { live?: boolean } = {},
): { text: string; caret: number; tags: string[] } {
  const typing = options.live ? null : tagTokenAt(text, caret);
  const kept = typing ? text.slice(typing.start, typing.end) : "";
  const marked = typing
    ? text.slice(0, typing.start) + CARET + text.slice(typing.end)
    : text.slice(0, caret) + CARET + text.slice(caret);
  const { text: rest, tags } = extractTags(marked);
  const at = rest.indexOf(CARET);
  return { text: rest.replace(CARET, kept), caret: at + (typing ? caret - typing.start : 0), tags };
}

/** Add a tag name unless the list has it already, ignoring case (the first spelling wins). */
export function addTagName(names: string[], name: string): boolean {
  const lower = name.toLowerCase();
  if (name === "" || names.some((n) => n.toLowerCase() === lower)) return false;
  names.push(name);
  return true;
}

/**
 * The spelling a typed tag is saved under: an existing tag's own name when one matches (ignoring
 * case), else what was typed.
 */
export function resolveTagName(tags: readonly Tag[], typed: string): string {
  const lower = typed.toLowerCase();
  return tags.find((tag) => tag.name.toLowerCase() === lower)?.name ?? typed;
}

/** Existing tags whose name starts with `prefix` (ignoring case), skipping the ones in `taken`. */
export function suggestTags(tags: readonly Tag[], prefix: string, taken: readonly string[], limit = 6): Tag[] {
  const start = prefix.toLowerCase();
  const used = new Set(taken.map((name) => name.toLowerCase()));
  return tags
    .filter((tag) => tag.name.toLowerCase().startsWith(start) && !used.has(tag.name.toLowerCase()))
    .slice(0, limit);
}

/** The text as it will be saved: tags taken out, trimmed. This is what the counter counts. */
export function savedText(text: string): string {
  return extractTags(text).text.trim();
}

// ---------- The board: pinned first, then the user's own order ----------

/** The notes split the way the board shows them, each group in the order it was given. */
export function splitPinned(notes: readonly Note[]): { pinned: Note[]; others: Note[] } {
  return { pinned: notes.filter((n) => n.pinned), others: notes.filter((n) => !n.pinned) };
}

/**
 * `ids` with `id` taken out and put at place `index` (0 is the first): the note takes the place
 * it was dropped on and the notes in between shift by one. Unchanged for an unknown note or place.
 */
export function moveTo(ids: readonly number[], id: number, index: number): number[] {
  const from = ids.indexOf(id);
  if (from < 0 || index < 0 || index >= ids.length) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(index, 0, id);
  return next;
}

/** A card's box on screen, in the same units as the pointer. */
export interface CardBox {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** How far from every card (px) a drop still counts as a drop on the board. */
export const DROP_REACH = 120;

/**
 * The place (index in `ids`) a card dropped with the pointer at `x`, `y` takes: the place of the
 * card nearest the pointer, so dropping on any part of a card, in a gap, or just above or beside
 * the board all mean something. `null` means no move: the pointer is nearest the card's own place,
 * or farther than `reach` from every card.
 */
export function dropIndex(
  boxes: readonly CardBox[],
  ids: readonly number[],
  dragged: number,
  x: number,
  y: number,
  reach = DROP_REACH,
): number | null {
  let nearest: CardBox | null = null;
  let best = Infinity;
  for (const box of boxes) {
    const distance = Math.hypot(Math.max(box.left - x, 0, x - box.right), Math.max(box.top - y, 0, y - box.bottom));
    if (distance < best) {
      best = distance;
      nearest = box;
    }
  }
  if (!nearest || best > reach || nearest.id === dragged) return null;
  const index = ids.indexOf(nearest.id);
  return index < 0 ? null : index;
}

/** `ids` with `id` moved one place earlier (`-1`) or later (`1`); unchanged at the ends. */
export function nudge(ids: readonly number[], id: number, step: -1 | 1): number[] {
  const at = ids.indexOf(id);
  const to = at + step;
  if (at < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

/** How many columns of at least `minWidth` fit in `width`, with `gap` between them (always one). */
export function columnCount(width: number, minWidth: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
}

/**
 * Deal items into `count` columns in turn, like cards laid on a board: item 0 on the left, item 1
 * next to it, and so on, so reading order stays the same as the list order at any width.
 */
export function deal<T>(items: readonly T[], count: number): T[][] {
  const columns: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => columns[index % count].push(item));
  return columns;
}

// ---------- Filters (Notes page) ----------

export interface NotesFilter {
  tagId: number | null;
  /** Every word must appear in the text or a tag name, in any order, ignoring case. */
  query: string;
}

export const NO_FILTER: NotesFilter = { tagId: null, query: "" };

export function isFiltering(filter: NotesFilter): boolean {
  return filter.tagId !== null || filter.query.trim() !== "";
}

/** The notes that pass the filter, in their original order. `tagNames` maps tag ids to names. */
export function filterNotes(notes: readonly Note[], filter: NotesFilter, tagNames: ReadonlyMap<number, string>): Note[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return notes.filter((note) => {
    if (filter.tagId !== null && !note.tagIds.includes(filter.tagId)) return false;
    const text = note.text.toLowerCase();
    const names = note.tagIds.map((id) => (tagNames.get(id) ?? "").toLowerCase());
    return words.every((word) => text.includes(word) || names.some((name) => name.includes(word)));
  });
}

/** What each tag chip would show, with the search kept (`null` = any tag). */
export function countTags(
  notes: readonly Note[],
  filter: NotesFilter,
  tagNames: ReadonlyMap<number, string>,
  tagIds: readonly number[],
): Map<number | null, number> {
  const counts = new Map<number | null, number>();
  for (const tagId of [null, ...tagIds]) counts.set(tagId, filterNotes(notes, { ...filter, tagId }, tagNames).length);
  return counts;
}

/** Ids of the tags some note uses: the Notes page offers chips only for these. */
export function tagIdsInUse(notes: readonly Note[]): Set<number> {
  return new Set(notes.flatMap((note) => note.tagIds));
}
