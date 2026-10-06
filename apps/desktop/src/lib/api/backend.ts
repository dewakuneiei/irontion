import { isTauri } from "@tauri-apps/api/core";
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
