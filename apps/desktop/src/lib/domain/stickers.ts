// Stickers on calendar days (F007): the rules shared with `irontion_core::stickers`, and the math of
// the square crop the user makes before an image becomes a sticker. No I/O, no Svelte.

import type { DaySticker } from "$lib/api/types";

/** Built-in stickers, by id. Same list and order as `STICKER_PRESETS` in the core. */
export const STICKER_PRESETS = [
  "star", "heart", "sun", "moon", "cloud", "rain", "flower", "leaf", "fire", "check", "trophy", "coffee", "book",
  "music", "cake", "gift",
] as const;
export type StickerPreset = (typeof STICKER_PRESETS)[number];

/** Most stickers one day can carry (`MAX_DAY_STICKERS` in the core). */
export const MAX_DAY_STICKERS = 6;
/** A sticker image is a square of at most this many pixels (`STICKER_MAX_PX`). */
export const STICKER_MAX_PX = 256;
/** Largest PNG the core accepts (`MAX_STICKER_BYTES`). */
export const MAX_STICKER_BYTES = 512 * 1024;
export const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
/** Image types a sticker can be made from. */
export const STICKER_SOURCE_TYPES = ["image/png", "image/jpeg"] as const;
/** How far the crop can zoom in: the square shrinks to 1/MAX_ZOOM of the image's short side. */
export const MAX_ZOOM = 8;

export function isStickerPreset(id: string): id is StickerPreset {
  return (STICKER_PRESETS as readonly string[]).includes(id);
}

/** Each day's stickers, in the order the backend gave them (the order they were added). */
export function stickersByDate(list: readonly DaySticker[]): Map<string, DaySticker[]> {
  const byDate = new Map<string, DaySticker[]>();
  for (const placed of list) {
    const day = byDate.get(placed.date);
    if (day) day.push(placed);
    else byDate.set(placed.date, [placed]);
  }
  return byDate;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from a PNG's header (the IHDR chunk), or `null` when it is not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** The core's image rule: a square PNG, 1 to `STICKER_MAX_PX` wide, at most `MAX_STICKER_BYTES`. */
export function isValidStickerPng(bytes: Uint8Array): boolean {
  const size = pngSize(bytes);
  return (
    bytes.length <= MAX_STICKER_BYTES &&
    size !== null &&
    size.width === size.height &&
    size.width >= 1 &&
    size.width <= STICKER_MAX_PX
  );
}

/** A name to start from: the file's name without its extension, cut to fit. */
export function nameFromFile(fileName: string, maxLength = 60): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return [...base].slice(0, maxLength).join("");
}

// ---------- The square crop ----------

export interface Size {
  width: number;
  height: number;
}

/**
 * Where the crop square is. `zoom` 1 is the largest square that fits (the image's short side);
 * `x`, `y` are the square's center in image pixels.
 */
export interface CropView {
  zoom: number;
  x: number;
  y: number;
}

/** The square the image is cut to, in image pixels. */
export interface CropSquare {
  sx: number;
  sy: number;
  side: number;
}

/** The starting view: the largest square, in the middle. */
export function centeredView(image: Size): CropView {
  return { zoom: 1, x: image.width / 2, y: image.height / 2 };
}

/** Zoom kept between 1 and `MAX_ZOOM`, and the square kept inside the image. */
export function clampView(image: Size, view: CropView): CropView {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const half = Math.min(image.width, image.height) / zoom / 2;
  const within = (value: number, length: number) => Math.min(length - half, Math.max(half, value));
  return { zoom, x: within(view.x, image.width), y: within(view.y, image.height) };
}

export function cropSquare(image: Size, view: CropView): CropSquare {
  const { zoom, x, y } = clampView(image, view);
  const side = Math.min(image.width, image.height) / zoom;
  return { sx: x - side / 2, sy: y - side / 2, side };
}

/**
 * Drag the picture by `dx`, `dy` screen pixels inside a frame `frame` pixels wide: the picture
 * follows the pointer, so the square moves the other way.
 */
export function panView(image: Size, view: CropView, dx: number, dy: number, frame: number): CropView {
  const { side } = cropSquare(image, view);
  const scale = side / frame;
  return clampView(image, { ...view, x: view.x - dx * scale, y: view.y - dy * scale });
}

/** The sticker's size in pixels: the crop's own size, but never more than `STICKER_MAX_PX`. */
export function outputSide(square: CropSquare): number {
  return Math.max(1, Math.min(STICKER_MAX_PX, Math.round(square.side)));
}
