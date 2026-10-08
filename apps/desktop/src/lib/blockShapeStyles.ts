import { blockShapeStylesheet } from "$lib/domain/blockShape";

const STYLE_ID = "irontion-block-shapes";

/** Put the shared shape rules in the page once (the 144 cells of the grid all use them). */
export function ensureBlockShapeStyles(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = blockShapeStylesheet();
  document.head.append(style);
}
