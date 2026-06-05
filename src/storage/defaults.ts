import type { Settings } from '@/types';

/** Topics shipped out of the box (from the project brief). */
export const DEFAULT_TOPICS = [
  'AI',
  'Cybersecurity',
  'SOC',
  'Threat Intelligence',
  'AI Agents',
  'Startups',
  'Product Management',
  'LLMs',
  'Prompt Engineering',
];

export const DEFAULT_BLACKLIST = ['mlm', 'crypto pump', 'forex signals'];

/** Default settings record. `id` is fixed so there is exactly one row. */
export function defaultSettings(): Settings {
  return {
    id: 'settings',
    topics: [...DEFAULT_TOPICS],
    keywords: [],
    blacklistKeywords: [...DEFAULT_BLACKLIST],
    platforms: ['linkedin', 'twitter'],
    minEngagement: 0,
    maxPostAgeHours: 24 * 14, // two weeks
    relevanceThreshold: 30,
    scanScrollRounds: 25,
    scanTargetCount: 40,
    analyzerEnabled: true,
    analyzerModel: 'gemini-3-flash',
    analyzerPrompt:
      'Find posts whose angle could go viral if I publish my own take — sharp hooks, fresh or contrarian ideas on my topics, strong stories or useful how-tos. Reject ads, product launches, company announcements, hiring posts, engagement-bait, and generic motivational filler.',
    analyzerMaxResults: 5,
    writingStyle:
      'Write like an experienced practitioner sharing a hard-won insight. Clear, concrete, a little opinionated. No buzzwords, no hype.',
    defaultTone: 'professional',
    aiProvider: 'gemini',
    aiModel: 'gemini-3-flash',
    geminiApiKey: '',
    openaiApiKey: '',
    openaiBaseUrl: '',
    anthropicApiKey: '',
    anthropicBaseUrl: '',
    contentFilters: {
      politics: true,
      religion: true,
      nsfw: true,
      spam: true,
      giveaways: true,
      jobPosts: true,
    },
    inlineCommentEnabled: true,
    darkMode: false,
    updatedAt: Date.now(),
  };
}
