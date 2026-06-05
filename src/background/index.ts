import type {
  CommentConfigResult,
  GenerateCommentRequest,
  GenerateCommentResult,
} from '@/types/messages';
import { settingsRepository } from '@/storage';
import { generateInlineComment } from '@/services/ai';
import { providerHasKey } from '@/services/ai/hasKey';
import { createLogger } from '@/utils/logger';

/**
 * Background service worker.
 *
 * Two jobs:
 *  1. Make the toolbar icon open the **side panel** (there is no popup).
 *  2. Serve the in-page comment assistant: the content script has no access to
 *     the user's API key (it lives in the extension's storage), so it asks the
 *     worker to generate a comment. The key never reaches the web page.
 */
const log = createLogger('background');

// --- Side panel: open on toolbar click ---
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    log.info('side panel set to open on action click');
  } catch (err) {
    log.error('failed to set panel behavior', err);
  }
});

chrome.runtime.onStartup?.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => log.error('startup panel behavior', err));
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId == null) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (err) {
    log.debug('sidePanel.open (likely already open)', err);
  }
});

// --- Comment assistant message handlers ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Whether the inline assistant should run, and if a key is set.
  if (message?.type === 'GET_COMMENT_CONFIG') {
    settingsRepository
      .get()
      .then((s) =>
        sendResponse({
          type: 'COMMENT_CONFIG',
          enabled: s.inlineCommentEnabled,
          hasKey: providerHasKey(s),
        } satisfies CommentConfigResult)
      )
      .catch(() =>
        sendResponse({ type: 'COMMENT_CONFIG', enabled: false, hasKey: false } satisfies CommentConfigResult)
      );
    return true; // async response
  }

  // Generate a comment for a given post.
  if (message?.type === 'GENERATE_COMMENT') {
    const req = message as GenerateCommentRequest;
    (async () => {
      try {
        const settings = await settingsRepository.get();
        if (!settings.inlineCommentEnabled) {
          return sendResponse({
            type: 'GENERATE_COMMENT_RESULT',
            ok: false,
            error: 'AI comments are turned off in the extension Settings.',
          } satisfies GenerateCommentResult);
        }
        if (!providerHasKey(settings)) {
          return sendResponse({
            type: 'GENERATE_COMMENT_RESULT',
            ok: false,
            error: 'Add your AI API key in the extension Settings first.',
          } satisfies GenerateCommentResult);
        }
        const comment = await generateInlineComment(settings, {
          platform: req.platform,
          postText: req.postText,
          author: req.author,
          imageAlts: req.imageAlts,
          imageCount: req.imageCount,
        });
        sendResponse({ type: 'GENERATE_COMMENT_RESULT', ok: true, comment } satisfies GenerateCommentResult);
      } catch (err) {
        log.error('generate comment failed', err);
        sendResponse({
          type: 'GENERATE_COMMENT_RESULT',
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to generate comment.',
        } satisfies GenerateCommentResult);
      }
    })();
    return true; // async response
  }

  return false;
});

log.info('service worker started');
