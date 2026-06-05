import type { AIMessage } from '@/services/ai/provider';
import { describeSource } from './shared';

export interface CommentsInput {
  sourceText: string;
  sourceAuthor?: string | null;
  writingStyle: string;
}

/**
 * Generate a set of comments to engage with a post: an early comment, an
 * engagement booster, a follow-up, and a question for the audience.
 */
export function buildCommentsMessages(input: CommentsInput): AIMessage[] {
  const system = `You write thoughtful, human comments that add value to a discussion.
Voice/style guide: ${input.writingStyle || 'clear, concrete, human.'}
Avoid generic praise ("Great post!"), avoid AI clichés, and never just summarize the post.
Each comment should add a perspective, a concrete example, or a sharp question.

Return ONLY JSON with these keys:
{
  "earlyComment": string,        // a substantive first comment
  "engagementBooster": string,   // a comment likely to spark replies
  "followupComment": string,     // a comment to post later to revive the thread
  "audienceQuestion": string     // an open question to the audience
}`;

  const user = `${describeSource({ text: input.sourceText, author: input.sourceAuthor })}

Write the four comments described above as a reaction to this post.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
