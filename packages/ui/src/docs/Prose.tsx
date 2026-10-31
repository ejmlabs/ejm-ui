import type { ReactNode } from 'react';

/**
 * The shared reading surface for both React-authored and compiled documentation. Inline code keeps the base style (mono, a step smaller,
 * no fill); only its wrapping is set here, so a long name never widens a phone screen.
 */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="text-body [&_:not(pre)>code]:[overflow-wrap:anywhere] [&_li]:max-w-measure [&_p]:max-w-measure [&_p]:mt-4 [&_ul]:mt-4 [&_ol]:mt-4 [&_a]:link">{children}</div>;
}
