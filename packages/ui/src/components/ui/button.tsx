import { Slot, Slottable } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '../../control-recipes.mjs';
import { ArrowRight } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';

export { buttonVariants } from '../../control-recipes.mjs';

/**
 * Pill button. primary is the Sage fill (Ink text, Forest on hover), secondary is a transparent pill with a control border, ghost has no
 * fill until hover, link reads as underlined text, danger is the red fill for a destructive action. Size `md` is 44px; `icon` is a 44px
 * square for an icon-only button: give it an aria-label and a lucide-react icon as the child, and it sizes the icon (20px, 16px
 * compact) whatever size the icon asks for. Density comes from the surface (AppShell, Page application): compact is 32px on a
 * fine pointer and 44px on touch. Pills stay on one line; a link wraps, so a long label does not overflow a 320px screen.
 * Only transform moves: the arrow slides 4px on hover and the whole button sinks a hair while pressed.
 */
export interface ButtonProps extends Closed<ComponentProps<'button'>>, Omit<VariantProps<typeof buttonVariants>, 'density'> {
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
  /** Render the child element (a link, say) with the button's look instead of a `<button>`. */
  asChild?: boolean;
  /** Add the trailing arrow. It moves 4px on hover and focus, and stays put under reduced motion. */
  arrow?: boolean;
}

export function Button({ variant, size, density, asChild = false, arrow = false, type, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const surface = useDensity(density);
  return (
    <Comp {...props} className={buttonVariants({ variant, size, density: surface })} type={asChild ? undefined : (type ?? 'button')}>
      <Slottable>{children}</Slottable>
      {arrow && <ArrowRight aria-hidden className="size-4 shrink-0 transition-transform duration-fast ease-standard motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1" />}
    </Comp>
  );
}
