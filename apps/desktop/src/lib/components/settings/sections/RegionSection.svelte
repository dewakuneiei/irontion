<script lang="ts">
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import Check from "@lucide/svelte/icons/check";
  import Languages from "@lucide/svelte/icons/languages";
  import { fly } from "svelte/transition";
  import DateTimeSettings from "$lib/components/settings/DateTimeSettings.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { LOCALES, i18n, t, type LocalePref } from "$lib/i18n/index.svelte";

  const languageOptions: { pref: LocalePref; name: string; hint?: string }[] = $derived([
    {
      pref: "system",
      name: t("settings.language.system"),
      hint: t("settings.language.detected", { name: i18n.nameOf(i18n.systemLocale) }),
    },
    ...LOCALES.map((l) => ({ pref: l.code, name: l.name })),
  ]);
</script>

<div class="flex flex-col gap-6">
  <SettingsCard icon={CalendarClock} title={t("settings.dateTime.title")} description={t("settings.dateTime.description")}>
    <DateTimeSettings />
  </SettingsCard>

  <SettingsCard icon={Languages} index={1} title={t("settings.language.title")} description={t("settings.language.description")}>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("settings.language.title")}>
      {#each languageOptions as option (option.pref)}
        {@const selected = i18n.pref === option.pref}
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onclick={() => i18n.set(option.pref)}
          lang={option.pref === "system" ? undefined : option.pref}
          class="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors {option.pref ===
          'system'
            ? 'sm:col-span-2'
            : ''} {selected
            ? 'border-accent bg-accent-soft'
            : 'border-line hover:bg-surface-hover'}"
        >
          <span>
            <span class="block text-sm font-medium">{option.name}</span>
            {#if option.hint}<span class="block text-xs text-muted">{option.hint}</span>{/if}
          </span>
          {#if selected}
            <span class="text-accent" in:fly={{ x: -4, duration: 180 }}><Check size={18} strokeWidth={2.5} /></span>
          {/if}
        </button>
      {/each}
    </div>
  </SettingsCard>
</div>
