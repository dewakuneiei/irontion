<script lang="ts">
  import { NO_NOTES } from "$lib/domain/calendar";
  import { weekdayNames } from "$lib/domain/datetime";
  import { toISODate, todayISO } from "$lib/domain/time";
  import type { NoteDayCount } from "$lib/api/types";
  import { formatDayLabel } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";

  let {
    days,
    month,
    counts,
    selected,
    label,
    onselect,
  }: {
    /** The 42 days to draw, from `monthGrid`. */
    days: readonly Date[];
    /** The month on show (0-11); days of other months are dimmed. */
    month: number;
    counts: ReadonlyMap<string, NoteDayCount>;
    selected: string | null;
    label: string;
    onselect: (iso: string) => void;
  } = $props();

  const weekdays = $derived(weekdayNames(preferences.weekStart, i18n.locale, "short"));
  const today = $derived(todayISO());

  /** "Tuesday, 06/10/2026, 2 notes": what a screen reader says for a cell. */
  function describe(iso: string, count: NoteDayCount): string {
    const parts = [formatDayLabel(iso)];
    if (count.notes > 0) parts.push(t("calendar.dayNotes", { n: count.notes }));
    return parts.join(", ");
  }
</script>

<div role="group" aria-label={label}>
  <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted sm:gap-1.5" aria-hidden="true">
    {#each weekdays as name, index (index)}<span class="truncate py-1">{name}</span>{/each}
  </div>
  <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
    {#each days as date (date.getTime())}
      {@const iso = toISODate(date)}
      {@const count = counts.get(iso) ?? NO_NOTES}
      {@const inMonth = date.getMonth() === month}
      {@const isToday = iso === today}
      <button
        type="button"
        data-date={iso}
        data-notes={count.notes}
        aria-label={describe(iso, count)}
        aria-current={isToday ? "date" : undefined}
        aria-pressed={iso === selected}
        onclick={() => onselect(iso)}
        class="relative flex h-14 min-w-0 flex-col items-center justify-between rounded-xl border px-0.5 py-1.5 transition-colors sm:h-20 sm:items-start sm:px-2 sm:py-2 {iso ===
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface hover:bg-surface-hover'} {inMonth ? '' : 'opacity-45'}"
      >
        <span
          class="grid size-6 place-items-center rounded-full text-[13px] tabular-nums {isToday
            ? 'bg-accent font-semibold text-accent-ink'
            : inMonth
              ? 'font-medium text-ink'
              : 'text-muted'}"
        >
          {date.getDate()}
        </span>
        {#if count.notes > 0}
          <span
            class="min-w-5 self-center rounded-full bg-accent-soft px-1.5 text-center text-[11px] leading-5 font-medium tabular-nums sm:self-end"
          >
            {count.notes}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>
