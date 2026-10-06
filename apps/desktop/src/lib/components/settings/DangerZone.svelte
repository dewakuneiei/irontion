<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { slide } from "svelte/transition";
  import Button from "$lib/components/Button.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import DeleteDataModal from "./DeleteDataModal.svelte";

  /**
   * Destructive options stay folded away behind "Advanced", so nothing here is one
   * click from a mistake. Future danger options go inside the same fold-out.
   */
  let expanded = $state(false);
  let deleting = $state(false);
</script>

<div class="flex items-start justify-between gap-4">
  <div class="flex items-start gap-3">
    <span class="grid size-9 place-items-center rounded-xl bg-danger/10 text-danger"><TriangleAlert size={18} /></span>
    <div>
      <h2 class="font-semibold">{t("settings.danger.title")}</h2>
      <p class="text-sm text-muted">{t("settings.danger.description")}</p>
    </div>
  </div>
  <Button aria-expanded={expanded} aria-controls="danger-advanced" onclick={() => (expanded = !expanded)}>
    {t("settings.danger.advanced")}
    <ChevronDown size={15} class="transition-transform duration-200 {expanded ? 'rotate-180' : ''}" />
  </Button>
</div>

{#if expanded}
  <div id="danger-advanced" transition:slide={{ duration: 220 }}>
    <div class="mt-5 flex flex-col gap-3 rounded-xl border border-danger/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-medium">{t("settings.danger.deleteData.title")}</p>
        <p class="text-[13px] text-muted">{t("settings.danger.deleteData.description")}</p>
      </div>
      <Button variant="danger" onclick={() => (deleting = true)}>
        <Trash2 size={15} />
        {t("settings.danger.deleteData.button")}
      </Button>
    </div>
  </div>
{/if}

{#if deleting}
  <DeleteDataModal onclose={() => (deleting = false)} />
{/if}
