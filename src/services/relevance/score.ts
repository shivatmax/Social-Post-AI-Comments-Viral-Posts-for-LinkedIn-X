import type { RawPost, ScoreBreakdown, Settings } from '@/types';
import { normalizeText } from '@/utils/hash';
import { parseRelativeAgeHours } from '@/utils/dates';

/**
 * Relevance scoring engine — produces a 0-100 score from five weighted
 * factors. The weights sum to 100:
 *
 *   topicMatch      0-40   how well the post matches the user's topics
 *   engagement      0-25   log-scaled likes/comments/reposts
 *   recency         0-20   newer is better, normalized to maxPostAge
 *   virality        0-10   discussion volume relative to likes
 *   commentActivity 0-5    raw comment depth
 *
 * Off-topic posts (when the user has topics defined but none match) are heavily
 * discounted so the feed stays on-topic.
 */

const WEIGHTS = {
  topicMatch: 40,
  engagement: 25,
  recency: 20,
  virality: 10,
  commentActivity: 5,
} as const;

export interface ScoreOutput {
  breakdown: ScoreBreakdown;
  matchedTopics: string[];
}

export function scorePost(post: RawPost, settings: Settings): ScoreOutput {
  const haystackRaw = `${post.text} ${post.author.headline ?? ''}`;
  const normalized = normalizeText(haystackRaw);
  const tokens = new Set(normalized.split(' ').filter(Boolean));

  // --- Topic match -----------------------------------------------------------
  const topicSources = [...settings.topics, ...settings.keywords];
  const matchedTopics = settings.topics.filter((t) =>
    termMatches(t, normalized, tokens)
  );
  const matchedKeywords = settings.keywords.filter((k) =>
    termMatches(k, normalized, tokens)
  );
  const distinctMatches = matchedTopics.length + matchedKeywords.length;
  const freqBonus = Math.min(
    6,
    topicSources.reduce((acc, t) => acc + occurrences(t, normalized), 0) -
      distinctMatches
  );
  const topicMatch =
    distinctMatches === 0
      ? 0
      : clamp(20 + (distinctMatches - 1) * 9 + Math.max(0, freqBonus), 0, WEIGHTS.topicMatch);

  // --- Engagement (log-scaled) ----------------------------------------------
  const { likes, comments, reposts } = post.engagement;
  const weighted = likes + comments * 2 + reposts * 1.5;
  const engagement = clamp(
    (Math.log10(1 + weighted) / Math.log10(1 + 5000)) * WEIGHTS.engagement,
    0,
    WEIGHTS.engagement
  );

  // --- Recency ---------------------------------------------------------------
  const ageHours = resolveAgeHours(post);
  const recency =
    ageHours === null
      ? WEIGHTS.recency * 0.5 // unknown age -> neutral
      : clamp(
          WEIGHTS.recency * (1 - ageHours / Math.max(1, settings.maxPostAgeHours)),
          0,
          WEIGHTS.recency
        );

  // --- Virality (discussion relative to likes) -------------------------------
  const viralityRatio = (comments + reposts) / Math.max(10, likes);
  const virality = clamp(viralityRatio * 30, 0, WEIGHTS.virality);

  // --- Comment activity ------------------------------------------------------
  const commentActivity = clamp(
    (Math.log10(1 + comments) / Math.log10(1 + 200)) * WEIGHTS.commentActivity,
    0,
    WEIGHTS.commentActivity
  );

  let total = topicMatch + engagement + recency + virality + commentActivity;

  // Discount off-topic posts when topics are configured.
  if (distinctMatches === 0 && topicSources.length > 0) {
    total = total * 0.35;
  }

  const breakdown: ScoreBreakdown = {
    topicMatch: round(topicMatch),
    engagement: round(engagement),
    recency: round(recency),
    virality: round(virality),
    commentActivity: round(commentActivity),
    total: clamp(Math.round(total), 0, 100),
  };

  return { breakdown, matchedTopics };
}

// --- helpers ---------------------------------------------------------------

/** Match a topic/keyword against the haystack with acronym-safe boundaries. */
function termMatches(term: string, normalized: string, tokens: Set<string>): boolean {
  const t = normalizeText(term);
  if (!t) return false;
  if (t.includes(' ')) return normalized.includes(t); // phrase match
  if (t.length <= 4) return tokens.has(t); // acronyms: exact token only
  return tokens.has(t) || normalized.includes(t);
}

function occurrences(term: string, normalized: string): number {
  const t = normalizeText(term);
  if (!t) return 0;
  let count = 0;
  let idx = normalized.indexOf(t);
  while (idx !== -1) {
    count++;
    idx = normalized.indexOf(t, idx + t.length);
  }
  return count;
}

function resolveAgeHours(post: RawPost): number | null {
  if (post.timestamp) {
    const ms = Date.parse(post.timestamp);
    if (!Number.isNaN(ms)) return Math.max(0, (Date.now() - ms) / 3_600_000);
  }
  return parseRelativeAgeHours(post.timestampLabel);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
