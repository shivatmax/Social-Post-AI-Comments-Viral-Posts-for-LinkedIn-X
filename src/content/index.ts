import type { Platform, RawPost } from '@/types';
import type { RuntimeMessage, ScanResult, PongResponse } from '@/types/messages';
import { collectLinkedInPosts, LINKEDIN_POST_MARKER } from './linkedin';
import { collectTwitterPosts, TWITTER_POST_MARKER } from './twitter';
import { scrollFeedStep, scrollToTop, sleep } from './dom';
import { initCommentAssistant } from './comment-assistant';
import { createLogger } from '@/utils/logger';

const log = createLogger('content');

function detectPlatform(): Platform | null {
  const host = location.hostname;
  if (host.endsWith('linkedin.com')) return 'linkedin';
  if (host.endsWith('x.com') || host.endsWith('twitter.com')) return 'twitter';
  return null;
}

const PLATFORM = detectPlatform();
const MARKER = PLATFORM === 'linkedin' ? LINKEDIN_POST_MARKER : TWITTER_POST_MARKER;

function collectOnce(): Map<string, RawPost> {
  if (PLATFORM === 'linkedin') return collectLinkedInPosts();
  if (PLATFORM === 'twitter') return collectTwitterPosts();
  return new Map();
}

function engagementTotal(p: RawPost): number {
  return p.engagement.likes + p.engagement.comments + p.engagement.reposts;
}

/** Broadcast live scan progress to the side panel (fire-and-forget). */
function reportProgress(collected: number, target: number): void {
  try {
    void chrome.runtime
      .sendMessage({ type: 'SCAN_PROGRESS', collected, target })
      .catch(() => {});
  } catch {
    /* no receiver (panel closed) — ignore */
  }
}

/**
 * Scroll the feed and accumulate posts. Keeps scrolling until it has collected
 * `targetCount` posts, runs out of `scrollRounds`, or the feed stops growing
 * for several consecutive rounds (exhausted / not loading more). Emits progress
 * to the page console so the user can watch a scan run.
 */
async function scanFeed(scrollRounds: number, targetCount: number): Promise<RawPost[]> {
  const master = new Map<string, RawPost>();
  const merge = () => {
    for (const [key, post] of collectOnce()) {
      const prev = master.get(key);
      if (!prev || engagementTotal(post) >= engagementTotal(prev)) master.set(key, post);
    }
  };

  // Capture whatever is already on screen.
  merge();
  reportProgress(master.size, targetCount);
  log.info(
    `scan started · ${master.size} posts visible · target ${targetCount} · up to ${scrollRounds} rounds`
  );

  let stable = 0;
  for (let round = 1; round <= scrollRounds; round++) {
    if (master.size >= targetCount) {
      log.info(`reached target of ${targetCount} posts`);
      break;
    }

    const before = master.size;
    const markers = document.querySelectorAll(MARKER);
    const lastMarker = markers.item(markers.length - 1);

    await scrollFeedStep(lastMarker);
    merge();
    reportProgress(Math.min(master.size, targetCount), targetCount);

    const gained = master.size - before;
    log.info(`round ${round}/${scrollRounds} · ${master.size}/${targetCount} posts (+${gained})`);

    if (gained <= 0) {
      stable++;
      if (stable >= 3) {
        log.info('feed stopped growing — ending scan early');
        break;
      }
      // Give a slow feed one more nudge + a longer settle.
      await sleep(700);
    } else {
      stable = 0;
    }
  }

  scrollToTop();
  log.info(`scan complete · ${master.size} posts collected`);
  return [...master.values()];
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    const res: PongResponse = { type: 'PONG', platform: PLATFORM };
    sendResponse(res);
    return false;
  }

  if (message?.type === 'SCAN_FEED') {
    if (!PLATFORM) {
      sendResponse({
        type: 'SCAN_RESULT',
        ok: false,
        platform: null,
        posts: [],
        error: 'This page is not a LinkedIn or X feed.',
      } satisfies ScanResult);
      return false;
    }

    // Quick sanity check: are any posts present at all?
    const initial = document.querySelectorAll(MARKER).length;
    log.debug(`SCAN_FEED received · ${initial} post markers on page · marker="${MARKER}"`);

    scanFeed(message.scrollRounds, message.targetCount ?? 40)
      .then((posts) => {
        if (posts.length === 0) {
          log.warn('scan found 0 posts — is the feed loaded and scrolled into view?');
        }
        sendResponse({
          type: 'SCAN_RESULT',
          ok: true,
          platform: PLATFORM,
          posts,
        } satisfies ScanResult);
      })
      .catch((err) => {
        log.error('scan failed', err);
        sendResponse({
          type: 'SCAN_RESULT',
          ok: false,
          platform: PLATFORM,
          posts: [],
          error: err instanceof Error ? err.message : 'Scan failed unexpectedly.',
        } satisfies ScanResult);
      });
    return true; // keep the message channel open for the async response
  }

  return false;
});

log.info(`content script ready on ${PLATFORM ?? 'unsupported page'} (marker: ${MARKER})`);

// Start the in-page "generate AI comment" button assistant.
if (PLATFORM) {
  void initCommentAssistant(PLATFORM);
}
