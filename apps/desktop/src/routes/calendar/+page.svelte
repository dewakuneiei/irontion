<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MousePointerClick from "@lucide/svelte/icons/mouse-pointer-click";
  import { onMount } from "svelte";
  import type { Note, NoteDayCount } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import DayPanel from "$lib/components/calendar/DayPanel.svelte";
  import MonthGrid from "$lib/components/calendar/MonthGrid.svelte";
  import NotePaper from "$lib/components/notes/NotePaper.svelte";
  import { countsByDate, stepMonth, visibleRange } from "$lib/domain/calendar";
  import { monthGrid } from "$lib/domain/datetime";
  import { fromISODate, todayISO } from "$lib/domain/time";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  const now = new Date();
  /** First day of the month on show. */
  let shown = $state(new Date(now.getFullYear(), now.getMonth(), 1));
  let selected = $state<string | null>(null);
  /** The paper open in the day panel: a note to edit, `null` for a new one, `undefined` for none. */
  let paper = $state<{ note: Note | null } | undefined>(undefined);
  let counts = $state<ReadonlyMap<string, NoteDayCount>>(new Map());

  const days = $derived(monthGrid(shown.getFullYear(), shown.getMonth(), preferences.weekStart));
  const monthTitle = $derived(new Intl.DateTimeFormat(i18n.locale, { month: "long", year: "numeric" }).format(shown));
  const isThisMonth = $derived(shown.getFullYear() === now.getFullYear() && shown.getMonth() === now.getMonth());
  const writing = $derived(selected !== null && paper !== undefined);

  onMount(() => {
    notes.ensureLoaded().catch((err) => notices.error(err));
  });

  // The counts come from the backend for the days on show, and again after any note changes.
  let countRequest = 0;
  $effect(() => {
    void notes.version;
    const { from, to } = visibleRange(days);
    const request = ++countRequest;
    notes
      .monthCounts(from, to)
      .then((result) => {
        if (request === countRequest) counts = countsByDate(result);
      })
      .catch((err) => notices.error(err));
  });

  function selectDay(iso: string) {
    selected = iso;
    paper = undefined;
  }

  function goToday() {
    shown = new Date(now.getFullYear(), now.getMonth(), 1);
    selectDay(todayISO());
  }

  function closeDay() {
    selected = null;
    paper = undefined;
  }

  /** A note moved to another day: follow it, so Back shows the day it is on now. */
  function followMove(iso: string) {
    selected = iso;
    const day = fromISODate(iso);
    shown = new Date(day.getFullYear(), day.getMonth(), 1);
  }

  function onWindowKey(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("input, textarea, select, dialog, [role=dialog], [data-paper-editor]")) return;
    if (event.key === "Escape" && selected !== null && paper === undefined) closeDay();
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} />

<!-- While writing on a narrow window, the paper takes over the page; the month comes back with Back. -->
<nav class="mb-5 flex flex-wrap items-center gap-2 {writing ? 'max-[56rem]:hidden' : ''}" aria-label={t("calendar.title")}>
  <Button disabled={isThisMonth && selected === todayISO()} onclick={goToday}>{t("calendar.today")}</Button>
  <div class="flex">
    <Button variant="ghost" size="icon" aria-label={t("dates.prevMonth")} title={t("dates.prevMonth")} onclick={() => (shown = stepMonth(shown, -1))}>
      <ChevronLeft size={18} />
    </Button>
    <Button variant="ghost" size="icon" aria-label={t("dates.nextMonth")} title={t("dates.nextMonth")} onclick={() => (shown = stepMonth(shown, 1))}>
      <ChevronRight size={18} />
    </Button>
  </div>
  <h2 class="min-w-0 text-lg font-semibold tracking-tight" aria-live="polite" data-month>{monthTitle}</h2>
</nav>

<div
  class={[
    "grid grid-cols-1 items-start gap-6 min-[56rem]:gap-8",
    writing ? "min-[56rem]:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]" : "min-[56rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)]",
    // Leave room to scroll the grid clear of the bottom sheet.
    selected !== null && !writing && "max-[56rem]:pb-[55vh]",
  ]}
>
  <section class="min-w-0 rounded-2xl border border-line bg-surface p-2 shadow-card sm:p-4 {writing ? 'max-[56rem]:hidden' : ''}">
    <MonthGrid {days} month={shown.getMonth()} {counts} {selected} label={t("calendar.gridLabel", { month: monthTitle })} onselect={selectDay} />
  </section>

  <aside class="flex min-w-0 flex-col gap-4 min-[56rem]:sticky min-[56rem]:top-4 min-[56rem]:max-h-[calc(100vh-2rem)] min-[56rem]:overflow-y-auto min-[56rem]:px-2 min-[56rem]:pt-2 min-[56rem]:pb-4">
    {#if selected !== null && paper !== undefined}
      <!-- Editing is never a bottom sheet: the paper sits in the panel, or fills the page when narrow. -->
      {#key paper.note?.id ?? "new"}
        <NotePaper note={paper.note} date={selected} place="calendar" onback={() => (paper = undefined)} onmoved={followMove} />
      {/key}
    {:else if selected !== null}
      <div class="sheet">
        <DayPanel date={selected} onopen={(note) => (paper = { note })} onadd={() => (paper = { note: null })} onclose={closeDay} />
      </div>
    {:else}
      <p class="flex gap-3 rounded-2xl border border-dashed border-line p-4 text-sm leading-relaxed text-ink-2 max-[56rem]:hidden">
        <MousePointerClick size={18} class="mt-0.5 shrink-0 text-accent" />
        {t("calendar.hint")}
      </p>
    {/if}
  </aside>
</div>

<style>
  /* Below 56rem there is no room beside the grid, so the day's list floats over the bottom like a sheet (as on Blocks). */
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
