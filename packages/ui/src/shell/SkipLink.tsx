import type { ReactNode } from 'react';

/** The first focusable element on every page. Hidden until it has focus, then jumps to <main id="main">. */
export function SkipLink({ children = 'Skip to main content' }: { children?: ReactNode }) {
  return (
    <a href="#main" className="skip-link">
      {children}
    </a>
  );
}
