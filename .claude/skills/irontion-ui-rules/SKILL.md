---
name: irontion-ui-rules
description: UI rules every Irontion page and component must follow - theme tokens for light/dark/system and the user accent color (F003), translations for all five languages, responsive layout (F004), motion, charts, accessibility and copy. Load before touching anything in apps/desktop/src/routes or src/lib/components.
---

# UI rules for Irontion

## Theme (F003): every page supports light, dark and system

- Use the Tailwind tokens defined in `src/app.css`: `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-surface-hover`, `border-line`, `text-ink`, `text-ink-2`, `text-muted`, `bg-accent`, `bg-accent-soft`, `text-accent`, `text-accent-ink`, `bg-danger`, `shadow-card`.
- **The accent is chosen by the user** (7 presets or any color, see `preferences.svelte.ts`). Never assume it is blue: use the accent tokens, never `blue-500` or a hex. Charts get it through `chartPalette(theme.resolved, preferences.accentFor(theme.resolved))`.
- **Block shape is a user setting** (square or circle). Block-like elements take their radius from `var(--cell-radius)`; they must stay equal width and height.
- Never write a hex color or `bg-white`/`text-black` in a component. The only exceptions are user-chosen activity/tag colors, which come from data.
- Text on an activity color uses `readableInk(color)` from `src/lib/domain/color.ts` (black or white by contrast), never a fixed color.
- Charts take colors from `chartPalette(theme.resolved, accent)` and must rebuild their option when the theme or accent changes (make the option a `$derived` that reads `theme.resolved` and `preferences.accent`).
- Check every new screen in both themes before finishing (take screenshots if you can).

## Languages: all text through `t()`

- Add each new key to `en.ts` first, then `th.ts`, `zh-CN.ts`, `ja.ts`, `ko.ts`. `pnpm check` fails on a missing key.
- Use placeholders, never string concatenation: `t("blocks.duration", { h, m })`.
- Format dates and numbers with `Intl` using `i18n.locale`. Use `formatDuration()` from `src/lib/domain/time.ts` for minutes.
- User-entered names (activities, tags) are shown as typed, never translated.
- Layouts must survive longer text (Thai, Korean) and CJK: no fixed-width buttons around text, allow wrapping.

## Copy

- Sentence case. Plain verbs. Buttons say what happens: "Archive activity", not "OK".
- Empty states tell the user what to do next and offer the button to do it.
- Errors say what happened and how to fix it. No apologies.
- No ALL-CAPS labels, no "A · B" meta strings, no arrows appended to buttons.

## Motion

- Motion answers an action (opening, expanding, painting, switching). One orchestrated entrance per page at most.
- Use `svelte/transition` and `svelte/motion`; durations 150–350 ms, `cubicOut`.
- `prefers-reduced-motion` is handled globally in `app.css`; don't fight it with JS animations that ignore it.

## Accessibility

- Every interactive element is a real `<button>`, `<a>` or form control, or has a role, `tabindex` and key handling.
- Visible focus (`:focus-visible` ring is global). Dialogs use `<dialog>` via `Modal.svelte` (Escape closes, focus returns).
- Color is never the only signal: activity cells also show a label, charts have a table or labels.
- Icons-only buttons need `aria-label` / `title` from `t()`.

## Responsive

Every page works from 390px to wide screens with no sideways scroll. Breakpoints used (keep to these):

- `sm` 640px: below it the sidebar becomes a bottom tab bar. Leave room at the bottom (the layout adds `pb-24`).
- `lg` 1024px: the sidebar is inline (below it, a drawer). Two-column dashboards (Today, Insights) start here.
- `min-[56rem]` 896px: two-column pages with a side panel (Blocks, Activities). Below it, stack, and show side panels as a bottom sheet if they act on a selection.
- Size things with `min-w-0`, `flex-wrap`, `grid-cols-1 sm:grid-cols-N`; no fixed widths around text.
- Hover-only controls also need `[@media(hover:none)]:opacity-100` so touch screens can reach them.
- Dialogs use `Modal.svelte`, which already caps width and height to the window.
- Verify at 1280, 1024, 800 and 390px wide.

## Layout and components

- Page shell: `<PageHeader title subtitle>` then content, max width from the layout.
- Reuse `Modal`, `Select` (dropdown), `DatePicker`, `ColorPicker`, `TagChip`, `ActivityPickerModal`, `Chart`, `EmptyState` before writing new ones. Use `Select`, not a native `<select>`, so menus match the theme.
- Dates and times for display go through `src/lib/format.svelte.ts` (it applies the user's date format and 12/24-hour choice), never a hard-coded `toLocaleDateString` or "HH:MM".
- The theme switch lives only in Settings. Do not add it elsewhere.
- The Blocks grid is the hero of the app: keep it calm and precise; it gets the boldest treatment, everything else stays quiet.
