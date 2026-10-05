<script lang="ts">
  let { size = 28 }: { size?: number } = $props();

  // A 3×3 grid of time blocks, partly filled: the Blocos idea in one mark.
  const filled = new Set([0, 1, 2, 3, 4, 6]);
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="var(--accent)" />
  {#each Array(9) as _, i (i)}
    <rect
      x={6 + (i % 3) * 7.5}
      y={6 + Math.floor(i / 3) * 7.5}
      width="5.5"
      height="5.5"
      rx="1.6"
      fill="white"
      opacity={filled.has(i) ? 1 : 0.32}
    />
  {/each}
</svg>
