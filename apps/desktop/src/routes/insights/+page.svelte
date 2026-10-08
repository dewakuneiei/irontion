<script lang="ts">
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import { barChart, columnChart, donutChart, stackedColumns, type BarRow, type DonutSlice } from "$lib/charts/options";
  import { chartPalette } from "$lib/charts/palette";
  import Chart from "$lib/components/Chart.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PeriodPicker from "$lib/components/insights/PeriodPicker.svelte";
  import TagChip from "$lib/components/TagChip.svelte";
  import {
    PARTS_OF_DAY,
    buildDailyStack,
    buildPartsOfDay,
    buildShare,
    bySize,
    type ActivityRules,
    type ShareSlice,
  } from "$lib/domain/insights";
  import { periodSpan, spanDays, type Period } from "$lib/domain/period";
  import { dayProgress, SLOT_MINUTES, todayISO } from "$lib/domain/time";
  import { buildTree, flatten, pathOf, rollUp } from "$lib/domain/tree";
  import { formatDay, formatDayLabel } from "$lib/format.svelte";
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

  const today = todayISO();
  let period = $state<Period>({ kind: "day", anchor: today });
  let group = $state<Group>("activity");
  let tagFilter = $state<number[]>([]);

  const palette = $derived(chartPalette(theme.resolved, preferences.accentFor(theme.resolved)));
  const span = $derived(periodSpan(period, preferences.weekStart));
  const dayCount = $derived(spanDays(span));
  const report = new RangeReport();

  $effect(() => {
    void catalog.version;
    void day.version;
    void report.load(span.from, span.to);
    void report.loadDays(span.from, span.to);
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
  const totalLine = $derived.by(() => {
    const duration = formatMinutes(totalBlocks * SLOT_MINUTES);
    if (dayCount > 1) return t("insights.totalTracked", { duration, days: dayCount });
    return span.from === today
      ? t("insights.totalTrackedToday", { duration })
      : t("insights.totalTrackedOn", { duration, date: formatDayLabel(span.from) });
  });
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

  // ---------- Share of the day, per-day columns, parts of the day ----------

  const rules = $derived<ActivityRules>({
    topOf: (id) => pathOf(id, catalog.byId)[0]?.id ?? id,
    included: (id) => tagFilter.length === 0 || tagFilter.some((tagId) => catalog.tagsOf(id).has(tagId)),
  });
  const share = $derived(buildShare(report.days, rules, { today, nowSlot: dayProgress(today, new Date()).elapsed }));
  const anyTracked = $derived(share.slices.some((s) => s.kind === "activity"));

  function sliceName(slice: ShareSlice): string {
    if (slice.kind === "activity") return catalog.byId.get(slice.activityId!)?.name ?? "";
    return t(`insights.share.${slice.kind}`);
  }
  function sliceColor(slice: ShareSlice): string {
    if (slice.kind === "activity") return catalog.colorOf(slice.activityId!);
    return slice.kind === "other" ? palette.muted : palette[slice.kind];
  }
  const sliceDetail = (slice: ShareSlice) =>
    t("insights.share.detail", {
      blocks: slice.blocks,
      duration: formatMinutes(slice.blocks * SLOT_MINUTES),
      percent: formatPercent(share.total ? slice.blocks / share.total : 0),
    });

  const donutSlices = $derived(share.slices.map((s): DonutSlice => ({ name: sliceName(s), value: s.blocks, color: sliceColor(s) })));
  const legend = $derived(bySize(share.slices));
  const donut = $derived(
    donutChart(donutSlices, palette, i18n.locale, (slice) => {
      const source = share.slices[donutSlices.indexOf(slice)];
      return `<b>${escape(slice.name)}</b><br/><span style="color:${palette.text2}">${escape(sliceDetail(source))}</span>`;
    }),
  );

  const stack = $derived(buildDailyStack(report.days, rules));
  const stackOption = $derived(
    stackedColumns(
      stack.dates.map((d) => formatDay(d)),
      stack.series.map((s) => ({
        name: s.activityId === null ? t("insights.share.other") : (catalog.byId.get(s.activityId)?.name ?? ""),
        color: s.activityId === null ? palette.muted : catalog.colorOf(s.activityId),
        values: s.blocks.map(hours),
      })),
      palette,
      i18n.locale,
      hoursLabel,
    ),
  );

  const parts = $derived(buildPartsOfDay(report.days, rules));
  const partsOption = $derived(
    columnChart(
      PARTS_OF_DAY.map((part) => ({ label: t(`insights.part.${part}`), value: hours(parts[part]) })),
      palette,
      i18n.locale,
      hoursLabel,
    ),
  );

  /** Names are user input and end up in tooltip HTML. */
  const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function toggleTag(id: number) {
    tagFilter = tagFilter.includes(id) ? tagFilter.filter((x) => x !== id) : [...tagFilter, id];
  }
</script>

<PageHeader title={t("insights.title")} subtitle={t("insights.subtitle")} />

<div class="mb-4">
  <PeriodPicker bind:period {today} />
</div>

<div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
  <div class="flex items-center gap-2">
    <span class="text-sm text-muted">{t("insights.group.label")}</span>
    <div class="flex flex-wrap rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label={t("insights.group.label")}>
      {#each ["activity", "tag"] as const as g (g)}
        <button
          type="button"
          role="radio"
          aria-checked={group === g}
          onclick={() => (group = g)}
          class="h-7 rounded-md px-3 text-[13px] font-medium whitespace-nowrap {group === g ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink-2'}"
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

{#if report.loaded && report.days.length > 0}
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section class="rounded-2xl border border-line bg-surface p-5 shadow-card" aria-labelledby="share-title">
      <h2 id="share-title" class="font-semibold">{t("insights.share.title")}</h2>
      <p class="text-sm text-muted">{t("insights.share.subtitle", { blocks: share.total })}</p>
      <div class="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
        <div class="relative mx-auto size-48 shrink-0 sm:mx-0 sm:size-52">
          <Chart option={donut} label={t("insights.share.title")} class="h-full w-full" />
          <div class="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span class="text-2xl font-semibold tabular-nums">{formatPercent(share.trackedShare)}</span>
            <span class="text-xs text-muted">{t("insights.share.tracked")}</span>
          </div>
        </div>
        <ul class="min-w-0 flex-[1_1_12rem] space-y-1.5 text-sm">
          {#each legend as slice (slice.kind === "activity" ? `a${slice.activityId}` : slice.kind)}
            <li class="flex items-center gap-2">
              <span class="size-2.5 shrink-0 rounded-full" style:background={sliceColor(slice)}></span>
              <span class="min-w-0 flex-1 truncate" title={sliceDetail(slice)}>{sliceName(slice)}</span>
              <span class="text-muted tabular-nums">{formatPercent(share.total ? slice.blocks / share.total : 0)}</span>
            </li>
          {/each}
        </ul>
      </div>
      {#if !anyTracked}
        <div class="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <p class="min-w-0 flex-1 text-sm text-ink-2">{t("insights.empty.title")}</p>
          <a href="/blocks" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink hover:brightness-110">
            {t("today.fillBlocks")}
          </a>
        </div>
      {/if}
    </section>

    {#if anyTracked}
      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="font-semibold">{t(group === "activity" ? "insights.chart.byActivity" : "insights.chart.byTag")}</h2>
        <p class="text-sm text-muted">
          {totalLine}
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

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="font-semibold">{t("insights.part.title")}</h2>
        <div class="mt-4 h-52">
          <Chart option={partsOption} label={t("insights.part.title")} class="h-full w-full" />
        </div>
      </section>

      {#if stack.dates.length >= 2}
        <section class="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <h2 class="font-semibold">{t("insights.perDay.title")}</h2>
          <div class="mt-4 h-64">
            <Chart option={stackOption} label={t("insights.perDay.title")} class="h-full w-full" />
          </div>
        </section>
      {/if}
    {/if}
  </div>
{/if}
