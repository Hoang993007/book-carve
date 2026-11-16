import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the packaged app loads dist/index.html from disk.
  base: './',
  server: { port: 5180 },
});
