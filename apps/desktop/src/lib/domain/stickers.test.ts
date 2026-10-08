import { describe, expect, it } from "vitest";
import type { DaySticker } from "$lib/api/types";
import {
  MAX_STICKER_BYTES,
  MAX_ZOOM,
  STICKER_MAX_PX,
  centeredView,
  clampView,
  cropSquare,
  isStickerPreset,
  isValidStickerPng,
  nameFromFile,
  outputSide,
  panView,
  pngSize,
  stickersByDate,
} from "./stickers";

/** The start of a PNG: signature and IHDR, which is all the size check reads. */
function png(width: number, height: number, length = 33): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("sticker images", () => {
  it("reads a PNG's size and refuses anything else", () => {
    expect(pngSize(png(120, 80))).toEqual({ width: 120, height: 80 });
    expect(pngSize(new TextEncoder().encode("GIF89a and more bytes than twenty-four"))).toBeNull();
    expect(pngSize(png(1, 1).slice(0, 20))).toBeNull();
  });

  it("accepts only a small square, like the core", () => {
    expect(isValidStickerPng(png(256, 256))).toBe(true);
    expect(isValidStickerPng(png(32, 32))).toBe(true);
    expect(isValidStickerPng(png(256, 255))).toBe(false);
    expect(isValidStickerPng(png(257, 257))).toBe(false);
    expect(isValidStickerPng(png(0, 0))).toBe(false);
    expect(isValidStickerPng(png(64, 64, MAX_STICKER_BYTES + 1))).toBe(false);
  });

  it("names a sticker after its file", () => {
    expect(nameFromFile("my_cat-photo.final.JPG")).toBe("my cat photo.final");
    expect(nameFromFile("x".repeat(80) + ".png")).toHaveLength(60);
    expect(nameFromFile(".png")).toBe("");
  });
});

describe("presets and days", () => {
  it("knows the presets", () => {
    expect(isStickerPreset("star")).toBe(true);
    expect(isStickerPreset("unicorn")).toBe(false);
  });


  it("groups by day and keeps the order", () => {
    const list: DaySticker[] = [
      { id: 1, date: "2026-10-08", sticker: { kind: "preset", preset: "star" } },
      { id: 3, date: "2026-10-08", sticker: { kind: "custom", stickerId: 4 } },
      { id: 2, date: "2026-10-09", sticker: { kind: "preset", preset: "sun" } },
    ];
    const byDate = stickersByDate(list);
    expect(byDate.get("2026-10-08")?.map((s) => s.id)).toEqual([1, 3]);
    expect(byDate.get("2026-10-09")?.map((s) => s.id)).toEqual([2]);
    expect(byDate.has("2026-10-10")).toBe(false);
  });
});

describe("the square crop", () => {
  const wide = { width: 1000, height: 600 };

  it("starts with the largest square in the middle", () => {
    expect(cropSquare(wide, centeredView(wide))).toEqual({ sx: 200, sy: 0, side: 600 });
  });

  it("keeps the square inside the image and the zoom in bounds", () => {
    expect(clampView(wide, { zoom: 1, x: 0, y: 0 })).toEqual({ zoom: 1, x: 300, y: 300 });
    expect(clampView(wide, { zoom: 0.2, x: 500, y: 300 }).zoom).toBe(1);
    expect(clampView(wide, { zoom: 99, x: 500, y: 300 }).zoom).toBe(MAX_ZOOM);
    expect(cropSquare(wide, { zoom: 2, x: 1000, y: 600 })).toEqual({ sx: 700, sy: 300, side: 300 });
  });

  it("moves the square against the drag, at the frame's scale", () => {
    // A 300 px frame shows a 600 px square: 2 image pixels per screen pixel.
    const moved = panView(wide, centeredView(wide), 50, 0, 300);
    expect(moved.x).toBe(400);
    expect(panView(wide, centeredView(wide), -1000, 0, 300).x).toBe(700);
  });

  it("is never larger than a sticker may be, and keeps small crops small", () => {
    expect(outputSide({ sx: 0, sy: 0, side: 600 })).toBe(STICKER_MAX_PX);
    expect(outputSide({ sx: 0, sy: 0, side: 80.4 })).toBe(80);
    expect(outputSide({ sx: 0, sy: 0, side: 0.2 })).toBe(1);
  });
});
