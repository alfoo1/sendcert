import { describe, expect, it } from 'vitest';
import { localizePath } from '@/lib/i18n';

describe('localizePath', () => {
  it('maps translated pages and their sub-paths', () => {
    expect(localizePath('/events/new', 'es')).toBe('/es/eventos/nuevo');
    expect(localizePath('/events/123e4567', 'es')).toBe('/es/eventos/123e4567');
    expect(localizePath('/events', 'es')).toBe('/es/eventos');
    expect(localizePath('/for-organizations', 'es')).toBe('/es/para-organizaciones');
    expect(localizePath('/blog/some-post', 'es')).toBe('/es/blog/some-post');
    expect(localizePath('/', 'es')).toBe('/es');
    expect(localizePath('/events/new', 'en')).toBe('/events/new');
  });
});
