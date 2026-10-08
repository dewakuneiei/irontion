import { parseBlockShape, type BlockShape } from "$lib/domain/blockShape";
import { DEFAULT_ACCENT, accentColor, accentVars, normalizeAccent, type Theme } from "$lib/domain/accent";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  isDateFormat,
  parseWeekStart,
  type DateFormat,
  type TimeFormat,
  type WeekStart,
} from "$lib/domain/datetime";


/** Which way the current block fills as its ten minutes pass: the direction the fill grows toward. */
export type FillDirection = "up" | "down" | "right" | "left";
/** Menu order. */
export const FILL_DIRECTIONS: FillDirection[] = ["right", "left", "up", "down"];
/** Left to right, the same way the grid reads time. */
const DEFAULT_FILL_DIRECTION: FillDirection = "right";

/** How a note's paper looks: with ruled lines or plain. */
export type NotePaper = "lined" | "plain";
export const NOTE_PAPERS: NotePaper[] = ["lined", "plain"];

const SHAPE_KEY = "irontion.cellShape";
const PAPER_KEY = "irontion.notePaper";
const FILL_KEY = "irontion.fillDirection";
const ANIMATIONS_KEY = "irontion.animations";
const FILL_ANIMATION_KEY = "irontion.fillAnimation";
const DATE_FORMAT_KEY = "irontion.dateFormat";
const WEEK_START_KEY = "irontion.weekStart";
const TIME_FORMAT_KEY = "irontion.timeFormat";
const ACCENT_KEY = "irontion.accent";
/** Both themes' accent variables, so app.html can apply them before the first paint. */
const ACCENT_VARS_KEY = "irontion.accentVars";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // Storage unavailable: fall back to the defaults.
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered across launches; the choice still applies for this session.
  }
}

function savedFillDirection(): FillDirection {
  const saved = read(FILL_KEY);
  return FILL_DIRECTIONS.find((direction) => direction === saved) ?? DEFAULT_FILL_DIRECTION;
}

function savedDateFormat(): DateFormat {
  const saved = read(DATE_FORMAT_KEY);
  return isDateFormat(saved) ? saved : DEFAULT_DATE_FORMAT;
}

/** How the app looks and reads: block shape and fill, accent color, and date and time formats. */
class PreferencesState {
  /** One of `BLOCK_SHAPES`. Saved values from earlier versions ("square", "circle") still load. */
  cellShape = $state<BlockShape>(parseBlockShape(read(SHAPE_KEY)));
  /** A preset id (see `ACCENT_PRESETS`) or a custom `#rrggbb` color. */
  accent = $state(normalizeAccent(read(ACCENT_KEY) ?? DEFAULT_ACCENT));
  dateFormat = $state<DateFormat>(savedDateFormat());
  weekStart = $state<WeekStart>(parseWeekStart(read(WEEK_START_KEY)));
  timeFormat = $state<TimeFormat>(read(TIME_FORMAT_KEY) === "12h" ? "12h" : DEFAULT_TIME_FORMAT);

  notePaper = $state<NotePaper>(read(PAPER_KEY) === "plain" ? "plain" : "lined");

  fillDirection = $state<FillDirection>(savedFillDirection());

  /** A gentle water wave on the surface of the filling block. */
  fillAnimation = $state(read(FILL_ANIMATION_KEY) !== "off");

  /** Motion across the app. Off stops every transition and animation (see `app.css`). */
  animations = $state(read(ANIMATIONS_KEY) !== "off");

  /** Whether code-driven motion (the board's moves) may play: the setting, and the OS's "reduce motion". */
  get motion(): boolean {
    return this.animations && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  setAnimations(on: boolean) {
    this.animations = on;
    write(ANIMATIONS_KEY, on ? "on" : "off");
  }

  setFillAnimation(on: boolean) {
    this.fillAnimation = on;
    write(FILL_ANIMATION_KEY, on ? "on" : "off");
  }

  setFillDirection(direction: FillDirection) {
    this.fillDirection = direction;
    write(FILL_KEY, direction);
  }

  setDateFormat(format: DateFormat) {
    this.dateFormat = format;
    write(DATE_FORMAT_KEY, format);
  }

  setWeekStart(start: WeekStart) {
    this.weekStart = start;
    write(WEEK_START_KEY, String(start));
  }

  setTimeFormat(format: TimeFormat) {
    this.timeFormat = format;
    write(TIME_FORMAT_KEY, format);
  }

  setNotePaper(paper: NotePaper) {
    this.notePaper = paper;
    write(PAPER_KEY, paper);
  }

  setCellShape(shape: BlockShape) {
    this.cellShape = shape;
    write(SHAPE_KEY, shape);
  }

  setAccent(value: string) {
    this.accent = normalizeAccent(value);
    write(ACCENT_KEY, this.accent);
    write(
      ACCENT_VARS_KEY,
      JSON.stringify({ light: accentVars(this.accent, "light"), dark: accentVars(this.accent, "dark") }),
    );
  }

  /** The accent as a `#rrggbb` color for one theme (charts need real colors, not CSS variables). */
  accentFor(theme: Theme): string {
    return accentColor(this.accent, theme);
  }

  /** Put the preferences on <html> so CSS can use them. Call from an effect so it follows changes. */
  apply(theme: Theme) {
    const root = document.documentElement;
    const vars = accentVars(this.accent, theme);
    root.dataset.notePaper = this.notePaper;
    root.dataset.animations = this.animations ? "on" : "off";
    root.style.setProperty("--accent", vars.accent);
    root.style.setProperty("--accent-soft", vars.soft);
    root.style.setProperty("--accent-ink", vars.ink);
  }
}

export const preferences = new PreferencesState();
