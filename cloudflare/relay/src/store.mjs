// What the relay keeps, counted across rooms. A room is bounded in what it keeps (worker.mjs, relay-protocol.mjs),
// but anyone on the app's origins may open rooms (`POST /rooms`, mint.mjs), so a bound per room is no bound: every
// room a caller opens would be a fresh allowance of lines and pictures, kept alive for as long as it is used. So:
//
//   * What one caller keeps, a day, in all rooms — the characters of every line kept, plus LINE_COST for the rows a
//     line writes, and the bytes of every picture — counted by its address (`callerOf`: an IPv6 address by its /64)
//     in the Limits object's `store` scope (limits.mjs), so it is one count wherever a request lands. Past it, a
//     line or a picture is refused with 429 and when to try again; a beat is kept nowhere and costs nothing. A room
//     draws its count from the Limits object a grant at a time (`STORE_GRANT`), so a line does not write a count of
//     its own. MM_RELAY_STORE_PER_DAY, in characters and bytes (default 256 MiB).
//   * What every room the relay opened holds at once, in all — the gauge `minted` (limits.mjs, `hold`): a room the
//     relay opened reserves room in it, `MINTED_RESERVE` at a time, before it keeps what would pass what it reserved,
//     and gives back all it reserved when it is forgotten (worker.mjs, `alarm`). Past MM_RELAY_MINTED_HELD (default
//     2 GiB) such a room keeps nothing more (507, in words) and the relay opens no new room (mint.mjs, 503) until
//     older rooms are let go of. A room named by hand is John's, given out by its key, and is not in the gauge.
//
// With no LIMITS binding, or a Limits object that cannot be asked, nothing is kept (503): limited fails closed.
// These are an operating ceiling, not a bill: what the account's plan allows — its storage, the rows it may write a
// day — is Cloudflare's to say, and README.md says what to check. On a plan that allows few rows a day, lower
// MM_RELAY_STORE_PER_DAY: a line kept writes a few rows, and LINE_COST is what this counts each line as.

import { hit, hold } from './limits.mjs';

const DAY = 86_400_000;
/** What one caller may keep a day across every room, in characters and bytes, when nothing says otherwise. */
export const STORE_PER_DAY = 256 * 1024 * 1024;
/** What a kept line costs beyond its characters: the rows it writes (its record, its pieces, the room's count). */
export const LINE_COST = 4096;
/** What a room draws from a caller's day at a time, so a line does not write a count of its own. */
export const STORE_GRANT = 1024 * 1024;
/** What every room the relay opened may hold at once, in all, when nothing says otherwise. */
export const MINTED_HELD = 2 * 1024 * 1024 * 1024;
/** What a room the relay opened reserves of that at a time. */
export const MINTED_RESERVE = 4 * 1024 * 1024;
/** The scope and key of the gauge every room the relay opened reserves from. */
const GAUGE = ['minted', 'rooms'];

const sizeFrom = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && v !== null && Number.isSafeInteger(n) && n >= 0 ? n : d; };
/** What one caller may keep a day: MM_RELAY_STORE_PER_DAY, else the default. */
export const storePerDayFrom = (env = {}) => sizeFrom(env.MM_RELAY_STORE_PER_DAY, STORE_PER_DAY);
/** What the rooms the relay opened may hold at once: MM_RELAY_MINTED_HELD, else the default. */
export const mintedHeldFrom = (env = {}) => sizeFrom(env.MM_RELAY_MINTED_HELD, MINTED_HELD);

/** When to ask again, in words a person reads. */
const later = (s) => (s < 90 ? s + ' seconds' : s < 5400 ? Math.round(s / 60) + ' minutes' : Math.round(s / 3600) + ' hours');

export const STORE_WORDS = {
  day: (s) => 'this address has kept as much on this relay as a day allows — nothing was added; try again in ' + later(s),
  full: 'this relay holds as much as it may for the rooms people open — nothing was added, and what this room holds stays',
  noRooms: 'this relay holds as much as it may for the rooms people open — it opens no new room until older ones are let go of',
  uncounted: 'this relay cannot count what it keeps just now, so nothing was added — try again in a while',
};

/**
 * Count `cost` (characters, or bytes) against what `caller` may keep today, across every room. `grants` is the room's
 * own: caller → `{ day, left }`, what it drew from the Limits object and has not used. Null when it fits, else
 * `{ status, words, retryAfter? }` — 429 past the day, 503 when nothing could be counted.
 */
export async function chargeStore(env, grants, caller, cost) {
  const day = Math.floor(Date.now() / DAY);
  const g = grants.get(caller);
  if (g && g.day === day && g.left >= cost) { g.left -= cost; return null; }
  const short = cost - (g && g.day === day ? g.left : 0);
  const limit = storePerDayFrom(env);
  let granted = Math.max(short, STORE_GRANT);
  let r;
  try {
    r = await hit(env, 'store', 'ip:' + caller, { limit, windowMs: DAY, cost: granted });
    // Too little left of the day for a whole grant: what this one needs, if that much is left.
    if (!r.ok && granted > short) { granted = short; r = await hit(env, 'store', 'ip:' + caller, { limit, windowMs: DAY, cost: granted }); }
  } catch { return { status: 503, words: STORE_WORDS.uncounted }; }
  if (!r || !r.ok) {
    const retryAfter = Math.max(1, Number(r && r.retryAfter) || 3600);
    return { status: 429, retryAfter, words: STORE_WORDS.day(retryAfter) };
  }
  // What was left may have been spent by another line while the count was asked: never below nothing.
  const now = grants.get(caller);
  const left = (now && now.day === day ? now.left : 0) + granted - cost;
  grants.set(caller, { day, left: Math.max(0, left) });
  if (grants.size > 256) for (const [k, v] of grants) if (v.day !== day) grants.delete(k);
  return null;
}

/**
 * For a room the relay opened, before it keeps more: make sure `after` — what it will hold, lines and pictures — fits
 * what it has reserved of the gauge, reserving more (MINTED_RESERVE at a time, or what it needs) when it does not, and
 * writing down what it reserved so its alarm gives it all back. `room` is the Room (`reserved`, `ctx.storage`). Null
 * when it fits, else `{ status, words }` — 507 when the rooms the relay opened hold all they may, 503 when the gauge
 * could not be asked.
 */
export async function reserveMinted(env, room, after) {
  if (after <= room.reserved) return null;
  const limit = mintedHeldFrom(env);
  const need = after - room.reserved;
  let want = Math.max(need, MINTED_RESERVE);
  let r;
  try {
    r = await hold(env, GAUGE[0], GAUGE[1], want, limit);
    if (!r.ok && want > need) { want = need; r = await hold(env, GAUGE[0], GAUGE[1], want, limit); }
  } catch { return { status: 503, words: STORE_WORDS.uncounted }; }
  if (!r || !r.ok) return { status: 507, words: STORE_WORDS.full };
  room.reserved += want;
  await room.ctx.storage.put('reserved', room.reserved);
  return null;
}

/** A room the relay opened is forgotten: what it reserved goes back. Throws when the gauge cannot be asked, so the alarm is tried again. */
export async function releaseMinted(env, reserved) {
  if (!(reserved > 0)) return;
  await hold(env, GAUGE[0], GAUGE[1], -reserved, mintedHeldFrom(env));
}

/** Whether the rooms the relay opened hold so much that a new one could not keep a first reservation. */
export async function mintedFull(env) {
  const limit = mintedHeldFrom(env);
  const r = await hold(env, GAUGE[0], GAUGE[1], 0, limit);
  return !!r && Number(r.held) + MINTED_RESERVE > limit;
}
