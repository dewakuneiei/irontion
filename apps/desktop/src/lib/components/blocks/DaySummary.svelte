<script lang="ts">
  import { flip } from "svelte/animate";
  import type { DaySlots } from "$lib/api/types";
  import { countByActivity } from "$lib/domain/slots";
  import { SLOTS_PER_DAY, SLOT_MINUTES } from "$lib/domain/time";
  import { buildTree, flatten, rollUp } from "$lib/domain/tree";
  import { formatMinutes, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let { slots }: { slots: DaySlots } = $props();

  // Archived activities can still own blocks on this day, so include them.
  const tree = $derived(buildTree(catalog.activities, true));
  const totals = $derived(rollUp(tree, countByActivity(slots)));
  const tracked = $derived(slots.filter((s) => s !== null).length);
  const rows = $derived(flatten(tree).filter((n) => (totals.get(n.activity.id) ?? 0) > 0));
</script>

<section aria-labelledby="day-summary-title">
  <h2 id="day-summary-title" class="mb-3 text-sm font-semibold">{t("blocks.summary.title")}</h2>

  <div class="mb-4 flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
    {#each flatten(tree).filter((n) => n.depth === 1 && (totals.get(n.activity.id) ?? 0) > 0) as node (node.activity.id)}
      <span
        class="h-full transition-[width] duration-300"
        style:width="{((totals.get(node.activity.id) ?? 0) / SLOTS_PER_DAY) * 100}%"
        style:background={catalog.colorOf(node.activity.id)}
      ></span>
    {/each}
  </div>

  <dl class="mb-4 grid grid-cols-2 gap-3 text-sm">
    <div>
      <dt class="text-muted">{t("blocks.summary.tracked")}</dt>
      <dd class="font-semibold tabular-nums">{formatMinutes(tracked * SLOT_MINUTES)}</dd>
    </div>
    <div>
      <dt class="text-muted">{t("blocks.summary.free")}</dt>
      <dd class="font-semibold tabular-nums">{formatMinutes((SLOTS_PER_DAY - tracked) * SLOT_MINUTES)}</dd>
    </div>
  </dl>

  {#if rows.length === 0}
    <p class="text-sm text-muted">{t("blocks.summary.empty")}</p>
  {:else}
    <ul class="flex flex-col gap-1.5">
      {#each rows as node (node.activity.id)}
        {@const total = totals.get(node.activity.id) ?? 0}
        <li
          class="flex items-center gap-2 text-sm {node.depth === 1 ? 'font-medium' : 'text-ink-2'}"
          style:padding-left="{(node.depth - 1) * 14}px"
          animate:flip={{ duration: 200 }}
        >
          <span class="size-2.5 shrink-0 rounded-full" style:background={catalog.colorOf(node.activity.id)}></span>
          <span class="min-w-0 flex-1 truncate">{node.activity.name}</span>
          <span class="tabular-nums">{formatMinutes(total * SLOT_MINUTES)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>
