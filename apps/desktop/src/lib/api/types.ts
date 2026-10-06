// Mirrors `irontion_core::model` (serde camelCase). Keep the two in sync.

export interface Activity {
  id: number;
  parentId: number | null;
  name: string;
  /** `null` = inherit the parent's color. */
  color: string | null;
  position: number;
  archived: boolean;
  tagIds: number[];
}

export interface NewActivity {
  parentId: number | null;
  name: string;
  color: string | null;
  tagIds: number[];
}

export interface ActivityPatch {
  name: string;
  color: string | null;
  tagIds: number[];
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface TagInput {
  name: string;
  color: string | null;
}

/** An activity to add, with the sub-activities that go inside it. */
export interface TreeNode {
  name: string;
  /** `null` = inherit the parent's color (not allowed at the top level). */
  color: string | null;
  children: TreeNode[];
}

/** One node in display order, and whether an activity with that name is already there. */
export interface TreePlanItem {
  /** Names from the top level down to this node. */
  path: string[];
  exists: boolean;
}

export interface TreeReport {
  created: number;
  /** Existing activities whose color was overwritten. */
  recolored: number;
  /** Existing activities left exactly as they were. */
  kept: number;
}

/** One cell edit. `activityId: null` clears the cell. */
export interface DayChange {
  slot: number;
  activityId: number | null;
}

/** The 144 cells of one day, in order. */
export type DaySlots = (number | null)[];

export interface ActivityTotal {
  activityId: number;
  blocks: number;
}

export interface DailyTotal {
  date: string;
  blocks: number;
}

/** Which data "delete data" removes. Mirrors `irontion_core::model::DeleteScope`. */
export type DeleteScope =
  | { kind: "allBlocks" }
  /** Both ends included, `YYYY-MM-DD`. One day: `from === to`. */
  | { kind: "blocksInRange"; from: string; to: string }
  /** Every activity, and with them all their time blocks. Tags stay. */
  | { kind: "allActivities" };

/** How much a delete removes, or would remove. */
export interface DataCounts {
  blocks: number;
  activities: number;
}

/** Mirrors `irontion_core::Error::kind()`. */
export type ErrorKind =
  | "notFound"
  | "invalidName"
  | "invalidColor"
  | "colorRequired"
  | "invalidDate"
  | "invalidSlot"
  | "notLeaf"
  | "tooDeep"
  | "archived"
  | "notArchived"
  | "duplicateTag"
  | "database"
  | "io";
