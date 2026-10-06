import { getBackend } from "$lib/api/backend";
import type { NewNote, Note, NoteDayCount, NoteEdit } from "$lib/api/types";
import { catalog } from "./catalog.svelte";

/**
 * Sticky notes: one list shared by the Notes page and the Calendar, so they are two views of the
 * same data. Actions write through the backend, then reload, so the UI shows what was saved.
 * Errors propagate to the caller (the paper shows them inline).
 */
class NotesStore {
  /** Every note, in the backend's order (the latest day first). */
  all = $state<Note[]>([]);
  loaded = $state(false);
  /** Bumped after every change, so the Calendar knows to refetch its counts. */
  version = $state(0);

  private loading: Promise<void> | undefined;

  /** Load once; later calls reuse the same request. */
  ensureLoaded(): Promise<void> {
    this.loading ??= this.reload();
    return this.loading;
  }

  byId(id: number): Note | undefined {
    return this.all.find((note) => note.id === id);
  }

  /** One day's notes, newest first. */
  on(date: string): Note[] {
    return this.all.filter((note) => note.date === date);
  }

  /** Per day from `from` to `to`: how many notes. */
  async monthCounts(from: string, to: string): Promise<NoteDayCount[]> {
    return (await getBackend()).noteMonthCounts(from, to);
  }

  async create(input: NewNote): Promise<Note> {
    return this.write((backend) => backend.createNote(input));
  }

  /** Text and tags. The date never changes here: see `move`. */
  async update(id: number, edit: NoteEdit): Promise<Note> {
    return this.write((backend) => backend.updateNote(id, edit));
  }

  /** Put a note on another day (the Calendar's "Move to another day"). */
  async move(id: number, date: string): Promise<Note> {
    return this.write((backend) => backend.moveNote(id, date));
  }

  /** Delete for good; the deleted note comes back for Undo (`restore`). */
  async remove(id: number): Promise<Note> {
    return this.write((backend) => backend.deleteNote(id));
  }

  async pin(id: number, pinned: boolean): Promise<Note> {
    return this.write((backend) => backend.pinNote(id, pinned));
  }

  /**
   * Put a group of notes (pinned, or the rest) in this order. The board shows the new order at
   * once and the backend saves it; if saving fails the order is read back from the backend.
   */
  async reorder(ids: readonly number[]): Promise<void> {
    const rank = new Map(ids.map((id, index) => [id, index]));
    const inGroup = (note: Note) => rank.has(note.id);
    const group = this.all.filter(inGroup).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    let next = 0;
    this.all = this.all.map((note) => (inGroup(note) ? group[next++] : note));
    try {
      await (await getBackend()).reorderNotes([...ids]);
    } finally {
      await this.reload();
    }
  }

  /** Set a reminder (`remindAt` in UTC) or clear it with `null`. */
  async remind(id: number, remindAt: string | null): Promise<Note> {
    return this.write((backend) => backend.setNoteReminder(id, remindAt));
  }

  async restore(note: Note): Promise<Note> {
    return this.write((backend) => backend.restoreNote(note));
  }

  async reload() {
    this.all = await (await getBackend()).listNotes({ kind: "all" });
    this.loaded = true;
    this.version++;
  }

  /** A note write may create tags (`#name`), so the shared tag list is refreshed too. */
  private async write(action: (backend: Awaited<ReturnType<typeof getBackend>>) => Promise<Note>): Promise<Note> {
    const note = await action(await getBackend());
    await Promise.all([this.reload(), catalog.refreshTags()]);
    return note;
  }
}

export const notes = new NotesStore();
