// Dates and times for display, in the user's language and chosen formats.
// Call these from templates or `$derived` so they update when a preference changes.

import { formatClock, formatDate, formatHour, type TimeFormat } from "$lib/domain/datetime";
import { SLOT_MINUTES, fromISODate } from "$lib/domain/time";
import { i18n, t } from "$lib/i18n/index.svelte";
import { preferences } from "$lib/preferences.svelte";

/** "06/10/2026", in the chosen date format. */
export function formatDay(iso: string): string {
  return formatDate(fromISODate(iso), preferences.dateFormat, i18n.locale);
}

/** "Tuesday, 06/10/2026": weekday plus date, ordered the way the language reads. */
export function formatDayLabel(iso: string, weekday: "long" | "short" = "long"): string {
  const name = new Intl.DateTimeFormat(i18n.locale, { weekday }).format(fromISODate(iso));
  return t("dates.dayLabel", { weekday: name, date: formatDay(iso) });
}

/** A time of day with AM/PM when using 12-hour time: "08:10" or "8:10 AM". */
export function formatTimeOfDay(minutes: number, format: TimeFormat = preferences.timeFormat): string {
  if (format === "24h") return formatClock(minutes, "24h");
  const at = new Date(2023, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(i18n.locale, { hour: "numeric", minute: "2-digit", hour12: true }).format(at);
}

/** Start time inside a selected cell: short, the hour row already says AM or PM. */
export function formatCellTime(slot: number): string {
  return formatClock(slot * SLOT_MINUTES, preferences.timeFormat);
}

/** "08:00–08:40" from the first to the last selected slot. */
export function formatSlotSpan(first: number, last: number): string {
  return `${formatTimeOfDay(first * SLOT_MINUTES)}–${formatTimeOfDay((last + 1) * SLOT_MINUTES)}`;
}

/** Start and end of one slot, for labels and tooltips. */
export function slotTimes(slot: number): { start: string; end: string } {
  return { start: formatTimeOfDay(slot * SLOT_MINUTES), end: formatTimeOfDay((slot + 1) * SLOT_MINUTES) };
}

/** Hour row label: "08" or "8 AM". */
export function formatHourLabel(hour: number): string {
  return formatHour(hour, preferences.timeFormat, i18n.locale);
}
