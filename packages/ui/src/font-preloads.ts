import manrope from './fonts/manrope-latin.woff2?url';
import plexMono from './fonts/ibm-plex-mono-500-latin.woff2?url';

/**
 * Props for the two <link rel="preload"> tags every page needs in its head, with the hashed URLs Vite gave the font files.
 * Render each as <link {...props} />, or hand them to the router's links/meta export. crossOrigin is required for fonts
 * even from the same origin.
 */
export const fontPreloads = [manrope, plexMono].map(href => ({ rel: 'preload', as: 'font', type: 'font/woff2', href, crossOrigin: 'anonymous' as const }));
