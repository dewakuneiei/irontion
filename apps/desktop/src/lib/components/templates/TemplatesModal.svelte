<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import type { ActivityTemplate } from "$lib/domain/templates";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import TemplateGallery from "./TemplateGallery.svelte";
  import TemplateReview from "./TemplateReview.svelte";

  let { onclose }: { onclose: () => void } = $props();

  let open = $state(true);
  let selected = $state<ActivityTemplate | null>(null);
</script>

<Modal bind:open title={selected ? selected.name[i18n.locale] : t("templates.title")} width="lg" {onclose}>
  {#if selected}
    <TemplateReview template={selected} onback={() => (selected = null)} ondone={() => (open = false)} />
  {:else}
    <TemplateGallery onpick={(template) => (selected = template)} />
  {/if}
</Modal>
