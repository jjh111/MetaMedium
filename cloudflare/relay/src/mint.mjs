// `POST /rooms`: a room anyone on the app's origins may open and share. The relay picks the name — `r-` and
// 128 random bits (relay-protocol.mjs, `mintRoomName`), never a name a person chose and never `*`, so the
// rooms John named by hand (`claude`, a table) are what they were — and, where the relay keeps keys, gives
// back that room's key: the HMAC of the name under the relay's first secret (auth.mjs), which the relay
// needs to keep nowhere. The answer is `201 { room, key, idleDays }`, never cached: a room the relay opened
// is kept until nobody has used it for `idleDays` days (the Room's alarm, worker.mjs), and then forgotten.
// `GET /rooms` says that much to anyone — `{ idleDays, opens }` — so a guest who joined by a link can say it too.
//
// Who may open one is counted, not checked: a browser must come from the app's origins (http.mjs), and
// every caller is held to MM_RELAY_MINT_PER_HOUR rooms an hour by its address (default 10) and the relay to
// MM_RELAY_MINT_PER_DAY rooms a day in all (default 500), counted in the Limits object (limits.mjs) so the
// count is one wherever a request lands. Past either it is a 429 with `retry-after` and a sentence.
// And the relay opens none while the rooms it opened hold all they may at once (store.mjs, MM_RELAY_MINTED_HELD; 503).
// MM_RELAY_MINT=0 opens no rooms (503, in words). With no secret the relay opens none either (503, as the
// rooms answer); with MM_RELAY_OPEN=1 it opens rooms that need no key (`key: null`).

import { originAllowed, corsHeaders, text, json, callerOf } from './http.mjs';
import { secretsOf, keyForRoom } from './auth.mjs';
import { hit } from './limits.mjs';
import { mintedFull, STORE_WORDS } from './store.mjs';
import { mintRoomName, roomIdleDaysFrom } from '../../../Demos/relay-protocol.mjs';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** Rooms one caller may open in an hour, and the relay in a day, when nothing says otherwise. */
const MINT_PER_HOUR = 10;
const MINT_PER_DAY = 500;

const count = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && Number.isSafeInteger(n) && n >= 0 ? n : d; };

/** When to ask again, in words a person reads. */
const later = (s) => (s < 90 ? s + ' seconds' : s < 5400 ? Math.round(s / 60) + ' minutes' : Math.round(s / 3600) + ' hours');

export async function mintRoute(request, env) {
  const origin = request.headers.get('origin');
  // A refused origin is told so with CORS headers of its own, so the page can say why (RELAY-1).
  if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay', corsHeaders(origin));
  const cors = origin ? corsHeaders(origin) : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  // What this relay does with the rooms it opens, for a hand that joined one by a link and was not there when it was opened.
  if (request.method === 'GET') return json(200, { idleDays: roomIdleDaysFrom(undefined, env), opens: env.MM_RELAY_MINT !== '0' }, cors);
  if (request.method !== 'POST') return text(405, 'a room is opened with POST /rooms', cors);
  if (env.MM_RELAY_MINT === '0') return text(503, 'this relay is not opening new rooms just now — join a room you were given a link to', cors);
  const open = env.MM_RELAY_OPEN === '1';
  const secrets = secretsOf(env.MM_RELAY_SECRET);
  if (!open && !secrets.length) return text(503, 'this relay has no key configured, so it opens no rooms — set the MM_RELAY_SECRET secret', cors);

  // The counts: this caller's hour first, then the relay's day.
  let mine, all;
  try {
    mine = await hit(env, 'mint', 'ip:' + callerOf(request), { limit: count(env.MM_RELAY_MINT_PER_HOUR, MINT_PER_HOUR), windowMs: HOUR });
    if (mine.ok) all = await hit(env, 'mint', 'all', { limit: count(env.MM_RELAY_MINT_PER_DAY, MINT_PER_DAY), windowMs: DAY });
  } catch {
    return text(503, 'this relay cannot count the rooms it opens just now, so it opens none — try again in a while', cors);
  }
  if (!mine.ok) return text(429, 'this address has opened as many rooms as it may for now — try again in ' + later(mine.retryAfter), { ...cors, 'retry-after': String(mine.retryAfter) });
  if (!all.ok) return text(429, 'this relay has opened as many rooms as it may today — try again in ' + later(all.retryAfter), { ...cors, 'retry-after': String(all.retryAfter) });
  // What every room the relay opened holds at once is bounded (store.mjs): past it, no new room is opened to fill.
  let full;
  try { full = await mintedFull(env); } catch { return text(503, STORE_WORDS.uncounted, cors); }
  if (full) return text(503, STORE_WORDS.noRooms, cors);

  const room = mintRoomName();
  const key = open ? null : await keyForRoom(secrets[0], room);
  return json(201, { room, key, idleDays: roomIdleDaysFrom(undefined, env) }, cors);
}
