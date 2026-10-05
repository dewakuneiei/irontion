<script lang="ts">
  import type { Tag } from "$lib/api/types";

  let {
    tag,
    selected,
    onclick,
  }: {
    tag: Tag;
    /** When set, the chip is a toggle button. */
    selected?: boolean;
    onclick?: () => void;
  } = $props();

  const dot = $derived(tag.color ?? "var(--muted)");
</script>

{#if onclick}
  <button
    type="button"
    aria-pressed={selected}
    {onclick}
    class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition-colors {selected
      ? 'border-accent bg-accent-soft text-ink'
      : 'border-line text-ink-2 hover:bg-surface-hover'}"
  >
    <span class="size-2 rounded-full" style:background={dot}></span>
    {tag.name}
  </button>
{:else}
  <span class="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-2 px-2 text-xs text-ink-2">
    <span class="size-1.5 rounded-full" style:background={dot}></span>
    {tag.name}
  </span>
{/if}
