/** Shared prompt fragments and the house style rules. */

export const HOUSE_RULES = `Rules you MUST follow:
- Never copy or lightly reword the source post. Create genuinely original content.
- Preserve the underlying insight or idea, but express it in your own framing.
- Add a personal, first-person perspective or concrete example.
- Sound like a real human practitioner, not a marketer or an AI.
- Avoid AI clichés and filler: "delve", "in today's fast-paced world", "game-changer",
  "unlock", "leverage", "revolutionize", "the power of", "I'm thrilled to", "navigate the landscape",
  excessive em-dashes, and rows of emoji.
- No hashtags inside the post body (hashtags go only in the hashtags field).
- Keep it specific and concrete. Prefer one sharp idea over many vague ones.`;

export const JSON_CONTRACT = `Return ONLY a JSON object with EXACTLY these keys and no extra prose:
{
  "linkedinPost": string,        // 80-220 words, line breaks allowed, no hashtags inline
  "twitterPost": string,         // <= 280 characters, punchy
  "imagePrompt": string,         // a vivid prompt for an AI image generator (Gemini/Imagen)
  "firstComment": string,        // the author's own first comment to seed discussion
  "followupComments": string[],  // 2-3 short comments to keep the thread alive
  "hashtags": string[]           // 4-8 relevant hashtags WITHOUT the # symbol
}`;

export function describeSource(opts: {
  text: string;
  author?: string | null;
  platform?: string | null;
}): string {
  const author = opts.author ? `Author: ${opts.author}\n` : '';
  const platform = opts.platform ? `Platform: ${opts.platform}\n` : '';
  return `--- SOURCE POST (inspiration only, do not copy) ---\n${platform}${author}${opts.text}\n--- END SOURCE ---`;
}
