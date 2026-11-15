/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

import type {HydrogenEnv} from '@shopify/hydrogen';

// The loader context (storefront, cart, session, env) is typed by
// @shopify/hydrogen/react-router-types; extra context goes in app/lib/context.ts.

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  interface Env extends HydrogenEnv {
    // (PUBLIC_STOREFRONT_ID and PUBLIC_CHECKOUT_DOMAIN are already on HydrogenEnv)
    /** Admin API token (custom app, write_metaobjects) — the contact form saves messages with it. */
    SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
  }
}
