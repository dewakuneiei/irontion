<script lang="ts">
  import Tag from "@lucide/svelte/icons/tag";
  import type { Tag as TagType } from "$lib/api/types";
  import { t } from "$lib/i18n/index.svelte";

  /**
   * Pick a tag to show only the notes that have it. A column on the right of the board; on a narrow
   * window it moves above the board as one swipeable line (the same chips).
   */
  let {
    tags,
    counts,
    selected,
    total,
    onpick,
  }: {
    /** The tags some note uses. */
    tags: readonly TagType[];
    /** Notes per tag with the search kept; `null` is every note. */
    counts: ReadonlyMap<number | null, number>;
    selected: number | null;
    total: number;
    onpick: (tagId: number | null) => void;
  } = $props();
</script>

<nav
  class="flex gap-1.5 max-[56rem]:overflow-x-auto max-[56rem]:pb-1.5 min-[56rem]:sticky min-[56rem]:top-4 min-[56rem]:flex-col min-[56rem]:gap-0.5"
  aria-label={t("notes.filter.tag")}
  data-tag-panel
>
  <h2 class="mb-1.5 flex items-center gap-2 px-2 text-xs font-medium text-muted max-[56rem]:hidden">
    <Tag size={13} aria-hidden="true" />
    {t("notes.board.tags")}
  </h2>
  {@render item(null, t("notes.filter.anyTag"), counts.get(null) ?? total)}
  {#each tags as tag (tag.id)}
    {@render item(tag.id, `#${tag.name}`, counts.get(tag.id) ?? 0)}
  {/each}
</nav>

{#snippet item(id: number | null, label: string, count: number)}
  <button
    type="button"
    aria-pressed={selected === id}
    data-filter={id === null ? "tag-all" : `tag-${id}`}
    onclick={() => onpick(id)}
    class="flex shrink-0 items-center justify-between gap-3 rounded-full border px-3 py-1 text-[13px] whitespace-nowrap transition-colors min-[56rem]:rounded-lg min-[56rem]:border-transparent min-[56rem]:py-1.5 {selected === id
      ? 'border-accent bg-accent-soft font-medium text-ink'
      : 'border-line text-ink-2 hover:bg-surface-hover'} {count === 0 && selected !== id ? 'opacity-45' : ''}"
  >
    <span class="min-w-0 truncate">{label}</span>
    <span class="text-xs text-muted tabular-nums">{count}</span>
  </button>
{/snippet}
