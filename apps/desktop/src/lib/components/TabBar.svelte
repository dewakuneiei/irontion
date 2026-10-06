<script lang="ts">
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { t } from "$lib/i18n/index.svelte";
  import { TAB_MAIN, TAB_MORE, isActive as isNavActive, type NavItem } from "$lib/nav";

  /**
   * The bottom bar of phone-sized windows (under 640px). Five tabs fit; the pages used less often
   * sit behind "More", which opens a small menu above the bar.
   */
  let moreOpen = $state(false);

  const isActive = (item: NavItem) => isNavActive(item, page.url.pathname);
  const moreActive = $derived(TAB_MORE.some(isActive));

  function onWindowKey(event: KeyboardEvent) {
    if (moreOpen && event.key === "Escape") moreOpen = false;
  }
</script>

<svelte:window onkeydown={onWindowKey} />

{#if moreOpen}
  <button
    type="button"
    tabindex="-1"
    aria-label={t("common.close")}
    class="fixed inset-0 z-30 sm:hidden"
    onclick={() => (moreOpen = false)}
  ></button>
  <ul
    id="more-pages"
    class="fixed right-2 bottom-[4.5rem] z-40 flex min-w-48 flex-col gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl sm:hidden"
    transition:fly={{ y: 8, duration: 160 }}
  >
    {#each TAB_MORE as item (item.href)}
      <li>
        <a
          href={item.href}
          aria-current={isActive(item) ? "page" : undefined}
          onclick={() => (moreOpen = false)}
          class="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium {isActive(item)
            ? 'bg-accent-soft text-accent'
            : 'text-ink-2 hover:bg-surface-hover hover:text-ink'}"
        >
          <item.icon size={18} strokeWidth={2} />
          {t(item.label)}
        </a>
      </li>
    {/each}
  </ul>
{/if}

<nav class="fixed inset-x-0 bottom-0 z-30 flex h-16 gap-1 border-t border-line bg-surface px-2 sm:hidden">
  {#each TAB_MAIN as item (item.href)}
    <a
      href={item.href}
      aria-current={isActive(item) ? "page" : undefined}
      onclick={() => (moreOpen = false)}
      class="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors {isActive(item)
        ? 'text-accent'
        : 'text-ink-2'}"
    >
      <item.icon size={20} strokeWidth={2} />
      <span class="max-w-full truncate">{t(item.label)}</span>
    </a>
  {/each}
  <button
    type="button"
    aria-expanded={moreOpen}
    aria-controls="more-pages"
    aria-label={t("nav.moreLabel")}
    onclick={() => (moreOpen = !moreOpen)}
    class="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors {moreActive ||
    moreOpen
      ? 'text-accent'
      : 'text-ink-2'}"
  >
    <Ellipsis size={20} strokeWidth={2} />
    <span class="max-w-full truncate">{t("nav.more")}</span>
  </button>
</nav>
