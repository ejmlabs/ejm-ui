/// <reference types="vite/client" />
// A product site loads only its own capture metadata and image URLs.
import index from '../generated/cli.json';
import { createShots, type ShotsIndex } from './loader';

const urls = import.meta.glob('../generated/cli/*.{avif,webp,png}', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>;
export const { getShot, listShots } = createShots(index as unknown as ShotsIndex, file => {
  const url = urls[`../generated/${file}`];
  if (!url) throw new Error(`Generated shot file ${file} is missing. Run: node packages/shots/scripts/optimize.mjs`);
  return url;
});
