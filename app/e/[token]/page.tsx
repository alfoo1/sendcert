import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import EventPublicShell from '@/components/events/EventPublicShell';
import EventRsvp from '@/components/events/EventRsvp';
import { lookupPublicToken } from '@/lib/eventMode/publicAccess';
import { defaultPostText, formatEventDate, formatEventTime, googleCalendarUrl } from '@/lib/eventMode/format';
import { personalLink } from '@/lib/eventMode/links';
import { shareCardEvent } from '@/lib/eventMode/card';
import { tx } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Personal links must never be indexed or leak through the Referer header.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function TooMany() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center text-gray-700">
      <p className="text-lg font-semibold">Too many requests</p>
      <p className="mt-2 text-sm">Please wait a few minutes and open your link again.</p>
    </main>
  );
}

/** A recipient's personal event page: details, attendance answer and share card. */
export default async function EventPersonalPage({ params }: { params: { token: string } }) {
  const result = await lookupPublicToken(headers(), params.token, 'page');
  if (result.status === 'limited') return <TooMany />;
  if (result.status === 'not_found') notFound();
  const { event, recipient } = result;
  const locale = event.locale;
  const t = (en: string, es: string) => tx(locale, { en, es });
  const date = formatEventDate(event, locale);
  const time = formatEventTime(event, locale);
  const place = [event.venue, event.address].filter(Boolean).join(', ');
  const mapUrl = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
  const firstName = recipient.name.split(/\s+/)[0] || recipient.name;

  return (
    <EventPublicShell event={event} token={recipient.token}>
      <header className="text-center">
        {event.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.logoUrl} alt={event.organizerName ?? ''} className="mx-auto max-h-16 max-w-[220px] object-contain" />
        ) : event.organizerName ? (
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: event.accentColor }}>
            {event.organizerName}
          </p>
        ) : null}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{event.name}</h1>
        <div className="mt-3 space-y-1 text-gray-700">
          {date && (
            <p className="font-medium">
              {date}
              {time ? ` · ${time}` : ''}
            </p>
          )}
          {place && (
            <p>
              {mapUrl ? (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-gray-300 hover:decoration-gray-700">
                  {place}
                </a>
              ) : (
                place
              )}
            </p>
          )}
        </div>
        {event.eventUrl && (
          <a href={event.eventUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium underline" style={{ color: event.accentColor }}>
            {t('Event website', 'Sitio del evento')} →
          </a>
        )}
      </header>

      <div className="mt-8">
        <EventRsvp
          token={recipient.token}
          locale={locale}
          initialRsvp={recipient.rsvp}
          initialReason={recipient.rsvpReason}
          firstName={firstName}
          fullName={recipient.name}
          hasDate={Boolean(event.eventDate)}
          googleCalendarUrl={googleCalendarUrl(event, personalLink(recipient.token))}
          card={shareCardEvent(event, locale)}
          postText={defaultPostText(event, locale, 'before')}
        />
      </div>

      {event.partnerLogos.length > 0 && (
        <section className="mt-10 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('With the support of', 'Con el apoyo de')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-6">
            {event.partnerLogos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.url} src={p.url} alt={p.name ?? ''} className="max-h-10 max-w-[120px] object-contain" />
            ))}
          </div>
        </section>
      )}
    </EventPublicShell>
  );
}
