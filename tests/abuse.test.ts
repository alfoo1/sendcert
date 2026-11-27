import { describe, expect, it } from 'vitest';
import { checkMessageContent, findLinkHosts, isTrustedLinkHost, lookalikeBrand, normalizeText } from '@/lib/abuse';

// The phishing sent through SendCert on 2026-11-27, as it arrived (Unicode
// "bold" letters to dodge keyword filters).
const BOLD_PHISH = `𝗗𝗲𝗮𝗿 𝗣𝗼𝘀𝗵𝗺𝗮𝗿𝗸 𝗠𝗲𝗺𝗯𝗲𝗿,

𝗪𝗲’𝗿𝗲 𝗵𝗮𝗽𝗽𝘆 𝘁𝗼 𝗶𝗻𝗳𝗼𝗿𝗺 𝘆𝗼𝘂 𝘁𝗵𝗮𝘁 𝘆𝗼𝘂𝗿 𝗿𝗲𝗰𝗲𝗻𝘁 𝘀𝗮𝗹𝗲 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱.
𝗔𝘀 𝗽𝗮𝗿𝘁 𝗼𝗳 𝗼𝘂𝗿 𝘂𝗽𝗱𝗮𝘁𝗲𝗱 𝗽𝗼𝗹𝗶𝗰𝗶𝗲𝘀, 𝗮𝗹𝗹 𝘂𝘀𝗲𝗿𝘀 𝗮𝗿𝗲 𝗻𝗼𝘄 𝗿𝗲𝗾𝘂𝗶𝗿𝗲𝗱 𝘁𝗼 𝗽𝗲𝗿𝗳𝗼𝗿𝗺 𝗮 𝗼𝗻𝗲-𝘁𝗶𝗺𝗲 𝗽𝗿𝗼𝗳𝗶𝗹𝗲 𝘃𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻.

🔗 [𝗬𝗼𝘂𝗿 𝗽𝗲𝗿𝘀𝗼𝗻𝗮𝗹 𝘃𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗹𝗶𝗻𝗸]:

https://poshmark.keningjiaju.com/260853405

𝗕𝗲𝘀𝘁 𝗿𝗲𝗴𝗮𝗿𝗱𝘀, 𝗧𝗵𝗲 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝘁𝗲𝗮𝗺 𝟐𝟎𝟐𝟔`;

const account = { links: 'any' as const };
const guest = { links: 'none' as const };
const newAccount = { links: 'trusted' as const };

describe('normalizeText', () => {
  it('folds Unicode bold letters and drops invisible characters', () => {
    expect(normalizeText('𝗣𝗼𝘀𝗵​𝗺𝗮𝗿𝗸 𝟐𝟎𝟐𝟔')).toBe('poshmark 2026');
  });
});

describe('checkMessageContent: blocks the real attacks', () => {
  it('blocks the bold Poshmark phishing, even for accounts', () => {
    const r = checkMessageContent(['Shipping info #1388723', BOLD_PHISH], account);
    expect(r.ok).toBe(false);
  });

  it('blocks the same text without the link (wording alone)', () => {
    const r = checkMessageContent([BOLD_PHISH.replace(/https:\/\/\S+/, '')], account);
    expect(r).toMatchObject({ ok: false, code: 'phishing' });
  });

  it('blocks the first version with the tr.ee shortener', () => {
    const r = checkMessageContent(['Hello', 'Click https://tr.ee/xaqiRp to continue'], account);
    expect(r).toMatchObject({ ok: false, code: 'shortener', match: 'tr.ee' });
  });

  it('blocks "P0sh Shipping info" subjects', () => {
    expect(checkMessageContent(['P0sh Shipping info #1388723'], account).ok).toBe(false);
  });

  it('blocks lookalike hosts and bare IP links for accounts', () => {
    expect(checkMessageContent(['see https://poshmark.keningjiaju.com/1'], account)).toMatchObject({ code: 'lookalike' });
    expect(checkMessageContent(['go to paypal-secure-login.top now'], account)).toMatchObject({ code: 'lookalike' });
    expect(checkMessageContent(['http://45.13.22.9/login'], account)).toMatchObject({ code: 'ip_link' });
  });

  it('blocks any link for guests, including bare domains', () => {
    expect(checkMessageContent(['Visit keningjiaju.com/260853405'], guest)).toMatchObject({ code: 'link' });
    expect(checkMessageContent(['More at https://myschool.edu/courses'], guest)).toMatchObject({ code: 'link' });
    expect(checkMessageContent(['www.example.org'], guest)).toMatchObject({ code: 'link' });
  });

  it('catches classic account phishing wording', () => {
    for (const text of [
      'Your account has been suspended, please verify your account',
      'Confirm your identity to receive your payment',
      'We noticed unusual sign-in activity',
      'Dear valued customer, update your billing information',
      'Please enter your password below',
    ]) {
      expect(checkMessageContent([text], account).ok, text).toBe(false);
    }
  });
});

describe('checkMessageContent: lets normal certificate emails through', () => {
  const legit = [
    ['Your certificate — {{name}}', 'Hi {{name}},\n\nCongratulations on completing the course! Your certificate is attached.\n\nBest regards,'],
    ['Tu certificado', 'Hola {{name}},\n\nGracias por participar del taller. Te adjuntamos tu certificado.\n\nSaludos,'],
    ['Certificate of Completion: ASP.NET Core', 'Dear {{name}}, you completed ASP.NET and Node.js fundamentals.'],
    ['CPD certificate', 'Dear Member,\n\nThank you for attending. You can share the verification link on LinkedIn and update your profile.'],
    ['Diploma', 'Write to info@myschool.edu if anything is wrong.'],
    ['AWS training', 'You completed the Amazon Web Services Cloud Practitioner workshop. Great job.It was a pleasure.So proud!'],
    ['Webinar', 'Saludos.Es un placer contar contigo. Verificación del certificado disponible.'],
  ];
  it.each(legit)('guest: %s', (subject, body) => {
    expect(checkMessageContent([subject, body], guest)).toEqual({ ok: true });
  });

  it('accounts can include normal links', () => {
    const r = checkMessageContent(
      ['Your certificate', 'Slides: https://docs.google.com/presentation/d/abc\nSurvey: https://forms.office.com/r/xyz\nSite: https://www.myacademy.com.ar/cursos'],
      account,
    );
    expect(r).toEqual({ ok: true });
  });
});

describe('checkMessageContent: new accounts (first week)', () => {
  it('blocks the 2026-11-27 evening attempts from a throwaway account', () => {
    // Neutral wording plus the attacker's own domain: passes the phishing
    // rules, stopped only because the account is new.
    const r = checkMessageContent(['Important Info! {{name}}', 'Hi {{name}}, please review the details here: https://keningjiaju.com/260853405'], newAccount);
    expect(r).toMatchObject({ ok: false, code: 'untrusted_link', match: 'keningjiaju.com' });
    expect(checkMessageContent(['Info', 'See keningjiaju.com/123'], newAccount)).toMatchObject({ ok: false, code: 'untrusted_link' });
  });

  it('allows links to well-known sites, .edu and .gob', () => {
    const r = checkMessageContent(
      [
        'Your certificate',
        [
          'Survey: https://forms.gle/abc123 and https://docs.google.com/forms/d/xyz',
          'Recording: https://youtu.be/dQw4w9WgXcQ',
          'Next class: https://us02web.zoom.us/j/123456',
          'Profile: https://www.linkedin.com/company/acme',
          'Campus: https://campus.uba.edu.ar/curso and https://www.argentina.gob.ar/educacion',
          'Verify: https://www.sendcert.org/verify/ABC123',
        ].join('\n'),
      ],
      newAccount,
    );
    expect(r).toEqual({ ok: true });
  });

  it('still applies the phishing rules to trusted links', () => {
    const r = checkMessageContent(['Hi', 'Verify your account: https://docs.google.com/forms/d/xyz'], newAccount);
    expect(r).toMatchObject({ ok: false, code: 'phishing' });
  });

  it('isTrustedLinkHost only trusts the real domains', () => {
    for (const host of ['google.com', 'docs.google.com', 'zoom.us', 'mit.edu', 'unam.edu.mx', 'ox.ac.uk', 'argentina.gob.ar']) {
      expect(isTrustedLinkHost(host), host).toBe(true);
    }
    for (const host of ['google.com.evil.top', 'notgoogle.com', 'zoom.us-login.xyz', 'edu.example.com', 'keningjiaju.com', 'gob.example.net']) {
      expect(isTrustedLinkHost(host), host).toBe(false);
    }
  });
});

describe('lookalikeBrand', () => {
  it('leaves brands on their own domains alone', () => {
    for (const host of ['paypal.com', 'mail.google.com', 'poshmark.ca', 'fonts.googleapis.com', 'outlook.office.com', 'pinstripe-design.com', 'betsy-ross.org', 'www.mercadolibre.com.ar', 'aws.amazon.com']) {
      expect(lookalikeBrand(host), host).toBeNull();
    }
  });
  it('flags brands on someone else\'s domain', () => {
    for (const host of ['poshmark.keningjiaju.com', 'paypal-secure.top', 'login-microsoft-verify.com', 'netflix.account-help.xyz']) {
      expect(lookalikeBrand(host), host).not.toBeNull();
    }
  });
});

describe('findLinkHosts', () => {
  it('ignores email addresses and tech names', () => {
    expect(findLinkHosts(normalizeText('Contact info@school.org about ASP.NET'))).toEqual([]);
  });
});
