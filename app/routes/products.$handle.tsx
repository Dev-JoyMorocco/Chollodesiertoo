import {redirect} from 'react-router';

/**
 * /products/<handle> — Shopify's standard product URL, used by Google Shopping,
 * Shopify emails and social shops. The site has no product pages: the tour and
 * its add-ons are booked on /booking.
 */
export async function loader() {
  return redirect('/booking', 301);
}
