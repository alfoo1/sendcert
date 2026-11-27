import { randomBytes } from 'node:crypto';

// Personal links for event recipients (/e/<token>): 128 random bits,
// base64url-encoded (22 characters). Guessing a valid token is impractical,
// and the database enforces uniqueness on top.

export const TOKEN_BYTES = 16;
export const TOKEN_LENGTH = 22;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Cheap format check before touching the database. */
export function isToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

/** `count` new tokens, distinct from each other and from `taken`. */
export function generateUniqueTokens(count: number, taken: Set<string> = new Set()): string[] {
  const out: string[] = [];
  const seen = new Set(taken);
  while (out.length < count) {
    const token = generateToken();
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}
