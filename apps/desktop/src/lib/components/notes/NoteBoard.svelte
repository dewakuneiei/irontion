<script lang="ts">
  import { tick } from "svelte";
  import type { Note } from "$lib/api/types";
  import { columnCount, deal, moveBefore, nudge } from "$lib/domain/notes";
  import { t } from "$lib/i18n/index.svelte";
  import { notes as store } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import NoteCard from "./NoteCard.svelte";

  /** The narrowest a card gets, and the space between cards (the tape and shadow need room). */
  const MIN_WIDTH = 240;
  const GAP = 20;
  /** A press moves this far before it counts as a drag. */
  const DRAG_THRESHOLD = 5;
  /** Near the top or bottom of the window a drag scrolls the page. */
  const EDGE = 56;

  /**
   * One group of notes (pinned, or the rest) laid out like a board: cards are as tall as their
   * text, dealt into columns in order, so the list order reads left to right, then down. The user
   * drags a card by its grip (or moves it with the arrow keys) to change the order.
   */
  let { notes, reorderable, onreorder }: { notes: readonly Note[]; reorderable: boolean; onreorder: (ids: number[]) => void } = $props();

  let width = $state(0);
  let container = $state<HTMLDivElement>();
  let announcement = $state("");

  const columns = $derived(deal(notes, columnCount(width, MIN_WIDTH, GAP)));
  const ids = $derived(notes.map((n) => n.id));

  interface Drag {
    id: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    moved: boolean;
    over: number | null;
    after: boolean;
  }
  let drag = $state<Drag | null>(null);

  $effect(() => {
    if (!container) return;
    const watcher = new ResizeObserver(([entry]) => (width = entry.contentRect.width));
    watcher.observe(container);
    return () => watcher.disconnect();
  });

  function startDrag(event: PointerEvent, id: number) {
    if (event.button !== 0 || !reorderable) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = { id, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false, over: null, after: false };
  }

  /** The card under the pointer, other than the one being dragged, and whether the pointer is in its lower half. */
  function cardUnder(x: number, y: number, except: number): { id: number; after: boolean } | null {
    for (const el of container?.querySelectorAll<HTMLElement>("[data-board-id]") ?? []) {
      const id = Number(el.dataset.boardId);
      const r = el.getBoundingClientRect();
      if (id !== except && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { id, after: y > r.top + r.height / 2 };
      }
    }
    return null;
  }

  function onMove(event: PointerEvent) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const moved = drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD;
    const hit = moved ? cardUnder(event.clientX, event.clientY, drag.id) : null;
    drag = { ...drag, dx, dy, moved, over: hit?.id ?? null, after: hit?.after ?? false };
    if (moved) scrollNearEdge(event.clientY);
  }

  function scrollNearEdge(y: number) {
    const main = document.querySelector("main");
    if (!main) return;
    if (y < EDGE) main.scrollBy({ top: -14 });
    else if (y > window.innerHeight - EDGE) main.scrollBy({ top: 14 });
  }

  function onUp() {
    const done = drag;
    drag = null;
    if (!done?.moved || done.over === null) return;
    commit(moveBefore(ids, done.id, done.over, done.after), done.id);
  }

  async function commit(next: number[], id: number) {
    if (next.join() === ids.join()) return;
    announcement = t("notes.board.moved", { n: next.indexOf(id) + 1, total: next.length });
    onreorder(next);
    await tick();
    container?.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus();
  }

  /** With the grip focused, the arrow keys move the card one place. */
  function onHandleKey(event: KeyboardEvent, id: number) {
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
    if (step === 0 || !reorderable) return;
    event.preventDefault();
    void commit(nudge(ids, id, step), id);
  }

  async function pin(note: Note) {
    try {
      await store.pin(note.id, !note.pinned);
    } catch (err) {
      notices.error(err);
    }
  }
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} onpointercancel={() => (drag = null)} />

<div bind:this={container} class="flex items-start" style:gap="{GAP}px" data-board>
  {#each columns as column, index (index)}
    <ul class="flex min-w-0 flex-1 flex-col pt-2" style:gap="1.75rem" data-column>
      {#each column as note (note.id)}
        {@const active = drag?.id === note.id && drag.moved}
        <li
          class="min-w-0"
          data-board-id={note.id}
          style:transform={active ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined}
          style:z-index={active ? 30 : undefined}
          style:pointer-events={active ? "none" : undefined}
          style:position="relative"
        >
          <NoteCard
            {note}
            href="/notes/{note.id}"
            onpin={() => pin(note)}
            onhandle={reorderable ? (e) => startDrag(e, note.id) : undefined}
            onhandlekey={reorderable ? (e) => onHandleKey(e, note.id) : undefined}
            dragging={active}
            target={drag?.over === note.id}
          />
        </li>
      {/each}
    </ul>
  {/each}
</div>

<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
