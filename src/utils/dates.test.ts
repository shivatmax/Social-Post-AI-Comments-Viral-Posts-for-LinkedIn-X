import { describe, it, expect } from 'vitest';
import { parseRelativeAgeHours } from './dates';

describe('parseRelativeAgeHours', () => {
  it('parses compact labels', () => {
    expect(parseRelativeAgeHours('2h')).toBe(2);
    expect(parseRelativeAgeHours('30m')).toBeCloseTo(0.5, 5);
    expect(parseRelativeAgeHours('1d')).toBe(24);
    expect(parseRelativeAgeHours('1w')).toBe(168);
  });

  it('parses verbose labels', () => {
    expect(parseRelativeAgeHours('3 days ago')).toBe(72);
    expect(parseRelativeAgeHours('an hour ago')).toBe(1);
  });

  it('treats "now" as zero', () => {
    expect(parseRelativeAgeHours('just now')).toBe(0);
  });

  it('returns null for unparseable / empty input', () => {
    expect(parseRelativeAgeHours(null)).toBeNull();
    expect(parseRelativeAgeHours('whenever')).toBeNull();
  });
});
