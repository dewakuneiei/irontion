<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { fly } from "svelte/transition";
  import type { DaySlots } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import { summarizeSelection } from "$lib/domain/slots";
  import { SLOT_MINUTES } from "$lib/domain/time";
  import { formatSlotSpan } from "$lib/format.svelte";
  import { formatMinutes, formatPercent, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let {
    slots,
    selection,
    suggestions,
    moving,
    onallocate,
    onpick,
    ondeallocate,
    onmove,
    onclear,
  }: {
    slots: DaySlots;
    selection: ReadonlySet<number>;
    /** Activity ids to offer first, best first. */
    suggestions: number[];
    moving: boolean;
    onallocate: (activityId: number) => void;
    /** Open the full activity list. */
    onpick: () => void;
    ondeallocate: () => void;
    onmove: () => void;
    onclear: () => void;
  } = $props();

  const summary = $derived(summarizeSelection(slots, selection));
</script>

<section
  class="rounded-2xl border border-line bg-surface p-4 shadow-card"
  aria-labelledby="selection-title"
  in:fly={{ y: 8, duration: 200 }}
>
  <header class="mb-3 flex items-start justify-between gap-3">
    <div>
      <h2 id="selection-title" class="text-sm font-semibold">{t("blocks.selection.title")}</h2>
      {#if summary.span}
        <p class="text-xs text-muted tabular-nums">{formatSlotSpan(summary.span.first, summary.span.last)}</p>
      {/if}
    </div>
    <button
      type="button"
      class="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
      aria-label={t("blocks.selection.clear")}
      title="{t('blocks.selection.clear')} (Esc)"
      onclick={onclear}
    >
      <X size={16} />
    </button>
  </header>

  <dl class="mb-4 grid grid-cols-3 gap-3 text-sm max-[56rem]:mb-3">
    <div>
      <dt class="text-xs text-muted">{t("blocks.selection.blocks")}</dt>
      <dd class="font-semibold tabular-nums">{summary.blocks}</dd>
    </div>
    <div>
      <dt class="text-xs text-muted">{t("blocks.selection.time")}</dt>
      <dd class="font-semibold tabular-nums">{formatMinutes(summary.minutes)}</dd>
    </div>
    <div>
      <dt class="text-xs text-muted">{t("blocks.selection.share")}</dt>
      <dd class="font-semibold tabular-nums">{formatPercent(summary.share)}</dd>
    </div>
  </dl>

  <!-- The activity breakdown needs room, so narrow layouts leave it out. -->
  <h3 class="mb-1.5 text-xs font-medium text-muted max-[56rem]:hidden">{t("blocks.selection.contains")}</h3>
  {#if summary.byActivity.length > 0}
    <ul class="mb-4 flex flex-col gap-1 max-[56rem]:hidden">
      {#each summary.byActivity as [id, blocks] (id)}
        <li class="flex items-center gap-2 text-sm">
          <span class="size-2.5 shrink-0 rounded-[3px]" style:background={catalog.colorOf(id)}></span>
          <span class="min-w-0 flex-1 truncate">{catalog.labelOf(id)}</span>
          <span class="text-ink-2 tabular-nums">{formatMinutes(blocks * SLOT_MINUTES)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="mb-4 text-sm text-ink-2 max-[56rem]:hidden">{t("blocks.selection.nothing")}</p>
  {/if}

  {#if suggestions.length > 0}
    <h3 class="mb-1.5 text-xs font-medium text-muted">{t("blocks.selection.suggestions")}</h3>
    <div class="mb-4 flex flex-wrap gap-1.5 max-[56rem]:mb-3 max-[56rem]:flex-nowrap max-[56rem]:overflow-x-auto max-[56rem]:pb-1">
      {#each suggestions as id, index (id)}
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-accent-soft px-3 text-[13px] font-medium transition-colors hover:bg-surface-hover"
          title={catalog.labelOf(id)}
          onclick={() => onallocate(id)}
        >
          <span class="size-2.5 rounded-full" style:background={catalog.colorOf(id)}></span>
          {catalog.byId.get(id)?.name}
          <kbd class="text-[11px] text-muted">{index + 1}</kbd>
        </button>
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-2 max-[56rem]:grid max-[56rem]:grid-cols-2">
    <Button variant="primary" class="w-full max-[56rem]:col-span-2" title="{t('blocks.selection.allocate')} (A)" onclick={onpick}>
      {t("blocks.selection.allocate")}
    </Button>
    <Button
      class="w-full"
      disabled={summary.filled === 0}
      title={summary.filled === 0 ? t("blocks.selection.nothing") : `${t("blocks.selection.move")} (M)`}
      onclick={onmove}
    >
      {moving ? t("common.cancel") : t("blocks.selection.move")}
    </Button>
    <Button
      variant="ghost"
      class="w-full text-danger"
      title="{t('blocks.selection.deallocate')} (Delete)"
      onclick={ondeallocate}
    >
      {t("blocks.selection.deallocate")}
    </Button>
  </div>
  {#if moving}
    <p class="mt-3 text-xs leading-relaxed text-ink-2" role="status">{t("blocks.selection.moveHint")}</p>
  {/if}
</section>
