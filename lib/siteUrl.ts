// Public base URL of this deployment. Production uses NEXT_PUBLIC_SITE_URL
// (https://www.sendcert.org). Vercel previews use their own branch URL, so
// personal links and sign-in made on a preview come back to that preview.
export function siteUrl(): string {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');
}

// Hosts that may receive a sign-in link from production: this project's
// Vercel preview URLs and local development.
const PREVIEW_HOST = /^sendcert-[a-z0-9-]+-alfonso-2467s-projects\.vercel\.app$/;

export function isTrustedPreviewHost(host: string): boolean {
  return PREVIEW_HOST.test(host) || host === 'localhost:3000' || host === 'localhost:3200';
}
