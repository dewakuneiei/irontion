<script lang="ts">
  import StickyNote from "@lucide/svelte/icons/sticky-note";
  import NotePaperPicker from "$lib/components/settings/NotePaperPicker.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { t } from "$lib/i18n/index.svelte";
</script>

<SettingsCard icon={StickyNote} title={t("settings.paper.title")} description={t("settings.paper.description")}>
  <NotePaperPicker />
</SettingsCard>
