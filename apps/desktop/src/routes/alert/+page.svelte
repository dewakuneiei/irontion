<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { getBackend } from "$lib/api/backend";
  import type { Note } from "$lib/api/types";
  import { t } from "$lib/i18n/index.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  /**
   * The reminder popup (F008): a small window of its own, opened by Rust when a reminder is due
   * (`?note=<id>&missed=1`), or by Settings to preview it (`?sample=1`). It shares the app's theme,
   * accent and language, and holds no app logic: OK closes it, Open note brings the main window forward.
   */
  const sample = $derived(page.url.searchParams.get("sample") === "1");
  const missed = $derived(page.url.searchParams.get("missed") === "1");
  const noteId = $derived(Number(page.url.searchParams.get("note")) || null);

  let note = $state<Note | null>(null);

  const title = $derived(missed ? t("reminders.missedTitle") : t("reminders.alert.title"));
  const message = $derived(sample ? t("reminders.alert.sample") : (note?.text ?? ""));

  async function run(action: (backend: Awaited<ReturnType<typeof getBackend>>) => Promise<void>) {
    try {
      await action(await getBackend());
    } catch (err) {
      notices.error(err);
    }
  }

  const dismiss = () => run((backend) => backend.dismissAlert());
  const openNote = () => noteId !== null && run((backend) => backend.openNoteFromAlert(noteId));

  onMount(() => {
    if (sample || noteId === null) return;
    // The note may have been deleted since the reminder came due: then there is nothing to announce.
    notes
      .ensureLoaded()
      .then(() => {
        note = notes.byId(noteId) ?? null;
        if (note === null) void dismiss();
      })
      .catch((err) => notices.error(err));
  });

  function onWindowKey(event: KeyboardEvent) {
    if (event.key === "Escape") void dismiss();
  }
</script>

<svelte:head><title>{title}</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

<div class="flex h-dvh flex-col border-2 border-ink bg-surface text-ink" data-reminder-alert>
  <header data-tauri-drag-region class="flex h-11 shrink-0 cursor-default items-center justify-between gap-3 border-b-2 border-ink bg-accent pr-3 pl-4 text-accent-ink select-none">
    <h1 data-tauri-drag-region class="min-w-0 truncate text-[15px] font-semibold">{title}</h1>
    <button
      type="button"
      class="size-6 shrink-0 rounded-full border-2 border-ink bg-danger transition-transform hover:scale-110"
      aria-label={t("common.close")}
      title={t("common.close")}
      onclick={dismiss}
    ></button>
  </header>

  <div class="flex min-h-0 flex-1 items-center gap-5 bg-accent-soft px-6 py-4">
    <TriangleAlert size={52} strokeWidth={2.2} class="shrink-0 text-accent" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="text-xl font-bold">{t("reminders.alert.lead")}</p>
      <p class="mt-1 max-h-28 overflow-y-auto text-base leading-snug break-words whitespace-pre-line" data-reminder-alert-text>{message}</p>
    </div>
  </div>

  <footer class="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t-2 border-ink px-4 py-3">
    <!-- Enter dismisses. SvelteKit moves focus to the page after loading unless something asks for it. -->
    <!-- svelte-ignore a11y_autofocus -->
    <button
      autofocus
      type="button"
      class="h-10 min-w-24 rounded-md border-2 border-ink bg-accent px-5 text-sm font-bold text-accent-ink transition-[filter] hover:brightness-110"
      onclick={dismiss}
      data-reminder-alert-ok
    >
      {t("common.ok")}
    </button>
    {#if noteId !== null && note !== null}
      <button
        type="button"
        class="h-10 rounded-md border-2 border-ink bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-hover"
        onclick={openNote}
        data-reminder-alert-open
      >
        {t("reminders.open")}
      </button>
    {/if}
  </footer>
</div>
