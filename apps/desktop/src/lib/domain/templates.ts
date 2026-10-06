// Activity templates: ready-made sets of activities. They are system data (code, not the
// database); adding one creates ordinary activities that belong to the user.

import type { TreeNode } from "$lib/api/types";
import type { LocaleCode } from "$lib/i18n/index.svelte";

/** The same text in each supported language. */
export type Localized = Record<LocaleCode, string>;

export type TemplateCategory = "technique" | "personal" | "student" | "career";

/** An activity in a template. A missing color means "inherit the parent's" (top level needs one). */
export interface TemplateNode {
  name: Localized;
  color?: string;
  children?: TemplateNode[];
}

export interface ActivityTemplate {
  id: string;
  category: TemplateCategory;
  name: Localized;
  description: Localized;
  nodes: TemplateNode[];
}

/** A node as shown in a list: where it sits, and the color it ends up with. */
export interface FlatNode {
  /** Names from the top level down to this node. */
  path: string[];
  depth: number;
  name: string;
  /** Own color, or the nearest parent's. */
  color: string;
}

/** The template's activities in one language, ready to send to the backend. */
export function toTree(nodes: TemplateNode[], locale: LocaleCode): TreeNode[] {
  return nodes.map((node) => ({
    name: node.name[locale],
    color: node.color ?? null,
    children: toTree(node.children ?? [], locale),
  }));
}

/** Display order (parents before their children), with inherited colors filled in. */
export function flattenTree(nodes: TreeNode[], parentColor = "", parentPath: string[] = []): FlatNode[] {
  return nodes.flatMap((node) => {
    const color = node.color ?? parentColor;
    const path = [...parentPath, node.name];
    return [{ path, depth: path.length, name: node.name, color }, ...flattenTree(node.children, color, path)];
  });
}

/** A stable string for a path, to use as a map key. */
export function pathKey(path: string[]): string {
  return path.join("\u0000");
}

export function countNodes(nodes: TemplateNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children ?? []), 0);
}
