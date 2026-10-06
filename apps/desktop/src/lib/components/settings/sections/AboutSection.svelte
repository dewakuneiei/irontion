<script lang="ts">
  import { getVersion } from "@tauri-apps/api/app";
  import { isTauri } from "@tauri-apps/api/core";
  import Info from "@lucide/svelte/icons/info";
  import { onMount } from "svelte";
  import { openExternal } from "$lib/api/opener";
  import Logo from "$lib/components/Logo.svelte";
  import SettingsCard from "$lib/components/settings/SettingsCard.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  // The license asks everyone who uses Irontion to credit these (see LICENSE).
  const AUTHOR = "dewakuneiei";
  const AUTHOR_URL = "https://github.com/dewakuneiei";
  const REPO_URL = "https://github.com/dewakuneiei/irontion";

  let version = $state("0.1.0");
  onMount(async () => {
    if (isTauri()) version = await getVersion();
  });
</script>

<SettingsCard icon={Info} title={t("settings.about.title")}>
    <div class="flex items-center gap-3">
      <Logo size={40} />
      <div>
        <p class="font-semibold">{t("app.name")}</p>
        <p class="text-sm text-muted">{t("settings.about.version", { version })}</p>
        <p class="text-sm text-muted">{t("app.tagline")}</p>
        <p class="text-sm text-muted break-words">
          {t("settings.about.createdBy")}
          {@render link(AUTHOR, AUTHOR_URL)}
        </p>
        <p class="text-sm break-all">{@render link(REPO_URL.replace("https://", ""), REPO_URL)}</p>
      </div>
    </div>
</SettingsCard>

{#snippet link(label: string, url: string)}
  <button
    type="button"
    class="cursor-pointer font-medium text-accent hover:underline"
    onclick={() => openExternal(url).catch((err) => notices.error(err))}
  >
    {label}
  </button>
{/snippet}
