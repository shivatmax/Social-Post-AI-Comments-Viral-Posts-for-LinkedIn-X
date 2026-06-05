import * as React from 'react';
import {
  ThumbsUp,
  MessageCircle,
  Repeat2,
  ExternalLink,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Linkedin,
  Image as ImageIcon,
  ChevronDown,
  PlayCircle,
  Zap,
} from 'lucide-react';
import type { Post } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { compactNumber, truncate } from '@/utils/format';
import { cn } from '@/utils/cn';

interface PostCardProps {
  post: Post;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onGenerate?: (post: Post) => void;
  onToggleSave?: (post: Post) => void;
  onRemove?: (post: Post) => void;
}

export function PostCard({
  post,
  selected,
  onToggleSelect,
  onGenerate,
  onToggleSave,
  onRemove,
}: PostCardProps) {
  const score = Math.round(post.relevanceScore);
  const profileUrl = post.author.profileUrl;
  // Best link to open: the exact post when we have a permalink, otherwise the
  // author's recent activity (LinkedIn) / profile (X) so you can still find it.
  const opensExactPost = !!post.url;
  const openUrl =
    post.url ??
    (profileUrl
      ? post.platform === 'linkedin'
        ? `${profileUrl.replace(/\/+$/, '')}/recent-activity/all/`
        : profileUrl
      : null);
  return (
    <Card className={cn('overflow-hidden', selected && 'ring-2 ring-primary')}>
      <div className="flex items-start gap-2 p-3">
        {onToggleSelect ? (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
            checked={!!selected}
            onChange={() => onToggleSelect(post.id)}
            aria-label="Select post"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {/* Author row */}
          <div className="flex items-center gap-2">
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                {post.author.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-xs font-semibold">
                {post.platform === 'linkedin' ? (
                  <Linkedin className="h-3 w-3 shrink-0 text-primary" />
                ) : (
                  <XLogo />
                )}
                {profileUrl ? (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-primary hover:underline"
                    title="Open author profile in a new tab"
                  >
                    {post.author.name}
                  </a>
                ) : (
                  <span className="truncate">{post.author.name}</span>
                )}
              </div>
              {post.author.headline ? (
                <div className="truncate text-[11px] text-muted-foreground">
                  {truncate(post.author.headline, 60)}
                </div>
              ) : null}
            </div>
            <ScoreBadge score={score} />
          </div>

          {/* Body */}
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
            {truncate(post.text, 360)}
          </p>

          {/* AI status + topics + media indicators */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {post.analysis ? (
              <Badge variant="success" className="gap-1" title="Curated by the AI virality analyzer">
                <Zap className="h-3 w-3" /> AI pick · {Math.round(post.analysis.score)}
              </Badge>
            ) : (
              <Badge variant="warning" title="Saved by manual filters — AI virality analysis was not applied">
                AI skip
              </Badge>
            )}
            {post.hasVideo ? (
              <Badge variant="secondary" className="gap-1">
                <PlayCircle className="h-3 w-3" /> Video
              </Badge>
            ) : null}
            {post.matchedTopics.slice(0, 2).map((t) => (
              <Badge key={t} variant="accent">
                {t}
              </Badge>
            ))}
          </div>

          {/* Expandable image gallery — see what the post actually shows */}
          {post.images.length > 0 ? <ImageGallery images={post.images} /> : null}

          {/* Engagement */}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" /> {compactNumber(post.engagement.likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {compactNumber(post.engagement.comments)}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="h-3 w-3" /> {compactNumber(post.engagement.reposts)}
            </span>
            {post.timestampLabel ? <span>· {post.timestampLabel}</span> : null}
          </div>

          {/* Why the AI analyzer picked this post */}
          {post.analysis ? (
            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-primary/5 px-2 py-1.5 text-[11px] text-primary">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{post.analysis.reason}</span>
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {onGenerate ? (
              <Button size="sm" onClick={() => onGenerate(post)}>
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </Button>
            ) : null}
            <CopyButton value={post.text} label="Copy" />
            {openUrl ? (
              <Button asChild size="sm" variant="outline">
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={
                    opensExactPost
                      ? 'Open this post in a new tab'
                      : 'Direct post link unavailable — opening the author’s recent activity'
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {opensExactPost ? 'Open' : 'Find'}
                </a>
              </Button>
            ) : null}
            {onToggleSave ? (
              <Button
                size="sm"
                variant={post.saved ? 'secondary' : 'ghost'}
                onClick={() => onToggleSave(post)}
                title={post.saved ? 'Unsave' : 'Save'}
              >
                {post.saved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(post)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Collapsible image viewer. Defaults to collapsed (so cards stay scannable);
 * the user expands to actually see the post's images, which often carry more
 * meaning than the text. Each image opens the full-size original in a new tab.
 */
function ImageGallery({ images }: { images: string[] }) {
  const [open, setOpen] = React.useState(false);
  // Track images that fail to load so we can hide them gracefully.
  const [broken, setBroken] = React.useState<Set<number>>(new Set());
  const visible = images.filter((_, i) => !broken.has(i));

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        <ImageIcon className="h-3.5 w-3.5 text-primary" />
        {open ? 'Hide' : 'View'} {images.length} image{images.length === 1 ? '' : 's'}
        <ChevronDown
          className={cn('ml-auto h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className={cn(
            'mt-1.5 grid gap-1.5',
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {images.map((src, i) =>
            broken.has(i) ? null : (
              <a
                key={src + i}
                href={src}
                target="_blank"
                rel="noreferrer"
                title="Open full image in a new tab"
                className="group relative overflow-hidden rounded-md border bg-muted"
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-auto max-h-56 w-full object-cover transition-transform group-hover:scale-[1.02]"
                  onError={() =>
                    setBroken((prev) => {
                      const next = new Set(prev);
                      next.add(i);
                      return next;
                    })
                  }
                />
                <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            )
          )}
          {visible.length === 0 ? (
            <p className="col-span-full text-[11px] text-muted-foreground">
              Images couldn’t be loaded (the network may block hotlinking). Use
              <span className="font-medium"> Open</span> to view the post.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  // Blue tiers only: solid (high) → soft (mid) → outline (low).
  const variant = score >= 70 ? 'default' : score >= 50 ? 'accent' : 'outline';
  return (
    <Badge variant={variant} className="shrink-0 tabular-nums" title="Relevance score">
      {score}
    </Badge>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
