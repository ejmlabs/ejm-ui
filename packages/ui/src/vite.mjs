// The Vite preset for any app on @ejm/ui: `plugins: [ejmUi()]`.
// It adds Tailwind (compiled in the app's own build from the one @ejm/ui/styles.css), React, one copy of React for linked and
// installed packages alike, and the design guard. A consumer needs no other build plugin and no `resolve.dedupe`.
// Plain JavaScript with a .d.mts next to it: Vite loads this file through vite.config.ts, and Node refuses to strip types from
// TypeScript under node_modules.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { designGuardPlugin } from './design-guard.mjs';

// A linked checkout resolves `react` from its own node_modules. Dedupe makes every import, in the app and in @ejm/ui, resolve from
// the app. Vite concatenates this with the app's own `resolve.dedupe`.
const reactOnce = { name: 'ejm-ui:react', config: () => ({ resolve: { dedupe: ['react', 'react-dom'] } }) };

/** @returns {import('vite').PluginOption[]} */
export function ejmUi() {
  return [tailwindcss(), react(), reactOnce, designGuardPlugin()];
}
