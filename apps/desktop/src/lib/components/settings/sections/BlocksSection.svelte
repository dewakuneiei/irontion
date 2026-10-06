<script lang="ts">
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import Timer from "@lucide/svelte/icons/timer";
  import CellShapePicker from "$lib/components/settings/CellShapePicker.svelte";
  import FillDirectionPicker from "$lib/components/settings/FillDirectionPicker.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { t } from "$lib/i18n/index.svelte";
</script>

<div class="flex flex-col gap-6">
  <SettingsCard icon={LayoutGrid} title={t("settings.shape.title")} description={t("settings.shape.description")}>
    <CellShapePicker />
  </SettingsCard>

  <SettingsCard icon={Timer} index={1} title={t("settings.fill.title")} description={t("settings.fill.description")}>
    <FillDirectionPicker />
  </SettingsCard>
</div>
