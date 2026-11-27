import { boxToPx, circleToPx, containFit, type Size } from '@/lib/shareCard/geometry';
import type { CardLayout, TextZone } from '@/lib/eventMode/types';
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
  dateLine: string | null; // "Dec 11, 2026 · 9:00 AM EST"
  placeLine?: string | null; // "Walter E. Washington Convention Center"
  organizer: string | null;
  hashtag: string | null;
  personName: string;
  personTitle: string | null;
  accent: string;
  style: string; // elegant | minimal | bold | academic | corporate | friendly
  footer: string; // small credit line
  // Level 1 options (customized automatic card).
  layout?: CardLayout;
  tone?: 'light' | 'dark';
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

/** Same as mix() but returns #rrggbb (for contrast checks). */
function mixHex(hex: string, other: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
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

type LayoutSpec = {
  logoY: number;
  logoH: number;
  // Photo circle: center as fractions of width/height, radius of min(w, h).
  photo: { cx: number; cy: number; r: number } | null;
  // Where the "I'M ATTENDING" label goes: on the photo, as a pill above the
  // name, or as big text (no photo).
  label: 'photo' | 'top' | 'text';
  labelY: number;
  align: 'center' | 'left';
  textX: number; // column start (left) or center (0.5)
  textW: number;
  nameY: number;
  titleY: number;
  dividerY: number;
  nameScale: number;
  band: number;
};

/** Fixed positions for each layout, so every option looks right in both sizes. */
function level0Layout(size: Size, layout: CardLayout = 'centered'): LayoutSpec {
  const square = size.w / size.h > 0.95;
  const base = square
    ? { logoY: 0.045, logoH: 0.085, band: 0.85 }
    : { logoY: 0.04, logoH: 0.075, band: 0.86 };
  switch (layout) {
    case 'split':
      return square
        ? { ...base, photo: { cx: 0.27, cy: 0.36, r: 0.15 }, label: 'top', labelY: 0.235, align: 'left', textX: 0.5, textW: 0.44, nameY: 0.35, titleY: 0.395, dividerY: 0.43, nameScale: 0.8 }
        : { ...base, photo: { cx: 0.29, cy: 0.36, r: 0.17 }, label: 'top', labelY: 0.255, align: 'left', textX: 0.53, textW: 0.41, nameY: 0.35, titleY: 0.39, dividerY: 0.425, nameScale: 0.8 };
    case 'hero':
      return square
        ? { ...base, photo: { cx: 0.5, cy: 0.33, r: 0.165 }, label: 'photo', labelY: 0, align: 'center', textX: 0.5, textW: 0.8, nameY: 0.615, titleY: 0.652, dividerY: 0.68, nameScale: 1.05 }
        : { ...base, photo: { cx: 0.5, cy: 0.325, r: 0.235 }, label: 'photo', labelY: 0, align: 'center', textX: 0.5, textW: 0.8, nameY: 0.655, titleY: 0.69, dividerY: 0.718, nameScale: 1.1 };
    case 'minimal':
      return square
        ? { ...base, photo: null, label: 'text', labelY: 0.28, align: 'center', textX: 0.5, textW: 0.84, nameY: 0.43, titleY: 0.48, dividerY: 0.515, nameScale: 1.25 }
        : { ...base, photo: null, label: 'text', labelY: 0.27, align: 'center', textX: 0.5, textW: 0.84, nameY: 0.415, titleY: 0.46, dividerY: 0.495, nameScale: 1.3 };
    case 'centered':
    default:
      return square
        ? { ...base, photo: { cx: 0.5, cy: 0.3, r: 0.13 }, label: 'photo', labelY: 0, align: 'center', textX: 0.5, textW: 0.8, nameY: 0.565, titleY: 0.605, dividerY: 0.635, nameScale: 1 }
        : { ...base, photo: { cx: 0.5, cy: 0.295, r: 0.155 }, label: 'photo', labelY: 0, align: 'center', textX: 0.5, textW: 0.8, nameY: 0.535, titleY: 0.572, dividerY: 0.602, nameScale: 1 };
  }
}

/** Where the photo circle sits (for drawing and dragging); null when the layout has no photo. */
export function photoCircle(
  size: Size,
  design: CustomDesign | null,
  layout: CardLayout = 'centered',
): { cx: number; cy: number; r: number } | null {
  if (design) return circleToPx(design.zones.photo, design.bgSize, size);
  const unit = Math.min(size.w, size.h);
  const p = level0Layout(size, layout).photo;
  return p ? { cx: size.w * p.cx, cy: size.h * p.cy, r: unit * p.r } : null;
}

export function layoutHasPhoto(layout: CardLayout | undefined): boolean {
  return layout !== 'minimal';
}

// ---------- Level 0 ----------

type Theme = {
  // Background; `frame` is drawn last, on top of everything.
  bg: (ctx: CanvasRenderingContext2D, s: Size) => void;
  frame?: (ctx: CanvasRenderingContext2D, s: Size) => void;
  ink: string;
  muted: string;
  highlight: string;
  ring: string;
  font: string;
  band: string;
  bandInk: string;
  bandMuted: string;
  pillBg: string;
  pillInk: string;
  // Logos are made for light backgrounds: show them on a white plate when the top is dark.
  logoPlate: boolean;
};

function onColor(hex: string): { ink: string; muted: string } {
  return isDark(hex)
    ? { ink: '#ffffff', muted: 'rgba(255,255,255,0.78)' }
    : { ink: '#111827', muted: 'rgba(17,24,39,0.7)' };
}

function theme(style: string, accent: string): Theme {
  const onAccent = onColor(accent);
  switch (style) {
    case 'elegant': {
      const gold = '#d4af37';
      const dark = mix(accent, '#000000', 0.35);
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = dark;
          ctx.fillRect(0, 0, s.w, s.h);
        },
        frame: (ctx, s) => {
          const m = Math.min(s.w, s.h) * 0.03;
          ctx.strokeStyle = gold;
          ctx.lineWidth = Math.max(3, m * 0.14);
          ctx.strokeRect(m, m, s.w - 2 * m, s.h - 2 * m);
          ctx.lineWidth = Math.max(1, m * 0.05);
          ctx.strokeRect(m * 1.45, m * 1.45, s.w - 2.9 * m, s.h - 2.9 * m);
        },
        ink: '#ffffff',
        muted: 'rgba(255,255,255,0.78)',
        highlight: gold,
        ring: gold,
        font: SERIF,
        band: mix(accent, '#000000', 0.55),
        bandInk: '#ffffff',
        bandMuted: 'rgba(255,255,255,0.75)',
        pillBg: gold,
        pillInk: '#1f2937',
        logoPlate: true,
      };
    }
    case 'bold':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.fillStyle = mix(accent, '#ffffff', 0.16);
          ctx.beginPath();
          ctx.moveTo(s.w * 0.58, 0);
          ctx.lineTo(s.w, 0);
          ctx.lineTo(s.w, s.h * 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = mix(accent, '#000000', 0.18);
          ctx.beginPath();
          ctx.moveTo(0, s.h * 0.48);
          ctx.lineTo(0, s.h * 0.86);
          ctx.lineTo(s.w * 0.32, s.h * 0.86);
          ctx.closePath();
          ctx.fill();
        },
        ink: onAccent.ink,
        muted: onAccent.muted,
        highlight: isDark(accent) ? '#fde68a' : '#111827',
        ring: '#ffffff',
        font: SANS,
        band: mix(accent, '#000000', 0.35),
        bandInk: '#ffffff',
        bandMuted: 'rgba(255,255,255,0.78)',
        pillBg: '#ffffff',
        pillInk: mix(accent, '#000000', 0.2),
        logoPlate: true,
      };
    case 'academic':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = '#fbf7ef';
          ctx.fillRect(0, 0, s.w, s.h);
        },
        frame: (ctx, s) => {
          const m = Math.min(s.w, s.h) * 0.028;
          ctx.strokeStyle = accent;
          ctx.lineWidth = m * 0.32;
          ctx.strokeRect(m, m, s.w - 2 * m, s.h - 2 * m);
        },
        ink: '#1f2937',
        muted: '#4b5563',
        highlight: accent,
        ring: accent,
        font: SERIF,
        band: accent,
        bandInk: onAccent.ink,
        bandMuted: onAccent.muted,
        pillBg: accent,
        pillInk: onAccent.ink,
        logoPlate: false,
      };
    case 'corporate':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, s.w, s.h * 0.27);
        },
        ink: '#0f172a',
        muted: '#475569',
        highlight: accent,
        ring: '#ffffff',
        font: SANS,
        band: mixHex(accent, '#000000', 0.15),
        bandInk: onColor(mixHex(accent, '#000000', 0.15)).ink,
        bandMuted: onColor(mixHex(accent, '#000000', 0.15)).muted,
        pillBg: accent,
        pillInk: onAccent.ink,
        logoPlate: true,
      };
    case 'friendly':
      return {
        bg: (ctx, s) => {
          ctx.fillStyle = mix(accent, '#ffffff', 0.9);
          ctx.fillRect(0, 0, s.w, s.h);
          const colors = [accent, '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
          const unit = Math.min(s.w, s.h);
          const dots = [
            [0.07, 0.05, 0.018], [0.92, 0.09, 0.024], [0.1, 0.42, 0.012], [0.9, 0.4, 0.016],
            [0.05, 0.7, 0.02], [0.95, 0.74, 0.013], [0.5, 0.025, 0.01], [0.82, 0.58, 0.01],
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
        band: accent,
        bandInk: onAccent.ink,
        bandMuted: onAccent.muted,
        pillBg: accent,
        pillInk: onAccent.ink,
        logoPlate: false,
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
        band: accent,
        bandInk: onAccent.ink,
        bandMuted: onAccent.muted,
        pillBg: accent,
        pillInk: onAccent.ink,
        logoPlate: false,
      };
  }
}

const DARK_STYLES = ['elegant', 'bold'];

/** Light or dark background on top of a style, keeping its accents readable. */
function applyTone(t: Theme, style: string, accent: string, tone: 'light' | 'dark' | undefined): Theme {
  if (!tone) return t;
  const isDarkStyle = DARK_STYLES.includes(style);
  if (tone === 'dark' && !isDarkStyle) {
    const bg = mixHex(accent, '#000000', 0.45);
    const light = mixHex(accent, '#ffffff', 0.55);
    return {
      ...t,
      bg: (ctx, s) => {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, s.w, s.h);
      },
      frame: undefined,
      ink: '#ffffff',
      muted: 'rgba(255,255,255,0.78)',
      highlight: light,
      ring: light,
      band: mixHex(accent, '#000000', 0.65),
      bandInk: '#ffffff',
      bandMuted: 'rgba(255,255,255,0.75)',
      pillBg: '#ffffff',
      pillInk: bg,
      logoPlate: true,
    };
  }
  if (tone === 'light' && isDarkStyle) {
    const onAccent = onColor(accent);
    return {
      ...t,
      bg: (ctx, s) => {
        ctx.fillStyle = style === 'elegant' ? '#fbf8f1' : '#ffffff';
        ctx.fillRect(0, 0, s.w, s.h);
      },
      ink: '#111827',
      muted: '#4b5563',
      highlight: isDark(accent) ? accent : mixHex(accent, '#000000', 0.4),
      ring: style === 'elegant' ? t.ring : accent,
      band: accent,
      bandInk: onAccent.ink,
      bandMuted: onAccent.muted,
      pillBg: style === 'elegant' ? t.pillBg : accent,
      pillInk: style === 'elegant' ? t.pillInk : onAccent.ink,
      logoPlate: false,
    };
  }
  return t;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Event name in up to 2 lines, as large as fits. */
function fitEventName(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, unit: number, font: string, max = unit * 0.076) {
  let size = Math.round(max);
  let lines: string[] = [];
  while (size > Math.round(unit * 0.04)) {
    ctx.font = `700 ${size}px ${font}`;
    lines = wrap(ctx, text, maxWidth, 2);
    const overflow = lines.some((l) => l.endsWith('…'));
    if (!overflow) break;
    size -= 2;
  }
  ctx.font = `700 ${size}px ${font}`;
  return { lines, size };
}

/** The "I'M ATTENDING" pill, centered on x or starting at x. */
function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'center' | 'left',
  unit: number,
  maxW: number,
  t: Theme,
) {
  const pillH = unit * 0.06;
  ctx.font = `800 ${Math.round(pillH * 0.45)}px ${SANS}`;
  const label = spaced(text);
  const pillW = Math.min(maxW, ctx.measureText(label).width + pillH * 1.2);
  const left = align === 'center' ? x - pillW / 2 : x;
  ctx.fillStyle = t.pillBg;
  roundRect(ctx, left, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = t.pillInk;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + pillW / 2, y + pillH / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawLevel0(
  ctx: CanvasRenderingContext2D,
  s: Size,
  c: CardContent,
  images: CardImages,
  photo: CardPhoto | null,
) {
  const t = applyTone(theme(c.style, c.accent), c.style, c.accent, c.tone);
  const L = level0Layout(s, c.layout);
  const unit = Math.min(s.w, s.h);
  const cx = s.w / 2;
  const maxText = s.w * 0.8;
  t.bg(ctx, s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Top: logo (on a white plate when the top is dark), or the organizer's name.
  const logoTop = s.h * L.logoY;
  const logoH = s.h * L.logoH;
  if (images.logo) {
    const maxW = unit * 0.46;
    const scale = Math.min(maxW / images.logo.width, (logoH * 0.7) / images.logo.height);
    const w = images.logo.width * scale;
    const h = images.logo.height * scale;
    if (t.logoPlate) {
      const plateW = w + logoH * 0.7;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cx - plateW / 2, logoTop, plateW, logoH, logoH * 0.22);
      ctx.fill();
    }
    ctx.drawImage(images.logo, cx - w / 2, logoTop + (logoH - h) / 2, w, h);
  } else if (c.organizer) {
    ctx.fillStyle = t.logoPlate ? '#ffffff' : t.muted;
    fitFont(ctx, c.organizer.toUpperCase(), maxText, Math.round(unit * 0.032), 16, SANS, 700);
    ctx.fillText(spaced(c.organizer.toUpperCase()), cx, logoTop + logoH * 0.65);
  }

  // Photo circle with ring; without a photo, the person's initials.
  let photoBottom = 0;
  if (L.photo) {
    const pcx = s.w * L.photo.cx;
    const pcy = s.h * L.photo.cy;
    const r = unit * L.photo.r;
    const ringW = unit * 0.012;
    ctx.fillStyle = t.ring;
    ctx.beginPath();
    ctx.arc(pcx, pcy, r + ringW, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(pcx, pcy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pcx - r, pcy - r, 2 * r, 2 * r);
    if (photo) {
      const cover = Math.max((2 * r) / photo.image.width, (2 * r) / photo.image.height) * photo.zoom;
      const w = photo.image.width * cover;
      const h = photo.image.height * cover;
      ctx.drawImage(photo.image, pcx - w / 2 + photo.offsetX * r, pcy - h / 2 + photo.offsetY * r, w, h);
    } else {
      // Initials need contrast on the white circle: light highlights use a darker accent.
      ctx.fillStyle = t.highlight.startsWith('#') && isDark(t.highlight) ? t.highlight : mix(c.accent, '#000000', isDark(c.accent) ? 0.1 : 0.45);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(r * 0.75)}px ${SANS}`;
      ctx.fillText(initials(c.personName) || '★', pcx, pcy + r * 0.04);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    photoBottom = pcy + r + ringW;
    if (L.label === 'photo') {
      drawPill(ctx, c.headline, pcx, photoBottom - unit * 0.06 * 0.55, 'center', unit, maxText, t);
      photoBottom += unit * 0.03;
    }
  }

  // Name column (centered, or to the right of the photo).
  const colX = L.align === 'left' ? s.w * L.textX : cx;
  const colW = s.w * L.textW;
  if (L.label === 'top') {
    drawPill(ctx, c.headline, colX, s.h * L.labelY, L.align, unit, colW, t);
  } else if (L.label === 'text') {
    ctx.fillStyle = t.highlight;
    ctx.textAlign = 'center';
    fitFont(ctx, spaced(c.headline), colW, Math.round(unit * 0.07), 22, SANS, 800);
    ctx.fillText(spaced(c.headline), cx, s.h * L.labelY);
  }

  ctx.textAlign = L.align;
  ctx.fillStyle = t.ink;
  const nameStart = Math.round(unit * 0.074 * L.nameScale);
  if (L.align === 'left') {
    // Narrow column: up to 2 lines.
    let size = nameStart;
    let lines: string[] = [];
    while (size > 26) {
      ctx.font = `700 ${size}px ${t.font}`;
      lines = wrap(ctx, c.personName, colW, 2);
      if (!lines.some((l) => l.endsWith('…'))) break;
      size -= 2;
    }
    const lh = size * 1.08;
    lines.forEach((line, i) => ctx.fillText(line, colX, s.h * L.nameY + (i - (lines.length - 1)) * lh));
  } else {
    fitFont(ctx, c.personName, colW, nameStart, 28, t.font, 700);
    ctx.fillText(c.personName, colX, s.h * L.nameY);
  }
  if (c.personTitle) {
    ctx.fillStyle = t.muted;
    fitFont(ctx, c.personTitle, colW, Math.round(unit * 0.033), 16, SANS, 500);
    ctx.fillText(c.personTitle, colX, s.h * L.titleY);
  }
  ctx.fillStyle = t.highlight;
  const divW = unit * 0.1;
  ctx.fillRect(L.align === 'left' ? colX : cx - divW / 2, s.h * L.dividerY, divW, Math.max(3, unit * 0.004));
  ctx.textAlign = 'center';

  // Lower block (event name, hashtag, partner logos), centered between what's
  // above and the bottom band; shrinks to fit.
  const bandTop = s.h * L.band;
  const areaTop = Math.max(s.h * L.dividerY + unit * 0.02, photoBottom + unit * 0.02);
  const available = bandTop - areaTop;
  const partners = images.partners ?? [];
  const tagH = c.hashtag ? unit * 0.05 : 0;
  const gap = unit * 0.022;
  let maxName = unit * 0.076;
  let partnersH = partners.length > 0 ? unit * 0.09 : 0;
  let name = fitEventName(ctx, c.eventName, maxText, unit, t.font, maxName);
  let lineH = name.size * 1.15;
  const measure = () => name.lines.length * lineH + tagH + (partnersH ? partnersH + gap * 2 : 0);
  while (measure() > available && (maxName > unit * 0.044 || partnersH > unit * 0.06)) {
    if (maxName > unit * 0.044) maxName -= unit * 0.004;
    else partnersH = Math.max(unit * 0.06, partnersH - unit * 0.005);
    name = fitEventName(ctx, c.eventName, maxText, unit, t.font, maxName);
    lineH = name.size * 1.15;
  }
  let y = areaTop + Math.max(0, (available - measure()) / 2);
  ctx.fillStyle = t.ink;
  ctx.font = `700 ${name.size}px ${t.font}`;
  for (const line of name.lines) {
    y += lineH;
    ctx.fillText(line, cx, y - lineH * 0.2);
  }
  if (c.hashtag) {
    ctx.fillStyle = t.highlight;
    fitFont(ctx, c.hashtag, maxText, Math.round(unit * 0.034), 16, SANS, 700);
    y += tagH;
    ctx.fillText(c.hashtag, cx, y - tagH * 0.25);
  }
  if (partnersH) {
    y += gap;
    const stripW = s.w * 0.84;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, cx - stripW / 2, y, stripW, partnersH, partnersH * 0.2);
    ctx.fill();
    drawPartners(ctx, partners, cx, y + partnersH * 0.2, stripW * 0.9, partnersH * 0.6);
  }

  // Bottom band: date, time and place.
  ctx.fillStyle = t.band;
  ctx.fillRect(0, bandTop, s.w, s.h - bandTop);
  const bandH = s.h - bandTop;
  const place = c.placeLine ?? null;
  if (c.dateLine) {
    ctx.fillStyle = t.bandInk;
    fitFont(ctx, c.dateLine, maxText, Math.round(unit * 0.04), 18, SANS, 700);
    ctx.fillText(c.dateLine, cx, bandTop + bandH * (place ? 0.42 : 0.58));
  }
  if (place) {
    ctx.fillStyle = t.bandMuted;
    fitFont(ctx, place, maxText, Math.round(unit * 0.03), 16, SANS, 500);
    ctx.fillText(place, cx, bandTop + bandH * (c.dateLine ? 0.72 : 0.58));
  }
  ctx.fillStyle = t.bandMuted;
  ctx.globalAlpha = 0.6;
  ctx.font = `400 ${Math.round(unit * 0.016)}px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(c.footer, s.w - unit * 0.05, s.h - unit * 0.022);
  ctx.textAlign = 'center';
  ctx.globalAlpha = 1;

  t.frame?.(ctx, s);
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
