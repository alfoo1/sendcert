import { Inter, Playfair_Display } from 'next/font/google';

// Shared by the certificate templates (captured by html2canvas, which waits
// for document.fonts.ready) and the landing page. Kept outside any
// 'use client' module so server components can read `.className`.
export const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
