<script lang="ts">
  import { countNodes, type ActivityTemplate, type TemplateCategory } from "$lib/domain/templates";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { TEMPLATES } from "$lib/templates/data";

  let { onpick }: { onpick: (template: ActivityTemplate) => void } = $props();

  const CATEGORIES: TemplateCategory[] = ["technique", "personal", "student", "career"];
</script>

<p class="mb-5 max-w-[60ch] text-sm leading-relaxed text-ink-2">{t("templates.subtitle")}</p>

{#each CATEGORIES as category (category)}
  <section class="mb-5 last:mb-0" aria-labelledby="category-{category}">
    <h3 id="category-{category}" class="mb-2 text-xs font-medium text-muted">{t(`templates.category.${category}`)}</h3>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each TEMPLATES.filter((template) => template.category === category) as template (template.id)}
        <button
          type="button"
          class="flex flex-col items-start gap-1.5 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-accent hover:bg-surface-hover"
          onclick={() => onpick(template)}
        >
          <!-- The template's colors, as a hint of its look. -->
          <span class="flex gap-1" aria-hidden="true">
            {#each template.nodes as node (node.color)}
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
{/each}
