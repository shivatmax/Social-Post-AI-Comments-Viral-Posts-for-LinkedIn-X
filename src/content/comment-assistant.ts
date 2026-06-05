import type { Platform } from '@/types';
import type {
  CommentConfigResult,
  GenerateCommentRequest,
  GenerateCommentResult,
} from '@/types/messages';
import { createLogger } from '@/utils/logger';

const log = createLogger('comment-assistant');

/** Active editors → their floating button. Buttons are mounted on <body> and
 * positioned over each editor with viewport-fixed coords, so no ancestor of the
 * editor (with overflow:hidden, transforms, etc.) can clip them. */
const REGISTRY = new Map<HTMLElement, HTMLButtonElement>();
const BTN_SIZE = 26;

interface PostContext {
  text: string;
  author: string | null;
  imageAlts: string[];
  imageCount: number;
}

let platform: Platform | null = null;

/** Entry point — called from the content script once per page. */
export async function initCommentAssistant(plat: Platform): Promise<void> {
  platform = plat;
  const cfg = await getConfig();
  if (!cfg.enabled) {
    log.info('inline comment assistant disabled');
    return;
  }
  scan();
  startObserver();
  // Keep the floating buttons glued to their editors as the page scrolls/resizes.
  let raf = 0;
  const reposition = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      positionAll();
    });
  };
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  log.info('inline comment assistant ready');
}

function getConfig(): Promise<{ enabled: boolean; hasKey: boolean }> {
  return new Promise((resolve) => {
    try {
      chrome.runtime
        .sendMessage({ type: 'GET_COMMENT_CONFIG' })
        .then((r: CommentConfigResult | undefined) =>
          resolve({ enabled: !!r?.enabled, hasKey: !!r?.hasKey })
        )
        .catch(() => resolve({ enabled: false, hasKey: false }));
    } catch {
      resolve({ enabled: false, hasKey: false });
    }
  });
}

// --- Observe the page for comment/reply editors -----------------------------

let scanScheduled = false;
function startObserver(): void {
  const observer = new MutationObserver(() => {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      scan();
    }, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function scan(): void {
  for (const editor of findEditors()) {
    if (REGISTRY.has(editor)) continue; // already wired
    // Only attach when we can resolve a post to comment on (skips the X home composer).
    const ctx = getPostContext(editor);
    if (!ctx || ctx.text.length < 2) continue;
    attachButton(editor);
  }
  positionAll();
}

function findEditors(): HTMLElement[] {
  if (platform === 'linkedin') {
    return [
      ...document.querySelectorAll<HTMLElement>(
        '.ql-editor[contenteditable="true"], [role="textbox"][contenteditable="true"]'
      ),
    ].filter(isLinkedInCommentBox);
  }
  if (platform === 'twitter') {
    return [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid^="tweetTextarea_"][contenteditable="true"], [data-testid^="tweetTextarea_"] [contenteditable="true"]'
      ),
    ];
  }
  return [];
}

function isLinkedInCommentBox(el: HTMLElement): boolean {
  const hint = (
    el.getAttribute('data-placeholder') ||
    el.getAttribute('aria-placeholder') ||
    el.getAttribute('aria-label') ||
    ''
  ).toLowerCase();
  if (/comment|reply/.test(hint)) return true;
  return !!el.closest('[class*="comments-comment"], [class*="comment-box"]');
}

// --- Button injection + viewport-fixed positioning --------------------------

function attachButton(editor: HTMLElement): void {
  const btn = createButton(editor);
  document.body.appendChild(btn);
  REGISTRY.set(editor, btn);
  positionButton(editor, btn);
}

/** Reposition every button over its editor; drop ones whose editor is gone. */
function positionAll(): void {
  for (const [editor, btn] of REGISTRY) {
    if (!editor.isConnected || !btn.isConnected) {
      btn.remove();
      REGISTRY.delete(editor);
      continue;
    }
    positionButton(editor, btn);
  }
}

/** Glue the button to the right-center of the editor (viewport coords). */
function positionButton(editor: HTMLElement, btn: HTMLButtonElement): void {
  const r = editor.getBoundingClientRect();
  // Hidden / collapsed / scrolled off-screen → don't show the button.
  if (r.width < 12 || r.height < 12 || r.bottom < 8 || r.top > window.innerHeight - 8) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-flex';
  const top = r.top + r.height / 2 - BTN_SIZE / 2;
  const left = r.right - BTN_SIZE - 8;
  btn.style.top = `${Math.round(top)}px`;
  btn.style.left = `${Math.round(left)}px`;
}

const ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';

function createButton(editor: HTMLElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Generate AI comment');
  btn.title = 'Generate AI comment';
  // Fixed to the viewport + inline styles → never clipped by the page, CSP-safe.
  Object.assign(btn.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    display: 'none',
    zIndex: '2147483646',
    width: `${BTN_SIZE}px`,
    height: `${BTN_SIZE}px`,
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    padding: '0',
    boxShadow: '0 1px 5px rgba(0,0,0,.4)',
    background: platform === 'linkedin' ? '#0a66c2' : '#1d9bf0',
  } as Partial<CSSStyleDeclaration>);
  btn.innerHTML = ICON;
  // Don't steal focus from the editor on mousedown; act on click.
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void onClick(editor, btn);
  });
  return btn;
}

async function onClick(editor: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  if (btn.dataset.loading === '1') return;
  const ctx = getPostContext(editor);
  if (!ctx || ctx.text.length < 2) {
    bubble(btn, "Couldn't read the post text.", true);
    return;
  }
  setLoading(btn, true);
  try {
    const res = await requestComment(ctx);
    if (res.ok && res.comment) {
      insertComment(editor, res.comment);
      pulse(btn);
    } else {
      bubble(btn, res.error || 'Could not generate a comment.', true);
    }
  } catch (err) {
    log.error('comment request failed', err);
    bubble(btn, 'Could not reach the extension. Try reloading the page.', true);
  } finally {
    setLoading(btn, false);
  }
}

function requestComment(ctx: PostContext): Promise<GenerateCommentResult> {
  const msg: GenerateCommentRequest = {
    type: 'GENERATE_COMMENT',
    platform: platform!,
    postText: ctx.text,
    author: ctx.author,
    imageAlts: ctx.imageAlts,
    imageCount: ctx.imageCount,
  };
  return chrome.runtime.sendMessage(msg) as Promise<GenerateCommentResult>;
}

// --- Insert text into the (contenteditable) editor --------------------------

function insertComment(editor: HTMLElement, text: string): void {
  editor.focus();
  // Move caret to the end of any existing content.
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.addRange(range);
  }
  // execCommand('insertText') is honored by BOTH Quill (LinkedIn) and DraftJS (X)
  // — it dispatches the input events those editors consume. We use ONLY this path:
  // its return value is unreliable on DraftJS (it inserts but reports `false`), so
  // a second insertion path would double the text. The last resort runs only if
  // execCommand actually *threw* (i.e. it definitely did nothing).
  let threw = false;
  try {
    document.execCommand('insertText', false, text);
  } catch {
    threw = true;
  }
  if (threw && !editor.textContent) {
    editor.textContent = text;
    editor.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  }
}

// --- Post-context extraction ------------------------------------------------

function getPostContext(editor: HTMLElement): PostContext | null {
  if (platform === 'linkedin') return linkedInContext(editor);
  if (platform === 'twitter') return twitterContext(editor);
  return null;
}

function linkedInContext(editor: HTMLElement): PostContext | null {
  let node: HTMLElement | null = editor;
  for (let i = 0; i < 30 && node?.parentElement; i++) {
    node = node.parentElement;
    const ctrl = node.querySelector('button[aria-label^="Open control menu for post by"]');
    if (ctrl) {
      const author = (ctrl.getAttribute('aria-label') || '')
        .replace(/^Open control menu for post by\s*/i, '')
        .trim();
      const text = clean(node.querySelector('[data-testid="expandable-text-box"]')?.textContent ?? '');
      const { alts, count } = imageInfo(node, 'linkedin');
      return { text, author: author || null, imageAlts: alts, imageCount: count };
    }
  }
  return null;
}

function twitterContext(editor: HTMLElement): PostContext | null {
  let article = editor.closest('article[data-testid="tweet"]') as HTMLElement | null;
  if (!article) {
    const dialog = editor.closest('[role="dialog"]');
    if (dialog) article = dialog.querySelector('article[data-testid="tweet"]');
  }
  if (!article && location.pathname.includes('/status/')) {
    article = document.querySelector('article[data-testid="tweet"]');
  }
  if (!article) return null;
  const text = clean(article.querySelector('[data-testid="tweetText"]')?.textContent ?? '');
  const nameEl = article.querySelector('[data-testid="User-Name"]');
  const author = (nameEl?.textContent ?? '').split('@')[0].replace(/·.*$/, '').trim() || null;
  const { alts, count } = imageInfo(article, 'twitter');
  return { text, author, imageAlts: alts, imageCount: count };
}

function imageInfo(node: Element, kind: Platform): { alts: string[]; count: number } {
  const sel =
    kind === 'linkedin'
      ? 'img'
      : '[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img';
  const alts = new Set<string>();
  let count = 0;
  node.querySelectorAll<HTMLImageElement>(sel).forEach((img) => {
    const src = img.currentSrc || img.src || '';
    if (kind === 'linkedin' && !/media\.licdn|feedshare|dms\/image/i.test(src)) return;
    if (kind === 'twitter' && !/pbs\.twimg/i.test(src)) return;
    count++;
    const alt = (img.getAttribute('alt') || '').trim();
    if (alt && alt.length > 4 && !/^(image|photo)$/i.test(alt)) alts.add(alt);
  });
  return { alts: [...alts], count };
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// --- Button visual states ---------------------------------------------------

const spinners = new WeakMap<HTMLButtonElement, Animation>();
function setLoading(btn: HTMLButtonElement, loading: boolean): void {
  btn.dataset.loading = loading ? '1' : '';
  btn.style.pointerEvents = loading ? 'none' : '';
  btn.style.opacity = loading ? '0.85' : '1';
  btn.title = loading ? 'Generating…' : 'Generate AI comment';
  const svg = btn.querySelector('svg');
  if (loading && svg) {
    const anim = svg.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 800,
      iterations: Infinity,
    });
    spinners.set(btn, anim);
  } else {
    spinners.get(btn)?.cancel();
    spinners.delete(btn);
  }
}

function pulse(btn: HTMLButtonElement): void {
  btn.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
    { duration: 300 }
  );
}

function bubble(btn: HTMLButtonElement, message: string, isError: boolean): void {
  const r = btn.getBoundingClientRect();
  const tip = document.createElement('div');
  tip.textContent = message;
  Object.assign(tip.style, {
    position: 'fixed',
    left: `${Math.max(8, r.right - 230)}px`,
    top: `${Math.max(8, r.top - 6)}px`,
    transform: 'translateY(-100%)',
    zIndex: '2147483647',
    maxWidth: '230px',
    padding: '6px 9px',
    borderRadius: '8px',
    background: isError ? '#b91c1c' : '#111827',
    color: '#fff',
    fontSize: '11px',
    lineHeight: '1.35',
    boxShadow: '0 2px 8px rgba(0,0,0,.35)',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), 4000);
}
