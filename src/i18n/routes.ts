import type { AstroIntegration } from 'astro';
import { translatedLanguages } from './languages';

// Render the same components for each language; there is only one page layout to maintain.
export default function languageRoutes(): AstroIntegration {
  return {
    name: 'incetekh-languages',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const { code } of translatedLanguages) {
          for (const page of [
            'index',
            'about',
            'services',
            'products',
            'projects',
            'contact',
            'solar-guide',
            'financing',
            'terms',
            'privacy',
            '404',
          ]) {
            injectRoute({
              pattern: `/${code}/${page === 'index' ? '' : page}`,
              entrypoint: `./src/pages/${page}.astro`,
              prerender: true,
            });
          }
          injectRoute({
            pattern: `/${code}/solar-in/[city]`,
            entrypoint: './src/pages/solar-in/[city].astro',
            prerender: true,
          });
        }
      },
    },
  };
}
