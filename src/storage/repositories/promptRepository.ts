import { db } from '../db';
import type { PromptTemplate } from '@/types';

/**
 * Stores user-overridable prompt templates. The AI service falls back to the
 * built-in templates in src/prompts when no override row exists for a key.
 */
export const promptRepository = {
  async get(key: string): Promise<PromptTemplate | undefined> {
    return db.prompts.where('key').equals(key).first();
  },

  async all(): Promise<PromptTemplate[]> {
    return db.prompts.toArray();
  },

  async upsert(key: string, label: string, template: string): Promise<void> {
    const existing = await this.get(key);
    if (existing?.id != null) {
      await db.prompts.update(existing.id, { template, label, updatedAt: Date.now() });
    } else {
      await db.prompts.add({ key, label, template, updatedAt: Date.now() });
    }
  },

  async remove(key: string): Promise<void> {
    const existing = await this.get(key);
    if (existing?.id != null) await db.prompts.delete(existing.id);
  },
};
