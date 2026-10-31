import type { ReactNode } from 'react';
import { useDensity } from '../lib/density';
import { cn } from '../lib/utils';

/** Facts: mono labels, hairlines and values. Stacks below 28rem of its own width, so it never clips in a narrow column. */
export function Facts({ children }: { children: ReactNode }) {
  return <dl className="@container hairline-t m-0">{children}</dl>;
}

/** One fact row, `py-4` (`py-2` in a compact surface), separated by a hairline. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  const compact = useDensity() === 'compact';
  return (
    <div className={cn('hairline grid gap-x-8 gap-y-1 @md:grid-cols-[minmax(7rem,1fr)_minmax(0,2.4fr)]', compact ? 'py-2' : 'py-4')}>
      <dt className="text-meta text-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}
