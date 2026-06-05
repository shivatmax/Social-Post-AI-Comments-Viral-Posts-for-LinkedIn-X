import type { ContentFilterKey, RawPost, Settings } from '@/types';
import { normalizeText } from '@/utils/hash';

/**
 * Content filtering: blacklist keywords + category filters (politics, religion,
 * NSFW, spam, giveaways, job posts). Returns the reason a post was rejected, or
 * null if it passes.
 */

/** Keyword signatures per filterable category. Intentionally conservative. */
const CATEGORY_SIGNATURES: Record<ContentFilterKey, RegExp[]> = {
  politics: [
    /\b(election|senator|congress|parliament|democrat|republican|left[- ]?wing|right[- ]?wing|geopolit|president\b)/i,
  ],
  religion: [/\b(bible|quran|qur'an|gospel|church|mosque|temple|pray for|blessed by god|jesus|allah)\b/i],
  nsfw: [/\b(nsfw|onlyfans|porn|nude|xxx|escort|sexcam)\b/i],
  spam: [
    /\b(click the link in bio|dm me to|limited time offer|act now|make \$\d|earn \$\d+\/day|work from home guaranteed|100% free)\b/i,
    /(💰{2,}|🔥{3,})/u,
  ],
  giveaways: [/\b(giveaway|tag \d+ friends|retweet to win|like and share to win|free iphone|enter to win)\b/i],
  jobPosts: [
    /\b(we'?re hiring|now hiring|apply now|job opening|open position|send your (cv|resume)|#hiring|career opportunity)\b/i,
  ],
};

export interface FilterResult {
  rejected: boolean;
  reason: string | null;
}

export function applyFilters(post: RawPost, settings: Settings): FilterResult {
  const haystackRaw = `${post.text} ${post.author.name} ${post.author.headline ?? ''}`;
  const haystack = haystackRaw.toLowerCase();
  const normalized = normalizeText(haystackRaw);

  // 1. Blacklist keywords (user-defined, hard reject).
  for (const kw of settings.blacklistKeywords) {
    const k = normalizeText(kw);
    if (k && normalized.includes(k)) {
      return { rejected: true, reason: `blacklist: "${kw}"` };
    }
  }

  // 2. Minimum engagement gate.
  const totalEngagement =
    post.engagement.likes + post.engagement.comments + post.engagement.reposts;
  if (totalEngagement < settings.minEngagement) {
    return { rejected: true, reason: `below min engagement (${totalEngagement})` };
  }

  // 3. Category filters that are switched on.
  for (const [key, enabled] of Object.entries(settings.contentFilters) as [
    ContentFilterKey,
    boolean,
  ][]) {
    if (!enabled) continue;
    if (CATEGORY_SIGNATURES[key]?.some((re) => re.test(haystack))) {
      return { rejected: true, reason: `filtered category: ${key}` };
    }
  }

  return { rejected: false, reason: null };
}
