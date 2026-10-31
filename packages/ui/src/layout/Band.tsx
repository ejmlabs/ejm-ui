import type { Band as BandName } from '@ejm/tokens';
import type { HTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';
import { DensityProvider } from '../lib/density';

export type BandTone = BandName;

export interface PageProps extends Closed<HTMLAttributes<HTMLDivElement>> {
  /** Applications use 32px phone / 48px desktop padding, compact controls and shared content gaps. The default is the column alone. */
  variant?: 'default' | 'application';
}

/** The content column. Bands stay full bleed; application pages add a compact content rhythm and compact controls. */
export function Page({ variant = 'default', ...rest }: PageProps) {
  if (variant === 'default') return <div {...rest} className="page" />;
  return (
    <DensityProvider density="compact">
      <div {...rest} className="page grid gap-content py-8 sm:py-12 animate-slide" />
    </DensityProvider>
  );
}

export interface BandProps extends Closed<HTMLAttributes<HTMLElement>> {
  /** The ground: paper, mist, sage or ink. Every child reads correctly on every band. */
  tone?: BandTone;
  as?: 'section' | 'div' | 'header' | 'footer' | 'aside' | 'article' | 'main';
  /** Wrap children in the page column (default). Pass false to place your own `Page`. */
  column?: boolean;
  /** Drop the vertical rhythm, for a band that is only a ground (a header or a thin strip). */
  flush?: boolean;
}

/** A full-bleed section with its own ground and the vertical rhythm of the page. Section is the way to build a page section; this is the lower-level path. */
export function Band({ tone = 'paper', as: Tag = 'section', column = true, flush = false, children, ...rest }: BandProps) {
  return (
    <Tag {...rest} data-band={tone} className={flush ? 'band' : 'band py-rhythm'}>
      {column ? <Page>{children}</Page> : children}
    </Tag>
  );
}
