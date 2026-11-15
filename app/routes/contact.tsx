import {data, useFetcher, useLoaderData} from 'react-router';
import type {ActionFunctionArgs, LoaderFunctionArgs, MetaFunction} from 'react-router';
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
import {metaT} from '~/lib/ui-strings';
import {adminQuery} from '~/lib/admin-query';

export const meta: MetaFunction<typeof loader> = ({data, matches}) => {
  const t = metaT(matches);
  const brand = data?.settings?.brandName || 'Chollodesierto';
  return [
    {title: `${t('meta.contact.title', 'Contact')} — ${brand}`},
    {
      name: 'description',
      content: t(
        'meta.contact.description',
        'Get in touch about your 3-day Sahara desert tour — message us on WhatsApp or find us on social.',
      ),
    },
  ];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [settingsRes, sectionsRes] = await Promise.all([
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
  ]);

  const sections = mapPageSections(sectionsRes);

  return {
    settings: mapSiteSettings(settingsRes),
    hero: sections['contact.hero'] ?? null,
    // Each page hero falls back to the booking hero's photo until its own
    // `page_section` image is set in Admin.
    heroFallback: sections['booking.hero']?.image ?? null,
    whatsapp: sections['contact.whatsapp'] ?? null,
    social: sections['contact.social'] ?? null,
    form: sections['contact.form'] ?? null,
  };
}

// ── Contact form ─────────────────────────────────────────────────────────────
// Each message is saved in Shopify as a `contact_message` metaobject entry
// (Admin › Content › Metaobjects › Contact Message), through the Admin API, so
// messages stay in Shopify with no third-party service.

const CONTACT_MESSAGE_CREATE = `
  mutation ContactMessageCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id }
      userErrors { field message }
    }
  }
`;

type ContactField = 'name' | 'email' | 'message';
type ContactResult = {
  ok?: boolean;
  /** Which fields failed validation; the page shows its own translated text. */
  fieldErrors?: Partial<Record<ContactField, true>>;
  /** The message could not be saved (server or setup problem). */
  failed?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({request, context}: ActionFunctionArgs) {
  const form = await request.formData();

  // Honeypot: hidden from people, filled in by spam bots. Pretend it worked.
  if (String(form.get('company') ?? '')) {
    return data<ContactResult>({ok: true});
  }

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();

  const fieldErrors: ContactResult['fieldErrors'] = {};
  if (!name || name.length > 100) fieldErrors.name = true;
  if (!EMAIL_RE.test(email) || email.length > 200) fieldErrors.email = true;
  if (message.length < 10 || message.length > 5000) fieldErrors.message = true;
  if (Object.keys(fieldErrors).length) {
    return data<ContactResult>({fieldErrors}, {status: 400});
  }

  try {
    const result = await adminQuery<{
      metaobjectCreate: {userErrors: Array<{message: string}>};
    }>(context.env, CONTACT_MESSAGE_CREATE, {
      metaobject: {
        type: 'contact_message',
        fields: [
          {key: 'name', value: name},
          {key: 'email', value: email},
          {key: 'message', value: message},
          {key: 'submitted_at', value: new Date().toISOString()},
        ],
      },
    });
    if (result.metaobjectCreate.userErrors.length) {
      console.error('Contact message rejected:', result.metaobjectCreate.userErrors);
      return data<ContactResult>({failed: true}, {status: 500});
    }
  } catch (error) {
    console.error('Contact message failed:', error);
    return data<ContactResult>({failed: true}, {status: 500});
  }

  return data<ContactResult>({ok: true});
}

export default function ContactPage() {
  const {settings, hero, heroFallback, social, form, whatsapp} =
    useLoaderData<typeof loader>();
  const t = useT();

  const whatsappUrl = settings?.whatsappUrl || '';
  const instagramUrl = settings?.instagramUrl || '';
  const tiktokUrl = settings?.tiktokUrl || '';
  const instagramHandle = settings?.instagramHandle || '';

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <PageHero
          ariaLabel={t('aria.contact.hero', 'Contact us')}
          heading={hero?.heading || t('contact.heading', 'Get in touch.')}
          subtext={
            hero?.subheading[0] ||
            t(
              'contact.hero_subtext',
              'Questions before you book? We answer every message — usually within the hour.',
            )
          }
          image={hero?.image?.url || heroFallback?.url || undefined}
          imageAlt={hero?.image?.alt || heroFallback?.alt || ''}
          loading="eager"
        />
        {/* Flat sand, not a white-to-sand gradient: the hero above already
            resolves into sand, so starting this section on white would leave a
            pale band across the join. */}
        <section
          aria-label={t('aria.contact.section', 'Contact us')}
          className="bg-sand py-section font-body"
        >
          <div className="container mx-auto max-w-content px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* WhatsApp */}
              <article className="flex flex-col rounded-card bg-white p-8 shadow-card">
                <h2 className="font-display text-price text-dark">
                  {whatsapp?.heading || t('contact.whatsapp_heading', 'Chat with us')}
                </h2>
                <p className="mt-3 flex-1 text-base leading-relaxed text-dark/80">
                  {whatsapp?.body[0] ||
                    t(
                      'contact.whatsapp_body',
                      'WhatsApp us if you\u2019d rather talk first \u2014 we usually answer within an hour.',
                    )}
                </p>
                {/* site_settings.whatsapp_url has no value yet — the field was
                    stripped from the metaobject because '#whatsapp' isn't a valid
                    URL. Render a disabled control rather than an empty <a href="">,
                    which would just reload the page. */}
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    aria-label={t('aria.contact.whatsapp', 'Chat with us on WhatsApp')}
                    className="mt-6 inline-flex items-center justify-center gap-2.5 self-start rounded-full
                               px-7 py-3 font-display text-btn btn-whatsapp"
                  >
                    <WhatsAppIcon />
                    {whatsapp?.labelPrimary || t('contact.whatsapp_cta', 'Chat on WhatsApp')}
                  </a>
                ) : (
                  <>
                    <span
                      aria-disabled="true"
                      className="mt-6 inline-flex items-center justify-center gap-2.5 self-start rounded-full
                                 px-7 py-3 font-display text-btn btn-whatsapp"
                    >
                      <WhatsAppIcon />
                      {whatsapp?.labelPrimary || t('contact.whatsapp_cta', 'Chat on WhatsApp')}
                    </span>
                    <p className="mt-3 text-label text-dark/60">
                      {t('contact.whatsapp_missing', 'Our WhatsApp number isn\u2019t published yet.')}
                    </p>
                  </>
                )}
              </article>

              {/* Social */}
              <article className="flex flex-col rounded-card bg-white p-8 shadow-card">
                <h2 className="font-display text-price text-dark">
                  {social?.heading || t('contact.social_heading', 'Find us')}
                </h2>
                {instagramHandle ? (
                  <p className="mt-3 flex-1 text-base leading-relaxed text-dark/80">
                    {t('contact.social_tag', 'Tag')} @{instagramHandle}
                  </p>
                ) : (
                  <p className="mt-3 flex-1" />
                )}
                <ul role="list" className="mt-6 flex items-center gap-3.5">
                  <li>
                    <SocialLink href={instagramUrl} label="Instagram" icon="instagram" />
                  </li>
                  <li>
                    <SocialLink href={tiktokUrl} label="TikTok" icon="tiktok" />
                  </li>
                </ul>
                {!instagramUrl && !tiktokUrl && (
                  <p className="mt-3 text-label text-dark/60">
                    {t('contact.social_missing', 'Our social links aren\u2019t published yet.')}
                  </p>
                )}
              </article>
            </div>

            <ContactForm
              heading={form?.heading || t('contact.form_heading', 'Send a message')}
              intro={
                form?.body[0] ||
                t(
                  'contact.form_body',
                  'Prefer email? Use the form \u2014 or message us on WhatsApp for a faster reply.',
                )
              }
              submitLabel={form?.labelPrimary || t('contact.form_cta', 'Send message')}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// ── Sub-components (mirrors the icon set used across the site) ───────────────

const FIELD_CLASS =
  'rounded-xl border border-dark/15 bg-white px-4 py-3 text-base text-dark outline-none ' +
  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 ' +
  'aria-invalid:border-error';

/** Posts to this route's action; the message is saved in Shopify Admin. */
function ContactForm({
  heading,
  intro,
  submitLabel,
}: {
  heading: string;
  intro: string;
  submitLabel: string;
}) {
  const t = useT();
  const fetcher = useFetcher<ContactResult>();
  const sending = fetcher.state !== 'idle';
  const result = fetcher.data;
  const errors = result?.fieldErrors ?? {};

  if (result?.ok) {
    return (
      <div role="status" className="mt-6 rounded-card bg-white p-8 shadow-card">
        <h2 className="font-display text-price text-dark">
          {t('contact.form_sent_heading', 'Message sent.')}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-dark/80">
          {t('contact.form_sent_body', 'Thank you \u2014 we\u2019ll reply by email as soon as we can.')}
        </p>
      </div>
    );
  }

  const fieldError = (field: ContactField, text: string) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} className="text-label text-error">
        {text}
      </p>
    ) : null;

  return (
    <fetcher.Form
      method="post"
      noValidate
      className="mt-6 rounded-card bg-white p-8 shadow-card"
      aria-describedby="contact-form-note"
    >
      <h2 className="font-display text-price text-dark">{heading}</h2>
      <p id="contact-form-note" className="mt-3 text-base leading-relaxed text-dark/80">
        {intro}
      </p>

      {/* Honeypot for spam bots — hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-label font-bold text-dark">
            {t('contact.field_name', 'Name')}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={errors.name || undefined}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            className={FIELD_CLASS}
          />
          {fieldError('name', t('contact.error_name', 'Please enter your name.'))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-label font-bold text-dark">
            {t('contact.field_email', 'Email')}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            aria-invalid={errors.email || undefined}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            className={FIELD_CLASS}
          />
          {fieldError('email', t('contact.error_email', 'Please enter a valid email address.'))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-label font-bold text-dark">
          {t('contact.field_message', 'Message')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          maxLength={5000}
          aria-invalid={errors.message || undefined}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          className={FIELD_CLASS}
        />
        {fieldError(
          'message',
          t('contact.error_message', 'Please write a message (at least 10 characters).'),
        )}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="mt-6 inline-flex items-center gap-2.5 rounded-full px-7 py-3
                   font-display text-btn text-sand btn-primary disabled:opacity-50"
      >
        {sending ? t('contact.form_sending', 'Sending\u2026') : submitLabel}
      </button>

      {result?.failed && (
        <p role="alert" className="mt-3 text-label text-error">
          {t(
            'contact.form_failed',
            'Your message could not be sent. Please try again, or message us on WhatsApp.',
          )}
        </p>
      )}
    </fetcher.Form>
  );
}


function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.004a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02s-.43.06-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

/** Renders an anchor when site_settings has a URL, otherwise an inert badge. */
function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: 'instagram' | 'tiktok';
}) {
  const t = useT();
  const unavailableNote = t('contact.social_link_missing', '(link not available)');
  const shape =
    'flex h-11 w-11 items-center justify-center rounded-full border border-dark/15';
  if (!href) {
    return (
      <span aria-label={`${label} ${unavailableNote}`} aria-disabled="true" className={`${shape} text-dark/30`}>
        <SocialIcon icon={icon} />
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-label={label}
      className={`${shape} text-dark btn-smooth hover:border-primary hover:text-primary`}
    >
      <SocialIcon icon={icon} />
    </a>
  );
}

function SocialIcon({icon}: {icon: 'instagram' | 'tiktok'}) {
  if (icon === 'instagram') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.5c-1.3.1-2.5-.2-3.6-.9v5.9c0 3.4-2.5 5.6-5.5 5.6-2.9 0-5.1-2.1-5.1-4.9 0-3 2.4-5 5.4-4.7v2.6c-.4-.1-.9-.2-1.3-.1-1.2.1-2 1-1.9 2.2.1 1.2 1 2 2.2 1.9 1.3-.1 2-1 2-2.4V3h3.9z" />
    </svg>
  );
}
