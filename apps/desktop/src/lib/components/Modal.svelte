<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import type { Snippet } from "svelte";
  import { t } from "$lib/i18n/index.svelte";

  let {
    open = $bindable(true),
    title,
    width = "md",
    children,
    footer,
    actions,
    onclose,
  }: {
    /** Defaults to open, so a parent can simply mount the modal with `{#if}`. */
    open?: boolean;
    title: string;
    width?: "sm" | "md" | "lg";
    children: Snippet;
    footer?: Snippet;
    /** Shown to the right of the title. */
    actions?: Snippet;
    onclose?: () => void;
  } = $props();

  /** Never wider than the window, however wide the dialog wants to be. */
  const WIDTHS = {
    sm: "max-w-[min(28rem,calc(100vw-1.5rem))]",
    md: "max-w-[min(32rem,calc(100vw-1.5rem))]",
    lg: "max-w-[min(46rem,calc(100vw-1.5rem))]",
  };

  /** Dialogs can nest (a date picker inside the note editor), so each needs its own title id. */
  const uid = $props.id();
  const titleId = `modal-title-${uid}`;

  let dialog: HTMLDialogElement;

  // The native <dialog> gives focus trapping, Escape to close, and focus return.
  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === dialog) open = false;
  }
</script>

<dialog
  bind:this={dialog}
  onclose={() => {
    open = false;
    onclose?.();
  }}
  onclick={closeOnBackdrop}
  class="modal m-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl {WIDTHS[
    width
  ]}"
  aria-labelledby={titleId}
>
  {#if open}
    <div class="px-6 pt-5 pb-5">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} class="text-lg font-semibold tracking-tight">{title}</h2>
        <div class="flex items-center gap-2">
          {#if actions}{@render actions()}{/if}
          <button
            type="button"
            class="-mr-2 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-ink"
            aria-label={t("common.close")}
            title={t("common.close")}
            onclick={() => (open = false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {@render children()}
    </div>
    {#if footer}
      <div class="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-surface-2/50 px-6 py-3.5">
        {@render footer()}
      </div>
    {/if}
  {/if}
</dialog>
