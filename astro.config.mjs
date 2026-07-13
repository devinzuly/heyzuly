import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir: './dist',
  build: {
    assets: '_astro',
  },
  site: 'https://heyzuly.com',
});
