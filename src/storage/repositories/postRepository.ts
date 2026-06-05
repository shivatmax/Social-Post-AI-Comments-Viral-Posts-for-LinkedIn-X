import { db } from '../db';
import type { Platform, Post } from '@/types';
import { isToday } from '@/utils/dates';

/**
 * Posts repository. Because the primary key is the content fingerprint,
 * `bulkPut` transparently dedupes re-scanned posts.
 */
export const postRepository = {
  async upsertMany(posts: Post[]): Promise<{ added: number; updated: number }> {
    if (posts.length === 0) return { added: 0, updated: 0 };
    const ids = posts.map((p) => p.id);
    const existing = new Set(
      (await db.posts.bulkGet(ids)).filter(Boolean).map((p) => p!.id)
    );
    // Preserve `saved` flag, earliest scannedAt, and any prior AI verdict.
    const merged = await Promise.all(
      posts.map(async (p) => {
        const prev = existing.has(p.id) ? await db.posts.get(p.id) : undefined;
        if (!prev) return p;
        return {
          ...p,
          saved: prev.saved || p.saved,
          scannedAt: Math.min(prev.scannedAt, p.scannedAt),
          // Don't lose an "AI pass" verdict if a later no-AI scan re-includes it.
          analysis: p.analysis ?? prev.analysis ?? null,
        };
      })
    );
    await db.posts.bulkPut(merged);
    const added = posts.filter((p) => !existing.has(p.id)).length;
    return { added, updated: posts.length - added };
  },

  async all(): Promise<Post[]> {
    return db.posts.orderBy('scannedAt').reverse().toArray();
  },

  async topByRelevance(limit = 100): Promise<Post[]> {
    const rows = await db.posts.orderBy('relevanceScore').reverse().limit(limit).toArray();
    return rows;
  },

  async byPlatform(platform: Platform): Promise<Post[]> {
    return db.posts.where('platform').equals(platform).reverse().toArray();
  },

  async get(id: string): Promise<Post | undefined> {
    return db.posts.get(id);
  },

  async setSaved(id: string, saved: boolean): Promise<void> {
    await db.posts.update(id, { saved });
  },

  async remove(id: string): Promise<void> {
    await db.posts.delete(id);
  },

  async removeMany(ids: string[]): Promise<void> {
    if (ids.length) await db.posts.bulkDelete(ids);
  },

  async clear(): Promise<void> {
    await db.posts.clear();
  },

  async count(): Promise<number> {
    return db.posts.count();
  },

  async todayCount(): Promise<number> {
    const all = await db.posts.toArray();
    return all.filter((p) => isToday(p.scannedAt)).length;
  },
};
