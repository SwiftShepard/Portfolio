import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vlothe.com',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
