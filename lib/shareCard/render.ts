import { boxToPx, circleToPx, containFit, type Size } from '@/lib/shareCard/geometry';
import type { TextZone } from '@/lib/eventMode/types';
import type { RelCircle } from '@/lib/shareCard/geometry';

// Draws share cards ("I'm attending" / "I attended") on a canvas, in the
// browser. Level 0 is generated from the event data in the visual family of
// the chosen certificate template; Level 2 uses the organizer's background
// and zones. The recipient's photo is drawn locally and never uploaded.

export type CardPhoto = {
  image: CanvasImageSource & { width: number; height: number };
  // Pan in fractions of the circle radius, and zoom (1 = cover the circle).
  offsetX: number;
  offsetY: number;
  zoom: number;
};

export type CardContent = {
  headline: string; // "I'M ATTENDING" / "I ATTENDED"
  eventName: string;
  dateLine: string | null; // "Dec 11, 2026 · Convention Center"
  organizer: string | null;
  hashtag: string | null;
  personName: string;
  personTitle: string | null;
  accent: string;
  style: string; // elegant | minimal | bold | academic | corporate | friendly
  footer: string; // small credit line
};

export type CardImages = {
  logo?: HTMLImageElement | null;
  partners?: HTMLImageElement[];
  background?: HTMLImageElement | null; // Level 2
};

export type CustomDesign = {
  bgSize: Size;
  zones: { photo: RelCircle; text: TextZone };
};

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src.slice(0, 60)}`));
    img.src = src;
  });
}

// ---------- color helpers ----------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, other: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

// ---------- text helpers ----------

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  family: string,
  weight: number | string,
): number {
  let size = start;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let i = 0;
  while (i < words.length && lines.length < maxLines) {
    let line = words[i++];
    while (i < words.length && ctx.measureText(`${line} ${words[i]}`).width <= maxWidth) line += ` ${words[i++]}`;
    lines.push(line);
  }
  if (i < words.length && lines.length > 0) {
    // Didn't fit: end the last line with an ellipsis.
    let last = `${lines[lines.length - 1]} ${words.slice(i).join(' ')}`;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines.map((line) => {
    let out = line;
    while (out.length > 2 && ctx.measureText(out).width > maxWidth) out = `${out.slice(0, -2)}…`;
    return out;
  });
}

function spaced(text: string): string {
  return text.split('').join(' ');
}

// ---------- shared drawing ----------

function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** The round photo, or the event logo / initials when there's no photo. */
function drawPhotoCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  photo: CardPhoto | null,
  logo: HTMLImageElement | null | undefined,
  name: string,
  fill: string,
  ink: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (photo) {
    const cover = Math.max((2 * r) / photo.image.width, (2 * r) / photo.image.height) * photo.zoom;
    const w = photo.image.width * cover;
    const h = photo.image.height * cover;
    ctx.drawImage(photo.image, cx - w / 2 + photo.offsetX * r, cy - h / 2 + photo.offsetY * r, w, h);
  } else if (logo) {
    const box = r * 1.3;
    drawContained(ctx, logo, cx - box / 2, cy - box / 2, box, box);
  } else {
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(r * 0.8)}px ${SANS}`;
    ctx.fillText(initials(name) || '★', cx, cy + r * 0.04);
  }
  ctx.restore();
}

function drawPartners(ctx: CanvasRenderingContext2D, partners: HTMLImageElement[], centerX: number, y: number, maxWidth: number, h: number) {
  if (partners.length === 0) return;
  const gap = h * 0.5;
  const slot = Math.min(h * 2.4, (maxWidth - gap * (partners.length - 1)) / partners.length);
  const total = slot * partners.length + gap * (partners.length - 1);
  let x = centerX - total / 2;
  for (const p of partners) {
    drawContained(ctx, p, x, y, slot, h);
    x += slot + gap;
  }
}

/** Where the photo circle sits on a card of this size (for drawing and dragging). */
export function photoCircle(size: Size, design: CustomDesign | null): { cx: number; cy: number; r: number } {
  if (design) return circleToPx(design.zones.photo, design.bgSize, size);
  const unit = Math.min(size.w, size.h);
  const square = size.w / size.h > 0.95;
  return { cx: size.w / 2, cy: size.h * (square ? 0.37 : 0.35), r: unit * (square ? 0.16 : 0.17) };
}

// ---------- Level 0 ----------

type Theme = {
  bg: (ctx: CanvasRenderingContext2D, s: Size, accent: string) => void;
  ink: string;
  muted: string;
  highlight: string;
  ring: string;
  font: string;
  circleFill: string;
  // Text over the top area (organizer + headline); differs when it sits on a band.
  topInk?: string;
  topHighlight?: string;
};

function theme(style: string, accent: string): Theme {
  const darkAccent = isDark(accent);
  switch (style) {
    case 'elegant': {
      const gold = '#c9a227';
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = mix(accent, '#000000', 0.25);
          ctx.fillRect(0, 0, s.w, s.h);
          const m = Math.min(s.w, s.h) * 0.035;
          ctx.strokeStyle = gold;
          ctx.lineWidth = Math.max(3, m * 0.12);
          ctx.strokeRect(m, m, s.w - 2 * m, s.h - 2 * m);
          ctx.lineWidth = Math.max(1, m * 0.04);
          ctx.strokeRect(m * 1.4, m * 1.4, s.w - 2.8 * m, s.h - 2.8 * m);
        },
        ink: '#ffffff',
        muted: 'rgba(255,255,255,0.78)',
        highlight: gold,
        ring: gold,
        font: SERIF,
        circleFill: mix(accent, '#ffffff', 0.15),
      };
    }
    case 'bold':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.fillStyle = mix(accent, '#ffffff', 0.18);
          ctx.beginPath();
          ctx.moveTo(s.w * 0.55, 0);
          ctx.lineTo(s.w, 0);
          ctx.lineTo(s.w, s.h * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = mix(accent, '#000000', 0.2);
          ctx.beginPath();
          ctx.moveTo(0, s.h * 0.7);
          ctx.lineTo(0, s.h);
          ctx.lineTo(s.w * 0.5, s.h);
          ctx.closePath();
          ctx.fill();
        },
        ink: darkAccent ? '#ffffff' : '#111827',
        muted: darkAccent ? 'rgba(255,255,255,0.8)' : 'rgba(17,24,39,0.75)',
        highlight: darkAccent ? '#fde68a' : '#111827',
        ring: '#ffffff',
        font: SANS,
        circleFill: mix(accent, '#ffffff', 0.3),
      };
    case 'academic':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = '#fbf7ef';
          ctx.fillRect(0, 0, s.w, s.h);
          const m = Math.min(s.w, s.h) * 0.03;
          ctx.strokeStyle = accent;
          ctx.lineWidth = m * 0.35;
          ctx.strokeRect(m, m, s.w - 2 * m, s.h - 2 * m);
          ctx.lineWidth = Math.max(1, m * 0.06);
          ctx.strokeRect(m * 1.6, m * 1.6, s.w - 3.2 * m, s.h - 3.2 * m);
        },
        ink: '#1f2937',
        muted: '#4b5563',
        highlight: accent,
        ring: accent,
        font: SERIF,
        circleFill: mix(accent, '#ffffff', 0.85),
      };
    case 'corporate':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, s.w, s.h * 0.3);
          ctx.fillStyle = mix(accent, '#ffffff', 0.85);
          ctx.fillRect(0, s.h * 0.965, s.w, s.h * 0.035);
        },
        ink: '#0f172a',
        muted: '#475569',
        highlight: accent,
        ring: '#ffffff',
        font: SANS,
        circleFill: mix(accent, '#ffffff', 0.8),
        topInk: isDark(accent) ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)',
        topHighlight: isDark(accent) ? '#ffffff' : '#0f172a',
      };
    case 'friendly':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = mix(accent, '#ffffff', 0.9);
          ctx.fillRect(0, 0, s.w, s.h);
          const colors = [accent, '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
          const unit = Math.min(s.w, s.h);
          const dots = [
            [0.08, 0.06, 0.018], [0.9, 0.1, 0.024], [0.14, 0.5, 0.012], [0.88, 0.46, 0.016],
            [0.06, 0.88, 0.022], [0.93, 0.84, 0.014], [0.5, 0.03, 0.01], [0.78, 0.95, 0.012],
          ];
          dots.forEach(([x, y, r], i) => {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(x * s.w, y * s.h, r * unit, 0, Math.PI * 2);
            ctx.fill();
          });
        },
        ink: '#1f2937',
        muted: '#4b5563',
        highlight: accent,
        ring: accent,
        font: SANS,
        circleFill: '#ffffff',
      };
    case 'minimal':
    default:
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, s.w, Math.max(10, s.h * 0.012));
        },
        ink: '#111827',
        muted: '#4b5563',
        highlight: accent,
        ring: accent,
        font: SANS,
        circleFill: mix(accent, '#ffffff', 0.88),
      };
  }
}

function drawLevel0(
  ctx: CanvasRenderingContext2D,
  s: Size,
  c: CardContent,
  images: CardImages,
  photo: CardPhoto | null,
) {
  const t = theme(c.style, c.accent);
  t.bg(ctx, s, c.accent);
  const unit = Math.min(s.w, s.h);
  const square = s.w / s.h > 0.95;
  const cx = s.w / 2;
  const maxText = s.w * 0.82;
  // Vertical rhythm as fractions of the height (tighter on the square card).
  const y = square
    ? { logo: 0.06, headline: 0.17, name: 0.6, title: 0.66, event: 0.74, date: 0.84, tag: 0.89, partners: 0.915 }
    : { logo: 0.06, headline: 0.16, name: 0.57, title: 0.62, event: 0.7, date: 0.8, tag: 0.85, partners: 0.88 };

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Logo or organizer name at the top.
  const logoH = unit * 0.08;
  if (images.logo) {
    drawContained(ctx, images.logo, cx - unit * 0.2, s.h * y.logo, unit * 0.4, logoH);
  } else if (c.organizer) {
    ctx.fillStyle = t.topInk ?? t.muted;
    fitFont(ctx, c.organizer.toUpperCase(), maxText, Math.round(unit * 0.03), 16, t.font, 600);
    ctx.fillText(spaced(c.organizer.toUpperCase()), cx, s.h * y.logo + logoH * 0.7);
  }

  // Headline.
  ctx.fillStyle = t.topHighlight ?? t.highlight;
  fitFont(ctx, c.headline, maxText, Math.round(unit * 0.045), 20, SANS, 800);
  ctx.fillText(spaced(c.headline), cx, s.h * y.headline + unit * 0.03);

  // Photo circle with ring.
  const { r, cy } = photoCircle(s, null);
  ctx.fillStyle = t.ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r + unit * 0.012, 0, Math.PI * 2);
  ctx.fill();
  drawPhotoCircle(ctx, cx, cy, r, photo, images.logo, c.personName, t.circleFill, t.highlight);

  // Name and title.
  ctx.fillStyle = t.ink;
  fitFont(ctx, c.personName, maxText, Math.round(unit * 0.07), 28, t.font, 700);
  ctx.fillText(c.personName, cx, s.h * y.name);
  if (c.personTitle) {
    ctx.fillStyle = t.muted;
    fitFont(ctx, c.personTitle, maxText, Math.round(unit * 0.035), 18, SANS, 400);
    ctx.fillText(c.personTitle, cx, s.h * y.title);
  }

  // Event name (up to 2 lines), date line, hashtag.
  ctx.fillStyle = t.ink;
  ctx.font = `700 ${Math.round(unit * 0.05)}px ${t.font}`;
  const lines = wrap(ctx, c.eventName, maxText, 2);
  const lineH = unit * 0.06;
  lines.forEach((line, i) => ctx.fillText(line, cx, s.h * y.event + i * lineH));
  if (c.dateLine) {
    ctx.fillStyle = t.muted;
    fitFont(ctx, c.dateLine, maxText, Math.round(unit * 0.032), 16, SANS, 500);
    ctx.fillText(c.dateLine, cx, s.h * y.date + (lines.length - 1) * lineH * 0.6);
  }
  if (c.hashtag) {
    ctx.fillStyle = t.highlight;
    fitFont(ctx, c.hashtag, maxText, Math.round(unit * 0.032), 16, SANS, 700);
    ctx.fillText(c.hashtag, cx, s.h * y.tag + (lines.length - 1) * lineH * 0.6);
  }

  // Partner logos and the small credit line.
  drawPartners(ctx, images.partners ?? [], cx, s.h * y.partners + (lines.length - 1) * lineH * 0.3, s.w * 0.84, unit * 0.05);
  ctx.fillStyle = t.muted;
  ctx.globalAlpha = 0.7;
  ctx.font = `400 ${Math.round(unit * 0.018)}px ${SANS}`;
  ctx.fillText(c.footer, cx, s.h * 0.975);
  ctx.globalAlpha = 1;
}

// ---------- Level 2 ----------

function drawCustom(
  ctx: CanvasRenderingContext2D,
  s: Size,
  c: CardContent,
  images: CardImages,
  photo: CardPhoto | null,
  design: CustomDesign,
) {
  // Fill first (visible when the output aspect differs from the background).
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, 0, s.w, s.h);
  if (images.background) {
    const fit = containFit(design.bgSize, s);
    ctx.drawImage(images.background, fit.dx, fit.dy, fit.w, fit.h);
  }
  const circle = circleToPx(design.zones.photo, design.bgSize, s);
  drawPhotoCircle(ctx, circle.cx, circle.cy, circle.r, photo, images.logo, c.personName, '#ffffff', c.accent);

  const z = design.zones.text;
  const box = boxToPx(z, design.bgSize, s);
  const family = z.font === 'serif' ? SERIF : SANS;
  ctx.fillStyle = z.color;
  ctx.textAlign = z.align;
  ctx.textBaseline = 'alphabetic';
  const x = z.align === 'left' ? box.x : z.align === 'right' ? box.x + box.w : box.x + box.w / 2;
  const hasTitle = Boolean(c.personTitle);
  const nameSize = fitFont(ctx, c.personName, box.w, Math.round(box.h * (hasTitle ? 0.55 : 0.75)), 14, family, 700);
  const nameY = box.y + (hasTitle ? box.h * 0.55 : box.h / 2 + nameSize * 0.35);
  ctx.fillText(c.personName, x, nameY);
  if (c.personTitle) {
    fitFont(ctx, c.personTitle, box.w, Math.round(box.h * 0.28), 12, family, 400);
    ctx.fillText(c.personTitle, x, box.y + box.h * 0.92);
  }
}

/** Draws the full card at the canvas's own size. */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  content: CardContent,
  images: CardImages,
  photo: CardPhoto | null,
  design: CustomDesign | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = { w: canvas.width, h: canvas.height };
  ctx.clearRect(0, 0, size.w, size.h);
  if (design) drawCustom(ctx, size, content, images, photo, design);
  else drawLevel0(ctx, size, content, images, photo);
}

/** Renders the card at a given size and returns a PNG blob (for downloads). */
export function renderShareCardBlob(
  size: Size,
  content: CardContent,
  images: CardImages,
  photo: CardPhoto | null,
  design: CustomDesign | null,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawShareCard(canvas, content, images, photo, design);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
