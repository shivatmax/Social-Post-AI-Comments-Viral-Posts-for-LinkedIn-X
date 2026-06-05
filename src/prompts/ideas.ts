import type { AIMessage } from '@/services/ai/provider';

export interface IdeasInput {
  /** Short digests of recently scanned posts to ground the suggestions. */
  recentDigests: string[];
  topics: string[];
  writingStyle: string;
}

/**
 * Generate content ideas across six buckets, grounded in what was scanned and
 * the user's topics.
 */
export function buildIdeasMessages(input: IdeasInput): AIMessage[] {
  const system = `You are a content strategist who proposes original post ideas for a creator.
Voice/style guide: ${input.writingStyle || 'clear, concrete, human.'}
Ideas must be specific and immediately actionable — a creator should be able to write the post from the idea alone.
Avoid generic, overused angles and AI clichés.

Return ONLY JSON with these keys, each an array of 4-6 short idea strings:
{
  "contentIdeas": string[],
  "trendingThemes": string[],
  "contrarianOpinions": string[],
  "educationalPosts": string[],
  "personalStories": string[],
  "industryAnalysis": string[]
}`;

  const topics = input.topics.length ? input.topics.join(', ') : 'the creator’s field';
  const digest = input.recentDigests.length
    ? `Recently trending posts I scanned (for grounding):\n- ${input.recentDigests.join('\n- ')}`
    : 'No scanned posts yet — base ideas on the topics below.';

  const user = `Topics of interest: ${topics}

${digest}

Propose post ideas across the six buckets.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
