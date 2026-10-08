<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Button from "$lib/components/Button.svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import {
    PERIOD_KINDS,
    contains,
    currentPeriod,
    periodSpan,
    setRangeFrom,
    setRangeTo,
    spanDays,
    stepPeriod,
    switchKind,
    type Period,
  } from "$lib/domain/period";
  import { fromISODate } from "$lib/domain/time";
  import { formatDay, formatDayLabel } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";

  /** Which days Insights shows (F002): a day, week or month to step through, or a range of any days. */
  let { period = $bindable(), today }: { period: Period; today: string } = $props();

  const span = $derived(periodSpan(period, preferences.weekStart));
  /** Already showing the period with today in it (a range: one that ends today). */
  const isCurrent = $derived(period.kind === "range" ? span.to === today : contains(span, today));

  const label = $derived.by(() => {
    if (period.kind === "day") return formatDayLabel(span.from);
    if (period.kind === "month") {
      return new Intl.DateTimeFormat(i18n.locale, { month: "long", year: "numeric" }).format(fromISODate(span.from));
    }
    return t("dates.span", { from: formatDay(span.from), to: formatDay(span.to) });
  });

  const step = (delta: number) => (period = stepPeriod(period, delta, preferences.weekStart));
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2" data-period={period.kind}>
  <div class="flex flex-wrap rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label={t("insights.period.label")}>
    {#each PERIOD_KINDS as kind (kind)}
      <button
        type="button"
        role="radio"
        aria-checked={period.kind === kind}
        onclick={() => (period = switchKind(period, kind, today, preferences.weekStart))}
        class="h-7 rounded-md px-3 text-[13px] font-medium whitespace-nowrap {period.kind === kind
          ? 'bg-surface text-ink shadow-card'
          : 'text-muted hover:text-ink-2'}"
      >
        {t(`insights.period.kind.${kind}`)}
      </button>
    {/each}
  </div>

  {#if period.kind === "range"}
    <div class="flex flex-wrap items-center gap-2">
      <DatePicker value={span.from} label={t("insights.period.from")} onchange={(iso) => (period = setRangeFrom(span, iso))} />
      <span class="flex items-center gap-2">
        <span class="text-muted" aria-hidden="true">–</span>
        <DatePicker value={span.to} label={t("insights.period.to")} onchange={(iso) => (period = setRangeTo(span, iso))} />
      </span>
      <span class="text-sm text-muted tabular-nums">{t("insights.period.days", { n: spanDays(span) })}</span>
    </div>
  {:else}
    <div class="flex min-w-0 items-center gap-1">
      <Button variant="ghost" size="icon" aria-label={t(`insights.period.prev.${period.kind}`)} title={t(`insights.period.prev.${period.kind}`)} onclick={() => step(-1)}>
        <ChevronLeft size={18} />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t(`insights.period.next.${period.kind}`)} title={t(`insights.period.next.${period.kind}`)} onclick={() => step(1)}>
        <ChevronRight size={18} />
      </Button>
      <h2 class="min-w-0 px-1 text-base font-semibold tracking-tight" aria-live="polite" data-period-label>{label}</h2>
    </div>
  {/if}

  <Button size="sm" disabled={isCurrent} onclick={() => (period = currentPeriod(period, today))} data-period-current>
    {t(`insights.period.current.${period.kind}`)}
  </Button>
</div>
