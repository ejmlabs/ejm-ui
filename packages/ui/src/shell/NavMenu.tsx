import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LinkComponent, NavItem } from './link';
import { NavLink } from './NavLink';

/**
 * Private to the shell, not exported from its barrel. The header menu in a header narrower than 48rem: a native <details>, so it opens and closes with no
 * script and takes no space when closed. Open, the list is an overlay under the bar (window radius, hairline border, float shadow,
 * inset to the page gutter), so nothing moves. While it is open Escape closes it and returns focus to the button, as does a press
 * outside, and choosing a link closes it.
 */
export function NavMenu({ nav, link }: { nav: readonly NavItem[]; link: LinkComponent }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = menu.current;
    if (!open || !d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      d.open = false;
      d.querySelector('summary')?.focus();
    };
    const onPress = (e: Event) => {
      if (!d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
    };
  }, [open]);

  return (
    <details ref={menu} className="group @3xl:hidden" onToggle={e => setOpen(e.currentTarget.open)}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control px-3 text-fg hover:bg-tone marker:hidden [&::-webkit-details-marker]:hidden">
        <span>Menu</span>
        <Menu aria-hidden className="size-5 group-open:hidden" />
        <X aria-hidden className="hidden size-5 group-open:block" />
      </summary>
      <div
        onClick={e => {
          if ((e.target as Element).closest('a') && menu.current) menu.current.open = false;
        }}
        className="absolute inset-x-(--ejm-page-gutter) top-full mt-2 max-h-[calc(100svh-var(--ejm-header-h)-env(safe-area-inset-top)-2rem)] overflow-y-auto overscroll-contain rounded-window border border-line bg-ground text-fg shadow-float group-open:animate-fade"
      >
        <ul>
          {nav.map(item => (
            <li key={item.href} className="not-first:hairline-t">
              <NavLink item={item} link={link} className="touch-target flex min-h-12 items-center px-4 hover:bg-tone focus-visible:outline-offset-[-2px]" />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
