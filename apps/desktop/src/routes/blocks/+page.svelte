<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MousePointerClick from "@lucide/svelte/icons/mouse-pointer-click";
  import Shapes from "@lucide/svelte/icons/shapes";
  import { onMount } from "svelte";
  import Button from "$lib/components/Button.svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ActivityPickerModal from "$lib/components/blocks/ActivityPickerModal.svelte";
  import DayGrid from "$lib/components/blocks/DayGrid.svelte";
  import DaySummary from "$lib/components/blocks/DaySummary.svelte";
  import SelectionPanel from "$lib/components/blocks/SelectionPanel.svelte";
  import { assign } from "$lib/domain/slots";
  import { suggestActivities } from "$lib/domain/stats";
  import { addDays, dayProgress, toISODate } from "$lib/domain/time";
  import { formatDayLabel } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { day } from "$lib/stores/day.svelte";
  import { RangeReport } from "$lib/stores/report.svelte";

  const SUGGESTION_COUNT = 5;
  const SUGGESTION_LOOKBACK_DAYS = 14;

  let selection = $state<ReadonlySet<number>>(new Set());
  let moving = $state(false);
  let pickerOpen = $state(false);
  let now = $state(new Date());

  const today = $derived(toISODate(now));
  const time = $derived(dayProgress(day.date, now));
  const isToday = $derived(time.isToday);

  // Recently used activities first, so the usual choice is one click away.
  const recent = new RangeReport();
  const suggestions = $derived(suggestActivities(recent.direct, catalog.assignableIds, SUGGESTION_COUNT));

  $effect(() => {
    void catalog.version;
    void day.version;
    void recent.load(addDays(today, -SUGGESTION_LOOKBACK_DAYS), today);
  });

  // Narrow windows show the options as a sheet over the bottom, so bring the selection above it.
  $effect(() => {
    if (selection.size === 0 || matchMedia("(min-width: 56rem)").matches) return;
    document.getElementById(`cell-${Math.min(...selection)}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  onMount(() => {
    void day.open(day.date);
    // Keep the current block filling as time passes.
    const timer = setInterval(() => (now = new Date()), 15_000);
    return () => clearInterval(timer);
  });

  function openDay(date: string) {
    clearSelection();
    void day.open(date);
  }

  function clearSelection() {
    selection = new Set();
    moving = false;
  }

  function allocate(activityId: number) {
    void day.apply(assign(day.slots, selection, activityId));
    clearSelection();
  }

  /** Clear the selected cells. With nothing allocated in them, this just ends the selection. */
  function deallocate() {
    void day.apply(assign(day.slots, selection, null));
    clearSelection();
  }

  function onWindowKey(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (target.closest("input, textarea, select, dialog, [role=dialog]")) return;
    if (event.key === "Escape") return moving ? (moving = false) : clearSelection();
    if (selection.size === 0) return;

    const key = event.key.toLowerCase();
    const suggested = /^[1-9]$/.test(key) ? suggestions[Number(key) - 1] : undefined;
    if (suggested !== undefined) allocate(suggested);
    else if (key === "delete" || key === "backspace") deallocate();
    else if (key === "a") pickerOpen = true;
    else if (key === "m") moving = !moving;
    else return;
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<h1 class="mb-5 text-3xl font-semibold tracking-tight">{t("blocks.title")}</h1>

<!-- Date controls sit right above the grid they change. -->
<nav class="mb-5 flex flex-wrap items-center gap-2" aria-label={t("blocks.pickDate")}>
  <Button disabled={isToday} onclick={() => openDay(today)}>{t("blocks.today")}</Button>
  <div class="flex">
    <Button variant="ghost" size="icon" aria-label={t("blocks.prevDay")} title={t("blocks.prevDay")} onclick={() => openDay(addDays(day.date, -1))}>
      <ChevronLeft size={18} />
    </Button>
    <Button variant="ghost" size="icon" aria-label={t("blocks.nextDay")} title={t("blocks.nextDay")} onclick={() => openDay(addDays(day.date, 1))}>
      <ChevronRight size={18} />
    </Button>
  </div>
  <DatePicker value={day.date} onchange={openDay} label={t("blocks.pickDate")} />
</nav>

{#if catalog.loaded && catalog.activities.length === 0}
  <EmptyState icon={Shapes} title={t("blocks.noActivities.title")} body={t("blocks.noActivities.body")}>
    {#snippet action()}
      <a href="/activities" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink">
        {t("blocks.noActivities.action")}
      </a>
    {/snippet}
  </EmptyState>
{:else}
  {#if selection.size === 0}
    <!-- Narrow windows stack everything, so the hint goes above the grid. -->
    <div class="mb-4 min-[56rem]:hidden">{@render hint()}</div>
  {/if}
  <div
    class={[
      "grid grid-cols-1 items-start gap-6 min-[56rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)] min-[56rem]:gap-8",
      // Leave room to scroll the grid clear of the bottom sheet.
      selection.size > 0 && "max-[56rem]:pb-[55vh]",
    ]}
  >
    <!-- One column: cap the width so cells don't grow huge on tablets. Two columns: fill the free width. -->
    <section class="mx-auto w-full max-w-[36rem] rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-5 min-[56rem]:max-w-none">
      <DayGrid
        slots={day.slots}
        bind:selection
        bind:moving
        {time}
        label={t("blocks.gridLabel", { date: formatDayLabel(day.date) })}
        onchange={(next) => day.apply(next)}
      />
    </section>

    <aside class="flex flex-col gap-4 min-[56rem]:sticky min-[56rem]:top-4 min-[56rem]:max-h-[calc(100vh-2rem)] min-[56rem]:overflow-y-auto min-[56rem]:pb-2">
      {#if selection.size > 0}
        <div class="sheet">
          <SelectionPanel
            slots={day.slots}
            {selection}
            {suggestions}
            {moving}
            onallocate={allocate}
            onpick={() => (pickerOpen = true)}
            ondeallocate={deallocate}
            onmove={() => (moving = !moving)}
            onclear={clearSelection}
          />
        </div>
      {:else}
        <div class="max-[56rem]:hidden">{@render hint()}</div>
      {/if}

      <div class="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <DaySummary slots={day.slots} />
      </div>
    </aside>
  </div>
{/if}

{#if pickerOpen}
  <ActivityPickerModal onpick={allocate} onclose={() => (pickerOpen = false)} />
{/if}

{#snippet hint()}
  <p class="flex gap-3 rounded-2xl border border-dashed border-line p-4 text-sm leading-relaxed text-ink-2">
    <MousePointerClick size={18} class="mt-0.5 shrink-0 text-accent" />
    {t("blocks.hint")}
  </p>
{/snippet}

<style>
  /* Below 56rem there is no room beside the grid, so the options float over the bottom like a sheet. */
  @media (width < 56rem) {
    .sheet {
      position: fixed;
      z-index: 20;
      inset-inline: 0.75rem;
      bottom: 4.75rem; /* clear of the tab bar */
      max-height: 55vh;
      overflow-y: auto;
      border-radius: 1rem;
      box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
    }
  }
  @media (40rem <= width < 56rem) {
    .sheet {
      bottom: 1rem; /* no tab bar from 40rem up */
      max-width: 32rem;
      margin-inline: auto;
    }
  }
</style>
