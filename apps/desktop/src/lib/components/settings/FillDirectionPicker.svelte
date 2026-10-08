<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { fly } from "svelte/transition";
  import BlockShape from "$lib/components/blocks/BlockShape.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { FILL_DIRECTIONS, preferences } from "$lib/preferences.svelte";
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={t("settings.fill.title")}>
  {#each FILL_DIRECTIONS as direction (direction)}
    {@const selected = preferences.fillDirection === direction}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onclick={() => preferences.setFillDirection(direction)}
      class="rounded-xl border-2 p-3 text-left transition-colors duration-200 {selected
        ? 'border-accent'
        : 'border-line hover:border-ink-2/30'}"
    >
      <!-- A block half way through, filling the way this option says. -->
      <div class="relative size-12" aria-hidden="true">
        <BlockShape shape={preferences.cellShape} phase="current" progress={0.5} {direction} color="var(--accent)" />
      </div>
      <div class="mt-2.5 flex items-center justify-between gap-2">
        <span class="text-sm font-medium">{t(`settings.fill.${direction}`)}</span>
        {#if selected}
          <span class="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink" in:fly={{ y: 4, duration: 180 }}>
            <Check size={13} strokeWidth={3} />
          </span>
        {/if}
      </div>
    </button>
  {/each}
</div>
