// The app's pages, in one place so the sidebar, the drawer and the tab bar agree (F004).

import Bell from "@lucide/svelte/icons/bell";
import CalendarDays from "@lucide/svelte/icons/calendar-days";
import ChartColumn from "@lucide/svelte/icons/chart-column";
import Database from "@lucide/svelte/icons/database";
import Grid3x3 from "@lucide/svelte/icons/grid-3x3";
import Info from "@lucide/svelte/icons/info";
import Languages from "@lucide/svelte/icons/languages";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import Palette from "@lucide/svelte/icons/palette";
import Settings from "@lucide/svelte/icons/settings";
import Shapes from "@lucide/svelte/icons/shapes";
import Sparkles from "@lucide/svelte/icons/sparkles";
import StickyNote from "@lucide/svelte/icons/sticky-note";
import Sun from "@lucide/svelte/icons/sun";
import type { Component } from "svelte";
import type { MessageKey } from "$lib/i18n/index.svelte";

export interface NavItem {
  label: MessageKey;
  icon: Component<{ size?: number; strokeWidth?: number }>;
  href: string;
}

const today: NavItem = { label: "nav.today", icon: Sun, href: "/" };
const blocks: NavItem = { label: "nav.blocks", icon: Grid3x3, href: "/blocks" };
const activities: NavItem = { label: "nav.activities", icon: Shapes, href: "/activities" };
const insights: NavItem = { label: "nav.insights", icon: ChartColumn, href: "/insights" };
const notes: NavItem = { label: "nav.notes", icon: StickyNote, href: "/notes" };
const reminders: NavItem = { label: "nav.reminders", icon: Bell, href: "/reminders" };
const calendar: NavItem = { label: "nav.calendar", icon: CalendarDays, href: "/calendar" };
const settings: NavItem = { label: "nav.settings", icon: Settings, href: "/settings" };

/** The sidebar and the drawer (640px and up): everything, with Settings pinned at the bottom. */
export const SIDEBAR_MAIN: readonly NavItem[] = [today, blocks, activities, insights, notes, reminders, calendar];
export const SIDEBAR_FOOTER: NavItem = settings;

/**
 * What the sidebar lists. A page that has its own pages (Settings) swaps the sidebar for them,
 * the way an operating system's settings window does: a back button, then that context's items.
 * To give another feature its own sidebar, add a context here; the sidebar needs no change.
 */
export interface NavContext {
  id: string;
  /** Names the list for screen readers. */
  title?: MessageKey;
  /** Replaces the footer: leaves the context for the page the user came from. */
  back?: { label: MessageKey; href: string };
  items: readonly NavItem[];
  footer?: NavItem;
}

export const SETTINGS_SECTIONS = ["appearance", "blocks", "animations", "notes", "region", "data", "about"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const sectionIcons: Record<SettingsSection, NavItem["icon"]> = {
  appearance: Palette,
  blocks: LayoutGrid,
  animations: Sparkles,
  notes: StickyNote,
  region: Languages,
  data: Database,
  about: Info,
};

export const SETTINGS_ITEMS: readonly NavItem[] = SETTINGS_SECTIONS.map((id) => ({
  label: `settings.sections.${id}` as MessageKey,
  icon: sectionIcons[id],
  href: `/settings/${id}`,
}));

export const MAIN_CONTEXT: NavContext = { id: "main", items: SIDEBAR_MAIN, footer: SIDEBAR_FOOTER };
export const SETTINGS_CONTEXT: NavContext = {
  id: "settings",
  title: "nav.settings",
  back: { label: "nav.back", href: "/" },
  items: SETTINGS_ITEMS,
};

export function isSettingsSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/** The context a page belongs to. */
export function contextFor(pathname: string): NavContext {
  return pathname === "/settings" || pathname.startsWith("/settings/") ? SETTINGS_CONTEXT : MAIN_CONTEXT;
}

/** The tab bar under 640px has room for five: four pages for every day, and "More" for the rest. */
export const TAB_MAIN: readonly NavItem[] = [today, blocks, calendar, notes];
export const TAB_MORE: readonly NavItem[] = [activities, insights, reminders, settings];

/** Whether a page is the one open: Notes stays active while a note is open (`/notes/12`). */
export function isActive(item: NavItem, pathname: string): boolean {
  return item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
