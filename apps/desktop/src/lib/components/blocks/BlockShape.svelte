<script module lang="ts">
  import { ensureBlockShapeStyles } from "$lib/blockShapeStyles";

  ensureBlockShapeStyles();
</script>

<script lang="ts">
  import type { BlockShape } from "$lib/domain/blockShape";
  import type { FillDirection } from "$lib/preferences.svelte";

  /**
   * One block, drawn in one of the shapes (F001, F003). It fills the box its parent gives it (a
   * square) and never takes pointer events, so hit-testing and drag-select use the whole square.
   * Past = filled, future = outline, current = outline with the time filling it (and the wave).
   * The shapes' clip paths come from one shared stylesheet (`blockShapeStylesheet`).
   */
  let {
    shape,
    phase,
    color,
    progress = 0,
    direction = "right",
    wave = false,
    mark = null,
    cursor = false,
  }: {
    shape: BlockShape;
    phase: "past" | "current" | "future";
    /** The activity's color; without one the block uses neutral colors. */
    color?: string;
    /** How far through its ten minutes the current block is, 0 to 1. */
    progress?: number;
    direction?: FillDirection;
    wave?: boolean;
    /** A ring around the shape: the block that is selected, or the one that is now. */
    mark?: "selected" | "now" | null;
    /** The keyboard cursor, a second ring outside the first. */
    cursor?: boolean;
  } = $props();
</script>

<span class="block {phase}" data-shape={shape} style:--c={color}>
  <span class="block-shape">
    {#if phase === "current"}
      <span class="fill {direction}" class:wave style:--n={progress} style:--p="{progress * 100}%"></span>
    {/if}
  </span>
  {#if phase !== "past"}<span class="block-line"></span>{/if}
  {#if mark}<span class="block-halo" class:selected={mark === "selected"}></span>{/if}
  {#if cursor}<span class="block-cursor"></span>{/if}
</span>

<style>
  /*
    A block is its time: it fills as time passes.
    future  = outline only
    current = outline, filling as its ten minutes go by (4:05 is half)
    past    = filled
    --c is the activity color; empty blocks use neutral colors.
    The shape's clip paths (.block-shape, .block-line, .block-halo, .block-cursor) are in the shared
    stylesheet. Thickness comes from tokens in app.css: --block-edge, --block-gap, --block-ring, --block-bleed.
  */
  .block {
    --line: var(--c, var(--cell-ring));
    --solid: var(--c, var(--surface-2));
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .block-shape {
    position: absolute;
    inset: 0;
    background: var(--cell-bg, transparent);
  }
  .past .block-shape {
    background: var(--cell-bg, var(--solid));
  }
  .block-line {
    position: absolute;
    inset: 0;
    background: var(--line);
  }
  .block-halo,
  .block-cursor {
    position: absolute;
    inset: calc(-1 * var(--block-bleed));
    background: var(--accent);
  }
  .block-halo.selected {
    background: var(--text);
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
    always matches the fill's color. The strip sits just outside the fill (the shape's clip cuts it).
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
</style>
