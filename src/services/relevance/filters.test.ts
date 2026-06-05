import { describe, it, expect } from 'vitest';
import { applyFilters } from './filters';
import { makeRawPost, makeSettings } from '@/test/fixtures';

describe('applyFilters', () => {
  it('passes a clean, on-topic post', () => {
    const post = makeRawPost({ text: 'Notes on building reliable AI agents in production.' });
    const res = applyFilters(post, makeSettings());
    expect(res.rejected).toBe(false);
  });

  it('rejects blacklisted keywords', () => {
    const post = makeRawPost({ text: 'Join my crypto pump group now.' });
    const res = applyFilters(post, makeSettings({ blacklistKeywords: ['crypto pump'] }));
    expect(res.rejected).toBe(true);
    expect(res.reason).toContain('blacklist');
  });

  it('rejects job posts when the filter is on', () => {
    const post = makeRawPost({ text: "We're hiring a senior SOC analyst — apply now!" });
    const res = applyFilters(post, makeSettings());
    expect(res.rejected).toBe(true);
    expect(res.reason).toContain('jobPosts');
  });

  it('allows job-like text when the job filter is off', () => {
    const post = makeRawPost({ text: "We're hiring a senior SOC analyst — apply now!" });
    const settings = makeSettings();
    settings.contentFilters.jobPosts = false;
    const res = applyFilters(post, settings);
    expect(res.rejected).toBe(false);
  });

  it('rejects posts below the minimum engagement gate', () => {
    const post = makeRawPost({ engagement: { likes: 1, comments: 0, reposts: 0 } });
    const res = applyFilters(post, makeSettings({ minEngagement: 50 }));
    expect(res.rejected).toBe(true);
    expect(res.reason).toContain('min engagement');
  });

  it('rejects giveaways', () => {
    const post = makeRawPost({ text: 'Huge giveaway! Retweet to win a free iPhone 🎉' });
    const res = applyFilters(post, makeSettings());
    expect(res.rejected).toBe(true);
    expect(res.reason).toContain('giveaways');
  });
});
