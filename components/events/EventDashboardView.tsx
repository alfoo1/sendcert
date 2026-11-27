import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AccountShell from '@/components/account/AccountShell';
import EventDashboard from '@/components/events/EventDashboard';
import { getEventOwner } from '@/lib/eventMode/owner';
import { getEvent, listRecipients } from '@/lib/eventMode/store';
import { formatEventDate, formatEventTime } from '@/lib/eventMode/format';
import { inviteText } from '@/lib/eventMode/invite';
import { shareCardEvent } from '@/lib/eventMode/card';
import { eventDashboardPath } from '@/lib/eventMode/links';
import { localizePath, tx, type Locale } from '@/lib/i18n';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

/** Server part of the event dashboard (/events/<id>, /es/eventos/<id>). */
export default async function EventDashboardView({ locale, id }: { locale: Locale; id: string }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const owner = await getEventOwner();
  if (!owner) redirect(`${localizePath('/login', locale)}?next=${encodeURIComponent(eventDashboardPath(locale, id))}`);
  const event = await getEvent(owner.id, id);
  if (!event) notFound();
  const people = await listRecipients(event);
  const when = [formatEventDate(event, locale), formatEventTime(event, locale)].filter(Boolean).join(' · ');

  return (
    <AccountShell locale={locale} enPath={`/events/${id}`}>
      <Link href={localizePath('/dashboard', locale)} className="text-sm text-gray-500 hover:text-gray-900">
        ← {t('My sends and events', 'Mis envíos y eventos')}
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">{event.name}</h1>
      <p className="mt-1 text-sm text-gray-600">{[when, event.venue].filter(Boolean).join(' · ')}</p>
      <div className="mt-8">
        <EventDashboard
          locale={locale}
          eventId={event.id}
          people={people}
          siteUrl={SITE_URL}
          invite={inviteText(event, event.locale)}
          shareCard={event.shareCard}
          previewCard={shareCardEvent(event, event.locale)}
        />
      </div>
    </AccountShell>
  );
}
