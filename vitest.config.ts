import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.{ts,tsx,mjs}', 'apps/**/*.test.{ts,tsx}'],
    globals: false,
  },
});
