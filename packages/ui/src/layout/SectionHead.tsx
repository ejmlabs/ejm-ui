import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface SectionHeadProps {
  /** Mono kicker, for example "01 / Projects". */
  kicker?: string;
  title: ReactNode;
  /** Supporting copy. Sits in its own column beside the heading at wide container widths, stacked below on small ones. */
  children?: ReactNode;
  /** The heading element. Keep levels in order on the page. */
  as?: 'h1' | 'h2' | 'h3';
  /** display is 36 to 96px, title is 28 to 56px. */
  size?: 'display' | 'title';
  id?: string;
  className?: string;
}

/** A section opening: kicker, a large balanced heading and supporting copy. */
export function SectionHead({ kicker, title, children, as: H = 'h2', size = 'display', id, className }: SectionHeadProps) {
  return (
    <header className={cn('@container', className)}>
      {kicker && <p className="text-meta text-muted">{kicker}</p>}
      <div className={cn('grid gap-x-12 gap-y-8 @3xl:grid-cols-12', kicker && 'mt-6')}>
        <H id={id} className={cn(size === 'display' ? 'text-display' : 'text-title', '@3xl:col-span-7')}>{title}</H>
        {children && <div className="text-lead max-w-measure @3xl:col-span-4 @3xl:col-start-9 @3xl:self-end">{children}</div>}
      </div>
    </header>
  );
}
