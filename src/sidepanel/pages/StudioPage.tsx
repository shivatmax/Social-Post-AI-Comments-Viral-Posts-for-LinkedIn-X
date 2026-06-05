import { Sparkles, Lightbulb } from 'lucide-react';
import type { Post, Settings } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneratePage } from './GeneratePage';
import { IdeasPage } from './IdeasPage';

interface StudioPageProps {
  settings: Settings | undefined;
  source: Post | null;
  onClearSource: () => void;
  subTab: string;
  onSubTabChange: (value: string) => void;
}

/**
 * Combined content studio: one top-level tab holding the two creation flows as
 * inner sub-tabs — "Create" (generate posts/comments) and "Ideas" (brainstorm).
 */
export function StudioPage({
  settings,
  source,
  onClearSource,
  subTab,
  onSubTabChange,
}: StudioPageProps) {
  return (
    <Tabs value={subTab} onValueChange={onSubTabChange} className="flex h-full flex-col">
      {/* Sticky sub-tab toggle */}
      <div className="shrink-0 border-b bg-background px-3 pb-2 pt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Create
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-1">
            <Lightbulb className="h-3.5 w-3.5" /> Ideas
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Scrollable body — only this scrolls */}
      <div className="relative min-h-0 flex-1">
        <TabsContent value="create" className="absolute inset-0 mt-0 overflow-y-auto px-3 py-2">
          <GeneratePage settings={settings} source={source} onClearSource={onClearSource} />
        </TabsContent>
        <TabsContent value="ideas" className="absolute inset-0 mt-0 overflow-y-auto px-3 py-2">
          <IdeasPage settings={settings} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
