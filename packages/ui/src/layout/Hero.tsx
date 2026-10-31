import type { CSSProperties, ReactNode } from 'react';
import { Art } from './Art';

export interface HeroProps {
  /** Mono line above the headline, for example "ejmlabs / open source projects". */
  eyebrow?: string;
  /** The h1. */
  title: ReactNode;
  titleId?: string;
  /** Supporting copy. */
  children?: ReactNode;
  /** Buttons and links. */
  actions?: ReactNode;
  /** Supporting status after the actions. */
  footnote?: ReactNode;
  /** Supporting visual or component example. Beside the copy when wide, below it when narrow. */
  aside?: ReactNode;
  /** Optional decorative symbol line art as inline markup (see Art). */
  art?: string;
  /** Add the draw-on class to the art after hydration. */
  drawOn?: boolean;
}

const step = (i: number): CSSProperties => ({ '--ejm-i': i }) as CSSProperties;

/**
 * Type-led hero on the page ground. No panel. Copy enters first, then the aside, as one staged entrance:
 * the stagger index stops at 4, so it ends 4 x 60ms + 640ms = 880ms after load, transform and opacity only.
 * The eyebrow, headline and lead only slide (never start at opacity 0): they are what the browser reports as Largest Contentful Paint,
 * and a fade would delay it by the whole fade. The actions and the aside fade in as well.
 */
export function Hero({ eyebrow, title, children, actions, aside, art, drawOn, titleId, footnote }: HeroProps) {
  return (
    <section data-band="paper" aria-labelledby={titleId} className={art ? 'band relative isolate overflow-x-clip pt-[calc(var(--ejm-rhythm)*0.6)] pb-[calc(var(--ejm-rhythm)*0.3+8.75vw)]' : 'band relative isolate overflow-x-clip pt-[calc(var(--ejm-rhythm)*0.6)] pb-[calc(var(--ejm-rhythm)*0.5)]'}>
      <div className="page">
        {art && <div className="absolute inset-x-0 bottom-0 -z-10"><Art svg={art} drawOn={drawOn} /></div>}
        <div className="@container">
          <div className="grid gap-x-12 gap-y-10 @5xl:grid-cols-12 @5xl:gap-y-16">
            <div className="@5xl:col-span-12">
              {eyebrow && <p className="text-meta mb-8 text-muted animate-slide" style={step(0)}>{eyebrow}</p>}
              <h1 id={titleId} className="text-display animate-slide" style={step(1)}>{title}</h1>
            </div>
            {(children || actions || footnote) && (
              <div className="flex flex-col gap-10 @5xl:col-span-4 @5xl:pe-6">
                {children && <div className="text-lead max-w-measure animate-slide" style={step(2)}>{children}</div>}
                {actions && <div className="flex flex-wrap items-center gap-x-8 gap-y-4 animate-enter" style={step(3)}>{actions}</div>}
                {footnote && <div className="text-meta text-muted">{footnote}</div>}
              </div>
            )}
            {aside && <div className={children || actions || footnote ? 'animate-enter @5xl:col-span-8' : 'animate-enter @5xl:col-span-12'} style={step(4)}>{aside}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
