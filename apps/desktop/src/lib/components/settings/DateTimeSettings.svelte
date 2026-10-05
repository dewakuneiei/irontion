<script lang="ts">
  import Select from "$lib/components/Select.svelte";
  import {
    DATE_FORMATS,
    WEEK_STARTS,
    formatDate,
    weekdayName,
    type DateFormat,
    type TimeFormat,
    type WeekStart,
  } from "$lib/domain/datetime";
  import { formatTimeOfDay } from "$lib/format.svelte";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";

  const today = new Date();
  const afternoon = 14 * 60 + 30;
  const timeFormats: TimeFormat[] = ["24h", "12h"];

  // Each date format shows today's date, so the choice is clear without reading the pattern.
  const dateFormats = $derived(
    DATE_FORMATS.map((format) => ({
      value: format as DateFormat,
      label: formatDate(today, format, i18n.locale),
      hint: format === "system" ? t("settings.dateTime.system") : format.toUpperCase(),
    })),
  );
  const weekStarts = $derived(
    WEEK_STARTS.map((day) => ({ value: day as WeekStart, label: weekdayName(day, i18n.locale, "long") })),
  );
</script>

<div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
  <div>
    <span class="mb-2 block text-sm font-medium">{t("settings.dateTime.dateFormat")}</span>
    <Select
      value={preferences.dateFormat}
      options={dateFormats}
      label={t("settings.dateTime.dateFormat")}
      onchange={(format) => preferences.setDateFormat(format)}
    />
  </div>

  <div>
    <span class="mb-2 block text-sm font-medium">{t("settings.dateTime.weekStart")}</span>
    <Select
      value={preferences.weekStart}
      options={weekStarts}
      label={t("settings.dateTime.weekStart")}
      onchange={(day) => preferences.setWeekStart(day)}
    />
  </div>

  <fieldset>
    <legend class="mb-2 text-sm font-medium">{t("settings.dateTime.timeFormat")}</legend>
    <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label={t("settings.dateTime.timeFormat")}>
      {#each timeFormats as format (format)}
        <button
          type="button"
          role="radio"
          aria-checked={preferences.timeFormat === format}
          onclick={() => preferences.setTimeFormat(format)}
          class="flex flex-col items-center rounded-lg px-3 py-1.5 text-sm transition-colors {preferences.timeFormat === format
            ? 'bg-surface font-medium text-ink shadow-card'
            : 'text-ink-2 hover:text-ink'}"
        >
          {t(format === "24h" ? "settings.dateTime.h24" : "settings.dateTime.h12")}
          <span class="text-xs text-muted tabular-nums">{formatTimeOfDay(afternoon, format)}</span>
        </button>
      {/each}
    </div>
  </fieldset>
</div>
