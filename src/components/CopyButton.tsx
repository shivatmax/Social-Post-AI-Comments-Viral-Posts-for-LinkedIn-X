import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { copyToClipboard } from '@/utils/export';
import { cn } from '@/utils/cn';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  value: string;
  label?: string;
  onCopied?: () => void;
}

/** One-click copy button with a transient "copied" state. */
export function CopyButton({ value, label, className, variant = 'outline', size = 'sm', onCopied, ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handle = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handle}
      {...props}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
    </Button>
  );
}
