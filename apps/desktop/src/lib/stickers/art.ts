// The built-in stickers (F007), drawn on a 64x64 grid. Like the templates, they are system data:
// the database stores only the id. These colors are the stickers' own artwork, not UI colors, so they
// stay the same in light and dark (as a user's own sticker image does).

import type { StickerPreset } from "$lib/domain/stickers";

const ART: Record<StickerPreset, string> = {
  star: `<path d="M32 5l8.2 16.6 18.3 2.7-13.2 12.9 3.1 18.2L32 46.8 15.6 55.4l3.1-18.2L5.5 24.3l18.3-2.7z" fill="#FFC93C" stroke="#E39B00" stroke-width="3" stroke-linejoin="round"/>`,
  heart: `<path d="M32 56S6 40 6 22.5C6 14 12.6 8 20 8c5.3 0 9.6 3 12 7.2C34.4 11 38.7 8 44 8c7.4 0 14 6 14 14.5C58 40 32 56 32 56z" fill="#FF5A79" stroke="#D93358" stroke-width="3" stroke-linejoin="round"/><ellipse cx="19" cy="20" rx="5" ry="3.5" fill="#fff" opacity=".55" transform="rotate(-35 19 20)"/>`,
  sun: `<path d="M32 3v8M32 53v8M3 32h8M53 32h8M11.5 11.5l5.7 5.7M46.8 46.8l5.7 5.7M11.5 52.5l5.7-5.7M46.8 17.2l5.7-5.7" stroke="#FF9F1C" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="14" fill="#FFC93C" stroke="#FF9F1C" stroke-width="3"/>`,
  moon: `<path d="M42 6A26 26 0 1 0 58 42 20 20 0 0 1 42 6z" fill="#FFD866" stroke="#D9A400" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="38" r="3" fill="#E8B92E"/><circle cx="33" cy="48" r="2" fill="#E8B92E"/>`,
  cloud: `<path d="M17 50h31a12 12 0 0 0 1.5-23.9A16 16 0 0 0 19 22.6 13.7 13.7 0 0 0 17 50z" fill="#EAF4FF" stroke="#6AA9F0" stroke-width="3" stroke-linejoin="round"/>`,
  rain: `<path d="M17 38h31a11 11 0 0 0 1.4-21.9A15 15 0 0 0 21 12.4 12.8 12.8 0 0 0 17 38z" fill="#D6E9FF" stroke="#5B9BE6" stroke-width="3" stroke-linejoin="round"/><path d="M22 46l-3 8M33 46l-3 8M44 46l-3 8" stroke="#3D8BEB" stroke-width="4" stroke-linecap="round"/>`,
  flower: `<path d="M32 42v18" stroke="#3DAA5C" stroke-width="4" stroke-linecap="round"/><path d="M32 54c6-1 10-5 11-10-6 0-10 4-11 10z" fill="#5BCB7B"/><g fill="#FF8FB8" stroke="#E8578E" stroke-width="2.5"><circle cx="32" cy="16" r="9"/><circle cx="44.4" cy="25" r="9"/><circle cx="39.6" cy="39.5" r="9"/><circle cx="24.4" cy="39.5" r="9"/><circle cx="19.6" cy="25" r="9"/></g><circle cx="32" cy="29" r="7" fill="#FFD23F" stroke="#E0A800" stroke-width="2.5"/>`,
  leaf: `<path d="M10 54C10 24 28 8 56 8c0 28-16 46-46 46z" fill="#5BCB7B" stroke="#2E9E52" stroke-width="3" stroke-linejoin="round"/><path d="M10 54L42 22" stroke="#2E9E52" stroke-width="3" stroke-linecap="round"/>`,
  fire: `<path d="M32 59c-11 0-19-8-19-18 0-9 6-14 9-21 1 5 4 8 7 9-1-9 4-17 11-23-1 8 3 13 7 18 3 4 4 8 4 12 0 13-8 23-19 23z" fill="#FF7A2F" stroke="#E04E1B" stroke-width="3" stroke-linejoin="round"/><path d="M32 56c-5 0-9-4-9-9 0-5 4-8 6-12 1 3 3 5 5 6 1-3 3-5 3-7 3 4 4 8 4 12 0 6-4 10-9 10z" fill="#FFC93C"/>`,
  check: `<circle cx="32" cy="32" r="26" fill="#3DBE6E" stroke="#279A52" stroke-width="3"/><path d="M20 33l8 8 16-17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  trophy: `<path d="M18 13H9v4a10 10 0 0 0 10 10M46 13h9v4a10 10 0 0 1-10 10" fill="none" stroke="#D99A00" stroke-width="3.5" stroke-linecap="round"/><path d="M32 36v10" stroke="#D99A00" stroke-width="5"/><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#FFC93C" stroke="#D99A00" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="46" width="24" height="10" rx="2.5" fill="#B07A3B" stroke="#8A5A26" stroke-width="3"/>`,
  coffee: `<path d="M22 6c-3 4 3 6 0 10M32 4c-3 4 3 6 0 10M42 6c-3 4 3 6 0 10" stroke="#B9A08A" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M46 28h4a7 7 0 0 1 0 14h-5" fill="none" stroke="#8A5A3B" stroke-width="3.5"/><path d="M11 22h36v16a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14z" fill="#F5E6D3" stroke="#8A5A3B" stroke-width="3" stroke-linejoin="round"/><path d="M14 27h30" stroke="#8A5A3B" stroke-width="4" opacity=".55"/><path d="M8 58h42" stroke="#8A5A3B" stroke-width="4" stroke-linecap="round"/>`,
  book: `<path d="M6 13c9-4 18-4 26 2 8-6 17-6 26-2v40c-9-4-18-4-26 2-8-6-17-6-26-2z" fill="#5B8DEF" stroke="#3563C4" stroke-width="3" stroke-linejoin="round"/><path d="M32 15v40" stroke="#3563C4" stroke-width="3"/><path d="M12 23c5-1.5 10-1.5 14 1M12 31c5-1.5 10-1.5 14 1M12 39c5-1.5 10-1.5 14 1M38 24c4-2.5 9-2.5 14-1M38 32c4-2.5 9-2.5 14-1M38 40c4-2.5 9-2.5 14-1" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`,
  music: `<path d="M24 47V15l28-7v32" fill="none" stroke="#7B61FF" stroke-width="5" stroke-linejoin="round"/><path d="M24 22l28-7" stroke="#7B61FF" stroke-width="5"/><ellipse cx="17" cy="48" rx="9" ry="7" fill="#7B61FF"/><ellipse cx="45" cy="41" rx="9" ry="7" fill="#7B61FF"/>`,
  cake: `<path d="M32 5c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="#FF9F1C"/><rect x="29" y="18" width="6" height="12" rx="2" fill="#7FB5FF" stroke="#4E8FE0" stroke-width="2"/><rect x="9" y="30" width="46" height="26" rx="5" fill="#FFB3CF" stroke="#E5739E" stroke-width="3"/><path d="M9 39c4 4 8 4 11.5 0s7.5-4 11.5 0 7.5 4 11.5 0 7.5-4 11.5 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`,
  gift: `<rect x="8" y="27" width="48" height="30" rx="3" fill="#FF6B6B" stroke="#D94848" stroke-width="3"/><rect x="5" y="18" width="54" height="11" rx="3" fill="#FF8585" stroke="#D94848" stroke-width="3"/><path d="M32 18v39" stroke="#FFD23F" stroke-width="7"/><path d="M32 18c-4-10-16-12-16-4 0 4 8 4 16 4zM32 18c4-10 16-12 16-4 0 4-8 4-16 4z" fill="#FFD23F" stroke="#E0A800" stroke-width="2.5" stroke-linejoin="round"/>`,
};

const cache = new Map<StickerPreset, string>();

/** The preset as an image URL, for an `<img>` like a user's own sticker. */
export function presetImage(id: StickerPreset): string {
  let url = cache.get(id);
  if (!url) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ART[id]}</svg>`;
    url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(id, url);
  }
  return url;
}
