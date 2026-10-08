<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { fly } from "svelte/transition";
  import BlockShape from "$lib/components/blocks/BlockShape.svelte";
  import { BLOCK_SHAPES } from "$lib/domain/blockShape";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
</script>

<div class="grid grid-cols-2 gap-3 sm:gap-4 min-[56rem]:grid-cols-4" role="radiogroup" aria-label={t("settings.shape.title")}>
  {#each BLOCK_SHAPES as shape (shape)}
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
      <!-- A block half way through its ten minutes, drawn by the same component as the grid. -->
      <div class="grid place-items-center rounded-lg bg-surface-2 py-4" aria-hidden="true">
        <div class="relative size-14">
          <BlockShape {shape} phase="current" progress={0.5} direction={preferences.fillDirection} color="var(--accent)" />
        </div>
      </div>
      <div class="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <span class="text-sm font-medium">{t(`settings.shape.${shape}`)}</span>
        {#if selected}
          <span class="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink" in:fly={{ y: 4, duration: 180 }}>
            <Check size={13} strokeWidth={3} />
          </span>
        {/if}
      </div>
    </button>
  {/each}
</div>
