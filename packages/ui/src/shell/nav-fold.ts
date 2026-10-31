import type { SiteIdentity } from './Brand';
import type { NavItem } from './link';

/** Private to the shell. The classes that show the Header's nav list, and hide its menu, from the width the bar needs. */
export interface NavFold {
  list: string;
  menu: string;
}

// The candidate container widths in px, narrowest first, with literal classes so Tailwind generates each pair.
const foldClasses = [
  { min: 768, list: '@3xl:flex', menu: '@3xl:hidden' },
  { min: 896, list: '@4xl:flex', menu: '@4xl:hidden' },
  { min: 1024, list: '@5xl:flex', menu: '@5xl:hidden' },
  { min: 1152, list: '@6xl:flex', menu: '@6xl:hidden' },
  { min: 1280, list: '@7xl:flex', menu: '@7xl:hidden' },
] as const;

// Measured in Chromium and rounded up, so the estimate folds a little early rather than overflow: nav text is at most 0.57em a
// character (0.6 here) at the body size, the brand name 0.5em (0.55 here) at the heading size, and the mark is 36px tall.
// The rest of the bar: two 3rem page gutters, the home link's padding, the gap to the controls, one nav gap and the theme toggle.
const bodyPx = (w: number) => Math.min(20, Math.max(16, 14.4 + 0.0028 * w));
const headingPx = (w: number) => Math.min(32, Math.max(20, 16 + 0.011 * w));
const chrome = 96 + 16 + 16 + 4 + 44;

function needs(width: number, nav: readonly NavItem[], identity: SiteIdentity) {
  const art = identity.artwork;
  const brand = identity.name.length * 0.55 * headingPx(width) + (art ? (36 * art.width) / art.height + 10 : 0);
  const links = nav.reduce((sum, item) => sum + 24 + item.label.length * 0.6 * bodyPx(width) + (item.external ? 20 : 0), 0);
  return chrome + brand + links + Math.max(0, nav.length - 1) * 4;
}

/** The narrowest fold at which the identity, every nav link and the theme toggle fit on one line. */
export function navFold(nav: readonly NavItem[], identity: SiteIdentity): NavFold {
  return foldClasses.find(fold => needs(fold.min, nav, identity) <= fold.min) ?? foldClasses[4];
}
