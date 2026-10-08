// How the reminder popup (F008) moves when it opens and closes. The styles themselves are CSS
// keyframes in `routes/alert/+page.svelte`; this holds the names, the default and the timing.

export const ALERT_ANIMATIONS = ["bounce", "drop", "slide", "pop", "fade"] as const;
export type AlertAnimation = (typeof ALERT_ANIMATIONS)[number];

export const DEFAULT_ALERT_ANIMATION: AlertAnimation = "bounce";

/** How long the popup takes to arrive and to leave, in milliseconds. Matches the keyframes. */
export const ALERT_ENTER_MS = 560;
export const ALERT_EXIT_MS = 260;

/** A saved style, or the default for anything else (an older or hand-edited value). */
export function parseAlertAnimation(saved: string | null): AlertAnimation {
  return ALERT_ANIMATIONS.find((style) => style === saved) ?? DEFAULT_ALERT_ANIMATION;
}
