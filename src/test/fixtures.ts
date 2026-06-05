import type { Post, RawPost, Settings } from '@/types';
import { defaultSettings } from '@/storage/defaults';

/** Build a RawPost with sensible defaults for tests. */
export function makeRawPost(overrides: Partial<RawPost> = {}): RawPost {
  return {
    url: 'https://x.com/acme/status/1',
    platform: 'twitter',
    author: { name: 'Acme', headline: 'Builder', profileUrl: null, avatarUrl: null },
    text: 'A normal post about software.',
    images: [],
    hasVideo: false,
    engagement: { likes: 10, comments: 2, reposts: 1 },
    timestamp: null,
    timestampLabel: '2h',
    ...overrides,
  } as RawPost;
}

/** Build Settings for tests, starting from defaults. */
export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(), ...overrides };
}

/** Build a persisted Post for tests. */
export function makePost(overrides: Partial<Post> = {}): Post {
  const raw = makeRawPost(overrides);
  return {
    ...raw,
    id: overrides.id ?? `id-${Math.round(raw.engagement.likes)}-${raw.text.slice(0, 8)}`,
    relevanceScore: 50,
    scoreBreakdown: {
      topicMatch: 20,
      engagement: 10,
      recency: 10,
      virality: 5,
      commentActivity: 5,
      total: 50,
    },
    matchedTopics: [],
    scannedAt: 1,
    saved: false,
    analysis: null,
    ...overrides,
  };
}
