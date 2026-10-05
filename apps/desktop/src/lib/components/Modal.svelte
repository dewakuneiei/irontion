<script lang="ts">
  import type { Snippet } from "svelte";

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
    width?: "sm" | "md";
    children: Snippet;
    footer?: Snippet;
    /** Shown to the right of the title. */
    actions?: Snippet;
    onclose?: () => void;
  } = $props();

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
  class="modal m-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl {width ===
  'sm'
    ? 'max-w-[min(28rem,calc(100vw-1.5rem))]'
    : 'max-w-[min(32rem,calc(100vw-1.5rem))]'}"
  aria-labelledby="modal-title"
>
  {#if open}
    <div class="px-6 pt-5 pb-5">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 id="modal-title" class="text-lg font-semibold tracking-tight">{title}</h2>
        {#if actions}{@render actions()}{/if}
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
