import { db } from '../db';
import { defaultSettings } from '../defaults';
import type { Settings } from '@/types';

/**
 * Single-row settings repository. `get()` lazily seeds defaults on first run,
 * so callers never have to handle an empty store.
 */
export const settingsRepository = {
  /**
   * Pure read — returns undefined if not yet seeded. Safe to call inside a
   * Dexie `useLiveQuery` querier (which runs in a read-only transaction).
   *
   * Merges over defaults so settings rows saved by an older version still
   * expose any newly-added fields (forward-compatible migration).
   */
  async read(): Promise<Settings | undefined> {
    const stored = await db.settings.get('settings');
    return stored ? withDefaults(stored) : undefined;
  },

  /** Seed defaults if the row is missing. Must run OUTSIDE a liveQuery. */
  async ensureSeeded(): Promise<Settings> {
    const existing = await db.settings.get('settings');
    if (existing) return withDefaults(existing);
    const seeded = defaultSettings();
    await db.settings.put(seeded);
    return seeded;
  },

  async get(): Promise<Settings> {
    return this.ensureSeeded();
  },

  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const next: Settings = { ...current, ...patch, id: 'settings', updatedAt: Date.now() };
    await db.settings.put(next);
    return next;
  },

  async reset(): Promise<Settings> {
    const fresh = defaultSettings();
    await db.settings.put(fresh);
    return fresh;
  },
};

/** Fill any fields a stored row is missing (added in a later version). */
function withDefaults(stored: Settings): Settings {
  return {
    ...defaultSettings(),
    ...stored,
    // Nested objects need their own merge so new filter keys appear too.
    contentFilters: { ...defaultSettings().contentFilters, ...stored.contentFilters },
    id: 'settings',
  };
}
