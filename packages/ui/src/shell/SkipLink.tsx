import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/utils';

/** The first focusable element on every page. Hidden until it has focus, then jumps to <main id="main">. */
export function SkipLink({ className, children = 'Skip to main content', ...rest }: Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  return (
    <a href="#main" className={cn('skip-link', className)} {...rest}>
      {children}
    </a>
  );
}
