<script lang="ts">
  import SmilePlus from "@lucide/svelte/icons/smile-plus";
  import X from "@lucide/svelte/icons/x";
  import { scale } from "svelte/transition";
  import type { DaySticker } from "$lib/api/types";
  import { MAX_DAY_STICKERS } from "$lib/domain/stickers";
  import { formatDayLabel } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { stickers } from "$lib/stores/stickers.svelte";
  import StickerImage from "./StickerImage.svelte";
  import StickerPickerModal from "./StickerPickerModal.svelte";

  /** A day's stickers (F007), each with a way to take it off, and a button to add one. */
  let { date, placed }: { date: string; placed: readonly DaySticker[] } = $props();

  let picking = $state(false);
  const full = $derived(placed.length >= MAX_DAY_STICKERS);

  function takeOff(item: DaySticker) {
    stickers.takeOff(item.id).catch((err) => notices.error(err));
  }
</script>

<ul class="flex flex-wrap items-center gap-2" aria-label={t("stickers.onDay", { date: formatDayLabel(date) })} data-day-stickers>
  {#each placed as item (item.id)}
    {@const name = stickers.face(item.sticker)?.name ?? ""}
    <li class="group relative" in:scale={{ start: 0.6, duration: 200 }}>
      <StickerImage sticker={item.sticker} class="size-11 rounded-md" />
      <button
        type="button"
        class="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-line bg-surface text-muted opacity-0 shadow-card transition-opacity group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label={t("stickers.remove", { name })}
        title={t("stickers.remove", { name })}
        onclick={() => takeOff(item)}
      >
        <X size={11} />
      </button>
    </li>
  {/each}
  <li>
    <button
      type="button"
      disabled={full}
      title={full ? t("errors.tooManyStickers") : t("stickers.add")}
      onclick={() => (picking = true)}
      data-sticker-add
      class="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-line px-3 text-[13px] text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-50"
    >
      <SmilePlus size={16} />
      {t("stickers.add")}
    </button>
  </li>
</ul>

{#if picking}
  <StickerPickerModal {date} onclose={() => (picking = false)} />
{/if}
