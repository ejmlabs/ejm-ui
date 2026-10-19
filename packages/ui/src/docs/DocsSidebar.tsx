import { filterList } from '@ejm/core';
import { useId, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { useLinkComponent } from '../shell/link';
import { SidebarFilter } from './SidebarFilter';

export interface DocsNavItem {
  label: string;
  href: string;
}
export interface DocsNavGroup {
  title: string;
  items: readonly DocsNavItem[];
}

/**
 * The page list of a documentation set, in groups. No boxes: a hairline runs down the left of each group and the
 * current page takes the strong tone and a stronger rule, and is marked with aria-current="page". Every entry is a real
 * link (a link of the site's router when a LinkProvider is above, a plain anchor otherwise), so the whole list works with no script. With script, a filter narrows the entries and announces "N results".
 */
export function DocsSidebar({
  groups,
  current,
  label = 'Documentation',
  filter,
  className,
}: {
  groups: readonly DocsNavGroup[];
  /** The href of the page being read. */
  current: string;
  label?: string;
  /** Show the filter. Defaults to on when there are more than 8 entries. */
  filter?: boolean;
  className?: string;
}) {
  const Link = useLinkComponent();
  const uid = useId();
  const [query, setQuery] = useState('');
  const all = useMemo(() => groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.title }))), [groups]);
  const result = useMemo(() => filterList(all, query, (i) => `${i.label} ${i.group}`), [all, query]);
  const shown = new Set(result.items.map((i) => i.href));
  const status = !query.trim() ? '' : result.announcement;
  const withFilter = filter ?? all.length > 8;

  return (
    <nav aria-label={label} className={className}>
      {withFilter && <SidebarFilter value={query} onChange={setQuery} status={status} className="mb-6" />}
      {groups.map((group, g) => {
        const items = group.items.filter((i) => shown.has(i.href));
        if (!items.length) return null;
        return (
          <div key={group.title} className={cn(g > 0 && 'mt-8')}>
            <p id={`${uid}-${g}`} className="text-meta text-muted">
              {group.title}
            </p>
            <ul aria-labelledby={`${uid}-${g}`} className="mt-2">
              {items.map((item) => {
                const isCurrent = item.href === current;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={cn(
                        'touch-target focus-ring block border-s py-1.5 ps-4 text-[0.9375rem] leading-snug no-underline transition-colors duration-fast',
                        isCurrent ? 'border-fg text-fg' : 'border-line text-muted hover:border-control hover:text-fg',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
