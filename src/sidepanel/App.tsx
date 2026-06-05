import * as React from 'react';
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  Settings as SettingsIcon,
  RefreshCw,
  Moon,
  Sun,
  ArrowLeft,
  X,
} from 'lucide-react';
import type { Post } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/utils/cn';
import { useSettings } from './hooks/useSettings';
import { useScan } from './hooks/useScan';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { StudioPage } from './pages/StudioPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { settings, update } = useSettings();
  const { toast } = useToast();
  const scan = useScan(settings);
  const [tab, setTab] = React.useState('discover');
  const [studioSubTab, setStudioSubTab] = React.useState('create');
  const [generateSource, setGenerateSource] = React.useState<Post | null>(null);
  const [showDashboard, setShowDashboard] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const lastPhase = React.useRef(scan.phase);

  // Surface scan results as toasts.
  React.useEffect(() => {
    if (scan.phase === lastPhase.current) return;
    lastPhase.current = scan.phase;
    if (scan.phase === 'done' && scan.summary) {
      const s = scan.summary;
      if (s.analyzerError) {
        toast(
          `AI analysis failed (${s.analyzerError}). Kept top ${s.saved} by relevance.`,
          'error'
        );
      } else if (s.analyzed) {
        toast(
          `Scan complete · AI picked ${s.saved} viral post${s.saved === 1 ? '' : 's'} from ${s.considered} relevant (of ${s.scanned} scanned)`,
          s.saved > 0 ? 'success' : 'info'
        );
      } else {
        toast(
          `Scan complete · added ${s.saved} relevant post${s.saved === 1 ? '' : 's'} (AI skipped) from ${s.scanned} scanned`,
          s.saved > 0 ? 'success' : 'info'
        );
      }
    } else if (scan.phase === 'error' && scan.error) {
      toast(scan.error, 'error');
    }
  }, [scan.phase, scan.summary, scan.error, toast]);

  const handleGenerateFor = React.useCallback((post: Post) => {
    setGenerateSource(post);
    setStudioSubTab('create');
    setTab('create');
  }, []);

  const platformLabel =
    scan.tab?.platform === 'linkedin'
      ? 'LinkedIn'
      : scan.tab?.platform === 'twitter'
        ? 'X / Twitter'
        : null;

  const busy = scan.phase === 'scanning' || scan.phase === 'analyzing';
  const progress = scan.progress;
  const progressPct =
    progress && progress.target > 0
      ? Math.min(100, Math.round((progress.collected / progress.target) * 100))
      : 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-1.5 border-b px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-foreground text-sm font-bold text-primary-foreground shadow-sm">
          S
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold">Social Post</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {platformLabel ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {platformLabel} feed detected
              </span>
            ) : (
              'Open a LinkedIn or X feed to scan'
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Dashboard & stats"
          onClick={() => setShowDashboard(true)}
        >
          <LayoutDashboard className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Toggle dark mode"
          onClick={() => settings && update({ darkMode: !settings.darkMode })}
        >
          {settings?.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          onClick={scan.scan}
          disabled={busy || !scan.tab?.scannable}
          title={scan.tab?.scannable ? 'Scan this feed' : 'Not a LinkedIn/X tab'}
        >
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {scan.phase === 'scanning'
            ? 'Scan…'
            : scan.phase === 'analyzing'
              ? 'AI…'
              : 'Scan'}
        </Button>
      </header>

      {/* Two-section tabs: Discover + Create */}
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-3 pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover" className="gap-1.5">
              <Compass className="h-4 w-4" /> Discover
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Create
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Each page owns its own sticky header + scroll body. */}
        <div className="relative min-h-0 flex-1">
          <TabsContent value="discover" className="absolute inset-0 mt-0">
            <DiscoverPage onGenerate={handleGenerateFor} onScan={scan.scan} />
          </TabsContent>
          <TabsContent value="create" className="absolute inset-0 mt-0">
            <StudioPage
              settings={settings}
              source={generateSource}
              onClearSource={() => setGenerateSource(null)}
              subTab={studioSubTab}
              onSubTabChange={setStudioSubTab}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Scan progress footer */}
      {busy ? (
        <div className="shrink-0 space-y-1 border-t px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Spinner className="h-3 w-3" />
            {scan.phase === 'scanning' ? (
              <span>
                Scrolling {platformLabel ?? 'feed'} — collecting posts
                {progress ? (
                  <span className="font-semibold text-foreground">
                    {' '}
                    {progress.collected}/{progress.target}
                  </span>
                ) : null}
              </span>
            ) : (
              <span>Analyzing posts for virality…</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full bg-primary transition-all duration-300',
                scan.phase === 'analyzing' && 'animate-pulse'
              )}
              style={{ width: scan.phase === 'analyzing' ? '100%' : `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Dashboard overlay — slides in from the right */}
      <Overlay
        open={showDashboard}
        from="right"
        title="Dashboard"
        leading={
          <Button variant="ghost" size="icon" onClick={() => setShowDashboard(false)} title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <DashboardPage onScan={scan.scan} scanning={scan.phase === 'scanning'} />
      </Overlay>

      {/* Settings overlay — slides up from the bottom */}
      <Overlay
        open={showSettings}
        from="bottom"
        title="Settings"
        trailing={
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} title="Close">
            <X className="h-4 w-4" />
          </Button>
        }
      >
        <SettingsPage settings={settings} update={update} />
      </Overlay>

      {/* Floating Settings button (hidden while the dashboard is open) */}
      {!showDashboard ? (
        <Button
          size="icon"
          onClick={() => setShowSettings((v) => !v)}
          title={showSettings ? 'Close settings' : 'Open settings'}
          className={cn(
            'absolute bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg transition-transform',
            showSettings && 'rotate-90'
          )}
        >
          {showSettings ? <X className="h-5 w-5" /> : <SettingsIcon className="h-5 w-5" />}
        </Button>
      ) : null}
    </div>
  );
}

/** A full-panel sliding overlay with its own header + scrollable body. */
function Overlay({
  open,
  from,
  title,
  leading,
  trailing,
  children,
}: {
  open: boolean;
  from: 'right' | 'bottom';
  title: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hidden = from === 'right' ? 'translate-x-full' : 'translate-y-full';
  return (
    <div
      role="dialog"
      aria-hidden={!open}
      className={cn(
        'absolute inset-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-out',
        open ? 'translate-x-0 translate-y-0' : `pointer-events-none ${hidden}`
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        {leading}
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-auto">{trailing}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
