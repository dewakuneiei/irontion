<script lang="ts">
  import { onMount } from "svelte";
  import { getBackend } from "$lib/api/backend";
  import type { NotificationStatus } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import Toggle from "$lib/components/Toggle.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { reminders } from "$lib/stores/reminders.svelte";

  let status = $state<NotificationStatus | null>(null);
  let sending = $state(false);
  /** Checking that the system really shows a notification: the switch shows on, and waits. */
  let turningOn = $state(false);

  const allowed = $derived(reminders.permission === "allowed" || turningOn);
  const refresh = async () => (status = await (await getBackend()).notificationStatus());

  onMount(() => {
    void refresh().catch((err) => notices.error(err));
    reminders.loadPermission().catch((err) => notices.error(err));
    reminders.loadPopup().catch((err) => notices.error(err));
  });

  function setPopup(enabled: boolean) {
    reminders.setPopup(enabled).catch((err) => notices.error(err));
  }

  async function previewPopup() {
    try {
      await (await getBackend()).previewReminderAlert();
    } catch (err) {
      notices.error(err);
    }
  }

  async function setAllowed(allow: boolean) {
    if (!allow) {
      reminders.setPermission("denied").catch((err) => notices.error(err));
      return;
    }
    turningOn = true;
    try {
      await reminders.turnOn();
    } catch (err) {
      notices.error(err);
    } finally {
      turningOn = false;
      void refresh().catch((err) => notices.error(err));
    }
  }

  async function sendTest() {
    sending = true;
    try {
      await (await getBackend()).sendTestNotification(t("reminders.title"), t("settings.notifications.testBody"));
      notices.info(t("settings.notifications.sent"));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      notices.failure(t("settings.notifications.failed", { reason }), { sticky: true });
    } finally {
      sending = false;
      void refresh().catch((err) => notices.error(err));
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4">
    <p class="min-w-0 text-sm font-medium">{t("settings.notifications.allow")}</p>
    <Toggle checked={allowed} disabled={turningOn} label={t("settings.notifications.allow")} onchange={setAllowed} />
  </div>
  <div class="flex items-center justify-between gap-4 border-t border-line pt-4">
    <p class="min-w-0 text-sm font-medium">{t("settings.notifications.window")}</p>
    <div class="flex shrink-0 items-center gap-3">
      <Button size="sm" onclick={previewPopup} data-preview-popup>{t("settings.notifications.previewWindow")}</Button>
      <Toggle checked={reminders.popup} label={t("settings.notifications.window")} onchange={setPopup} />
    </div>
  </div>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
    <p class="min-w-0 flex-1 text-sm {status?.state === 'unavailable' ? 'text-danger' : 'text-ink-2'}" role="status">
      {#if status === null}
        {t("settings.notifications.checking")}
      {:else if status.state === "granted"}
        {t("settings.notifications.granted")}
      {:else}
        {t("settings.notifications.unavailable", { reason: status.reason ?? "" })}
      {/if}
    </p>
    <Button onclick={sendTest} disabled={sending}>{t("settings.notifications.test")}</Button>
  </div>
</div>
