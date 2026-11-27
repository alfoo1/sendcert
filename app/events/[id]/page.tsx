import type { Metadata } from 'next';
import EventDashboardView from '@/components/events/EventDashboardView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Event', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { id: string } }) {
  return <EventDashboardView locale="en" id={params.id} />;
}
