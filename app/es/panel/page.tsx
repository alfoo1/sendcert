import type { Metadata } from 'next';
import DashboardView from '@/components/account/DashboardView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tus envíos',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DashboardView locale="es" />;
}
