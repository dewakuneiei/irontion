<script lang="ts">
  import ImageUp from "@lucide/svelte/icons/image-up";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import { errorKind } from "$lib/api/backend";
  import type { Sticker, StickerRef } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { STICKER_PRESETS, STICKER_SOURCE_TYPES, nameFromFile } from "$lib/domain/stickers";
  import { t } from "$lib/i18n/index.svelte";
  import { stickers } from "$lib/stores/stickers.svelte";
  import StickerCropper from "./StickerCropper.svelte";
  import StickerImage from "./StickerImage.svelte";

  /** Choose a sticker for a day (F007): a built-in one, one of the user's, or a new one from an image. */
  let { date, onclose }: { date: string; onclose: () => void } = $props();

  let open = $state(true);
  let busy = $state(false);
  let error = $state<string | null>(null);
  /** The image being cut into a new sticker; `null` while choosing. */
  let cropping = $state<File | null>(null);
  let cropName = $state("");
  let cropReady = $state(false);
  let cropper = $state<StickerCropper>();
  let fileInput = $state<HTMLInputElement>();
  let deleting = $state<Sticker | null>(null);

  const canSave = $derived(cropReady && !busy && cropName.trim() !== "");

  /** Run a write; on success close the dialog, on failure say why and stay. */
  async function attempt(action: () => Promise<unknown>) {
    busy = true;
    error = null;
    try {
      await action();
      open = false;
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
    } finally {
      busy = false;
    }
  }

  const pick = (sticker: StickerRef) => attempt(() => stickers.addToDay(date, sticker));

  function chooseFile(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = ""; // the same file can be chosen again
    if (!file) return;
    if (!(STICKER_SOURCE_TYPES as readonly string[]).includes(file.type)) {
      error = t("stickers.upload.wrongType");
      return;
    }
    error = null;
    cropReady = false;
    cropName = nameFromFile(file.name);
    cropping = file;
  }

  function backToChoosing() {
    cropping = null;
    error = null;
  }

  async function saveCrop() {
    if (!cropper) return;
    const input = cropper.makeSticker();
    await attempt(async () => {
      const created = await stickers.create(input);
      // Saved in the library already: if the day refuses it, choosing shows it there.
      cropping = null;
      await stickers.addToDay(date, { kind: "custom", stickerId: created.id });
    });
  }
</script>

<Modal bind:open title={cropping ? t("stickers.new") : t("stickers.picker.title")} width="md" {onclose} footer={cropping ? cropFooter : undefined}>
  {#if cropping}
    {#key cropping}
      <StickerCropper bind:this={cropper} file={cropping} bind:name={cropName} bind:ready={cropReady} onerror={(message) => (error = message)} />
    {/key}
  {:else}
    <section aria-labelledby="sticker-presets">
      <h3 id="sticker-presets" class="mb-2 text-sm font-medium text-ink-2">{t("stickers.presets")}</h3>
      <ul class="grid grid-cols-4 gap-1.5 min-[26rem]:grid-cols-6">
        {#each STICKER_PRESETS as preset (preset)}
          {@const sticker = { kind: "preset", preset } as const}
          <li>
            <button
              type="button"
              disabled={busy}
              onclick={() => pick(sticker)}
              data-sticker-preset={preset}
              class="flex w-full min-w-0 flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-surface-hover"
            >
              <StickerImage {sticker} class="size-10" decorative />
              <span class="w-full truncate text-center text-[11px] text-ink-2">{t(`stickers.preset.${preset}`)}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>

    <section class="mt-5" aria-labelledby="sticker-own">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id="sticker-own" class="text-sm font-medium text-ink-2">{t("stickers.yours")}</h3>
        <Button size="sm" disabled={busy} onclick={() => fileInput?.click()} data-sticker-upload>
          <ImageUp size={14} />
          {t("stickers.upload.button")}
        </Button>
        <input bind:this={fileInput} type="file" accept={STICKER_SOURCE_TYPES.join(",")} class="hidden" onchange={chooseFile} />
      </div>
      {#if stickers.library.length === 0}
        <p class="text-sm text-ink-2">{t("stickers.yoursEmpty")}</p>
      {:else}
        <ul class="grid grid-cols-4 gap-1.5 min-[26rem]:grid-cols-6">
          {#each stickers.library as own (own.id)}
            {@const sticker = { kind: "custom", stickerId: own.id } as const}
            <li class="group relative">
              <button
                type="button"
                disabled={busy}
                onclick={() => pick(sticker)}
                data-sticker-own={own.id}
                class="flex w-full min-w-0 flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-surface-hover"
              >
                <StickerImage {sticker} class="size-10 rounded-md" decorative />
                <span class="w-full truncate text-center text-[11px] text-ink-2">{own.name}</span>
              </button>
              <button
                type="button"
                class="absolute top-0.5 right-0.5 grid size-6 place-items-center rounded-full bg-surface text-muted opacity-0 shadow-card transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                aria-label={t("stickers.delete.button", { name: own.name })}
                title={t("stickers.delete.button", { name: own.name })}
                onclick={() => (deleting = own)}
              >
                <Trash2 size={12} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-danger" role="alert">{error}</p>
  {/if}
</Modal>

{#snippet cropFooter()}
  <Button variant="ghost" disabled={busy} onclick={backToChoosing}>{t("stickers.back")}</Button>
  <Button variant="primary" disabled={!canSave} onclick={saveCrop} data-sticker-save>{t("stickers.save")}</Button>
{/snippet}

{#if deleting}
  {@const target = deleting}
  <ConfirmModal
    title={t("stickers.delete.title")}
    body={target.days > 0 ? t("stickers.delete.bodyUsed", { name: target.name, n: target.days }) : t("stickers.delete.body", { name: target.name })}
    confirmLabel={t("stickers.delete.confirm")}
    danger
    onconfirm={() => stickers.remove(target.id)}
    onclose={() => (deleting = null)}
  />
{/if}
