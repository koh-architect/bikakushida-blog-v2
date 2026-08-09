import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = 'https://bikakushida.jp';

export default defineConfig({
  site,
  integrations: [
    sitemap({
      // /plants/ はトップページと同内容のため、代表URLの / だけを掲載します。
      filter: (page) => page !== `${site}/plants/`,
      namespaces: {
        news: false,
        xhtml: false,
        image: false,
        video: false,
      },
    }),
  ],
});
