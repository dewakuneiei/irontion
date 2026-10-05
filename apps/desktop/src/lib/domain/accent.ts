// The app's accent color: a preset, or any custom color the user picks.

import { SURFACE, contrastRatio, ensureContrast, mixHex, withAlpha } from "./color";

/** Each preset has its own step per theme, chosen to read on that theme's surface. */
export const ACCENT_PRESETS = [
  { id: "blue", light: "#2a78d6", dark: "#3987e5" },
  { id: "violet", light: "#6a4ee0", dark: "#8f7cf0" },
  { id: "teal", light: "#0b7f72", dark: "#2dbfa9" },
  { id: "green", light: "#2a7d3a", dark: "#4cc16a" },
  { id: "orange", light: "#b84e0a", dark: "#f0893a" },
  { id: "rose", light: "#c8326b", dark: "#ee6a9b" },
  { id: "graphite", light: "#3f4652", dark: "#aab2bf" },
] as const;

export type AccentId = (typeof ACCENT_PRESETS)[number]["id"];
export type Theme = "light" | "dark";

export const DEFAULT_ACCENT: AccentId = "blue";

/** The three CSS variables the accent drives. */
export interface AccentVars {
  accent: string;
  /** Translucent wash behind selected items. */
  soft: string;
  /** Text on top of the accent. */
  ink: string;
}

const HEX = /^#[0-9a-f]{6}$/i;
const MIN_TEXT_CONTRAST = 4.5;
const MIN_INK_CONTRAST = 3.5;

/** A saved value is either a preset id or a `#rrggbb` color. Anything else falls back to the default. */
export function normalizeAccent(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_ACCENT;
  if (ACCENT_PRESETS.some((preset) => preset.id === value)) return value;
  return HEX.test(value) ? value.toLowerCase() : DEFAULT_ACCENT;
}

/** The accent color for one theme. Custom colors are adjusted so they stay readable. */
export function accentColor(value: string, theme: Theme): string {
  const preset = ACCENT_PRESETS.find((p) => p.id === value);
  if (preset) return preset[theme];
  const base = normalizeAccent(value);
  const adapted = theme === "dark" ? mixHex(base, "#ffffff", 0.2) : base;
  return ensureContrast(adapted, SURFACE[theme], MIN_TEXT_CONTRAST);
}

export function accentVars(value: string, theme: Theme): AccentVars {
  const accent = accentColor(value, theme);
  // White text unless it would be hard to read, then black.
  const ink = contrastRatio(accent, "#ffffff") >= MIN_INK_CONTRAST ? "#ffffff" : "#000000";
  return { accent, soft: withAlpha(accent, theme === "dark" ? 0.16 : 0.12), ink };
}

/** Five steps from faint to full strength, for heatmaps: the accent faded into the surface. */
export function sequentialRamp(accent: string, theme: Theme): string[] {
  return [0.25, 0.45, 0.65, 0.85, 1].map((strength) => mixHex(SURFACE[theme], accent, strength));
}
