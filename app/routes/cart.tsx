import {redirect} from 'react-router';

/**
 * /cart — the site has no cart page; booking happens on /booking. Shopify
 * checkout's "return to cart" link lands here, so send it to the booking form.
 */
export async function loader() {
  return redirect('/booking', 302);
}
