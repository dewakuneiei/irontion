import { describe, expect, it } from "vitest";
import { ALERT_ANIMATIONS, DEFAULT_ALERT_ANIMATION, parseAlertAnimation } from "./alertAnimation";

describe("alert animation", () => {
  it("keeps every known style", () => {
    for (const style of ALERT_ANIMATIONS) expect(parseAlertAnimation(style)).toBe(style);
  });

  it("falls back to the default for nothing, or something it does not know", () => {
    expect(DEFAULT_ALERT_ANIMATION).toBe("bounce");
    expect(parseAlertAnimation(null)).toBe("bounce");
    expect(parseAlertAnimation("")).toBe("bounce");
    expect(parseAlertAnimation("spin")).toBe("bounce");
  });
});
