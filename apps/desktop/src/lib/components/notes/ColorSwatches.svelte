<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Pipette from "@lucide/svelte/icons/pipette";
  import type { NoteColor } from "$lib/api/types";
  import { NOTE_COLORS, isCustomColor } from "$lib/domain/notes";
  import { t } from "$lib/i18n/index.svelte";

  /** The paper colors to choose from. Each dot is the color's own step for the current theme. */
  let { value, onpick }: { value: NoteColor; onpick: (color: NoteColor) => void } = $props();

  const isCustom = $derived(isCustomColor(value));
  // Starts the picker on the current palette color's own look when none is custom yet.
  const customValue = $derived(isCustom ? value : "#eda100");
</script>

<div role="radiogroup" aria-label={t("notes.paper.color")} class="flex flex-wrap gap-2">
  {#each NOTE_COLORS as color (color)}
    <button
      type="button"
      role="radio"
      aria-checked={value === color}
      aria-label={t(`notes.colors.${color}`)}
      title={t(`notes.colors.${color}`)}
      data-color={color}
      onclick={() => onpick(color)}
      style:background="var(--note-{color})"
      class="grid size-7 place-items-center rounded-full border-2 text-accent-ink transition-transform hover:scale-110 {value === color
        ? 'border-ink'
        : 'border-transparent'}"
    >
      {#if value === color}<Check size={14} strokeWidth={3} class="text-white mix-blend-difference" aria-hidden="true" />{/if}
    </button>
  {/each}
  <label
    class="relative grid size-7 cursor-pointer place-items-center rounded-full border-2 text-ink-2 transition-transform hover:scale-110 {isCustom
      ? 'border-ink'
      : 'border-line'}"
    style:background={isCustom ? value : undefined}
    title={t("notes.colors.custom")}
  >
    <Pipette size={14} aria-hidden="true" class={isCustom ? "text-white mix-blend-difference" : ""} />
    <input
      type="color"
      data-color="custom"
      class="absolute inset-0 cursor-pointer opacity-0"
      value={customValue}
      oninput={(event) => onpick(event.currentTarget.value as NoteColor)}
      aria-label={t("notes.colors.custom")}
    />
  </label>
</div>
