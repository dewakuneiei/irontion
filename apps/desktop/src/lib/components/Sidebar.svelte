<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
  import { t } from "$lib/i18n/index.svelte";
  import { layout } from "$lib/layout.svelte";
  import { contextFor, isActive as isNavActive, type NavItem } from "$lib/nav";
  import Logo from "./Logo.svelte";
  import TabBar from "./TabBar.svelte";

  const context = $derived(contextFor(page.url.pathname));
  const isActive = (item: NavItem) => isNavActive(item, page.url.pathname);

  function leave() {
    layout.afterNavigate();
    void goto(layout.lastApp);
  }
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

  <nav class="flex flex-1 flex-col gap-0.5" aria-label={context.title ? t(context.title) : undefined}>
    {#each context.items as item (item.href)}
      {@render sideLink(item)}
    {/each}
    <div class="flex-1"></div>
    {#if context.back}
      <!-- Where Settings sits in the main sidebar: the way out of this context. -->
      <button
        type="button"
        class="flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
        onclick={leave}
        data-nav-back
      >
        <ArrowLeft size={18} strokeWidth={2} />
        <span>{t(context.back.label)}</span>
      </button>
    {:else if context.footer}
      {@render sideLink(context.footer)}
    {/if}
  </nav>
</aside>

<!-- Tab bar for phone-sized windows (under 640px). -->
<TabBar />

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
