<script lang="ts">
  import type { DaySlots } from "$lib/api/types";
  import { readableInk } from "$lib/domain/color";
  import { addRange, blockAt, moveSelection, toggleBlock } from "$lib/domain/slots";
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

  type Gesture = { kind: "select"; anchor: number; base: ReadonlySet<number> } | { kind: "move"; grab: number };

  const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SLOTS_PER_HOUR, ArrowDown: SLOTS_PER_HOUR };
  const columnLabels = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => `:${String(i * SLOT_MINUTES).padStart(2, "0")}`);

  let gesture = $state<Gesture | null>(null);
  let hovered = $state<number | null>(null);
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
    gesture?.kind === "select" && hovered !== null ? addRange(gesture.base, ...extent(gesture.anchor, hovered)) : null,
  );

  const shownSlots = $derived(moveDraft?.slots ?? slots);
  const shownSelection = $derived(moveDraft?.selection ?? selectDraft ?? selection);
  const nowHour = $derived(Math.floor(time.elapsed / SLOTS_PER_HOUR));

  type Phase = "past" | "current" | "future";
  function phaseOf(slot: number): Phase {
    if (slot < time.elapsed) return "past";
    return time.isToday && slot === time.elapsed ? "current" : "future";
  }

  /**
   * The slots a press from `from` to `to` covers: just one cell becomes its whole block (the run
   * of the same activity), several cells are everything between.
   */
  function extent(from: number, to: number): [number, number] {
    if (from !== to) return [from, to];
    const block = blockAt(slots, from);
    return [block[0], block[block.length - 1]];
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
      selection = selected ?? addRange(finished.base, ...extent(finished.anchor, finished.anchor));
      anchor = finished.anchor;
      rangeBase = finished.base;
    } else if (finished?.kind === "move") {
      if (dropped && dropped.offset !== 0) {
        commit(dropped);
      } else {
        // A click, not a drag: on a selected block it takes that block out of the selection.
        selection = toggleBlock(slots, selection, finished.grab);
        anchor = finished.grab;
        rangeBase = selection;
      }
    }
  }

  /** Ctrl+click: one cell in or out, not its whole block. */
  function toggle(slot: number) {
    const next = new Set(selection);
    if (!next.delete(slot)) next.add(slot);
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
      selection = toggleBlock(slots, selection, cursor);
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
              <span
                class="fill {preferences.fillDirection}"
                class:wave={preferences.fillAnimation}
                style:--n={time.progress}
                style:--p="{time.progress * 100}%"
              ></span>
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

  /*
    Water wave: two thin wavy strips ride the leading edge of the fill, drifting in opposite
    directions at different speeds. Each is a color block cut into a wave by a mask, so it
    always matches the fill's color. The strip sits just outside the fill (the cell clips it).
  */
  .fill.wave {
    --wave: 7px;
    --period: 22px;
    --wave-across: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 8' preserveAspectRatio='none'%3E%3Cpath d='M0 4Q10 0 20 4T40 4V8H0Z'/%3E%3C/svg%3E");
    --wave-down: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 40' preserveAspectRatio='none'%3E%3Cpath d='M4 0Q0 10 4 20T4 40H0V0Z'/%3E%3C/svg%3E");
    /* Hidden when the block has just started or is nearly full, where a wave would look odd. */
    --show: calc(min(1, var(--n) * 30) * min(1, (1 - var(--n)) * 30));
  }
  .fill.wave::before,
  .fill.wave::after {
    content: "";
    position: absolute;
    background: var(--solid);
    opacity: var(--show);
    pointer-events: none;
    -webkit-mask-repeat: repeat;
    mask-repeat: repeat;
  }
  .fill.wave.up::before,
  .fill.wave.up::after,
  .fill.wave.down::before,
  .fill.wave.down::after {
    left: 0;
    right: 0;
    height: var(--wave);
    -webkit-mask-image: var(--wave-across);
    mask-image: var(--wave-across);
    -webkit-mask-size: var(--period) 100%;
    mask-size: var(--period) 100%;
    animation: wave-x 2.4s linear infinite;
  }
  .fill.wave.up::before,
  .fill.wave.up::after {
    bottom: 100%;
  }
  .fill.wave.down::before,
  .fill.wave.down::after {
    top: 100%;
    transform: scaleY(-1);
  }
  .fill.wave.right::before,
  .fill.wave.right::after,
  .fill.wave.left::before,
  .fill.wave.left::after {
    top: 0;
    bottom: 0;
    width: var(--wave);
    -webkit-mask-image: var(--wave-down);
    mask-image: var(--wave-down);
    -webkit-mask-size: 100% var(--period);
    mask-size: 100% var(--period);
    animation: wave-y 2.4s linear infinite;
  }
  .fill.wave.right::before,
  .fill.wave.right::after {
    left: 100%;
  }
  .fill.wave.left::before,
  .fill.wave.left::after {
    right: 100%;
    transform: scaleX(-1);
  }
  /* The second wave: fainter, slower and drifting the other way. After the direction rules so it wins. */
  .fill.wave.up::after,
  .fill.wave.down::after,
  .fill.wave.right::after,
  .fill.wave.left::after {
    opacity: calc(var(--show) * 0.4);
    animation-direction: reverse;
    animation-duration: 3.6s;
    animation-delay: -1.4s;
  }
  @keyframes wave-x {
    to {
      -webkit-mask-position: var(--period) 0;
      mask-position: var(--period) 0;
    }
  }
  @keyframes wave-y {
    to {
      -webkit-mask-position: 0 var(--period);
      mask-position: 0 var(--period);
    }
  }
  /* Only the current block ever has a wave. It also stops while the window is hidden. */
  :global(:root[data-hidden]) .fill.wave::before,
  :global(:root[data-hidden]) .fill.wave::after {
    animation-play-state: paused;
  }
  /* Respect "reduce motion": no moving waves. */
  @media (prefers-reduced-motion: reduce) {
    .fill.wave::before,
    .fill.wave::after {
      display: none;
    }
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
