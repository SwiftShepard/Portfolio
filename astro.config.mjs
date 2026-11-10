import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vlothe.com',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Renders are judged on texture grain: keep full colour resolution (4:4:4) and use mozjpeg.
        jpeg: { mozjpeg: true, chromaSubsampling: '4:4:4' },
        webp: { smartSubsample: true },
      },
    },
  },
});
