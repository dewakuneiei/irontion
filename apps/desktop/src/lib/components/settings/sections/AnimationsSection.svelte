<script lang="ts">
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { getBackend } from "$lib/api/backend";
  import Button from "$lib/components/Button.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import Toggle from "$lib/components/Toggle.svelte";
  import { ALERT_ANIMATIONS } from "$lib/domain/alertAnimation";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { preferences } from "$lib/preferences.svelte";

  async function preview() {
    try {
      await (await getBackend()).previewReminderAlert();
    } catch (err) {
      notices.error(err);
    }
  }
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
      <div class="flex flex-col gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <div class="flex items-center justify-between gap-4">
          <p class="min-w-0 text-sm font-medium">{t("settings.animations.alertTitle")}</p>
          <div class="flex shrink-0 items-center gap-3">
            <Button size="sm" onclick={preview} data-preview-alert-animation>{t("settings.animations.previewAlert")}</Button>
            <Toggle
              checked={preferences.alertAnimation}
              label={t("settings.animations.alertTitle")}
              onchange={(on) => preferences.setAlertAnimation(on)}
            />
          </div>
        </div>
        {#if preferences.alertAnimation}
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[13px] text-muted">{t("settings.animations.alertStyle")}</span>
            <div class="flex flex-wrap rounded-lg bg-surface p-0.5" role="radiogroup" aria-label={t("settings.animations.alertStyle")}>
              {#each ALERT_ANIMATIONS as style (style)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={preferences.alertAnimationStyle === style}
                  data-alert-style={style}
                  onclick={() => preferences.setAlertAnimationStyle(style)}
                  class="h-7 rounded-md px-3 text-[13px] font-medium whitespace-nowrap {preferences.alertAnimationStyle === style
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink-2'}"
                >
                  {t(`settings.animations.alertStyles.${style}`)}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
</SettingsCard>
