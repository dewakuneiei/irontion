<script lang="ts">
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import { barChart, type BarRow } from "$lib/charts/options";
  import { chartPalette } from "$lib/charts/palette";
  import Chart from "$lib/components/Chart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import TagChip from "$lib/components/TagChip.svelte";
  import { addDays, SLOT_MINUTES, todayISO } from "$lib/domain/time";
  import { buildTree, flatten, rollUp } from "$lib/domain/tree";
  import { formatMinutes, formatPercent, i18n, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { day } from "$lib/stores/day.svelte";
  import { RangeReport } from "$lib/stores/report.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { theme } from "$lib/theme.svelte";

  type Group = "activity" | "tag";
  interface TableRow {
    key: string;
    label: string;
    color: string;
    blocks: number;
    depth: number;
  }

  const RANGES = [7, 30, 90] as const;

  let range = $state<(typeof RANGES)[number]>(30);
  let group = $state<Group>("activity");
  let tagFilter = $state<number[]>([]);

  const today = todayISO();
  const palette = $derived(chartPalette(theme.resolved, preferences.accentFor(theme.resolved)));
  const from = $derived(addDays(today, -(range - 1)));
  const report = new RangeReport();

  $effect(() => {
    void catalog.version;
    void day.version;
    void report.load(from, today);
  });

  // Keep only activities that carry (or inherit) one of the selected tags.
  const direct = $derived.by(() => {
    if (tagFilter.length === 0) return report.direct;
    const filtered = new Map<number, number>();
    for (const [id, blocks] of report.direct) {
      const tags = catalog.tagsOf(id);
      if (tagFilter.some((tagId) => tags.has(tagId))) filtered.set(id, blocks);
    }
    return filtered;
  });
  const totalBlocks = $derived([...direct.values()].reduce((a, b) => a + b, 0));

  const activityRows = $derived.by((): TableRow[] => {
    const tree = buildTree(catalog.activities, true);
    const totals = rollUp(tree, direct);
    return flatten(tree)
      .filter((n) => (totals.get(n.activity.id) ?? 0) > 0)
      .map((n) => ({
        key: `a${n.activity.id}`,
        label: n.activity.name,
        color: catalog.colorOf(n.activity.id),
        blocks: totals.get(n.activity.id) ?? 0,
        depth: n.depth,
      }));
  });

  const tagRows = $derived.by((): TableRow[] => {
    const byTag = new Map<number | null, number>();
    for (const [id, blocks] of direct) {
      const tags = catalog.tagsOf(id);
      if (tags.size === 0) byTag.set(null, (byTag.get(null) ?? 0) + blocks);
      for (const tagId of tags) byTag.set(tagId, (byTag.get(tagId) ?? 0) + blocks);
    }
    return [...byTag]
      .map(([tagId, blocks], i) => {
        const tag = tagId === null ? undefined : catalog.tagById.get(tagId);
        return {
          key: `t${tagId}`,
          label: tag?.name ?? t("insights.untagged"),
          color: tag?.color ?? (tagId === null ? palette.muted : palette.categorical[i % palette.categorical.length]),
          blocks,
          depth: 1,
        };
      })
      .sort((a, b) => b.blocks - a.blocks);
  });

  const rows = $derived(group === "activity" ? activityRows : tagRows);
  const hours = (blocks: number) => (blocks * SLOT_MINUTES) / 60;
  const hoursLabel = (h: number) =>
    t("units.hours", { n: new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(h) });
  const percent = (part: number) => formatPercent(totalBlocks ? part / totalBlocks : 0);

  const option = $derived(
    barChart(
      rows
        .filter((r) => r.depth === 1)
        .slice(0, 10)
        .map((r): BarRow => ({ label: r.label, value: hours(r.blocks), color: r.color })),
      palette,
      i18n.locale,
      hoursLabel,
    ),
  );
  const chartHeight = $derived(Math.max(140, Math.min(10, rows.filter((r) => r.depth === 1).length) * 44));

  function toggleTag(id: number) {
    tagFilter = tagFilter.includes(id) ? tagFilter.filter((x) => x !== id) : [...tagFilter, id];
  }
</script>

<PageHeader title={t("insights.title")} subtitle={t("insights.subtitle")} />

<div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
  <div class="flex items-center gap-2">
    <span class="text-sm text-muted">{t("insights.range.label")}</span>
    <div class="flex rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label={t("insights.range.label")}>
      {#each RANGES as days (days)}
        <button
          type="button"
          role="radio"
          aria-checked={range === days}
          onclick={() => (range = days)}
          class="h-7 rounded-md px-3 text-[13px] font-medium {range === days ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink-2'}"
        >
          {t("insights.range.days", { n: days })}
        </button>
      {/each}
    </div>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-sm text-muted">{t("insights.group.label")}</span>
    <div class="flex rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label={t("insights.group.label")}>
      {#each ["activity", "tag"] as const as g (g)}
        <button
          type="button"
          role="radio"
          aria-checked={group === g}
          onclick={() => (group = g)}
          class="h-7 rounded-md px-3 text-[13px] font-medium {group === g ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink-2'}"
        >
          {t(`insights.group.${g}`)}
        </button>
      {/each}
    </div>
  </div>
  {#if catalog.tags.length > 0}
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="mr-0.5 text-sm text-muted">{t("insights.filter.label")}</span>
      {#each catalog.tags as tag (tag.id)}
        <TagChip {tag} selected={tagFilter.includes(tag.id)} onclick={() => toggleTag(tag.id)} />
      {/each}
      {#if tagFilter.length > 0}
        <button type="button" class="ml-1 text-[13px] text-accent hover:underline" onclick={() => (tagFilter = [])}>
          {t("insights.filter.clear")}
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if report.loaded && rows.length === 0}
  <EmptyState icon={ChartColumn} title={t("insights.empty.title")} body={t("insights.empty.body")}>
    {#snippet action()}
      <a href="/blocks" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink">
        {t("today.fillBlocks")}
      </a>
    {/snippet}
  </EmptyState>
{:else if rows.length > 0}
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section class="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 class="font-semibold">{t(group === "activity" ? "insights.chart.byActivity" : "insights.chart.byTag")}</h2>
      <p class="text-sm text-muted">
        {t("insights.totalTracked", { duration: formatMinutes(totalBlocks * SLOT_MINUTES), days: report.dailyTotals.length })}
      </p>
      <div class="mt-4" style:height="{chartHeight}px">
        <Chart {option} label={t(group === "activity" ? "insights.chart.byActivity" : "insights.chart.byTag")} class="h-full w-full" />
      </div>
    </section>

    <section class="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-muted">
            <th class="pb-2 font-medium">{t("insights.table.name")}</th>
            <th class="pb-2 text-right font-medium">{t("insights.table.time")}</th>
            <th class="w-16 pb-2 text-right font-medium">{t("insights.table.share")}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.key)}
            <tr class="border-t border-line">
              <td class="py-2" style:padding-left="{(row.depth - 1) * 16}px">
                <span class="flex items-center gap-2 {row.depth === 1 ? 'font-medium' : 'text-ink-2'}">
                  <span class="size-2.5 shrink-0 rounded-full" style:background={row.color}></span>
                  <span class="truncate">{row.label}</span>
                </span>
              </td>
              <td class="py-2 text-right tabular-nums">{formatMinutes(row.blocks * SLOT_MINUTES)}</td>
              <td class="py-2 text-right text-muted tabular-nums">{percent(row.blocks)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if group === "tag"}
        <p class="mt-3 text-xs text-muted">{t("insights.tagNote")}</p>
      {/if}
    </section>
  </div>
{/if}
