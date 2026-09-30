import { defineMiddleware } from 'astro:middleware';
import { localizeHTML } from './i18n/html';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html'))
    return response;
  if (context.url.pathname === '/reviews/') return response;
  return new Response(
    localizeHTML(await response.text(), context.url.pathname, context.site!),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },
  );
});
