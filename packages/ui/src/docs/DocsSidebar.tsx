import { filterList } from '@ejm/core';
import { useId, useMemo, useState } from 'react';
import { useLinkComponent } from '../shell/link';
import { navLinkClass } from './nav-link';
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
 * The page list of a documentation set, in groups. No boxes: a hairline runs down the left of each group, hover fills a row with
 * tone, and the current page takes the strong rule, the tone and the strong text and is marked with aria-current="page". Every entry is a real
 * link (a link of the site's router when a LinkProvider is above, a plain anchor otherwise), so the whole list works with no script. With script, a filter narrows the entries and announces "N results".
 */
export function DocsSidebar({
  groups,
  current,
  label = 'Documentation',
  filter,
}: {
  groups: readonly DocsNavGroup[];
  /** The href of the page being read. */
  current: string;
  label?: string | undefined;
  /** Show the filter. Defaults to on when there are more than 8 entries. */
  filter?: boolean | undefined;
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
    <nav aria-label={label}>
      {withFilter && <SidebarFilter value={query} onChange={setQuery} status={status} />}
      {groups.map((group, g) => {
        const items = group.items.filter((i) => shown.has(i.href));
        if (!items.length) return null;
        return (
          <div key={group.title} className={g > 0 ? 'mt-8' : undefined}>
            <p id={`${uid}-${g}`} className="text-meta text-muted">
              {group.title}
            </p>
            <ul aria-labelledby={`${uid}-${g}`} className="mt-2">
              {items.map((item) => {
                const isCurrent = item.href === current;
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={isCurrent ? 'page' : undefined} className={navLinkClass}>
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
