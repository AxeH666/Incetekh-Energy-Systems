import type { APIRoute } from 'astro';
import { indexable } from '../data/visibility';

export const GET: APIRoute = ({ site }) =>
  new Response(
    // Crawlers must be allowed to read the preview's noindex metadata.
    `User-agent: *\nAllow: /\n${indexable ? `Sitemap: ${new URL('/sitemap.xml', site)}\n` : ''}`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
