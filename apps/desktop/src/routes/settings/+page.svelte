<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { layout } from "$lib/layout.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { SETTINGS_ITEMS } from "$lib/nav";
</script>

<header class="mb-8">
  <h1 class="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
  <p class="mt-1 text-ink-2">{t("settings.subtitle")}</p>
</header>

<!-- The sections, as a list. On wide windows the sidebar lists the same sections. -->
<ul class="flex flex-col gap-2">
  {#each SETTINGS_ITEMS as item (item.href)}
    <li>
      <a
        href={item.href}
        onclick={() => layout.afterNavigate()}
        class="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card transition-colors hover:bg-surface-hover"
      >
        <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><item.icon size={18} /></span>
        <span class="flex-1 font-medium">{t(item.label)}</span>
        <ChevronRight size={18} class="text-muted" aria-hidden="true" />
      </a>
    </li>
  {/each}
</ul>
