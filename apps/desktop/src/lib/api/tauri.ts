import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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

/** Calls the Rust commands in `src-tauri/src/commands.rs`. The only place that uses `invoke`. */
export class TauriBackend implements Backend {
  readonly persistent = true;

  private async call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    try {
      return await invoke<T>(command, args);
    } catch (err) {
      const { kind = "database", message = String(err) } = (err ?? {}) as { kind?: ErrorKind; message?: string };
      throw new BackendError(kind, message);
    }
  }

  listActivities = () => this.call<Activity[]>("list_activities");
  createActivity = (input: NewActivity) => this.call<Activity>("create_activity", { input });
  updateActivity = (id: number, patch: ActivityPatch) => this.call<Activity>("update_activity", { id, patch });
  archiveActivity = (id: number) => this.call<void>("archive_activity", { id });
  restoreActivity = (id: number) => this.call<void>("restore_activity", { id });
  deleteActivity = (id: number) => this.call<void>("delete_activity", { id });
  activityBlockCount = (id: number) => this.call<number>("activity_block_count", { id });

  planActivityTree = (nodes: TreeNode[]) => this.call<TreePlanItem[]>("plan_activity_tree", { nodes });
  importActivityTree = (nodes: TreeNode[], overwrite: string[][]) =>
    this.call<TreeReport>("import_activity_tree", { nodes, overwrite });

  listTags = () => this.call<Tag[]>("list_tags");
  createTag = (input: TagInput) => this.call<Tag>("create_tag", { input });
  updateTag = (id: number, input: TagInput) => this.call<Tag>("update_tag", { id, input });
  deleteTag = (id: number) => this.call<void>("delete_tag", { id });

  getDay = (date: string) => this.call<DaySlots>("get_day", { date });
  applyDayChanges = (date: string, changes: DayChange[]) =>
    this.call<DaySlots>("apply_day_changes", { date, changes });

  activityTotals = (from: string, to: string) => this.call<ActivityTotal[]>("activity_totals", { from, to });
  dailyTotals = (from: string, to: string) => this.call<DailyTotal[]>("daily_totals", { from, to });

  tagUsage = () => this.call<TagUsage[]>("tag_usage");
  listNotes = (query: NoteQuery, filter?: NoteFilter) => this.call<Note[]>("list_notes", { query, filter: filter ?? null });
  createNote = (input: NewNote) => this.call<Note>("create_note", { input });
  updateNote = (id: number, edit: NoteEdit) => this.call<Note>("update_note", { id, edit });
  moveNote = (id: number, date: string) => this.call<Note>("move_note", { id, date });
  deleteNote = (id: number) => this.call<Note>("delete_note", { id });
  restoreNote = (note: Note) => this.call<Note>("restore_note", { note });
  pinNote = (id: number, pinned: boolean) => this.call<Note>("pin_note", { id, pinned });
  reorderNotes = (ids: number[]) => this.call<void>("reorder_notes", { ids });
  setNoteReminder = (id: number, remindAt: string | null) => this.call<Note>("set_note_reminder", { id, remindAt });
  watchReminders = (handler: (delivery: ReminderDelivery) => void) =>
    listen<ReminderDelivery>("reminder-delivered", (event) => handler(event.payload));
  notificationStatus = () => this.call<NotificationStatus>("notification_status");
  sendTestNotification = (title: string, body: string) => this.call<void>("send_test_notification", { title, body });
  setNotificationTexts = (texts: { reminder: string; missed: string }) => this.call<void>("set_notification_texts", texts);
  reminderWindow = () => this.call<boolean>("reminder_window");
  setReminderWindow = (enabled: boolean) => this.call<void>("set_reminder_window", { enabled });
  previewReminderAlert = () => this.call<void>("preview_reminder_alert");
  dismissAlert = () => this.call<void>("dismiss_alert");
  openNoteFromAlert = (id: number) => this.call<void>("open_note_from_alert", { id });
  watchOpenNote = (handler: (id: number) => void) => listen<number>("open-note", (event) => handler(event.payload));
  enableNotifications = (title: string, body: string) => this.call<void>("enable_notifications", { title, body });
  notificationPermission = () => this.call<NotificationPermission>("notification_permission");
  setNotificationPermission = (permission: NotificationPermission) =>
    this.call<void>("set_notification_permission", { permission });

  listStickers = () => this.call<Sticker[]>("list_stickers");
  createSticker = (input: NewSticker) => this.call<Sticker>("create_sticker", { input });
  deleteSticker = (id: number) => this.call<void>("delete_sticker", { id });
  dayStickers = (from: string, to: string) => this.call<DaySticker[]>("day_stickers", { from, to });
  addDaySticker = (date: string, sticker: StickerRef) => this.call<DaySticker>("add_day_sticker", { date, sticker });
  removeDaySticker = (id: number) => this.call<void>("remove_day_sticker", { id });
  noteMonthCounts = (from: string, to: string) => this.call<NoteDayCount[]>("note_month_counts", { from, to });

  countData = (scope: DeleteScope) => this.call<DataCounts>("count_data", { scope });
  deleteData = (scope: DeleteScope) => this.call<DataCounts>("delete_data", { scope });
}
