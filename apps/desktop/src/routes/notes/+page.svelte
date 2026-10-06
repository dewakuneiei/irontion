<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import StickyNote from "@lucide/svelte/icons/sticky-note";
  import X from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import NoteBoard from "$lib/components/notes/NoteBoard.svelte";
  import NoteTagPanel from "$lib/components/notes/NoteTagPanel.svelte";
  import { NO_FILTER, countTags, filterNotes, isFiltering, splitPinned, tagIdsInUse, type NotesFilter } from "$lib/domain/notes";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  let filter = $state<NotesFilter>({ ...NO_FILTER });

  const tagNames = $derived(new Map(catalog.tags.map((tag) => [tag.id, tag.name])));
  const shown = $derived(filterNotes(notes.all, filter, tagNames));
  const { pinned, others } = $derived(splitPinned(shown));
  const usedTags = $derived(catalog.tags.filter((tag) => tagIdsInUse(notes.all).has(tag.id)));
  const tagCounts = $derived(countTags(notes.all, filter, tagNames, usedTags.map((tag) => tag.id)));
  const filtering = $derived(isFiltering(filter));
  /** The order is the user's to set, and a filtered list is only part of it: no dragging then. */
  const reorderable = $derived(!filtering);

  onMount(() => {
    notes.ensureLoaded().catch((err) => notices.error(err));
  });

  async function reorder(ids: number[]) {
    try {
      await notes.reorder(ids);
    } catch (err) {
      notices.error(err);
    }
  }
</script>

<PageHeader title={t("notes.title")} subtitle={t("notes.subtitle")}>
  {#snippet actions()}
    <a href="/notes/new" class="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink hover:brightness-110">
      <Plus size={16} />
      {t("notes.new")}
    </a>
  {/snippet}
</PageHeader>

{#if notes.loaded && notes.all.length === 0}
  <EmptyState icon={StickyNote} title={t("notes.empty.title")} body={t("notes.empty.body")}>
    {#snippet action()}
      <a href="/notes/new" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink">
        {t("notes.empty.action")}
      </a>
    {/snippet}
  </EmptyState>
{:else if notes.loaded}
  <label class="relative mb-5 block max-w-md">
    <Search size={16} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
    <input
      type="search"
      bind:value={filter.query}
      aria-label={t("notes.search.label")}
      placeholder={t("notes.search.placeholder")}
      class="h-10 w-full rounded-lg border border-line bg-surface pr-9 pl-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
    />
    {#if filter.query}
      <button
        type="button"
        class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
        aria-label={t("notes.clearFilters")}
        onclick={() => (filter.query = "")}
      >
        <X size={14} />
      </button>
    {/if}
  </label>

  <!-- The tag panel is on the right; under 896px it moves above the board. -->
  <div class="grid grid-cols-1 items-start gap-5 min-[56rem]:grid-cols-[minmax(0,1fr)_13rem] min-[56rem]:gap-8">
    <div class="min-w-0 max-[56rem]:order-2">
      <div class="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <p role="status">{t("notes.shown", { shown: shown.length, total: notes.all.length })}</p>
        {#if filtering}
          <button type="button" class="font-medium text-accent hover:underline" onclick={() => (filter = { ...NO_FILTER })}>
            {t("notes.clearFilters")}
          </button>
        {:else}
          <span class="max-sm:hidden">{t("notes.board.dragHint")}</span>
        {/if}
      </div>

      {#if shown.length === 0}
        <div class="flex flex-col items-center gap-3 py-10 text-center">
          <p class="text-sm text-ink-2">{t("notes.noMatch")}</p>
          <Button size="sm" onclick={() => (filter = { ...NO_FILTER })}>{t("notes.clearFilters")}</Button>
        </div>
      {:else}
        {#if pinned.length > 0}
          <section class="mb-8" aria-labelledby="group-pinned" data-group="pinned">
            <h2 id="group-pinned" class="mb-2 text-xs font-medium text-muted">{t("notes.board.pinned")}</h2>
            <NoteBoard notes={pinned} {reorderable} onreorder={reorder} />
          </section>
        {/if}
        {#if others.length > 0}
          <section aria-labelledby="group-others" data-group="others">
            {#if pinned.length > 0}<h2 id="group-others" class="mb-2 text-xs font-medium text-muted">{t("notes.board.others")}</h2>{/if}
            <NoteBoard notes={others} {reorderable} onreorder={reorder} />
          </section>
        {/if}
      {/if}
    </div>

    <aside class="min-w-0 max-[56rem]:order-1">
      <NoteTagPanel
        tags={usedTags}
        counts={tagCounts}
        selected={filter.tagId}
        total={notes.all.length}
        onpick={(id) => (filter.tagId = id)}
      />
    </aside>
  </div>
{/if}
