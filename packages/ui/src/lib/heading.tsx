import { createContext, useContext, type ReactNode } from 'react';

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;
export type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** The level the next section heading takes. The page's one h1 belongs to Hero or a page opening, so sections start at h2. */
const HeadingLevelContext = createContext<HeadingLevel>(2);

/** Gives children the next heading level, never past h6. */
export function NextHeadingLevel({ children }: { children?: ReactNode }) {
  const level = useContext(HeadingLevelContext);
  return <HeadingLevelContext.Provider value={Math.min(level + 1, 6) as HeadingLevel}>{children}</HeadingLevelContext.Provider>;
}

export function useHeadingLevel(): HeadingLevel {
  return useContext(HeadingLevelContext);
}

export function useHeadingTag(): HeadingTag {
  return `h${useHeadingLevel()}`;
}
