import type { ReactNode } from 'react';

// The gallery's few specimen layouts, for showing what the kit does under a condition: light beside dark, or one density beside the
// other. A product page never needs them, so the kit does not offer them. They carry no color of their own.

export type Theme = 'light' | 'dark';
const themes: readonly Theme[] = ['light', 'dark'];

/** Two panes side by side from 64rem, stacked below. */
export function Compare({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">{children}</div>;
}

/** One labelled pane. With a theme it starts that theme on the Paper ground, as the theme contract says `data-theme` on any element does. */
export function Pane({ label, theme, children }: { label: string; theme?: Theme; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} {...(theme && { 'data-theme': theme, 'data-band': 'paper' })} className={theme ? 'band min-w-0 p-6 sm:p-8' : 'min-w-0'}>
      <p className="text-meta mb-6 text-muted">{label}</p>
      <div className="grid gap-8">{children}</div>
    </div>
  );
}

/** The same content under both themes. State is per pane, and ids are generated per pane. */
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <Compare>
      {themes.map(theme => <Pane key={theme} theme={theme} label={`${theme} theme`}>{children}</Pane>)}
    </Compare>
  );
}

/** A small mark for an icon button. Decorative: the button carries the accessible name. */
export function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
