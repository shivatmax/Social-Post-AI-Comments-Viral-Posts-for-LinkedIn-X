import type { AIMessage } from '@/services/ai/provider';
import type { GenerationTone } from '@/types';
import { HOUSE_RULES, JSON_CONTRACT, describeSource } from './shared';

export interface GeneratePostInput {
  sourceText?: string | null;
  sourceAuthor?: string | null;
  sourcePlatform?: string | null;
  writingStyle: string;
  tone: GenerationTone;
  customInstructions?: string;
}

const TONE_HINTS: Record<GenerationTone, string> = {
  professional: 'measured, credible, polished but warm',
  casual: 'relaxed and conversational, like talking to a peer',
  bold: 'confident and opinionated, willing to take a stance',
  analytical: 'precise and evidence-driven, break down the why',
  storyteller: 'narrative-led, open with a moment or scene',
  witty: 'sharp and a little playful, but still substantive',
};

/** Build the message list for a full post-bundle generation. */
export function buildGeneratePostMessages(input: GeneratePostInput): AIMessage[] {
  const system = `You are a ghostwriter who creates standout LinkedIn and X (Twitter) posts.
Voice/style guide from the user: ${input.writingStyle || 'clear, concrete, human.'}
Target tone: ${TONE_HINTS[input.tone]}.

${HOUSE_RULES}

${JSON_CONTRACT}`;

  const userBlocks: string[] = [];
  if (input.sourceText && input.sourceText.trim()) {
    userBlocks.push(
      describeSource({
        text: input.sourceText,
        author: input.sourceAuthor,
        platform: input.sourcePlatform,
      })
    );
    userBlocks.push(
      'Write an original post bundle inspired by the insight in the source post above.'
    );
  } else {
    userBlocks.push(
      'Write an original post bundle on a topic that fits the style guide above.'
    );
  }
  if (input.customInstructions && input.customInstructions.trim()) {
    userBlocks.push(`Extra instructions from the user: ${input.customInstructions.trim()}`);
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: userBlocks.join('\n\n') },
  ];
}
