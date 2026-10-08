// In-memory backend for `pnpm dev` in a plain browser. It enforces the same rules
// as `irontion-core` so the preview never shows behavior the real app would reject.
// Data resets on reload and starts with the "Student" example from F002.

import { MAX_NOTE_LEN, MAX_NOTE_TAGS, addTagName, extractTags, isNoteColor, isValidTagName, noteLength } from "$lib/domain/notes";
import { isAssignable, MAX_DEPTH, subtreeIds } from "$lib/domain/tree";
import { MAX_DAY_STICKERS, PNG_DATA_URL_PREFIX, isStickerPreset, isValidStickerPng } from "$lib/domain/stickers";
import { addDays, fromISODate, SLOTS_PER_DAY, slotAt, todayISO } from "$lib/domain/time";
import { BackendError, type Backend } from "./backend";
import type {
  Activity,
  ActivityPatch,
  ActivityTotal,
  DailyTotal,
  DataCounts,
  DayChange,
  DaySlots,
  DaySticker,
  DeleteScope,
  ErrorKind,
  NewActivity,
  NewNote,
  NewSticker,
  Note,
  NoteColor,
  NoteDayCount,
  NoteEdit,
  NoteFilter,
  NoteQuery,
  NotificationPermission,
  NotificationStatus,
  ReminderDelivery,
  Sticker,
  StickerRef,
  Tag,
  TagInput,
  TagUsage,
  TreeNode,
  TreePlanItem,
  TreeReport,
} from "./types";

const MAX_NAME_LEN = 60;

function fail(kind: ErrorKind): never {
  throw new BackendError(kind, kind);
}

function checkName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || [...name].length > MAX_NAME_LEN) fail("invalidName");
  return name;
}

function checkColor(raw: string | null): string | null {
  if (raw === null) return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(raw)) fail("invalidColor");
  return raw.toLowerCase();
}

/** Same shape check as the core: `YYYY-MM-DD` with a month of 1-12 and a day of 1-31. */
function isValidDate(date: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date);
}

function checkDateRange(from: string, to: string) {
  if (!isValidDate(from) || !isValidDate(to) || from > to) fail("invalidDate");
}

/**
 * The rules of `irontion_core::notes`, in the same order: text (without its `#tags`) not empty and
 * not too long, at most five tags. Returns the text to store and every tag name.
 */
function checkNote(rawText: string, given: readonly string[]): { text: string; tags: string[] } {
  const extracted = extractTags(rawText);
  const text = extracted.text.trim();
  if (text === "") fail("noteEmpty");
  if (noteLength(text) > MAX_NOTE_LEN) fail("noteTooLong");
  const tags: string[] = [];
  for (const name of [...given, ...extracted.tags]) addTagName(tags, name.trim().replace(/^#/, ""));
  if (tags.length > MAX_NOTE_TAGS) fail("noteTooManyTags");
  return { text, tags };
}

/** The core's `validate::timestamp`: UTC `YYYY-MM-DDTHH:MM:SS[.fff]Z`, returned with milliseconds. */
function checkReminder(raw: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/.exec(raw);
  if (!m || !isValidDate(m[1]) || Number(m[2]) > 23 || Number(m[3]) > 59 || Number(m[4]) > 59) fail("invalidReminder");
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5] ?? "000"}Z`;
}

export class PreviewBackend implements Backend {
  readonly persistent = false;

  private activities: Activity[] = [];
  private tags: Tag[] = [];
  private notes: Note[] = [];
  /** The board order inside a group: smaller comes first (the core's `position` column). */
  private positions = new Map<number, number>();
  private days = new Map<string, DaySlots>();
  private stickers: Sticker[] = [];
  private dayStickerList: DaySticker[] = [];
  private permission: NotificationPermission = "ask";
  private popup = false;
  private notificationTexts = { reminder: "Reminder", missed: "Missed reminder" };
  private nextId = 1;

  // ---------- Activities ----------

  async listActivities() {
    return structuredClone(this.activities);
  }

  async createActivity(input: NewActivity) {
    return structuredClone(this.insert(input));
  }

  /** Validate and add one activity. Shared by `createActivity` and tree imports. */
  private insert(input: NewActivity): Activity {
    const name = checkName(input.name);
    const color = checkColor(input.color);
    if (input.parentId === null) {
      if (color === null) fail("colorRequired");
    } else {
      const parent = this.activity(input.parentId);
      if (parent.archived) fail("archived");
      if (this.depth(parent.id) >= MAX_DEPTH) fail("tooDeep");
    }
    this.checkTags(input.tagIds);
    const siblings = this.activities.filter((a) => a.parentId === input.parentId);
    const activity: Activity = {
      id: this.nextId++,
      parentId: input.parentId,
      name,
      color,
      position: Math.max(-1, ...siblings.map((a) => a.position)) + 1,
      archived: false,
      tagIds: [...new Set(input.tagIds)].sort((a, b) => a - b),
    };
    this.activities.push(activity);
    return activity;
  }

  async updateActivity(id: number, patch: ActivityPatch) {
    const activity = this.activity(id);
    const name = checkName(patch.name);
    const color = checkColor(patch.color);
    if (activity.parentId === null && color === null) fail("colorRequired");
    this.checkTags(patch.tagIds);
    Object.assign(activity, { name, color, tagIds: [...new Set(patch.tagIds)].sort((a, b) => a - b) });
    return structuredClone(activity);
  }

  async archiveActivity(id: number) {
    this.activity(id);
    const ids = new Set(subtreeIds(id, this.activities));
    this.activities.forEach((a) => ids.has(a.id) && (a.archived = true));
  }

  async restoreActivity(id: number) {
    const ids = new Set(subtreeIds(id, this.activities));
    for (let a: Activity | undefined = this.activity(id); a; a = this.activities.find((p) => p.id === a!.parentId)) {
      ids.add(a.id);
    }
    this.activities.forEach((a) => ids.has(a.id) && (a.archived = false));
  }

  async deleteActivity(id: number) {
    if (!this.activity(id).archived) fail("notArchived");
    const ids = new Set(subtreeIds(id, this.activities));
    this.activities = this.activities.filter((a) => !ids.has(a.id));
    for (const slots of this.days.values()) {
      slots.forEach((s, i) => s !== null && ids.has(s) && (slots[i] = null));
    }
  }

  async activityBlockCount(id: number) {
    this.activity(id);
    const ids = new Set(subtreeIds(id, this.activities));
    let count = 0;
    for (const slots of this.days.values()) count += slots.filter((s) => s !== null && ids.has(s)).length;
    return count;
  }

  // ---------- Activity trees (templates) ----------

  async planActivityTree(nodes: TreeNode[]): Promise<TreePlanItem[]> {
    const items: TreePlanItem[] = [];
    // `scope`: a parent id, `null` for the top level, or `undefined` under a parent that is new.
    const walk = (scope: number | null | undefined, level: TreeNode[], path: string[]) => {
      for (const node of level) {
        const match = scope === undefined ? undefined : this.sibling(scope, checkName(node.name));
        const here = [...path, node.name];
        items.push({ path: here, exists: match !== undefined });
        walk(match?.id, node.children, here);
      }
    };
    walk(null, nodes, []);
    return items;
  }

  async importActivityTree(nodes: TreeNode[], overwrite: string[][]): Promise<TreeReport> {
    const report: TreeReport = { created: 0, recolored: 0, kept: 0 };
    const before = { activities: structuredClone(this.activities), nextId: this.nextId };
    const add = (parentId: number | null, level: TreeNode[], path: string[]) => {
      for (const node of level) {
        const name = checkName(node.name);
        const here = [...path, node.name];
        const match = this.sibling(parentId, name);
        let id: number;
        if (!match) {
          id = this.insert({ parentId, name, color: node.color, tagIds: [] }).id;
          report.created++;
        } else if (overwrite.some((p) => p.length === here.length && p.every((n, i) => n === here[i]))) {
          const color = checkColor(node.color);
          if (match.parentId === null && color === null) fail("colorRequired");
          match.color = color;
          report.recolored++;
          id = match.id;
        } else {
          report.kept++;
          id = match.id;
        }
        add(id, node.children, here);
      }
    };
    try {
      add(null, nodes, []);
    } catch (err) {
      // All or nothing, like the real transaction.
      this.activities = before.activities;
      this.nextId = before.nextId;
      throw err;
    }
    return report;
  }

  // ---------- Tags ----------

  async listTags() {
    return structuredClone(this.tags).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTag(input: TagInput) {
    const tag: Tag = { id: this.nextId++, name: this.uniqueTagName(input.name), color: checkColor(input.color) };
    this.tags.push(tag);
    return { ...tag };
  }

  async updateTag(id: number, input: TagInput) {
    const tag = this.tags.find((t) => t.id === id) ?? fail("notFound");
    Object.assign(tag, { name: this.uniqueTagName(input.name, id), color: checkColor(input.color) });
    return { ...tag };
  }

  async deleteTag(id: number) {
    if (!this.tags.some((t) => t.id === id)) fail("notFound");
    this.tags = this.tags.filter((t) => t.id !== id);
    this.activities.forEach((a) => (a.tagIds = a.tagIds.filter((t) => t !== id)));
    this.notes.forEach((n) => (n.tagIds = n.tagIds.filter((t) => t !== id)));
  }

  // ---------- Blocks ----------

  async getDay(date: string) {
    return [...this.day(date)];
  }

  async applyDayChanges(date: string, changes: DayChange[]) {
    const slots = this.day(date);
    if (changes.some((c) => c.slot < 0 || c.slot >= SLOTS_PER_DAY)) fail("invalidSlot");
    const onDay = new Set(slots);
    for (const id of new Set(changes.map((c) => c.activityId))) {
      if (id === null || onDay.has(id)) continue;
      const activity = this.activity(id);
      if (!isAssignable(activity.id, this.activities)) fail("archived");
    }
    changes.forEach((c) => (slots[c.slot] = c.activityId));
    return [...slots];
  }

  // ---------- Summaries ----------

  async activityTotals(from: string, to: string): Promise<ActivityTotal[]> {
    const counts = new Map<number, number>();
    for (const [date, slots] of this.days) {
      if (date < from || date > to) continue;
      for (const id of slots) if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].map(([activityId, blocks]) => ({ activityId, blocks })).sort((a, b) => b.blocks - a.blocks);
  }

  async dailyTotals(from: string, to: string): Promise<DailyTotal[]> {
    return [...this.days]
      .filter(([date]) => date >= from && date <= to)
      .map(([date, slots]) => ({ date, blocks: slots.filter((s) => s !== null).length }))
      .filter((d) => d.blocks > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------- Notes ----------

  async tagUsage(): Promise<TagUsage[]> {
    return (await this.listTags()).map((tag) => ({
      tagId: tag.id,
      activities: this.activities.filter((a) => a.tagIds.includes(tag.id)).length,
      notes: this.notes.filter((n) => n.tagIds.includes(tag.id)).length,
    }));
  }

  async listNotes(query: NoteQuery, filter: NoteFilter = {}): Promise<Note[]> {
    if (query.kind === "date" && !isValidDate(query.date)) fail("invalidDate");
    if (query.kind === "range") checkDateRange(query.from, query.to);
    const inQuery = (note: Note) =>
      query.kind === "all" ||
      (query.kind === "date" ? note.date === query.date : note.date >= query.from && note.date <= query.to);
    const words = (filter.keyword ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const names = (note: Note) => note.tagIds.map((id) => this.tags.find((t) => t.id === id)?.name.toLowerCase() ?? "");
    const matches = (note: Note) =>
      (filter.tagId == null || note.tagIds.includes(filter.tagId)) &&
      words.every((w) => note.text.toLowerCase().includes(w) || names(note).some((n) => n.includes(w)));
    return structuredClone(this.notes.filter((n) => inQuery(n) && matches(n)).sort((a, b) => this.boardOrder(a, b)));
  }

  /** Pinned first, then by position; a tie goes to the newer note (like `ORDER BY ... id DESC`). */
  private boardOrder(a: Note, b: Note): number {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (this.positions.get(a.id) ?? 0) - (this.positions.get(b.id) ?? 0) || b.id - a.id;
  }

  /** One before the first position on the board: where a new or newly pinned note goes. */
  private topPosition(): number {
    return this.notes.length === 0 ? 0 : Math.min(...this.notes.map((n) => this.positions.get(n.id) ?? 0)) - 1;
  }

  async createNote(input: NewNote): Promise<Note> {
    const { text, tags } = checkNote(input.text, input.tags);
    if (!isNoteColor(input.color)) fail("invalidColor");
    if (!isValidDate(input.date)) fail("invalidDate");
    const now = new Date().toISOString();
    const position = this.topPosition();
    const note: Note = {
      id: this.nextId++,
      text,
      date: input.date,
      color: input.color,
      pinned: false,
      tagIds: this.resolveNoteTags(tags),
      remindAt: null,
      remindedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.push(note);
    this.positions.set(note.id, position);
    return structuredClone(note);
  }

  async updateNote(id: number, edit: NoteEdit): Promise<Note> {
    const { text, tags } = checkNote(edit.text, edit.tags);
    if (!isNoteColor(edit.color)) fail("invalidColor");
    const note = this.note(id);
    const tagIds = this.resolveNoteTags(tags);
    const sameTags = tagIds.length === note.tagIds.length && tagIds.every((t) => note.tagIds.includes(t));
    if (note.text !== text || !sameTags || note.color !== edit.color) {
      Object.assign(note, { text, tagIds, color: edit.color, updatedAt: new Date().toISOString() });
    }
    return structuredClone(note);
  }

  async moveNote(id: number, date: string): Promise<Note> {
    if (!isValidDate(date)) fail("invalidDate");
    const note = this.note(id);
    if (note.date !== date) Object.assign(note, { date, updatedAt: new Date().toISOString() });
    return structuredClone(note);
  }

  async deleteNote(id: number): Promise<Note> {
    const note = this.note(id);
    this.notes = this.notes.filter((n) => n.id !== id);
    this.positions.delete(id);
    return structuredClone(note);
  }

  async restoreNote(deleted: Note): Promise<Note> {
    const { text } = checkNote(deleted.text, []);
    if (!isNoteColor(deleted.color)) fail("invalidColor");
    if (!isValidDate(deleted.date)) fail("invalidDate");
    const remindAt = deleted.remindAt === null ? null : checkReminder(deleted.remindAt);
    const position = this.topPosition();
    const note: Note = {
      ...structuredClone(deleted),
      id: this.notes.some((n) => n.id === deleted.id) ? this.nextId++ : deleted.id,
      text,
      remindAt,
      tagIds: deleted.tagIds.filter((id) => this.tags.some((t) => t.id === id)),
    };
    this.notes.push(note);
    this.positions.set(note.id, position);
    return structuredClone(note);
  }

  async pinNote(id: number, pinned: boolean): Promise<Note> {
    const note = this.note(id);
    if (note.pinned !== pinned) {
      this.positions.set(id, this.topPosition());
      note.pinned = pinned;
    }
    return structuredClone(note);
  }

  async reorderNotes(ids: number[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.some((id) => !this.notes.some((n) => n.id === id))) fail("notFound");
    // The notes trade the places they hold, like the real backend, so notes left out stay put.
    const held = unique.map((id) => this.positions.get(id) ?? 0).sort((a, b) => a - b);
    for (let i = 1; i < held.length; i++) held[i] = Math.max(held[i], held[i - 1] + 1);
    unique.forEach((id, index) => this.positions.set(id, held[index]));
  }

  async setNoteReminder(id: number, remindAt: string | null): Promise<Note> {
    const value = remindAt === null ? null : checkReminder(remindAt);
    const note = this.note(id);
    Object.assign(note, { remindAt: value, remindedAt: null });
    return structuredClone(note);
  }

  /** The browser has no background thread: the preview checks while its page is open. */
  async watchReminders(handler: (delivery: ReminderDelivery) => void): Promise<() => void> {
    const check = async () => {
      for (const due of await this.dueReminders()) {
        const note = await this.markNoteReminded(due.id);
        handler({ note, missed: false, shown: this.showBrowserNotification(note.text), error: null });
      }
    };
    const timer = setInterval(() => void check(), 30_000);
    void check();
    return () => clearInterval(timer);
  }

  async notificationStatus(): Promise<NotificationStatus> {
    if (typeof Notification === "undefined") return { state: "unavailable", reason: "Notifications are not supported in this browser." };
    return Notification.permission === "denied"
      ? { state: "unavailable", reason: "Notifications are blocked for this page." }
      : { state: "granted", reason: null };
  }

  async sendTestNotification(title: string, body: string): Promise<void> {
    if (typeof Notification === "undefined") throw new Error("Notifications are not supported in this browser.");
    if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications are blocked for this page.");
    new Notification(title, { body });
  }

  async setNotificationTexts(texts: { reminder: string; missed: string }): Promise<void> {
    this.notificationTexts = texts;
  }

  async reminderWindow(): Promise<boolean> {
    return this.popup;
  }

  async setReminderWindow(enabled: boolean): Promise<void> {
    this.popup = enabled;
  }

  /** A browser popup stands in for the desktop's popup window (its sample needs no data). */
  async previewReminderAlert(): Promise<void> {
    if (!window.open("/alert?sample=1", "irontion-alert", "popup,width=460,height=280")) {
      throw new Error("The browser blocked the popup window.");
    }
  }

  async dismissAlert(): Promise<void> {
    window.close();
  }

  async openNoteFromAlert(): Promise<void> {
    window.opener?.focus();
    window.close();
  }

  async watchOpenNote(): Promise<() => void> {
    return () => {};
  }

  /** The browser asks its own permission when the test notification is shown. */
  async enableNotifications(title: string, body: string): Promise<void> {
    await this.sendTestNotification(title, body);
    this.permission = "allowed";
  }

  async notificationPermission(): Promise<NotificationPermission> {
    return this.permission;
  }

  async setNotificationPermission(permission: NotificationPermission): Promise<void> {
    this.permission = permission;
    // The browser has its own permission on top; ask for it when the user allows.
    if (permission === "allowed" && typeof Notification !== "undefined") await Notification.requestPermission();
  }

  /** Like the desktop: a system notification only when the user allowed it. Says whether it showed. */
  private showBrowserNotification(body: string): boolean {
    if (this.permission !== "allowed" || typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    new Notification(this.notificationTexts.reminder, { body });
    return true;
  }

  async dueReminders(): Promise<Note[]> {
    const now = new Date().toISOString();
    const due = (n: Note) => n.remindAt !== null && n.remindedAt === null && n.remindAt <= now;
    return structuredClone(this.notes.filter(due).sort((a, b) => a.remindAt!.localeCompare(b.remindAt!) || a.id - b.id));
  }

  async markNoteReminded(id: number): Promise<Note> {
    const note = this.note(id);
    if (note.remindAt !== null) note.remindedAt = new Date().toISOString();
    return structuredClone(note);
  }

  async noteMonthCounts(from: string, to: string): Promise<NoteDayCount[]> {
    checkDateRange(from, to);
    const days = new Map<string, NoteDayCount>();
    for (const note of this.notes) {
      if (note.date < from || note.date > to) continue;
      const day = days.get(note.date) ?? { date: note.date, notes: 0 };
      day.notes++;
      days.set(note.date, day);
    }
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------- Stickers (F007) ----------

  async listStickers(): Promise<Sticker[]> {
    return structuredClone(this.stickers.map((s) => ({ ...s, days: this.daysCarrying(s.id) })));
  }

  async createSticker(input: NewSticker): Promise<Sticker> {
    const name = checkName(input.name);
    if (!input.image.startsWith(PNG_DATA_URL_PREFIX)) fail("invalidStickerImage");
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(input.image.slice(PNG_DATA_URL_PREFIX.length)), (c) => c.charCodeAt(0));
    } catch {
      fail("invalidStickerImage"); // not base64
    }
    if (!isValidStickerPng(bytes)) fail("invalidStickerImage");
    const sticker: Sticker = { id: this.nextId++, name, image: input.image, days: 0, createdAt: new Date().toISOString() };
    this.stickers.push(sticker);
    return structuredClone(sticker);
  }

  async deleteSticker(id: number): Promise<void> {
    if (!this.stickers.some((s) => s.id === id)) fail("notFound");
    this.stickers = this.stickers.filter((s) => s.id !== id);
    this.dayStickerList = this.dayStickerList.filter((d) => d.sticker.kind !== "custom" || d.sticker.stickerId !== id);
  }

  async dayStickers(from: string, to: string): Promise<DaySticker[]> {
    checkDateRange(from, to);
    return structuredClone(
      this.dayStickerList.filter((d) => d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id),
    );
  }

  async addDaySticker(date: string, sticker: StickerRef): Promise<DaySticker> {
    if (!isValidDate(date)) fail("invalidDate");
    const known = sticker.kind === "preset" ? isStickerPreset(sticker.preset) : this.stickers.some((s) => s.id === sticker.stickerId);
    if (!known) fail("notFound");
    if (this.dayStickerList.filter((d) => d.date === date).length >= MAX_DAY_STICKERS) fail("tooManyStickers");
    const placed: DaySticker = { id: this.nextId++, date, sticker: structuredClone(sticker) };
    this.dayStickerList.push(placed);
    return structuredClone(placed);
  }

  async removeDaySticker(id: number): Promise<void> {
    if (!this.dayStickerList.some((d) => d.id === id)) fail("notFound");
    this.dayStickerList = this.dayStickerList.filter((d) => d.id !== id);
  }

  private daysCarrying(stickerId: number): number {
    return this.dayStickerList.filter((d) => d.sticker.kind === "custom" && d.sticker.stickerId === stickerId).length;
  }

  private note(id: number): Note {
    return this.notes.find((n) => n.id === id) ?? fail("notFound");
  }

  /**
   * Tag ids for these names, like the core: an existing tag is reused (ignoring case); a new name
   * must be a valid note tag. Every name is checked before any tag is created.
   */
  private resolveNoteTags(names: readonly string[]): number[] {
    const existing = (name: string) => this.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (names.some((name) => !existing(name) && !isValidTagName(name))) fail("invalidNoteTag");
    const ids: number[] = [];
    for (const name of names) {
      let tag = existing(name);
      if (!tag) this.tags.push((tag = { id: this.nextId++, name: checkName(name), color: null }));
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  }

  // ---------- Delete data ----------

  async countData(scope: DeleteScope): Promise<DataCounts> {
    if (scope.kind === "blocksInRange") checkDateRange(scope.from, scope.to);
    const inScope = (date: string) => scope.kind !== "blocksInRange" || (date >= scope.from && date <= scope.to);
    let blocks = 0;
    if (scope.kind !== "allNotes") {
      for (const [date, slots] of this.days) if (inScope(date)) blocks += slots.filter((s) => s !== null).length;
    }
    return {
      blocks,
      activities: scope.kind === "allActivities" ? this.activities.length : 0,
      notes: scope.kind === "allNotes" ? this.notes.length : 0,
    };
  }

  async deleteData(scope: DeleteScope): Promise<DataCounts> {
    const counts = await this.countData(scope);
    if (scope.kind === "allNotes") {
      this.notes = [];
    } else if (scope.kind === "allActivities") {
      this.activities = [];
      this.days.clear();
    } else if (scope.kind === "allBlocks") {
      this.days.clear();
    } else {
      for (const date of [...this.days.keys()]) if (date >= scope.from && date <= scope.to) this.days.delete(date);
    }
    return counts;
  }

  // ---------- Helpers ----------

  /** The first active activity under `parentId` with this name, ignoring case. */
  private sibling(parentId: number | null, name: string): Activity | undefined {
    const wanted = name.trim().toLowerCase();
    return this.activities
      .filter((a) => a.parentId === parentId && !a.archived)
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .find((a) => a.name.trim().toLowerCase() === wanted);
  }

  private activity(id: number): Activity {
    return this.activities.find((a) => a.id === id) ?? fail("notFound");
  }

  private depth(id: number): number {
    let depth = 0;
    for (let a: Activity | undefined = this.activity(id); a; a = this.activities.find((p) => p.id === a!.parentId)) {
      depth++;
    }
    return depth;
  }

  private checkTags(ids: number[]) {
    if (ids.some((id) => !this.tags.some((t) => t.id === id))) fail("notFound");
  }

  private uniqueTagName(raw: string, exceptId?: number): string {
    const name = checkName(raw);
    const taken = this.tags.some((t) => t.id !== exceptId && t.name.toLowerCase() === name.toLowerCase());
    if (taken) fail("duplicateTag");
    return name;
  }

  private day(date: string): DaySlots {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("invalidDate");
    let slots = this.days.get(date);
    if (!slots) this.days.set(date, (slots = Array(SLOTS_PER_DAY).fill(null)));
    return slots;
  }
}

/** A preview backend filled with the example data, ready to use. */
export async function createPreviewBackend(): Promise<PreviewBackend> {
  const backend = new PreviewBackend();
  await seed(backend);
  return backend;
}

// ---------- Example data (F002, Example 2: student routine) ----------

async function seed(b: PreviewBackend) {
  const tag = async (name: string) => (await b.createTag({ name, color: null })).id;
  const [deep, low, online, health] = [
    await tag("deep-work"),
    await tag("low-energy"),
    await tag("online"),
    await tag("health"),
  ];
  const add = async (name: string, color: string | null, parentId: number | null = null, tagIds: number[] = []) =>
    (await b.createActivity({ name, color, parentId, tagIds })).id;

  const study = await add("Study", "#6a5ae0");
  const math = await add("Math homework", null, study, [deep]);
  const notes = await add("Review notes", null, study, [low]);
  const language = await add("Language practice", null, study, [online]);
  const wellbeing = await add("Health", "#1baf7a", null, [health]);
  const sleep = await add("Sleep", "#4a90a4", wellbeing);
  const run = await add("Morning run", null, wellbeing);
  const meals = await add("Meals", null, wellbeing);
  const rest = await add("Rest", "#eda100");
  const gaming = await add("Gaming", null, rest);
  const friends = await add("Friends", null, rest);

  // Hour ranges per weekday routine: [startHour, endHour, activity].
  const weekday: [number, number, number][] = [
    [0, 7, sleep], [7, 7.5, run], [7.5, 8, meals], [9, 11, math], [11, 12, notes], [12, 13, meals],
    [14, 15.5, language], [16, 17, math], [18, 19, meals], [20, 21.5, gaming], [23, 24, sleep],
  ];
  const weekend: [number, number, number][] = [
    [0, 9, sleep], [9.5, 10, meals], [11, 13, friends], [13, 14, meals], [15, 16, notes], [19, 20, meals],
    [20, 23, gaming],
  ];

  let noise = 7;
  const random = () => ((noise = (noise * 9301 + 49297) % 233280) / 233280);
  const today = todayISO();
  const nowSlot = slotAt(new Date());

  for (let back = 120; back >= 0; back--) {
    const date = addDays(today, -back);
    if (back > 0 && random() < 0.12) continue; // some days are not tracked at all
    const dow = fromISODate(date).getDay();
    const plan = dow === 0 || dow === 6 ? weekend : weekday;
    const changes: DayChange[] = [];
    for (const [from, to, id] of plan) {
      if (back > 0 && random() < 0.15) continue;
      for (let s = Math.round(from * 6); s < Math.round(to * 6); s++) {
        if (back === 0 && s >= nowSlot) break;
        changes.push({ slot: s, activityId: id });
      }
    }
    await b.applyDayChanges(date, changes);
  }

  // A few notes (F006): different colors and lengths, one pinned, one with a reminder.
  const note = (date: string, text: string, color: NoteColor = "yellow") => b.createNote({ date, text, color, tags: [] });
  await note(addDays(today, 24), "Hand in the thesis proposal #school", "red");
  await note(today, "Laundry is not done yet. Tomorrow morning.", "orange");
  await note(today, "Study for two focused hours. #school", "blue");
  await note(addDays(today, -1), "Calm today, because I slept well. #health", "green");
  const draft = await note(addDays(today, -1), "Finished the first draft of the essay.\n\nNext: read it aloud once, fix the intro, and send it to Sam before Friday. #school", "purple");
  await note(addDays(today, -2), "Ideas for the weekend:\n- long walk\n- call grandma\n- bake bread", "pink");
  const dentist = await note(today, "Call the dentist and book a check-up");
  await b.pinNote(dentist.id, true);
  await b.setNoteReminder(draft.id, new Date(Date.now() + 3 * 3600_000).toISOString());
}
