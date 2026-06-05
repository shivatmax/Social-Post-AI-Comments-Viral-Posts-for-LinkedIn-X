import type { Post } from '@/types';

/** One entry of the analyzer model's `selected` array (loosely typed). */
export interface RawSelection {
  index?: number | string;
  /** Virality score 0-100 (preferred). `score` accepted as a fallback. */
  viralityScore?: number | string;
  score?: number | string;
  reason?: string;
}

/**
 * Map the model's raw `selected` array onto candidate posts: validate indices,
 * drop duplicates and out-of-range entries, clamp scores, cap at maxResults.
 * Pure (types only) so it's unit-testable without a live model or storage.
 */
export function pickFromSelections(
  candidates: Post[],
  selections: RawSelection[],
  maxResults: number
): Post[] {
  const seen = new Set<number>();
  const posts: Post[] = [];
  for (const s of selections) {
    const idx = Number(s.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length || seen.has(idx)) continue;
    seen.add(idx);
    const base = candidates[idx];
    const rawScore = s.viralityScore ?? s.score;
    posts.push({
      ...base,
      analysis: {
        score: clampScore(Number(rawScore), base.relevanceScore),
        reason: String(s.reason ?? '').trim().slice(0, 240) || 'High viral potential',
      },
    });
    if (posts.length >= maxResults) break;
  }
  return posts;
}

function clampScore(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}
