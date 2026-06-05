import { describe, it, expect } from 'vitest';
import { fnv1a, normalizeText, postFingerprint, similarity } from './hash';

describe('hash utils', () => {
  it('fnv1a is deterministic and hex', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
    expect(fnv1a('hello')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
  });

  it('normalizeText lowercases, strips urls + punctuation, collapses spaces', () => {
    expect(normalizeText('  Hello,   WORLD!! https://x.com/a ')).toBe('hello world');
  });

  it('postFingerprint dedupes identical posts and separates different ones', () => {
    const a = postFingerprint('linkedin', 'Jane Doe', 'Shipping AI agents today!');
    const b = postFingerprint('linkedin', 'Jane Doe', 'Shipping  AI   agents today!');
    const c = postFingerprint('linkedin', 'Jane Doe', 'Completely different content.');
    expect(a).toBe(b); // whitespace-insensitive
    expect(a).not.toBe(c);
  });

  it('similarity returns 1 for identical and lower for disjoint', () => {
    expect(similarity('ai agents are great', 'ai agents are great')).toBeCloseTo(1, 5);
    expect(similarity('apple banana', 'carrot dolphin')).toBe(0);
    const partial = similarity('ai agents rock', 'ai agents stink');
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(1);
  });
});
