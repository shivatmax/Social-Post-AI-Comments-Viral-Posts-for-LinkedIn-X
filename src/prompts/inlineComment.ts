import type { AIMessage } from '@/services/ai/provider';
import type { Platform } from '@/types';

export interface InlineCommentInput {
  platform: Platform;
  postText: string;
  author?: string | null;
  imageAlts?: string[];
  imageCount?: number;
  writingStyle: string;
}

/**
 * Build a one-shot prompt for a short, human reply written in the user's voice.
 * LinkedIn gets a warmer, slightly-professional comment; X gets a punchy reply.
 */
export function buildInlineCommentMessages(input: InlineCommentInput): AIMessage[] {
  const isLinkedIn = input.platform === 'linkedin';
  const persona = input.writingStyle?.trim() || 'clear, concrete, human — no buzzwords.';

  const system = isLinkedIn
    ? `You are me, writing a quick reply to a LinkedIn post. My voice/persona: ${persona}

Write ONE short comment — 1 to 2 sentences, about 240 characters max — that sounds genuinely human and engaged. React to the actual point of the post; add a specific thought, a brief example, or a sincere, light question. Professional but warm and personable.

Avoid: "Great post"/"Well said"/"Couldn't agree more" filler, hashtags, AI clichés ("delve", "in today's fast-paced world", "game-changer", "leverage"), and over-the-top flattery. At most one emoji, and only if it feels natural.

Output ONLY the comment text — no quotes, no preamble, no explanation.`
    : `You are me, replying to a post on X (Twitter). My voice/persona: ${persona}

Write ONE short, punchy reply — usually a single line, about 200 characters max — that sounds human: a sharp reaction, a quick take, or a genuine question. Casual; lowercase is fine; dry wit is welcome.

Avoid: "Great post" filler, hashtags, multi-line threads, AI clichés, and forced emojis.

Output ONLY the reply text — no quotes, no preamble, no explanation.`;

  const imageCtx =
    input.imageAlts && input.imageAlts.length
      ? `\n\nImage in the post (described): ${input.imageAlts.slice(0, 3).join(' | ')}`
      : input.imageCount
        ? `\n\nThe post includes ${input.imageCount} image${input.imageCount === 1 ? '' : 's'} (no description available).`
        : '';

  const user = `Post${input.author ? ` by ${input.author}` : ''}:
"""
${input.postText}
"""${imageCtx}

Write my ${isLinkedIn ? 'comment' : 'reply'} now.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
