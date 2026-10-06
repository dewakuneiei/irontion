<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import ActivityForm, { type ActivityFormTarget } from "$lib/components/activities/ActivityForm.svelte";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { flatten, MAX_DEPTH } from "$lib/domain/tree";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";

  let { onpick, onclose }: { onpick: (activityId: number) => void; onclose: () => void } = $props();

  let open = $state(true);
  let formTarget = $state<ActivityFormTarget | null>(null);

  const rows = $derived(flatten(catalog.tree));

  function pick(id: number) {
    open = false;
    onpick(id);
  }
</script>

<Modal bind:open title={t("blocks.picker.title")} {onclose}>
  {#snippet actions()}
    <Button size="sm" variant="ghost" class="text-accent" onclick={() => (formTarget = { kind: "new", parentId: null })}>
      <Plus size={14} />
      {t("blocks.picker.create")}
    </Button>
  {/snippet}

  {#if rows.length === 0}
    <p class="py-6 text-center text-sm text-ink-2">{t("blocks.picker.empty")}</p>
  {:else}
    <ul class="-mx-2 flex max-h-[55vh] flex-col overflow-y-auto">
      {#each rows as node (node.activity.id)}
        {@const activity = node.activity}
        <li style:padding-left="{(node.depth - 1) * 20}px">
          <div class="group flex items-center gap-1 rounded-lg hover:bg-surface-hover">
            <button
              type="button"
              class="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm"
              onclick={() => pick(activity.id)}
            >
              <span class="size-4 shrink-0 rounded-[5px]" style:background={catalog.colorOf(activity.id)}></span>
              <span class="min-w-0 flex-1 truncate {node.children.length > 0 ? 'font-medium' : ''}">{activity.name}</span>
            </button>
            {#if node.depth < MAX_DEPTH}
              <button
                type="button"
                class="mr-1 grid size-8 shrink-0 place-items-center rounded-md text-ink-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface-2 hover:text-ink [@media(hover:none)]:opacity-100"
                aria-label={t("activities.addSub")}
                title={t("activities.addSub")}
                onclick={() => (formTarget = { kind: "new", parentId: activity.id })}
              >
                <Plus size={15} />
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Modal>

{#if formTarget}
  {#key formTarget}
    <ActivityForm target={formTarget} onclose={() => (formTarget = null)} oncreated={(created) => pick(created.id)} />
  {/key}
{/if}
