<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { monthGrid, weekdayNames } from "$lib/domain/datetime";
  import { fromISODate, toISODate, todayISO } from "$lib/domain/time";
  import { formatDayLabel } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import Modal from "./Modal.svelte";

  let {
    value,
    onchange,
    label,
    text,
  }: {
    value: string;
    onchange: (iso: string) => void;
    label: string;
    /** What the button says, when it should name the action ("Move to another day") instead of the date. */
    text?: string;
  } = $props();

  /**
   * The calendar opens in its own dialog, never as a popover: inside another dialog or a scrolling
   * container a popover gets clipped (it hid behind the footer of the note editor).
   */
  let open = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let wasOpen = false;

  // The dialog leaves the page when it closes, so hand focus back to the button that opened it
  // (keyboard users, and Esc on the page around it, keep working).
  $effect(() => {
    if (open) wasOpen = true;
    else if (wasOpen) {
      wasOpen = false;
      trigger?.focus();
    }
  });
  /** First day of the month on show; starts at the selected date's month each time it opens. */
  let shown = $state(new Date());

  const days = $derived(monthGrid(shown.getFullYear(), shown.getMonth(), preferences.weekStart));
  const weekdays = $derived(weekdayNames(preferences.weekStart, i18n.locale, "narrow"));
  const monthTitle = $derived(new Intl.DateTimeFormat(i18n.locale, { month: "long", year: "numeric" }).format(shown));
  const today = $derived(todayISO());

  function show() {
    const selected = fromISODate(value);
    shown = new Date(selected.getFullYear(), selected.getMonth(), 1);
    open = true;
  }

  function stepMonth(delta: number) {
    shown = new Date(shown.getFullYear(), shown.getMonth() + delta, 1);
  }

  function choose(date: Date) {
    open = false;
    onchange(toISODate(date));
  }
</script>

<button
  bind:this={trigger}
  type="button"
  aria-haspopup="dialog"
  aria-label={label}
  title={label}
  class="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
  onclick={show}
>
  <CalendarDays size={16} class="text-accent" />
  <span class="tabular-nums">{text ?? formatDayLabel(value)}</span>
</button>

{#if open}
  <Modal bind:open title={label} width="sm">
    <div class="mb-2 flex items-center justify-between">
      <button type="button" class="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-hover hover:text-ink" aria-label={t("dates.prevMonth")} onclick={() => stepMonth(-1)}>
        <ChevronLeft size={16} />
      </button>
      <span class="text-sm font-semibold">{monthTitle}</span>
      <button type="button" class="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-hover hover:text-ink" aria-label={t("dates.nextMonth")} onclick={() => stepMonth(1)}>
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
          class="grid h-10 place-items-center rounded-lg text-sm tabular-nums transition-colors {iso === value
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
    {#snippet footer()}
      <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface-hover" onclick={() => choose(new Date())}>
        {t("calendar.today")}
      </button>
    {/snippet}
  </Modal>
{/if}
