import { invoke } from "@tauri-apps/api/core";
import { BackendError, type Backend } from "./backend";
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
  Tag,
  TagInput,
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

  countData = (scope: DeleteScope) => this.call<DataCounts>("count_data", { scope });
  deleteData = (scope: DeleteScope) => this.call<DataCounts>("delete_data", { scope });
}
