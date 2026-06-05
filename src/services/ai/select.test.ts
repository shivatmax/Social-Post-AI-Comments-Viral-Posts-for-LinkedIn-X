import { describe, it, expect } from 'vitest';
import { pickFromSelections } from './select';
import { makePost } from '@/test/fixtures';

const candidates = [
  makePost({ id: 'a', text: 'post A about ai agents' }),
  makePost({ id: 'b', text: 'post B about cybersecurity' }),
  makePost({ id: 'c', text: 'post C about startups' }),
];

describe('pickFromSelections', () => {
  it('maps indices to posts and attaches the analysis verdict', () => {
    const out = pickFromSelections(
      candidates,
      [{ index: 1, score: 88, reason: 'sharp take' }],
      5
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
    expect(out[0].analysis).toEqual({ score: 88, reason: 'sharp take' });
  });

  it('drops out-of-range and duplicate indices', () => {
    const out = pickFromSelections(
      candidates,
      [{ index: 0 }, { index: 9 }, { index: 0 }, { index: 2 }],
      5
    );
    expect(out.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('caps at maxResults, preserving order', () => {
    const out = pickFromSelections(
      candidates,
      [{ index: 2 }, { index: 1 }, { index: 0 }],
      2
    );
    expect(out.map((p) => p.id)).toEqual(['c', 'b']);
  });

  it('prefers viralityScore, clamps, and falls back to relevanceScore', () => {
    const out = pickFromSelections(
      candidates,
      [
        { index: 0, viralityScore: 250 },
        { index: 1, score: 72 }, // legacy `score` still accepted
        { index: 2, viralityScore: 'nope' as unknown as number },
      ],
      5
    );
    expect(out[0].analysis?.score).toBe(100); // clamped
    expect(out[1].analysis?.score).toBe(72); // fallback to `score`
    expect(out[2].analysis?.score).toBe(candidates[2].relevanceScore); // invalid → fallback
  });

  it('defaults the reason when none is given', () => {
    const out = pickFromSelections(candidates, [{ index: 0 }], 5);
    expect(out[0].analysis?.reason).toBe('High viral potential');
  });

  it('returns empty when nothing is selected', () => {
    expect(pickFromSelections(candidates, [], 5)).toEqual([]);
  });
});
