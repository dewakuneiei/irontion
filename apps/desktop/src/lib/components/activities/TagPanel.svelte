<script lang="ts">
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import { errorKind } from "$lib/api/backend";
  import type { Tag } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import ColorPicker from "$lib/components/ColorPicker.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let newName = $state("");
  let createError = $state<string | null>(null);

  let editing = $state<Tag | null>(null);
  let editName = $state("");
  let editColor = $state<string | null>(null);
  let editError = $state<string | null>(null);
  let editOpen = $state(false);
  let deleting = $state<Tag | null>(null);

  const usage = $derived(
    new Map(catalog.tags.map((tag) => [tag.id, catalog.activities.filter((a) => a.tagIds.includes(tag.id)).length])),
  );

  async function create(event: SubmitEvent) {
    event.preventDefault();
    try {
      await catalog.createTag({ name: newName, color: null });
      newName = "";
      createError = null;
    } catch (err) {
      createError = t(`errors.${errorKind(err)}`);
    }
  }

  function startEdit(tag: Tag) {
    editing = tag;
    editName = tag.name;
    editColor = tag.color;
    editError = null;
    editOpen = true;
  }

  async function saveEdit(event: SubmitEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      await catalog.updateTag(editing.id, { name: editName, color: editColor });
      editOpen = false;
    } catch (err) {
      editError = t(`errors.${errorKind(err)}`);
    }
  }

  function askDelete() {
    deleting = editing;
    editOpen = false;
  }
</script>

<section class="rounded-2xl border border-line bg-surface p-5 shadow-card" aria-labelledby="tags-title">
  <h2 id="tags-title" class="font-semibold">{t("tags.title")}</h2>
  <p class="mt-0.5 mb-4 text-sm text-muted">{t("tags.subtitle")}</p>

  <form class="mb-3 flex gap-2" onsubmit={create}>
    <input
      bind:value={newName}
      maxlength="60"
      placeholder={t("tags.namePlaceholder")}
      aria-label={t("tags.new")}
      class="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-accent"
    />
    <Button size="sm" type="submit" disabled={!newName.trim()}>
      <Plus size={14} />
      {t("tags.new")}
    </Button>
  </form>
  {#if createError}<p class="mb-3 text-sm text-danger" role="alert">{createError}</p>{/if}

  {#if catalog.tags.length === 0}
    <p class="text-sm text-muted">{t("tags.empty")}</p>
  {:else}
    <ul class="flex flex-col">
      {#each catalog.tags as tag (tag.id)}
        <li class="group flex h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-surface-hover">
          <span class="size-2.5 rounded-full" style:background={tag.color ?? "var(--muted)"}></span>
          <span class="min-w-0 flex-1 truncate text-sm">{tag.name}</span>
          <span class="text-xs text-muted tabular-nums">{t("tags.used", { n: usage.get(tag.id) ?? 0 })}</span>
          <button
            type="button"
            class="grid size-7 place-items-center rounded-md text-ink-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface-2 [@media(hover:none)]:opacity-100"
            aria-label={t("tags.edit")}
            title={t("tags.edit")}
            onclick={() => startEdit(tag)}
          >
            <Pencil size={14} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if editing && editOpen}
  <Modal bind:open={editOpen} title={t("tags.edit")} width="sm">
    <form id="tag-form" class="flex flex-col gap-4" onsubmit={saveEdit}>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{t("activities.form.name")}</span>
        <input
          bind:value={editName}
          maxlength="60"
          class="h-10 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent"
        />
      </label>
      <fieldset>
        <legend class="mb-2 text-sm font-medium">{t("activities.form.color")}</legend>
        <ColorPicker
          bind:value={editColor}
          label={t("activities.form.color")}
          inheritColor="var(--muted)"
          inheritLabel={t("tags.noColor")}
        />
      </fieldset>
      {#if editError}<p class="text-sm text-danger" role="alert">{editError}</p>{/if}
    </form>
    {#snippet footer()}
      <Button variant="ghost" class="mr-auto text-danger" onclick={askDelete}>{t("tags.delete")}</Button>
      <Button variant="ghost" onclick={() => (editOpen = false)}>{t("common.cancel")}</Button>
      <Button variant="primary" type="submit" form="tag-form" disabled={!editName.trim()}>{t("common.save")}</Button>
    {/snippet}
  </Modal>
{/if}

{#if deleting}
  {@const tag = deleting}
  <ConfirmModal
    title={t("tags.confirmDelete.title", { name: tag.name })}
    body={t("tags.confirmDelete.body", { n: usage.get(tag.id) ?? 0 })}
    confirmLabel={t("tags.delete")}
    danger
    onconfirm={() => catalog.deleteTag(tag.id)}
    onclose={() => (deleting = null)}
  />
{/if}
