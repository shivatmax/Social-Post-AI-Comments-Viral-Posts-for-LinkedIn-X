import Dexie, { type Table } from 'dexie';
import type {
  GeneratedPost,
  GenerationHistoryEntry,
  Post,
  PromptTemplate,
  Settings,
  Topic,
} from '@/types';

/**
 * IndexedDB schema (via Dexie). Runs inside the side panel context.
 *
 * Tables map 1:1 to the brief: Posts, Topics, GeneratedPosts, Prompts,
 * Settings, GenerationHistory. The `Settings` table holds a single row keyed
 * by the literal id `'settings'`.
 */
export class SocialPostDB extends Dexie {
  posts!: Table<Post, string>;
  topics!: Table<Topic, number>;
  generatedPosts!: Table<GeneratedPost, number>;
  prompts!: Table<PromptTemplate, number>;
  settings!: Table<Settings, string>;
  generationHistory!: Table<GenerationHistoryEntry, number>;

  constructor() {
    super('social-post');
    this.version(1).stores({
      // `id` is the content fingerprint -> automatic dedupe on put().
      posts: 'id, platform, relevanceScore, scannedAt, saved',
      topics: '++id, &name, createdAt',
      generatedPosts: '++id, sourcePostId, createdAt',
      prompts: '++id, &key, updatedAt',
      settings: 'id',
      generationHistory: '++id, kind, createdAt, ok',
    });
  }
}

export const db = new SocialPostDB();
