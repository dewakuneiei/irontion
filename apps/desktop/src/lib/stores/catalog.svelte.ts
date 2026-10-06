import { getBackend } from "$lib/api/backend";
import type {
  Activity,
  ActivityPatch,
  DataCounts,
  DeleteScope,
  NewActivity,
  Tag,
  TagInput,
  TagUsage,
  TreeNode,
  TreePlanItem,
  TreeReport,
} from "$lib/api/types";
import { buildTree, effectiveColor, effectiveTagIds, flatten, indexById, pathOf } from "$lib/domain/tree";

/**
 * Activities and tags: the user's vocabulary, shared by every page.
 * Actions write through the backend, then reload so the UI shows exactly what was saved.
 * Errors propagate to the caller (forms show them inline).
 */
class CatalogStore {
  activities = $state<Activity[]>([]);
  tags = $state<Tag[]>([]);
  /** How many activities and notes use each tag (the tags panel shows both). */
  tagUsage = $state<ReadonlyMap<number, TagUsage>>(new Map());
  loaded = $state(false);
  /** False in the browser preview, where nothing is saved. */
  persistent = $state(true);
  /** Bumped after every change, so reports know to refetch. */
  version = $state(0);

  byId = $derived(indexById(this.activities));
  tagById = $derived(new Map(this.tags.map((t) => [t.id, t])));
  tree = $derived(buildTree(this.activities));
  /** Activities that can fill blocks (every active one, parents too), in tree order. */
  assignableIds = $derived(flatten(this.tree).map((n) => n.activity.id));
  /** Archived activities whose parent is not archived: the roots shown in the archive list. */
  archivedRoots = $derived(
    this.activities.filter((a) => a.archived && (a.parentId === null || !this.byId.get(a.parentId)?.archived)),
  );

  private loading: Promise<void> | undefined;

  /** Load once; later calls reuse the same request. */
  ensureLoaded(): Promise<void> {
    this.loading ??= this.reload();
    return this.loading;
  }

  colorOf(id: number): string {
    return effectiveColor(id, this.byId);
  }

  tagsOf(id: number): Set<number> {
    return effectiveTagIds(id, this.byId);
  }

  /** "Study / Math homework" */
  labelOf(id: number): string {
    return pathOf(id, this.byId)
      .map((a) => a.name)
      .join(" / ");
  }

  async createActivity(input: NewActivity): Promise<Activity> {
    const created = await (await getBackend()).createActivity(input);
    await this.reload();
    return created;
  }

  async updateActivity(id: number, patch: ActivityPatch) {
    await (await getBackend()).updateActivity(id, patch);
    await this.reload();
  }

  async archiveActivity(id: number) {
    await (await getBackend()).archiveActivity(id);
    await this.reload();
  }

  async restoreActivity(id: number) {
    await (await getBackend()).restoreActivity(id);
    await this.reload();
  }

  async deleteActivity(id: number) {
    await (await getBackend()).deleteActivity(id);
    await this.reload();
  }

  /** Which nodes of this tree already exist among the user's activities. */
  async planTree(nodes: TreeNode[]): Promise<TreePlanItem[]> {
    return (await getBackend()).planActivityTree(nodes);
  }

  /** Add a tree (a template) in one step, then reload once. */
  async importTree(nodes: TreeNode[], overwrite: string[][]): Promise<TreeReport> {
    const report = await (await getBackend()).importActivityTree(nodes, overwrite);
    await this.reload();
    return report;
  }

  async blockCount(id: number): Promise<number> {
    return (await getBackend()).activityBlockCount(id);
  }

  /** What deleting this scope would remove. Changes nothing. */
  async countData(scope: DeleteScope): Promise<DataCounts> {
    return (await getBackend()).countData(scope);
  }

  /**
   * Permanently delete the scope, then reload. Callers showing a day must reopen it:
   * blocks changed even when the activities did not.
   */
  async deleteData(scope: DeleteScope): Promise<DataCounts> {
    const counts = await (await getBackend()).deleteData(scope);
    await this.reload();
    return counts;
  }

  async createTag(input: TagInput): Promise<Tag> {
    const tag = await (await getBackend()).createTag(input);
    await this.reload();
    return tag;
  }

  async updateTag(id: number, input: TagInput) {
    await (await getBackend()).updateTag(id, input);
    await this.reload();
  }

  async deleteTag(id: number) {
    await (await getBackend()).deleteTag(id);
    await this.reload();
  }

  /**
   * Reload only the tags and their usage. Notes call this after a write: `#name` may have created
   * a tag, and a note's tags change the counts. Time data is untouched, so reports keep theirs.
   */
  async refreshTags() {
    const backend = await getBackend();
    const [tags, usage] = await Promise.all([backend.listTags(), backend.tagUsage()]);
    this.tags = tags;
    this.tagUsage = new Map(usage.map((u) => [u.tagId, u]));
  }

  private async reload() {
    const backend = await getBackend();
    const [activities, tags, usage] = await Promise.all([backend.listActivities(), backend.listTags(), backend.tagUsage()]);
    this.activities = activities;
    this.tags = tags;
    this.tagUsage = new Map(usage.map((u) => [u.tagId, u]));
    this.persistent = backend.persistent;
    this.loaded = true;
    this.version++;
  }
}

export const catalog = new CatalogStore();
