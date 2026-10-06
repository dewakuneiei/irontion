import { describe, expect, it } from "vitest";
import { SIDEBAR_MAIN, contextFor, isActive, pathOf } from "./nav";

const today = SIDEBAR_MAIN[0];

describe("paths from the packaged app", () => {
  it("reads the empty root of tauri://localhost as /", () => {
    expect(new URL("tauri://localhost").pathname).toBe("");
    expect(pathOf(new URL("tauri://localhost"))).toBe("/");
    expect(pathOf(new URL("http://localhost:1420/"))).toBe("/");
    expect(pathOf(new URL("tauri://localhost/notes/3"))).toBe("/notes/3");
  });

  it("highlights Today on the empty root and keeps Settings out of the main context", () => {
    expect(isActive(today, "")).toBe(true);
    expect(isActive(today, "/notes")).toBe(false);
    expect(contextFor("").id).toBe("main");
    expect(contextFor("/settings/appearance").id).toBe("settings");
  });
});
