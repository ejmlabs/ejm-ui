import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Art } from './Art';
import { Band, type BandTone } from './Band';

export interface HeroProps {
  /** Mono line above the headline, for example "ejmlabs / one-person lab". */
  eyebrow?: string;
  /** The h1. */
  title: ReactNode;
  /** Supporting copy. */
  children?: ReactNode;
  /** Buttons and links. */
  actions?: ReactNode;
  /** Reserved slot for floating product windows (a ProductStage). Beside the copy when wide, below it when narrow. */
  aside?: ReactNode;
  /** Optional decorative symbol line art as inline markup (see Art). */
  art?: string;
  /** Add the draw-on class to the art after hydration. */
  drawOn?: boolean;
  size?: 'display' | 'display-lg';
  tone?: BandTone;
  className?: string;
}

const step = (i: number): CSSProperties => ({ '--ejm-i': i }) as CSSProperties;

/**
 * Type-led hero on the page ground. No panel. Copy enters first, then the aside, as one staged entrance:
 * the stagger index stops at 4, so it ends 4 x 60ms + 640ms = 880ms after load, transform and opacity only.
 * The eyebrow, headline and lead only slide (never start at opacity 0): they are what the browser reports as Largest Contentful Paint,
 * and a fade would delay it by the whole fade. The actions and the aside fade in as well.
 */
export function Hero({ eyebrow, title, children, actions, aside, art, drawOn, size = 'display', tone = 'paper', className }: HeroProps) {
  return (
    <Band tone={tone} className={cn('relative isolate overflow-x-clip pt-[calc(var(--ejm-rhythm)*0.6)]', art ? 'pb-[calc(var(--ejm-rhythm)*0.3+8.75vw)]' : 'pb-[calc(var(--ejm-rhythm)*0.5)]', className)}>
      {art && <Art svg={art} drawOn={drawOn} className="absolute inset-x-0 bottom-0 -z-10" />}
      <div className="@container">
        <div className="grid gap-x-12 gap-y-10 @5xl:grid-cols-12 @5xl:gap-y-16">
          <div className="@5xl:col-span-12">
            {eyebrow && <p className="text-meta animate-slide mb-8 text-muted" style={step(0)}>{eyebrow}</p>}
            <h1 className={cn(size === 'display-lg' ? 'text-display-lg' : 'text-display', 'animate-slide')} style={step(1)}>{title}</h1>
          </div>
          {(children || actions) && (
            <div className="flex flex-col gap-10 @5xl:col-span-4 @5xl:pe-6">
              {children && <div className="text-lead animate-slide max-w-measure" style={step(2)}>{children}</div>}
              {actions && <div className="animate-enter flex flex-wrap items-center gap-x-8 gap-y-4" style={step(3)}>{actions}</div>}
            </div>
          )}
          {aside && <div className={cn('animate-enter', children || actions ? '@5xl:col-span-8' : '@5xl:col-span-12')} style={step(4)}>{aside}</div>}
        </div>
      </div>
    </Band>
  );
}
