import * as React from 'react';
import {
  Lightbulb,
  TrendingUp,
  Flame,
  GraduationCap,
  BookOpen,
  LineChart,
  Megaphone,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import type { IdeaBundle, Settings } from '@/types';
import { providerHasKey, providerLabel } from '@/services/ai/hasKey';
import { usePosts } from '../hooks/usePosts';
import { EmptyState } from '@/components/EmptyState';
import { SectionTitle } from '@/components/SectionTitle';
import { CopyButton } from '@/components/CopyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { generateIdeas } from '@/services/ai';
import type { LucideIcon } from 'lucide-react';

interface IdeasPageProps {
  settings: Settings | undefined;
}

const BUCKETS: { key: keyof IdeaBundle; label: string; icon: LucideIcon }[] = [
  { key: 'contentIdeas', label: 'Content Ideas', icon: Lightbulb },
  { key: 'trendingThemes', label: 'Trending Themes', icon: TrendingUp },
  { key: 'contrarianOpinions', label: 'Contrarian Opinions', icon: Flame },
  { key: 'educationalPosts', label: 'Educational Posts', icon: GraduationCap },
  { key: 'personalStories', label: 'Personal Stories', icon: BookOpen },
  { key: 'industryAnalysis', label: 'Industry Analysis', icon: LineChart },
];

export function IdeasPage({ settings }: IdeasPageProps) {
  const { toast } = useToast();
  const posts = usePosts();
  const [loading, setLoading] = React.useState(false);
  const [bundle, setBundle] = React.useState<IdeaBundle | null>(null);

  const hasKey = providerHasKey(settings);
  const provName = providerLabel(settings);

  const run = async () => {
    if (!settings) return;
    if (!hasKey) {
      toast(`Add your ${provName} API key in Settings first.`, 'error');
      return;
    }
    setLoading(true);
    try {
      const digests = (posts ?? [])
        .slice()
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 12)
        .map((p) => `${p.author.name}: ${p.text}`);
      setBundle(await generateIdeas(settings, digests));
      toast('Fresh ideas ready', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate ideas', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasKey ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Add your <strong>{provName}</strong> API key in <strong>Settings</strong> to brainstorm content
              ideas.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <SectionTitle
        title="Idea engine"
        description={
          posts && posts.length > 0
            ? `Grounded in your ${Math.min(posts.length, 12)} most relevant scanned posts`
            : 'Based on your configured topics'
        }
        action={
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
            {bundle ? 'Refresh' : 'Generate'}
          </Button>
        }
      />

      {!bundle && !loading ? (
        <EmptyState
          icon={Megaphone}
          title="No ideas yet"
          description="Generate content ideas, trending themes, contrarian takes, and more — tailored to your topics and what you've scanned."
          action={
            <Button size="sm" onClick={run} disabled={!hasKey}>
              <Lightbulb className="h-4 w-4" /> Generate Ideas
            </Button>
          }
        />
      ) : null}

      {loading && !bundle ? (
        <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground">
          <Spinner className="h-5 w-5" />
          Brainstorming…
        </div>
      ) : null}

      {bundle
        ? BUCKETS.map(({ key, label, icon: Icon }) => {
            const items = bundle[key];
            if (!items || items.length === 0) return null;
            return (
              <Card key={key}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Icon className="h-4 w-4 text-primary" /> {label}
                  </CardTitle>
                  <CopyButton value={items.map((i) => `• ${i}`).join('\n')} label="Copy" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {items.map((idea, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs leading-relaxed"
                    >
                      <span className="flex-1">{idea}</span>
                      <CopyButton value={idea} size="icon" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        : null}
    </div>
  );
}
