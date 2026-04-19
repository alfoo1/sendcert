// Catalog of pre-designed templates bundled with the app.
// The matching assets live in /public/templates/.
export type PresetTemplate = {
  id: string;
  name: string;
  description: string;
  path: string; // Public path served by Next
  // Default coordinates (in percent) where the recipient name is placed
  defaultX: number;
  defaultY: number;
  defaultFontSize: number;
  defaultColor: string;
};

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Elegant frame with serif typography. Great for formal courses.',
    path: '/templates/template-classic.svg',
    defaultX: 50,
    defaultY: 52,
    defaultFontSize: 48,
    defaultColor: '#1f2937',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimalist design with color accents. For online courses and bootcamps.',
    path: '/templates/template-modern.svg',
    defaultX: 50,
    defaultY: 48,
    defaultFontSize: 44,
    defaultColor: '#4f46e5',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Warm tones and leaf ornaments. Perfect for workshops and trainings.',
    path: '/templates/template-nature.svg',
    defaultX: 50,
    defaultY: 50,
    defaultFontSize: 42,
    defaultColor: '#065f46',
  },
];
