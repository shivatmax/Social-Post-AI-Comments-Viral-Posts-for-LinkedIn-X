import * as React from 'react';
import {
  KeyRound,
  Sparkles,
  Tags,
  SlidersHorizontal,
  Shield,
  Database,
  Trash2,
  Download,
  ExternalLink,
  RotateCcw,
  ScanSearch,
} from 'lucide-react';
import { providerHasKey, providerLabel } from '@/services/ai/hasKey';
import type {
  ContentFilterKey,
  GenerationTone,
  Platform,
  Settings,
} from '@/types';
import { ChipsInput } from '@/components/ChipsInput';
import { SectionTitle } from '@/components/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  db,
  postRepository,
  generatedPostRepository,
  historyRepository,
  topicRepository,
  settingsRepository,
} from '@/storage';
import { downloadJson } from '@/utils/export';

interface SettingsPageProps {
  settings: Settings | undefined;
  update: (patch: Partial<Settings>) => Promise<Settings>;
}

/** Models grouped by provider so the select stays sensible when switching. */
const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: [
    'gemini-3-flash',
    'gemini-3.5-flash',
    'gemini-3-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
  ],
  openai: [
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini',
  ],
  anthropic: [
    'claude-opus-4-8',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
    'claude-opus-4-7',
    'claude-opus-4-6',
  ],
};

const TONES: GenerationTone[] = [
  'professional',
  'casual',
  'bold',
  'analytical',
  'storyteller',
  'witty',
];

const FILTER_LABELS: Record<ContentFilterKey, string> = {
  politics: 'Politics',
  religion: 'Religion',
  nsfw: 'NSFW',
  spam: 'Spam',
  giveaways: 'Giveaways',
  jobPosts: 'Job posts',
};

export function SettingsPage({ settings, update }: SettingsPageProps) {
  const { toast } = useToast();
  // Local copies for free-text / numeric fields (commit on blur).
  const [draft, setDraft] = React.useState<Settings | null>(settings ?? null);

  React.useEffect(() => {
    setDraft(settings ?? null);
  }, [settings]);

  if (!settings || !draft) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const setLocal = (patch: Partial<Settings>) => setDraft({ ...draft, ...patch });
  const commit = (patch: Partial<Settings>) => void update(patch);

  const exportAll = async () => {
    // Strip API keys from the backup so secrets never get written to disk.
    const full = await settingsRepository.get();
    const safeSettings: Settings = {
      ...full,
      geminiApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
    };
    const dump = {
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      posts: await postRepository.all(),
      generatedPosts: await generatedPostRepository.all(),
      topics: await topicRepository.all(),
      history: await historyRepository.recent(500),
    };
    downloadJson(`social-post-backup-${Date.now()}.json`, dump);
    toast('Exported backup (API keys excluded)', 'success');
  };

  return (
    <div className="space-y-4 pt-2">
      {/* AI */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> AI Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Provider selector */}
          <div>
            <Label>Provider</Label>
            <Select
              value={draft.aiProvider}
              className="mt-1 capitalize"
              onChange={(e) => {
                const p = e.target.value as Settings['aiProvider'];
                const defaultModel = PROVIDER_MODELS[p]?.[0] ?? '';
                // Switch both the generation and analyzer models to the new provider.
                const patch = {
                  aiProvider: p,
                  aiModel: defaultModel,
                  analyzerModel: defaultModel,
                };
                setLocal(patch);
                commit(patch);
              }}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI (+ compatible)</option>
              <option value="anthropic">Anthropic Claude</option>
            </Select>
          </div>

          {/* Model selector — filtered to the active provider */}
          <div>
            <Label>Model</Label>
            <Select
              value={draft.aiModel}
              className="mt-1"
              onChange={(e) => {
                setLocal({ aiModel: e.target.value });
                commit({ aiModel: e.target.value });
              }}
            >
              {(PROVIDER_MODELS[draft.aiProvider] ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {/* Always render the current value even if it's a custom one */}
              {!PROVIDER_MODELS[draft.aiProvider]?.includes(draft.aiModel) &&
                draft.aiModel ? (
                <option value={draft.aiModel}>{draft.aiModel} (custom)</option>
              ) : null}
            </Select>
          </div>

          {/* Gemini key */}
          {draft.aiProvider === 'gemini' ? (
            <div>
              <Label className="flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Gemini API key
              </Label>
              <Input
                type="password"
                value={draft.geminiApiKey}
                placeholder="AIza…"
                className="mt-1"
                onChange={(e) => setLocal({ geminiApiKey: e.target.value })}
                onBlur={() => commit({ geminiApiKey: draft.geminiApiKey.trim() })}
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Get a free key from Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}

          {/* OpenAI key + custom base URL */}
          {draft.aiProvider === 'openai' ? (
            <>
              <div>
                <Label className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> OpenAI API key
                </Label>
                <Input
                  type="password"
                  value={draft.openaiApiKey}
                  placeholder="sk-…"
                  className="mt-1"
                  onChange={(e) => setLocal({ openaiApiKey: e.target.value })}
                  onBlur={() => commit({ openaiApiKey: draft.openaiApiKey.trim() })}
                />
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Get a key from OpenAI Platform <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <Label>Custom base URL (optional)</Label>
                <Input
                  value={draft.openaiBaseUrl}
                  placeholder="https://api.openai.com/v1"
                  className="mt-1"
                  onChange={(e) => setLocal({ openaiBaseUrl: e.target.value })}
                  onBlur={() => commit({ openaiBaseUrl: draft.openaiBaseUrl.trim() })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  For OpenAI-compatible APIs: Ollama, LM Studio, Azure, Groq, etc.
                </p>
              </div>
            </>
          ) : null}

          {/* Anthropic key + custom base URL */}
          {draft.aiProvider === 'anthropic' ? (
            <>
              <div>
                <Label className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Anthropic API key
                </Label>
                <Input
                  type="password"
                  value={draft.anthropicApiKey}
                  placeholder="sk-ant-…"
                  className="mt-1"
                  onChange={(e) => setLocal({ anthropicApiKey: e.target.value })}
                  onBlur={() => commit({ anthropicApiKey: draft.anthropicApiKey.trim() })}
                />
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Get a key from Anthropic Console <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <Label>Custom base URL (optional)</Label>
                <Input
                  value={draft.anthropicBaseUrl}
                  placeholder="https://api.anthropic.com"
                  className="mt-1"
                  onChange={(e) => setLocal({ anthropicBaseUrl: e.target.value })}
                  onBlur={() => commit({ anthropicBaseUrl: draft.anthropicBaseUrl.trim() })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  For proxies or on-premise Claude deployments.
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* AI Analyzer — only available once a provider key is set */}
      {providerHasKey(draft) ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <ScanSearch className="h-4 w-4 text-primary" /> AI Virality Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              A second pass on the posts that survive your manual filters. The AI reads
              each one (text, engagement, images, link) and keeps only the few with real{' '}
              <strong>viral potential</strong> — each gets an <strong>AI pick</strong> badge
              with a virality score. Off when no key is set (posts show an{' '}
              <strong>AI skip</strong> badge instead).
            </p>

            <ToggleRow
              label="Enable AI virality analysis"
              checked={draft.analyzerEnabled}
              onChange={(on) => {
                setLocal({ analyzerEnabled: on });
                commit({ analyzerEnabled: on });
              }}
            />

            {draft.analyzerEnabled ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Analyzer model</Label>
                    <Select
                      value={draft.analyzerModel}
                      className="mt-1"
                      onChange={(e) => {
                        setLocal({ analyzerModel: e.target.value });
                        commit({ analyzerModel: e.target.value });
                      }}
                    >
                      {(PROVIDER_MODELS[draft.aiProvider] ?? []).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      {!PROVIDER_MODELS[draft.aiProvider]?.includes(draft.analyzerModel) &&
                      draft.analyzerModel ? (
                        <option value={draft.analyzerModel}>
                          {draft.analyzerModel} (custom)
                        </option>
                      ) : null}
                    </Select>
                  </div>
                  <NumberField
                    label="Max viral picks (1-10)"
                    value={draft.analyzerMaxResults}
                    min={1}
                    max={10}
                    onLocal={(analyzerMaxResults) => setLocal({ analyzerMaxResults })}
                    onCommit={(analyzerMaxResults) => commit({ analyzerMaxResults })}
                  />
                </div>

                <div>
                  <Label>What kind of posts go viral for you?</Label>
                  <Textarea
                    value={draft.analyzerPrompt}
                    className="mt-1 min-h-[88px]"
                    placeholder="e.g. Sharp, contrarian takes on AI agents and cybersecurity; strong hooks; useful how-tos. Reject product launches, hiring posts, and motivational filler."
                    onChange={(e) => setLocal({ analyzerPrompt: e.target.value })}
                    onBlur={() => commit({ analyzerPrompt: draft.analyzerPrompt })}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Uses your <strong>{providerLabel(draft)}</strong> key. Each scan: your filters
                  trim ~{draft.scanTargetCount} posts down to the relevant ones, then the AI keeps
                  up to <strong>{draft.analyzerMaxResults}</strong> with the highest virality.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Writing style */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Writing style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft.writingStyle}
            onChange={(e) => setLocal({ writingStyle: e.target.value })}
            onBlur={() => commit({ writingStyle: draft.writingStyle })}
            placeholder="Describe your voice. e.g. Write like an experienced AI engineer…"
          />
          <div>
            <Label>Default tone</Label>
            <Select
              value={draft.defaultTone}
              className="mt-1 capitalize"
              onChange={(e) => {
                setLocal({ defaultTone: e.target.value as GenerationTone });
                commit({ defaultTone: e.target.value as GenerationTone });
              }}
            >
              {TONES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Tags className="h-4 w-4 text-primary" /> Topics & keywords
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Topics</Label>
            <div className="mt-1">
              <ChipsInput
                values={draft.topics}
                onChange={(topics) => {
                  setLocal({ topics });
                  commit({ topics });
                  void topicRepository.syncFromList(topics);
                }}
                placeholder="Add a topic, press Enter"
              />
            </div>
          </div>
          <div>
            <Label>Extra keywords (boost)</Label>
            <div className="mt-1">
              <ChipsInput
                values={draft.keywords}
                variant="secondary"
                onChange={(keywords) => {
                  setLocal({ keywords });
                  commit({ keywords });
                }}
                placeholder="Add a keyword"
              />
            </div>
          </div>
          <div>
            <Label>Blacklist keywords (reject)</Label>
            <div className="mt-1">
              <ChipsInput
                values={draft.blacklistKeywords}
                variant="warning"
                onChange={(blacklistKeywords) => {
                  setLocal({ blacklistKeywords });
                  commit({ blacklistKeywords });
                }}
                placeholder="Add a blacklist term"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan tuning */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Scan & relevance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Min engagement"
              value={draft.minEngagement}
              onLocal={(minEngagement) => setLocal({ minEngagement })}
              onCommit={(minEngagement) => commit({ minEngagement })}
            />
            <NumberField
              label="Max age (hours)"
              value={draft.maxPostAgeHours}
              onLocal={(maxPostAgeHours) => setLocal({ maxPostAgeHours })}
              onCommit={(maxPostAgeHours) => commit({ maxPostAgeHours })}
            />
            <NumberField
              label="Posts per scan"
              value={draft.scanTargetCount}
              min={5}
              max={80}
              onLocal={(scanTargetCount) => setLocal({ scanTargetCount })}
              onCommit={(scanTargetCount) => commit({ scanTargetCount })}
            />
            <NumberField
              label="Max scroll rounds"
              value={draft.scanScrollRounds}
              min={1}
              max={60}
              onLocal={(scanScrollRounds) => setLocal({ scanScrollRounds })}
              onCommit={(scanScrollRounds) => commit({ scanScrollRounds })}
            />
            <NumberField
              label={`Relevance threshold (${draft.relevanceThreshold})`}
              value={draft.relevanceThreshold}
              min={0}
              max={100}
              onLocal={(relevanceThreshold) => setLocal({ relevanceThreshold })}
              onCommit={(relevanceThreshold) => commit({ relevanceThreshold })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {providerHasKey(draft) && draft.analyzerEnabled
              ? 'These filters trim each scan to the relevant posts; the AI Virality Analyzer then makes the final pick.'
              : 'Posts scoring below the threshold are dropped. Lower it to keep more, raise it to be stricter.'}
          </p>
          <div className="space-y-2">
            <Label>Platforms</Label>
            {(['linkedin', 'twitter'] as Platform[]).map((p) => (
              <ToggleRow
                key={p}
                label={p === 'linkedin' ? 'LinkedIn' : 'X / Twitter'}
                checked={draft.platforms.includes(p)}
                onChange={(on) => {
                  const platforms = on
                    ? [...new Set([...draft.platforms, p])]
                    : draft.platforms.filter((x) => x !== p);
                  setLocal({ platforms });
                  commit({ platforms });
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Shield className="h-4 w-4 text-primary" /> Content filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.keys(FILTER_LABELS) as ContentFilterKey[]).map((key) => (
            <ToggleRow
              key={key}
              label={`Exclude ${FILTER_LABELS[key]}`}
              checked={draft.contentFilters[key]}
              onChange={(on) => {
                const contentFilters = { ...draft.contentFilters, [key]: on };
                setLocal({ contentFilters });
                commit({ contentFilters });
              }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Appearance + data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Database className="h-4 w-4 text-primary" /> Appearance & data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Dark mode"
            checked={draft.darkMode}
            onChange={(on) => {
              setLocal({ darkMode: on });
              commit({ darkMode: on });
            }}
          />
          <div>
            <ToggleRow
              label="In-page AI comment button"
              checked={draft.inlineCommentEnabled}
              onChange={(on) => {
                setLocal({ inlineCommentEnabled: on });
                commit({ inlineCommentEnabled: on });
              }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Adds a ✦ button inside LinkedIn/X comment boxes that writes a short comment in
              your voice. Reload the feed tab after changing this.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={exportAll}>
              <Download className="h-3.5 w-3.5" /> Backup JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm('Delete ALL scanned posts? This cannot be undone.')) return;
                await postRepository.clear();
                toast('Cleared scanned posts', 'success');
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear posts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm('Delete all generated posts and history?')) return;
                await generatedPostRepository.clear();
                await historyRepository.clear();
                toast('Cleared generations', 'success');
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear generations
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={async () => {
                if (!confirm('Reset all settings to defaults?')) return;
                await settingsRepository.reset();
                toast('Settings reset', 'success');
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset settings
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Everything is stored locally in your browser (IndexedDB). Nothing is sent anywhere
            except your prompts to Google when you generate.
          </p>
        </CardContent>
      </Card>

      <SectionTitle title="" description={`Local DB: ${db.name}`} />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onLocal,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onLocal: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        className="mt-1"
        onChange={(e) => onLocal(clampNum(Number(e.target.value), min, max))}
        onBlur={(e) => onCommit(clampNum(Number(e.target.value), min, max))}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function clampNum(n: number, min?: number, max?: number): number {
  if (Number.isNaN(n)) return min ?? 0;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}
