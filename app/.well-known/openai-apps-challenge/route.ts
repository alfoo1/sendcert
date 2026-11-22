// Domain verification for the ChatGPT app directory. OpenAI shows a token
// when submitting the app; set it as OPENAI_APPS_CHALLENGE in Vercel and this
// URL must return exactly that token as plain text.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  const token = process.env.OPENAI_APPS_CHALLENGE?.trim();
  if (!token) return new Response('Not found', { status: 404 });
  return new Response(token, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
