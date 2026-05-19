import { describe, expect, it } from 'vitest';
import { dedupeSlug, slugify } from '../../slug.js';

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips diacritics', () => {
    expect(slugify('Pingüino Niño')).toBe('pinguino-nino');
  });

  it('collapses runs of non-alphanumerics', () => {
    expect(slugify('foo!!  bar??')).toBe('foo-bar');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('---foo---')).toBe('foo');
  });

  it('falls back to "piece" for empty result', () => {
    expect(slugify('!!!')).toBe('piece');
    expect(slugify('')).toBe('piece');
  });
});

describe('dedupeSlug', () => {
  it('returns base when unused', () => {
    expect(dedupeSlug('ring-1', new Set())).toBe('ring-1');
  });

  it('appends -2 on first collision', () => {
    expect(dedupeSlug('ring', new Set(['ring']))).toBe('ring-2');
  });

  it('skips taken suffixes', () => {
    expect(dedupeSlug('ring', new Set(['ring', 'ring-2', 'ring-3']))).toBe('ring-4');
  });

  it('accepts a readonly array', () => {
    expect(dedupeSlug('ring', ['ring'])).toBe('ring-2');
  });
});
