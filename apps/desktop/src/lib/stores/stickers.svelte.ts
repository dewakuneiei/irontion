import { getBackend } from "$lib/api/backend";
import type { DaySticker, NewSticker, Sticker, StickerRef } from "$lib/api/types";
import { isStickerPreset } from "$lib/domain/stickers";
import { t } from "$lib/i18n/index.svelte";
import { presetImage } from "$lib/stickers/art";

/** What a sticker looks like and is called, ready to draw. */
export interface StickerFace {
  image: string;
  name: string;
}

/**
 * Stickers on calendar days (F007): the user's own library, and the stickers on days. Actions write
 * through the backend and then reload, so the UI shows what was saved. Errors propagate to the caller.
 */
class StickerStore {
  /** The user's own stickers, oldest first. The presets are system data (`STICKER_PRESETS`). */
  library = $state<Sticker[]>([]);
  /** Bumped after every change to what is on a day, so the Calendar knows to refetch. */
  version = $state(0);

  private loading: Promise<void> | undefined;
  private byId = $derived(new Map(this.library.map((s) => [s.id, s])));

  ensureLoaded(): Promise<void> {
    this.loading ??= this.reload();
    return this.loading;
  }

  /** Name and image of a sticker; `undefined` for one this version does not know, or not loaded yet. */
  face(sticker: StickerRef): StickerFace | undefined {
    if (sticker.kind === "preset") {
      const id = sticker.preset;
      return isStickerPreset(id) ? { image: presetImage(id), name: t(`stickers.preset.${id}`) } : undefined;
    }
    const own = this.byId.get(sticker.stickerId);
    return own && { image: own.image, name: own.name };
  }

  /** Stickers on the days from `from` to `to`, both included. */
  async onDays(from: string, to: string): Promise<DaySticker[]> {
    return (await getBackend()).dayStickers(from, to);
  }

  async create(input: NewSticker): Promise<Sticker> {
    const sticker = await (await getBackend()).createSticker(input);
    await this.reload();
    return sticker;
  }

  /** Delete one of the user's stickers for good; it comes off every day. */
  async remove(id: number): Promise<void> {
    await (await getBackend()).deleteSticker(id);
    await this.reload();
    this.version++;
  }

  async addToDay(date: string, sticker: StickerRef): Promise<DaySticker> {
    const placed = await (await getBackend()).addDaySticker(date, sticker);
    await this.reload(); // the day counts of the user's stickers changed
    this.version++;
    return placed;
  }

  async takeOff(id: number): Promise<void> {
    await (await getBackend()).removeDaySticker(id);
    await this.reload();
    this.version++;
  }

  async reload() {
    this.library = await (await getBackend()).listStickers();
  }
}

export const stickers = new StickerStore();
