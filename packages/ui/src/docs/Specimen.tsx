import { useId, type ReactNode } from 'react';

// Specimens show a part of the kit under a condition: one theme beside the other, or one density beside the other. They are the
// docs parts of the theme contract, so they carry no color of their own.

export type SpecimenTheme = 'light' | 'dark';
const themes: readonly SpecimenTheme[] = ['light', 'dark'];
const themeLabel: Record<SpecimenTheme, string> = { light: 'Light theme', dark: 'Dark theme' };

export interface SpecimenProps {
  /** Names the example. It shows above it in the meta face and names the group. */
  label: string;
  /** Starts this theme for the example, on the Paper ground with room around it (`data-theme` on any element, THEME.md). Omit to keep the page's. */
  theme?: SpecimenTheme;
  children: ReactNode;
}

/** One labelled example: a group named by its label, with its children in one column. */
export function Specimen({ label, theme, children }: SpecimenProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} data-theme={theme} data-band={theme && 'paper'} className={theme ? 'band min-w-0 p-6 sm:p-8' : 'min-w-0'}>
      <p id={id} className="text-meta mb-6 text-muted">{label}</p>
      <div className="grid gap-8">{children}</div>
    </div>
  );
}

/** Two specimens side by side from 64rem, stacked below. */
export function Compare({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">{children}</div>;
}

/** The same children in a light and a dark specimen, side by side from 64rem. Each copy has its own state and ids. */
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <Compare>
      {themes.map(theme => <Specimen key={theme} theme={theme} label={themeLabel[theme]}>{children}</Specimen>)}
    </Compare>
  );
}

// The six sizes of THEME.md, Type. Literal class names so Tailwind finds them.
const typeScale = [
  { name: 'display', className: 'hairline-t py-4 text-display', sample: 'Display' },
  { name: 'title', className: 'hairline-t py-4 text-title', sample: 'Title' },
  { name: 'heading', className: 'hairline-t py-4 text-heading', sample: 'Heading' },
  { name: 'lead', className: 'hairline-t py-4 text-lead', sample: 'Lead paragraph text' },
  { name: 'body', className: 'hairline-t py-4 text-body', sample: 'Body text at 16 to 20 pixels.' },
  { name: 'meta', className: 'hairline-t py-4 text-meta', sample: 'META 0123456789 mono' },
] as const;

/** The type scale: each of the six sizes in its own size, one per hairline row. */
export function TypeScale() {
  return <div>{typeScale.map(size => <p key={size.name} className={size.className}>{size.sample}</p>)}</div>;
}
