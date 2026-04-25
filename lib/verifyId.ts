// Public verification IDs are short, human-readable, and unambiguous.
// Format: CERT-YYYY-XXXX where XXXX is 4 chars from a 32-symbol alphabet.
// 32^4 ≈ 1M unique IDs per year; collisions are caught at insert time
// thanks to the UNIQUE constraint on certificates_issued.verify_id.

// Skip 0/O/1/I/L to avoid handwriting / OCR confusion.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChar(): string {
  const idx = Math.floor(Math.random() * ALPHABET.length);
  return ALPHABET[idx];
}

export function generateVerifyId(now: Date = new Date()): string {
  const year = now.getFullYear();
  const code = Array.from({ length: 4 }, randomChar).join('');
  return `CERT-${year}-${code}`;
}
