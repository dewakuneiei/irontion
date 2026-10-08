import { isTauri } from "@tauri-apps/api/core";
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
  /**
   * Hear about reminders as they are delivered (F008). Delivery itself (system notification and
   * recording it) is done by the backend, not by the window. Returns a function that stops listening.
   */
  watchReminders(handler: (delivery: ReminderDelivery) => void): Promise<() => void>;
  /** Whether the system can show notifications right now. */
  notificationStatus(): Promise<NotificationStatus>;
  /** Show one system notification now. Rejects with the reason when it cannot. */
  sendTestNotification(title: string, body: string): Promise<void>;
  /** The words of the system notification for a reminder, in the user's language. */
  setNotificationTexts(texts: { reminder: string; missed: string }): Promise<void>;
  /**
   * Turn system notifications on: shows one notification now and, only if the system showed it,
   * remembers the yes. Rejects with the reason when it cannot (nothing is saved then).
   */
  enableNotifications(title: string, body: string): Promise<void>;
  /** Has the user allowed reminders as system notifications? `ask` until they chose. */
  notificationPermission(): Promise<NotificationPermission>;
  setNotificationPermission(permission: NotificationPermission): Promise<void>;
  /** Does a due reminder open a popup window of its own? Off until the user turns it on (F008). */
  reminderWindow(): Promise<boolean>;
  setReminderWindow(enabled: boolean): Promise<void>;
  /** Open the reminder popup with a sample, so the user can see it. */
  previewReminderAlert(): Promise<void>;
  /** Close the popup this is called from. */
  dismissAlert(): Promise<void>;
  /** The popup's Open note: bring the main window forward on that note, and close the popup. */
  openNoteFromAlert(id: number): Promise<void>;
  /** Hear that a popup asked the main window to open a note. Returns a function that stops listening. */
  watchOpenNote(handler: (id: number) => void): Promise<() => void>;
  /** Per day between two dates (both included): the note count. */
  noteMonthCounts(from: string, to: string): Promise<NoteDayCount[]>;

  /** The user's own stickers, oldest first (F007). Presets are system data in the frontend. */
  listStickers(): Promise<Sticker[]>;
  createSticker(input: NewSticker): Promise<Sticker>;
  /** Delete one of the user's stickers for good; it comes off every day. */
  deleteSticker(id: number): Promise<void>;
  /** Stickers on the days between two dates (both included), by day, in the order added. */
  dayStickers(from: string, to: string): Promise<DaySticker[]>;
  addDaySticker(date: string, sticker: StickerRef): Promise<DaySticker>;
  removeDaySticker(id: number): Promise<void>;

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
