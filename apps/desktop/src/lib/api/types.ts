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
  /** Every activity, and with them all their time blocks. Tags and notes stay. */
  | { kind: "allActivities" }
  /** Every note. Activities and time blocks never delete notes; tags stay. */
  | { kind: "allNotes" };

/** How much a delete removes, or would remove. */
export interface DataCounts {
  blocks: number;
  activities: number;
  notes: number;
}

/** The paper colors of a note. Mirrors `irontion_core::NOTE_COLORS`. */
export type NotePalette = "yellow" | "orange" | "red" | "pink" | "purple" | "blue" | "teal" | "green" | "gray";
/** A palette color, or a custom `#rrggbb` (lowercase). */
export type NoteColor = NotePalette | `#${string}`;

/**
 * A short sticky note (F006). Every note belongs to exactly one day, where it shows on the
 * Calendar (F007); one day can have many notes. Mirrors `irontion_core::model::Note`.
 */
export interface Note {
  id: number;
  text: string;
  /** `YYYY-MM-DD`. Set when the note is made; only `moveNote` changes it. */
  date: string;
  /** One of `NOTE_COLORS` (`domain/notes.ts`), or a custom `#rrggbb`. */
  color: NoteColor;
  /** Pinned notes come first on the board. */
  pinned: boolean;
  /** The user's tags (the same ones activities use). */
  tagIds: number[];
  /** When to remind the user (UTC, ISO 8601), if at all (F008). */
  remindAt: string | null;
  /** When the reminder was shown; `null` while it is still to come. */
  remindedAt: string | null;
  /** UTC, ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** A new note. `tags` are names: existing tags (ignoring case) are reused, others are created. */
export interface NewNote {
  date: string;
  text: string;
  color: NoteColor;
  tags: string[];
}

/** An edit of a note. No date on purpose: only the Calendar moves a note, with `moveNote`. */
export interface NoteEdit {
  text: string;
  color: NoteColor;
  tags: string[];
}

/** Which days to list notes from. Mirrors `irontion_core::model::NoteQuery`. */
export type NoteQuery =
  | { kind: "all" }
  | { kind: "date"; date: string }
  /** Both ends included. */
  | { kind: "range"; from: string; to: string };

/** Narrows a note list; the fields combine. Mirrors `irontion_core::model::NoteFilter`. */
export interface NoteFilter {
  tagId?: number | null;
  /** Every word must appear in the text or a tag name, in any order, ignoring case. */
  keyword?: string | null;
}

/** One day's notes for the Calendar. Days without notes are left out. */
export interface NoteDayCount {
  date: string;
  notes: number;
}

/** How many activities and notes use one tag. */
export interface TagUsage {
  tagId: number;
  activities: number;
  notes: number;
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
  | "noteEmpty"
  | "noteTooLong"
  | "noteTooManyTags"
  | "invalidNoteTag"
  | "invalidReminder"
  | "database"
  | "io";
