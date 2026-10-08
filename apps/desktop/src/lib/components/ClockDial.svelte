<script lang="ts">
  import { fade } from "svelte/transition";
  import { dialMarks, handOf, stepValue, valueAtPoint, type DialMode } from "$lib/domain/clockDial";
  import type { TimeFormat } from "$lib/domain/datetime";

  /**
   * The round face of the time picker: numbers around a circle, a hand and a knob on the chosen
   * one. Drag or tap to choose; the arrow keys step. `onpick` gets the value in the dial's own
   * terms (see `domain/clockDial.ts`), and `done` is true when the pointer is let go or Enter is pressed.
   */
  let {
    mode,
    format,
    value,
    label,
    onpick,
  }: {
    mode: DialMode;
    format: TimeFormat;
    value: number;
    label: string;
    onpick: (value: number, done: boolean) => void;
  } = $props();

  // Everything is drawn on a 256-unit square, which the SVG then scales to its box.
  const SIZE = 256;
  const CENTER = SIZE / 2;
  const OUTER_RADIUS = 104;
  const INNER_RADIUS = 68;
  const KNOB_RADIUS = 20;
  const DOT_RADIUS = 3;

  let dial = $state<SVGSVGElement>();
  let dragging = false;

  const marks = $derived(dialMarks(mode, format));
  const hand = $derived(handOf(mode, format, value));
  const tip = $derived(at(hand.angle, hand.inner ? INNER_RADIUS : OUTER_RADIUS));
  /** A minute between two printed ones (23) has no number under the knob, only a dot. */
  const onNumber = $derived(marks.some((mark) => mark.value === value));
  const range = $derived(
    mode === "minute" ? { min: 0, max: 59 } : format === "12h" ? { min: 1, max: 12 } : { min: 0, max: 23 },
  );

  function at(angle: number, radius: number) {
    const radians = (angle * Math.PI) / 180;
    return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) };
  }

  function pick(event: PointerEvent, done: boolean) {
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const half = rect.width / 2;
    onpick(valueAtPoint(mode, format, event.clientX - rect.left - half, event.clientY - rect.top - half, half), done);
  }

  function onpointerdown(event: PointerEvent) {
    dial?.setPointerCapture(event.pointerId);
    dragging = true;
    pick(event, false);
  }

  function onpointermove(event: PointerEvent) {
    if (dragging) pick(event, false);
  }

  function onpointerup(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    pick(event, true);
  }

  function onkeydown(event: KeyboardEvent) {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (delta) onpick(stepValue(mode, format, value, delta), false);
    else if (event.key === "Enter") onpick(value, true);
    else return;
    event.preventDefault();
  }
</script>

<svg
  bind:this={dial}
  viewBox="0 0 {SIZE} {SIZE}"
  class="aspect-square w-64 max-w-full cursor-pointer touch-none rounded-full select-none"
  role="slider"
  tabindex="0"
  aria-label={label}
  aria-valuemin={range.min}
  aria-valuemax={range.max}
  aria-valuenow={value}
  data-clock-dial={mode}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={() => (dragging = false)}
  {onkeydown}
>
  <circle cx={CENTER} cy={CENTER} r={CENTER} class="fill-surface-2" />
  <line x1={CENTER} y1={CENTER} x2={tip.x} y2={tip.y} class="stroke-accent" stroke-width="2" />
  <circle cx={CENTER} cy={CENTER} r="4" class="fill-accent" />
  <circle cx={tip.x} cy={tip.y} r={KNOB_RADIUS} class="fill-accent" />
  {#if !onNumber}
    <circle cx={tip.x} cy={tip.y} r={DOT_RADIUS} class="fill-accent-ink" />
  {/if}
  {#key mode}
    <g in:fade={{ duration: 150 }} pointer-events="none">
      {#each marks as mark (`${mark.inner}-${mark.value}`)}
        {@const spot = at(mark.angle, mark.inner ? INNER_RADIUS : OUTER_RADIUS)}
        <text
          x={spot.x}
          y={spot.y}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={mark.inner ? 14 : 16}
          class="tabular-nums {mark.value === value ? 'fill-accent-ink' : 'fill-ink'}"
        >
          {mark.label}
        </text>
      {/each}
    </g>
  {/key}
</svg>
