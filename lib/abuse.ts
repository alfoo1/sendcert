// Abuse filter for the text people write into emails we send from our own
// domain (certificate emails, test emails, event invites).
//
// Background: on 2026-11-27 SendCert was used as a guest to send phishing
// ("Dear Poshmark Member ... one-time profile verification ... link"), with
// the text written in Unicode "bold" letters to dodge keyword filters. A
// certificate email doesn't need links (we add the verification link
// ourselves), so:
//   - guests: no links at all;
//   - everyone: no link shorteners, no links to bare IPs, no links whose
//     host pretends to be a known brand, and no classic phishing wording.
//
// The text is normalized before scanning (NFKC folds "𝗣𝗼𝘀𝗵𝗺𝗮𝗿𝗸" into
// "Poshmark", invisible characters are dropped, and keyword checks also
// read common digit swaps like "P0sh").

export type AbuseCode = 'link' | 'shortener' | 'ip_link' | 'lookalike' | 'phishing';

export type ContentCheck =
  | { ok: true }
  | { ok: false; code: AbuseCode; match: string };

/** NFKC + lowercase + no invisible characters. Keeps URLs intact. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁤⁪-⁯﻿]/g, '')
    .toLowerCase();
}

/** For keyword checks only: undoes common digit/symbol swaps and squeezes spaces. */
function deLeet(s: string): string {
  return s
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[’`´]/g, "'")
    .replace(/[^\S\n]+/g, ' ');
}

const SHORTENERS = [
  'tr.ee', 'linktr.ee', 'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 'tiny.cc', 'bl.ink', 'short.io', 'shorte.st', 'adf.ly',
  'v.gd', 'x.gd', 'qrco.de', 'lnkd.in', 's.id', 'u.to', 'clck.ru', 'surl.li', 'urlz.fr', 't.ly', 'shorturl.com',
  'tiny.one', 'snip.ly', 'gg.gg', 'han.gl', 'beacons.ai', 'linkin.bio', 'lnk.bio', 'taplink.cc', 'msha.ke',
];

// Brands phishers like to impersonate. Only used against link hosts
// ("poshmark.example.com") and in "Dear <Brand> member" greetings, never on
// their own: "Amazon Web Services course" is a perfectly normal certificate.
const BRANDS = [
  'poshmark', 'paypal', 'venmo', 'cashapp', 'zelle', 'stripe', 'coinbase', 'binance', 'metamask', 'apple',
  'icloud', 'microsoft', 'outlook', 'office365', 'google', 'gmail', 'amazon', 'netflix', 'facebook',
  'instagram', 'whatsapp', 'ebay', 'etsy', 'mercari', 'depop', 'vinted', 'wallapop', 'mercadolibre',
  'mercadopago', 'fedex', 'docusign', 'dropbox', 'wellsfargo', 'bankofamerica', 'citibank', 'hsbc',
  'santander', 'shopify', 'linkedin', 'telegram', 'roblox', 'usps', 'dhl',
];

// Other domains a brand legitimately sends from (outlook.office.com,
// fonts.googleapis.com...). A host whose own name starts with the brand
// ("googleapis", "poshmarkapp") is also left alone.
const BRAND_OWNERS: Record<string, string[]> = {
  outlook: ['office', 'live', 'microsoft', 'office365', 'microsoftonline'],
  microsoft: ['office', 'live', 'azure', 'windows', 'sharepoint', 'office365', 'bing'],
  office365: ['office', 'microsoft'],
  google: ['youtube', 'gstatic', 'withgoogle', 'blogger', 'blogspot', 'gle'],
  gmail: ['google'],
  apple: ['icloud'],
  icloud: ['apple'],
  facebook: ['fb', 'meta', 'messenger'],
  instagram: ['facebook', 'cdninstagram', 'meta'],
  whatsapp: ['facebook', 'meta', 'wa'],
  amazon: ['aws', 'amazonaws', 'amzn', 'a2z'],
  linkedin: ['licdn'],
  mercadopago: ['mercadolibre', 'mercadolivre'],
  mercadolibre: ['mercadopago', 'mercadolivre'],
};

const BRAND_GREETING = new RegExp(`\\bdear\\s+(${BRANDS.join('|')}|posh)\\s+(member|customer|user|seller|buyer|client|account\\s+holder)\\b`);

// Wording typical of credential / payment phishing and fake parcel scams.
// Matched on normalized, de-leeted text. Kept to phrases, because normal
// certificate emails talk about "verification" all the time.
const PHISHING_PATTERNS: RegExp[] = [
  BRAND_GREETING,
  /\b(verify|confirm|validate|unlock|restore|reactivate|secure)\s+(your\s+)?(account|identity|wallet|login|credentials|billing)\b/,
  /\bupdate\s+(your\s+)?(billing|payment|card|bank)\s+(info|information|details|method)\b/,
  /\b(account|identity|profile|one-time|kyc)\s+(verification|validation)\b/,
  /\b(receive|release|claim|unlock)\s+(your\s+)?(payments?|funds|money|refund|prize|reward|earnings)\b/,
  /\baccount\s+(has\s+been\s+|will\s+be\s+|is\s+)?(suspended|locked|limited|restricted|disabled|deactivated|on\s+hold|frozen)\b/,
  /\b(full|continued|uninterrupted)\s+access\s+to\s+your\s+account\b/,
  /\b(unusual|suspicious)\s+(sign-?in|login|activity)\b/,
  /\b(enter|confirm|provide|update)\s+(your\s+)?(password|passcode|card\s+(number|details)|bank\s+details|seed\s+phrase|recovery\s+phrase|ssn)\b/,
  /\b(seed|recovery)\s+phrase\b/,
  /\byour\s+recent\s+(sale|order|purchase)\b/,
  /\b(sale|order)\s+has\s+been\s+(successfully\s+)?(completed|sold|confirmed|shipped)\b/,
  /\bshipping\s+(info|information|label|details|fee)\b/,
  /\b(tracking|parcel|package|shipment)\s+(number|on\s+hold|delivery\s+failed|could\s+not\s+be\s+delivered)\b/,
  /\b(customs|delivery|redelivery)\s+fee\b/,
  /\bdear\s+(valued\s+)?(customer|user|seller|buyer|account\s+holder)\b/,
  /\b(support|security|billing|verification|trust\s+and\s+safety)\s+team\s+20\d\d\b/,
  /\b(you\s+have\s+won|lottery|inheritance|gift\s+card\s+code|wire\s+transfer)\b/,
];

// Things that look like domains but are names of technologies people put in
// course certificates.
const NOT_DOMAINS = new Set(['asp.net', 'ado.net', 'vb.net', 'node.js', 'vue.js', 'next.js', 'react.js', 'nuxt.js', 'd3.js', 'three.js']);

const COMMON_TLDS =
  'com|net|org|info|biz|xyz|top|site|online|store|shop|app|dev|io|ly|ee|cc|tk|ml|ga|cf|gq|ru|cn|uk|fr|nl|br|ar|mx|cl|pe|uy|ca|au|link|click|live|life|pro|club|vip|icu|buzz|work|fun|space|website|page|ai|gg|tv|ws|su|pw|cyou|rest|sbs|cfd|bond|lol|mobi|asia|ink|world|today|news|email|help|support|services|center|digital|tech|cloud|host|ltd|group|zip|mov|edu|gov';
// Also real TLDs, but common words too ("great.So happy", "Saludos.Es"):
// only treated as a link when followed by a path.
const WORDLIKE_TLDS = 'in|it|me|to|so|us|co|es|de|be|at|no|is|am|on|go|do|my|la|ma|one|inc';

// http(s)://… or www.…
const URL_RE = /\b(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"')\]]+/gi;
const LABEL = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+';
// Bare domains: "keningjiaju.com/123", "example.top".
const BARE_DOMAIN_RE = new RegExp(`(?<![@\\w.-])(${LABEL}(?:${COMMON_TLDS}))(?![a-z0-9-])`, 'gi');
const BARE_WORDLIKE_RE = new RegExp(`(?<![@\\w.-])(${LABEL}(?:${WORDLIKE_TLDS}))\\/`, 'gi');

/** Hosts of every link-ish thing in the (normalized) text. */
export function findLinkHosts(normalized: string): string[] {
  const hosts: string[] = [];
  for (const m of normalized.matchAll(URL_RE)) {
    const raw = m[0].replace(/^hxxp/, 'http');
    const withScheme = raw.startsWith('www.') ? `http://${raw}` : raw;
    try {
      hosts.push(new URL(withScheme).hostname.replace(/^www\./, ''));
    } catch {
      hosts.push(raw);
    }
  }
  // Drop email addresses first so "info@school.edu" isn't a link.
  const rest = normalized.replace(/[^\s@]+@[^\s@]+/g, ' ').replace(URL_RE, ' ');
  for (const re of [BARE_DOMAIN_RE, BARE_WORDLIKE_RE]) {
    for (const m of rest.matchAll(re)) {
      const host = m[1].replace(/^www\./, '');
      if (NOT_DOMAINS.has(host)) continue;
      hosts.push(host);
    }
  }
  return hosts;
}

function isShortener(host: string): boolean {
  return SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`));
}

function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
}

// Brands also caught inside a hyphenated name ("mypaypal-login.top"). Only
// long, distinctive ones: "stripe" would hit "pinstripe-design.com".
const EMBEDDED_BRANDS = new Set(['paypal', 'poshmark', 'coinbase', 'binance', 'metamask', 'netflix', 'mercadopago', 'mercadolibre', 'docusign', 'wellsfargo', 'bankofamerica', 'icloud', 'microsoft', 'office365']);

// "example.com.ar", "example.co.uk": the site's own name is one label further left.
const SECOND_LEVEL = new Set(['com', 'co', 'org', 'net', 'gov', 'edu', 'ac', 'gob', 'mil']);

/** "poshmark.keningjiaju.com" or "paypal-secure.top": a brand in a host it doesn't own. */
export function lookalikeBrand(host: string): string | null {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels.length < 2) return null;
  let siteIdx = labels.length - 2;
  if (labels.length >= 3 && SECOND_LEVEL.has(labels[siteIdx]) && labels[labels.length - 1].length === 2) siteIdx -= 1;
  const site = labels[siteIdx];
  const tokens = labels.slice(0, siteIdx + 1).flatMap((l) => l.split('-'));
  for (const brand of BRANDS) {
    const inSite = EMBEDDED_BRANDS.has(brand) && site.includes(brand) && site.includes('-');
    if (!tokens.includes(brand) && !inSite) continue;
    // Their own site (paypal.com, mail.google.com, poshmark.ca, googleapis.com).
    if (site === brand || (site.startsWith(brand) && !site.includes('-'))) continue;
    if (BRAND_OWNERS[brand]?.includes(site)) continue;
    return `${brand} @ ${labels.slice(siteIdx).join('.')}`;
  }
  return null;
}

/**
 * Checks the subject and body someone wrote for an email we'll send.
 * `allowLinks` is false for guests.
 */
export function checkMessageContent(parts: (string | null | undefined)[], opts: { allowLinks: boolean }): ContentCheck {
  const text = normalizeText(parts.filter(Boolean).join('\n'));
  if (!text.trim()) return { ok: true };

  const hosts = findLinkHosts(text);
  for (const host of hosts) {
    if (isShortener(host)) return { ok: false, code: 'shortener', match: host };
    if (isIpHost(host)) return { ok: false, code: 'ip_link', match: host };
    const brand = lookalikeBrand(host);
    if (brand) return { ok: false, code: 'lookalike', match: brand };
  }
  if (!opts.allowLinks && hosts.length > 0) return { ok: false, code: 'link', match: hosts[0] };

  const plain = deLeet(text);
  for (const re of PHISHING_PATTERNS) {
    const m = text.match(re) ?? plain.match(re);
    if (m) return { ok: false, code: 'phishing', match: m[0].slice(0, 80) };
  }
  return { ok: true };
}

/** What we tell the sender. Vague about phishing rules, specific about plain links so people can fix them. */
export function blockedMessage(check: { code: AbuseCode; match: string }, locale: 'en' | 'es'): string {
  if (check.code === 'link') {
    return locale === 'es'
      ? `Sin cuenta no se pueden incluir links en el correo ni en los nombres (encontramos "${check.match}"). El link de verificación del certificado lo agregamos nosotros. Crea una cuenta gratis si necesitas incluir un link.`
      : `Links aren't allowed in the email or the names when sending without an account (we found "${check.match}"). We add the certificate's verification link for you. Create a free account if you need to include a link.`;
  }
  return locale === 'es'
    ? 'No podemos enviar este mensaje: se parece a un correo de phishing o usa links que no permitimos (acortadores, direcciones IP o sitios que imitan a otra marca). Si es un error, escríbenos desde la página de contacto.'
    : "We can't send this message: it looks like a phishing email or uses links we don't allow (shorteners, IP addresses or sites imitating another brand). If this is a mistake, contact us.";
}
