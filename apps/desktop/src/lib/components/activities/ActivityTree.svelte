<script lang="ts">
  import Archive from "@lucide/svelte/icons/archive";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import { slide } from "svelte/transition";
  import TagChip from "$lib/components/TagChip.svelte";
  import { flatten, MAX_DEPTH } from "$lib/domain/tree";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let {
    onadd,
    onedit,
    onarchive,
  }: {
    onadd: (parentId: number) => void;
    onedit: (id: number) => void;
    onarchive: (id: number) => void;
  } = $props();

  const STORAGE_KEY = "irontion.collapsed";

  function readCollapsed(): Set<number> {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as number[]);
    } catch {
      return new Set(); // Unavailable storage just means everything starts expanded.
    }
  }

  let collapsed = $state(readCollapsed());
  const rows = $derived(flatten(catalog.tree, collapsed));

  function toggle(id: number) {
    const next = new Set(collapsed);
    if (!next.delete(id)) next.add(id);
    collapsed = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Not remembered across launches; still works for this session.
    }
  }
</script>

<ul class="flex flex-col" role="tree" aria-label={t("activities.title")}>
  {#each rows as node (node.activity.id)}
    {@const activity = node.activity}
    {@const hasChildren = node.children.length > 0}
    {@const isCollapsed = collapsed.has(activity.id)}
    <li
      role="treeitem"
      aria-level={node.depth}
      aria-expanded={hasChildren ? !isCollapsed : undefined}
      aria-selected="false"
      class="group flex h-11 items-center gap-2 rounded-lg pr-2 hover:bg-surface-hover"
      style:padding-left="{(node.depth - 1) * 22 + 4}px"
      transition:slide={{ duration: 160 }}
    >
      <button
        type="button"
        class="grid size-6 place-items-center rounded text-muted hover:text-ink {hasChildren ? '' : 'invisible'}"
        aria-label={isCollapsed ? t("activities.expand") : t("activities.collapse")}
        onclick={() => toggle(activity.id)}
      >
        <ChevronRight size={16} class="transition-transform duration-200 {isCollapsed ? '' : 'rotate-90'}" />
      </button>

      <span
        class="size-4 shrink-0 rounded-[5px]"
        style:background={catalog.colorOf(activity.id)}
      ></span>
      <button
        type="button"
        class="min-w-0 truncate text-left text-sm {node.depth === 1 ? 'font-semibold' : ''}"
        onclick={() => onedit(activity.id)}
      >
        {activity.name}
      </button>
      {#if hasChildren}
        <span class="shrink-0 text-xs text-muted">{t("activities.childCount", { n: node.children.length })}</span>
      {/if}
      <div class="flex min-w-0 flex-1 flex-wrap gap-1 overflow-hidden">
        {#each activity.tagIds as tagId (tagId)}
          {@const tag = catalog.tagById.get(tagId)}
          {#if tag}<TagChip {tag} />{/if}
        {/each}
      </div>

      <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        {#if node.depth < MAX_DEPTH}
          <button type="button" class="action" title={t("activities.addSub")} aria-label={t("activities.addSub")} onclick={() => onadd(activity.id)}>
            <Plus size={16} />
          </button>
        {/if}
        <button type="button" class="action" title={t("activities.edit")} aria-label={t("activities.edit")} onclick={() => onedit(activity.id)}>
          <Pencil size={15} />
        </button>
        <button type="button" class="action" title={t("activities.archive")} aria-label={t("activities.archive")} onclick={() => onarchive(activity.id)}>
          <Archive size={15} />
        </button>
      </div>
    </li>
  {/each}
</ul>

<style>
  .action {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    color: var(--text-2);
  }
  .action:hover {
    background: var(--surface-2);
    color: var(--text);
  }
</style>
