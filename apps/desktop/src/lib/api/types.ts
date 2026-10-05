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
