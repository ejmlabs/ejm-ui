import { ArrowUpRight } from 'lucide-react';
import { Children, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '../lib/utils';

// U+2060 forbids a line break on either side of it, so the arrow never wraps alone when the label is not plain text.
const WORD_JOINER = '⁠';

/**
 * The label, the arrow and the screen reader note as one run of inline content. The arrow stays on the line of the last word: for a
 * text label the last word, the arrow and the note sit in one nowrap span, and for any other children a word joiner goes before the arrow.
 * One wrapper span holds all of it, so a flex or inline-flex link (a nav item) lays out one item, and its words keep their spaces.
 */
function LabelWithArrow({ children }: { children: ReactNode }) {
  const arrow = <ArrowUpRight aria-hidden className="ms-0.5 inline-block size-[0.85em] align-baseline" strokeWidth={2.25} />;
  const note = <span className="sr-inline">, opens another site</span>;
  const parts = Children.toArray(children);
  const last = parts.at(-1);
  const split = typeof last === 'string' ? /^([\s\S]*?)(\S+)$/.exec(last.trimEnd()) : null;
  if (!split) {
    return <span>{children}{WORD_JOINER}{arrow}{WORD_JOINER}{note}</span>;
  }
  return <span>{parts.slice(0, -1)}{split[1]}<span className="whitespace-nowrap">{split[2]}{arrow}{note}</span></span>;
}

/**
 * Private to the shell, not exported from its barrel. The external anchor with the class its caller chooses: ExternalLink gives it the
 * `link` style, NavLink gives it a nav style. It adds rel="external noopener", the arrow and "opens another site" for screen readers.
 * The arrow stays with the last word of the label (see LabelWithArrow), so it never wraps onto a line of its own.
 */
export function ExternalAnchor({ className, children, rel, ...rest }: ComponentPropsWithoutRef<'a'> & { href: string }) {
  return (
    <a rel={cn('external noopener', rel)} className={className} {...rest}>
      <LabelWithArrow>{children}</LabelWithArrow>
    </a>
  );
}
