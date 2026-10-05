<script lang="ts">
  import { errorKind } from "$lib/api/backend";
  import { t } from "$lib/i18n/index.svelte";
  import Button from "./Button.svelte";
  import Modal from "./Modal.svelte";

  let {
    title,
    body,
    confirmLabel,
    danger = false,
    onconfirm,
    onclose,
  }: {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onconfirm: () => Promise<void>;
    onclose: () => void;
  } = $props();

  let open = $state(true);
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function confirm() {
    busy = true;
    error = null;
    try {
      await onconfirm();
      open = false;
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
    } finally {
      busy = false;
    }
  }
</script>

<Modal bind:open {title} width="sm" {onclose}>
  <p class="text-sm leading-relaxed text-ink-2">{body}</p>
  {#if error}<p class="mt-3 text-sm text-danger" role="alert">{error}</p>{/if}
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>{t("common.cancel")}</Button>
    <Button variant={danger ? "danger" : "primary"} disabled={busy} onclick={confirm}>{confirmLabel}</Button>
  {/snippet}
</Modal>
