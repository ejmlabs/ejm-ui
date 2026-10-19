import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { Density } from '../../lib/density';
import { cn } from '../../lib/utils';

/**
 * Pill button. primary is the Sage fill (Ink text), secondary a quiet tonal pill, ghost has no fill until hover, link reads as text.
 * danger is the red fill for a destructive action; size icon is a square for an icon-only button (give it an aria-label); density compact is for
 * applications. Pills stay on one line; a link wraps, so a long label does not overflow a 320px screen.
 * Only transform moves: the arrow slides 4px on hover and the whole button sinks a hair while pressed.
 */
export const buttonVariants = cva(
  'group inline-flex items-center justify-center gap-2 font-semibold select-none touch-target focus-ring transition-transform duration-fast ease-standard motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'rounded-pill whitespace-nowrap bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary-hover',
        secondary: 'rounded-pill whitespace-nowrap bg-tone text-fg hover:bg-line',
        ghost: 'rounded-pill whitespace-nowrap text-fg hover:bg-tone',
        link: 'rounded-control text-start text-link underline decoration-1 underline-offset-[0.2em] hover:decoration-2',
        danger: 'rounded-pill whitespace-nowrap bg-danger text-on-danger hover:bg-danger/85',
      },
      size: {
        sm: 'min-h-9 px-4 text-sm',
        md: 'min-h-11 px-6 text-base',
        lg: 'min-h-14 px-8 text-lg',
        icon: 'size-11 p-0',
      },
      density: { comfortable: '', compact: 'rounded-compact text-[0.8125rem]' },
    },
    compoundVariants: [
      { variant: 'link', className: 'px-0' },
      // Compact: 32px tall on a fine pointer (compact-target), 44px on a coarse one (touch-target, already on every button). The icon is 32px square.
      { density: 'compact', className: 'min-h-0 px-3 compact-target' },
      { density: 'compact', size: 'icon', className: 'size-8 px-0' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', density: 'comfortable' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, Omit<VariantProps<typeof buttonVariants>, 'density'> {
  /** `compact` for applications: 5px radius, 13px type, 32px target on a fine pointer (44px on touch). Default `comfortable`. */
  density?: Density;
  /** Render the child element (a link, say) with the button's look instead of a `<button>`. */
  asChild?: boolean;
  /** Add the trailing arrow. It moves 4px on hover and focus, and stays put under reduced motion. */
  arrow?: boolean;
}

export function Button({ className, variant, size, density, asChild = false, arrow = false, type, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size, density }), className)} type={asChild ? undefined : (type ?? 'button')} {...props}>
      <Slottable>{children}</Slottable>
      {arrow && <ArrowRight aria-hidden className="size-4 shrink-0 transition-transform duration-fast ease-standard motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1" />}
    </Comp>
  );
}
