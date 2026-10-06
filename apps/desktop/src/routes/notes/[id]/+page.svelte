<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import NotePaper from "$lib/components/notes/NotePaper.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  const id = $derived(Number(page.params.id));
  const note = $derived(notes.byId(id));

  onMount(() => {
    notes.ensureLoaded().catch((err) => notices.error(err));
  });
</script>

<div class="mx-auto max-w-2xl pt-2">
  {#if note}
    {#key note.id}
      <NotePaper {note} date={note.date} place="notes" onback={() => goto("/notes")} />
    {/key}
  {:else if notes.loaded}
    <p class="py-10 text-center text-sm text-ink-2">{t("notes.notFound")}</p>
    <p class="text-center"><a href="/notes" class="text-sm font-medium text-accent hover:underline">{t("notes.paper.back")}</a></p>
  {/if}
</div>
