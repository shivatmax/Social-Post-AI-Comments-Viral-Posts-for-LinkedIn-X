import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/storage';
import type { Post } from '@/types';

/** Live list of all stored posts, newest scan first. */
export function usePosts(): Post[] | undefined {
  return useLiveQuery(() => db.posts.orderBy('scannedAt').reverse().toArray(), []);
}

/** Live list sorted by best score (AI analysis when present, else relevance). */
export function useDiscoverPosts(savedOnly: boolean): Post[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.posts.toArray();
    const filtered = savedOnly ? all.filter((p) => p.saved) : all;
    const rank = (p: Post) => p.analysis?.score ?? p.relevanceScore;
    return filtered.sort((a, b) => rank(b) - rank(a));
  }, [savedOnly]);
}
