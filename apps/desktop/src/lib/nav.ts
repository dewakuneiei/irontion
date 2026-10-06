// The app's pages, in one place so the sidebar, the drawer and the tab bar agree (F004).

import Bell from "@lucide/svelte/icons/bell";
import CalendarDays from "@lucide/svelte/icons/calendar-days";
import ChartColumn from "@lucide/svelte/icons/chart-column";
import Grid3x3 from "@lucide/svelte/icons/grid-3x3";
import Settings from "@lucide/svelte/icons/settings";
import Shapes from "@lucide/svelte/icons/shapes";
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

/** The tab bar under 640px has room for five: four pages for every day, and "More" for the rest. */
export const TAB_MAIN: readonly NavItem[] = [today, blocks, calendar, notes];
export const TAB_MORE: readonly NavItem[] = [activities, insights, reminders, settings];

/** Whether a page is the one open: Notes stays active while a note is open (`/notes/12`). */
export function isActive(item: NavItem, pathname: string): boolean {
  return item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
