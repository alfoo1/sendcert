// Suggested card colors taken from the organizer's logo: the most common
// saturated colors in its pixels (transparent, near-white and gray pixels are
// ignored). Pure function plus a small browser helper.

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Up to `max` distinct dominant colors from RGBA pixel data. */
export function dominantColors(data: Uint8ClampedArray | number[], max = 5): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    if (r > 235 && g > 235 && b > 235) continue;
    if (saturation(r, g, b) < 0.25) continue;
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .map((x) => [x.r / x.n, x.g / x.n, x.b / x.n] as const);
  const picked: (readonly [number, number, number])[] = [];
  for (const c of sorted) {
    const distinct = picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 60);
    if (distinct) picked.push(c);
    if (picked.length === max) break;
  }
  return picked.map(([r, g, b]) => toHex(r, g, b));
}

/** Browser: dominant colors of an image URL (needs CORS for remote images). */
export async function logoColors(url: string, max = 5): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    if (!url.startsWith('data:')) i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 96 / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return dominantColors(ctx.getImageData(0, 0, canvas.width, canvas.height).data, max);
}
