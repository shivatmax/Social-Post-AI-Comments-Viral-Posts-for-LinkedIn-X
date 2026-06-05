import { AIError, type AIMessage, type AIProvider, type GenerateOptions } from './provider';
import { createLogger } from '@/utils/logger';

const log = createLogger('ai:openai');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * OpenAI Chat Completions provider.
 *
 * Also works with any OpenAI-compatible endpoint (LM Studio, Ollama, Azure
 * OpenAI, Groq, Together, etc.) by supplying a custom `baseUrl`.
 *
 * Reference: https://platform.openai.com/docs/api-reference/chat/create
 */
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl?: string
  ) {
    // Strip trailing slash for clean URL joins.
    this.baseUrl = (baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL);
  }

  async generate(messages: AIMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new AIError('Missing OpenAI API key. Add one in Settings.');
    }

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.9,
      max_tokens: opts.maxOutputTokens ?? 2048,
    };

    if (opts.json) {
      body.response_format = { type: 'json_object' };
    }

    const url = `${this.baseUrl}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw new AIError('Network error reaching OpenAI. Check your connection.', err);
    }

    if (!res.ok) {
      const detail = await safeError(res);
      log.error('openai error', res.status, detail);
      throw new AIError(`OpenAI request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) {
      throw new AIError('OpenAI returned an empty response. Try again.');
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

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}
