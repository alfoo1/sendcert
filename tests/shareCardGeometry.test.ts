import { describe, expect, it } from 'vitest';
import {
  boxFromPx,
  boxToPx,
  circleFromPx,
  circleToPx,
  clampBox,
  containFit,
  OUTPUT_SIZES,
} from '@/lib/shareCard/geometry';

const portrait = OUTPUT_SIZES.portrait; // 1080x1350
const square = OUTPUT_SIZES.square; // 1200x1200

describe('zone scaling between sizes', () => {
  it('maps 1:1 when the output matches the background', () => {
    const c = circleToPx({ cx: 0.5, cy: 0.4, r: 0.2 }, portrait, portrait);
    expect(c).toEqual({ cx: 540, cy: 540, r: 216 });
    const b = boxToPx({ x: 0.1, y: 0.6, w: 0.8, h: 0.1 }, portrait, portrait);
    expect(b.x).toBeCloseTo(108);
    expect(b.y).toBeCloseTo(810);
    expect(b.w).toBeCloseTo(864);
    expect(b.h).toBeCloseTo(135);
  });

  it('scales uniformly to a larger output of the same aspect ratio', () => {
    const c = circleToPx({ cx: 0.5, cy: 0.5, r: 0.25 }, { w: 1080, h: 1350 }, { w: 2160, h: 2700 });
    expect(c).toEqual({ cx: 1080, cy: 1350, r: 540 });
  });

  it('a portrait background inside a square output is centered horizontally', () => {
    const fit = containFit(portrait, square);
    expect(fit.h).toBeCloseTo(1200);
    expect(fit.w).toBeCloseTo(960);
    expect(fit.dx).toBeCloseTo(120);
    expect(fit.dy).toBeCloseTo(0);
    // Center of the background stays the center of the output.
    const c = circleToPx({ cx: 0.5, cy: 0.5, r: 0.1 }, portrait, square);
    expect(c.cx).toBeCloseTo(600);
    expect(c.cy).toBeCloseTo(600);
    expect(c.r).toBeCloseTo(96);
  });

  it('a square background inside a portrait output is centered vertically', () => {
    const b = boxToPx({ x: 0, y: 0, w: 1, h: 1 }, square, portrait);
    expect(b.x).toBeCloseTo(0);
    expect(b.w).toBeCloseTo(1080);
    expect(b.h).toBeCloseTo(1080);
    expect(b.y).toBeCloseTo(135);
  });

  it('round-trips from the editor (displayed pixels) to stored relative zones', () => {
    const displayed = { w: 360, h: 450 };
    const rel = circleFromPx({ cx: 180, cy: 150, r: 60 }, displayed);
    expect(rel).toEqual({ cx: 0.5, cy: 1 / 3, r: 60 / 360 });
    const px = circleToPx(rel, portrait, portrait);
    expect(px.cx).toBeCloseTo(540);
    expect(px.cy).toBeCloseTo(450);
    expect(px.r).toBeCloseTo(180);

    const box = boxFromPx({ x: 36, y: 270, w: 288, h: 45 }, displayed);
    const back = boxToPx(box, portrait, portrait);
    expect(back.x).toBeCloseTo(108);
    expect(back.y).toBeCloseTo(810);
  });

  it('keeps boxes inside the background', () => {
    expect(clampBox({ x: 0.9, y: 0.95, w: 0.5, h: 0.2 })).toEqual({ x: 0.5, y: 0.8, w: 0.5, h: 0.2 });
  });
});
