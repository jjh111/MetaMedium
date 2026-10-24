// What the relay keeps, counted across rooms. A room is bounded in what it keeps (worker.mjs, relay-protocol.mjs),
// but anyone on the app's origins may open rooms (`POST /rooms`, mint.mjs), so a bound per room is no bound: every
// room a caller opens would be a fresh allowance of lines and pictures, kept alive for as long as it is used. So
// what is kept is counted across rooms, and counted in what it really costs.
//
// What an item costs (`costOf`) is its UTF-8 bytes — what the storage keeps, never its UTF-16 characters, of which a
// line of CJK is a third — plus ROW_COST for every storage row it is kept in: a line's record, its pieces, the room's
// meta row written with it and a name it claims; a picture's record, its pieces and the meta row. So a row is never
// free however small the item: a 24-byte picture costs what its three rows cost. What an item holds (`heldOf`) is its
// UTF-8 bytes plus ROW_HELD a row.
//
//   * What one caller keeps a day, in all rooms — the cost of every line and picture it has kept, and every quantum of
//     the gauge it reserved (below) — counted in the Limits object's `store` scope (limits.mjs), one count wherever a
//     request lands, by its address and, for IPv6, by its /56 at NET56_TIMES as much (http.mjs, `callerBuckets`).
//     Past it a line or a picture is refused with 429 and when to try again. A room draws a caller's count
//     STORE_GRANT at a time and keeps what it has not used in its own storage (worker.mjs: the room's `meta` row,
//     written with what it keeps), so neither a line nor the room's eviction draws a count of its own. A beat is kept
//     nowhere: it costs nothing and writes nothing (a name it claims is held in memory, worker.mjs).
//     MM_RELAY_STORE_PER_DAY, in bytes and rows (`costOf`); when unset, a STORE_SHARE-th of what every room the relay
//     opened may keep a day — 64 MiB at the defaults — so one address's share of that day is a thirty-second of it,
//     and one /56's an eighth, whatever the relay's day is set to.
//   * What every room the relay opened holds at once, in all — the gauge `minted` (limits.mjs, `hold`), in bytes and
//     rows (`heldOf`). A room reserves it MINTED_QUANTUM at a time, each quantum charged to the reserving caller's day,
//     never more than one quantum ahead of what it holds (worker.mjs gives back what runs further ahead, when the room
//     lets lines go), so N rooms of one line each hold about N quanta of it and cost their openers as much of their
//     days. A room forgotten gives back what it reserved, once (worker.mjs, `alarm`). Past MM_RELAY_MINTED_HELD
//     (default 2 GiB) such a room keeps nothing more (507, in words) and the relay opens no new room (mint.mjs, 503)
//     until older rooms are let go of. A room named by hand is John's, given out by its key, and is not in the gauge.
//   * What every room the relay opened keeps, a day, in all — the cost of everything kept in them, under one key
//     (`minted:day`), MM_RELAY_MINTED_PER_DAY (default 2 GiB): a room at its caps writes on, letting the oldest go,
//     so what is held is no bound on what is written, and a caller's day is no bound on many callers. Drawn
//     STORE_GRANT at a time as a caller's is, a room's unused grant kept with it. Past it a room the relay opened
//     keeps nothing more that day (429, in words); a room named by hand keeps on.
//
// So, at the defaults, the rows the rooms write: one address may make them write at most STORE_PER_DAY / ROW_COST a
// day (16,384 at 64 MiB; its /56 four times as many), all the rooms the relay opened at most MINTED_PER_DAY / ROW_COST
// (524,288) — and the Limits object writes one row a bucket for each STORE_GRANT or MINTED_QUANTUM drawn (one for an
// IPv4 address, two for an IPv6 one, one for `minted:day`, one for the gauge: at most three rows for every sixteen
// ROW_COSTs charged). On a plan that allows fewer rows a day, lower MM_RELAY_MINTED_PER_DAY: what one address may keep
// follows it, unless MM_RELAY_STORE_PER_DAY is set.
//
// What this does not stop, stated: many addresses — many IPv4 addresses, or a /48's 256 /56s — are many callers, and
// together can still fill a relay-wide ceiling (the gauge, the minted day, the rooms opened a day) with real data,
// each paying its own day; only accounts would tell them apart. And a day's count is not a month's: an address that
// keeps its day's worth every day holds what it kept until its rooms age out (MM_RELAY_ROOM_IDLE_DAYS after their
// last use, which its own use moves), so in time one address may hold much of the gauge — real data, every byte paid
// for as it came; a count of what each caller holds at once, or accounts, would bound that in all.
//
// With no LIMITS binding, or a Limits object that cannot be asked, nothing is kept (503): limited fails closed.
// These are an operating ceiling, not a bill: what the account's plan allows — its storage, the rows it may write a
// day — is Cloudflare's to say, and README.md says what to check.

import { hit, hold, perCaller } from './limits.mjs';

const DAY = 86_400_000;
/** What one storage row an item is kept in costs in a day's counts, beside the item's bytes: the row's write, and the delete that later lets it go. */
export const ROW_COST = 4096;
/** What one storage row holds in the gauge, beside its value: its key and the database's own record of it (an upper bound). */
export const ROW_HELD = 256;
/** What one address may keep a day when nothing says otherwise: this many times less than all the rooms the relay opened may keep a day. */
export const STORE_SHARE = 32;
/** What a room draws from a day's count at a time (a caller's, or `minted:day`), in bytes and rows, so a line does not write a count of its own. */
export const STORE_GRANT = 64 * 1024;
/** What every room the relay opened may hold at once, in all, in bytes and rows (`heldOf`), when nothing says otherwise. */
export const MINTED_HELD = 2 * 1024 * 1024 * 1024;
/** What a room the relay opened reserves of that at a time, in bytes and rows (`heldOf`); each quantum is charged to the reserving caller's day. */
export const MINTED_QUANTUM = 64 * 1024;
/** What every room the relay opened may keep a day, in all, in bytes and rows (`costOf`), when nothing says otherwise. */
export const MINTED_PER_DAY = 2 * 1024 * 1024 * 1024;
/** The most grants a room keeps (one for each caller writing in it today, and `minted:day`): past it the oldest are let go of, as spent. */
const GRANTS_KEPT = 64;
/** The scope and key of the gauge every room the relay opened reserves from. */
const GAUGE = ['minted', 'rooms'];

const sizeFrom = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && v !== null && Number.isSafeInteger(n) && n >= 0 ? n : d; };
/** What the rooms the relay opened may keep a day, in all: MM_RELAY_MINTED_PER_DAY, else the default. */
export const mintedPerDayFrom = (env = {}) => sizeFrom(env.MM_RELAY_MINTED_PER_DAY, MINTED_PER_DAY);
/** What one address may keep a day: MM_RELAY_STORE_PER_DAY, else a STORE_SHARE-th of the rooms' day (64 MiB at the defaults). */
export const storePerDayFrom = (env = {}) => sizeFrom(env.MM_RELAY_STORE_PER_DAY, Math.floor(mintedPerDayFrom(env) / STORE_SHARE));
/** What the rooms the relay opened may hold at once: MM_RELAY_MINTED_HELD, else the default. */
export const mintedHeldFrom = (env = {}) => sizeFrom(env.MM_RELAY_MINTED_HELD, MINTED_HELD);
/** The key, in the `store` scope, of what every room the relay opened keeps a day: never an address's (`ip:…`). */
export const MINTED_DAY = 'minted:day';

/** What an item kept in `rows` storage rows costs in a day's counts: its UTF-8 bytes and ROW_COST a row. */
export const costOf = (bytes, rows) => bytes + ROW_COST * rows;
/** What an item kept in `rows` storage rows holds in the gauge: its UTF-8 bytes and ROW_HELD a row. */
export const heldOf = (bytes, rows) => bytes + ROW_HELD * rows;

/** How many bytes a string is as UTF-8 — as TextEncoder makes it, a lone surrogate three — counted without making them. */
export function utf8Length(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** When to ask again, in words a person reads. */
const later = (s) => (s < 90 ? s + ' seconds' : s < 5400 ? Math.round(s / 60) + ' minutes' : Math.round(s / 3600) + ' hours');

export const STORE_WORDS = {
  day: (s) => 'this address has kept as much on this relay as a day allows — nothing was added; try again in ' + later(s),
  mintedDay: (s) => 'the rooms people open have kept as much on this relay as a day allows — nothing was added; try again in ' + later(s),
  full: 'this relay holds as much as it may for the rooms people open — nothing was added, and what this room holds stays',
  noRooms: 'this relay holds as much as it may for the rooms people open — it opens no new room until older ones are let go of',
  uncounted: 'this relay cannot count what it keeps just now, so nothing was added — try again in a while',
  forgetting: 'this room is being let go of just now, after the days nobody used it — nothing was added; try again in a moment',
};

/** The day's grant a room holds under `id`, or nothing. */
const leftOf = (grants, id, day) => { const g = grants.get(id); return g && g.day === day ? g.left : 0; };

function setGrant(grants, id, day, left) {
  grants.delete(id);
  grants.set(id, { day, left });
  if (grants.size > GRANTS_KEPT) for (const [k, v] of grants) if (v.day !== day) grants.delete(k);
  while (grants.size > GRANTS_KEPT) grants.delete(grants.keys().next().value);
}

/**
 * Count `cost` against the buckets `keys` — `[{ key, limit }]`, one Limits hit for all of them, all or none — drawn
 * from the room's grant `id` (`grants`: id → `{ day, left }`, what the room drew and has not used), a grant at a time.
 * Null when it fits, else `{ status, words, retryAfter? }` — 429 past a day, 503 when nothing could be counted.
 */
async function charge(env, grants, id, keys, cost, words) {
  const day = Math.floor(Date.now() / DAY);
  const left = leftOf(grants, id, day);
  if (left >= cost) { setGrant(grants, id, day, left - cost); return null; }
  const short = cost - left;
  let granted = Math.max(short, STORE_GRANT);
  const counts = (n) => keys.map((k) => ({ key: k.key, limit: k.limit, windowMs: DAY, cost: n }));
  let r;
  try {
    r = await hit(env, 'store', counts(granted));
    // Too little left of the day for a whole grant: what this one needs, if that much is left.
    if (!r.ok && granted > short) { granted = short; r = await hit(env, 'store', counts(granted)); }
  } catch { return { status: 503, words: STORE_WORDS.uncounted }; }
  if (!r || !r.ok) {
    const retryAfter = Math.max(1, Number(r && r.retryAfter) || 3600);
    return { status: 429, retryAfter, words: words(retryAfter) };
  }
  // What was left may have been spent by another item while the count was asked: never below nothing.
  setGrant(grants, id, day, Math.max(0, leftOf(grants, id, day) + granted - cost));
  return null;
}

/** A cost given back to the grant it was drawn from: the item was refused after it was counted, so it is not spent. */
function refund(grants, id, cost) {
  const g = grants.get(id);
  if (g && g.day === Math.floor(Date.now() / DAY)) g.left += cost;
}

/** The grant a caller draws from in a room, and the buckets it is counted in, each held to what an address may keep a day. */
const callerCharge = (env, buckets) => ({ id: 'ip:' + buckets[0].key, keys: perCaller('ip:', buckets, { limit: storePerDayFrom(env) }) });

/**
 * Count `cost` — what an item costs (`costOf`) — against what the caller (`buckets`, http.mjs `callerBuckets`) may keep
 * today across every room, and, in a room the relay opened (`minted`), against what all such rooms may keep today.
 * `grants` is the room's own. Null when it fits, else the refusal; when one refuses, the other is given back.
 */
export async function chargeStore(env, grants, buckets, cost, { minted = false } = {}) {
  const me = callerCharge(env, buckets);
  const no = await charge(env, grants, me.id, me.keys, cost, STORE_WORDS.day);
  if (no || !minted) return no;
  const all = await charge(env, grants, MINTED_DAY, [{ key: MINTED_DAY, limit: mintedPerDayFrom(env) }], cost, STORE_WORDS.mintedDay);
  if (all) refund(grants, me.id, cost);
  return all;
}

/** What `chargeStore` counted, given back to the room's grants: the item was not kept after all. */
export function refundStore(grants, buckets, cost, { minted = false } = {}) {
  refund(grants, 'ip:' + buckets[0].key, cost);
  if (minted) refund(grants, MINTED_DAY, cost);
}

/**
 * For a room the relay opened, before it keeps more: make sure `after` — what it will hold (`heldOf` its lines and
 * pictures) — fits what it has reserved of the gauge, reserving more when it does not: whole quanta, so never one more
 * than `after` needs, each charged to the reserving caller's day first — a reservation nobody paid for never fills the
 * gauge. `room` is the Room (`reserved`, `grants`); what it reserved is written down with what it keeps (worker.mjs).
 * Null when it fits, else `{ status, words, retryAfter? }` — 507 when the rooms the relay opened hold all they may,
 * 429 when the caller's day is spent, 503 when nothing could be counted.
 */
export async function reserveMinted(env, room, buckets, after) {
  if (after <= room.reserved) return null;
  const limit = mintedHeldFrom(env);
  const need = after - room.reserved;
  const quanta = Math.ceil(need / MINTED_QUANTUM) * MINTED_QUANTUM;
  const me = callerCharge(env, buckets);
  const paid = await charge(env, room.grants, me.id, me.keys, quanta, STORE_WORDS.day);
  if (paid) return paid;
  let want = quanta;
  let r;
  try {
    r = await hold(env, GAUGE[0], GAUGE[1], want, limit);
    // Too little left of the gauge for whole quanta: what this needs, if that much is left.
    if (!r.ok && want > need) { want = need; r = await hold(env, GAUGE[0], GAUGE[1], want, limit); }
  } catch { refund(room.grants, me.id, quanta); return { status: 503, words: STORE_WORDS.uncounted }; }
  if (!r || !r.ok) { refund(room.grants, me.id, quanta); return { status: 507, words: STORE_WORDS.full }; }
  if (want < quanta) refund(room.grants, me.id, quanta - want);
  room.reserved += want;
  return null;
}

/** What a room reserved past one quantum ahead of what it holds (`heldOf`): what it gives back, or 0. */
export const mintedExcess = (reserved, held) => Math.max(0, reserved - held - MINTED_QUANTUM);

/** What a room reserved goes back to the gauge. Throws when the gauge cannot be asked, so the caller can try again. */
export async function releaseMinted(env, amount) {
  if (!(amount > 0)) return;
  const r = await hold(env, GAUGE[0], GAUGE[1], -amount, mintedHeldFrom(env));
  if (!r || !r.ok) throw new Error('the gauge did not take back what was given');
}

/** Whether the rooms the relay opened hold so much that a new one could not keep a first quantum. Reading it writes nothing. */
export async function mintedFull(env) {
  const limit = mintedHeldFrom(env);
  const r = await hold(env, GAUGE[0], GAUGE[1], 0, limit);
  return !!r && Number(r.held) + MINTED_QUANTUM > limit;
}

/** A room's grants as its meta row keeps them: today's that are not spent, by id. */
export function grantsRecord(grants) {
  const day = Math.floor(Date.now() / DAY);
  const left = {};
  for (const [id, g] of grants) if (g.day === day && g.left > 0) left[id] = g.left;
  return { day, left };
}

/** A room's grants read back from its meta row: today's only — a grant drawn on another day is spent. */
export function grantsFrom(record) {
  const grants = new Map();
  const day = Math.floor(Date.now() / DAY);
  if (!record || record.day !== day || !record.left || typeof record.left !== 'object') return grants;
  for (const [id, left] of Object.entries(record.left)) if (Number.isFinite(left) && left > 0) grants.set(id, { day, left });
  return grants;
}
