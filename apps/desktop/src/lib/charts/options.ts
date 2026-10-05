// Chart option builders shared by pages, so every chart follows the same mark specs.

import type { LocaleCode } from "$lib/i18n/index.svelte";
import type { WeekStart } from "$lib/domain/datetime";
import type { ChartOption } from "./echarts";
import { chartFont, tooltipStyle, type ChartPalette } from "./palette";

export interface BarRow {
  label: string;
  value: number;
  color: string;
}

/** Horizontal bars, largest on top, value labels at the tips. */
export function barChart(
  rows: BarRow[],
  p: ChartPalette,
  locale: LocaleCode,
  format: (value: number) => string,
): ChartOption {
  // ECharts draws category axes bottom-up.
  const ordered = [...rows].sort((a, b) => a.value - b.value);
  return {
    textStyle: { fontFamily: chartFont(locale) },
    animationDuration: 600,
    animationEasing: "cubicOut",
    grid: { left: 0, right: 72, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: p.grid, width: 1 } },
      axisLabel: { color: p.muted },
    },
    yAxis: {
      type: "category",
      data: ordered.map((r) => r.label),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { color: p.text2, fontSize: 13, margin: 12, width: 140, overflow: "truncate" },
    },
    tooltip: {
      ...tooltipStyle(p),
      trigger: "item",
      formatter: (params: { name: string; value: number }) =>
        `<b>${format(params.value)}</b><br/><span style="color:${p.text2}">${escapeHtml(params.name)}</span>`,
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 20,
        data: ordered.map((r) => ({ value: r.value, itemStyle: { color: r.color, borderRadius: [0, 4, 4, 0] } })),
        label: {
          show: true,
          position: "right",
          color: p.text2,
          formatter: (params: { value: number }) => format(params.value),
        },
        emphasis: { itemStyle: { opacity: 0.85 } },
      },
    ],
  };
}

export interface HeatmapInput {
  /** [isoDate, hours] */
  daily: [string, number][];
  range: [string, string];
  palette: ChartPalette;
  locale: LocaleCode;
  weekStart: WeekStart;
  formatValue: (hours: number) => string;
  formatDay: (iso: string) => string;
}

/** Calendar heatmap of hours per day. */
export function calendarHeatmap({ daily, range, palette: p, locale, weekStart, formatValue, formatDay }: HeatmapInput): ChartOption {
  const steps = p.sequential;
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // Jan 2023 starts on a Sunday, matching ECharts' Sunday-first name order.
  const dayNames = Array.from({ length: 7 }, (_, i) => dayFmt.format(new Date(2023, 0, 1 + i)));
  const monthNames = Array.from({ length: 12 }, (_, i) => monthFmt.format(new Date(2023, i, 1)));
  return {
    textStyle: { fontFamily: chartFont(locale) },
    animationDuration: 600,
    tooltip: {
      ...tooltipStyle(p),
      formatter: (params: { value: [string, number] }) => {
        const [iso, hours] = params.value;
        return `<b>${formatValue(hours)}</b><br/><span style="color:${p.text2}">${formatDay(iso)}</span>`;
      },
    },
    visualMap: {
      type: "piecewise",
      show: false,
      dimension: 1,
      pieces: [
        // A fully tracked day (sleep included) can reach 24 h, so step every 4 hours.
        { value: 0, color: p.empty },
        { gt: 0, lte: 4, color: steps[0] },
        { gt: 4, lte: 8, color: steps[1] },
        { gt: 8, lte: 12, color: steps[2] },
        { gt: 12, lte: 16, color: steps[3] },
        { gt: 16, color: steps[4] },
      ],
    },
    calendar: {
      range,
      top: 22,
      left: 28,
      right: 4,
      bottom: 4,
      cellSize: ["auto", 15],
      splitLine: { show: false },
      itemStyle: { color: "transparent", borderColor: p.surface, borderWidth: 2 },
      yearLabel: { show: false },
      monthLabel: { color: p.muted, nameMap: monthNames },
      dayLabel: { firstDay: weekStart, color: p.muted, fontSize: 10, nameMap: dayNames },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: daily,
        itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 3 },
        emphasis: { itemStyle: { borderColor: p.text, borderWidth: 1 } },
      },
    ],
  };
}

/** Activity and tag names are user input and end up in tooltip HTML. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
