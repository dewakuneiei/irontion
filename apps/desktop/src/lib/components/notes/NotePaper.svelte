<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Bell from "@lucide/svelte/icons/bell";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Palette from "@lucide/svelte/icons/palette";
  import Pin from "@lucide/svelte/icons/pin";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import X from "@lucide/svelte/icons/x";
  import { onDestroy, tick } from "svelte";
  import { errorKind } from "$lib/api/backend";
  import type { Note, NoteColor } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import {
    DEFAULT_NOTE_COLOR,
    MAX_NOTE_LEN,
    MAX_NOTE_TAGS,
    commitTags,
    isValidTagName,
    noteColorCss,
    noteLength,
    removeTypedToken,
    resolveTagName,
    savedText,
    suggestTags,
    tagTokenAt,
    withoutTokenAt,
  } from "$lib/domain/notes";
  import { createSaveQueue } from "$lib/domain/saveQueue";
  import ColorSwatches from "./ColorSwatches.svelte";
  import ReminderPicker from "./ReminderPicker.svelte";
  import { todayISO } from "$lib/domain/time";
  import { formatDay, formatDayLabel, formatTimestamp } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  /**
   * The note editor (F006): a sheet of paper, not a dialog. The same component writes and edits
   * notes on the Notes page and in the Calendar's day panel. It saves by itself about 600 ms after
   * the user stops, in order, and saves what is left when the user goes back or leaves.
   */
  let {
    note,
    date,
    place,
    onback,
    onmoved,
  }: {
    /** The note to edit, or `null` to write a new one. */
    note: Note | null;
    /** A new note's day: today on the Notes page, the chosen day on the Calendar. */
    date: string;
    /** The Calendar offers "Move to another day"; the Notes page keeps the date fixed. */
    place: "notes" | "calendar";
    /** Leave the paper. Called once the note is saved (or an empty new paper is dropped). */
    onback: () => void;
    /** The note now belongs to another day (Calendar). */
    onmoved?: (date: string) => void;
  } = $props();

  const AUTOSAVE_MS = 600;
  type Status = "new" | "saving" | "saved" | "error" | "empty" | "tooLong";

  // The paper edits its own copy of the note, starting from what was saved.
  // svelte-ignore state_referenced_locally
  const initial = note;
  let id = $state<number | null>(initial?.id ?? null);
  let text = $state(initial?.text ?? "");
  let tags = $state<string[]>(
    (initial?.tagIds ?? []).map((tagId) => catalog.tagById.get(tagId)?.name).filter((name) => name !== undefined),
  );
  // svelte-ignore state_referenced_locally
  let noteDate = $state(initial?.date ?? date);
  let color = $state<NoteColor>(initial?.color ?? DEFAULT_NOTE_COLOR);
  let pinned = $state(initial?.pinned ?? false);
  let remindAt = $state<string | null>(initial?.remindAt ?? null);
  /** Which tool's dialog is open. The paper's container holds only the paper. */
  let panel = $state<"color" | "reminder" | null>(null);
  let status = $state<Status>(initial ? "saved" : "new");
  let error = $state<string | null>(null);
  let tagMessage = $state<string | null>(null);
  let caret = $state(0);
  let focused = $state(false);
  let active = $state(0);
  /** Where the suggestions were closed with Esc, so they stay closed for that tag. */
  let dismissedAt = $state<number | null>(null);
  let textarea = $state<HTMLTextAreaElement>();

  const queue = createSaveQueue();
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The last content that reached the backend, so the same content is not saved twice. */
  // svelte-ignore state_referenced_locally
  let savedKey = initial ? contentKey(initial.text, initial.color, tags) : "";
  /** Deleted: nothing more to save. */
  let gone = false;

  const length = $derived(noteLength(savedText(text)));
  const typing = $derived(focused ? tagTokenAt(text, caret) : null);
  const suggestions = $derived(
    typing && typing.start !== dismissedAt ? suggestTags(catalog.tags, typing.name, tags).map((tag) => tag.name) : [],
  );
  /** "New tag ..." when the typed name is valid and no tag has it yet. */
  const newName = $derived(
    typing && typing.start !== dismissedAt && typing.name !== "" && isValidTagName(typing.name)
      ? catalog.tags.some((tag) => tag.name.toLowerCase() === typing.name.toLowerCase())
        ? null
        : typing.name
      : null,
  );
  const options = $derived(newName ? [...suggestions, newName] : suggestions);
  const today = $derived(todayISO());
  const statusText = $derived(
    {
      new: t("notes.paper.unsaved"),
      saving: t("notes.paper.saving"),
      saved: t("notes.paper.saved"),
      error: error ?? t("notes.paper.saveFailed"),
      empty: t("notes.paper.needsText"),
      tooLong: t("errors.noteTooLong"),
    }[status],
  );

  // Grow the text box with its text, so it never scrolls inside the paper and the rules stay put.
  $effect(() => {
    void text;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  });

  onDestroy(() => {
    // Leaving the page (a link, the sidebar): save what is left. The store outlives the paper.
    if (!gone) void flush();
  });

  function contentKey(body: string, paper: NoteColor, names: readonly string[]): string {
    return JSON.stringify([savedText(body), paper, names.map((name) => name.toLowerCase())]);
  }

  async function placeCaret(at: number) {
    caret = at;
    await tick();
    textarea?.setSelectionRange(at, at);
  }

  /** Add a tag to this note: an existing tag keeps its own spelling. False when the note is full. */
  function addTag(typed: string): boolean {
    const name = resolveTagName(catalog.tags, typed);
    if (tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) return true;
    if (tags.length >= MAX_NOTE_TAGS) {
      tagMessage = t("notes.paper.tagLimit");
      return false;
    }
    tags = [...tags, name];
    tagMessage = null;
    return true;
  }

  /** Turn the `#tag` at the caret into a chip (with `name`, when a suggestion was picked). */
  function commitTyping(name = typing?.name ?? ""): boolean {
    const token = tagTokenAt(text, caret);
    if (!token || !isValidTagName(name)) return false;
    addTag(name);
    const rest = removeTypedToken(text, token);
    text = rest.text;
    void placeCaret(rest.caret);
    active = 0;
    schedule();
    return true;
  }

  function removeTag(name: string) {
    tags = tags.filter((tag) => tag !== name);
    tagMessage = null;
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => void save(false), AUTOSAVE_MS);
  }

  /**
   * Save the paper. Finished `#tags` become chips first; a tag still being typed is left out
   * unless the user is leaving (`final`). A new note is created only once it has text.
   */
  async function save(final: boolean) {
    clearTimeout(timer);
    if (gone) return;
    const committed = commitTags(text, caret, { live: final });
    if (committed.tags.length > 0) {
      committed.tags.forEach(addTag);
      text = committed.text;
      if (focused) await placeCaret(committed.caret);
    }
    const body = final ? text : withoutTokenAt(text, caret);
    if (savedText(body) === "") {
      status = id === null ? "new" : "empty";
      return;
    }
    if (noteLength(savedText(body)) > MAX_NOTE_LEN) {
      status = "tooLong";
      return;
    }
    const key = contentKey(body, color, tags);
    if (id !== null && key === savedKey) {
      status = "saved";
      return;
    }
    const content = { text: body, color, tags: [...tags] };
    status = "saving";
    try {
      const written = await queue.run(async () => {
        // Read `id` when the save runs: an earlier save in the queue may just have created the note.
        const creating = id === null;
        const saved = creating ? await notes.create({ ...content, date: noteDate }) : await notes.update(id!, content);
        id = saved.id;
        if (creating) await applyArrangement(saved.id);
        return saved;
      });
      if (written === undefined) return; // a newer save replaced this one
      savedKey = key;
      error = null;
      status = "saved";
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
      status = "error";
    }
  }

  /** Save everything now, including a tag still being typed, and wait for it to land. */
  async function flush() {
    await save(true);
    await queue.idle();
  }

  async function back() {
    await flush();
    // A failed save keeps the paper open, so the text is not lost.
    if (status === "error" || status === "tooLong") return;
    onback();
  }

  async function remove() {
    clearTimeout(timer);
    gone = true;
    if (id === null) return onback();
    await queue.idle();
    try {
      const deleted = await notes.remove(id);
      onback();
      notices.info(t("notes.paper.deleted"), {
        action: { label: t("notes.paper.undo"), run: () => notes.restore(deleted).catch((err) => notices.error(err)) },
      });
    } catch (err) {
      gone = false;
      error = t(`errors.${errorKind(err)}`);
      status = "error";
    }
  }

  async function move(iso: string) {
    if (id === null) {
      noteDate = iso; // not written yet: it will be created on that day
      return;
    }
    await flush();
    if (id === null) return;
    try {
      const moved = await notes.move(id, iso);
      noteDate = moved.date;
      notices.info(t("notes.paper.moved", { date: formatDay(moved.date) }));
      onmoved?.(moved.date);
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
      status = "error";
    }
  }

  /** A pin or reminder chosen before the note existed is applied right after it is created. */
  async function applyArrangement(noteId: number) {
    if (pinned) await notes.pin(noteId, true);
    if (remindAt !== null) await notes.remind(noteId, remindAt);
  }

  function pickColor(next: NoteColor) {
    color = next;
    panel = null;
    schedule();
  }

  async function togglePin() {
    const next = !pinned;
    pinned = next;
    if (id === null) return; // applied when the note is created
    try {
      pinned = (await notes.pin(id, next)).pinned;
    } catch (err) {
      pinned = !next;
      error = t(`errors.${errorKind(err)}`);
      status = "error";
    }
  }

  async function setReminder(utc: string | null) {
    const before = remindAt;
    remindAt = utc;
    panel = null;
    if (id === null) return; // applied when the note is created
    try {
      remindAt = (await notes.remind(id, utc)).remindAt;
    } catch (err) {
      remindAt = before;
      error = t(`errors.${errorKind(err)}`);
      status = "error";
    }
  }

  function toggle(which: "color" | "reminder") {
    panel = panel === which ? null : which;
  }

  function syncCaret() {
    caret = textarea?.selectionStart ?? caret;
  }

  function onInput() {
    syncCaret();
    error = null;
    if (typing === null || typing.start !== dismissedAt) dismissedAt = null;
    schedule();
  }

  function onTextKey(event: KeyboardEvent) {
    syncCaret();
    const token = tagTokenAt(text, caret);
    const open = token !== null && options.length > 0;
    if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      active = (active + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (open) dismissedAt = token.start;
      else void back();
      return;
    }
    if (!token) return;
    if (event.key === "Enter" && open) {
      event.preventDefault();
      commitTyping(options[Math.min(active, options.length - 1)]);
    } else if ((event.key === "Enter" || event.key === "Tab" || event.key === " " || event.key === ",") && token.name !== "") {
      if (commitTyping()) event.preventDefault();
    }
  }

  /** Esc anywhere on the paper goes back, except inside a dialog opened from it (the date picker). */
  function onPaperKey(event: KeyboardEvent) {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if ((event.target as HTMLElement).closest("dialog")) return;
    event.preventDefault();
    void back();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="flex flex-col gap-3" role="group" aria-label={t("notes.paper.text")} onkeydown={onPaperKey} data-paper-editor>
  <!-- The tools are around the paper, not on it: the paper is only for the note. -->
  <header class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
    <Button variant="ghost" size="sm" class="-ml-2" onclick={back}>
      <ArrowLeft size={15} />
      {t("notes.paper.back")}
    </Button>
    <p
      class="min-w-0 truncate text-xs {status === 'error' || status === 'tooLong' || status === 'empty' ? 'text-danger' : 'text-muted'}"
      role="status"
      data-status={status}
    >
      {statusText}
    </p>
  </header>

  <div class="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label={t("notes.paper.tools")}>
    <Button size="sm" aria-haspopup="dialog" data-tool="color" onclick={() => toggle("color")}>
      <span class="size-3.5 rounded-full" style:background={noteColorCss(color)} aria-hidden="true"></span>
      <Palette size={14} aria-hidden="true" />
      {t("notes.paper.color")}
    </Button>
    <Button size="sm" aria-pressed={pinned} data-tool="pin" class={pinned ? "border-accent! text-accent" : ""} onclick={togglePin}>
      <Pin size={14} fill={pinned ? "currentColor" : "none"} aria-hidden="true" />
      {pinned ? t("notes.paper.unpin") : t("notes.paper.pin")}
    </Button>
    <Button
      size="sm"
      aria-haspopup="dialog"
      data-tool="reminder"
      class={remindAt ? "border-accent! text-accent" : ""}
      onclick={() => toggle("reminder")}
    >
      <Bell size={14} fill={remindAt ? "currentColor" : "none"} aria-hidden="true" />
      {remindAt ? formatTimestamp(remindAt) : t("notes.paper.reminder")}
    </Button>
    <span class="flex-1"></span>
    <Button size="sm" variant="ghost" class="text-danger" data-tool="delete" onclick={remove}>
      <Trash2 size={14} />
      {t("notes.paper.delete")}
    </Button>
  </div>

  {#if panel === "color"}
    <Modal title={t("notes.paper.color")} width="sm" onclose={() => (panel = null)}>
      <ColorSwatches value={color} onpick={pickColor} />
    </Modal>
  {:else if panel === "reminder"}
    <Modal title={t("notes.paper.reminder")} width="sm" onclose={() => (panel = null)}>
      <ReminderPicker {remindAt} onset={setReminder} onclear={() => setReminder(null)} />
    </Modal>
  {/if}

  <div class="flex flex-col gap-1">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span class="inline-flex items-center gap-1.5 font-medium" data-note-date={noteDate}>
        <CalendarDays size={15} class="text-ink-2" aria-hidden="true" />
        {noteDate === today ? t("notes.paper.todayDate", { date: formatDay(noteDate) }) : formatDayLabel(noteDate)}
      </span>
      {#if place === "calendar"}
        <DatePicker value={noteDate} label={t("notes.paper.move")} text={t("notes.paper.move")} onchange={move} />
      {/if}
    </div>
    {#if place === "notes"}
      <p class="text-xs text-muted">{id === null ? t("notes.paper.dateHint") : t("notes.paper.dateHintExisting")}</p>
    {/if}
  </div>

  <!-- The paper: the note's text and its tags, nothing else. -->
  <section class="paper paper-sheet paper-tape flex flex-col gap-3" style:--note={noteColorCss(color)} aria-label={t("notes.paper.text")}>
    <div class="paper-ruled -mx-5 px-5">
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        bind:this={textarea}
        bind:value={text}
        autofocus={initial === null}
        rows="5"
        aria-label={t("notes.paper.text")}
        aria-describedby="note-counter"
        aria-autocomplete="list"
        aria-controls="tag-suggestions"
        aria-activedescendant={options.length > 0 ? `tag-option-${active}` : undefined}
        placeholder={t("notes.paper.placeholder")}
        oninput={onInput}
        onkeydown={onTextKey}
        onkeyup={syncCaret}
        onclick={syncCaret}
        onfocus={() => {
          focused = true;
          syncCaret();
        }}
        onblur={() => (focused = false)}
        class="block min-h-[calc(5*var(--paper-line))] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-[var(--paper-line)] break-words text-ink outline-none placeholder:text-muted/80"
      ></textarea>
    </div>

    {#if options.length > 0}
      <ul id="tag-suggestions" role="listbox" aria-label={t("notes.paper.suggestions")} class="-mt-1 flex flex-wrap gap-1.5">
        {#each options as option, index (option)}
          <li
            id="tag-option-{index}"
            role="option"
            aria-selected={index === active}
            class="cursor-pointer rounded-full border px-2.5 py-1 text-[13px] {index === active
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-ink/10 bg-surface/70 text-ink-2'}"
            onpointerdown={(event) => {
              event.preventDefault(); // keep the caret in the text
              commitTyping(option);
            }}
          >
            {option === newName ? t("notes.paper.newTag", { name: `#${option}` }) : `#${option}`}
          </li>
        {/each}
      </ul>
    {/if}

    {#if tags.length > 0}
      <ul class="flex flex-wrap gap-1.5" aria-label={t("notes.paper.tags")}>
        {#each tags as name (name)}
          <li class="inline-flex h-7 items-center gap-1 rounded-full bg-surface/70 pr-1 pl-2.5 text-[13px] text-ink-2" data-tag={name}>
            #{name}
            <button
              type="button"
              class="grid size-5 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-ink"
              aria-label={t("notes.paper.removeTag", { name })}
              onclick={() => removeTag(name)}
            >
              <X size={12} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="flex items-center justify-between gap-3">
    <span
      id="note-counter"
      class="text-xs tabular-nums {length > MAX_NOTE_LEN ? 'font-medium text-danger' : 'text-muted'}"
      title={t("notes.paper.counterLabel", { n: length, max: MAX_NOTE_LEN })}
    >
      {t("notes.paper.counter", { n: length, max: MAX_NOTE_LEN })}
    </span>
    {#if tagMessage}<p class="text-[13px] text-danger" role="alert">{tagMessage}</p>{/if}
  </div>
</div>
