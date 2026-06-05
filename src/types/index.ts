/**
 * Shared domain types for the whole extension.
 *
 * These are the contract between the content scripts (which produce raw posts),
 * the storage layer (Dexie), the relevance engine, the AI provider, and the
 * React side panel. Keep them framework-agnostic.
 */

export type Platform = 'linkedin' | 'twitter';

/** The raw shape a content script returns for a single scraped post. */
export interface RawPost {
  /** Permalink to the post, if we could resolve one. */
  url: string | null;
  platform: Platform;
  author: {
    name: string;
    headline: string | null;
    profileUrl: string | null;
    avatarUrl: string | null;
  };
  text: string;
  images: string[];
  hasVideo: boolean;
  engagement: {
    likes: number;
    comments: number;
    reposts: number;
  };
  /** ISO string when known; otherwise the human label we scraped ("2h", "1d"). */
  timestamp: string | null;
  timestampLabel: string | null;
  /** Trimmed outerHTML snapshot, kept for debugging extraction. */
  rawHtml: string;
}

/** The AI analyzer's verdict for a post that made it into the feed. */
export interface AnalysisVerdict {
  /** 0-100 fit for the user's use case, as judged by the analyzer model. */
  score: number;
  reason: string;
}

/** A post after scoring + persistence. */
export interface Post extends RawPost {
  /** Stable content hash — primary key, also used for duplicate detection. */
  id: string;
  relevanceScore: number;
  /** Per-factor breakdown so the UI can explain the score. */
  scoreBreakdown: ScoreBreakdown;
  matchedTopics: string[];
  /** Epoch ms when we saved it. */
  scannedAt: number;
  saved: boolean;
  /** Present when the post was hand-picked by the AI analyzer. */
  analysis?: AnalysisVerdict | null;
}

export interface ScoreBreakdown {
  topicMatch: number;
  engagement: number;
  recency: number;
  virality: number;
  commentActivity: number;
  total: number;
}

export interface Topic {
  id?: number;
  name: string;
  /** Optional extra keywords that count toward this topic. */
  keywords: string[];
  createdAt: number;
}

export type GenerationTone =
  | 'professional'
  | 'casual'
  | 'bold'
  | 'analytical'
  | 'storyteller'
  | 'witty';

/** Structured AI output for a generated post bundle. */
export interface GenerationResult {
  linkedinPost: string;
  twitterPost: string;
  imagePrompt: string;
  firstComment: string;
  followupComments: string[];
  hashtags: string[];
}

export interface GeneratedPost extends GenerationResult {
  id?: number;
  /** Source post id this was inspired by, if any. */
  sourcePostId: string | null;
  sourceSummary: string | null;
  tone: GenerationTone;
  customInstructions: string;
  model: string;
  createdAt: number;
}

export interface GenerationHistoryEntry {
  id?: number;
  kind: 'post' | 'ideas' | 'analysis';
  sourcePostId: string | null;
  model: string;
  promptPreview: string;
  ok: boolean;
  error?: string;
  durationMs: number;
  createdAt: number;
}

export interface PromptTemplate {
  id?: number;
  key: string;
  label: string;
  template: string;
  updatedAt: number;
}

/** Categories of content the user can choose to exclude. */
export type ContentFilterKey =
  | 'politics'
  | 'religion'
  | 'nsfw'
  | 'spam'
  | 'giveaways'
  | 'jobPosts';

export interface Settings {
  id: 'settings';
  topics: string[];
  keywords: string[];
  blacklistKeywords: string[];
  platforms: Platform[];
  minEngagement: number;
  /** Max post age in hours; older posts are filtered out. */
  maxPostAgeHours: number;
  relevanceThreshold: number;
  /** Max scroll attempts per scan (the scanner stops early once the target is met). */
  scanScrollRounds: number;
  /** Target number of posts to collect per scan before filtering/analysis. */
  scanTargetCount: number;
  // --- AI Analyzer (second-pass curation) ---
  /** When on, only AI-selected posts are added to Discover. */
  analyzerEnabled: boolean;
  /** Model used for analysis (same provider + key as aiProvider). */
  analyzerModel: string;
  /** The user's curation criteria / use-case description. */
  analyzerPrompt: string;
  /** Max posts the analyzer may keep per scan (1-5). */
  analyzerMaxResults: number;
  writingStyle: string;
  defaultTone: GenerationTone;
  aiProvider: 'gemini' | 'openai' | 'anthropic';
  aiModel: string;
  // Gemini
  geminiApiKey: string;
  // OpenAI (and OpenAI-compatible endpoints)
  openaiApiKey: string;
  /** Custom base URL for OpenAI-compatible APIs (e.g. local Ollama, Azure, LM Studio). Leave blank for https://api.openai.com/v1 */
  openaiBaseUrl: string;
  // Anthropic
  anthropicApiKey: string;
  /** Custom base URL for Anthropic-compatible APIs. Leave blank for https://api.anthropic.com */
  anthropicBaseUrl: string;
  contentFilters: Record<ContentFilterKey, boolean>;
  /** Show the in-page "generate AI comment" button on LinkedIn/X comment boxes. */
  inlineCommentEnabled: boolean;
  darkMode: boolean;
  updatedAt: number;
}

/** Idea-generation buckets surfaced on the Ideas tab. */
export interface IdeaBundle {
  contentIdeas: string[];
  trendingThemes: string[];
  contrarianOpinions: string[];
  educationalPosts: string[];
  personalStories: string[];
  industryAnalysis: string[];
}
