import type { RawPost } from '@/types';
import { parseCountFrom, htmlSnapshot } from './dom';

/**
 * LinkedIn feed extraction for the current (2025+) React redesign.
 *
 * LinkedIn now ships **hashed, per-build CSS class names** (e.g. `_3e82df48`),
 * so the old `feed-shared-update-v2` / `update-components-*` selectors are dead.
 * Instead we anchor on stable accessibility + test hooks that survive rebuilds:
 *
 *   - `button[aria-label^="Open control menu for post by «Author»"]`
 *        → exactly one per post, and it hands us the author name for free.
 *   - `[data-testid="expandable-text-box"]`  → the post body text.
 *   - aria-labels on the social bar                → reactions / comments / reposts.
 *
 * From the control-menu button we climb to the smallest ancestor that also
 * holds the social action bar — that ancestor is the post card.
 *
 * `collectLinkedInPosts` accepts an optional root so it can be unit-tested
 * against a saved page; in the content script it defaults to `document`.
 */

const CONTROL_SELECTOR = 'button[aria-label^="Open control menu for post by"]';
const COMMENT_SELECTOR = 'button[aria-label="Comment"]';
const TEXT_SELECTOR = '[data-testid="expandable-text-box"]';
const TIME_RE = /^\s*(\d+\s*(s|m|h|d|w|mo|yr|hour|day|week|month|year|minute|second)s?)\b/i;
const COUNT_RE =
  /(^|\s)([\d][\d.,]*\s*[km]?)\s+(reactions?|likes?|comments?|reposts?|shares?)\b/i;

type Root = Document | HTMLElement | ParentNode;

/** A stable per-post marker selector — also used by the scroller. */
export const LINKEDIN_POST_MARKER = CONTROL_SELECTOR;

export function collectLinkedInPosts(root: Root = document): Map<string, RawPost> {
  const map = new Map<string, RawPost>();
  const controls = [...root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)];

  // The new LinkedIn feed keeps the post URN only in embedded JSON, never on a
  // rendered element. When the number of `urn:li:activity` IDs present matches
  // the number of posts exactly, they line up in render order — so we can map
  // each post to its permalink. Gated on an exact 1:1 count to avoid mislinking.
  const activityIds = collectActivityIds(root);
  const canOrderMap = controls.length > 0 && controls.length === activityIds.length;

  controls.forEach((btn, i) => {
    try {
      const post = extractPost(btn);
      if (!post) return;
      if (!post.url && canOrderMap) {
        post.url = `https://www.linkedin.com/feed/update/urn:li:activity:${activityIds[i]}/`;
      }
      const key = dedupeKey(post);
      const prev = map.get(key);
      if (!prev || engagementTotal(post) >= engagementTotal(prev)) map.set(key, post);
    } catch {
      /* one bad card shouldn't abort the scan */
    }
  });
  return map;
}

/** Distinct `urn:li:activity` IDs from the page's embedded scripts, in order. */
function collectActivityIds(root: Root): string[] {
  let text = '';
  root.querySelectorAll('script').forEach((s) => {
    text += `${s.textContent ?? ''}\n`;
  });
  return parseActivityIds(text);
}

/** Pure helper: distinct activity IDs in first-occurrence order. */
export function parseActivityIds(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(/urn:li:activity:(\d+)/g)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

function extractPost(controlBtn: HTMLElement): RawPost | null {
  const author = (controlBtn.getAttribute('aria-label') || '')
    .replace(/^Open control menu for post by\s*/i, '')
    .trim();
  if (!author) return null;

  const root = findPostRoot(controlBtn);
  if (!root) return null;

  // Skip ads / promoted posts — they aren't organic "trending" content.
  if (isPromoted(root)) return null;

  const textBox = root.querySelector(TEXT_SELECTOR);
  const text = clean(textBox?.textContent ?? '');

  const images = extractImages(root);
  const hasVideo = !!root.querySelector('video, [data-testid="video-player"]');

  // Need at least some text or media to be worth keeping.
  if (text.length < 8 && images.length === 0 && !hasVideo) return null;

  return {
    url: extractPermalink(root),
    platform: 'linkedin',
    author: {
      name: author,
      headline: extractHeadline(author, controlBtn),
      profileUrl: extractAuthorProfile(root),
      avatarUrl: extractAvatar(root),
    },
    text,
    images,
    hasVideo,
    engagement: extractEngagement(root),
    timestamp: null,
    timestampLabel: extractTimestamp(root),
    rawHtml: htmlSnapshot(root as Element),
  };
}

/**
 * Climb from the control-menu button to the smallest ancestor that contains the
 * social action bar (Comment button). Stop early if an ancestor would swallow a
 * second post (more than one control-menu button) — that means we overshot.
 */
function findPostRoot(controlBtn: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = controlBtn;
  let last: HTMLElement = controlBtn;
  for (let i = 0; i < 30 && cur?.parentElement; i++) {
    cur = cur.parentElement;
    const menus = cur.querySelectorAll(CONTROL_SELECTOR).length;
    if (menus > 1) return last; // overshot into a neighbouring post
    last = cur;
    if (cur.querySelector(COMMENT_SELECTOR)) return cur; // full card incl. action bar
  }
  return last;
}

function extractEngagement(root: HTMLElement): RawPost['engagement'] {
  const counts = { likes: 0, comments: 0, reposts: 0 };
  const consider = (raw: string | null | undefined) => {
    if (!raw) return;
    const m = raw.match(COUNT_RE);
    if (!m) return;
    const n = parseCountFrom(m[2]);
    const kind = m[3].toLowerCase();
    if (/react|like/.test(kind)) counts.likes = Math.max(counts.likes, n);
    else if (/comment/.test(kind)) counts.comments = Math.max(counts.comments, n);
    else if (/repost|share/.test(kind)) counts.reposts = Math.max(counts.reposts, n);
  };
  // aria-labels are the most reliable carriers of counts.
  root.querySelectorAll('[aria-label]').forEach((el) => consider(el.getAttribute('aria-label')));
  // …plus short visible labels like "45 comments" / "6 reposts".
  root.querySelectorAll('span, button, a').forEach((el) => {
    const t = (el.textContent ?? '').trim();
    if (t.length <= 28) consider(t);
  });
  return counts;
}

function extractTimestamp(root: HTMLElement): string | null {
  const els = root.querySelectorAll('span, time');
  for (const el of els) {
    const t = clean(el.textContent ?? '');
    if (t.length > 0 && t.length <= 24 && TIME_RE.test(t)) {
      return t.split('•')[0].split('·')[0].trim();
    }
  }
  return null;
}

function extractHeadline(authorName: string, controlBtn: HTMLElement): string | null {
  // Header = nearest ancestor of the control button that holds the author link.
  let header: HTMLElement | null = controlBtn.parentElement;
  for (let i = 0; i < 8 && header; i++) {
    if (header.querySelector('a[href*="linkedin.com/in/"], a[href*="linkedin.com/company/"]')) break;
    header = header.parentElement;
  }
  if (!header) return null;
  for (const span of header.querySelectorAll('span')) {
    const t = clean(span.textContent ?? '');
    if (!t || t === authorName) continue;
    if (/^[•·]/.test(t)) continue;
    if (TIME_RE.test(t)) continue;
    if (/^(1st|2nd|3rd)\+?$/i.test(t)) continue;
    if (/(ago|edited|follows?|following)/i.test(t) && t.length < 24) continue;
    if (t.length >= 6 && t.length <= 140 && !/^\d+$/.test(t)) return t;
  }
  return null;
}

function extractAuthorProfile(root: HTMLElement): string | null {
  const a =
    root.querySelector<HTMLAnchorElement>('a[href*="linkedin.com/in/"]') ||
    root.querySelector<HTMLAnchorElement>('a[href*="linkedin.com/company/"]');
  return a ? absolutize(a.getAttribute('href')) : null;
}

function extractAvatar(root: HTMLElement): string | null {
  const img = root.querySelector<HTMLImageElement>(
    'img[src*="profile-displayphoto"], img[src*="company-logo"], img[src*="profile-framedphoto"]'
  );
  return img?.getAttribute('src') ?? null;
}

function extractPermalink(root: HTMLElement): string | null {
  // 1) A direct anchor to the post (some LinkedIn variants expose one).
  const a = root.querySelector<HTMLAnchorElement>(
    'a[href*="/feed/update/urn:li:activity"], a[href*="/feed/update/"], a[href*="/posts/"][href*="activity"]'
  );
  if (a) return absolutize(a.getAttribute('href'));

  // 2) The activity URN carried in a data attribute on the card or a child.
  const urn = findActivityUrn(root);
  if (urn) return `https://www.linkedin.com/feed/update/${urn}/`;

  return null;
}

/** Look for `urn:li:activity:<id>` in the post's data attributes. */
function findActivityUrn(root: HTMLElement): string | null {
  const ATTRS = ['data-urn', 'data-id', 'data-activity-urn', 'data-entity-urn'];
  const check = (el: Element): string | null => {
    for (const name of ATTRS) {
      const m = (el.getAttribute(name) || '').match(/urn:li:activity:\d+/);
      if (m) return m[0];
    }
    return null;
  };
  const self = check(root);
  if (self) return self;
  for (const el of root.querySelectorAll('[data-urn], [data-id], [data-activity-urn], [data-entity-urn]')) {
    const found = check(el);
    if (found) return found;
  }
  return null;
}

/** Avatars, logos, reaction icons, tracking pixels — never gallery content. */
const LI_IMG_EXCLUDE =
  /profile-displayphoto|profile-framedphoto|company-logo|EntityPhoto|emoji|reactions?\/|static\.licdn\.com\/aero|spacer|ghost|1x1|data:image\/gif/i;

function extractImages(root: HTMLElement): string[] {
  const out: string[] = [];
  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    // LinkedIn lazy-loads: the real URL can live in data-delayed-url or srcset.
    const src = bestImageSrc(img);
    if (!src || !/^https?:/.test(src)) return;
    if (LI_IMG_EXCLUDE.test(src)) return;
    // Real feed media is served from media.licdn.com (dms/image, feedshare…).
    if (/media\.licdn\.com|feedshare|image-shrink|dms\/image|\/images\//i.test(src)) {
      out.push(src);
    }
  });
  return [...new Set(out)];
}

/** Pick the highest-resolution URL available on an <img> (srcset-aware). */
function bestImageSrc(img: HTMLImageElement): string {
  const delayed = img.getAttribute('data-delayed-url');
  if (delayed && /^https?:/.test(delayed)) return delayed;
  const srcset = img.getAttribute('srcset');
  if (srcset) {
    const best = srcset
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter((u) => /^https?:/.test(u))
      .pop();
    if (best) return best;
  }
  return img.currentSrc || img.src || img.getAttribute('src') || '';
}

function isPromoted(root: HTMLElement): boolean {
  for (const span of root.querySelectorAll('span')) {
    const t = (span.textContent ?? '').trim();
    if (t === 'Promoted' || t === 'Sponsored') return true;
  }
  return false;
}

function dedupeKey(post: RawPost): string {
  return `${post.author.name}::${post.text.slice(0, 80)}`;
}

function engagementTotal(p: RawPost): number {
  return p.engagement.likes + p.engagement.comments + p.engagement.reposts;
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function absolutize(href: string | null): string | null {
  if (!href) return null;
  try {
    const base = typeof location !== 'undefined' ? location.origin : 'https://www.linkedin.com';
    return new URL(href, base).toString().split('?')[0];
  } catch {
    return href;
  }
}
