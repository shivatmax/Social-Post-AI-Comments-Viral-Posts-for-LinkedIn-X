import { db } from '../db';
import type { Topic } from '@/types';

export const topicRepository = {
  async all(): Promise<Topic[]> {
    return db.topics.orderBy('createdAt').toArray();
  },

  async add(name: string, keywords: string[] = []): Promise<number | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const exists = await db.topics.where('name').equalsIgnoreCase(trimmed).first();
    if (exists) return exists.id;
    return db.topics.add({ name: trimmed, keywords, createdAt: Date.now() });
  },

  async remove(id: number): Promise<void> {
    await db.topics.delete(id);
  },

  /** Mirror the flat string list from Settings into the Topics table. */
  async syncFromList(names: string[]): Promise<void> {
    await db.transaction('rw', db.topics, async () => {
      await db.topics.clear();
      for (const name of names) {
        const trimmed = name.trim();
        if (trimmed) await db.topics.add({ name: trimmed, keywords: [], createdAt: Date.now() });
      }
    });
  },
};
