import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/** Facts: mono labels, hairlines and values. Stacks below 28rem of its own width, so it never clips in a narrow column. */
export function Facts({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn('@container hairline-t m-0', className)}>{children}</dl>;
}

export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('hairline grid gap-x-8 gap-y-1 py-4 @md:grid-cols-[minmax(7rem,1fr)_minmax(0,2.4fr)]', className)}>
      <dt className="text-meta text-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}
