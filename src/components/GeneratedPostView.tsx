import { Linkedin, MessageSquare, Image as ImageIcon, Hash, MessagesSquare } from 'lucide-react';
import type { GenerationResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';

interface GeneratedPostViewProps {
  result: GenerationResult;
}

/** Renders an AI-generated bundle with per-section copy buttons. */
export function GeneratedPostView({ result }: GeneratedPostViewProps) {
  return (
    <div className="space-y-3">
      <Block
        icon={<Linkedin className="h-4 w-4 text-primary" />}
        title="LinkedIn Post"
        body={result.linkedinPost}
      />
      <Block
        icon={<XLogo />}
        title="X / Twitter Post"
        body={result.twitterPost}
        meta={`${result.twitterPost.length}/280`}
      />
      <Block
        icon={<ImageIcon className="h-4 w-4 text-primary" />}
        title="Image Prompt"
        body={result.imagePrompt}
      />
      <Block
        icon={<MessageSquare className="h-4 w-4 text-primary" />}
        title="First Comment"
        body={result.firstComment}
      />

      {result.followupComments.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <MessagesSquare className="h-4 w-4 text-primary" /> Follow-up Comments
            </CardTitle>
            <CopyButton value={result.followupComments.join('\n\n')} label="Copy all" />
          </CardHeader>
          <CardContent className="space-y-2">
            {result.followupComments.map((c, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-muted/60 p-2 text-xs">
                <span className="flex-1 whitespace-pre-wrap leading-relaxed">{c}</span>
                <CopyButton value={c} size="icon" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.hashtags.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Hash className="h-4 w-4 text-primary" /> Hashtags
            </CardTitle>
            <CopyButton
              value={result.hashtags.map((h) => `#${h}`).join(' ')}
              label="Copy all"
            />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {result.hashtags.map((h) => (
              <Badge key={h} variant="secondary">
                #{h}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Block({
  icon,
  title,
  body,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta?: string;
}) {
  if (!body) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {icon} {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {meta ? <span className="text-[11px] text-muted-foreground">{meta}</span> : null}
          <CopyButton value={body} label="Copy" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-xs leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
