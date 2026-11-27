import { describe, expect, it } from 'vitest';
import { isTrustedPreviewHost } from '@/lib/siteUrl';

describe('sign-in handoff to previews', () => {
  it('accepts only this project’s Vercel preview hosts and localhost', () => {
    expect(isTrustedPreviewHost('sendcert-git-feature-event-mode-alfonso-2467s-projects.vercel.app')).toBe(true);
    expect(isTrustedPreviewHost('sendcert-avy316mle-alfonso-2467s-projects.vercel.app')).toBe(true);
    expect(isTrustedPreviewHost('localhost:3000')).toBe(true);
    expect(isTrustedPreviewHost('evil.vercel.app')).toBe(false);
    expect(isTrustedPreviewHost('sendcert-x-alfonso-2467s-projects.vercel.app.evil.com')).toBe(false);
    expect(isTrustedPreviewHost('othercert-x-alfonso-2467s-projects.vercel.app')).toBe(false);
    expect(isTrustedPreviewHost('www.sendcert.org')).toBe(false);
  });
});
