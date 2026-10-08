import { describe, expect, it } from "vitest";
import {
  BLOCK_SHAPES,
  DEFAULT_BLOCK_SHAPE,
  areaShare,
  bandPolygon,
  blockShapeStylesheet,
  miterOffsets,
  outerPolygon,
  parseBlockShape,
  shapeClips,
  shapePoints,
  type Point,
} from "./blockShape";

describe("block shapes", () => {
  it("are exactly four, with the rounded square as the default", () => {
    expect([...BLOCK_SHAPES]).toEqual(["square", "circle", "glass", "hexagon"]);
    expect(DEFAULT_BLOCK_SHAPE).toBe("square");
  });

  it("load a saved shape, and fall back to square for anything else", () => {
    for (const shape of BLOCK_SHAPES) expect(parseBlockShape(shape)).toBe(shape);
    for (const bad of [null, undefined, "", "triangle", "SQUARE", 3, {}]) expect(parseBlockShape(bad)).toBe("square");
  });

  it("stay inside the cell and fill a sensible part of it", () => {
    for (const shape of BLOCK_SHAPES) {
      const points = shapePoints(shape);
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x).toBeLessThanOrEqual(100 + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(-1e-9);
        expect(p.y).toBeLessThanOrEqual(100 + 1e-9);
      }
      expect(areaShare(points), shape).toBeGreaterThan(0.5);
      expect(areaShare(points), shape).toBeLessThanOrEqual(1);
    }
    expect(areaShare(shapePoints("circle"))).toBeCloseTo(Math.PI / 4, 2);
  });

  it("make a glass wider at the rim than at the base", () => {
    const points = shapePoints("glass");
    const widthAt = (y: number) => {
      const row = points.filter((p) => Math.abs(p.y - y) < 4);
      return Math.max(...row.map((p) => p.x)) - Math.min(...row.map((p) => p.x));
    };
    expect(widthAt(4)).toBeGreaterThan(widthAt(96) + 20);
  });

  it("make a regular hexagon with flat sides left and right", () => {
    const points = shapePoints("hexagon");
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    // A flat side is a run of points sharing one x.
    expect(points.filter((p) => Math.abs(p.x - minX) < 1e-9).length).toBeGreaterThanOrEqual(2);
    expect(points.filter((p) => Math.abs(p.x - maxX) < 1e-9).length).toBeGreaterThanOrEqual(2);
    // As wide as sqrt(3)/2 of its height, centered.
    expect(maxX - minX).toBeCloseTo((Math.sqrt(3) / 2) * 100, 6);
    expect((minX + maxX) / 2).toBeCloseTo(50, 6);
    // The tips are rounded a little, so they stop just short of the cell's top and bottom.
    expect(Math.min(...points.map((p) => p.y))).toBeLessThan(2);
    expect(Math.max(...points.map((p) => p.y))).toBeGreaterThan(98);
  });

  it("move every edge by the same distance when the outline is inset (even thickness)", () => {
    const distanceToLine = (p: Point, a: Point, b: Point) =>
      Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y);
    for (const shape of BLOCK_SHAPES) {
      const points = shapePoints(shape);
      const miters = miterOffsets(points);
      const d = 2;
      const inset = points.map((p, i) => ({ x: p.x + miters[i].x * d, y: p.y + miters[i].y * d }));
      points.forEach((a, i) => {
        const j = (i + 1) % points.length;
        for (const k of [i, j]) {
          expect(distanceToLine(inset[k], a, points[j]), `${shape} edge ${i}`).toBeCloseTo(d, 6);
        }
      });
      // And inward really is inward: the inset shape is smaller, the outset one bigger.
      expect(areaShare(inset)).toBeLessThan(areaShare(points));
      const outset = points.map((p, i) => ({ x: p.x - miters[i].x * d, y: p.y - miters[i].y * d }));
      expect(areaShare(outset)).toBeGreaterThan(areaShare(points));
    }
  });

  it("build CSS clips for every shape: the whole shape, the outline, the ring and the cursor", () => {
    for (const shape of BLOCK_SHAPES) {
      const clips = shapeClips(shape);
      for (const clip of Object.values(clips)) expect(clip).toMatch(/^polygon\(.+\)$/);
      expect(clips.shape).toBe(outerPolygon(shape));
      expect(clips.line).toContain("var(--block-edge)");
      expect(clips.halo).toContain("var(--block-ring)");
      expect(clips.halo).toContain("var(--block-bleed)");
    }
    // A band goes around the outline twice (out, then back), joined by a seam.
    const outline = shapePoints("hexagon").length;
    const vertices = bandPolygon("hexagon", null, "2px").match(/%/g)!.length / 2;
    expect(vertices).toBe(outline * 2 + 2);
  });

  it("put one rule set per shape in the shared stylesheet", () => {
    const css = blockShapeStylesheet();
    for (const shape of BLOCK_SHAPES) {
      for (const part of ["shape", "line", "halo", "cursor"]) {
        expect(css).toContain(`.block[data-shape="${shape}"] .block-${part}{`);
      }
    }
  });
});
