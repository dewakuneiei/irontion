<script lang="ts">
  import LayoutTemplate from "@lucide/svelte/icons/layout-template";
  import Plus from "@lucide/svelte/icons/plus";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import Shapes from "@lucide/svelte/icons/shapes";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import ActivityForm, { type ActivityFormTarget } from "$lib/components/activities/ActivityForm.svelte";
  import ActivityTree from "$lib/components/activities/ActivityTree.svelte";
  import TagPanel from "$lib/components/activities/TagPanel.svelte";
  import Button from "$lib/components/Button.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import TemplatesModal from "$lib/components/templates/TemplatesModal.svelte";
  import { SLOT_MINUTES } from "$lib/domain/time";
  import { subtreeIds } from "$lib/domain/tree";
  import { formatMinutes, i18n, t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { notices } from "$lib/stores/notices.svelte";

  interface Confirmation {
    kind: "archive" | "delete";
    id: number;
    name: string;
    blocks: number;
    children: number;
  }

  let formTarget = $state<ActivityFormTarget | null>(null);
  let confirmation = $state<Confirmation | null>(null);
  let showArchived = $state(false);
  let templatesOpen = $state(false);

  async function ask(kind: Confirmation["kind"], id: number) {
    const activity = catalog.byId.get(id);
    if (!activity) return;
    try {
      const blocks = await catalog.blockCount(id);
      const children = subtreeIds(id, catalog.activities).length - 1;
      confirmation = { kind, id, name: activity.name, blocks, children };
    } catch (err) {
      notices.error(err);
    }
  }

  function confirmBody(c: Confirmation): string {
    const params = { n: new Intl.NumberFormat(i18n.locale).format(c.blocks), duration: formatMinutes(c.blocks * SLOT_MINUTES), children: c.children };
    if (c.kind === "delete") return t("activities.confirmDelete.body", params);
    return t(c.children > 0 ? "activities.confirmArchive.bodyWithChildren" : "activities.confirmArchive.body", params);
  }
</script>

<PageHeader title={t("activities.title")} subtitle={t("activities.subtitle")}>
  {#snippet actions()}
    <Button onclick={() => (templatesOpen = true)}>
      <LayoutTemplate size={16} />
      {t("templates.button")}
    </Button>
    {#if catalog.activities.length > 0}
      <Button variant="primary" onclick={() => (formTarget = { kind: "new", parentId: null })}>
        <Plus size={16} />
        {t("activities.new")}
      </Button>
    {/if}
  {/snippet}
</PageHeader>

<div class="grid grid-cols-1 items-start gap-6 min-[56rem]:grid-cols-[minmax(0,1fr)_18rem]">
  <div class="flex flex-col gap-4">
    {#if catalog.loaded && catalog.activities.length === 0}
      <EmptyState icon={Shapes} title={t("activities.empty.title")} body={t("activities.empty.body")}>
        {#snippet action()}
          <div class="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onclick={() => (templatesOpen = true)}>
              <LayoutTemplate size={16} />
              {t("templates.startFrom")}
            </Button>
            <Button onclick={() => (formTarget = { kind: "new", parentId: null })}>
              <Plus size={16} />
              {t("activities.empty.action")}
            </Button>
          </div>
        {/snippet}
      </EmptyState>
    {:else}
      {#if catalog.tree.length > 0}
        <section class="rounded-2xl border border-line bg-surface p-2 shadow-card">
          <ActivityTree
            onadd={(parentId) => (formTarget = { kind: "new", parentId })}
            onedit={(id) => (formTarget = { kind: "edit", id })}
            onarchive={(id) => ask("archive", id)}
          />
        </section>
      {/if}

      {#if catalog.archivedRoots.length > 0}
        <section>
          <button
            type="button"
            class="mb-2 text-sm font-medium text-ink-2 hover:text-ink"
            aria-expanded={showArchived}
            onclick={() => (showArchived = !showArchived)}
          >
            {t("activities.archived.title", { n: catalog.archivedRoots.length })}
          </button>
          {#if showArchived}
            <div class="rounded-2xl border border-dashed border-line p-2">
              <p class="px-2 pt-1 pb-2 text-xs text-muted">{t("activities.archived.hint")}</p>
              <ul>
                {#each catalog.archivedRoots as activity (activity.id)}
                  <li class="flex h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-surface-hover">
                    <span class="size-3.5 rounded-[4px] opacity-60" style:background={catalog.colorOf(activity.id)}></span>
                    <span class="min-w-0 flex-1 truncate text-sm text-ink-2">{catalog.labelOf(activity.id)}</span>
                    <Button size="sm" variant="ghost" onclick={() => catalog.restoreActivity(activity.id).catch((e) => notices.error(e))}>
                      <RotateCcw size={14} />
                      {t("activities.archived.restore")}
                    </Button>
                    <Button size="sm" variant="ghost" class="text-danger" onclick={() => ask("delete", activity.id)}>
                      <Trash2 size={14} />
                      {t("activities.archived.delete")}
                    </Button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </div>

  <TagPanel />
</div>

{#if templatesOpen}
  <TemplatesModal onclose={() => (templatesOpen = false)} />
{/if}

{#if formTarget}
  {#key formTarget}
    <ActivityForm target={formTarget} onclose={() => (formTarget = null)} />
  {/key}
{/if}

{#if confirmation}
  {@const c = confirmation}
  <ConfirmModal
    title={t(c.kind === "archive" ? "activities.confirmArchive.title" : "activities.confirmDelete.title", { name: c.name })}
    body={confirmBody(c)}
    confirmLabel={t(c.kind === "archive" ? "activities.archive" : "activities.archived.delete")}
    danger={c.kind === "delete"}
    onconfirm={() => (c.kind === "archive" ? catalog.archiveActivity(c.id) : catalog.deleteActivity(c.id))}
    onclose={() => (confirmation = null)}
  />
{/if}
