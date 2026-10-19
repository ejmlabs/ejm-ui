import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/** The words every illustration carries. One place, so the label cannot drift between ProductShot and Illustration. */
export const illustrationLabel = (product: string) => `Illustration of ${product}, not a screenshot`;

/** Mono label under an illustration. Always visible; a screenshot never has one. */
export function IllustrationLabel({ product }: { product: string }) {
  return <p data-illustration-label="" className="text-meta m-0 text-muted">{illustrationLabel(product)}</p>;
}

export interface IllustrationProps {
  /** The product it illustrates, for example "ejm-ide". */
  product: string;
  /** Optional sentence after the label saying what the illustration shows. */
  caption?: ReactNode;
  className?: string;
  /** A React composition that stands in for a screenshot, for example the IdeView from @ejm/demos. */
  children: ReactNode;
}

/**
 * A figure for a drawn stand-in of a product screen. It is never a screenshot, so the label "Illustration of <product>, not a
 * screenshot" sits under it, always visible. Use it only where a real capture is not possible; use ProductShot for captures.
 * The composition is decoration for assistive tech: the figure is named by the label and the caption carries the meaning.
 */
export function Illustration({ product, caption, className, children }: IllustrationProps) {
  return (
    <figure data-illustration="" data-product={product} aria-label={illustrationLabel(product)} className={cn('m-0 min-w-0', className)}>
      {children}
      <figcaption className="mt-3 max-w-prose border-t border-line pt-2">
        <IllustrationLabel product={product} />
        {caption && <p className="text-meta m-0 text-muted">{caption}</p>}
      </figcaption>
    </figure>
  );
}
