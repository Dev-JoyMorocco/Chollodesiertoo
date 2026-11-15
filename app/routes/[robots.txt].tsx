import type {LoaderFunctionArgs} from 'react-router';

/**
 * /robots.txt — lets search engines crawl the whole site and points them at the
 * sitemap. Built from the request, so each store points at its own domain.
 */
export async function loader({request}: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const body = [
    'User-agent: *',
    'Disallow: /cart',
    'Disallow: /account',
    'Disallow: /search',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
