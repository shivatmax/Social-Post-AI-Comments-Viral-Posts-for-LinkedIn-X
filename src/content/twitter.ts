import type { RawPost } from '@/types';
import { parseCountFrom, htmlSnapshot } from './dom';

type Root = Document | HTMLElement | ParentNode;

/** Stable per-tweet marker — also used by the scroller. */
export const TWITTER_POST_MARKER = 'article[data-testid="tweet"]';

/**
 * X (Twitter) timeline extraction. X exposes stable `data-testid` hooks and a
 * machine-readable <time datetime> + /status/ permalink, so extraction here is
 * more reliable than LinkedIn.
 */
export function collectTwitterPosts(root: Root = document): Map<string, RawPost> {
  const map = new Map<string, RawPost>();
  root.querySelectorAll('article[data-testid="tweet"]').forEach((node) => {
    try {
      const post = extractTweet(node);
      if (post && post.text.length >= 4) {
        const key = post.url ?? `${post.author.name}:${post.text.slice(0, 60)}`;
        if (!map.has(key)) map.set(key, post);
      }
    } catch {
      /* skip malformed tweet */
    }
  });
  return map;
}

function extractTweet(node: Element): RawPost | null {
  const userName = node.querySelector('[data-testid="User-Name"]');
  const nameText = (userName?.textContent ?? '').replace(/\s+/g, ' ').trim();
  // "Display Name@handle·2h" -> split on @
  const name = nameText.split('@')[0].replace(/·.*$/, '').trim() || nameText;
  const handleMatch = nameText.match(/@\w+/);
  const headline = handleMatch ? handleMatch[0] : null;

  const textEl = node.querySelector('[data-testid="tweetText"]');
  const body = (textEl?.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!body) return null;

  // Permalink + machine timestamp.
  const timeEl = node.querySelector('time');
  const timestamp = timeEl?.getAttribute('datetime') ?? null;
  const url = extractTweetPermalink(node, timeEl);

  const profileAnchor = userName?.querySelector('a') as HTMLAnchorElement | null;
  const profileUrl = profileAnchor
    ? new URL(profileAnchor.getAttribute('href') ?? '', 'https://x.com').toString()
    : null;
  const avatarUrl =
    (node.querySelector('[data-testid="Tweet-User-Avatar"] img') as HTMLImageElement | null)
      ?.src ?? null;

  const images = extractTweetImages(node);
  const hasVideo =
    !!node.querySelector('[data-testid="videoPlayer"]') ||
    !!node.querySelector('[data-testid="videoComponent"]') ||
    !!node.querySelector('video');

  return {
    url,
    platform: 'twitter',
    author: { name, headline, profileUrl, avatarUrl },
    text: body,
    images,
    hasVideo,
    engagement: extractTweetEngagement(node),
    timestamp,
    timestampLabel: timeEl?.textContent?.trim() || null,
    rawHtml: htmlSnapshot(node),
  };
}

/**
 * Resolve the canonical tweet permalink (https://x.com/<handle>/status/<id>).
 * Prefers the timestamp's anchor; falls back to any /status/ link in the tweet,
 * and normalizes away /photo, /analytics, query strings, etc.
 */
function extractTweetPermalink(node: Element, timeEl: Element | null): string | null {
  const candidates: string[] = [];
  const timeHref = timeEl?.closest('a')?.getAttribute('href');
  if (timeHref) candidates.push(timeHref);
  node.querySelectorAll('a[href*="/status/"]').forEach((a) => {
    const h = a.getAttribute('href');
    if (h) candidates.push(h);
  });
  for (const href of candidates) {
    const m = href.match(/^\/?([A-Za-z0-9_]+)\/status\/(\d+)/);
    if (m) return `https://x.com/${m[1]}/status/${m[2]}`;
  }
  return null;
}

/**
 * Collect tweet photos + link-card preview images, skipping avatars/emoji.
 * X serves media from pbs.twimg.com; we upgrade the size variant to "large".
 */
function extractTweetImages(node: Element): string[] {
  const out: string[] = [];
  const sel =
    '[data-testid="tweetPhoto"] img, ' +
    '[data-testid="card.layoutLarge.media"] img, ' +
    '[data-testid="card.layoutSmall.media"] img';
  node.querySelectorAll<HTMLImageElement>(sel).forEach((img) => {
    let src = img.currentSrc || img.src || img.getAttribute('src') || '';
    if (!/^https?:/.test(src)) return;
    if (/emoji|profile_images|svg|\.svg/i.test(src)) return;
    if (!/pbs\.twimg\.com|twimg/i.test(src)) return;
    // Request the large variant when the URL carries a size param.
    src = src.replace(/([?&]name=)(small|thumb|medium|240x240|360x360)/i, '$1large');
    out.push(src);
  });
  return [...new Set(out)];
}

function extractTweetEngagement(node: Element): RawPost['engagement'] {
  // The action bar group carries an aggregate aria-label like:
  // "5 replies, 12 reposts, 130 likes, 9 bookmarks, 4000 views".
  const group = node.querySelector('[role="group"]');
  const label = group?.getAttribute('aria-label') ?? '';
  const grab = (kw: RegExp): number => {
    const m = label.match(kw);
    return m ? parseCountFrom(m[1]) : 0;
  };
  let likes = grab(/([\d.,km]+)\s+likes?/i);
  let comments = grab(/([\d.,km]+)\s+repl/i);
  let reposts = grab(/([\d.,km]+)\s+(?:reposts?|retweets?)/i);

  // Fallback to per-button text if the aggregate label was absent.
  if (!likes) likes = buttonCount(node, 'like');
  if (!comments) comments = buttonCount(node, 'reply');
  if (!reposts) reposts = buttonCount(node, 'retweet');

  return { likes, comments, reposts };
}

function buttonCount(node: Element, testid: string): number {
  const btn = node.querySelector(`[data-testid="${testid}"]`);
  return parseCountFrom(btn?.textContent);
}
