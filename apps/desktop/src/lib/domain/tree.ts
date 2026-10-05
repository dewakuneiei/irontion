// The activity tree is stored flat (parent_id) and rebuilt here for display.

import type { Activity } from "$lib/api/types";

/** Mirrors `irontion_core::MAX_DEPTH`. */
export const MAX_DEPTH = 5;
/** Shown when an activity was deleted permanently but is still referenced. */
export const FALLBACK_COLOR = "#898781";

export interface ActivityNode {
  activity: Activity;
  children: ActivityNode[];
  /** Top-level = 1. */
  depth: number;
}

/** Build the tree. Archived activities are skipped unless `includeArchived`. */
export function buildTree(activities: Activity[], includeArchived = false): ActivityNode[] {
  const visible = activities.filter((a) => includeArchived || !a.archived);
  const childrenOf = new Map<number | null, Activity[]>();
  for (const a of visible) {
    const key = a.parentId;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), a]);
  }
  const build = (parentId: number | null, depth: number): ActivityNode[] =>
    (childrenOf.get(parentId) ?? [])
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((activity) => ({ activity, depth, children: build(activity.id, depth + 1) }));
  return build(null, 1);
}

/** Depth-first list, skipping the children of collapsed nodes. */
export function flatten(nodes: ActivityNode[], collapsed: ReadonlySet<number> = new Set()): ActivityNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(collapsed.has(node.activity.id) ? [] : flatten(node.children, collapsed)),
  ]);
}

export function indexById(activities: Activity[]): Map<number, Activity> {
  return new Map(activities.map((a) => [a.id, a]));
}

/** Own color, or the nearest ancestor's. */
export function effectiveColor(id: number, byId: Map<number, Activity>): string {
  for (let a = byId.get(id); a; a = a.parentId === null ? undefined : byId.get(a.parentId)) {
    if (a.color) return a.color;
  }
  return FALLBACK_COLOR;
}

/** Own tags plus every ancestor's tags. */
export function effectiveTagIds(id: number, byId: Map<number, Activity>): Set<number> {
  const tags = new Set<number>();
  for (let a = byId.get(id); a; a = a.parentId === null ? undefined : byId.get(a.parentId)) {
    a.tagIds.forEach((t) => tags.add(t));
  }
  return tags;
}

/** Ancestors from the top down, ending with the activity itself. */
export function pathOf(id: number, byId: Map<number, Activity>): Activity[] {
  const path: Activity[] = [];
  for (let a = byId.get(id); a; a = a.parentId === null ? undefined : byId.get(a.parentId)) {
    path.unshift(a);
  }
  return path;
}

/** Can new time blocks use this activity? Mirrors `activities::ensure_assignable`. */
export function isAssignable(id: number, activities: Activity[]): boolean {
  const activity = activities.find((a) => a.id === id);
  if (!activity || activity.archived) return false;
  return !activities.some((a) => a.parentId === id && !a.archived);
}

/** Every id in the subtree rooted at `id`, including `id`. */
export function subtreeIds(id: number, activities: Activity[]): number[] {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) {
    for (const a of activities) if (a.parentId === ids[i]) ids.push(a.id);
  }
  return ids;
}

/** Total per node = its own count + all descendants. Keyed by activity id. */
export function rollUp(nodes: ActivityNode[], direct: Map<number, number>): Map<number, number> {
  const totals = new Map<number, number>();
  const visit = (node: ActivityNode): number => {
    const sum = node.children.reduce((acc, child) => acc + visit(child), direct.get(node.activity.id) ?? 0);
    totals.set(node.activity.id, sum);
    return sum;
  };
  nodes.forEach(visit);
  return totals;
}
