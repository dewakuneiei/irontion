<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { getBackend } from "$lib/api/backend";
  import type { Note } from "$lib/api/types";
  import { ALERT_EXIT_MS } from "$lib/domain/alertAnimation";
  import { t } from "$lib/i18n/index.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";
  import { preferences } from "$lib/preferences.svelte";

  /**
   * The reminder popup (F008): a small window of its own, opened by Rust when a reminder is due
   * (`?note=<id>&missed=1`), or by Settings to preview it (`?sample=1`). It shares the app's theme,
   * accent and language, and holds no app logic: OK closes it, Open note brings the main window forward.
   * The window is transparent: the card inside it moves (Settings → Animations) when it opens and closes.
   */
  const sample = $derived(page.url.searchParams.get("sample") === "1");
  const missed = $derived(page.url.searchParams.get("missed") === "1");
  const noteId = $derived(Number(page.url.searchParams.get("note")) || null);

  let note = $state<Note | null>(null);
  /** The card is arriving, or (after OK, Esc or the close dot) leaving. */
  let phase = $state<"in" | "out">("in");

  const title = $derived(missed ? t("reminders.missedTitle") : t("reminders.alert.title"));
  const message = $derived(sample ? t("reminders.alert.sample") : (note?.text ?? ""));
  /** Motion is on in Settings → Animations (both the app's and this popup's), and the system allows it. */
  const animated = $derived(preferences.motion && preferences.alertAnimation);

  async function run(action: (backend: Awaited<ReturnType<typeof getBackend>>) => Promise<void>) {
    try {
      await action(await getBackend());
    } catch (err) {
      notices.error(err);
    }
  }

  /** Play the exit animation (if on), then do what closes the window. Once only. */
  async function leave(then: () => Promise<void>) {
    if (phase === "out") return;
    phase = "out";
    if (animated) await new Promise((done) => setTimeout(done, ALERT_EXIT_MS));
    await then();
  }

  const dismiss = () => leave(() => run((backend) => backend.dismissAlert()));
  const openNote = () => noteId !== null && leave(() => run((backend) => backend.openNoteFromAlert(noteId)));

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

<!-- A margin of transparent window around the card leaves room for its shadow and for a bounce. -->
<div class="h-dvh p-7">
<div
  class="card flex h-full flex-col overflow-hidden rounded-md border-2 border-ink bg-surface text-ink shadow-[5px_5px_0_var(--accent)]"
  data-style={animated ? preferences.alertAnimationStyle : "none"}
  data-phase={phase}
  data-reminder-alert
>
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
</div>

<style>
  /* The window and the page are transparent, so only the card shows. */
  :global(html),
  :global(body) {
    background: transparent !important;
    overflow: hidden;
  }

  .card {
    transform-origin: center;
  }
  .card[data-phase="out"] {
    pointer-events: none;
  }

  /* Opening. Each style ends at rest (scale 1, no offset), so "none" needs no rule. */
  .card[data-style="bounce"][data-phase="in"] {
    animation: bounce-in 560ms both;
  }
  .card[data-style="drop"][data-phase="in"] {
    animation: drop-in 560ms both;
  }
  .card[data-style="slide"][data-phase="in"] {
    animation: slide-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .card[data-style="pop"][data-phase="in"] {
    animation: pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .card[data-style="fade"][data-phase="in"] {
    animation: fade-in 260ms ease-out both;
  }

  /* Closing. They stay at their last frame (invisible) until the window closes. */
  .card[data-style="bounce"][data-phase="out"] {
    animation: bounce-out 260ms ease-in forwards;
  }
  .card[data-style="drop"][data-phase="out"] {
    animation: drop-out 260ms ease-in forwards;
  }
  .card[data-style="slide"][data-phase="out"] {
    animation: slide-out 240ms ease-in forwards;
  }
  .card[data-style="pop"][data-phase="out"] {
    animation: pop-out 220ms ease-in forwards;
  }
  .card[data-style="fade"][data-phase="out"] {
    animation: fade-out 200ms ease-in forwards;
  }

  @keyframes bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    45% { transform: scale(1.08); opacity: 1; }
    65% { transform: scale(0.95); }
    82% { transform: scale(1.025); }
    100% { transform: scale(1); }
  }
  @keyframes bounce-out {
    0% { transform: scale(1); opacity: 1; }
    30% { transform: scale(1.06); }
    100% { transform: scale(0.25); opacity: 0; }
  }
  @keyframes drop-in {
    0% { transform: translateY(-130%); opacity: 0; }
    45% { transform: translateY(0); opacity: 1; animation-timing-function: ease-out; }
    62% { transform: translateY(-7%); }
    78% { transform: translateY(0); }
    88% { transform: translateY(-2%); }
    100% { transform: translateY(0); }
  }
  @keyframes drop-out {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(130%); opacity: 0; }
  }
  @keyframes slide-in {
    from { transform: translateY(60px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slide-out {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(40px); opacity: 0; }
  }
  @keyframes pop-in {
    from { transform: scale(0.82); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes pop-out {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(0.9); opacity: 0; }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
</style>
