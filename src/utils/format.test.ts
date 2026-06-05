import { describe, it, expect } from 'vitest';
import { compactNumber, parseCount, truncate } from './format';

describe('format utils', () => {
  it('compactNumber abbreviates thousands/millions', () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(1500)).toBe('1.5K');
    expect(compactNumber(2_000_000)).toBe('2M');
  });

  it('parseCount reads K/M suffixes and commas', () => {
    expect(parseCount('1.2K')).toBe(1200);
    expect(parseCount('3,456')).toBe(3456);
    expect(parseCount('1.1M reactions')).toBe(1_100_000);
    expect(parseCount(null)).toBe(0);
  });

  it('truncate adds an ellipsis only when needed', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});
