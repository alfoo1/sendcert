import Link from 'next/link';

// Shared blog layout: top nav + readable content container.
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <article className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-brand-600">
          {children}
        </article>
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SendCert
        </div>
      </footer>
    </>
  );
}
