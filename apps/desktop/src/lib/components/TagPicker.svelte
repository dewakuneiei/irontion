<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import { errorKind } from "$lib/api/backend";
  import { t } from "$lib/i18n/index.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import Button from "./Button.svelte";
  import TagChip from "./TagChip.svelte";

  /**
   * Choose from the user's tags, or type a new one. Used by the activity form and the note editor,
   * so a tag is picked and created the same way in both.
   */
  let {
    tagIds = $bindable(),
    onerror,
  }: {
    tagIds: number[];
    /** Called with a message when a new tag is refused, and with `null` once it works. */
    onerror?: (message: string | null) => void;
  } = $props();

  let newTagName = $state("");

  function toggle(id: number) {
    tagIds = tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id];
  }

  async function add() {
    if (!newTagName.trim()) return;
    try {
      const tag = await catalog.createTag({ name: newTagName, color: null });
      tagIds = [...tagIds, tag.id];
      newTagName = "";
      onerror?.(null);
    } catch (err) {
      onerror?.(t(`errors.${errorKind(err)}`));
    }
  }
</script>

{#if catalog.tags.length > 0}
  <div class="flex flex-wrap gap-1.5">
    {#each catalog.tags as tag (tag.id)}
      <TagChip {tag} selected={tagIds.includes(tag.id)} onclick={() => toggle(tag.id)} />
    {/each}
  </div>
{:else}
  <p class="text-sm text-muted">{t("activities.form.noTags")}</p>
{/if}
<div class="flex gap-2">
  <input
    bind:value={newTagName}
    maxlength="60"
    aria-label={t("activities.form.newTag")}
    placeholder={t("activities.form.newTag")}
    class="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-accent"
    onkeydown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void add();
      }
    }}
  />
  <Button size="sm" onclick={add} disabled={!newTagName.trim()}>
    <Plus size={14} />
    {t("activities.form.addTag")}
  </Button>
</div>
