<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";
  import Pin from "@lucide/svelte/icons/pin";
  import type { Note } from "$lib/api/types";
  import TagChip from "$lib/components/TagChip.svelte";
  import { noteColorCss } from "$lib/domain/notes";
  import { reminderState } from "$lib/domain/reminders";
  import { formatTimestamp } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  /**
   * One note on paper, as tall as its text needs. The body opens the note: a link on the Notes
   * page (`href`), a button in the Calendar's day panel (`onopen`). On the board the whole card
   * is the drag handle (`onpress`); the pin sits on the paper's top edge.
   */
  let {
    note,
    href,
    onopen,
    onpin,
    onpress,
    onmovekey,
    dragging = false,
    target = false,
  }: {
    note: Note;
    href?: string;
    onopen?: () => void;
    /** Shows the pin button. */
    onpin?: () => void;
    /** The card can be dragged: called when the pointer goes down on it. */
    onpress?: (event: PointerEvent) => void;
    /** The card can be moved with the keyboard: called on every key pressed in it. */
    onmovekey?: (event: KeyboardEvent) => void;
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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="group paper paper-sheet paper-ruled paper-tape relative flex flex-col transition-[box-shadow,scale] duration-200 {onpress
    ? 'select-none [-webkit-touch-callout:none]'
    : ''} {dragging ? 'scale-[1.03] cursor-grabbing shadow-2xl' : ''} {target
    ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg'
    : ''}"
  style:--note={noteColorCss(note.color)}
  data-note={note.id}
  data-pinned={note.pinned || undefined}
  aria-keyshortcuts={onmovekey ? "Alt+Shift+ArrowUp Alt+Shift+ArrowDown Alt+Shift+ArrowLeft Alt+Shift+ArrowRight" : undefined}
  onpointerdown={onpress}
  onkeydown={onmovekey}
>
  <!-- On the top edge, between the two pieces of tape. Always there on touch, else on hover or focus. -->
  <div class="pointer-events-none absolute inset-x-12 top-[0.45rem] z-10 flex items-center justify-end">
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
    {#if note.remindAt}
      <span class="flex flex-wrap items-center gap-1.5">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums {reminder === 'past'
            ? 'bg-surface/70 text-muted'
            : 'bg-accent-soft text-ink'}"
          data-reminder={reminder}
        >
          <Bell size={13} aria-hidden="true" />
          {formatTimestamp(note.remindAt)}
        </span>
      </span>
    {/if}
  {/snippet}

  {#if href}
    <a {href} class={bodyClass} aria-label={label} draggable="false">{@render body()}</a>
  {:else}
    <button type="button" class={bodyClass} aria-label={label} onclick={onopen}>{@render body()}</button>
  {/if}
</article>
