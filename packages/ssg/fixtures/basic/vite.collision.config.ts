import { defineConfig, mergeConfig, type Plugin } from 'vite';
import basic from './vite.config';

// Reproduce two build environments that emit different bytes at the same asset path.
export default defineConfig(({ isSsrBuild }) => mergeConfig(basic, {
  plugins: [{
    name: 'conflicting-server-font',
    generateBundle(_, bundle) {
      if (!isSsrBuild) return;
      for (const asset of Object.values(bundle))
        if (asset.type === 'asset' && asset.fileName.endsWith('.woff2'))
          asset.source = 'conflicting server font';
    },
  } satisfies Plugin],
}));
