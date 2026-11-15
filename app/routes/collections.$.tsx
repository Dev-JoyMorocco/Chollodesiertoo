import {redirect} from 'react-router';

/**
 * /collections and /collections/<handle> — Shopify's standard collection URLs.
 * The site has no catalogue pages; everything is booked on /booking.
 */
export async function loader() {
  return redirect('/booking', 301);
}
