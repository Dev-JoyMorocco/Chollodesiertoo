import type {LoaderFunctionArgs} from 'react-router';
import {BLOGS_QUERY, resolveBlogHandle} from '~/lib/queries';
import {SF_SITE_SETTINGS_QUERY, mapSiteSettings} from '~/lib/admin-queries';

/**
 * /sitemap.xml — every page of this site for search engines: the fixed pages,
 * each blog post (/blog/<handle>) and the policies written in Admin. Built from
 * the request and the store's own data, so each store lists its own URLs.
 */

/** The site's own pages. Products have no page here: booking is on /booking. */
const STATIC_PATHS = ['/', '/about', '/booking', '/faq', '/reviews', '/contact', '/blog'];

// Only the handles and dates — lighter than the listing's BLOG_ARTICLES_QUERY.
const SITEMAP_ARTICLES_QUERY = `#graphql
  query SitemapArticles($blogHandle: String!) {
    blog(handle: $blogHandle) {
      articles(first: 250, sortKey: PUBLISHED_AT, reverse: true) {
        nodes { handle publishedAt }
      }
    }
  }
` as const;

const SITEMAP_POLICIES_QUERY = `#graphql
  query SitemapPolicies {
    shop {
      privacyPolicy { handle body }
      refundPolicy { handle body }
      termsOfService { handle body }
      shippingPolicy { handle body }
    }
  }
` as const;

type Entry = {path: string; lastmod?: string};

export async function loader({request, context}: LoaderFunctionArgs) {
  const {storefront} = context;
  const origin = new URL(request.url).origin;

  const [settingsRes, blogsRes, policiesRes] = await Promise.all([
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(BLOGS_QUERY).catch(() => null),
    storefront.query(SITEMAP_POLICIES_QUERY).catch(() => null),
  ]);

  const blogHandle = resolveBlogHandle(blogsRes, mapSiteSettings(settingsRes)?.blogHandle);
  const articlesRes = await storefront
    .query(SITEMAP_ARTICLES_QUERY, {variables: {blogHandle}})
    .catch(() => null);

  const articles: Entry[] = ((articlesRes as any)?.blog?.articles?.nodes ?? []).map(
    (a: {handle: string; publishedAt?: string}) => ({
      path: `/blog/${a.handle}`,
      lastmod: a.publishedAt?.slice(0, 10),
    }),
  );

  const shop = (policiesRes as any)?.shop ?? {};
  const policies: Entry[] = [
    shop.privacyPolicy,
    shop.refundPolicy,
    shop.termsOfService,
    shop.shippingPolicy,
  ]
    .filter((p) => p?.body && p?.handle)
    .map((p) => ({path: `/policies/${p.handle}`}));

  const entries: Entry[] = [...STATIC_PATHS.map((path) => ({path})), ...articles, ...policies];

  const urls = entries
    .map(
      ({path, lastmod}) =>
        `  <url><loc>${escapeXml(origin + path)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
        }</url>`,
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `max-age=${60 * 60}`,
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
