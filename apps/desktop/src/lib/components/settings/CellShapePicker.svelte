<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { fly } from "svelte/transition";
  import { t } from "$lib/i18n/index.svelte";
  import { CELL_SHAPES, preferences } from "$lib/preferences.svelte";
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label={t("settings.shape.title")}>
  {#each CELL_SHAPES as shape (shape)}
    {@const selected = preferences.cellShape === shape}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onclick={() => preferences.setCellShape(shape)}
      class="rounded-xl border-2 p-3 text-left transition-colors duration-200 {selected
        ? 'border-accent'
        : 'border-line hover:border-ink-2/30'}"
    >
      <!-- A small sample of the grid: two filled blocks, one selected, the rest hollow. -->
      <div class="grid w-fit grid-cols-4 gap-1.5 rounded-lg bg-surface-2 p-3" aria-hidden="true">
        {#each [0, 1, 2, 3, 4, 5, 6, 7] as cell (cell)}
          <span
            class="size-6 {shape === 'circle' ? 'rounded-full' : 'rounded-md'} {cell < 2
              ? 'bg-accent'
              : cell === 2
                ? 'bg-surface ring-2 ring-ink'
                : 'border-2 border-line'}"
          ></span>
        {/each}
      </div>
      <div class="mt-2.5 flex items-center justify-between px-0.5">
        <span class="text-sm font-medium">{t(`settings.shape.${shape}`)}</span>
        {#if selected}
          <span class="grid size-5 place-items-center rounded-full bg-accent text-accent-ink" in:fly={{ y: 4, duration: 180 }}>
            <Check size={13} strokeWidth={3} />
          </span>
        {/if}
      </div>
    </button>
  {/each}
</div>
