import { solarSources } from '../../src/data/solar';
import { productGroups } from '../../src/data/products';

const sources = new Set([
  'https://policies.google.com/privacy',
  'https://maps.google.com/help/terms_maps/',
  'https://www.cloudflare.com/turnstile-privacy-policy/',
  'https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/',
  'https://developers.cloudflare.com/speed/observatory/rum-beacon/',
  ...Object.values(solarSources),
  ...productGroups.flatMap((group) =>
    group.products.map((product) => product.source),
  ),
]);

export function isAllowedExternal(href: string) {
  if (href === 'tel:+919441259786' || sources.has(href)) return true;
  if (
    href === 'mailto:incetekhenergy@gmail.com' ||
    href === 'mailto:incetekhenergy@gmail.com?subject=Service%20complaint'
  )
    return true;
  const url = new URL(href);
  return (
    url.origin === 'https://wa.me' &&
    url.pathname === '/919441259786' &&
    [...url.searchParams.keys()].every((key) => key === 'text')
  );
}
