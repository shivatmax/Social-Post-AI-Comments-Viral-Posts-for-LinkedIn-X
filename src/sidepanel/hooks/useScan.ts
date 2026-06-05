import * as React from 'react';
import type { Settings } from '@/types';
import type { ScanProgress } from '@/types/messages';
import {
  getActiveTab,
  requestScan,
  ingestRawPosts,
  type ActiveTabInfo,
  type IngestSummary,
} from '@/services/scanner';
import { createLogger } from '@/utils/logger';

const log = createLogger('useScan');

export type ScanPhase = 'idle' | 'scanning' | 'analyzing' | 'done' | 'error';

export interface ScanProgressState {
  collected: number;
  target: number;
}

export interface ScanState {
  phase: ScanPhase;
  summary: IngestSummary | null;
  error: string | null;
  tab: ActiveTabInfo | null;
  progress: ScanProgressState | null;
}

/**
 * Drives the scan flow: inspect active tab -> scrape (with live progress) ->
 * run the two-stage ingest (filter + optional AI virality pass) -> store.
 */
export function useScan(settings: Settings | undefined) {
  const [state, setState] = React.useState<ScanState>({
    phase: 'idle',
    summary: null,
    error: null,
    tab: null,
    progress: null,
  });

  // Live progress broadcast by the content script while it scrolls.
  React.useEffect(() => {
    const onMessage = (msg: unknown) => {
      const m = msg as ScanProgress;
      if (m?.type === 'SCAN_PROGRESS') {
        setState((s) => ({ ...s, progress: { collected: m.collected, target: m.target } }));
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  const refreshTab = React.useCallback(async () => {
    try {
      const tab = await getActiveTab();
      setState((s) => ({ ...s, tab }));
      return tab;
    } catch (err) {
      log.error('refreshTab failed', err);
      return null;
    }
  }, []);

  React.useEffect(() => {
    void refreshTab();
    const onFocus = () => void refreshTab();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshTab]);

  const scan = React.useCallback(async () => {
    if (!settings) return;
    setState((s) => ({
      ...s,
      phase: 'scanning',
      error: null,
      summary: null,
      progress: { collected: 0, target: settings.scanTargetCount },
    }));
    try {
      const tab = await getActiveTab();
      setState((s) => ({ ...s, tab }));
      if (!tab.tabId || !tab.scannable) {
        setState((s) => ({
          ...s,
          phase: 'error',
          progress: null,
          error: 'Open a LinkedIn or X (Twitter) feed tab, then click Scan.',
        }));
        return;
      }

      const result = await requestScan(
        tab.tabId,
        settings.scanScrollRounds,
        settings.scanTargetCount
      );
      if (!result.ok) {
        setState((s) => ({
          ...s,
          phase: 'error',
          progress: null,
          error: result.error ?? 'Scan failed.',
        }));
        return;
      }

      // Scrolling done — now filter + (optionally) run the AI virality pass.
      setState((s) => ({ ...s, phase: 'analyzing' }));
      const summary = await ingestRawPosts(result.posts, settings);
      setState((s) => ({ ...s, phase: 'done', summary, progress: null }));
    } catch (err) {
      log.error('scan failed', err);
      setState((s) => ({
        ...s,
        phase: 'error',
        progress: null,
        error: err instanceof Error ? err.message : 'Scan failed unexpectedly.',
      }));
    }
  }, [settings]);

  return { ...state, scan, refreshTab };
}
