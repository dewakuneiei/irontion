// Saves that must reach the backend in the order they were made (F001's rule, reused by the note
// paper's autosave, F006). Each save sends the whole state, so a save that is still waiting when a
// newer one arrives is skipped: the newer one already carries everything it would have written.

export interface SaveQueue {
  /**
   * Run `job` after every earlier save has finished. Resolves with its result, or `undefined` when
   * a newer save replaced it before it started. A failed job rejects only its own promise.
   */
  run<T>(job: () => Promise<T>): Promise<T | undefined>;
  /** Resolves once every save queued so far has settled. */
  idle(): Promise<void>;
}

export function createSaveQueue(): SaveQueue {
  let tail: Promise<unknown> = Promise.resolve();
  let newest = 0;
  return {
    run<T>(job: () => Promise<T>): Promise<T | undefined> {
      const ticket = ++newest;
      const result = tail.then(() => (ticket === newest ? job() : undefined));
      tail = result.catch(() => undefined);
      return result;
    },
    idle: () => tail.then(() => undefined),
  };
}
