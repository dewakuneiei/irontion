import { isTauri } from "@tauri-apps/api/core";
import type {
  Activity,
  ActivityPatch,
  ActivityTotal,
  DailyTotal,
  DataCounts,
  DayChange,
  DaySlots,
  DeleteScope,
  ErrorKind,
  NewActivity,
  NewNote,
  Note,
  NoteDayCount,
  NoteEdit,
  NoteFilter,
  NoteQuery,
  Tag,
  TagInput,
  TagUsage,
  TreeNode,
  TreePlanItem,
  TreeReport,
} from "./types";

/**
 * Everything the UI can ask of storage. The desktop app talks to Rust; the browser
 * preview (`pnpm dev`) uses an in-memory copy. A web build would add a third.
 */
export interface Backend {
  readonly persistent: boolean;

  listActivities(): Promise<Activity[]>;
  createActivity(input: NewActivity): Promise<Activity>;
  updateActivity(id: number, patch: ActivityPatch): Promise<Activity>;
  archiveActivity(id: number): Promise<void>;
  restoreActivity(id: number): Promise<void>;
  deleteActivity(id: number): Promise<void>;
  activityBlockCount(id: number): Promise<number>;

  /** Which nodes of a tree already exist (same name among siblings). Changes nothing. */
  planActivityTree(nodes: TreeNode[]): Promise<TreePlanItem[]>;
  /** Add a tree in one step. Existing nodes are kept, or recolored when their path is in `overwrite`. */
  importActivityTree(nodes: TreeNode[], overwrite: string[][]): Promise<TreeReport>;

  listTags(): Promise<Tag[]>;
  createTag(input: TagInput): Promise<Tag>;
  updateTag(id: number, input: TagInput): Promise<Tag>;
  deleteTag(id: number): Promise<void>;

  getDay(date: string): Promise<DaySlots>;
  applyDayChanges(date: string, changes: DayChange[]): Promise<DaySlots>;

  activityTotals(from: string, to: string): Promise<ActivityTotal[]>;
  dailyTotals(from: string, to: string): Promise<DailyTotal[]>;

  /** How many activities and notes use each tag. */
  tagUsage(): Promise<TagUsage[]>;
  /** Notes in display order: the latest day first, the newest created first within a day. */
  listNotes(query: NoteQuery, filter?: NoteFilter): Promise<Note[]>;
  createNote(input: NewNote): Promise<Note>;
  /** Text and tags. Never the date: see `moveNote`. */
  updateNote(id: number, edit: NoteEdit): Promise<Note>;
  /** Put a note on another day (the Calendar only). */
  moveNote(id: number, date: string): Promise<Note>;
  /** Delete one note for good; the deleted note comes back so the UI can offer Undo. */
  deleteNote(id: number): Promise<Note>;
  /** Undo a delete: the note comes back with its id, day and times. */
  restoreNote(note: Note): Promise<Note>;
  /** Pin or unpin a note; it goes to the top of its new group. Not an edit. */
  pinNote(id: number, pinned: boolean): Promise<Note>;
  /** Put these notes in this order (a whole group, pinned or not, as dragged). */
  reorderNotes(ids: number[]): Promise<void>;
  /** Set (UTC, ISO 8601) or clear a note's reminder (F008). */
  setNoteReminder(id: number, remindAt: string | null): Promise<Note>;
  /** Notes whose reminder time has come and were not shown yet, soonest first. */
  dueReminders(): Promise<Note[]>;
  /** Remember that a reminder was shown, so it is not shown again. */
  markNoteReminded(id: number): Promise<Note>;
  /** Per day between two dates (both included): the note count. */
  noteMonthCounts(from: string, to: string): Promise<NoteDayCount[]>;

  /** What `deleteData` would remove for this scope. Changes nothing. */
  countData(scope: DeleteScope): Promise<DataCounts>;
  /** Permanently delete the scope in one step and say how much went. */
  deleteData(scope: DeleteScope): Promise<DataCounts>;
}

export class BackendError extends Error {
  constructor(
    readonly kind: ErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export function errorKind(err: unknown): ErrorKind {
  return err instanceof BackendError ? err.kind : "database";
}

let instance: Promise<Backend> | undefined;

/** The backend for this environment, created once. */
export function getBackend(): Promise<Backend> {
  instance ??= isTauri()
    ? import("./tauri").then((m) => new m.TauriBackend())
    : import("./preview").then((m) => m.createPreviewBackend());
  return instance;
}
