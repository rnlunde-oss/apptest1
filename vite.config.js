import { defineConfig } from 'vite';

export default defineConfig({
  base: '/apptest1/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
