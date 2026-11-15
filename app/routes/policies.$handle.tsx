import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {PageHero} from '~/components/PageHero';
import {SiteFooter} from '~/components/SiteFooter';
import {
  SF_SITE_SETTINGS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapSiteSettings,
  mapPageSections,
} from '~/lib/admin-queries';
import {useT} from '~/lib/ui-strings';

/**
 * The store's legal policies, written in Admin › Settings › Policies:
 * /policies/privacy-policy, /policies/refund-policy, /policies/terms-of-service
 * and /policies/shipping-policy. A policy left blank in Admin is a 404.
 */
const POLICIES_QUERY = `#graphql
  query Policies {
    shop {
      privacyPolicy { title body handle }
      refundPolicy { title body handle }
      termsOfService { title body handle }
      shippingPolicy { title body handle }
    }
  }
` as const;

type Policy = {title: string; body: string; handle: string};

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const brand = data?.brandName || 'Chollodesierto';
  return [{title: data?.policy ? `${data.policy.title} — ${brand}` : brand}];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [policiesRes, settingsRes, sectionsRes] = await Promise.all([
    storefront.query(POLICIES_QUERY).catch(() => null),
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
  ]);

  const shop = (policiesRes as any)?.shop ?? {};
  const policies: Policy[] = [
    shop.privacyPolicy,
    shop.refundPolicy,
    shop.termsOfService,
    shop.shippingPolicy,
  ].filter((p): p is Policy => Boolean(p?.body));

  const policy = policies.find((p) => p.handle === params.handle);
  if (!policy) {
    throw new Response('Not found', {status: 404});
  }

  const sections = mapPageSections(sectionsRes);
  return {
    policy,
    brandName: mapSiteSettings(settingsRes)?.brandName ?? '',
    // No hero photo of its own: borrows the booking hero, like /contact.
    heroImage: sections['booking.hero']?.image ?? null,
  };
}

export default function PolicyPage() {
  const {policy, heroImage} = useLoaderData<typeof loader>();
  const t = useT();

  return (
    <>
      <SiteNavbar />
      <main id="main-content" className="bg-sand font-body">
        <PageHero
          ariaLabel={policy.title}
          heading={policy.title}
          image={heroImage?.url || undefined}
          imageAlt={heroImage?.alt || ''}
          loading="eager"
        />
        <section
          aria-label={t('aria.policy.body', 'Policy')}
          className="mx-auto max-w-200 px-6 pb-section pt-6"
        >
          {/* Written in Shopify Admin, so the HTML is first-party. */}
          <div
            className="article-body text-base leading-[22px] text-dark/80"
            dangerouslySetInnerHTML={{__html: policy.body}}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
