import type { ReactNode, Ref } from 'react';
import { DensityProvider } from '../lib/density';
import { cn } from '../lib/utils';

// Specimens for documentation pages of any ejmlabs design or product docs: the same content under both themes or both densities,
// and samples of the tokens fed from their names. They carry no color of their own beyond the token they show, and no prop takes a
// class or a style. A docs page never needs a class of its own to show the system.

/** One labelled pane. With a theme it starts that theme on the Paper ground, as the theme contract says `data-theme` on any element does. */
function Pane({ label, theme, children }: { label: string; theme?: 'light' | 'dark'; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-theme={theme} data-band={theme && 'paper'} className={cn('min-w-0', theme && 'band p-6 sm:p-8')}>
      <p className="mb-6 text-meta text-muted">{label}</p>
      <div className="grid gap-8">{children}</div>
    </div>
  );
}

/** Two panes side by side from 56rem of their own width, stacked below, so a pair fits a narrow column as well as a wide one. */
function Pair({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid gap-x-12 gap-y-10 @4xl:grid-cols-2">{children}</div>
    </div>
  );
}

/** The same content under the light and the dark theme, side by side. State is per pane, and ids are generated per pane. */
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <Pair>
      <Pane theme="light" label="light theme">{children}</Pane>
      <Pane theme="dark" label="dark theme">{children}</Pane>
    </Pair>
  );
}

/** The same content on a comfortable surface (a site) and a compact one (an application), side by side. */
export function DensityPair({ children }: { children: ReactNode }) {
  return (
    <Pair>
      <Pane label="Comfortable, for sites"><DensityProvider density="comfortable">{children}</DensityProvider></Pane>
      <Pane label="Compact, for applications"><DensityProvider density="compact">{children}</DensityProvider></Pane>
    </Pair>
  );
}

// Literal class names, so Tailwind finds each one.
const swatchClass = {
  'hue-1': 'bg-hue-1', 'hue-2': 'bg-hue-2', 'hue-3': 'bg-hue-3', 'hue-4': 'bg-hue-4', 'hue-5': 'bg-hue-5', 'hue-6': 'bg-hue-6',
  sage: 'bg-sage', forest: 'bg-forest', ink: 'bg-ink', paper: 'bg-paper', mist: 'bg-mist', white: 'bg-white',
  success: 'bg-success', warn: 'bg-warn', danger: 'bg-danger', info: 'bg-info',
} as const;

/** The name of a color token: a chart hue (`HUES` from `@ejm/tokens`), a brand color or a status color. */
export type SwatchColor = keyof typeof swatchClass;

/** A row of color samples, each named in mono under its swatch. Pass token names, for example `HUES`. */
export function ColorSwatches({ label, colors }: { label: string; colors: readonly SwatchColor[] }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-x-6 gap-y-4">
      {colors.map(color => (
        <li key={color} className="grid justify-items-start gap-2">
          <span aria-hidden="true" className={cn('size-8 border', swatchClass[color])} />
          <span className="text-meta text-muted">{color}</span>
        </li>
      ))}
    </ul>
  );
}

const scale = [
  ['display', 'text-display', 'Display'],
  ['title', 'text-title', 'Title'],
  ['heading', 'text-heading', 'Heading'],
  ['lead', 'text-lead', 'Lead paragraph text'],
  ['body', 'text-body', 'Body text at 16 to 20 pixels.'],
  ['meta', 'text-meta', 'META 0123456789 mono'],
  ['title with tabular-nums', 'text-title tabular-nums', '1,284'],
] as const;

/** The six type sizes and the tabular figures, one hairline row each, the token name in mono above its sample. */
export function TypeScaleSample() {
  return (
    <ul aria-label="Type scale" className="min-w-0">
      {scale.map(([name, sizeClass, sample]) => (
        <li key={name} className="hairline-t py-4">
          <p className="mb-2 text-meta text-muted">{name}</p>
          <p className={sizeClass}>{sample}</p>
        </li>
      ))}
    </ul>
  );
}

// The utility is the name, so each class is written once, as a literal Tailwind can find.
const elevation = ['shadow-rest', 'shadow-raised', 'shadow-float'] as const;

/** The three shadow levels on window-shaped outlines, the only kind of object that has a shadow. Unfilled, so the sample is a shadow and an edge, never a box. */
export function ElevationSample() {
  return (
    <ul aria-label="Elevation levels" className="flex flex-wrap gap-10">
      {elevation.map(shadow => (
        <li key={shadow} className={cn('w-full max-w-64 rounded-window border border-line p-6', shadow)}>
          <p className="text-meta">{shadow}</p>
        </li>
      ))}
    </ul>
  );
}

const radii = ['rounded-control', 'rounded-pill', 'rounded-window'] as const;

/** The three radii as outlines, each named in mono. There is no fill, because a radius is an edge. */
export function RadiusSample() {
  return (
    <ul aria-label="Radii" className="flex flex-wrap gap-10">
      {radii.map(radius => (
        <li key={radius} className="grid justify-items-start gap-3">
          <span aria-hidden="true" className={cn('block h-16 w-32 border border-control', radius)} />
          <span className="text-meta text-muted">{radius}</span>
        </li>
      ))}
    </ul>
  );
}

/** A region the reader can drag wider or narrower, for a demo of what adapts to the space it has. Attach the ref the demo measures. */
export function ResizableSample({ ref, children }: { ref?: Ref<HTMLDivElement>; children?: ReactNode }) {
  return <div ref={ref} className="hairline w-full min-w-48 resize-x overflow-auto">{children}</div>;
}

/** A small line drawing for a draw-on demo: three paths, each with `pathLength="1"`. Attach the ref that `useDrawOn` returns. */
export function DrawOnSample({ ref }: { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} viewBox="0 0 120 60" className="art max-w-64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path pathLength="1" d="M4 50 C 30 4, 60 4, 116 50" />
      <path pathLength="1" d="M4 30 H 116" />
      <path pathLength="1" d="M60 4 V 56" />
    </svg>
  );
}
