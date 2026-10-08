<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";
  import StickyNote from "@lucide/svelte/icons/sticky-note";
  import NotePaperPicker from "$lib/components/settings/NotePaperPicker.svelte";
  import NotificationsPanel from "$lib/components/settings/NotificationsPanel.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { t } from "$lib/i18n/index.svelte";
</script>

<div class="flex flex-col gap-6">
  <SettingsCard icon={StickyNote} title={t("settings.paper.title")} description={t("settings.paper.description")}>
    <NotePaperPicker />
  </SettingsCard>
  <SettingsCard index={1} icon={Bell} title={t("settings.notifications.title")} description={t("settings.notifications.description")}>
    <NotificationsPanel />
  </SettingsCard>
</div>
