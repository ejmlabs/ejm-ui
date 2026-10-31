import { isBuiltin } from 'node:module';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import basic from './vite.config';

// The prerender bundle may import only its own chunks and Node built-ins. A bare package import would make Node look for the package
// in whatever node_modules sits above the site, so it fails the build with what it found. The client build is not checked.
export default defineConfig(mergeConfig(basic, {
  plugins: [{
    name: 'bare-imports',
    generateBundle(options, bundle) {
      if (!this.environment || this.environment.config.consumer !== 'server') return;
      const own = new Set(Object.keys(bundle));
      const bare = Object.values(bundle)
        .flatMap(chunk => (chunk.type === 'chunk' ? [...chunk.imports, ...chunk.dynamicImports] : []))
        .filter(id => !own.has(id) && !isBuiltin(id));
      if (bare.length) throw new Error(`prerender imports packages: ${[...new Set(bare)].sort().join(' ')}`);
      console.log(`prerender bundle checked: ${options.format}`);
    },
  } satisfies Plugin],
}));
