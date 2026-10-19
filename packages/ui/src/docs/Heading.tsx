import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * An h2 or h3 with an id and a link to itself. The link is plain HTML, so it works without scripts. It shows on hover and
 * keyboard focus, and always on touch screens. The heading takes focus when the contents list sends the reader here.
 */
export function Heading({ level = 2, id, children, className }: { level?: 2 | 3; id: string; children: ReactNode; className?: string }) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag
      id={id}
      tabIndex={-1}
      className={cn('group relative', level === 2 ? 'text-heading' : 'mt-12 text-lead font-semibold', className)}
    >
      {children}
      <a
        href={`#${id}`}
        className="touch-target focus-ring ms-1 inline-flex items-center justify-center px-2 text-link-large no-underline opacity-0 transition-opacity duration-fast group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60"
      >
        <span aria-hidden="true">#</span>
        <span className="sr-only">Link to this section</span>
      </a>
    </Tag>
  );
}
