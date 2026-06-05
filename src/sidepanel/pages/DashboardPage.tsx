import * as React from 'react';
import {
  FileStack,
  CalendarClock,
  TrendingUp,
  Users,
  RefreshCw,
  Database,
} from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { StatCard } from '@/components/StatCard';
import { SectionTitle } from '@/components/SectionTitle';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { isToday } from '@/utils/dates';
import { compactNumber } from '@/utils/format';

interface DashboardPageProps {
  onScan: () => void;
  scanning: boolean;
}

export function DashboardPage({ onScan, scanning }: DashboardPageProps) {
  const posts = usePosts();

  const stats = React.useMemo(() => {
    const list = posts ?? [];
    const today = list.filter((p) => isToday(p.scannedAt)).length;
    const topicCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    let engagement = 0;
    for (const p of list) {
      engagement += p.engagement.likes + p.engagement.comments + p.engagement.reposts;
      for (const t of p.matchedTopics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
      const a = p.author.name;
      if (a) sourceCounts.set(a, (sourceCounts.get(a) ?? 0) + 1);
    }
    const sortDesc = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      total: list.length,
      today,
      engagement,
      topTopics: sortDesc(topicCounts),
      topSources: sortDesc(sourceCounts),
    };
  }, [posts]);

  if (posts === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={Database}
          title="No posts yet"
          description="Open your LinkedIn or X feed in a tab, then run a scan to start discovering trending posts on your topics."
          action={
            <Button onClick={onScan} disabled={scanning}>
              {scanning ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Scan Feed
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total posts" value={stats.total} icon={FileStack} />
        <StatCard label="Today" value={stats.today} icon={CalendarClock} />
        <StatCard
          label="Total engagement"
          value={compactNumber(stats.engagement)}
          icon={TrendingUp}
        />
        <StatCard label="Sources" value={stats.topSources.length} icon={Users} />
      </div>

      <div>
        <SectionTitle title="Top categories" description="Most matched topics" />
        {stats.topTopics.length === 0 ? (
          <p className="text-xs text-muted-foreground">No topic matches yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stats.topTopics.map(([topic, count]) => (
              <Badge key={topic} variant="accent" className="gap-1">
                {topic} <span className="opacity-60">· {count}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle title="Top sources" description="Authors appearing most" />
        <Card>
          <CardContent className="space-y-1 p-2">
            {stats.topSources.map(([name, count], i) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/60"
              >
                <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate">{name}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
