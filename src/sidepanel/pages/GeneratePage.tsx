import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles, X, MessageSquarePlus, KeyRound, Trash2, Download } from 'lucide-react';
import type { GenerationResult, GenerationTone, Post, Settings } from '@/types';
import { providerHasKey, providerLabel } from '@/services/ai/hasKey';
import { GeneratedPostView } from '@/components/GeneratedPostView';
import { SectionTitle } from '@/components/SectionTitle';
import { CopyButton } from '@/components/CopyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  generatePostBundle,
  generateComments,
  type AgentSuggestedComments,
} from '@/services/ai';
import { db, generatedPostRepository } from '@/storage';
import { truncate } from '@/utils/format';
import { timeAgo } from '@/utils/dates';
import { downloadJson } from '@/utils/export';
import { cn } from '@/utils/cn';

interface GeneratePageProps {
  settings: Settings | undefined;
  source: Post | null;
  onClearSource: () => void;
}

const TONES: GenerationTone[] = [
  'professional',
  'casual',
  'bold',
  'analytical',
  'storyteller',
  'witty',
];

export function GeneratePage({ settings, source, onClearSource }: GeneratePageProps) {
  const { toast } = useToast();
  const [instructions, setInstructions] = React.useState('');
  const [tone, setTone] = React.useState<GenerationTone>('professional');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<GenerationResult | null>(null);
  const [comments, setComments] = React.useState<AgentSuggestedComments | null>(null);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [selectedGen, setSelectedGen] = React.useState<Set<number>>(new Set());

  const history = useLiveQuery(() => generatedPostRepository.all(), []);

  const toggleGen = (id: number) =>
    setSelectedGen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const genIds = (history ?? []).map((g) => g.id).filter((id): id is number => id != null);
  const allGenSelected = genIds.length > 0 && genIds.every((id) => selectedGen.has(id));

  const toggleAllGen = () =>
    setSelectedGen(() => (allGenSelected ? new Set() : new Set(genIds)));

  const bulkDeleteGen = async () => {
    const ids = [...selectedGen];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} generated post${ids.length === 1 ? '' : 's'}? This cannot be undone.`))
      return;
    await generatedPostRepository.removeMany(ids);
    setSelectedGen(new Set());
    toast(`Deleted ${ids.length} generated post${ids.length === 1 ? '' : 's'}`, 'success');
  };

  React.useEffect(() => {
    if (settings) setTone(settings.defaultTone);
  }, [settings?.defaultTone]);

  const hasKey = providerHasKey(settings);
  const provName = providerLabel(settings);

  const generate = async () => {
    if (!settings) return;
    if (!hasKey) {
      toast(`Add your ${provName} API key in Settings first.`, 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await generatePostBundle({
        settings,
        source,
        tone,
        customInstructions: instructions,
      });
      setResult(res);
      toast('Generated a fresh post bundle', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const suggestComments = async () => {
    if (!settings || !source) return;
    if (!hasKey) {
      toast(`Add your ${provName} API key in Settings first.`, 'error');
      return;
    }
    setCommentsLoading(true);
    try {
      setComments(await generateComments(settings, source));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate comments', 'error');
    } finally {
      setCommentsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasKey ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Add your <strong>{provName}</strong> API key in <strong>Settings</strong> to enable AI
              generation. Everything stays on your device.
            </span>
          </CardContent>
        </Card>
      ) : null}

      {/* Source */}
      {source ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Inspired by · {source.author.name}
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={onClearSource} title="Clear source">
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs leading-relaxed text-foreground/80">
              {truncate(source.text, 220)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          Writing from scratch. Pick a post from <strong>Discover</strong> to generate from a
          source, or just add instructions below.
        </p>
      )}

      {/* Controls */}
      <div className="space-y-2">
        <div>
          <Label>Custom instructions</Label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={'e.g. "Write like an experienced AI engineer. Open with a contrarian take."'}
            className="mt-1"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Tone</Label>
            <Select
              value={tone}
              onChange={(e) => setTone(e.target.value as GenerationTone)}
              className="mt-1 h-9 capitalize"
            >
              {TONES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={generate} disabled={loading} className="flex-1">
            {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating…' : 'Generate Post'}
          </Button>
        </div>
        {source ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={suggestComments}
            disabled={commentsLoading}
          >
            {commentsLoading ? <Spinner /> : <MessageSquarePlus className="h-4 w-4" />}
            Suggest comments for this post
          </Button>
        ) : null}
      </div>

      {/* Suggested comments */}
      {comments ? <SuggestedComments comments={comments} /> : null}

      {/* Result */}
      {result ? (
        <div>
          <SectionTitle title="Generated bundle" />
          <GeneratedPostView result={result} />
        </div>
      ) : null}

      {/* History */}
      {history && history.length > 0 ? (
        <div className="pt-2">
          <SectionTitle
            title="Recent generations"
            action={
              <div className="flex items-center gap-1">
                {selectedGen.size > 0 ? (
                  <Button size="sm" variant="destructive" onClick={bulkDeleteGen}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedGen.size})
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    downloadJson(`social-post-generations-${Date.now()}.json`, history)
                  }
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            }
          />

          {/* Select-all row */}
          <label className="mb-1.5 flex cursor-pointer select-none items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
              checked={allGenSelected}
              onChange={toggleAllGen}
              aria-label="Select all generations"
            />
            <span>
              {selectedGen.size > 0 ? `${selectedGen.size} selected · ` : ''}
              {history.length} total
            </span>
          </label>

          <div className="space-y-1.5">
            {history.map((g) => (
              <div
                key={g.id}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs',
                  g.id != null && selectedGen.has(g.id) && 'ring-1 ring-primary'
                )}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 shrink-0 accent-[hsl(var(--primary))]"
                  checked={g.id != null && selectedGen.has(g.id)}
                  onChange={() => g.id != null && toggleGen(g.id)}
                  aria-label="Select generation"
                />
                <button
                  className="flex-1 truncate text-left hover:underline"
                  onClick={() => setResult(g)}
                  title="View this generation"
                >
                  {g.sourceSummary ? truncate(g.sourceSummary, 46) : truncate(g.linkedinPost, 46)}
                </button>
                <Badge variant="secondary" className="capitalize">
                  {g.tone}
                </Badge>
                <span className="hidden text-[10px] text-muted-foreground sm:inline">
                  {g.createdAt ? timeAgo(g.createdAt) : ''}
                </span>
                <CopyButton value={g.linkedinPost} size="icon" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => g.id != null && db.generatedPosts.delete(g.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestedComments({ comments }: { comments: AgentSuggestedComments }) {
  const items: [string, string][] = [
    ['Early comment', comments.earlyComment],
    ['Engagement booster', comments.engagementBooster],
    ['Follow-up', comments.followupComment],
    ['Audience question', comments.audienceQuestion],
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Suggested comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/60 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <CopyButton value={value} size="icon" />
              </div>
              <p className="text-xs leading-relaxed">{value}</p>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
