import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://incetekhenergy.com',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
});
