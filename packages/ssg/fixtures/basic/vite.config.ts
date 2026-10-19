import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ejmSsg } from '@ejm/ssg/vite';

export default defineConfig({ plugins: [react(), ejmSsg({ site: 'src/site.tsx' })] });
