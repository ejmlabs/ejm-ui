/// <reference types="vite/client" />
// `getShot(product, name)` for sites. Vite hashes and bases the generated files, so the URLs come from a glob, not from shots.json.
// Emit files instead of embedding small captures as data URLs in JavaScript. Responsive pictures fetch only the chosen source.
import index from '../generated/shots.json';
import { createShots, type ShotsIndex } from './loader';

const urls = import.meta.glob('../generated/**/*.{avif,webp,png}', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>;

export const { getShot, listShots } = createShots(index as unknown as ShotsIndex, file => {
  const url = urls[`../generated/${file}`];
  if (!url) throw new Error(`Generated shot file ${file} is missing. Run: node packages/shots/scripts/optimize.mjs`);
  return url;
});

export * from './loader';
