<script lang="ts">
  import { getVersion } from "@tauri-apps/api/app";
  import { isTauri } from "@tauri-apps/api/core";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import Check from "@lucide/svelte/icons/check";
  import Droplet from "@lucide/svelte/icons/droplet";
  import Info from "@lucide/svelte/icons/info";
  import Languages from "@lucide/svelte/icons/languages";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import StickyNote from "@lucide/svelte/icons/sticky-note";
  import Timer from "@lucide/svelte/icons/timer";
  import Palette from "@lucide/svelte/icons/palette";
  import { onMount } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import Logo from "$lib/components/Logo.svelte";
  import Toggle from "$lib/components/Toggle.svelte";
  import AccentPicker from "$lib/components/settings/AccentPicker.svelte";
  import NotePaperPicker from "$lib/components/settings/NotePaperPicker.svelte";
  import CellShapePicker from "$lib/components/settings/CellShapePicker.svelte";
  import FillDirectionPicker from "$lib/components/settings/FillDirectionPicker.svelte";
  import DangerZone from "$lib/components/settings/DangerZone.svelte";
  import DateTimeSettings from "$lib/components/settings/DateTimeSettings.svelte";
  import { LOCALES, i18n, t, type LocalePref } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { THEME_MODES, theme, type ThemeMode } from "$lib/theme.svelte";

  // The license asks everyone who uses Irontion to credit these (see LICENSE).
  const AUTHOR = "dewakuneiei";
  const AUTHOR_URL = "https://github.com/dewakuneiei";
  const REPO_URL = "https://github.com/dewakuneiei/irontion";

  let version = $state("0.1.0");
  onMount(async () => {
    if (isTauri()) version = await getVersion();
  });

  const languageOptions: { pref: LocalePref; name: string; hint?: string }[] = $derived([
    {
      pref: "system",
      name: t("settings.language.system"),
      hint: t("settings.language.detected", { name: i18n.nameOf(i18n.systemLocale) }),
    },
    ...LOCALES.map((l) => ({ pref: l.code, name: l.name })),
  ]);

  // Mini window previews for each theme card.
  const previewColors: Record<ThemeMode, [string, string, string]> = {
    light: ["#f4f4f1", "#fcfcfb", "var(--accent)"],
    dark: ["#0d0d0d", "#1a1a19", "var(--accent)"],
    system: ["#f4f4f1", "#1a1a19", "var(--accent)"],
  };

  const enter = (i: number) => ({ y: 14, duration: 420, delay: 40 + i * 70, easing: cubicOut });
</script>

<header class="mb-8">
  <h1 class="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
  <p class="mt-1 text-ink-2">{t("settings.subtitle")}</p>
</header>

<div class="flex flex-col gap-6">
  <!-- Appearance -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(0)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Palette size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.appearance.title")}</h2>
        <p class="text-sm text-muted">{t("settings.appearance.description")}</p>
      </div>
    </div>

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
  </section>

  <!-- Accent color -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(1)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Droplet size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.accent.title")}</h2>
        <p class="text-sm text-muted">{t("settings.accent.description")}</p>
      </div>
    </div>
    <AccentPicker />
  </section>

  <!-- Block shape -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(2)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><LayoutGrid size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.shape.title")}</h2>
        <p class="text-sm text-muted">{t("settings.shape.description")}</p>
      </div>
    </div>
    <CellShapePicker />
  </section>

  <!-- Time fill -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(3)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Timer size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.fill.title")}</h2>
        <p class="text-sm text-muted">{t("settings.fill.description")}</p>
      </div>
    </div>
    <FillDirectionPicker />
    <div class="mt-5 flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
      <div class="min-w-0">
        <p class="text-sm font-medium">{t("settings.fill.waveTitle")}</p>
        <p class="text-[13px] text-muted">{t("settings.fill.waveHint")}</p>
      </div>
      <Toggle
        checked={preferences.fillAnimation}
        label={t("settings.fill.waveTitle")}
        onchange={(on) => preferences.setFillAnimation(on)}
      />
    </div>
  </section>

  <!-- Note paper -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(4)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><StickyNote size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.paper.title")}</h2>
        <p class="text-sm text-muted">{t("settings.paper.description")}</p>
      </div>
    </div>
    <NotePaperPicker />
  </section>

  <!-- Date and time -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(4)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><CalendarClock size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.dateTime.title")}</h2>
        <p class="text-sm text-muted">{t("settings.dateTime.description")}</p>
      </div>
    </div>
    <DateTimeSettings />
  </section>

  <!-- Language -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(5)}>
    <div class="mb-5 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Languages size={18} /></span>
      <div>
        <h2 class="font-semibold">{t("settings.language.title")}</h2>
        <p class="text-sm text-muted">{t("settings.language.description")}</p>
      </div>
    </div>

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
  </section>

  <!-- Danger zone -->
  <section class="rounded-2xl border border-danger/40 bg-surface p-6 shadow-card" in:fly={enter(6)}>
    <DangerZone />
  </section>

  <!-- About -->
  <section class="rounded-2xl border border-line bg-surface p-6 shadow-card" in:fly={enter(7)}>
    <div class="mb-4 flex items-start gap-3">
      <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Info size={18} /></span>
      <h2 class="mt-1.5 font-semibold">{t("settings.about.title")}</h2>
    </div>
    <div class="flex items-center gap-3">
      <Logo size={40} />
      <div>
        <p class="font-semibold">{t("app.name")}</p>
        <p class="text-sm text-muted">{t("settings.about.version", { version })}</p>
        <p class="text-sm text-muted">{t("app.tagline")}</p>
        <p class="text-sm text-muted break-words">{t("settings.about.credit", { author: AUTHOR, profile: AUTHOR_URL, url: REPO_URL })}</p>
      </div>
    </div>
  </section>
</div>
