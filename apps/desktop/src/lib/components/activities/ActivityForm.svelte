<script lang="ts" module>
  export type ActivityFormTarget = { kind: "new"; parentId: number | null } | { kind: "edit"; id: number };
</script>

<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import { untrack } from "svelte";
  import { errorKind } from "$lib/api/backend";
  import type { Activity } from "$lib/api/types";
  import Button from "$lib/components/Button.svelte";
  import ColorPicker from "$lib/components/ColorPicker.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import TagPicker from "$lib/components/TagPicker.svelte";
  import { nextColor } from "$lib/domain/color";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let {
    target,
    onclose,
    oncreated,
  }: {
    target: ActivityFormTarget;
    onclose: () => void;
    /** Called with the new activity after it is saved (not when editing). */
    oncreated?: (activity: Activity) => void;
  } = $props();

  const SUGGESTION_KEYS = ["work", "morning", "exercise", "commute", "read", "cook"] as const;

  // The form is mounted fresh for each target, so read it once.
  const initial = untrack(() => target);
  const editing = initial.kind === "edit" ? catalog.byId.get(initial.id) : undefined;
  const parentId = initial.kind === "edit" ? (editing?.parentId ?? null) : initial.parentId;
  const parent = parentId === null ? undefined : catalog.byId.get(parentId);
  const topLevelColors = catalog.activities.filter((a) => a.parentId === null).map((a) => a.color);

  let open = $state(true);
  let name = $state(editing?.name ?? "");
  let color = $state<string | null>(editing ? editing.color : parent ? null : nextColor(topLevelColors));
  let tagIds = $state<number[]>(editing?.tagIds ?? []);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const title = editing
    ? t("activities.form.titleEdit")
    : parent
      ? t("activities.form.titleNewSub", { parent: parent.name })
      : t("activities.form.titleNew");
  // Starter names, minus the ones that already exist.
  const suggestions = $derived(
    SUGGESTION_KEYS.map((key) => t(`activities.suggestionNames.${key}`)).filter(
      (name) => !catalog.activities.some((a) => !a.archived && a.name.toLowerCase() === name.toLowerCase()),
    ),
  );
  const inheritedTags = $derived(
    parent ? [...catalog.tagsOf(parent.id)].map((id) => catalog.tagById.get(id)).filter((tag) => !!tag) : [],
  );

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = null;
    try {
      let created: Activity | undefined;
      if (editing) await catalog.updateActivity(editing.id, { name, color, tagIds });
      else created = await catalog.createActivity({ parentId, name, color, tagIds });
      open = false;
      if (created) oncreated?.(created);
    } catch (err) {
      error = t(`errors.${errorKind(err)}`);
    } finally {
      busy = false;
    }
  }
</script>

<Modal bind:open {title} {onclose}>
  <form id="activity-form" class="flex flex-col gap-5" onsubmit={save}>
    <label class="flex flex-col gap-1.5">
      <span class="text-sm font-medium">{t("activities.form.name")}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:value={name}
        autofocus
        maxlength="60"
        placeholder={t("activities.form.namePlaceholder")}
        class="h-10 rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent"
      />
    </label>

    {#if !editing && suggestions.length > 0}
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="mr-0.5 text-sm text-muted">{t("activities.form.suggestions")}</span>
        {#each suggestions as suggestion (suggestion)}
          <button
            type="button"
            class="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
            onclick={() => (name = suggestion)}
          >
            <Plus size={12} />
            {suggestion}
          </button>
        {/each}
      </div>
    {/if}

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-medium">{t("activities.form.color")}</legend>
      <ColorPicker
        bind:value={color}
        label={t("activities.form.color")}
        inheritColor={parent ? catalog.colorOf(parent.id) : undefined}
        inheritLabel={parent ? t("activities.form.inherit", { parent: parent.name }) : undefined}
      />
    </fieldset>

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-medium">{t("activities.form.tags")}</legend>
      <TagPicker bind:tagIds onerror={(message) => (error = message)} />
      {#if tagIds.length === 0 && inheritedTags.length > 0}
        <p class="text-xs text-muted">
          {t("activities.form.inheritedTags", { tags: inheritedTags.map((tag) => tag.name).join(", ") })}
        </p>
      {/if}
    </fieldset>

    {#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>{t("common.cancel")}</Button>
    <Button variant="primary" type="submit" form="activity-form" disabled={busy || !name.trim()}>
      {editing ? t("activities.form.save") : t("activities.form.create")}
    </Button>
  {/snippet}
</Modal>
