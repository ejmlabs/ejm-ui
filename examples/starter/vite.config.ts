import { defineConfig } from 'vite';
import { ejmlabs } from '@ejm/site/vite';

// The whole build setup: Tailwind, React, the design guard, the shared head and headers, prerendering and the build options.
export default defineConfig({ plugins: [ejmlabs({ project: 'ejmlabs' })] });
