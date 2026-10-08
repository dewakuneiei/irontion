// Block shapes (F001, F003): the one place that knows which shapes exist and what they look like.
// Every shape is a polygon on a 0-100 square, so the same cell box, hit-testing and rings work for
// all of them. Curves (the circle, rounded corners) are many short edges.
//
// The CSS built here goes in one shared stylesheet (`blockShapeStylesheet`), not on each of the
// 144 cells. Thickness (outline, selection ring) is in real pixels, from CSS variables, so it is
// the same on every shape and every cell size: each polygon vertex moves along its "miter" by
// `miter * distance`, which shifts every edge by exactly `distance`.

export const BLOCK_SHAPES = ["square", "circle", "glass", "hexagon"] as const;
export type BlockShape = (typeof BLOCK_SHAPES)[number];
export const DEFAULT_BLOCK_SHAPE: BlockShape = "square";

/** A saved or unknown value as a shape; anything not recognized is the default (square). */
export function parseBlockShape(value: unknown): BlockShape {
  return BLOCK_SHAPES.find((shape) => shape === value) ?? DEFAULT_BLOCK_SHAPE;
}

export interface Point {
  x: number;
  y: number;
}

interface Corner extends Point {
  /** How far the corner is rounded off, in the 0-100 units. 0 is sharp. */
  r: number;
}

/** Points per rounded corner, and around the circle. Enough that no edge shows at 100px. */
const CORNER_STEPS = 6;
const CIRCLE_POINTS = 72;

/** A regular hexagon with flat sides left and right: as tall as the cell, `sqrt(3)/2` as wide. */
const HEX_HALF_WIDTH = (Math.sqrt(3) / 4) * 100;

const CORNERS: Record<Exclude<BlockShape, "circle">, Corner[]> = {
  square: [
    { x: 0, y: 0, r: 22 },
    { x: 100, y: 0, r: 22 },
    { x: 100, y: 100, r: 22 },
    { x: 0, y: 100, r: 22 },
  ],
  // A water glass from the front: wider at the rim than at the base, with a rounded base.
  glass: [
    { x: 12, y: 2, r: 3 },
    { x: 88, y: 2, r: 3 },
    { x: 72, y: 98, r: 11 },
    { x: 28, y: 98, r: 11 },
  ],
  hexagon: [
    { x: 50, y: 0, r: 6 },
    { x: 50 + HEX_HALF_WIDTH, y: 25, r: 6 },
    { x: 50 + HEX_HALF_WIDTH, y: 75, r: 6 },
    { x: 50, y: 100, r: 6 },
    { x: 50 - HEX_HALF_WIDTH, y: 75, r: 6 },
    { x: 50 - HEX_HALF_WIDTH, y: 25, r: 6 },
  ],
};

const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** `corners` with each corner cut off by a short curve (a quadratic Bezier through the corner). */
export function roundCorners(corners: readonly Corner[], steps = CORNER_STEPS): Point[] {
  const points: Point[] = [];
  corners.forEach((corner, i) => {
    const prev = corners[(i + corners.length - 1) % corners.length];
    const next = corners[(i + 1) % corners.length];
    if (corner.r <= 0) {
      points.push({ x: corner.x, y: corner.y });
      return;
    }
    const toPrev = { x: (prev.x - corner.x) / length(corner, prev), y: (prev.y - corner.y) / length(corner, prev) };
    const toNext = { x: (next.x - corner.x) / length(corner, next), y: (next.y - corner.y) / length(corner, next) };
    const angle = Math.acos(Math.max(-1, Math.min(1, toPrev.x * toNext.x + toPrev.y * toNext.y)));
    // How far from the corner the curve starts: never past the middle of a side.
    const cut = Math.min(corner.r / Math.tan(angle / 2), length(corner, prev) / 2, length(corner, next) / 2);
    const start = { x: corner.x + toPrev.x * cut, y: corner.y + toPrev.y * cut };
    const end = { x: corner.x + toNext.x * cut, y: corner.y + toNext.y * cut };
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      points.push({ x: a * start.x + b * corner.x + c * end.x, y: a * start.y + b * corner.y + c * end.y });
    }
  });
  return points;
}

/** The outline of a shape on a 0-100 square, going around once. */
export function shapePoints(shape: BlockShape): Point[] {
  if (shape === "circle") {
    return Array.from({ length: CIRCLE_POINTS }, (_, i) => {
      const angle = (i / CIRCLE_POINTS) * Math.PI * 2;
      return { x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) };
    });
  }
  return roundCorners(CORNERS[shape]);
}

/** The area inside the shape, as a share of its square (a sanity check on every shape). */
export function areaShare(points: readonly Point[]): number {
  return Math.abs(signedArea(points)) / 10_000;
}

function signedArea(points: readonly Point[]): number {
  return (
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2
  );
}

/**
 * For each vertex, how far (in 0-100 units, per unit of distance) it moves so that every edge
 * moves exactly 1 unit toward the inside. Multiply by a negative distance to go outward.
 */
export function miterOffsets(points: readonly Point[]): Point[] {
  const interiorOnLeft = signedArea(points) > 0;
  const normal = (a: Point, b: Point): Point => {
    const len = length(a, b) || 1;
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    return interiorOnLeft ? { x: -dy, y: dx } : { x: dy, y: -dx };
  };
  return points.map((p, i) => {
    const n1 = normal(points[(i + points.length - 1) % points.length], p);
    const n2 = normal(p, points[(i + 1) % points.length]);
    const k = 1 + n1.x * n2.x + n1.y * n2.y;
    return k < 1e-6 ? n1 : { x: (n1.x + n2.x) / k, y: (n1.y + n2.y) / k };
  });
}

const num = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * One polygon vertex as CSS: its place on the 0-100 square, moved by `miter * distance`.
 * `distance` is a CSS length (positive moves inward). With `bleed` the box is bigger than the cell
 * by `--block-bleed` on every side (for rings drawn outside the cell), and the square is centered in it.
 */
function vertex(p: Point, miter: Point, distance: string | null, bleed: boolean): string {
  const axis = (value: number, m: number) => {
    const base = bleed ? `${num(value / 100)} * (100% - 2 * var(--block-bleed)) + var(--block-bleed)` : `${num(value)}%`;
    const move = distance !== null && Math.abs(m) > 1e-9 ? ` + ${num(m)} * ${distance}` : "";
    return move === "" && !bleed ? base : `calc(${base}${move})`;
  };
  return `${axis(p.x, miter.x)} ${axis(p.y, miter.y)}`;
}

interface Layout {
  distance: string | null;
  bleed: boolean;
}

function path(points: readonly Point[], { distance, bleed }: Layout): string[] {
  const miters = miterOffsets(points);
  return points.map((p, i) => vertex(p, miters[i], distance, bleed));
}

/** The whole shape. */
export function outerPolygon(shape: BlockShape): string {
  return `polygon(${path(shapePoints(shape), { distance: null, bleed: false }).join(", ")})`;
}

/**
 * A band of even thickness following the shape, between two distances (CSS lengths, positive
 * inward). Drawn as one polygon: around the far edge, across a seam, and back around the near edge
 * the other way, so the middle is a hole. The seam has no width.
 */
export function bandPolygon(shape: BlockShape, from: string | null, to: string, bleed = false): string {
  const points = shapePoints(shape);
  const far = path(points, { distance: from, bleed });
  const near = path(points, { distance: to, bleed });
  return `polygon(${[...far, far[0], near[0], ...near.slice(1).reverse(), near[0]].join(", ")})`;
}

/** Edge of a future or current block, just inside the shape. */
const EDGE = "var(--block-edge)";
/** The selection ring: a gap, then the ring, outside the shape. */
const HALO_INNER = "(-1 * var(--block-gap))";
const HALO_OUTER = "(-1 * (var(--block-gap) + var(--block-ring)))";
/** The keyboard cursor: one more ring outside that. */
const CURSOR_INNER = "(-1 * (var(--block-gap) + var(--block-ring) + 1px))";
const CURSOR_OUTER = "(-1 * (var(--block-gap) + 2 * var(--block-ring) + 1px))";

export interface ShapeClips {
  /** Clips the block itself: its fill, its water. */
  shape: string;
  /** The outline of a block that is not filled yet. */
  line: string;
  /** The selection ring and the "now" mark. In a box `--block-bleed` bigger than the cell. */
  halo: string;
  /** The keyboard cursor ring. Same box as `halo`. */
  cursor: string;
}

export function shapeClips(shape: BlockShape): ShapeClips {
  return {
    shape: outerPolygon(shape),
    line: bandPolygon(shape, null, EDGE),
    halo: bandPolygon(shape, HALO_OUTER, HALO_INNER, true),
    cursor: bandPolygon(shape, CURSOR_OUTER, CURSOR_INNER, true),
  };
}

/** The shared stylesheet for every shape: a few rules per shape, parsed once. */
export function blockShapeStylesheet(): string {
  return BLOCK_SHAPES.map((shape) => {
    const clips = shapeClips(shape);
    const rule = (part: keyof ShapeClips, polygon: string) =>
      `.block[data-shape="${shape}"] .block-${part}{clip-path:${polygon};-webkit-clip-path:${polygon}}`;
    return (Object.keys(clips) as (keyof ShapeClips)[]).map((part) => rule(part, clips[part])).join("\n");
  }).join("\n");
}
