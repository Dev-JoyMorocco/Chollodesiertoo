import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

// Extra properties for the loader context (CMS clients, SDKs, …). None yet.
const additionalContext = {} as const;

type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
  // context.cart.get() and cart mutations return the codegen'd cart type.
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
}

/**
 * Builds the loader context (storefront, cart, session, env) for each request.
 * Separate from server.ts so its type can be shared.
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
