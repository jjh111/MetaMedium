// What every route of the relay Worker shares: who may call from a browser, the CORS headers, a
// sentence as a response, and where a key is read from. One home, so the rooms, the room minting
// and the model routes (mint.mjs, ai.mjs) never disagree about an origin or a header.

/** Origins a browser may call from: the app, its old address, a page served from this machine. */
export const ORIGINS = ['https://dyna.ink', 'https://www.dyna.ink', 'https://app.dyna.ink', 'https://jjh111.github.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;

export function originAllowed(origin, env) {
  if (ORIGINS.includes(origin) || LOCAL.test(origin)) return true;
  return String(env.MM_RELAY_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean).includes(origin);
}

export const corsHeaders = (origin) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-headers': 'content-type, last-event-id, authorization, x-dyna-hand, x-dyna-room',
  'access-control-allow-methods': 'GET, HEAD, POST, PUT, OPTIONS',
  'access-control-expose-headers': 'retry-after',
  'access-control-max-age': '86400',
  vary: 'origin',
});

export const text = (status, body, extra = {}) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...extra } });

export const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

/** A key from `Authorization: Bearer`, else `?key=` (an EventSource can send no header). */
export function keyOf(request, url) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') || '');
  return m ? m[1] : url.searchParams.get('key') || '';
}

/** The address a request came from, for a limit: Cloudflare's header, else (in Node) nothing better than one bucket. */
export const callerOf = (request) => request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
