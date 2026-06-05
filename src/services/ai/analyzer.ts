import type { Post, Settings } from '@/types';
import { createProvider } from './index';
import { parseJsonObject } from './parse';
import { pickFromSelections, type RawSelection } from './select';
import { buildAnalyzeMessages } from '@/prompts/analyze';
import { historyRepository } from '@/storage';
import { createLogger } from '@/utils/logger';

const log = createLogger('ai:analyzer');

export interface AnalyzerResult {
  /** Selected posts, each with its `analysis` verdict attached, best first. */
  posts: Post[];
  /** How many candidates were sent to the model. */
  consideredCount: number;
}

/**
 * Second-pass curation: ask the analyzer model to pick the strongest posts
 * (≤ settings.analyzerMaxResults) out of the manually-filtered candidates,
 * judging each against the user's criteria + the post's text/engagement/media.
 *
 * Throws on AI/network/parse failure — the caller decides the fallback.
 */
export async function analyzeAndSelect(
  candidates: Post[],
  settings: Settings,
  signal?: AbortSignal
): Promise<AnalyzerResult> {
  if (candidates.length === 0) return { posts: [], consideredCount: 0 };

  const provider = createProvider(settings);
  const model = settings.analyzerModel || settings.aiModel;
  const messages = buildAnalyzeMessages({
    criteria: settings.analyzerPrompt,
    topics: settings.topics,
    maxResults: settings.analyzerMaxResults,
    candidates,
  });

  const started = performance.now();
  let raw: string;
  try {
    raw = await provider.generate(messages, {
      model,
      json: true,
      temperature: 0.2,
      maxOutputTokens: 1500,
      signal,
    });
  } catch (err) {
    await recordHistory(model, candidates.length, 0, started, false, err);
    throw err;
  }

  const parsed = parseJsonObject<{ selected?: RawSelection[] }>(raw);
  const selections = Array.isArray(parsed.selected) ? parsed.selected : [];
  const posts = pickFromSelections(candidates, selections, settings.analyzerMaxResults);

  await recordHistory(model, candidates.length, posts.length, started, true);
  log.info(`analyzer selected ${posts.length}/${candidates.length}`);
  return { posts, consideredCount: candidates.length };
}

async function recordHistory(
  model: string,
  considered: number,
  selected: number,
  started: number,
  ok: boolean,
  err?: unknown
): Promise<void> {
  try {
    await historyRepository.add({
      kind: 'analysis',
      sourcePostId: null,
      model,
      promptPreview: `analyze ${considered} → ${selected}`,
      ok,
      error: ok ? undefined : err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - started),
      createdAt: Date.now(),
    });
  } catch {
    /* history is best-effort */
  }
}
