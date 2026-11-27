import type { Metadata } from 'next';
import SendView from '@/components/account/SendView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Send details',
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: { id: string } }) {
  return <SendView locale="en" batchId={params.id} />;
}
