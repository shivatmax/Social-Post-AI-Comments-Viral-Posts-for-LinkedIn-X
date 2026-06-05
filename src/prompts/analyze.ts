import type { AIMessage } from '@/services/ai/provider';
import type { Post } from '@/types';

export interface AnalyzeInput {
  /** The creator's curation criteria (settings.analyzerPrompt). */
  criteria: string;
  topics: string[];
  maxResults: number;
  candidates: Post[];
}

/**
 * Build the virality-analysis prompt. The model receives the creator's criteria
 * plus a numbered list of candidate posts (text, engagement, media, source) and
 * returns ONLY the posts most likely to go viral if the creator publishes
 * something in that vein — each with a 0-100 virality score and a reason.
 */
export function buildAnalyzeMessages(input: AnalyzeInput): AIMessage[] {
  const criteria =
    input.criteria.trim() ||
    'Posts with a strong hook, a fresh or contrarian idea, and clear shareability.';
  const topics = input.topics.length ? input.topics.join(', ') : '(not specified)';

  const system = `You are a viral content strategist for a creator who wants to post regularly on LinkedIn and X (Twitter). Your job: from a list of scraped posts, pick the few that represent ideas/angles most likely to GO VIRAL if the creator publishes their own take on them.

The creator's criteria / niche:
${criteria}

Topics of interest: ${topics}

Judge virality potential using ALL available signals:
- Hook & first line — does it stop the scroll?
- Idea quality — novel, contrarian, surprising, or genuinely useful (not generic).
- Emotional pull & shareability — would people repost, save, or argue about it?
- Format fit — listicles, strong opinions, stories, how-tos, data points travel well.
- PROVEN engagement — high likes/comments/reposts, and especially a high comment-to-like ratio (conversation = reach). Treat strong existing engagement as evidence the angle works.
- Media — a relevant image/video usually lifts reach; note it as a plus.

Be ruthless. REJECT ads, product launches, company PR/announcements, hiring posts, engagement-bait, and generic motivational filler — those are noise, not viral material.

Return ONLY a JSON object of EXACTLY this shape — no prose:
{ "selected": [ { "index": <number>, "viralityScore": <0-100>, "reason": "<one short sentence on why it can go viral>" } ] }

Rules:
- Include AT MOST ${input.maxResults} posts — only ones with real viral potential. Returning fewer (even zero) is correct.
- Order best first (highest viralityScore first).
- "index" MUST be one of the numbers from the list below.
- "reason" is < 140 characters.`;

  const blocks = input.candidates
    .map((p, i) => {
      const e = p.engagement;
      const ratio = e.likes > 0 ? (e.comments / e.likes).toFixed(2) : 'n/a';
      const imgs = p.images.length
        ? `\nImages (${p.images.length}): ${p.images.slice(0, 3).join(' ')}`
        : '';
      const vid = p.hasVideo ? '\nHas video: yes' : '';
      const headline = p.author.headline ? ` — ${p.author.headline}` : '';
      return `#${i} [${p.platform}] ${p.author.name}${headline}
Engagement: ${e.likes} likes, ${e.comments} comments, ${e.reposts} reposts (comment/like ratio ${ratio})${imgs}${vid}
URL: ${p.url ?? 'n/a'}
Text: ${p.text}`;
    })
    .join('\n\n---\n\n');

  const user = `Candidate posts (${input.candidates.length}):

${blocks}

Select the ones most likely to go viral (at most ${input.maxResults}).`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
