<script lang="ts">
  import { page } from "$app/state";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import Grid3x3 from "@lucide/svelte/icons/grid-3x3";
  import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
  import Settings from "@lucide/svelte/icons/settings";
  import Shapes from "@lucide/svelte/icons/shapes";
  import Sun from "@lucide/svelte/icons/sun";
  import { t, type MessageKey } from "$lib/i18n/index.svelte";
  import { layout } from "$lib/layout.svelte";
  import Logo from "./Logo.svelte";

  type NavItem = { label: MessageKey; icon: typeof Sun; href: string };

  const main: NavItem[] = [
    { label: "nav.today", icon: Sun, href: "/" },
    { label: "nav.blocks", icon: Grid3x3, href: "/blocks" },
    { label: "nav.activities", icon: Shapes, href: "/activities" },
    { label: "nav.insights", icon: ChartColumn, href: "/insights" },
  ];
  const settings: NavItem = { label: "nav.settings", icon: Settings, href: "/settings" };
  const all = [...main, settings];

  const isActive = (item: NavItem) => item.href === page.url.pathname;
</script>

<!-- Drawer backdrop: only when the sidebar slides over narrow windows. -->
{#if layout.open}
  <button
    type="button"
    tabindex="-1"
    aria-label={t("nav.hideSidebar")}
    class="fixed inset-0 z-30 bg-black/35 max-sm:hidden lg:hidden"
    onclick={() => layout.toggleSidebar()}
  ></button>
{/if}

<!--
  Side navigation (640px and up). Wide windows push the content aside; narrower ones
  slide it over as a drawer. Folded away, it is inert so keyboard focus skips it.
-->
<aside
  inert={!layout.open}
  class="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface px-3 py-4 transition-[transform,margin] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] max-sm:hidden lg:static lg:z-auto lg:shrink-0 {layout.open
    ? 'translate-x-0 shadow-2xl lg:shadow-none'
    : '-translate-x-full lg:translate-x-0 lg:-ml-60'}"
>
  <div class="mb-6 flex items-center gap-2.5 pr-1 pl-2">
    <Logo size={30} />
    <span class="flex-1 text-[17px] font-semibold tracking-tight">{t("app.name")}</span>
    <button
      type="button"
      class="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-ink"
      aria-label={t("nav.hideSidebar")}
      title="{t('nav.hideSidebar')} (Ctrl+B)"
      onclick={() => layout.toggleSidebar()}
    >
      <PanelLeftClose size={18} />
    </button>
  </div>

  <nav class="flex flex-1 flex-col gap-0.5">
    {#each main as item (item.href)}
      {@render sideLink(item)}
    {/each}
    <div class="flex-1"></div>
    {@render sideLink(settings)}
  </nav>
</aside>

<!-- Tab bar for phone-sized windows (under 640px). -->
<nav class="fixed inset-x-0 bottom-0 z-30 flex h-16 gap-1 border-t border-line bg-surface px-2 sm:hidden">
  {#each all as item (item.href)}
    <a
      href={item.href}
      aria-current={isActive(item) ? "page" : undefined}
      class="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors {isActive(item)
        ? 'text-accent'
        : 'text-ink-2'}"
    >
      <item.icon size={20} strokeWidth={2} />
      {t(item.label)}
    </a>
  {/each}
</nav>

{#snippet sideLink(item: NavItem)}
  <a
    href={item.href}
    aria-current={isActive(item) ? "page" : undefined}
    onclick={() => layout.afterNavigate()}
    class="flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors {isActive(item)
      ? 'bg-accent-soft text-accent'
      : 'text-ink-2 hover:bg-surface-hover hover:text-ink'}"
  >
    <item.icon size={18} strokeWidth={2} />
    <span>{t(item.label)}</span>
  </a>
{/snippet}
