import { describe, expect, it } from "vitest";
import { ACCENT_PRESETS, accentColor, accentVars, normalizeAccent, sequentialRamp } from "./accent";
import { SURFACE, contrastRatio, ensureContrast, mixHex } from "./color";

describe("accent presets", () => {
  it.each(ACCENT_PRESETS.flatMap((p) => [[p.id, "light"], [p.id, "dark"]] as const))(
    "%s reads as text on the %s surface",
    (id, theme) => {
      expect(contrastRatio(accentColor(id, theme), SURFACE[theme])).toBeGreaterThanOrEqual(4.2);
    },
  );

  it.each(ACCENT_PRESETS.flatMap((p) => [[p.id, "light"], [p.id, "dark"]] as const))(
    "%s has readable text on its button in the %s theme",
    (id, theme) => {
      const { accent, ink } = accentVars(id, theme);
      expect(contrastRatio(accent, ink)).toBeGreaterThanOrEqual(3.3);
    },
  );
});

describe("custom accents", () => {
  it("accepts a preset id or a hex color, and falls back otherwise", () => {
    expect(normalizeAccent("violet")).toBe("violet");
    expect(normalizeAccent("#FF8800")).toBe("#ff8800");
    expect(normalizeAccent("javascript:alert(1)")).toBe("blue");
    expect(normalizeAccent(42)).toBe("blue");
  });

  it("keeps a very light color readable on the light surface", () => {
    expect(contrastRatio(accentColor("#ffee00", "light"), SURFACE.light)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a very dark color readable on the dark surface", () => {
    expect(contrastRatio(accentColor("#0a0a30", "dark"), SURFACE.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves colors that already read alone", () => {
    expect(ensureContrast("#2a78d6", SURFACE.light, 3)).toBe("#2a78d6");
  });
});

describe("sequentialRamp", () => {
  it("goes from faint to the full accent", () => {
    const ramp = sequentialRamp("#2a78d6", "light");
    expect(ramp).toHaveLength(5);
    expect(ramp[4]).toBe("#2a78d6");
    expect(ramp[0]).toBe(mixHex(SURFACE.light, "#2a78d6", 0.25));
    expect(contrastRatio(ramp[0], SURFACE.light)).toBeLessThan(contrastRatio(ramp[4], SURFACE.light));
  });
});
