<script lang="ts">
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import Toggle from "$lib/components/Toggle.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
</script>

<SettingsCard icon={Sparkles} title={t("settings.animations.title")} description={t("settings.animations.description")}>
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
        <p class="min-w-0 text-sm font-medium">{t("settings.animations.allTitle")}</p>
        <Toggle
          checked={preferences.animations}
          label={t("settings.animations.allTitle")}
          onchange={(on) => preferences.setAnimations(on)}
        />
      </div>
      <div class="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-medium">{t("settings.animations.waveTitle")}</p>
          <p class="text-[13px] text-muted">{t("settings.animations.waveHint")}</p>
        </div>
        <Toggle
          checked={preferences.fillAnimation}
          label={t("settings.animations.waveTitle")}
          onchange={(on) => preferences.setFillAnimation(on)}
        />
      </div>
    </div>
</SettingsCard>
