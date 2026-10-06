<script lang="ts">
  import { onMount } from "svelte";
  import { errorKind } from "$lib/api/backend";
  import type { TreePlanItem } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import { flattenTree, pathKey, toTree, type ActivityTemplate } from "$lib/domain/templates";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  let {
    template,
    onback,
    ondone,
  }: { template: ActivityTemplate; onback: () => void; ondone: () => void } = $props();

  const tree = $derived(toTree(template.nodes, i18n.locale));
  let plan = $state<TreePlanItem[] | null>(null);
  /** Paths (as keys) of existing activities the user chose to overwrite. */
  let overwrite = $state<ReadonlySet<string>>(new Set());
  let busy = $state(false);
  let error = $state<string | null>(null);

  const existing = $derived(new Set(plan?.filter((item) => item.exists).map((item) => pathKey(item.path))));
  const rows = $derived(flattenTree(tree).map((node) => ({ ...node, key: pathKey(node.path), exists: existing.has(pathKey(node.path)) })));
  const conflicts = $derived(rows.filter((row) => row.exists));
  const created = $derived(rows.length - conflicts.length);
  // With nothing new to add and nothing to overwrite, there is nothing to do.
  const nothingToDo = $derived(created === 0 && overwrite.size === 0);

  onMount(async () => {
    try {
      plan = await catalog.planTree(tree);
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
    }
  });

  function toggle(key: string) {
    const next = new Set(overwrite);
    if (!next.delete(key)) next.add(key);
    overwrite = next;
  }

  async function add() {
    busy = true;
    error = null;
    try {
      const paths = conflicts.filter((row) => overwrite.has(row.key)).map((row) => row.path);
      const report = await catalog.importTree(tree, paths);
      notices.info(
        t("templates.report", {
          name: template.name[i18n.locale],
          created: report.created,
          updated: report.recolored,
          kept: report.kept,
        }),
      );
      ondone();
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
      busy = false;
    }
  }
</script>

<button type="button" class="mb-3 -ml-1 rounded-md px-1 text-sm text-accent hover:underline" onclick={onback}>
  {t("templates.back")}
</button>

<p class="mb-1 text-sm text-ink-2">{template.description[i18n.locale]}</p>
{#if plan}
  <p class="mb-4 text-sm font-medium">{t("templates.review.summary", { created, existing: conflicts.length })}</p>
{:else}
  <p class="mb-4 text-sm text-ink-2">{t("templates.review.intro")}</p>
{/if}

{#if conflicts.length > 0}
  <div class="mb-4 rounded-xl bg-surface-2 p-3.5" role="group" aria-labelledby="conflicts-title">
    <p id="conflicts-title" class="text-sm font-semibold">{t("templates.review.conflictsTitle")}</p>
    <p class="mt-1 mb-2.5 text-[13px] leading-relaxed text-ink-2">{t("templates.review.conflictsHint")}</p>
    <div class="flex gap-2">
      <Button size="sm" onclick={() => (overwrite = new Set(conflicts.map((row) => row.key)))}>
        {t("templates.review.overwriteAll")}
      </Button>
      <Button size="sm" onclick={() => (overwrite = new Set())}>{t("templates.review.keepAll")}</Button>
    </div>
  </div>
{/if}

<ul class="mb-4 flex max-h-[44vh] flex-col overflow-y-auto rounded-xl border border-line p-1">
  {#each rows as row (row.key)}
    <li class="flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1 text-sm" style:padding-left="{(row.depth - 1) * 18 + 8}px">
      <span class="size-3 shrink-0 rounded-[4px]" style:background={row.color}></span>
      <span class="min-w-0 flex-1 truncate {row.depth === 1 ? 'font-semibold' : ''}">{row.name}</span>
      {#if plan}
        {#if row.exists}
          <label class="flex shrink-0 cursor-pointer items-center gap-1.5 text-[13px] text-ink-2">
            <input
              type="checkbox"
              class="size-4 accent-[var(--accent)]"
              checked={overwrite.has(row.key)}
              aria-label={t("templates.review.overwriteItem", { name: row.path.join(" / ") })}
              onchange={() => toggle(row.key)}
            />
            {t("templates.review.overwrite")}
          </label>
          <span class="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t("templates.review.exists")}</span>
        {:else}
          <span class="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{t("templates.review.new")}</span>
        {/if}
      {/if}
    </li>
  {/each}
</ul>

{#if plan && created === 0}
  <p class="mb-3 text-sm text-ink-2">{t("templates.review.nothingNew")}</p>
{/if}
{#if error}<p class="mb-3 text-sm text-danger" role="alert">{error}</p>{/if}

<div class="flex justify-end gap-2">
  <Button variant="ghost" onclick={ondone}>{t("common.cancel")}</Button>
  <Button variant="primary" disabled={!plan || busy || nothingToDo} onclick={add}>{t("templates.review.confirm")}</Button>
</div>
