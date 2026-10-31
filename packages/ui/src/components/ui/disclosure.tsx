import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';
import { cn } from '../../lib/utils';

export interface DisclosureProps extends Closed<ComponentProps<'details'>> {
  summary: ReactNode;
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/**
 * A native disclosure at every width, separated by a hairline. The summary is a 44px row (32px compact) whose text stays on the column edge;
 * its hover fill reaches 12px past it. Closed content stays mounted, so forms retain input and widget state.
 */
export function Disclosure({ summary, children, density, ...props }: DisclosureProps) {
  const compact = useDensity(density) === 'compact';
  return (
    <details {...props} className="group hairline-t">
      <summary className={cn('-mx-3 flex cursor-pointer list-none items-center justify-between gap-4 rounded-control px-3 text-fg touch-target marker:hidden hover:bg-tone [&::-webkit-details-marker]:hidden', compact ? 'min-h-8 compact-target py-1 text-sm' : 'min-h-11 py-2 text-base')}>
        <span className="min-w-0">{summary}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform duration-fast ease-standard group-open:rotate-180" />
      </summary>
      <div className="pb-4 pt-2">{children}</div>
    </details>
  );
}
