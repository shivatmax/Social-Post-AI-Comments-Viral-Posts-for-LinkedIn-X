import { db } from '../db';
import type { GenerationHistoryEntry } from '@/types';

export const historyRepository = {
  async add(entry: Omit<GenerationHistoryEntry, 'id'>): Promise<number> {
    return db.generationHistory.add(entry as GenerationHistoryEntry);
  },

  async recent(limit = 50): Promise<GenerationHistoryEntry[]> {
    return db.generationHistory.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  async clear(): Promise<void> {
    await db.generationHistory.clear();
  },
};
