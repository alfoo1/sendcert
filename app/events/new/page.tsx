import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import EventWizard from '@/components/events/EventWizard';
import { getEventOwner } from '@/lib/eventMode/owner';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Send a pre-event invite', robots: { index: false, follow: false } };

export default async function Page() {
  const owner = await getEventOwner();
  if (!owner) redirect('/login?next=/events/new');
  return <EventWizard locale="en" ownerEmail={owner.email} />;
}
