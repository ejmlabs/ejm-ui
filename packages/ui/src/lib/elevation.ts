/** The three shadow levels. Only product windows, menus and overlays have a shadow (THEME.md, Elevation and radius). */
export type Elevation = 'rest' | 'raised' | 'float';

export const ELEVATIONS: readonly Elevation[] = ['rest', 'raised', 'float'];

/** Literal class names so Tailwind finds them. */
export const shadowClass: Record<Elevation, string> = { rest: 'shadow-rest', raised: 'shadow-raised', float: 'shadow-float' };
