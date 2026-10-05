<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { fly } from "svelte/transition";
  import { monthGrid, weekdayNames } from "$lib/domain/datetime";
  import { fromISODate, toISODate, todayISO } from "$lib/domain/time";
  import { formatDayLabel } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";

  let { value, onchange, label }: { value: string; onchange: (iso: string) => void; label: string } = $props();

  let open = $state(false);
  /** First day of the month on show; starts at the selected date's month each time it opens. */
  let shown = $state(new Date());
  let root: HTMLDivElement;

  const days = $derived(monthGrid(shown.getFullYear(), shown.getMonth(), preferences.weekStart));
  const weekdays = $derived(weekdayNames(preferences.weekStart, i18n.locale, "narrow"));
  const monthTitle = $derived(new Intl.DateTimeFormat(i18n.locale, { month: "long", year: "numeric" }).format(shown));
  const today = $derived(todayISO());

  function toggle() {
    if (!open) {
      const selected = fromISODate(value);
      shown = new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    open = !open;
  }

  function stepMonth(delta: number) {
    shown = new Date(shown.getFullYear(), shown.getMonth() + delta, 1);
  }

  function choose(date: Date) {
    open = false;
    onchange(toISODate(date));
  }

  // Close when clicking anywhere else or pressing Escape.
  function onWindowPointer(event: PointerEvent) {
    if (open && !root.contains(event.target as Node)) open = false;
  }
  function onWindowKey(event: KeyboardEvent) {
    if (open && event.key === "Escape") {
      event.preventDefault(); // tells the page this Escape is taken
      open = false;
    }
  }
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />

<div class="relative" bind:this={root}>
  <button
    type="button"
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label={label}
    title={label}
    class="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
    onclick={toggle}
  >
    <CalendarDays size={16} class="text-accent" />
    <span class="tabular-nums">{formatDayLabel(value)}</span>
    <ChevronDown size={15} class="text-muted transition-transform duration-200 {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <div
      role="dialog"
      aria-label={label}
      class="absolute top-full left-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-3 shadow-2xl"
      transition:fly={{ y: -6, duration: 160 }}
    >
      <div class="mb-2 flex items-center justify-between">
        <button type="button" class="nav" aria-label={t("dates.prevMonth")} onclick={() => stepMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span class="text-sm font-semibold">{monthTitle}</span>
        <button type="button" class="nav" aria-label={t("dates.nextMonth")} onclick={() => stepMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div class="grid grid-cols-7 text-center text-[11px] font-medium text-muted" aria-hidden="true">
        {#each weekdays as name, i (i)}<span class="py-1">{name}</span>{/each}
      </div>
      <div class="grid grid-cols-7 gap-0.5">
        {#each days as date (date.getTime())}
          {@const iso = toISODate(date)}
          {@const inMonth = date.getMonth() === shown.getMonth()}
          <button
            type="button"
            data-date={iso}
            aria-label={formatDayLabel(iso)}
            aria-current={iso === today ? "date" : undefined}
            aria-pressed={iso === value}
            class="grid h-9 place-items-center rounded-lg text-sm tabular-nums transition-colors {iso === value
              ? 'bg-accent font-semibold text-accent-ink'
              : iso === today
                ? 'font-semibold text-accent ring-1 ring-accent ring-inset hover:bg-surface-hover'
                : inMonth
                  ? 'text-ink hover:bg-surface-hover'
                  : 'text-muted hover:bg-surface-hover'}"
            onclick={() => choose(date)}
          >
            {date.getDate()}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .nav {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    color: var(--text-2);
  }
  .nav:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
</style>
