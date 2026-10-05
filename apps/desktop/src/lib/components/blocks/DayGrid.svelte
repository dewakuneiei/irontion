<script lang="ts">
  import type { DaySlots } from "$lib/api/types";
  import { readableInk } from "$lib/domain/color";
  import { blockAt, moveSelection, range } from "$lib/domain/slots";
  import { HOURS, SLOTS_PER_DAY, SLOTS_PER_HOUR, SLOT_MINUTES, type DayProgress } from "$lib/domain/time";
  import { formatCellTime, formatHourLabel, slotTimes } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let {
    slots,
    selection = $bindable(),
    moving = $bindable(),
    time,
    label,
    onchange,
  }: {
    slots: DaySlots;
    selection: ReadonlySet<number>;
    /** Move mode: the next click drops the selected blocks there. */
    moving: boolean;
    /** What has passed: past blocks are filled, future ones are outlines, the current one fills gradually. */
    time: DayProgress;
    label: string;
    onchange: (next: DaySlots) => void;
  } = $props();

  type Gesture = { kind: "select"; anchor: number } | { kind: "move"; grab: number };

  const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SLOTS_PER_HOUR, ArrowDown: SLOTS_PER_HOUR };
  const columnLabels = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => `:${String(i * SLOT_MINUTES).padStart(2, "0")}`);

  let gesture = $state<Gesture | null>(null);
  let hovered = $state<number | null>(null);
  let cursor = $state(0);
  /** Where Shift+click or Shift+arrows extend from. */
  let anchor = 0;

  const firstSelected = $derived(selection.size > 0 ? Math.min(...selection) : 0);

  // What the grid would look like if the gesture ended now.
  const moveDraft = $derived.by(() => {
    const from = moving ? firstSelected : gesture?.kind === "move" ? gesture.grab : null;
    return from === null || hovered === null ? null : moveSelection(slots, selection, hovered - from);
  });
  const selectDraft = $derived(gesture?.kind === "select" && hovered !== null ? pick(gesture.anchor, hovered) : null);

  const shownSlots = $derived(moveDraft?.slots ?? slots);
  const shownSelection = $derived(moveDraft?.selection ?? selectDraft ?? selection);
  const nowHour = $derived(Math.floor(time.elapsed / SLOTS_PER_HOUR));

  type Phase = "past" | "current" | "future";
  function phaseOf(slot: number): Phase {
    if (slot < time.elapsed) return "past";
    return time.isToday && slot === time.elapsed ? "current" : "future";
  }

  /** One cell selects its whole block; a drag selects everything between. */
  function pick(from: number, to: number): Set<number> {
    return new Set(from === to ? blockAt(slots, from) : range(from, to));
  }

  // ---------- Pointer ----------

  function slotAtPoint(x: number, y: number): number | null {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot]");
    return cell ? Number(cell.dataset.slot) : null;
  }

  function onpointerdown(event: PointerEvent) {
    const slot = slotAtPoint(event.clientX, event.clientY);
    if (event.button !== 0 || slot === null) return;
    cursor = slot;
    if (moving) return; // the drop happens on release
    if (event.ctrlKey || event.metaKey) {
      toggle(slot);
      return;
    }
    gesture =
      selection.has(slot) && !event.shiftKey
        ? { kind: "move", grab: slot }
        : { kind: "select", anchor: event.shiftKey ? anchor : slot };
    hovered = slot;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onpointermove(event: PointerEvent) {
    const slot = slotAtPoint(event.clientX, event.clientY);
    // While dragging outside the grid, keep the last cell instead of dropping the preview.
    if (slot !== null || !gesture) hovered = slot;
  }

  function onpointerup() {
    const dropped = moveDraft;
    const selected = selectDraft;
    const finished = gesture;
    gesture = null;

    if (moving) {
      if (dropped && dropped.offset !== 0) commit(dropped);
      moving = false;
    } else if (finished?.kind === "select") {
      selection = selected ?? pick(finished.anchor, finished.anchor);
      anchor = finished.anchor;
    } else if (finished?.kind === "move") {
      if (dropped && dropped.offset !== 0) commit(dropped);
      else selection = pick(finished.grab, finished.grab); // a click, not a drag
    }
  }

  function toggle(slot: number) {
    const next = new Set(selection);
    if (!next.delete(slot)) next.add(slot);
    selection = next;
    anchor = slot;
  }

  function commit(moved: { slots: DaySlots; selection: Set<number> }) {
    onchange(moved.slots);
    selection = moved.selection;
  }

  // ---------- Keyboard ----------

  function onkeydown(event: KeyboardEvent) {
    const step: number | undefined = STEP[event.key];
    if (step !== undefined && event.altKey && selection.size > 0) {
      const moved = moveSelection(slots, selection, step);
      if (moved.offset !== 0) commit(moved);
    } else if (step !== undefined) {
      cursor = Math.max(0, Math.min(SLOTS_PER_DAY - 1, cursor + step));
      if (event.shiftKey) selection = new Set(range(anchor, cursor));
    } else if (event.key === "Enter" || event.key === " ") {
      selection = pick(cursor, cursor);
      anchor = cursor;
    } else {
      return;
    }
    event.preventDefault();
  }

  // ---------- Display ----------

  function cellLabel(slot: number): string {
    const id = shownSlots[slot];
    const time = slotTimes(slot);
    return id === null ? t("blocks.cellEmpty", time) : t("blocks.cellFilled", { ...time, activity: catalog.labelOf(id) });
  }

  // 12-hour labels ("8 AM") need a wider hour column than "08".
  const hourColumn = $derived(preferences.timeFormat === "12h" ? "w-11 text-[10px]" : "w-6 text-xs");
</script>

<div
  role="grid"
  tabindex="0"
  aria-label={label}
  aria-multiselectable="true"
  aria-activedescendant="cell-{cursor}"
  class="day-grid outline-none"
  class:busy={gesture !== null}
  class:moving={moving || gesture?.kind === "move"}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={() => (gesture = null)}
  onpointerleave={() => !gesture && (hovered = null)}
  oncontextmenu={(e) => e.preventDefault()}
  {onkeydown}
>
  <div class="mb-[var(--gap)] flex gap-3 text-[11px] text-muted tabular-nums" aria-hidden="true">
    <span class="shrink-0 {hourColumn}"></span>
    <div class="grid min-w-0 flex-1 grid-cols-6 gap-[var(--gap)]">
      {#each columnLabels as col (col)}<span class="pl-1">{col}</span>{/each}
    </div>
  </div>

  {#each { length: HOURS } as _, hour (hour)}
    <div role="row" class="mb-[var(--gap)] flex items-center gap-3">
      <span
        class="shrink-0 text-right font-medium whitespace-nowrap tabular-nums {hourColumn} {time.isToday && hour === nowHour
          ? 'text-accent'
          : 'text-muted'}"
        aria-hidden="true">{formatHourLabel(hour)}</span
      >
      <div class="grid min-w-0 flex-1 grid-cols-6 gap-[var(--gap)]">
        {#each { length: SLOTS_PER_HOUR } as _, col (col)}
          {@const slot = hour * SLOTS_PER_HOUR + col}
          {@const id = shownSlots[slot]}
          {@const color = id === null ? undefined : catalog.colorOf(id)}
          {@const selected = shownSelection.has(slot)}
          {@const phase = phaseOf(slot)}
          <div
            role="gridcell"
            id="cell-{slot}"
            data-slot={slot}
            aria-selected={selected}
            aria-label={cellLabel(slot)}
            title={cellLabel(slot)}
            class="cell {phase}"
            class:empty={id === null}
            class:selected
            class:cursor={slot === cursor}
            style:--c={color}
            style:color={phase === "past" && color ? readableInk(color) : undefined}
          >
            {#if phase === "current"}
              <span class="fill {preferences.fillDirection}" style:--p="{time.progress * 100}%"></span>
            {/if}
            {#if selected}
              <span class="label tabular-nums">{formatCellTime(slot)}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  /* Cells fill the width they are given (six per row) and stay square. */
  .day-grid {
    --gap: 0.375rem;
    touch-action: pan-y;
  }
  /* Room under a cell for the selection sheet that covers the bottom of narrow windows. */
  @media (width < 56rem) {
    .day-grid {
      --sheet-room: 17rem;
    }
    .cell {
      scroll-margin-block: 1rem var(--sheet-room);
    }
  }
  @media (width >= 40rem) {
    .day-grid {
      --gap: 0.5rem;
    }
  }

  /*
    A block is its time: it fills as time passes.
    future  = outline only
    current = outline, filling from the bottom as its ten minutes go by (4:05 is half)
    past    = filled
    --c is the activity color; empty blocks use neutral colors.
  */
  .cell {
    --line: var(--c, var(--cell-ring));
    --solid: var(--c, var(--surface-2));
    position: relative;
    display: grid;
    place-items: center;
    overflow: hidden;
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--cell-radius);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 140ms ease,
      box-shadow 140ms ease;
  }
  .cell.future,
  .cell.current {
    border: 2px solid var(--line);
  }
  .cell.past {
    background: var(--solid);
  }
  /* The fill grows toward the chosen direction; --p is how far through the ten minutes it is. */
  .fill {
    position: absolute;
    background: var(--solid);
    transition:
      height 400ms linear,
      width 400ms linear;
  }
  .fill.up {
    inset: auto 0 0 0;
    height: var(--p);
  }
  .fill.down {
    inset: 0 0 auto 0;
    height: var(--p);
  }
  .fill.right {
    inset: 0 auto 0 0;
    width: var(--p);
  }
  .fill.left {
    inset: 0 0 0 auto;
    width: var(--p);
  }
  .label {
    position: relative;
  }
  .day-grid:not(.busy) .cell.empty:hover {
    background: var(--surface-hover);
  }
  .day-grid:not(.busy) .cell:not(.empty):hover {
    filter: brightness(1.07);
  }
  .cell.current {
    box-shadow:
      0 0 0 2px var(--surface),
      0 0 0 4px var(--accent);
  }
  .cell.selected {
    z-index: 1;
    font-size: 0.6875rem;
    box-shadow:
      0 0 0 2px var(--surface),
      0 0 0 4px var(--text);
  }
  .day-grid:focus-visible .cell.cursor {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .day-grid.moving .cell {
    cursor: move;
  }
</style>
