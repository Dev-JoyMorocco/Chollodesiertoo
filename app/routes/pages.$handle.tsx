import {redirect} from 'react-router';
import type {LoaderFunctionArgs} from 'react-router';

/**
 * /pages/<handle> — Shopify's standard URL for pages made in Admin › Online
 * Store › Pages. This site builds its pages in code, so known handles go to
 * their page here and anything else goes home.
 */
const PAGE_PATHS: Record<string, string> = {
  about: '/about',
  'about-us': '/about',
  contact: '/contact',
  'contact-us': '/contact',
  faq: '/faq',
  faqs: '/faq',
  reviews: '/reviews',
  booking: '/booking',
  book: '/booking',
};

export async function loader({params}: LoaderFunctionArgs) {
  return redirect(PAGE_PATHS[params.handle ?? ''] ?? '/', 301);
}
