import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ejmSite } from '@ejm/site/vite';
import { ejmSsg } from '@ejm/ssg/vite';

// ejmSite adds the shared head tags and writes theme-boot.js, the ejm-ui icons, manifest, social card and _headers. ejmSsg prerenders every route.
// The gallery has no analytics host, so the policy does not allow the beacon.
export default defineConfig({
  plugins: [tailwindcss(), react(), ejmSite({ project: 'ui', headers: { analytics: false } }), ejmSsg({ site: 'src/site.tsx' })],
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
  },
});
