<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import AppShell from "$lib/components/AppShell.svelte";
  import { i18n } from "$lib/i18n/index.svelte";
  import { pathOf } from "$lib/nav";
  import { preferences } from "$lib/preferences.svelte";
  import { theme } from "$lib/theme.svelte";

  let { children } = $props();

  /** The reminder popup is a window of its own: just the page, no sidebar and no app logic. */
  const bare = $derived(pathOf(page.url).startsWith("/alert"));

  $effect(() => theme.init());
  $effect(() => void i18n.init());

  // Reflect theme, accent, block shape and language on <html> so CSS tokens and fonts apply.
  $effect(() => {
    document.documentElement.dataset.theme = theme.resolved;
    preferences.apply(theme.resolved);
  });
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });

  // Nothing needs to animate while the window is hidden or minimized: CSS pauses on this flag.
  function onVisibility() {
    document.documentElement.toggleAttribute("data-hidden", document.hidden);
  }
</script>

<svelte:document onvisibilitychange={onVisibility} />

{#if bare}
  {@render children()}
{:else}
  <AppShell {children} />
{/if}
