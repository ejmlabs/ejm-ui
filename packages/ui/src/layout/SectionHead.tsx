import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface SectionHeadProps {
  /** Mono kicker, for example "01 / Projects". */
  kicker?: string;
  title: ReactNode;
  /** Supporting copy. The split layout places it beside the heading at wide container widths. */
  children?: ReactNode;
  /** Stacked keeps body-sized copy below the heading with the shared field gap. Split preserves the marketing layout. */
  layout?: 'split' | 'stacked';
  /** The heading element. Keep levels in order on the page. */
  as?: 'h1' | 'h2' | 'h3';
  /** display is 36 to 96px, title is 28 to 56px. */
  size?: 'display' | 'title';
  id?: string;
  className?: string;
}

/** A section opening: kicker, a balanced heading and supporting copy. */
export function SectionHead({ kicker, title, children, layout = 'split', as: H = 'h2', size = 'display', id, className }: SectionHeadProps) {
  const stacked = layout === 'stacked';
  const heading = <H id={id} className={cn(size === 'display' ? 'text-display' : 'text-title', !stacked && '@3xl:col-span-7')}>{title}</H>;
  const copy = children && <div className={cn('max-w-measure', stacked ? 'text-body' : 'text-lead @3xl:col-span-4 @3xl:col-start-9 @3xl:self-end')}>{children}</div>;
  return (
    <header className={cn('@container', stacked && 'grid gap-field', className)}>
      {kicker && <p className="text-meta text-muted">{kicker}</p>}
      {stacked ? <>{heading}{copy}</> :
        <div className={cn('grid gap-x-12 gap-y-8 @3xl:grid-cols-12', kicker && 'mt-6')}>{heading}{copy}</div>}
    </header>
  );
}
