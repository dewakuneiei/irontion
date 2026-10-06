<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import type { Component } from "svelte";
  import AboutSection from "$lib/components/settings/sections/AboutSection.svelte";
  import AnimationsSection from "$lib/components/settings/sections/AnimationsSection.svelte";
  import AppearanceSection from "$lib/components/settings/sections/AppearanceSection.svelte";
  import BlocksSection from "$lib/components/settings/sections/BlocksSection.svelte";
  import DataSection from "$lib/components/settings/sections/DataSection.svelte";
  import NotesSection from "$lib/components/settings/sections/NotesSection.svelte";
  import RegionSection from "$lib/components/settings/sections/RegionSection.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { isSettingsSection, type SettingsSection } from "$lib/nav";

  const sections: Record<SettingsSection, Component> = {
    appearance: AppearanceSection,
    blocks: BlocksSection,
    animations: AnimationsSection,
    notes: NotesSection,
    region: RegionSection,
    data: DataSection,
    about: AboutSection,
  };

  const id = $derived(page.params.section ?? "");
  const Section = $derived(isSettingsSection(id) ? sections[id] : null);

  // An unknown section goes to the list. Only while this page is the open one: when the user
  // leaves (Back), `params.section` empties before this page is torn down, and redirecting then
  // would pull them straight back into Settings.
  $effect(() => {
    if (!Section && page.route.id === "/settings/[section]") void goto("/settings", { replaceState: true });
  });
</script>

{#if Section}
  <header class="mb-8">
    <!-- Where the sidebar is not inline, this is the way back to the list of sections. -->
    <a href="/settings" class="-ml-2 mb-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-ink-2 hover:bg-surface-hover hover:text-ink lg:hidden">
      <ArrowLeft size={15} aria-hidden="true" />
      {t("settings.title")}
    </a>
    <h1 class="text-3xl font-semibold tracking-tight">{t(`settings.sections.${id as SettingsSection}`)}</h1>
  </header>

  <Section />
{/if}
