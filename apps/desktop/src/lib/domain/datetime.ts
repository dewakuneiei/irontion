// Date and time display preferences, as pure functions of a locale and a choice.

/** Ways to write a date. `system` follows the app language's own convention. */
export const DATE_FORMATS = [
  "system",
  "dd/mm/yyyy",
  "mm/dd/yyyy",
  "yyyy-mm-dd",
  "dd.mm.yyyy",
  "dd-mm-yyyy",
  "yyyy/mm/dd",
  "d mmm yyyy",
  "mmm d, yyyy",
] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

/** The weekday a week starts on, numbered like `Date.getDay()`: 0 is Sunday, 1 Monday, ... 6 Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeFormat = "24h" | "12h";

/** The order weekdays are listed in a menu, starting Monday. */
export const WEEK_STARTS: readonly WeekStart[] = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_DATE_FORMAT: DateFormat = "system";
export const DEFAULT_WEEK_START: WeekStart = 1;
export const DEFAULT_TIME_FORMAT: TimeFormat = "24h";

export function isDateFormat(value: unknown): value is DateFormat {
  return (DATE_FORMATS as readonly unknown[]).includes(value);
}

/** Read a saved week start. Understands the old "monday" and "sunday" values too. */
export function parseWeekStart(saved: string | null): WeekStart {
  if (saved === "sunday") return 0;
  if (saved === "monday") return DEFAULT_WEEK_START;
  const day = Number(saved);
  return saved !== null && Number.isInteger(day) && day >= 0 && day <= 6 ? (day as WeekStart) : DEFAULT_WEEK_START;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A date (no time) in the chosen format. Month names come from `locale`; numbers are Gregorian. */
export function formatDate(date: Date, format: DateFormat, locale: string): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const monthName = () => new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  switch (format) {
    case "system":
      return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    case "dd/mm/yyyy":
      return `${pad(d)}/${pad(m)}/${y}`;
    case "mm/dd/yyyy":
      return `${pad(m)}/${pad(d)}/${y}`;
    case "yyyy-mm-dd":
      return `${y}-${pad(m)}-${pad(d)}`;
    case "dd.mm.yyyy":
      return `${pad(d)}.${pad(m)}.${y}`;
    case "dd-mm-yyyy":
      return `${pad(d)}-${pad(m)}-${y}`;
    case "yyyy/mm/dd":
      return `${y}/${pad(m)}/${pad(d)}`;
    case "d mmm yyyy":
      return `${d} ${monthName()} ${y}`;
    case "mmm d, yyyy":
      return `${monthName()} ${d}, ${y}`;
  }
}

/** Time of day from minutes since midnight: "08:10" (24h) or "8:10" (12h, the hour row shows AM/PM). */
export function formatClock(minutes: number, format: TimeFormat): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = pad(minutes % 60);
  if (format === "24h") return `${pad(h)}:${m}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

/** Hour label for a grid row: "08" (24h) or "8 AM" in the locale's wording (12h). */
export function formatHour(hour: number, format: TimeFormat, locale: string): string {
  if (format === "24h") return pad(hour);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true }).format(new Date(2023, 0, 1, hour));
}

/** What the language calls the morning and the afternoon half of the day ("AM", "午前"). */
export function dayPeriods(locale: string): { am: string; pm: string } {
  const name = (hour: number, fallback: string) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true })
      .formatToParts(new Date(2023, 0, 1, hour))
      .find((part) => part.type === "dayPeriod")?.value ?? fallback;
  return { am: name(1, "AM"), pm: name(13, "PM") };
}

/** The 42 days (6 weeks) shown for a month in a calendar, starting on `weekStart`. */
export function monthGrid(year: number, month: number, weekStart: WeekStart): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - lead + i));
}

/** One weekday's name in the given language. */
export function weekdayName(day: WeekStart, locale: string, style: "narrow" | "short" | "long"): string {
  // 1 January 2023 was a Sunday, so adding `day` lands on that weekday.
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2023, 0, 1 + day));
}

/** Weekday names in calendar order, starting from `weekStart`. */
export function weekdayNames(weekStart: WeekStart, locale: string, style: "narrow" | "short" | "long"): string[] {
  return Array.from({ length: 7 }, (_, i) => weekdayName(((weekStart + i) % 7) as WeekStart, locale, style));
}
