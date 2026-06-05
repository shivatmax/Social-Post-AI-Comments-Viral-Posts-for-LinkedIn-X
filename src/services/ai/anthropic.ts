import { AIError, type AIMessage, type AIProvider, type GenerateOptions } from './provider';
import { createLogger } from '@/utils/logger';

const log = createLogger('ai:anthropic');

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

/**
 * Anthropic Messages provider.
 *
 * Calls POST /v1/messages on the Anthropic API (or a custom base URL for
 * proxies / on-premise deployments).
 *
 * Reference: https://platform.claude.com/docs/en/api-reference/messages
 *
 * JSON mode: when opts.json is true we set a system instruction asking for JSON
 * output; Anthropic does not have a dedicated JSON-mode parameter on the
 * Messages API, so we rely on prompting.
 */
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl?: string
  ) {
    this.baseUrl = (baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL);
  }

  async generate(messages: AIMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new AIError('Missing Anthropic API key. Add one in Settings.');
    }

    // Separate system messages (Anthropic uses a top-level `system` field).
    const systemParts = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => ({ role: 'user' as const, content: m.content }));

    // Append a JSON instruction to the system prompt when json mode is requested,
    // since the Messages API does not have a dedicated response_format field.
    const system = opts.json
      ? [systemParts, 'Return ONLY valid JSON. Do not include any prose before or after the JSON object.']
          .filter(Boolean)
          .join('\n\n')
      : systemParts;

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxOutputTokens ?? 2048,
      messages: userMessages,
    };

    if (system) body.system = system;
    if (opts.temperature !== undefined) body.temperature = opts.temperature;

    const url = `${this.baseUrl}/v1/messages`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw new AIError('Network error reaching Anthropic. Check your connection.', err);
    }

    if (!res.ok) {
      const detail = await safeError(res);
      log.error('anthropic error', res.status, detail);
      throw new AIError(`Anthropic request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as AnthropicMessagesResponse;

    if (data.stop_reason === 'max_tokens') {
      log.warn('anthropic response was truncated (max_tokens)');
    }

    const text = data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('') ?? '';

    if (!text.trim()) {
      throw new AIError('Anthropic returned an empty response. Try again.');
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

interface AnthropicMessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
}
