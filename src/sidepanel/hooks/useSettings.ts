import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Settings } from '@/types';
import { settingsRepository } from '@/storage';

/**
 * Live settings hook. Lazily seeds defaults on first read, mirrors the dark
 * mode flag onto <html>, and exposes an `update` patcher.
 */
export function useSettings() {
  // Pure read inside the liveQuery (read-only tx); seeding happens separately.
  const settings = useLiveQuery(() => settingsRepository.read(), []);

  // Seed defaults once, OUTSIDE the liveQuery context (writes are allowed here).
  React.useEffect(() => {
    void settingsRepository.ensureSeeded();
  }, []);

  React.useEffect(() => {
    if (!settings) return;
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings?.darkMode]);

  const update = React.useCallback(
    (patch: Partial<Settings>) => settingsRepository.update(patch),
    []
  );

  return { settings, update, loading: settings === undefined };
}
