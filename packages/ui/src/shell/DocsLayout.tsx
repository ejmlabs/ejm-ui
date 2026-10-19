import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Collapse } from './Collapse';

export interface DocsLayoutProps {
  /** The page tree and filter. A labelled disclosure below 1024px, a sticky left column from there. */
  sidebar: ReactNode;
  /** "On this page". A labelled disclosure below 1280px, a sticky right column from there. */
  contents?: ReactNode;
  sidebarLabel?: string;
  contentsLabel?: string;
  className?: string;
  /** The article. Held to a 68ch reading column. */
  children: ReactNode;
}

// Sticky below the header. Literal class names so Tailwind finds them.
const stickLg = 'lg:sticky lg:top-[calc(var(--ejm-header-h)+env(safe-area-inset-top,0px)+1.5rem)] lg:max-h-[calc(100svh-var(--ejm-header-h)-env(safe-area-inset-top,0px)-3rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain';
const stickXl = 'xl:sticky xl:top-[calc(var(--ejm-header-h)+env(safe-area-inset-top,0px)+1.5rem)] xl:max-h-[calc(100svh-var(--ejm-header-h)-env(safe-area-inset-top,0px)-3rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain';

/**
 * The arrangement of a documentation page. Put it inside SiteLayout's main. It supplies the grid, the collapsing and the
 * reading column; the docs parts (SidebarFilter, Contents, Pager and the rest) go in the slots. Source order is sidebar,
 * contents, article, which is also the visual order on phones. With JavaScript off both disclosures are native and work.
 */
export function DocsLayout({ sidebar, contents, sidebarLabel = 'Browse docs', contentsLabel = 'On this page', className, children }: DocsLayoutProps) {
  return (
    <div className={cn('page grid gap-y-4 py-rhythm-sm lg:grid-cols-[15rem_minmax(0,68ch)] lg:justify-center lg:gap-x-12 lg:gap-y-0 xl:grid-cols-[15rem_minmax(0,68ch)_13rem]', className)}>
      <Collapse from="lg" label={sidebarLabel} className={cn('lg:col-start-1 lg:row-span-2 lg:row-start-1 xl:row-span-1', stickLg)}>
        {sidebar}
      </Collapse>
      {contents && (
        <Collapse from="xl" label={contentsLabel} className={cn('lg:col-start-2 lg:row-start-1 xl:col-start-3', stickXl)}>
          {contents}
        </Collapse>
      )}
      <div className="min-w-0 max-w-measure lg:col-start-2 lg:row-start-2 xl:row-start-1">{children}</div>
    </div>
  );
}
