# SendCert

Web platform for teachers and course creators to generate personalized PDF certificates and email them to recipients — from SendCert's own branded sender.

No user authentication, no database, no SMTP setup required by the end user.

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- `pdf-lib` — PDF generation
- `sharp` — image processing
- `nodemailer` — email delivery (server-side)
- `react-dropzone` — file uploads
- `papaparse` — CSV parsing
- `xlsx` (SheetJS) — Excel parsing

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in SMTP_HOST / SMTP_USER / SMTP_PASS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**SMTP is required to actually send emails.** SendCert sends every certificate from a single branded sender you configure server-side (e.g. Gmail with an App Password, SendGrid, Brevo, Mailgun).

## Layout

```
app/
  layout.tsx                       # Base metadata, fonts, Tailwind
  page.tsx                         # SEO landing with JSON-LD
  sitemap.ts                       # auto-generated sitemap.xml
  robots.ts                        # auto-generated robots.txt
  app/page.tsx                     # 5-step wizard (client)
  blog/                            # Placeholder posts
  api/
    generate-certificate/route.ts  # POST → PDF
    send-emails/route.ts           # POST → generate + send (rate-limited)
    waitlist/route.ts              # POST → save email to waitlist.json
components/
  Hero, HowItWorks, CTA
  StepIndicator
  TemplateStep, ConfigStep, StudentsStep, EmailStep, PreviewStep
  WaitlistModal
lib/
  pdf.ts                           # generateCertificatePdf()
  mail.ts                          # server-side SMTP + template rendering
  rateLimit.ts                     # in-memory per-IP monthly cap
  waitlist.ts                      # append-only JSON store
  templates.ts                     # preset catalog
  validation.ts                    # isValidEmail
public/
  templates/                       # 3 pre-designed SVGs
  sample-recipients.csv            # example recipient list
data/
  waitlist.json                    # created on first signup (gitignored)
```

## Flow

1. **Template** — Upload your JPG/PNG or pick one of the 3 presets. A live preview shows your uploaded image.
2. **Position** — Drag the recipient name over the certificate, or enter X/Y directly. Tune font, size, and color with a live preview.
3. **Recipients** — Upload a CSV or Excel (.csv, .xlsx, .xls) with `name` and `email` columns. SendCert validates every row in your browser — nothing is uploaded.
4. **Email** — Write the subject and body with the `{{name}}` variable.
5. **Send** — PDF preview + bulk send + final report.

## Free tier and rate limiting

Guests can send up to `RATE_LIMIT_GUEST_PER_MONTH` certificates per calendar month (default 100, counted per hashed IP). Signed-in accounts get `RATE_LIMIT_USER_PER_MONTH` (default 300). Quotas are enforced atomically in Postgres. When a limit is hit, the API returns HTTP 429: guests are invited to create a free account, and accounts can join the waitlist (stored in the Supabase `waitlist` table) to hear about larger plans.

## Sample CSV

See [`public/sample-recipients.csv`](public/sample-recipients.csv):

```csv
name,email
Maria Johnson,maria@example.com
John Martinez,john@example.com
```

Also works: `nombre,email` headers are accepted for backwards compatibility.

## SMTP providers (server-side only)

- **Gmail**: `smtp.gmail.com` / `587`. Needs an [App Password](https://support.google.com/accounts/answer/185833).
- **Brevo**: `smtp-relay.brevo.com` / `587`.
- **SendGrid**: `smtp.sendgrid.net` / `587`, user `apikey`.

## Privacy

- Recipient lists are parsed in the browser and sent to the server only when you click "Send."
- The server never persists recipient names, emails, or certificate PDFs to disk.
- The only persisted data is `data/waitlist.json` (users who opted in to premium notifications).

## Production notes

- The rate-limit Map is per-process and resets on restart. In production, back it with Redis.
- The waitlist uses a flat JSON file — fine for low volume, replace with a DB for scale.
- `maxDuration = 300` on the send route — adjust per your hosting platform's limits.
