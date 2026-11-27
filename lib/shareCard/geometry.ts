// Geometry for share cards with the organizer's own background (Level 2).
// Zones are stored relative to the uploaded background (0..1), so they
// survive any output size. When the output has a different aspect ratio
// than the background, the background is drawn "contained" (whole, centered)
// and the zones follow the same transform.

export type Size = { w: number; h: number };

/** Photo circle: center relative to the background, radius relative to its width. */
export type RelCircle = { cx: number; cy: number; r: number };

/** Name/title box relative to the background. */
export type RelBox = { x: number; y: number; w: number; h: number };

export type PxCircle = { cx: number; cy: number; r: number };
export type PxBox = { x: number; y: number; w: number; h: number };

export const OUTPUT_SIZES = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1200, h: 1200 },
} as const;

export type OutputFormat = keyof typeof OUTPUT_SIZES;

/** Where the background lands inside the output (whole image, centered). */
export function containFit(bg: Size, out: Size): { scale: number; dx: number; dy: number; w: number; h: number } {
  const scale = Math.min(out.w / bg.w, out.h / bg.h);
  const w = bg.w * scale;
  const h = bg.h * scale;
  return { scale, dx: (out.w - w) / 2, dy: (out.h - h) / 2, w, h };
}

export function circleToPx(circle: RelCircle, bg: Size, out: Size): PxCircle {
  const fit = containFit(bg, out);
  return {
    cx: fit.dx + circle.cx * fit.w,
    cy: fit.dy + circle.cy * fit.h,
    r: circle.r * fit.w,
  };
}

export function boxToPx(box: RelBox, bg: Size, out: Size): PxBox {
  const fit = containFit(bg, out);
  return {
    x: fit.dx + box.x * fit.w,
    y: fit.dy + box.y * fit.h,
    w: box.w * fit.w,
    h: box.h * fit.h,
  };
}

/** Inverse of circleToPx for the editor (pixels on a displayed background → relative). */
export function circleFromPx(px: PxCircle, displayed: Size): RelCircle {
  return clampCircle({ cx: px.cx / displayed.w, cy: px.cy / displayed.h, r: px.r / displayed.w });
}

export function boxFromPx(px: PxBox, displayed: Size): RelBox {
  return clampBox({ x: px.x / displayed.w, y: px.y / displayed.h, w: px.w / displayed.w, h: px.h / displayed.h });
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Keeps a circle inside the background with a sensible size. */
export function clampCircle(c: RelCircle): RelCircle {
  const r = clamp(c.r, 0.04, 0.5);
  return { cx: clamp(c.cx, 0, 1), cy: clamp(c.cy, 0, 1), r };
}

/** Keeps a box inside the background with a sensible size. */
export function clampBox(b: RelBox): RelBox {
  const w = clamp(b.w, 0.1, 1);
  const h = clamp(b.h, 0.04, 1);
  return { x: clamp(b.x, 0, 1 - w), y: clamp(b.y, 0, 1 - h), w, h };
}

export const DEFAULT_ZONES: { photo: RelCircle; text: RelBox } = {
  photo: { cx: 0.5, cy: 0.38, r: 0.18 },
  text: { x: 0.1, y: 0.6, w: 0.8, h: 0.14 },
};
