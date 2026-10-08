<script lang="ts">
  import BellRing from "@lucide/svelte/icons/bell-ring";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { reminders } from "$lib/stores/reminders.svelte";

  /** Asked once, the first time a reminder is set (F008). Closing it without an answer asks again later. */
  let open = $state(true);

  function answer(allow: boolean) {
    open = false;
    reminders.answer(allow).catch((err) => notices.error(err));
  }
</script>

<Modal bind:open title={t("reminders.ask.title")} width="sm" onclose={() => (reminders.asking = false)}>
  <div class="flex gap-3">
    <BellRing size={20} class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
    <p class="text-sm leading-relaxed text-ink-2">{t("reminders.ask.body")}</p>
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => answer(false)} data-notifications-deny>{t("reminders.ask.deny")}</Button>
    <Button variant="primary" onclick={() => answer(true)} data-notifications-allow>{t("reminders.ask.allow")}</Button>
  {/snippet}
</Modal>
