// In-memory backend for `pnpm dev` in a plain browser. It enforces the same rules
// as `irontion-core` so the preview never shows behavior the real app would reject.
// Data resets on reload and starts with the "Student" example from F002.

import { isAssignable, MAX_DEPTH, subtreeIds } from "$lib/domain/tree";
import { addDays, fromISODate, SLOTS_PER_DAY, slotAt, todayISO } from "$lib/domain/time";
import { BackendError, type Backend } from "./backend";
import type {
  Activity,
  ActivityPatch,
  ActivityTotal,
  DailyTotal,
  DayChange,
  DaySlots,
  ErrorKind,
  NewActivity,
  Tag,
  TagInput,
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

export class PreviewBackend implements Backend {
  readonly persistent = false;

  private activities: Activity[] = [];
  private tags: Tag[] = [];
  private days = new Map<string, DaySlots>();
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
      if (activity.archived) fail("archived");
      if (!isAssignable(id, this.activities)) fail("notLeaf");
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
}
