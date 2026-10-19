import type { StateBlockKind } from '@ejm/core';
import { useEffect, type ReactNode } from 'react';
import type { Density } from '../lib/density';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export interface StateBlockProps {
  kind: StateBlockKind;
  /** ONE plain sentence. */
  message: string;
  /** At most one action. `key` is a single key that triggers it from anywhere that is not a text field. */
  action?: { key?: string; label: string };
  onAction?: () => void;
  /** Loading only: draw skeleton lines under the sentence. Pass false when the caller draws a skeleton that matches its own layout. */
  skeleton?: boolean;
  /** `compact` for panes of an application: less space around the sentence, 14px text, a compact action. */
  density?: Density;
  className?: string;
}

const words: Record<StateBlockKind, string> = { empty: 'Empty', loading: 'Loading', error: 'Error' };

/** One bar of a skeleton. It only fades (opacity), and holds still under reduced motion. */
export function SkeletonBar({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block h-4 rounded-pill bg-line motion-safe:animate-pulse', className)} />;
}

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * An empty, loading or error state: a word that names the state, one plain sentence and at most one action.
 * Never a bare zero or a blank area, and no box. Error is announced at once (role alert), loading politely (role status).
 */
export function StateBlock({ kind, message, action, onAction, skeleton = true, density = 'comfortable', className }: StateBlockProps) {
  const key = action?.key;
  useEffect(() => {
    if (!key || !onAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === key && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) { e.preventDefault(); onAction(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [key, onAction]);

  const compact = density === 'compact';
  const role: 'alert' | 'status' | undefined = kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined;
  let extra: ReactNode = null;
  if (kind === 'loading' && skeleton) {
    extra = (
      <div aria-hidden className={cn('flex max-w-measure flex-col', compact ? 'mt-3 gap-2' : 'mt-5 gap-3')}>
        <SkeletonBar className="w-full" />
        <SkeletonBar className="w-4/5" />
        <SkeletonBar className="w-3/5" />
      </div>
    );
  }
  return (
    <div role={role} aria-busy={kind === 'loading' || undefined} className={cn(compact ? 'py-3' : 'py-8', className)}>
      <p className={cn('text-meta', kind === 'error' ? 'text-danger' : 'text-muted')}>{words[kind]}</p>
      <p className={cn('mt-1 max-w-measure', compact ? 'text-sm' : 'text-body')}>{message}</p>
      {extra}
      {action && (
        <Button variant="link" size="sm" density={density} arrow className={compact ? 'mt-2' : 'mt-3'} onClick={onAction}>
          {action.label}
          {action.key && <kbd className="ms-1 font-mono text-meta text-muted no-underline">{action.key}</kbd>}
        </Button>
      )}
    </div>
  );
}
