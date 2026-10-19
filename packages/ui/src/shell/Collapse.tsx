import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../lib/utils';

export type CollapseFrom = 'md' | 'lg' | 'xl';

// Literal class names so Tailwind finds them. From the breakpoint up the content is always visible and the button is gone.
const alwaysShown: Record<CollapseFrom, string> = {
  md: 'md:[&::details-content]:[content-visibility:visible]',
  lg: 'lg:[&::details-content]:[content-visibility:visible]',
  xl: 'xl:[&::details-content]:[content-visibility:visible]',
};
// The button is hidden only where the browser can force the content visible. Elsewhere it stays, so the content is always reachable.
const hideButton: Record<CollapseFrom, string> = {
  md: 'supports-[selector(::details-content)]:md:hidden',
  lg: 'supports-[selector(::details-content)]:lg:hidden',
  xl: 'supports-[selector(::details-content)]:xl:hidden',
};
const minWidth: Record<CollapseFrom, string> = { md: '(min-width: 768px)', lg: '(min-width: 1024px)', xl: '(min-width: 1280px)' };

export interface CollapseProps {
  /** The button text, for example "Browse docs". It names the group on narrow screens. */
  label: string;
  /** The breakpoint where the content stops collapsing and is just shown. */
  from: CollapseFrom;
  className?: string;
  children: ReactNode;
}

/**
 * One native <details> that is a labelled disclosure on narrow screens and plain, always visible content from `from` up.
 * The content is rendered once (no duplicate links or ids) and is closed by default on narrow screens in the server HTML,
 * so opening and closing move nothing before hydration. A browser without ::details-content gets the same result from a
 * small effect that opens the details when the screen is wide.
 */
export function Collapse({ label, from, className, children }: CollapseProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d || typeof CSS === 'undefined' || CSS.supports('selector(::details-content)')) return;
    const mq = matchMedia(minWidth[from]);
    const sync = () => {
      if (mq.matches) d.open = true;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [from]);
  return (
    <details ref={ref} className={cn('group', alwaysShown[from], className)}>
      <summary
        className={cn(
          'touch-target hairline-t hairline flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-fg marker:hidden hover:text-link [&::-webkit-details-marker]:hidden',
          hideButton[from],
        )}
      >
        <span className="font-semibold">{label}</span>
        <ChevronDown aria-hidden className="size-5 transition-transform duration-base ease-standard group-open:rotate-180" />
      </summary>
      {children}
    </details>
  );
}
