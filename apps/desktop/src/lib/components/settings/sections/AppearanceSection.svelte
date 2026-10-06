<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Droplet from "@lucide/svelte/icons/droplet";
  import Palette from "@lucide/svelte/icons/palette";
  import { fly } from "svelte/transition";
  import AccentPicker from "$lib/components/settings/AccentPicker.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { THEME_MODES, theme, type ThemeMode } from "$lib/theme.svelte";

  // Mini window previews for each theme card.
  const previewColors: Record<ThemeMode, [string, string, string]> = {
    light: ["#f4f4f1", "#fcfcfb", "var(--accent)"],
    dark: ["#0d0d0d", "#1a1a19", "var(--accent)"],
    system: ["#f4f4f1", "#1a1a19", "var(--accent)"],
  };
</script>

<div class="flex flex-col gap-6">
  <SettingsCard icon={Palette} title={t("settings.appearance.title")} description={t("settings.appearance.description")}>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3" role="radiogroup" aria-label={t("settings.appearance.title")}>
      {#each THEME_MODES as mode (mode)}
        {@const [bg, card, accent] = previewColors[mode]}
        {@const selected = theme.mode === mode}
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onclick={() => theme.set(mode)}
          class="group rounded-xl border-2 p-2 text-left transition-all duration-200 {selected
            ? 'border-accent'
            : 'border-line hover:border-ink-2/30'}"
        >
          <div
            class="relative h-24 overflow-hidden rounded-lg"
            style:background={mode === "system" ? `linear-gradient(135deg, ${bg} 50%, #0d0d0d 50%)` : bg}
          >
            <div class="absolute top-3 left-3 h-full w-12 rounded-md opacity-90" style:background={card}></div>
            <div class="absolute top-3 left-18 h-3 w-16 rounded-full" style:background={accent}></div>
            <div class="absolute top-8 left-18 h-2 w-24 rounded-full opacity-40" style:background={accent}></div>
            <div class="absolute top-12 left-18 h-2 w-20 rounded-full opacity-25" style:background={accent}></div>
          </div>
          <div class="mt-2.5 flex items-center justify-between px-1">
            <span class="text-sm font-medium">{t(`theme.${mode}`)}</span>
            {#if selected}
              <span class="grid size-5 place-items-center rounded-full bg-accent text-accent-ink" in:fly={{ y: 4, duration: 180 }}>
                <Check size={13} strokeWidth={3} />
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    {#if theme.mode === "system"}
      <p class="mt-4 text-sm text-muted" in:fly={{ y: -4, duration: 200 }}>
        {t("settings.appearance.systemHint", { theme: t(`theme.${theme.resolved}`) })}
      </p>
    {/if}
  </SettingsCard>

  <SettingsCard icon={Droplet} index={1} title={t("settings.accent.title")} description={t("settings.accent.description")}>
    <AccentPicker />
  </SettingsCard>
</div>
