import { defineConfig } from 'vite';
import { ejmlabs } from '@ejm/site/vite';

// The gallery is a site like any other: one preset. It has no analytics host, so the policy does not allow the beacon.
export default defineConfig({
  plugins: [ejmlabs({ project: 'ui', headers: { analytics: false } })],
});
