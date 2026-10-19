import type { PromptState } from '@ejm/core';
import { LoaderCircle } from 'lucide-react';
import { useId, type FormEvent } from 'react';
import { cn } from '../lib/utils';

export interface PromptProps {
  value: string;
  onValueChange?: (value: string) => void;
  /** Called with the value on Enter. Not called while busy. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  state?: PromptState;
  /** Error only: one plain sentence under the line. */
  message?: string;
  /** Accessible name of the input. */
  label?: string;
  className?: string;
}

/** An input line in the terminal manner: a prompt glyph, the text and a rule under it. Busy ignores input and says "working". Error says why, in words. */
export function Prompt({ value, onValueChange, onSubmit, placeholder, state = 'idle', message, label = 'Command', className }: PromptProps) {
  const errId = useId();
  const busy = state === 'busy';
  const failed = state === 'error';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit?.(value);
  };
  return (
    <form onSubmit={submit} className={className}>
      <div className={cn('flex items-center gap-3 border-b py-2', failed ? 'border-danger' : 'border-control')}>
        <span aria-hidden className="font-mono text-link">›</span>
        <input
          aria-label={label}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? errId : undefined}
          aria-busy={busy || undefined}
          value={value}
          readOnly={busy}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={e => onValueChange?.(e.target.value)}
          className={cn('min-h-11 min-w-0 flex-1 bg-transparent font-mono text-base text-fg placeholder:text-muted', busy && 'text-muted')}
        />
        {/* Always in the page, so a screen reader announces the word when it changes. */}
        <span role="status" className="flex items-center gap-2 text-meta text-muted">
          {busy && <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />}
          {busy ? 'working' : ''}
        </span>
      </div>
      {failed && message && <p id={errId} role="alert" className="mt-2 text-meta text-danger">{message}</p>}
    </form>
  );
}
