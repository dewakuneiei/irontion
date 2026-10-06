<script lang="ts">
  import BellOff from "@lucide/svelte/icons/bell-off";
  import Bell from "@lucide/svelte/icons/bell";
  import { onMount } from "svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import NoteCard from "$lib/components/notes/NoteCard.svelte";
  import type { Note } from "$lib/api/types";
  import { splitReminders } from "$lib/domain/reminders";
  import { t } from "$lib/i18n/index.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  /** The page keeps its own clock, so a reminder moves from Upcoming to Past while it is open. */
  let now = $state(new Date());
  const { upcoming, past } = $derived(splitReminders(notes.all, now));

  onMount(() => {
    notes.ensureLoaded().catch((err) => notices.error(err));
    const timer = setInterval(() => (now = new Date()), 15_000);
    return () => clearInterval(timer);
  });

  async function clear(note: Note) {
    try {
      await notes.remind(note.id, null);
    } catch (err) {
      notices.error(err);
    }
  }
</script>

<PageHeader title={t("reminders.title")} subtitle={t("reminders.subtitle")} />

{#if notes.loaded && upcoming.length === 0 && past.length === 0}
  <EmptyState icon={Bell} title={t("reminders.empty.title")} body={t("reminders.empty.body")}>
    {#snippet action()}
      <a href="/notes" class="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink">
        {t("reminders.empty.action")}
      </a>
    {/snippet}
  </EmptyState>
{:else if notes.loaded}
  {@render group("upcoming", t("reminders.upcoming"), upcoming)}
  {@render group("past", t("reminders.past"), past)}
  <p class="mt-6 max-w-[60ch] text-xs text-muted">{t("reminders.openOnly")}</p>
{/if}

{#snippet group(id: string, title: string, items: Note[])}
  {#if items.length > 0}
    <section class="mb-8" aria-labelledby="reminders-{id}" data-group={id}>
      <h2 id="reminders-{id}" class="mb-2 text-xs font-medium text-muted">{title}</h2>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] items-start gap-x-5 gap-y-7 pt-2">
        {#each items as note (note.id)}
          <li class="flex min-w-0 flex-col gap-1.5">
            <NoteCard {note} href="/notes/{note.id}" />
            <Button size="sm" variant="ghost" class="self-start" data-clear={note.id} onclick={() => clear(note)}>
              <BellOff size={14} />
              {t("reminders.clear")}
            </Button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/snippet}
