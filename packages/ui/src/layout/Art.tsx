import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export interface ArtProps {
  /** Inline symbol art as markup, for example `import flow from '@ejm/ui/art/inline/divider-flow.svg?raw'`. */
  svg: string;
  /** Draw the lines on once after hydration. Without scripts, or under reduced motion, the art is fully drawn. */
  drawOn?: boolean | undefined;
}

/** Decorative symbol line art. Always aria-hidden; the lines take their color from the band (see THEME.md). */
export function Art({ svg, drawOn = false }: ArtProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (drawOn) setArmed(true); }, [drawOn]);
  return <div aria-hidden="true" className={cn('pointer-events-none select-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full', armed && 'draw-on')} dangerouslySetInnerHTML={{ __html: svg }} />;
}
