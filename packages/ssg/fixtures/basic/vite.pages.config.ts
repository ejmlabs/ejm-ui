import { defineConfig, mergeConfig, type Plugin } from 'vite';
import basic from './vite.config';

// A plugin that reads the finished pages through `api.onPages`, as ejmSite does, and fails the build with what it saw.
export default defineConfig(mergeConfig(basic, {
  plugins: [{
    name: 'pages-reader',
    api: {
      onPages(pages: { file: string; html: string }[]) {
        throw new Error(`pages seen: ${pages.map(p => `${p.file}=${p.html.includes('<h1')}`).sort().join(' ')}`);
      },
    },
  } satisfies Plugin],
}));
