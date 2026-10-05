<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Pipette from "@lucide/svelte/icons/pipette";
  import { ACCENT_PRESETS, accentVars } from "$lib/domain/accent";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { theme } from "$lib/theme.svelte";

  const isCustom = $derived(!ACCENT_PRESETS.some((preset) => preset.id === preferences.accent));
  const current = $derived(accentVars(preferences.accent, theme.resolved));
</script>

<div role="radiogroup" aria-label={t("settings.accent.title")} class="flex flex-wrap items-center gap-3">
  {#each ACCENT_PRESETS as preset (preset.id)}
    {@const selected = preferences.accent === preset.id}
    {@const name = t(`settings.accent.names.${preset.id}`)}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      onclick={() => preferences.setAccent(preset.id)}
      class="grid size-9 place-items-center rounded-full transition-transform hover:scale-110 {selected
        ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
        : ''}"
      style:background={preset[theme.resolved]}
    >
      {#if selected}<Check size={16} strokeWidth={3} color={accentVars(preset.id, theme.resolved).ink} />{/if}
    </button>
  {/each}

  <label
    class="relative grid size-9 cursor-pointer place-items-center rounded-full border border-line text-ink-2 transition-transform hover:scale-110 {isCustom
      ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
      : ''}"
    style:background={isCustom ? current.accent : undefined}
    title={t("settings.accent.custom")}
  >
    <Pipette size={16} color={isCustom ? current.ink : undefined} />
    <input
      type="color"
      class="absolute inset-0 cursor-pointer opacity-0"
      value={current.accent}
      oninput={(e) => preferences.setAccent(e.currentTarget.value)}
      aria-label={t("settings.accent.custom")}
    />
  </label>
</div>
