import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import EventWizard from '@/components/events/EventWizard';
import { getEventOwner } from '@/lib/eventMode/owner';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Enviar una invitación previa al evento', robots: { index: false, follow: false } };

export default async function Page() {
  const owner = await getEventOwner();
  if (!owner) redirect('/es/login?next=/es/eventos/nuevo');
  return <EventWizard locale="es" ownerEmail={owner.email} />;
}
