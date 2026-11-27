import type { Metadata } from 'next';
import DashboardView from '@/components/account/DashboardView';

// Per-user data: never prerender or cache this page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your sends',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DashboardView locale="en" />;
}
