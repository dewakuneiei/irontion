<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";
  import Pin from "@lucide/svelte/icons/pin";
  import type { Note } from "$lib/api/types";
  import TagChip from "$lib/components/TagChip.svelte";
  import { noteColorCss } from "$lib/domain/notes";
  import { reminderState } from "$lib/domain/reminders";
  import { formatDayHeading, formatTimestamp } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  /**
   * One note on paper, as tall as its text needs. The body opens the note: a link on the Notes
   * page (`href`), a button in the Calendar's day panel (`onopen`). The grip (to drag the note
   * to another place on the board) and the pin sit on the paper's top edge.
   */
  let {
    note,
    href,
    onopen,
    onpin,
    onhandle,
    onhandlekey,
    dragging = false,
    target = false,
  }: {
    note: Note;
    href?: string;
    onopen?: () => void;
    /** Shows the pin button. */
    onpin?: () => void;
    /** Shows the grip. Called when a drag starts from it. */
    onhandle?: (event: PointerEvent) => void;
    onhandlekey?: (event: KeyboardEvent) => void;
    /** This card is being dragged. */
    dragging?: boolean;
    /** A dragged card would land here. */
    target?: boolean;
  } = $props();

  const tags = $derived(note.tagIds.map((id) => catalog.tagById.get(id)).filter((tag) => tag !== undefined));
  const label = $derived(t("notes.card.open", { text: note.text }));
  const reminder = $derived(reminderState(note, new Date()));
  const bodyClass = "flex min-w-0 flex-1 flex-col gap-3 text-left outline-offset-4";
</script>

<article
  class="group paper paper-sheet paper-ruled paper-tape relative flex flex-col transition-shadow {dragging
    ? 'opacity-90 shadow-2xl'
    : ''} {target ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}"
  style:--note={noteColorCss(note.color)}
  data-note={note.id}
  data-pinned={note.pinned || undefined}
>
  <!-- On the top edge, between the two pieces of tape. Always there on touch, else on hover or focus. -->
  <div class="pointer-events-none absolute inset-x-12 top-[0.45rem] z-10 flex items-center justify-between">
    <div class="pointer-events-auto">
      {#if onhandle}
        <button
          type="button"
          class="grid h-6 w-8 touch-none place-items-center rounded-md text-ink-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface/70 [@media(hover:none)]:opacity-100 {dragging ? 'cursor-grabbing opacity-100' : 'cursor-grab'}"
          aria-label={t("notes.board.handle", { text: note.text })}
          title={t("notes.board.handleHint")}
          data-handle={note.id}
          onpointerdown={onhandle}
          onkeydown={onhandlekey}
        >
          <GripVertical size={15} class="rotate-90" aria-hidden="true" />
        </button>
      {/if}
    </div>
    <div class="pointer-events-auto">
      {#if onpin}
        <button
          type="button"
          class="grid size-6 place-items-center rounded-md hover:bg-surface/70 {note.pinned
            ? 'text-ink opacity-100'
            : 'text-ink-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'}"
          aria-label={note.pinned ? t("notes.card.unpin") : t("notes.card.pin")}
          aria-pressed={note.pinned}
          title={note.pinned ? t("notes.card.unpin") : t("notes.card.pin")}
          data-pin={note.id}
          onclick={onpin}
        >
          <Pin size={14} fill={note.pinned ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      {:else if note.pinned}
        <Pin size={14} fill="currentColor" class="mr-1 text-ink-2" aria-label={t("notes.board.pinned")} />
      {/if}
    </div>
  </div>

  {#snippet body()}
    <span class="block min-w-0 text-[15px] leading-[var(--paper-line)] break-words whitespace-pre-wrap text-ink">{note.text}</span>
    {#if tags.length > 0}
      <span class="flex flex-wrap gap-1.5">
        {#each tags as tag (tag.id)}
          <TagChip {tag} />
        {/each}
      </span>
    {/if}
    <span class="flex flex-wrap items-center gap-1.5">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-2.5 py-1 text-xs font-medium text-ink-2 tabular-nums">
        <CalendarDays size={13} aria-hidden="true" />
        {formatDayHeading(note.date)}
      </span>
      {#if note.remindAt}
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums {reminder === 'past'
            ? 'bg-surface/70 text-muted'
            : 'bg-accent-soft text-ink'}"
          data-reminder={reminder}
        >
          <Bell size={13} aria-hidden="true" />
          {formatTimestamp(note.remindAt)}
        </span>
      {/if}
    </span>
  {/snippet}

  {#if href}
    <a {href} class={bodyClass} aria-label={label}>{@render body()}</a>
  {:else}
    <button type="button" class={bodyClass} aria-label={label} onclick={onopen}>{@render body()}</button>
  {/if}
</article>
