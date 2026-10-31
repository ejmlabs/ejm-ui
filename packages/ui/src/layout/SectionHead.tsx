import type { ReactNode } from 'react';
import { useHeadingTag } from '../lib/heading';

export interface SectionHeadProps {
  /** Mono kicker, for example "01 / Projects". */
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
  /** The content's role selects the complete shared recipe. */
  purpose?: 'page' | 'section' | 'application';
  /** The heading element. Without it the heading takes the level of its context (h2 outside a Section). */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  id?: string;
}

/** One opening recipe per content role. Sites provide words and, when they need it, the heading level. */
export function SectionHead({ kicker, title, children, purpose = 'section', as, id }: SectionHeadProps) {
  const contextTag = useHeadingTag();
  const H = as ?? contextTag;
  const application = purpose === 'application';
  const heading = <H id={id} className={purpose === 'page' ? 'text-display @3xl:col-span-7' : application ? 'text-title' : 'text-title @3xl:col-span-7'}>{title}</H>;
  const copy = children && <div className={application ? 'grid max-w-measure gap-6 text-body' : 'grid max-w-measure gap-6 text-lead @3xl:col-span-4 @3xl:col-start-9 @3xl:self-end'}>{children}</div>;
  return (
    <header className={application ? '@container grid gap-field' : '@container'}>
      {kicker && <p className="text-meta text-muted">{kicker}</p>}
      {application ? <>{heading}{copy}</> :
        <div className={kicker ? 'grid gap-x-12 gap-y-8 @3xl:grid-cols-12 mt-6' : 'grid gap-x-12 gap-y-8 @3xl:grid-cols-12'}>{heading}{copy}</div>}
    </header>
  );
}
