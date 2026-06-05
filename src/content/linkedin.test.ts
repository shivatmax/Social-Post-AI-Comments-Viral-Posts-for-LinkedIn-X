import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectLinkedInPosts, parseActivityIds } from './linkedin';

/**
 * Regression test against a real saved LinkedIn feed page (the new React
 * redesign with hashed class names). Guards the accessibility-anchored
 * extraction so a future LinkedIn change can't silently zero out scanning.
 *
 * The snapshot is optional — if it's not present, the test self-skips so CI
 * doesn't depend on a 6MB fixture.
 */
const SNAPSHOT = join(process.cwd(), 'linkedin_feed_page.html');
const hasSnapshot = existsSync(SNAPSHOT);

describe('parseActivityIds', () => {
  it('returns distinct activity IDs in first-occurrence order', () => {
    const text =
      'x commentCount-urn:li:activity:222 y reactionState-urn:li:activity:111 ' +
      'z urn:li:activity:222 q urn:li:activity:111 w urn:li:activity:333';
    expect(parseActivityIds(text)).toEqual(['222', '111', '333']);
  });

  it('returns empty when there are no activity IDs', () => {
    expect(parseActivityIds('nothing here')).toEqual([]);
  });
});

describe.skipIf(!hasSnapshot)('collectLinkedInPosts (real snapshot)', () => {
  let bodyHtml = '';
  let activityIds: string[] = [];

  beforeAll(() => {
    const raw = readFileSync(SNAPSHOT, 'utf8');
    activityIds = parseActivityIds(raw); // file order: [Apple, Garima]
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg></svg>');
    bodyHtml = stripped.replace(/[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*/i, '');
  });

  function mount(withActivityScript: boolean) {
    document.body.innerHTML = bodyHtml;
    if (withActivityScript) {
      // Re-inject the activity IDs (scripts were stripped) so the order-mapping
      // path runs, exactly as it would on the live page. Non-JS type so the test
      // DOM doesn't try to execute it.
      const s = document.createElement('script');
      s.setAttribute('type', 'application/json');
      s.textContent = activityIds.map((id) => `urn:li:activity:${id}`).join(' ');
      document.body.appendChild(s);
    }
  }

  it('extracts organic posts via accessibility anchors', () => {
    mount(false);
    const posts = [...collectLinkedInPosts(document).values()];
    expect(posts.length).toBeGreaterThanOrEqual(1);

    const garima = posts.find((p) => p.author.name === 'Garima Upreti');
    expect(garima, 'expected the Garima Upreti post').toBeTruthy();
    expect(garima!.platform).toBe('linkedin');
    expect(garima!.text.toLowerCase()).toContain('hiring');
    expect(garima!.timestampLabel).toMatch(/\d/);
    expect(garima!.author.profileUrl).toContain('linkedin.com/in/');
  });

  it('skips Promoted/sponsored posts', () => {
    mount(false);
    const posts = [...collectLinkedInPosts(document).values()];
    expect(posts.find((p) => p.author.name === 'Apple')).toBeFalsy();
  });

  it('maps the real post permalink from the activity ID order', () => {
    expect(activityIds.length).toBe(2); // Apple (skipped) + Garima
    mount(true);
    const posts = [...collectLinkedInPosts(document).values()];
    const garima = posts.find((p) => p.author.name === 'Garima Upreti');
    expect(garima!.url).toBe(
      `https://www.linkedin.com/feed/update/urn:li:activity:${activityIds[1]}/`
    );
  });
});
