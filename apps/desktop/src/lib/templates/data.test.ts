import { describe, expect, it } from "vitest";
import { MAX_DEPTH } from "$lib/domain/tree";
import {
  TEMPLATE_CATEGORIES,
  countNodes,
  filterTemplates,
  flattenTree,
  pathKey,
  toTree,
  type ActivityTemplate,
  type Localized,
  type TemplateCategory,
  type TemplateNode,
} from "$lib/domain/templates";
import { TEMPLATES } from "./data";

const LOCALES = ["en", "th", "zh-CN", "ja", "ko"] as const;
const MAX_NAME_LEN = 60; // irontion_core::MAX_NAME_LEN

function everyNode(nodes: TemplateNode[], visit: (node: TemplateNode, depth: number) => void, depth = 1) {
  for (const node of nodes) {
    visit(node, depth);
    everyNode(node.children ?? [], visit, depth + 1);
  }
}
const texts = (value: Localized) => LOCALES.map((locale) => value[locale]);

describe("built-in templates", () => {
  it("has plenty, with unique ids, starting with the 4Q matrix", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(TEMPLATES[0].id).toBe("eisenhower");
    expect(TEMPLATES[0].nodes).toHaveLength(4);
  });

  it("covers every category, each with several templates", () => {
    for (const category of TEMPLATE_CATEGORIES) {
      const count = TEMPLATES.filter((t) => t.category === category).length;
      expect(count, `${category} has too few templates`).toBeGreaterThanOrEqual(4);
    }
  });

  it("lists templates grouped in category order", () => {
    const order = TEMPLATES.map((t) => TEMPLATE_CATEGORIES.indexOf(t.category));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as [string, ActivityTemplate]))("%s is complete in all five languages", (_id, template) => {
    for (const text of [...texts(template.name), ...texts(template.description)]) expect(text.trim()).not.toBe("");
    everyNode(template.nodes, (node) => {
      for (const text of texts(node.name)) {
        expect(text.trim(), `empty name in ${template.id}`).not.toBe("");
        expect([...text].length).toBeLessThanOrEqual(MAX_NAME_LEN);
      }
    });
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as [string, ActivityTemplate]))("%s is a valid activity tree", (_id, template) => {
    template.nodes.forEach((root) => expect(root.color, `${template.id}: a top-level activity needs a color`).toMatch(/^#[0-9a-f]{6}$/));
    everyNode(template.nodes, (node, depth) => {
      expect(depth).toBeLessThan(MAX_DEPTH + 1);
      if (node.color) expect(node.color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it.each(LOCALES)("%s: siblings never share a name", (locale) => {
    for (const template of TEMPLATES) {
      const check = (nodes: TemplateNode[]) => {
        const names = nodes.map((n) => n.name[locale].trim().toLowerCase());
        expect(new Set(names).size, `${template.id} has duplicate siblings in ${locale}`).toBe(names.length);
        nodes.forEach((n) => check(n.children ?? []));
      };
      check(template.nodes);
    }
  });

  it("is not a trivial list: each has at least four activities", () => {
    TEMPLATES.forEach((t) => expect(countNodes(t.nodes)).toBeGreaterThanOrEqual(4));
  });
});

describe("searching templates", () => {
  const label = (c: TemplateCategory) => ({ technique: "Time management techniques", student: "Student and learning" })[c as string] ?? c;
  const find = (query: string, category: TemplateCategory | "all" = "all", locale: "en" | "th" = "en") =>
    filterTemplates(TEMPLATES, { query, category }, locale, label).map((t) => t.id);

  it("returns everything for an empty search", () => {
    expect(find("")).toHaveLength(TEMPLATES.length);
    expect(find("   ")).toHaveLength(TEMPLATES.length);
  });

  it("matches a template's name, ignoring case", () => {
    expect(find("POMODORO")).toEqual(["pomodoro"]);
    expect(find("eisenhower")).toContain("eisenhower");
  });

  it("matches words in the description", () => {
    expect(find("delegate")).toContain("eisenhower");
  });

  it("matches the names of the activities inside", () => {
    const hits = find("debugging");
    expect(hits).toContain("developer");
    expect(hits).not.toContain("pomodoro");
  });

  it("needs every word, in any order", () => {
    expect(find("code review")).toContain("developer");
    expect(find("review code")).toContain("developer");
    expect(find("pomodoro nonsenseword")).toEqual([]);
  });

  it("narrows to a category", () => {
    const technique = find("", "technique");
    expect(technique.length).toBeGreaterThanOrEqual(4);
    expect(technique).toContain("eisenhower");
    expect(technique).not.toContain("developer");
  });

  it("combines the keyword and the category", () => {
    expect(find("review", "technique")).toContain("gtd");
    expect(find("review", "tech")).toContain("developer");
    expect(find("pomodoro", "tech")).toEqual([]);
  });

  it("matches the category's name too", () => {
    expect(find("time management")).toContain("pomodoro");
  });

  it("finds nothing for a keyword that matches nothing", () => {
    expect(find("zzzzzz")).toEqual([]);
  });

  it("searches in the app's language, and English still works", () => {
    const teacherTh = TEMPLATES.find((t) => t.id === "teacher")!.name.th;
    expect(find(teacherTh, "all", "th")).toContain("teacher");
    expect(find("pomodoro", "all", "th")).toEqual(["pomodoro"]);
    expect(find("เทคนิคโพโมโดโร", "all", "th")).toEqual(["pomodoro"]);
  });

  it("keeps the original order", () => {
    const ids = find("review");
    const order = ids.map((id) => TEMPLATES.findIndex((t) => t.id === id));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("template helpers", () => {
  const eisenhower = TEMPLATES[0];

  it("turns a template into a tree in the chosen language", () => {
    const tree = toTree(eisenhower.nodes, "th");
    expect(tree[0].name).toBe(eisenhower.nodes[0].name.th);
    expect(tree[0].color).toBe("#e34948");
    expect(tree[0].children[0].color).toBeNull(); // inherits
  });

  it("lists nodes parents first, with inherited colors and paths", () => {
    const flat = flattenTree(toTree(eisenhower.nodes, "en"));
    expect(flat).toHaveLength(countNodes(eisenhower.nodes));
    expect(flat[0]).toMatchObject({ path: ["Do first"], depth: 1, color: "#e34948" });
    expect(flat[1]).toMatchObject({ path: ["Do first", "Urgent work"], depth: 2, color: "#e34948" });
  });

  it("gives every path a distinct key", () => {
    const keys = flattenTree(toTree(eisenhower.nodes, "en")).map((n) => pathKey(n.path));
    expect(new Set(keys).size).toBe(keys.length);
    expect(pathKey(["a", "b"])).not.toBe(pathKey(["a b"]));
  });
});
