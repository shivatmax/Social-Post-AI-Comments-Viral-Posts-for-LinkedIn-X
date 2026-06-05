import { db } from '../db';
import type { GeneratedPost } from '@/types';

export const generatedPostRepository = {
  async add(entry: Omit<GeneratedPost, 'id'>): Promise<number> {
    return db.generatedPosts.add(entry as GeneratedPost);
  },

  async all(): Promise<GeneratedPost[]> {
    return db.generatedPosts.orderBy('createdAt').reverse().toArray();
  },

  async bySource(sourcePostId: string): Promise<GeneratedPost[]> {
    return db.generatedPosts.where('sourcePostId').equals(sourcePostId).toArray();
  },

  async remove(id: number): Promise<void> {
    await db.generatedPosts.delete(id);
  },

  async removeMany(ids: number[]): Promise<void> {
    if (ids.length) await db.generatedPosts.bulkDelete(ids);
  },

  async clear(): Promise<void> {
    await db.generatedPosts.clear();
  },

  async count(): Promise<number> {
    return db.generatedPosts.count();
  },
};
