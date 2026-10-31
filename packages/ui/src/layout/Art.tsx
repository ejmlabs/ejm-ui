import { useDrawOn } from '../motion/useDrawOn';

export interface ArtProps {
  /** Inline symbol art as markup, for example `import flow from '@ejm/ui/art/inline/divider-flow.svg?raw'`. */
  svg: string;
  /** Draw the lines on once, when the art scrolls into view (at once for art in view at load). Without scripts, or under reduced motion, the art is fully drawn. */
  drawOn?: boolean;
}

/** Decorative symbol line art. Always aria-hidden; the lines take their color from the band (see THEME.md). */
export function Art({ svg, drawOn = false }: ArtProps) {
  // useDrawOn adds the class with classList, so the className below never changes after mount.
  const ref = useDrawOn<HTMLDivElement>();
  return <div ref={drawOn ? ref : undefined} aria-hidden="true" className="pointer-events-none select-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
