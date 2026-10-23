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

/**
 * Who a caller is counted as: an IPv4 address as it is, an IPv6 address by its /64 — the network one machine is given,
 * so it is one caller and not 2^64 (a privacy address rotates by itself) — and an IPv4 address written as IPv6
 * (`::ffff:…`) as IPv4. Anything that does not read as an address is counted as it came.
 */
export function callerKey(ip) {
  const a = String(ip || 'local').trim().toLowerCase().replace(/%.*$/, '');
  if (!a.includes(':')) return a;
  const mapped = /^(?:0{0,4}:){0,5}(?::|0{0,4}:)?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (mapped) return mapped[1];
  const halves = a.split('::');
  if (halves.length > 2) return a;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return a;
  const groups = [...head, ...Array(fill).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return a;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/**
 * Who a request came from, for every limit the relay keeps — the rooms it opens, a room's floodgates and new names,
 * what a caller stores, the models: Cloudflare's header (else, in Node, nothing better than one bucket), as `callerKey`
 * counts it. One home, so no route counts a /64 as many callers while another counts it as one.
 */
export const callerOf = (request) => callerKey(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local');
