import type { APIRoute } from 'astro';
import { indexable } from '../data/visibility';
import { cities, cityPath } from '../data/cities';

const paths = [
  '/',
  '/about/',
  '/services/',
  '/products/',
  '/projects/',
  '/contact/',
  '/solar-guide/',
  '/financing/',
  '/terms/',
  '/privacy/',
  ...cities.map((city) => cityPath(city.slug)),
];
export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable ? paths.map((path) => `<url><loc>${new URL(path, site)}</loc></url>`).join('') : ''}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
