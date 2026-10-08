<script lang="ts">
  import { NO_NOTES } from "$lib/domain/calendar";
  import { weekdayNames } from "$lib/domain/datetime";
  import { toISODate, todayISO } from "$lib/domain/time";
  import type { DaySticker, NoteDayCount } from "$lib/api/types";
  import StickerImage from "$lib/components/stickers/StickerImage.svelte";
  import { formatDayLabel } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { stickers as library } from "$lib/stores/stickers.svelte";

  let {
    days,
    month,
    counts,
    stickers,
    selected,
    label,
    onselect,
  }: {
    /** The 42 days to draw, from `monthGrid`. */
    days: readonly Date[];
    /** The month on show (0-11); days of other months are dimmed. */
    month: number;
    counts: ReadonlyMap<string, NoteDayCount>;
    /** Each day's stickers, in order. */
    stickers: ReadonlyMap<string, readonly DaySticker[]>;
    selected: string | null;
    label: string;
    onselect: (iso: string) => void;
  } = $props();

  const weekdays = $derived(weekdayNames(preferences.weekStart, i18n.locale, "short"));
  const today = $derived(todayISO());

  /** Stickers a cell shows on a wide screen, overlapping a little; a phone shows the first. */
  const SHOWN_STICKERS = 2;
  const NONE: readonly DaySticker[] = [];

  /** "Tuesday, 06/10/2026, 2 notes, Star, Cat": what a screen reader says for a cell. */
  function describe(iso: string, count: NoteDayCount, placed: readonly DaySticker[]): string {
    const parts = [formatDayLabel(iso)];
    if (count.notes > 0) parts.push(t("calendar.dayNotes", { n: count.notes }));
    for (const item of placed) {
      const name = library.face(item.sticker)?.name;
      if (name) parts.push(name);
    }
    return parts.join(", ");
  }
</script>

{#snippet noteCount(n: number)}
  <span class="block min-w-5 rounded-full bg-accent-soft px-1.5 text-center text-[11px] leading-5 font-medium tabular-nums">{n}</span>
{/snippet}

<div role="group" aria-label={label}>
  <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted sm:gap-1.5" aria-hidden="true">
    {#each weekdays as name, index (index)}<span class="truncate py-1">{name}</span>{/each}
  </div>
  <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
    {#each days as date (date.getTime())}
      {@const iso = toISODate(date)}
      {@const count = counts.get(iso) ?? NO_NOTES}
      {@const placed = stickers.get(iso) ?? NONE}
      {@const inMonth = date.getMonth() === month}
      {@const isToday = iso === today}
      <button
        type="button"
        data-date={iso}
        data-notes={count.notes}
        data-stickers={placed.length}
        aria-label={describe(iso, count, placed)}
        aria-current={isToday ? "date" : undefined}
        aria-pressed={iso === selected}
        onclick={() => onselect(iso)}
        class="relative flex h-14 min-w-0 flex-col items-center justify-between rounded-xl border px-0.5 py-1.5 transition-colors sm:h-20 sm:items-start sm:px-2 sm:py-2 {iso ===
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface hover:bg-surface-hover'} {inMonth ? '' : 'opacity-45'}"
      >
        <!-- Wide: the note count sits beside the date and the stickers get the bottom row.
             Narrow: the first sticker and the count share the bottom row. -->
        <span class="flex w-full min-w-0 items-center justify-center sm:justify-between">
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full text-[13px] tabular-nums {isToday
              ? 'bg-accent font-semibold text-accent-ink'
              : inMonth
                ? 'font-medium text-ink'
                : 'text-muted'}"
          >
            {date.getDate()}
          </span>
          {#if count.notes > 0}
            <span class="max-sm:hidden" aria-hidden="true">{@render noteCount(count.notes)}</span>
          {/if}
        </span>
        {#if count.notes > 0 || placed.length > 0}
          <span class="flex w-full min-w-0 items-center justify-center gap-0.5 sm:justify-start" aria-hidden="true">
            {#each placed.slice(0, SHOWN_STICKERS) as item, index (item.id)}
              <StickerImage sticker={item.sticker} decorative class="size-4 rounded-sm sm:size-5 {index > 0 ? 'max-sm:hidden sm:-ml-1.5' : ''}" />
            {/each}
            {#if placed.length > SHOWN_STICKERS}
              <span class="text-[10px] text-muted tabular-nums max-sm:hidden">+{placed.length - SHOWN_STICKERS}</span>
            {/if}
            {#if count.notes > 0}
              <span class="sm:hidden">{@render noteCount(count.notes)}</span>
            {/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>
