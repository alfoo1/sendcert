import { describe, expect, it } from 'vitest';
import { dominantColors } from '@/lib/shareCard/colors';
import { parseCustom } from '@/lib/eventMode/validate';

function pixels(spec: [number, number, number, number, number][]): number[] {
  const out: number[] = [];
  for (const [r, g, b, a, n] of spec) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return out;
}

describe('colors from the logo', () => {
  it('returns the main saturated colors, most common first', () => {
    const data = pixels([
      [20, 184, 166, 255, 300], // teal
      [31, 92, 53, 255, 120], // green
      [255, 255, 255, 255, 900], // white background: ignored
      [40, 40, 40, 255, 500], // dark gray text: ignored
      [200, 30, 30, 0, 400], // transparent: ignored
    ]);
    const colors = dominantColors(data);
    expect(colors).toHaveLength(2);
    expect(colors[0]).toBe('#14b8a6');
    expect(colors[1]).toBe('#1f5c35');
  });

  it('merges near-identical shades', () => {
    const data = pixels([
      [20, 184, 166, 255, 100],
      [22, 186, 168, 255, 100],
    ]);
    expect(dominantColors(data)).toHaveLength(1);
  });
});

describe('card customization input', () => {
  it('falls back to safe defaults', () => {
    expect(parseCustom(undefined)).toEqual({ layout: 'centered', showRole: true, showHashtag: true, showPartners: true });
    expect(parseCustom({ layout: 'weird', accent: 'red', tone: 'neon', headline: '   ' })).toEqual({
      layout: 'centered',
      showRole: true,
      showHashtag: true,
      showPartners: true,
    });
  });

  it('keeps valid choices and trims the label', () => {
    expect(parseCustom({ layout: 'split', accent: '#1F5C35', tone: 'dark', headline: ' See you at the summit and beyond ', showRole: false })).toEqual({
      layout: 'split',
      accent: '#1F5C35',
      tone: 'dark',
      headline: 'See you at the summit and be',
      showRole: false,
      showHashtag: true,
      showPartners: true,
    });
  });
});
