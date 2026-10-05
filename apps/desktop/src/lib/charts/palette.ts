import { sequentialRamp } from "$lib/domain/accent";
import { SURFACE } from "$lib/domain/color";
import type { LocaleCode } from "$lib/i18n/index.svelte";
import type { ResolvedTheme } from "$lib/theme.svelte";

/**
 * Chart colors per theme. The categorical order is CVD-validated: assign slots in
 * order and never cycle. Dark values are separate steps chosen for the dark surface,
 * not an automatic inversion.
 */
const PALETTES = {
  light: {
    surface: SURFACE.light,
    text: "#0b0b0b",
    text2: "#52514e",
    muted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    empty: "#f0efec",
    categorical: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  },
  dark: {
    surface: SURFACE.dark,
    text: "#ffffff",
    text2: "#c3c2b7",
    muted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
    empty: "#232322",
    categorical: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  },
} as const;

export type ChartPalette = (typeof PALETTES)[ResolvedTheme] & {
  /** Five steps from faint to full strength, in the user's accent. */
  sequential: string[];
};

/** `accent` is the user's accent for this theme (`preferences.accentFor(theme)`). */
export function chartPalette(theme: ResolvedTheme, accent: string): ChartPalette {
  return { ...PALETTES[theme], sequential: sequentialRamp(accent, theme) };
}

/**
 * Canvas text can't inherit CSS fonts, so charts get an explicit stack.
 * Mirrors `--font-ui` in app.css, with the regional CJK font first per language.
 */
const CJK_FONT: Partial<Record<LocaleCode, string>> = { ja: "Noto Sans CJK JP", ko: "Noto Sans CJK KR" };

export function chartFont(locale: LocaleCode): string {
  const cjk = CJK_FONT[locale] ?? "Noto Sans CJK SC";
  return `"Inter Variable", "${cjk}", "Noto Sans Thai Variable", system-ui, sans-serif`;
}

/** Shared tooltip styling: surface card, primary ink, hairline border. */
export function tooltipStyle(p: ChartPalette) {
  return {
    backgroundColor: p.surface,
    borderColor: p.axis,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: p.text, fontFamily: "inherit", fontSize: 12 },
    extraCssText: "border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.12);",
  };
}
