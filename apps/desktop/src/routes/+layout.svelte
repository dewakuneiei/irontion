<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import PanelLeftOpen from "@lucide/svelte/icons/panel-left-open";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Toasts from "$lib/components/Toasts.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { layout } from "$lib/layout.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { theme } from "$lib/theme.svelte";

  let { children } = $props();

  $effect(() => theme.init());
  $effect(() => layout.init());
  $effect(() => {
    void i18n.init();
    catalog.ensureLoaded().catch((err) => notices.error(err));
  });

  // Reflect theme, accent, block shape and language on <html> so CSS tokens and fonts apply.
  $effect(() => {
    document.documentElement.dataset.theme = theme.resolved;
    preferences.apply(theme.resolved);
  });
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });

  function onWindowKey(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      layout.toggleSidebar();
    }
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="flex h-dvh flex-col overflow-hidden sm:flex-row">
  <Sidebar />
  <main class="relative min-w-0 flex-1 overflow-y-auto">
    {#if !layout.open}
      <!-- Folded away: this is the way back. Phone-sized windows use the tab bar instead. -->
      <div class="sticky top-0 z-10 flex h-12 items-center bg-bg/85 px-3 backdrop-blur max-sm:hidden sm:px-4">
        <button
          type="button"
          class="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label={t("nav.showSidebar")}
          title="{t('nav.showSidebar')} (Ctrl+B)"
          onclick={() => layout.toggleSidebar()}
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    {/if}

    {#key page.url.pathname}
      <!-- Extra bottom padding below 640px keeps content clear of the tab bar. -->
      <div
        class="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 sm:py-8 xl:px-10 xl:py-9"
        in:fly={{ y: 12, duration: 320, easing: cubicOut }}
      >
        {#if catalog.loaded && !catalog.persistent}
          <p class="mb-5 flex gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-2">
            <FlaskConical size={14} class="mt-0.5 shrink-0 text-accent" />
            {t("preview.notice")}
          </p>
        {/if}
        {@render children()}
      </div>
    {/key}
  </main>
</div>
<Toasts />
