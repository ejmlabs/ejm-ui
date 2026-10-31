import { Children, type ReactNode } from 'react';
import { shadowClass, type Elevation } from '../lib/elevation';
import { cn } from '../lib/utils';

export type { Elevation } from '../lib/elevation';

export interface ProductWindowProps {
  /** The title in the bar, for example "ejm-cli". */
  title: string;
  /** A short mono note after the title, for example "terminal". */
  meta?: string;
  elevation?: Elevation;
  /** Set only for a live demo island. Without it the window shows the visible "Simulated screen" label. */
  live?: boolean;
  /** Which end of the footer carries the "Simulated screen" label. Pick the side that a neighbouring window in a stage does not cover. */
  labelSide?: 'start' | 'end';
  /** Gives an interactive window an accessible name (role group). Without it the window is decoration and hidden from assistive tech. */
  label?: string;
  children: ReactNode;
}

/** A floating product window. The only layout part with a shadow. It keeps the page theme inside any band. */
export function ProductWindow({ title, meta, elevation = 'raised', live = false, labelSide = 'end', label, children }: ProductWindowProps) {
  return (
    <div
      data-window=""
      data-band="paper"
      data-live={live || undefined}
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'scheme-page flex h-full min-w-0 flex-col overflow-hidden rounded-window border border-ui-line bg-ui-editor text-[length:var(--ejm-window-text,0.8125rem)] leading-normal text-ui-text',
        shadowClass[elevation],
      )}
    >
      <div className="flex items-center gap-3 border-b border-ui-line bg-ui-panel px-4 py-3">
        <span aria-hidden="true" className="flex shrink-0 gap-1.5 @max-md:hidden">
          <span className="size-2.5 rounded-full bg-ui-line-strong" />
          <span className="size-2.5 rounded-full bg-ui-line-strong" />
          <span className="size-2.5 rounded-full bg-ui-line-strong" />
        </span>
        <span className="text-meta min-w-0 truncate text-ui-text-strong">{title}</span>
        {meta && <span className="text-meta min-w-0 truncate text-ui-text-muted @max-md:hidden">{meta}</span>}
        {/* In a narrow stage the windows tuck over each other's lower edge, so the label rides in the bar, which always shows. */}
        {!live && <span className="text-meta ms-auto shrink-0 text-ui-text-muted @md:hidden">Simulated screen</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4 font-mono [&_.text-meta]:text-[length:1em]">{children}</div>
      {!live && <div className={cn('text-meta hidden border-t border-ui-line bg-ui-panel px-4 py-2 text-ui-text-muted @md:block', labelSide === 'end' ? 'text-end' : 'text-start')}>Simulated screen</div>}
    </div>
  );
}

// Slot geometry from 28rem of stage width. Narrow stages tuck the windows into an overlapping stack instead.
const stageShape = ['@md:aspect-[16/10]', '@md:aspect-[5/4]', '@md:aspect-[1/1]'] as const;
const tuck = ['', 'ms-[6%] -mt-10', 'ms-[12%] -mt-10'] as const;
const place: Record<number, readonly string[]> = {
  1: ['@md:left-[6%] @md:top-0 @md:w-[88%] @md:aspect-[16/10]'],
  2: ['@md:left-0 @md:top-0 @md:w-[66%] @md:aspect-[6/5]', '@md:right-0 @md:bottom-0 @md:w-[62%] @md:aspect-[6/5]'],
  3: [
    '@md:left-0 @md:top-0 @md:w-[56%] @md:aspect-[6/5]',
    '@md:right-0 @md:top-[15%] @md:w-[56%] @md:aspect-[6/5]',
    '@md:left-[8%] @md:bottom-0 @md:w-[62%] @md:aspect-[6/5]',
  ],
};

/** Layers one to three ProductWindows with offset and overlap. Scales with its own width; tucks into a stack when narrow. */
export function ProductStage({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).slice(0, 3);
  const n = Math.max(1, items.length);
  return (
    <div className="@container">
      <div className={cn('relative flex flex-col pb-2 @md:block @md:pb-0 @md:[--ejm-window-text:clamp(0.8125rem,1.9cqw,1.75rem)]', stageShape[n - 1])}>
        {items.map((child, i) => (
          <div key={i} className={cn('relative w-[88%] @md:absolute @md:m-0', tuck[i], place[n]?.[i])} style={{ zIndex: i + 1 }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
