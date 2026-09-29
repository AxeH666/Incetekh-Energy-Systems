import { solarSources } from '../../src/data/solar';
import { productGroups } from '../../src/data/products';

const sources = new Set([
  ...Object.values(solarSources),
  ...productGroups.flatMap((group) =>
    group.products.map((product) => product.source),
  ),
]);

export function isAllowedExternal(href: string) {
  if (href === 'tel:+919441259786' || sources.has(href)) return true;
  const url = new URL(href);
  return (
    url.origin === 'https://wa.me' &&
    url.pathname === '/919441259786' &&
    [...url.searchParams.keys()].every((key) => key === 'text')
  );
}
