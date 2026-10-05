<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Clock from "@lucide/svelte/icons/clock";
  import Flame from "@lucide/svelte/icons/flame";
  import Grid3x3 from "@lucide/svelte/icons/grid-3x3";
  import Shapes from "@lucide/svelte/icons/shapes";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import { barChart, calendarHeatmap } from "$lib/charts/options";
  import { chartPalette } from "$lib/charts/palette";
  import Chart from "$lib/components/Chart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import StatTile from "$lib/components/StatTile.svelte";
  import { blocksOn, currentStreak, totalBlocks } from "$lib/domain/stats";
  import { addDays, SLOT_MINUTES, todayISO } from "$lib/domain/time";
  import { buildTree, rollUp } from "$lib/domain/tree";
  import { formatDayLabel } from "$lib/format.svelte";
  import { formatMinutes, i18n, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { day } from "$lib/stores/day.svelte";
  import { RangeReport } from "$lib/stores/report.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import { theme } from "$lib/theme.svelte";

  const HEATMAP_DAYS = 182;
  const now = new Date();
  const today = todayISO();
  const weekStart = addDays(today, -6);
  const heatmapStart = addDays(today, -(HEATMAP_DAYS - 1));

  const week = new RangeReport();
  const history = new RangeReport();

  // Refetch whenever activities or blocks change anywhere in the app.
  $effect(() => {
    void catalog.version;
    void day.version;
    void week.load(weekStart, today);
    void history.load(heatmapStart, today);
  });

  const greeting = $derived.by(() => {
    const h = now.getHours();
    if (h < 5) return t("greeting.night");
    if (h < 12) return t("greeting.morning");
    if (h < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  });
  const dateLabel = $derived(formatDayLabel(today));

  const todayMinutes = $derived(blocksOn(history.dailyTotals, today) * SLOT_MINUTES);
  const weekMinutes = $derived(totalBlocks(week.dailyTotals) * SLOT_MINUTES);
  const streak = $derived(currentStreak(history.dailyTotals, today));

  const palette = $derived(chartPalette(theme.resolved, preferences.accentFor(theme.resolved)));
  const hoursLabel = (hours: number) =>
    t("units.hours", { n: new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(hours) });

  const weekOption = $derived.by(() => {
    const tree = buildTree(catalog.activities, true);
    const totals = rollUp(tree, week.direct);
    const rows = tree
      .map((node) => ({
        label: node.activity.name,
        value: ((totals.get(node.activity.id) ?? 0) * SLOT_MINUTES) / 60,
        color: catalog.colorOf(node.activity.id),
      }))
      .filter((row) => row.value > 0);
    return barChart(rows, palette, i18n.locale, hoursLabel);
  });

  const heatOption = $derived(
    calendarHeatmap({
      daily: history.dailyTotals.map((d) => [d.date, (d.blocks * SLOT_MINUTES) / 60]),
      range: [heatmapStart, today],
      palette,
      locale: i18n.locale,
      weekStart: preferences.weekStart,
      formatValue: hoursLabel,
      formatDay: (iso) => formatDayLabel(iso, "short"),
    }),
  );

  const legendSwatches = $derived([palette.empty, ...palette.sequential]);
  const enter = (i: number) => ({ y: 14, duration: 420, delay: 60 + i * 70, easing: cubicOut });
</script>

<header class="mb-7">
  <p class="text-sm font-medium text-muted">{dateLabel}</p>
  <h1 class="mt-1 text-3xl font-semibold tracking-tight">{greeting}</h1>
  <p class="mt-1 text-ink-2">{t("app.tagline")}</p>
</header>

{#if catalog.loaded && catalog.activities.length === 0}
  <EmptyState icon={Shapes} title={t("today.empty.title")} body={t("today.empty.body")}>
    {#snippet action()}
      <a href="/activities" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink">
        {t("today.empty.action")}
      </a>
    {/snippet}
  </EmptyState>
{:else}
  {#if history.loaded && todayMinutes === 0}
    <a
      href="/blocks"
      class="mb-6 flex items-center gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-ink-2 transition-colors hover:text-ink"
      in:fly={enter(0)}
    >
      <Grid3x3 size={18} class="shrink-0 text-accent" />
      <span class="flex-1">{t("today.nothingYet")}</span>
      <span class="font-medium text-accent">{t("today.fillBlocks")}</span>
    </a>
  {/if}

  <section class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div in:fly={enter(1)}>
      <StatTile label={t("today.stats.tracked")} value={todayMinutes} format={formatMinutes} icon={Clock} />
    </div>
    <div in:fly={enter(2)}>
      <StatTile label={t("today.stats.week")} value={weekMinutes} format={formatMinutes} icon={CalendarDays} />
    </div>
    <div in:fly={enter(3)}>
      <StatTile label={t("today.stats.streak")} value={streak} format={(n) => t("units.days", { n })} icon={Flame} />
    </div>
  </section>

  <section class="grid gap-4 lg:grid-cols-5">
    <article class="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-2" in:fly={enter(4)}>
      <h2 class="font-semibold">{t("today.byActivity.title")}</h2>
      <p class="text-sm text-muted">{t("today.byActivity.subtitle")}</p>
      {#if week.activityTotals.length > 0}
        <Chart option={weekOption} label={t("today.byActivity.title")} class="mt-3 h-52 w-full" />
      {:else}
        <p class="mt-6 text-sm text-muted">{t("today.noData")}</p>
      {/if}
    </article>

    <article class="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-3" in:fly={enter(5)}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold">{t("today.heatmap.title")}</h2>
          <p class="text-sm text-muted">{t("today.heatmap.subtitle")}</p>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-muted" aria-hidden="true">
          {t("today.heatmap.less")}
          {#each legendSwatches as color, i (i)}
            <span class="size-3 rounded-[3px]" style:background={color}></span>
          {/each}
          {t("today.heatmap.more")}
        </div>
      </div>
      {#if history.dailyTotals.length > 0}
        <Chart option={heatOption} label={t("today.heatmap.title")} class="mt-3 h-44 w-full" />
      {:else}
        <p class="mt-6 text-sm text-muted">{t("today.noData")}</p>
      {/if}
    </article>
  </section>
{/if}
