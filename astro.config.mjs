import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://incetekhenergy.com',
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/reviews/': '/#reviews' },
  build: { inlineStylesheets: 'never' },
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "form-action 'none'",
        "connect-src 'self' https://cloudflareinsights.com",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://static.cloudflareinsights.com'],
      },
    },
  },
  devToolbar: { enabled: false },
});
