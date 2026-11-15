import {redirect} from 'react-router';

/** /search — the site has no search page; Shopify's standard search URL goes home. */
export async function loader() {
  return redirect('/', 302);
}
