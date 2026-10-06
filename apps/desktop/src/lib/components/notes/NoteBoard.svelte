<script lang="ts">
  import { tick } from "svelte";
  import type { Note } from "$lib/api/types";
  import { columnCount, deal, moveBefore, nudge } from "$lib/domain/notes";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { notes as store } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import NoteCard from "./NoteCard.svelte";

  /** The narrowest a card gets, and the space between cards (the tape and shadow need room). */
  const MIN_WIDTH = 240;
  const GAP = 20;
  /** A mouse press moves this far before it counts as a drag. */
  const DRAG_THRESHOLD = 5;
  /** A finger must rest this long to pick a card up (a quick swipe still scrolls the page), and
      moving further than the slop before that means it is a scroll. */
  const HOLD_MS = 280;
  const TOUCH_SLOP = 10;
  /** Near the top or bottom of the window a drag scrolls the page. */
  const EDGE = 56;
  /** Cards sliding into their new places, and the dropped card settling into its own. */
  const MOVE_MS = 320;
  const MOVE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

  /**
   * One group of notes (pinned, or the rest) laid out like a board: cards are as tall as their
   * text, dealt into columns in order, so the list order reads left to right, then down. A click
   * opens a card; holding it and dragging moves it (Alt+Shift and the arrow keys do the same).
   * When the card is dropped, the cards slide to their new places, or the card glides back.
   */
  let { notes, reorderable, onreorder }: { notes: readonly Note[]; reorderable: boolean; onreorder: (ids: number[]) => void } = $props();

  let width = $state(0);
  let container = $state<HTMLDivElement>();
  let announcement = $state("");

  const columns = $derived(deal(notes, columnCount(width, MIN_WIDTH, GAP)));
  const ids = $derived(notes.map((n) => n.id));

  /** A pointer is down on a card but it has not been picked up yet. */
  interface Press {
    id: number;
    el: HTMLElement;
    pointerId: number;
    touch: boolean;
    x: number;
    y: number;
    timer?: ReturnType<typeof setTimeout>;
  }
  /** A card that is picked up and following the pointer. */
  interface Drag {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    over: number | null;
    after: boolean;
  }
  let press: Press | null = null;
  let drag = $state<Drag | null>(null);
  /** The dropped card keeps its place in front while it glides to its new spot. */
  let settling = $state<number | null>(null);
  /** The click that ends a drag must not open the card. */
  let swallowClick = false;

  $effect(() => {
    if (!container) return;
    const watcher = new ResizeObserver(([entry]) => (width = entry.contentRect.width));
    watcher.observe(container);
    return () => watcher.disconnect();
  });

  // Once a card is picked up by touch, the page must not scroll under the finger.
  $effect(() => {
    if (!drag) return;
    const hold = (event: TouchEvent) => event.cancelable && event.preventDefault();
    window.addEventListener("touchmove", hold, { passive: false });
    return () => window.removeEventListener("touchmove", hold);
  });

  function onPress(event: PointerEvent, id: number) {
    if (event.button !== 0 || !reorderable || (event.target as HTMLElement).closest("[data-pin]")) return;
    swallowClick = false;
    const touch = event.pointerType === "touch";
    press = { id, el: event.currentTarget as HTMLElement, pointerId: event.pointerId, touch, x: event.clientX, y: event.clientY };
    if (touch) press.timer = setTimeout(pickUp, HOLD_MS);
  }

  function pickUp() {
    if (!press) return;
    clearTimeout(press.timer);
    press.el.setPointerCapture?.(press.pointerId);
    drag = { id: press.id, x: press.x, y: press.y, dx: 0, dy: 0, over: null, after: false };
    press = null;
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
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
    if (drag) {
      const hit = cardUnder(event.clientX, event.clientY, drag.id);
      drag = { ...drag, dx: event.clientX - drag.x, dy: event.clientY - drag.y, over: hit?.id ?? null, after: hit?.after ?? false };
      scrollNearEdge(event.clientY);
      return;
    }
    if (!press) return;
    const far = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (!press.touch && far > DRAG_THRESHOLD) pickUp();
    else if (press.touch && far > TOUCH_SLOP) cancelPress(); // a swipe: let the page scroll
  }

  function scrollNearEdge(y: number) {
    const main = document.querySelector("main");
    if (!main) return;
    if (y < EDGE) main.scrollBy({ top: -14 });
    else if (y > window.innerHeight - EDGE) main.scrollBy({ top: 14 });
  }

  function onRelease() {
    cancelPress();
    if (drag) void drop(drag);
  }

  /** The system took the pointer (a call, a gesture): the card glides back where it was. */
  function onCancel() {
    cancelPress();
    if (drag) void drop({ ...drag, over: null });
  }

  /** Put the card where it was dropped, or let it glide back when it was not dropped on another card. */
  async function drop(done: Drag) {
    const before = measure();
    swallowClick = true;
    setTimeout(() => (swallowClick = false), 400);
    drag = null;
    settling = done.id;
    const next = done.over === null ? ids : moveBefore(ids, done.id, done.over, done.after);
    if (next.join() !== ids.join()) {
      announcement = t("notes.board.moved", { n: next.indexOf(done.id) + 1, total: next.length });
      onreorder(next);
    }
    await glide(before);
    settling = null;
  }

  function onKey(event: KeyboardEvent, id: number) {
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
    if (step === 0 || !event.altKey || !event.shiftKey || !reorderable) return;
    event.preventDefault();
    const next = nudge(ids, id, step);
    if (next.join() === ids.join()) return;
    const before = measure();
    announcement = t("notes.board.moved", { n: next.indexOf(id) + 1, total: next.length });
    onreorder(next);
    void glide(before).then(() => container?.querySelector<HTMLElement>(`[data-note="${id}"] a, [data-note="${id}"] > button`)?.focus());
  }

  /** Where every card is on screen right now, dragged one included. */
  function measure(): Map<number, DOMRect> {
    const rects = new Map<number, DOMRect>();
    for (const el of container?.querySelectorAll<HTMLElement>("[data-board-id]") ?? []) {
      rects.set(Number(el.dataset.boardId), el.getBoundingClientRect());
    }
    return rects;
  }

  /** Slide every card that changed place from where it was to where it is now. */
  async function glide(before: Map<number, DOMRect>) {
    await tick();
    if (!preferences.motion) return;
    const running: Promise<unknown>[] = [];
    for (const el of container?.querySelectorAll<HTMLElement>("[data-board-id]") ?? []) {
      const was = before.get(Number(el.dataset.boardId));
      if (!was) continue;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const move = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
        duration: MOVE_MS,
        easing: MOVE_EASING,
      });
      running.push(move.finished.catch(() => undefined)); // a newer move may cancel this one
    }
    await Promise.all(running);
  }

  async function pin(note: Note) {
    try {
      await store.pin(note.id, !note.pinned);
    } catch (err) {
      notices.error(err);
    }
  }
</script>

<svelte:window onpointermove={onMove} onpointerup={onRelease} onpointercancel={onCancel} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={container}
  class="flex items-start"
  style:gap="{GAP}px"
  data-board
  onclickcapture={(event) => {
    if (!swallowClick) return;
    event.preventDefault();
    event.stopPropagation();
  }}
  oncontextmenu={(event) => (press || drag) && event.preventDefault()}
>
  {#each columns as column, index (index)}
    <ul class="flex min-w-0 flex-1 flex-col pt-2" style:gap="1.75rem" data-column>
      {#each column as note (note.id)}
        {@const active = drag?.id === note.id}
        <li
          class="min-w-0"
          data-board-id={note.id}
          style:translate={active ? `${drag!.dx}px ${drag!.dy}px` : undefined}
          style:z-index={active || settling === note.id ? 30 : undefined}
          style:pointer-events={active ? "none" : undefined}
          style:position="relative"
        >
          <NoteCard
            {note}
            href="/notes/{note.id}"
            onpin={() => pin(note)}
            onpress={reorderable ? (e) => onPress(e, note.id) : undefined}
            onmovekey={reorderable ? (e) => onKey(e, note.id) : undefined}
            dragging={active}
            target={drag?.over === note.id}
          />
        </li>
      {/each}
    </ul>
  {/each}
</div>

<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
