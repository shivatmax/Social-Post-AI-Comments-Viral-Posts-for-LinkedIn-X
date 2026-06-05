import { describe, it, expect } from 'vitest';
import { parseJsonObject, toStringArray } from './parse';
import { AIError } from './provider';

describe('parseJsonObject', () => {
  it('parses plain JSON', () => {
    expect(parseJsonObject<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips ```json fences', () => {
    const raw = '```json\n{"hashtags":["ai","llm"]}\n```';
    expect(parseJsonObject<{ hashtags: string[] }>(raw)).toEqual({
      hashtags: ['ai', 'llm'],
    });
  });

  it('recovers a JSON object embedded in prose', () => {
    const raw = 'Sure! Here you go:\n{"ok":true}\nHope that helps.';
    expect(parseJsonObject<{ ok: boolean }>(raw)).toEqual({ ok: true });
  });

  it('throws AIError on non-JSON', () => {
    expect(() => parseJsonObject('not json at all')).toThrow(AIError);
  });
});

describe('toStringArray', () => {
  it('coerces arrays, strings, and junk', () => {
    expect(toStringArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(toStringArray('single')).toEqual(['single']);
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(42)).toEqual([]);
  });
});
