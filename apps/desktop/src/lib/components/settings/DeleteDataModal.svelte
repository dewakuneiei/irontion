<script lang="ts">
  import { errorKind } from "$lib/api/backend";
  import type { DataCounts, DeleteScope } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { todayISO } from "$lib/domain/time";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { day } from "$lib/stores/day.svelte";
  import { notes } from "$lib/stores/notes.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  let { onclose }: { onclose: () => void } = $props();

  type Choice = "range" | "allBlocks" | "allActivities" | "allNotes";

  // The smallest delete is the default, so a hasty click does the least harm.
  let choice = $state<Choice>("range");
  let from = $state(todayISO());
  let to = $state(todayISO());
  let counts = $state<DataCounts | null>(null);
  let confirmed = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let open = $state(true);

  const rangeValid = $derived(from <= to); // ISO dates sort as text
  const scope = $derived<DeleteScope | null>(
    choice === "range" ? (rangeValid ? { kind: "blocksInRange", from, to } : null) : { kind: choice },
  );
  const nothing = $derived(counts !== null && counts.blocks === 0 && counts.activities === 0 && counts.notes === 0);
  const canDelete = $derived(scope !== null && counts !== null && !nothing && confirmed && !busy);

  const options: { value: Choice; label: () => string; hint: () => string }[] = [
    { value: "allBlocks", label: () => t("settings.danger.modal.allBlocks"), hint: () => t("settings.danger.modal.allBlocksHint") },
    { value: "range", label: () => t("settings.danger.modal.range"), hint: () => t("settings.danger.modal.rangeHint") },
    {
      value: "allActivities",
      label: () => t("settings.danger.modal.allActivities"),
      hint: () => t("settings.danger.modal.allActivitiesHint"),
    },
    { value: "allNotes", label: () => t("settings.danger.modal.allNotes"), hint: () => t("settings.danger.modal.allNotesHint") },
  ];

  // Show exactly how much the current choice would remove, and ask again whenever it changes.
  let countRequest = 0;
  $effect(() => {
    const current = scope;
    confirmed = false;
    counts = null;
    if (current === null) return;
    const request = ++countRequest;
    catalog
      .countData(current)
      .then((result) => {
        if (request === countRequest) counts = result;
      })
      .catch((err) => {
        if (request === countRequest) error = t(`errors.${errorKind(err)}`);
      });
  });

  async function remove() {
    if (!canDelete || scope === null) return;
    busy = true;
    error = null;
    try {
      await catalog.deleteData(scope);
      await day.open(day.date); // the Blocks page may be showing a day that just changed
      if (scope.kind === "allNotes") await notes.reload(); // the Notes page and the Calendar share this list
      notices.info(t("settings.danger.done"));
      open = false;
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
    } finally {
      busy = false;
    }
  }
</script>

<Modal bind:open title={t("settings.danger.modal.title")} width="md" {onclose}>
  <p class="mb-4 text-sm text-ink-2">{t("settings.danger.modal.intro")}</p>

  <div class="flex flex-col gap-2" role="radiogroup" aria-label={t("settings.danger.modal.title")}>
    {#each options as option (option.value)}
      {@const selected = choice === option.value}
      <div class="rounded-xl border transition-colors {selected ? 'border-danger bg-danger/5' : 'border-line'}">
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          data-choice={option.value}
          onclick={() => (choice = option.value)}
          class="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left {selected ? '' : 'hover:bg-surface-hover'}"
        >
          <span
            class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 {selected ? 'border-danger' : 'border-muted'}"
            aria-hidden="true"
          >
            {#if selected}<span class="size-2 rounded-full bg-danger"></span>{/if}
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-medium">{option.label()}</span>
            <span class="block text-[13px] text-muted">{option.hint()}</span>
          </span>
        </button>

        {#if option.value === "range" && selected}
          <div class="flex flex-col gap-3 px-4 pt-1 pb-4 pl-11">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted">{t("settings.danger.modal.from")}</span>
              <DatePicker value={from} label={t("settings.danger.modal.from")} onchange={(iso) => (from = iso)} />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted">{t("settings.danger.modal.to")}</span>
              <DatePicker value={to} label={t("settings.danger.modal.to")} onchange={(iso) => (to = iso)} />
            </div>
            {#if !rangeValid}
              <p class="text-[13px] text-danger" role="alert">{t("settings.danger.modal.rangeInvalid")}</p>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm" aria-live="polite" data-summary>
    {#if counts === null}
      <span class="text-muted">&nbsp;</span>
    {:else if nothing}
      <span class="text-muted">{t("settings.danger.modal.nothing")}</span>
    {:else}
      {#if choice !== "allNotes"}
        <p class="font-medium text-danger">{t("settings.danger.modal.blocksToDelete", { blocks: counts.blocks })}</p>
      {/if}
      {#if choice === "allNotes"}
        <p class="font-medium text-danger">{t("settings.danger.modal.notesToDelete", { notes: counts.notes })}</p>
      {/if}
      {#if choice === "allActivities"}
        <p class="font-medium text-danger">{t("settings.danger.modal.activitiesToDelete", { activities: counts.activities })}</p>
      {/if}
    {/if}
  </div>

  <label class="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
    <input type="checkbox" bind:checked={confirmed} disabled={nothing || counts === null} class="size-4 accent-[var(--danger)]" />
    {t("settings.danger.modal.confirm")}
  </label>

  {#if error}<p class="mt-3 text-sm text-danger" role="alert">{error}</p>{/if}

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>{t("common.cancel")}</Button>
    <Button variant="danger" disabled={!canDelete} onclick={remove}>{t("settings.danger.modal.submit")}</Button>
  {/snippet}
</Modal>
