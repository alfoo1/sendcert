import { randomInt } from 'node:crypto';

// Public verification IDs: CERT-YYYY-XXXX-XXXX, with 8 cryptographically
// random characters (31^8 ≈ 850 billion combinations per year). Guessing a
// valid ID is impractical, so verification pages can't be enumerated.
// Older IDs (CERT-YYYY-XXXX) keep working; lookups are by exact string.

// Skip 0/O/1/I/L to avoid handwriting / OCR confusion.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomBlock(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function generateVerifyId(now: Date = new Date()): string {
  return `CERT-${now.getFullYear()}-${randomBlock(4)}-${randomBlock(4)}`;
}
