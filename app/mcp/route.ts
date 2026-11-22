import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, SITE_URL } from '@/lib/mcp/server';

// Remote MCP endpoint (Streamable HTTP, stateless, JSON responses):
// https://www.sendcert.org/mcp. Works as a custom connector in Claude and
// ChatGPT, in Gemini CLI and in any other MCP client. See lib/mcp/server.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function POST(req: Request): Promise<Response> {
  // Some clients only send "Accept: application/json"; the SDK insists on
  // both types even in JSON mode, so normalize instead of answering 406.
  const headers = new Headers(req.headers);
  headers.set('accept', 'application/json, text/event-stream');
  const request = new Request(req.url, { method: 'POST', headers, body: await req.text() });

  const server = createMcpServer({ client: req.headers.get('user-agent') ?? undefined });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(request));
  } finally {
    await server.close();
  }
}

// No server-initiated streams or sessions in stateless mode. A browser that
// opens the URL lands on the setup guide instead of an error.
export function GET(req: Request): Response {
  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return Response.redirect(`${SITE_URL}/ai-assistants`, 307);
  }
  return withCors(
    new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. Use POST.' }, id: null }), {
      status: 405,
      headers: { Allow: 'POST, OPTIONS', 'Content-Type': 'application/json' },
    }),
  );
}

export function DELETE(): Response {
  return withCors(new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS' } }));
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
