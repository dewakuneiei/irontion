<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  import {
    TEMPLATE_CATEGORIES,
    countNodes,
    filterTemplates,
    type ActivityTemplate,
    type TemplateCategory,
  } from "$lib/domain/templates";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { TEMPLATES } from "$lib/templates/data";
  import Button from "$lib/components/Button.svelte";

  let { onpick }: { onpick: (template: ActivityTemplate) => void } = $props();

  let query = $state("");
  let category = $state<TemplateCategory | "all">("all");

  const categoryLabel = (c: TemplateCategory) => t(`templates.category.${c}`);
  const matching = $derived(filterTemplates(TEMPLATES, { query, category }, i18n.locale, categoryLabel));
  // How many each category chip would show for the words typed so far.
  const counts = $derived(
    new Map(
      TEMPLATE_CATEGORIES.map((c) => [c, filterTemplates(TEMPLATES, { query, category: c }, i18n.locale, categoryLabel).length]),
    ),
  );
  const totalForQuery = $derived(filterTemplates(TEMPLATES, { query, category: "all" }, i18n.locale, categoryLabel).length);
  const filtering = $derived(query.trim() !== "" || category !== "all");

  function clear() {
    query = "";
    category = "all";
  }
</script>

<p class="mb-3 max-w-[60ch] text-sm leading-relaxed text-ink-2">{t("templates.subtitle")}</p>

<!-- Search and filters stay in view while the list scrolls underneath. -->
<div class="sticky top-0 z-10 -mx-6 mb-4 border-b border-line bg-surface px-6 pb-3">
  <label class="relative block">
    <Search size={16} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
    <input
      type="search"
      bind:value={query}
      aria-label={t("templates.searchLabel")}
      placeholder={t("templates.searchPlaceholder")}
      class="h-10 w-full rounded-lg border border-line bg-surface pr-9 pl-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
    />
    {#if query}
      <button
        type="button"
        class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
        aria-label={t("templates.clearFilters")}
        onclick={() => (query = "")}
      >
        <X size={14} />
      </button>
    {/if}
  </label>

  <!-- One swipeable line on narrow screens, wrapping on wider ones. -->
  <div
    class="mt-2.5 flex flex-wrap gap-1.5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1.5"
    role="radiogroup"
    aria-label={t("templates.categoryFilter")}
  >
    {#snippet chip(value: TemplateCategory | "all", label: string, count: number)}
      <button
        type="button"
        role="radio"
        aria-checked={category === value}
        onclick={() => (category = value)}
        class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[13px] whitespace-nowrap transition-colors {category === value
          ? 'border-accent bg-accent-soft font-medium text-ink'
          : 'border-line text-ink-2 hover:bg-surface-hover'} {count === 0 && category !== value ? 'opacity-45' : ''}"
      >
        {label}
        <span class="text-xs text-muted tabular-nums">{count}</span>
      </button>
    {/snippet}
    {@render chip("all", t("templates.allCategories"), totalForQuery)}
    {#each TEMPLATE_CATEGORIES as value (value)}
      {@render chip(value, categoryLabel(value), counts.get(value) ?? 0)}
    {/each}
  </div>

  <p class="mt-2 text-xs text-muted" role="status">
    {t("templates.shown", { shown: matching.length, total: TEMPLATES.length })}
  </p>
</div>

{#if matching.length === 0}
  <div class="flex flex-col items-center gap-3 py-10 text-center">
    <p class="text-sm text-ink-2">{t("templates.noMatch")}</p>
    <Button size="sm" onclick={clear}>{t("templates.clearFilters")}</Button>
  </div>
{/if}

{#each TEMPLATE_CATEGORIES as group (group)}
  {@const inGroup = matching.filter((template) => template.category === group)}
  {#if inGroup.length > 0}
    <section class="mb-5 last:mb-0" aria-labelledby="category-{group}">
      <h3 id="category-{group}" class="mb-2 text-xs font-medium text-muted">{categoryLabel(group)}</h3>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {#each inGroup as template (template.id)}
          <button
            type="button"
            class="flex flex-col items-start gap-1.5 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-accent hover:bg-surface-hover"
            onclick={() => onpick(template)}
          >
            <!-- The template's colors, as a hint of its look. -->
            <span class="flex gap-1" aria-hidden="true">
              {#each template.nodes as node, index (index)}
                <span class="size-2.5 rounded-full" style:background={node.color}></span>
              {/each}
            </span>
            <span class="text-sm font-semibold">{template.name[i18n.locale]}</span>
            <span class="line-clamp-2 text-[13px] leading-snug text-ink-2">{template.description[i18n.locale]}</span>
            <span class="text-xs text-muted">{t("templates.activityCount", { n: countNodes(template.nodes) })}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
{/each}
