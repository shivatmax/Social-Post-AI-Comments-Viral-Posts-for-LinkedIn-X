import { AIError, type AIMessage, type AIProvider, type GenerateOptions } from './provider';
import { createLogger } from '@/utils/logger';

const log = createLogger('ai:gemini');
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gemini provider via the Generative Language REST API. Uses `fetch` directly
 * (allowed by host_permissions) so there is no SDK/bundle/CSP overhead.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  constructor(private readonly apiKey: string) {}

  async generate(messages: AIMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new AIError('Missing Gemini API key. Add one in Settings.');
    }

    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const userParts = messages
      .filter((m) => m.role === 'user')
      .map((m) => ({ text: m.content }));

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.9,
        maxOutputTokens: opts.maxOutputTokens ?? 2048,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    // Pass the key as a header (x-goog-api-key), NOT a URL query param — keeps
    // the secret out of URLs, browser history, referrers, and network traces.
    const url = `${ENDPOINT}/${encodeURIComponent(opts.model)}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw new AIError('Network error reaching Gemini. Check your connection.', err);
    }

    if (!res.ok) {
      const detail = await safeError(res);
      log.error('gemini error', res.status, detail);
      throw new AIError(`Gemini request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const blocked = data.promptFeedback?.blockReason;
    if (blocked) {
      throw new AIError(`Gemini blocked the request: ${blocked}`);
    }
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) {
      throw new AIError('Gemini returned an empty response. Try again.');
    }
    return text;
  }
}

async function safeError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } };
    return j.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}
