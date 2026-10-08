<script lang="ts">
  import ZoomIn from "@lucide/svelte/icons/zoom-in";
  import ZoomOut from "@lucide/svelte/icons/zoom-out";
  import { onMount } from "svelte";
  import type { NewSticker } from "$lib/api/types";
  import {
    MAX_ZOOM,
    centeredView,
    clampView,
    cropSquare,
    outputSide,
    panView,
    type CropView,
    type Size,
  } from "$lib/domain/stickers";
  import { t } from "$lib/i18n/index.svelte";

  /**
   * Cut an image to a square sticker (F007): drag to move, zoom to cut closer. What the frame shows
   * is what the sticker will be, at most 256 px. `ready` turns true once the image is open; then
   * `makeSticker()` gives the name and the PNG.
   */
  let {
    file,
    name = $bindable(),
    ready = $bindable(false),
    onerror,
  }: { file: File; name: string; ready?: boolean; onerror: (message: string) => void } = $props();

  /** The frame's size on screen, in CSS pixels. */
  const FRAME = 240;
  /** Screen pixels an arrow key moves the picture. */
  const KEY_STEP = 12;

  let canvas = $state<HTMLCanvasElement>();
  let image = $state<HTMLImageElement | null>(null);
  let size = $state<Size>({ width: 1, height: 1 });
  let view = $state<CropView>({ zoom: 1, x: 0, y: 0 });
  let dragFrom: { x: number; y: number } | null = null;

  onMount(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      size = { width: img.naturalWidth, height: img.naturalHeight };
      view = centeredView(size);
      image = img;
      ready = true;
    };
    img.onerror = () => onerror(t("stickers.upload.unreadable"));
    img.src = url;
    return () => URL.revokeObjectURL(url);
  });

  // Draw what the sticker will be, sharp on high-density screens.
  $effect(() => {
    if (!canvas || !image) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(FRAME * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { sx, sy, side } = cropSquare(size, view);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  });

  export function makeSticker(): NewSticker {
    const square = cropSquare(size, view);
    const side = outputSide(square);
    const out = document.createElement("canvas");
    out.width = out.height = side;
    const ctx = out.getContext("2d");
    if (ctx && image) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, square.sx, square.sy, square.side, square.side, 0, 0, side, side);
    }
    return { name, image: out.toDataURL("image/png") };
  }

  const pan = (dx: number, dy: number) => (view = panView(size, view, dx, dy, FRAME));
  const zoomTo = (zoom: number) => (view = clampView(size, { ...view, zoom }));

  function onpointerdown(event: PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragFrom = { x: event.clientX, y: event.clientY };
  }

  function onpointermove(event: PointerEvent) {
    if (!dragFrom) return;
    pan(event.clientX - dragFrom.x, event.clientY - dragFrom.y);
    dragFrom = { x: event.clientX, y: event.clientY };
  }

  function onwheel(event: WheelEvent) {
    event.preventDefault();
    zoomTo(view.zoom * Math.exp(-event.deltaY * 0.002));
  }

  function onkeydown(event: KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const move = moves[event.key];
    if (move) pan(...move);
    else if (event.key === "+" || event.key === "=") zoomTo(view.zoom * 1.15);
    else if (event.key === "-") zoomTo(view.zoom / 1.15);
    else return;
    event.preventDefault();
  }
</script>

<div class="flex flex-col items-center gap-4" data-sticker-cropper>
  <!-- A custom widget (role "application", which Svelte counts as non-interactive): the picture
       moves with the pointer or the arrow keys, + and - zoom. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="relative touch-none overflow-hidden rounded-2xl border border-line bg-surface-2 {image ? 'cursor-grab active:cursor-grabbing' : ''}"
    style:width="{FRAME}px"
    style:height="{FRAME}px"
    tabindex="0"
    role="application"
    aria-label={t("stickers.crop.frame")}
    {onpointerdown}
    {onpointermove}
    onpointerup={() => (dragFrom = null)}
    onpointercancel={() => (dragFrom = null)}
    {onwheel}
    {onkeydown}
  >
    <canvas bind:this={canvas} class="block size-full" aria-hidden="true"></canvas>
  </div>

  <div class="flex w-full max-w-[240px] items-center gap-2 text-muted">
    <ZoomOut size={16} aria-hidden="true" />
    <input
      type="range"
      min="1"
      max={MAX_ZOOM}
      step="0.01"
      value={view.zoom}
      oninput={(event) => zoomTo(Number(event.currentTarget.value))}
      aria-label={t("stickers.crop.zoom")}
      class="min-w-0 flex-1 accent-accent"
      disabled={!image}
    />
    <ZoomIn size={16} aria-hidden="true" />
  </div>

  <label class="flex w-full flex-col gap-1.5 text-sm">
    <span class="font-medium">{t("stickers.name")}</span>
    <input
      bind:value={name}
      maxlength="60"
      required
      data-sticker-name
      class="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
    />
  </label>
</div>
