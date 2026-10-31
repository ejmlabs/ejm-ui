import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '../control-recipes.mjs';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
import { useDensity } from '../lib/density';

/**
 * Switches between light and dark and remembers the choice (see useTheme). The button is named for what it does
 * ("Switch to dark theme"), shows the icon of the theme it will switch to, and announces the result politely.
 * It is the ghost icon button of the control recipe: 44px, 32px on a compact surface such as AppShell, `rounded-pill`, `bg-tone` on hover.
 * The icons are chosen with the `dark:` variant, so the right one shows before hydration with no flash.
 * An explicit switch crossfades with the native View Transitions API when available and motion is allowed.
 * Without scripts it does nothing; the page still follows the system theme.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const density = useDensity();
  const [announce, setAnnounce] = useState('');
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <>
      <button
        type="button"
        aria-label={`Switch to ${next} theme`}
        onClick={() => {
          let changed = false;
          const apply = () => {
            if (changed) return;
            changed = true;
            toggle();
            setAnnounce(`${next[0]!.toUpperCase()}${next.slice(1)} theme on`);
          };
          if (!document.startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            apply();
            return;
          }
          try {
            const transition = document.startViewTransition(apply);
            // A hidden or busy tab must still save and show the requested theme.
            const pending = setTimeout(() => {
              if (!changed) {
                transition.skipTransition();
                apply();
              }
            }, 300);
            void transition.ready.catch(apply);
            void transition.updateCallbackDone.catch(apply);
            void transition.finished.catch(() => {}).finally(() => clearTimeout(pending));
          } catch {
            apply();
          }
        }}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon', density }), 'shrink-0')}
      >
        <Moon aria-hidden className="dark:hidden" />
        <Sun aria-hidden className="hidden dark:block" />
      </button>
      <span role="status" className="sr-only">
        {announce}
      </span>
    </>
  );
}
