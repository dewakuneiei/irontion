<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { fly } from "svelte/transition";
  import type { DaySticker, Note } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import NoteCard from "$lib/components/notes/NoteCard.svelte";
  import DayStickers from "$lib/components/stickers/DayStickers.svelte";
  import { formatDayLabel } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notes } from "$lib/stores/notes.svelte";

  /**
   * One day: its stickers, then its notes (many of each are allowed). Opening a note, or Add note,
   * shows the paper in their place.
   */
  let {
    date,
    stickers,
    onopen,
    onadd,
    onclose,
  }: {
    date: string;
    stickers: readonly DaySticker[];
    onopen: (note: Note) => void;
    onadd: () => void;
    onclose: () => void;
  } = $props();

  const items = $derived(notes.on(date));
</script>

<section class="rounded-2xl border border-line bg-surface p-4 shadow-card" aria-labelledby="day-title" in:fly={{ y: 8, duration: 200 }}>
  <header class="mb-3 flex items-start justify-between gap-3">
    <h2 id="day-title" class="min-w-0 text-sm font-semibold">{formatDayLabel(date)}</h2>
    <button
      type="button"
      class="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
      aria-label={t("calendar.panel.close")}
      title="{t('calendar.panel.close')} (Esc)"
      onclick={onclose}
    >
      <X size={16} />
    </button>
  </header>

  <div class="mb-4 border-b border-line pb-4">
    <DayStickers {date} placed={stickers} />
  </div>

  {#if items.length > 0}
    <!-- Room between sheets for the tape. -->
    <ul class="mb-4 flex flex-col gap-6 px-1 pt-2" aria-label={t("calendar.panel.list", { date: formatDayLabel(date) })}>
      {#each items as note (note.id)}
        <li><NoteCard {note} onopen={() => onopen(note)} /></li>
      {/each}
    </ul>
  {:else}
    <p class="mb-3 text-sm text-ink-2">{t("calendar.panel.empty")}</p>
  {/if}

  <Button variant="primary" class="w-full" onclick={onadd}>
    <Plus size={16} />
    {t("calendar.panel.add")}
  </Button>
</section>
