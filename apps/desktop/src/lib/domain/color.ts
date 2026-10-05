/**
 * Starting colors offered for activities and tags. Mid-lightness steps that read
 * on both the light and dark surfaces; users can still pick any color.
 */
export const ACTIVITY_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6a5ae0", // violet
  "#e34948", // red
  "#4a90a4", // teal
  "#8a6d3b", // brown
  "#898781", // gray
] as const;

/** Page surfaces the chart and accent colors are checked against. Keep in sync with `--surface` in app.css. */
export const SURFACE = { light: "#fcfcfb", dark: "#1a1a19" } as const;

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two `#rrggbb` colors, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white text, whichever contrasts more with the background. */
export function readableInk(background: string): "#000000" | "#ffffff" {
  return contrastRatio(background, "#000000") > contrastRatio(background, "#ffffff") ? "#000000" : "#ffffff";
}

/** `weight` of `b` mixed into `a`, as `#rrggbb`. */
export function mixHex(a: string, b: string, weight: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) => Math.round(channel(a, i) * (1 - weight) + channel(b, i) * weight))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** `#rrggbb` as `rgba(...)` with the given opacity. */
export function withAlpha(hex: string, opacity: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Nudge a color toward black or white until it reads on `surface`. Colors that already pass are unchanged. */
export function ensureContrast(color: string, surface: string, minimum: number): string {
  const target = luminance(surface) > 0.5 ? "#000000" : "#ffffff";
  let result = color;
  for (let step = 1; contrastRatio(result, surface) < minimum && step <= 20; step++) {
    result = mixHex(color, target, step / 20);
  }
  return result;
}

/** Next starting color not yet used by a top-level activity. */
export function nextColor(used: Iterable<string | null>): string {
  const taken = new Set([...used].filter(Boolean));
  return ACTIVITY_COLORS.find((c) => !taken.has(c)) ?? ACTIVITY_COLORS[0];
}
