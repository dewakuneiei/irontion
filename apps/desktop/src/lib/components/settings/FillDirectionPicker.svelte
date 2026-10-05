<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { fly } from "svelte/transition";
  import { t } from "$lib/i18n/index.svelte";
  import { FILL_DIRECTIONS, preferences, type FillDirection } from "$lib/preferences.svelte";

  // The half-filled sample: which edge the fill starts from, for each direction.
  const sample: Record<FillDirection, string> = {
    up: "inset-x-0 bottom-0 h-1/2",
    down: "inset-x-0 top-0 h-1/2",
    right: "inset-y-0 left-0 w-1/2",
    left: "inset-y-0 right-0 w-1/2",
  };
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
      <!-- A block four minutes... five minutes in, filling the way this option says. -->
      <div
        class="relative size-12 overflow-hidden border-2 border-line bg-surface {preferences.cellShape === 'circle'
          ? 'rounded-full'
          : 'rounded-lg'}"
        aria-hidden="true"
      >
        <span class="absolute bg-accent {sample[direction]}"></span>
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
