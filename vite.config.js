import { defineConfig } from 'vite';

// `base` is set at build time so the same config works for local dev,
// custom domains, and GitHub Pages project sites (`/<repo>/`).
export default defineConfig({
  base: process.env.VITE_BASE || './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096
  },
  server: {
    port: 5173,
    open: false
  }
});
