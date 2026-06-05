import { AIError } from './provider';

/**
 * Parse a JSON object out of an LLM response, tolerating code fences and
 * surrounding prose. Throws AIError if no JSON object can be recovered.
 */
export function parseJsonObject<T>(raw: string): T {
  const cleaned = stripFences(raw).trim();

  // Fast path: the whole thing is JSON.
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through */
  }

  // Recover the first balanced {...} block.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(slice) as T;
    } catch (err) {
      throw new AIError('Model returned malformed JSON.', err);
    }
  }
  throw new AIError('Model did not return JSON.');
}

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
}

/** Coerce an unknown value into a string array. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}
