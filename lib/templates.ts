import type { Locale } from '@/lib/i18n';

// Catalog of built-in templates. Each one is drawn live by
// components/CertificateRenderer.tsx; `path` is only a server-side fallback
// image used when a request arrives without a captured template.
export type NameFont = 'helvetica' | 'times' | 'courier';

export type PresetTemplate = {
  id: string;
  name: string;
  description: string;
  path: string; // Public path served by Next
  // Default placement (in percent) and style for the recipient name, which
  // pdf-lib draws on top of the template.
  defaultX: number;
  defaultY: number;
  defaultFontSize: number;
  defaultColor: string;
  defaultFontFamily: NameFont;
};

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Navy frame with gold details. For formal programs and awards.',
    path: '/templates/template-classic.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 56,
    defaultColor: '#1e3a5f',
    defaultFontFamily: 'times',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean layout with lots of white space. Works for anything.',
    path: '/templates/template-modern.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 54,
    defaultColor: '#111827',
    defaultFontFamily: 'helvetica',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong color shapes for bootcamps, tech courses and webinars.',
    path: '/templates/template-modern.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 56,
    defaultColor: '#4f46e5',
    defaultFontFamily: 'helvetica',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Classic serif type and a seal. For schools and universities.',
    path: '/templates/template-classic.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 54,
    defaultColor: '#111827',
    defaultFontFamily: 'times',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Structured and sober for staff and compliance training.',
    path: '/templates/template-modern.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 52,
    defaultColor: '#0f172a',
    defaultFontFamily: 'helvetica',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Bright and cheerful for workshops, camps and K-12.',
    path: '/templates/template-nature.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 56,
    defaultColor: '#1f2937',
    defaultFontFamily: 'helvetica',
  },
];

// Spanish names and descriptions for the picker and the landing gallery.
// English stays in PRESET_TEMPLATES so existing callers are unchanged.
const PRESET_TEXT_ES: Record<string, { name: string; description: string }> = {
  elegant: {
    name: 'Elegante',
    description: 'Marco azul marino con detalles dorados. Para programas formales y premios.',
  },
  minimal: {
    name: 'Minimalista',
    description: 'Diseño limpio con mucho espacio en blanco. Sirve para todo.',
  },
  bold: {
    name: 'Audaz',
    description: 'Formas de color intenso para bootcamps, cursos de tecnología y webinars.',
  },
  academic: {
    name: 'Académico',
    description: 'Tipografía clásica con serifa y un sello. Para escuelas y universidades.',
  },
  corporate: {
    name: 'Corporativo',
    description: 'Estructurado y sobrio para capacitaciones de personal y cumplimiento.',
  },
  friendly: {
    name: 'Amigable',
    description: 'Colorido y alegre para talleres, campamentos y escuelas.',
  },
};

export function presetName(id: string, locale: Locale): string {
  const preset = PRESET_TEMPLATES.find((p) => p.id === id);
  if (locale === 'es' && PRESET_TEXT_ES[id]) return PRESET_TEXT_ES[id].name;
  return preset?.name ?? id;
}

export function presetDescription(id: string, locale: Locale): string {
  const preset = PRESET_TEMPLATES.find((p) => p.id === id);
  if (locale === 'es' && PRESET_TEXT_ES[id]) return PRESET_TEXT_ES[id].description;
  return preset?.description ?? '';
}
