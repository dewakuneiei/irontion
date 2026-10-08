<script lang="ts">
  import type { DaySlots } from "$lib/api/types";
  import { readableInk } from "$lib/domain/color";
  import { addRange, moveSelection, toggleSlot } from "$lib/domain/slots";
  import { HOURS, SLOTS_PER_DAY, SLOTS_PER_HOUR, SLOT_MINUTES, type DayProgress } from "$lib/domain/time";
  import { formatCellTime, formatHourLabel, slotTimes } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import BlockShape from "./BlockShape.svelte";

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

  type Gesture = { kind: "select"; anchor: number; base: ReadonlySet<number> } | { kind: "move"; grab: number };

  const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SLOTS_PER_HOUR, ArrowDown: SLOTS_PER_HOUR };
  const columnLabels = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => `:${String(i * SLOT_MINUTES).padStart(2, "0")}`);

  let gesture = $state<Gesture | null>(null);
  let hovered = $state<number | null>(null);
  /** The keyboard cursor is only drawn when the grid was reached with the keyboard. */
  let keyboardFocus = $state(false);
  let cursor = $state(0);
  /** Where Shift+click or Shift+arrows extend from, and what was selected before that range began. */
  let anchor = 0;
  let rangeBase: ReadonlySet<number> = new Set();

  const firstSelected = $derived(selection.size > 0 ? Math.min(...selection) : 0);

  // What the grid would look like if the gesture ended now.
  const moveDraft = $derived.by(() => {
    const from = moving ? firstSelected : gesture?.kind === "move" ? gesture.grab : null;
    return from === null || hovered === null ? null : moveSelection(slots, selection, hovered - from);
  });
  // Selecting adds to what is already selected: it is only ever cleared on purpose.
  const selectDraft = $derived(
    gesture?.kind === "select" && hovered !== null ? addRange(gesture.base, gesture.anchor, hovered) : null,
  );

  const shownSlots = $derived(moveDraft?.slots ?? slots);
  const shownSelection = $derived(moveDraft?.selection ?? selectDraft ?? selection);
  const nowHour = $derived(Math.floor(time.elapsed / SLOTS_PER_HOUR));

  type Phase = "past" | "current" | "future";
  function phaseOf(slot: number): Phase {
    if (slot < time.elapsed) return "past";
    return time.isToday && slot === time.elapsed ? "current" : "future";
  }

  /** What was selected before the current range started, forgetting it once the selection is cleared. */
  const baseSelection = () => (selection.size === 0 ? new Set<number>() : rangeBase);

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
    if (selection.has(slot) && !event.shiftKey) {
      gesture = { kind: "move", grab: slot };
    } else if (event.shiftKey) {
      gesture = { kind: "select", anchor, base: baseSelection() };
    } else {
      gesture = { kind: "select", anchor: slot, base: selection };
    }
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
      selection = selected ?? addRange(finished.base, finished.anchor, finished.anchor);
      anchor = finished.anchor;
      rangeBase = finished.base;
    } else if (finished?.kind === "move") {
      if (dropped && dropped.offset !== 0) {
        commit(dropped);
      } else {
        // A click, not a drag: on a selected cell it takes just that cell out of the selection.
        selection = toggleSlot(selection, finished.grab);
        anchor = finished.grab;
        rangeBase = selection;
      }
    }
  }

  /** Ctrl+click: one cell in or out. */
  function toggle(slot: number) {
    const next = toggleSlot(selection, slot);
    selection = next;
    anchor = slot;
    rangeBase = next;
  }

  function commit(moved: { slots: DaySlots; selection: Set<number> }) {
    onchange(moved.slots);
    selection = moved.selection;
    rangeBase = moved.selection;
  }

  // ---------- Keyboard ----------

  function onkeydown(event: KeyboardEvent) {
    const step: number | undefined = STEP[event.key];
    if (step !== undefined && event.altKey && selection.size > 0) {
      const moved = moveSelection(slots, selection, step);
      if (moved.offset !== 0) commit(moved);
    } else if (step !== undefined) {
      cursor = Math.max(0, Math.min(SLOTS_PER_DAY - 1, cursor + step));
      if (event.shiftKey) selection = addRange(baseSelection(), anchor, cursor);
    } else if (event.key === "Enter" || event.key === " ") {
      selection = toggleSlot(selection, cursor);
      anchor = cursor;
      rangeBase = selection;
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
  onfocus={(event) => (keyboardFocus = event.currentTarget.matches(":focus-visible"))}
  onblur={() => (keyboardFocus = false)}
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
            class:marked={selected || phase === "current"}
            style:color={phase === "past" && color ? readableInk(color) : undefined}
          >
            <BlockShape
              shape={preferences.cellShape}
              {phase}
              {color}
              progress={time.progress}
              direction={preferences.fillDirection}
              wave={preferences.fillAnimation}
              mark={selected ? "selected" : phase === "current" ? "now" : null}
              cursor={keyboardFocus && slot === cursor}
            />
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
    A cell is always the full square, whatever shape it draws: pointer hit-testing, drag-select and
    hover use the square, so dragging across cells never skips one. The shape is drawn inside by
    BlockShape, which takes no pointer events.
  */
  .cell {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }
  /* The ring around a selected or current block reaches into the gap: keep it above its neighbors. */
  .cell.marked {
    z-index: 1;
  }
  .label {
    position: relative;
    font-size: 0.6875rem;
  }
  .day-grid:not(.busy) .cell.empty:hover {
    --cell-bg: var(--surface-hover);
  }
  .day-grid:not(.busy) .cell:not(.empty):hover {
    filter: brightness(1.07);
  }
  .day-grid.moving .cell {
    cursor: move;
  }
</style>
