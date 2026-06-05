/** DOM helpers shared by the LinkedIn and X scrapers. Page-context only. */

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** First matching element's trimmed innerText, or '' . */
export function text(root: ParentNode, selector: string): string {
  const el = root.querySelector(selector);
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Attribute of the first matching element, or null. */
export function attr(root: ParentNode, selector: string, name: string): string | null {
  const el = root.querySelector(selector);
  return el?.getAttribute(name) ?? null;
}

/** Collect src values from all matching <img>, filtering out blanks/spinners. */
export function imageSrcs(root: ParentNode, selector: string): string[] {
  const out: string[] = [];
  root.querySelectorAll<HTMLImageElement>(selector).forEach((img) => {
    const src = img.currentSrc || img.src || img.getAttribute('data-delayed-url') || '';
    if (src && /^https?:/.test(src) && !/spinner|blank|data:image\/gif/.test(src)) {
      out.push(src);
    }
  });
  return [...new Set(out)];
}

/** Parse the first count-like number out of a string ("12 comments" -> 12, "1.2K" -> 1200). */
export function parseCountFrom(s: string | null | undefined): number {
  if (!s) return 0;
  const m = s.replace(/,/g, '').match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return 0;
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'k') return Math.round(n * 1000);
  if (suf === 'm') return Math.round(n * 1_000_000);
  return Math.round(n);
}

/** Trimmed outerHTML snapshot capped to keep storage small. */
export function htmlSnapshot(el: Element, max = 4000): string {
  const html = el.outerHTML ?? '';
  return html.length > max ? `${html.slice(0, max)}…` : html;
}

/** The element that actually scrolls (window vs. an inner container). */
export function scrollingElement(): HTMLElement {
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

/**
 * Perform one feed-advancing scroll. Both LinkedIn and X virtualize their feeds
 * and only load more when you scroll *incrementally* near the bottom — a single
 * jump to `scrollHeight` often fails to trigger the fetch. So we:
 *   1. scroll the last rendered post into view (drives virtualization), then
 *   2. nudge the window down by ~1.4 viewports, then
 *   3. dispatch a scroll event and wait for the network/render to settle.
 */
export async function scrollFeedStep(lastMarker: Element | null, waitMs = 1300): Promise<void> {
  try {
    lastMarker?.scrollIntoView({ block: 'end', behavior: 'auto' });
  } catch {
    /* scrollIntoView can throw on detached nodes */
  }
  const el = scrollingElement();
  window.scrollBy(0, Math.round(window.innerHeight * 1.4));
  // Belt-and-suspenders: also push toward the bottom.
  window.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  window.dispatchEvent(new Event('scroll'));
  await sleep(waitMs);
}

/** Jump back to the top of the feed (so we don't leave the user at the bottom). */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'auto' });
}
