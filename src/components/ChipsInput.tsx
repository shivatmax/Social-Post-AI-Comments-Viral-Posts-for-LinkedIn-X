import * as React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ChipsInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  variant?: 'default' | 'secondary' | 'accent' | 'warning';
}

/** Comma/Enter-delimited chips editor used for topics, keywords, blacklist. */
export function ChipsInput({
  values,
  onChange,
  placeholder,
  variant = 'accent',
}: ChipsInputProps) {
  const [draft, setDraft] = React.useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft('');
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-xs text-muted-foreground">None yet.</span>
        ) : (
          values.map((v) => (
            <Badge key={v} variant={variant} className="gap-1 py-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <Input
        value={draft}
        placeholder={placeholder ?? 'Type and press Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && values.length) {
            remove(values[values.length - 1]);
          }
        }}
        onBlur={() => draft && commit(draft)}
      />
    </div>
  );
}
