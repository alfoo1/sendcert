import Link from 'next/link';
import HeroVisual from '@/components/landing/HeroVisual';

const VALUE_CHIPS = [
  'Free',
  'No sign-up',
  'PDF by email',
  'Verification link for every certificate',
];

export default function Hero() {
  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:pb-28 lg:pt-20">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            Personalized certificates, emailed to everyone in minutes
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0">
            Pick a design, add your list of names and emails, and each person gets their
            own PDF certificate by email, with a link anyone can use to check it&apos;s real.
            No design skills needed.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/app"
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
            >
              Create certificates free →
            </Link>
            <Link
              href="#templates"
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              Browse templates
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
            {VALUE_CHIPS.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <svg className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
