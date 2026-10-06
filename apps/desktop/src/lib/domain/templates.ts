// Activity templates: ready-made sets of activities. They are system data (code, not the
// database); adding one creates ordinary activities that belong to the user.

import type { TreeNode } from "$lib/api/types";
import type { LocaleCode } from "$lib/i18n/index.svelte";

/** The same text in each supported language. */
export type Localized = Record<LocaleCode, string>;

/** In the order they appear in the gallery. */
export const TEMPLATE_CATEGORIES = [
  "technique",
  "personal",
  "home",
  "student",
  "tech",
  "business",
  "creative",
  "care",
  "service",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

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

/** What the gallery is narrowed to. An empty query and `"all"` show everything. */
export interface TemplateFilter {
  query: string;
  category: TemplateCategory | "all";
}

const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase().trim();

/** Everything a keyword can match: the template's name and description, every activity name, and its group. */
function searchableText(template: ActivityTemplate, locale: LocaleCode, categoryLabel: string): string {
  const names = (nodes: TemplateNode[]): string[] =>
    nodes.flatMap((n) => [n.name[locale], n.name.en, ...names(n.children ?? [])]);
  // English is always searchable, so a keyword in English works whatever the app's language.
  return normalize(
    [template.name[locale], template.name.en, template.description[locale], categoryLabel, ...names(template.nodes)].join("\n"),
  );
}

/**
 * The templates that fit the filter, in their original order. Every word of the query must appear
 * somewhere in the template (name, description, group or an activity), ignoring case.
 */
export function filterTemplates(
  templates: ActivityTemplate[],
  filter: TemplateFilter,
  locale: LocaleCode,
  categoryLabel: (category: TemplateCategory) => string,
): ActivityTemplate[] {
  const words = normalize(filter.query).split(/\s+/).filter(Boolean);
  return templates.filter((template) => {
    if (filter.category !== "all" && template.category !== filter.category) return false;
    if (words.length === 0) return true;
    const text = searchableText(template, locale, categoryLabel(template.category));
    return words.every((word) => text.includes(word));
  });
}
