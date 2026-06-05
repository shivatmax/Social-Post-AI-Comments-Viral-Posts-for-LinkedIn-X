/**
 * Typed message contract for chrome runtime/tabs messaging.
 *
 * Flow: side panel -> active tab content script (SCAN_FEED) -> returns
 * SCAN_RESULT. The background worker handles PING/OPEN_PANEL housekeeping.
 */
import type { Platform, RawPost } from './index';

export interface ScanFeedRequest {
  type: 'SCAN_FEED';
  /** Maximum scroll rounds to perform. */
  scrollRounds: number;
  /** Stop early once this many posts have been collected. */
  targetCount: number;
}

export interface ScanResult {
  type: 'SCAN_RESULT';
  ok: boolean;
  platform: Platform | null;
  posts: RawPost[];
  error?: string;
}

export interface PingRequest {
  type: 'PING';
}

export interface PongResponse {
  type: 'PONG';
  platform: Platform | null;
}

/** Fire-and-forget progress broadcast from the content script during a scan. */
export interface ScanProgress {
  type: 'SCAN_PROGRESS';
  collected: number;
  target: number;
}

// --- Inline comment assistant (content script <-> background) ---

export interface CommentConfigRequest {
  type: 'GET_COMMENT_CONFIG';
}
export interface CommentConfigResult {
  type: 'COMMENT_CONFIG';
  enabled: boolean;
  hasKey: boolean;
}

export interface GenerateCommentRequest {
  type: 'GENERATE_COMMENT';
  platform: Platform;
  postText: string;
  author: string | null;
  imageAlts: string[];
  imageCount: number;
}
export interface GenerateCommentResult {
  type: 'GENERATE_COMMENT_RESULT';
  ok: boolean;
  comment?: string;
  error?: string;
}

export type RuntimeMessage = ScanFeedRequest | PingRequest;
export type RuntimeResponse = ScanResult | PongResponse;
