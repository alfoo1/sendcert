import { describe, expect, it } from 'vitest';
import { generateToken, generateUniqueTokens, isToken, TOKEN_LENGTH } from '@/lib/events/tokens';

describe('event tokens', () => {
  it('are 22-character base64url strings (128 bits)', () => {
    const token = generateToken();
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(isToken(token)).toBe(true);
    expect(Buffer.from(token, 'base64url')).toHaveLength(16);
  });

  it('do not repeat across a large sample', () => {
    const tokens = new Set(Array.from({ length: 50_000 }, generateToken));
    expect(tokens.size).toBe(50_000);
  });

  it('generateUniqueTokens never returns a taken or duplicate token', () => {
    const taken = new Set(generateUniqueTokens(500));
    const fresh = generateUniqueTokens(2_000, taken);
    expect(new Set(fresh).size).toBe(2_000);
    for (const t of fresh) expect(taken.has(t)).toBe(false);
  });

  it('rejects malformed tokens before any lookup', () => {
    for (const bad of ['', 'short', 'a'.repeat(23), 'has space in it 123456', '../../etc/passwd....', null, 42]) {
      expect(isToken(bad)).toBe(false);
    }
  });
});
