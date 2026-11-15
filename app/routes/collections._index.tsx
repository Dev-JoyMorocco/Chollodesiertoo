import {redirect} from 'react-router';

/** /collections — no catalogue pages here; everything is booked on /booking. */
export async function loader() {
  return redirect('/booking', 301);
}
