import { describe, it, expect } from 'vitest';
import { scorePost } from './score';
import { makeRawPost, makeSettings } from '@/test/fixtures';

describe('scorePost', () => {
  it('scores 0-100 and never out of range', () => {
    const post = makeRawPost({
      text: 'Deep dive into LLMs and prompt engineering for AI agents.',
      engagement: { likes: 5000, comments: 800, reposts: 400 },
      timestampLabel: '1h',
    });
    const { breakdown } = scorePost(post, makeSettings());
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });

  it('matches acronym topics by exact token, not substring', () => {
    // "AI" should NOT match the word "training" or "email".
    const offTopic = makeRawPost({ text: 'My morning training email routine for runners.' });
    const onTopic = makeRawPost({ text: 'Thoughts on AI safety this week.' });
    const settings = makeSettings({ topics: ['AI'], keywords: [] });
    expect(scorePost(offTopic, settings).matchedTopics).not.toContain('AI');
    expect(scorePost(onTopic, settings).matchedTopics).toContain('AI');
  });

  it('rewards on-topic posts over off-topic ones', () => {
    const settings = makeSettings({ topics: ['Cybersecurity', 'Threat Intelligence'] });
    const onTopic = makeRawPost({
      text: 'New threat intelligence on a cybersecurity breach affecting SOC teams.',
      engagement: { likes: 100, comments: 30, reposts: 10 },
      timestampLabel: '2h',
    });
    const offTopic = makeRawPost({
      text: 'My favourite banana bread recipe for the weekend.',
      engagement: { likes: 100, comments: 30, reposts: 10 },
      timestampLabel: '2h',
    });
    const on = scorePost(onTopic, settings).breakdown.total;
    const off = scorePost(offTopic, settings).breakdown.total;
    expect(on).toBeGreaterThan(off);
  });

  it('applies the off-topic discount when topics are configured', () => {
    const settings = makeSettings({ topics: ['Cybersecurity'] });
    const offTopic = makeRawPost({
      text: 'Banana bread recipe, nothing technical here.',
      engagement: { likes: 2000, comments: 500, reposts: 300 },
      timestampLabel: '1h',
    });
    // High engagement + recency, but off-topic -> heavily discounted.
    expect(scorePost(offTopic, settings).breakdown.total).toBeLessThan(40);
  });

  it('gives newer posts a higher recency component', () => {
    const settings = makeSettings({ topics: ['AI'], maxPostAgeHours: 168 });
    const fresh = scorePost(makeRawPost({ text: 'AI update', timestampLabel: '1h' }), settings);
    const old = scorePost(makeRawPost({ text: 'AI update', timestampLabel: '6d' }), settings);
    expect(fresh.breakdown.recency).toBeGreaterThan(old.breakdown.recency);
  });
});
