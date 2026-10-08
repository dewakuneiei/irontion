<script lang="ts">
  import type { StickerRef } from "$lib/api/types";
  import { stickers } from "$lib/stores/stickers.svelte";

  /** One sticker, drawn at the size the caller gives (`class`). Named for screen readers and on hover. */
  let { sticker, class: className = "size-10", decorative = false }: { sticker: StickerRef; class?: string; decorative?: boolean } =
    $props();

  const face = $derived(stickers.face(sticker));
</script>

{#if face}
  <img
    src={face.image}
    alt={decorative ? "" : face.name}
    title={decorative ? undefined : face.name}
    draggable="false"
    class="shrink-0 object-contain select-none {className}"
  />
{/if}
