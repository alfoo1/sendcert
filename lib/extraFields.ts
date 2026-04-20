// Extra text overlays drawn on the certificate, alongside the recipient name.
// Each field is a free-floating piece of vector text (drawn by pdf-lib, not
// baked into the html2canvas capture) so it stays crisp at any zoom.
export type FontFamily = 'helvetica' | 'times' | 'courier';

export type ExtraField = {
  id: string;
  // `label` is only shown in the sidebar — helps the user remember what the
  // field is for (e.g. "Signature", "Date", "Course name").
  label: string;
  // `value` is the literal string drawn on the certificate. No `{{name}}`
  // substitution — these are static per-batch.
  value: string;
  x: number; // percent — center of text
  y: number;
  fontSize: number;
  color: string;
  fontFamily: FontFamily;
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Two fields present by default: signature (bottom-left) and date (bottom-right).
 * Matches the signature / date lines drawn by the built-in templates.
 */
export function defaultExtraFields(): ExtraField[] {
  return [
    {
      id: makeId(),
      label: 'Signature',
      value: 'Signature',
      x: 25,
      y: 85,
      fontSize: 22,
      color: '#1f2937',
      fontFamily: 'helvetica',
    },
    {
      id: makeId(),
      label: 'Date',
      // Locale is explicitly en-US to keep the default stable across machines.
      value: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      x: 75,
      y: 85,
      fontSize: 22,
      color: '#1f2937',
      fontFamily: 'helvetica',
    },
  ];
}

/**
 * Blank field seeded near the center — used by the "+ Add field" button.
 */
export function emptyExtraField(): ExtraField {
  return {
    id: makeId(),
    label: 'Field',
    value: '',
    x: 50,
    y: 50,
    fontSize: 20,
    color: '#1f2937',
    fontFamily: 'helvetica',
  };
}
