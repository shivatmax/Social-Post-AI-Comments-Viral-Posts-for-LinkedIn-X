import * as React from 'react';
import { Search, Compass, Download, Sparkles, X, CheckSquare, Trash2 } from 'lucide-react';
import type { Platform, Post } from '@/types';
import { useDiscoverPosts } from '../hooks/usePosts';
import { useSettings } from '../hooks/useSettings';
import { PostCard } from '@/components/PostCard';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { postRepository } from '@/storage';
import { generatePostBundle } from '@/services/ai';
import { providerHasKey, providerLabel } from '@/services/ai/hasKey';
import { downloadJson } from '@/utils/export';

interface DiscoverPageProps {
  onGenerate: (post: Post) => void;
  onScan: () => void;
}

export function DiscoverPage({ onGenerate, onScan }: DiscoverPageProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [savedOnly, setSavedOnly] = React.useState(false);
  const [platform, setPlatform] = React.useState<Platform | 'all'>('all');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = React.useState(false);

  const posts = useDiscoverPosts(savedOnly);

  const filtered = React.useMemo(() => {
    let list = posts ?? [];
    if (platform !== 'all') list = list.filter((p) => p.platform === platform);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.matchedTopics.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [posts, platform, query]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });

  const bulkDelete = async () => {
    const ids = filtered.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected post${ids.length === 1 ? '' : 's'}? This cannot be undone.`))
      return;
    await postRepository.removeMany(ids);
    setSelected(new Set());
    toast(`Deleted ${ids.length} post${ids.length === 1 ? '' : 's'}`, 'success');
  };

  const toggleSave = async (post: Post) => {
    await postRepository.setSaved(post.id, !post.saved);
  };

  const remove = async (post: Post) => {
    await postRepository.remove(post.id);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(post.id);
      return next;
    });
  };

  const exportJson = () => {
    downloadJson(`social-post-discover-${Date.now()}.json`, filtered);
    toast(`Exported ${filtered.length} posts`, 'success');
  };

  const bulkGenerate = async () => {
    if (!settings) return;
    if (!providerHasKey(settings)) {
      toast(`Add your ${providerLabel(settings)} API key in Settings first.`, 'error');
      return;
    }
    const targets = filtered.filter((p) => selected.has(p.id));
    if (targets.length === 0) return;
    setBulkRunning(true);
    let ok = 0;
    for (const post of targets) {
      try {
        await generatePostBundle({ settings, source: post });
        ok++;
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Generation failed', 'error');
        break;
      }
    }
    setBulkRunning(false);
    setSelected(new Set());
    if (ok > 0) toast(`Generated ${ok} post bundle${ok === 1 ? '' : 's'} — see Generate tab history`, 'success');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Sticky top: search, filters, bulk actions, select-all */}
      <div className="shrink-0 space-y-2 border-b bg-background px-3 pb-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, authors, topics…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform | 'all')}
            className="h-8 text-xs"
          >
            <option value="all">All platforms</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">X / Twitter</option>
          </Select>
          <Button
            size="sm"
            variant={savedOnly ? 'secondary' : 'outline'}
            onClick={() => setSavedOnly((v) => !v)}
          >
            {savedOnly ? 'Saved' : 'All'}
          </Button>
          <Button size="sm" variant="outline" onClick={exportJson} title="Export as JSON">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-accent/50 px-2 py-1.5 text-xs">
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            <span className="flex-1 whitespace-nowrap">{selected.size} selected</span>
            <Button size="sm" onClick={bulkGenerate} disabled={bulkRunning}>
              {bulkRunning ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate
            </Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={bulkRunning}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setSelected(new Set())} title="Clear selection">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {posts && filtered.length > 0 ? (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <label className="flex cursor-pointer select-none items-center gap-1.5">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all posts"
              />
              <span>
                {selected.size > 0 ? `${selected.size} selected · ` : ''}
                {filtered.length} posts
              </span>
            </label>
            <Badge variant="outline">sorted by relevance</Badge>
          </div>
        ) : null}
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {posts === undefined ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={
              query || savedOnly || platform !== 'all'
                ? 'No matching posts'
                : 'Nothing discovered yet'
            }
            description={
              query || savedOnly || platform !== 'all'
                ? 'Try clearing the filters or run another scan.'
                : 'Run a scan on your LinkedIn or X feed to populate this list.'
            }
            action={
              <Button size="sm" onClick={onScan}>
                Scan Feed
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                selected={selected.has(post.id)}
                onToggleSelect={toggleSelect}
                onGenerate={onGenerate}
                onToggleSave={toggleSave}
                onRemove={remove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
