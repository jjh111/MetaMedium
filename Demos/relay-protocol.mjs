// The relay's protocol, apart from any server: what a room keeps, what a
// connecting client is sent, and what it is owed when the room has outlived
// its buffer. Pure functions of a room and a last-seen id, with no socket, no
// clock and no Node import — so the one definition is read by the Node relay
// (Demos/relay.mjs) and by the Worker that carries the same protocol on
// Cloudflare (cloudflare/relay/src/worker.mjs), and the two cannot drift.
// Beside them: what a room may let go of first (`compact`), the rooms a relay
// opens for anyone (`mintRoomName`, `isMintedRoom`), the names a hand claims
// (`claimCheck`, `handHashOf`, `writerOf`) and a hand's floodgate (`spend`).

/** How many lines a room keeps when nothing says otherwise. */
export const DEFAULT_MAX_LINES = 5000;

/**
 * The largest line a POST may carry, in characters: past it a relay refuses the line whole (413). A hand's whole
 * log longer than this goes as several lines (core's LiveStore cuts at LINE_CHARS, under it).
 */
export const MAX_LINE_CHARS = 4_000_000;

/** The cap a relay runs with: the option, else MM_RELAY_MAX_LINES, else the default. */
export function maxLinesFrom(option, env = {}) {
  for (const v of [option, env.MM_RELAY_MAX_LINES]) {
    const n = Number(v);
    if (v !== undefined && v !== '' && Number.isSafeInteger(n) && n > 0) return n;
  }
  return DEFAULT_MAX_LINES;
}

/**
 * What kind of line this is, for the replay: a hello, a writer's own whole
 * log, a whole log handed on by another hand (`via`) in answer to a hello, or
 * an append.
 */
export function kindOf(line) {
  if (line && line.hello) return 'hello';
  if (line && line.full) return line.via ? 'relayed' : 'full';
  return 'append';
}

/**
 * What a connecting client is sent: the room brought up to the PRESENT, never
 * a history that installs a past state along the way.
 *
 * A `full` replaces what the client holds, so replaying an old one hands a
 * fresh tab a snapshot out of its moment — which is how a tab came up holding
 * part of the room (NOTES-DRAWING-WITH-THE-HAND §C). Only a hand's LAST `full`
 * in the replayed stretch is still true; the appends around it are kept in
 * order, so the result is that hand's log as it stands now.
 *
 * A `hello` IS replayed, and deliberately: a hand that said hello into an
 * empty room got no answer, and the replay is how the next hand to arrive
 * hears the question and answers it with its own log. Dropping them as noise
 * left the shard's MCP seat never hearing the brief that was parked for it.
 *
 * Nothing about the protocol changes: the same lines, minus the ones that were
 * only ever true in their own moment.
 */
export function replay(room, after = 0) {
  const pending = room.lines.filter((l) => l.id > after);
  const newest = new Map();
  for (const l of pending) if (l.kind === 'full') newest.set(l.participant, l.id);
  return pending.filter((l) => l.kind !== 'full' || newest.get(l.participant) === l.id);
}
// A log handed on by another hand (`relayed`) is replayed as it came and
// never supersedes the writer's own: it is a copy that may lag the log, and
// the store that receives it judges it by the writer's clock, dropping a copy
// older than what already landed. It stays in the replay because it may be
// the only whole copy left of a hand that has gone, once the relay has
// forgotten that hand's own early lines.

/**
 * What a client is owed when the room has outlived its buffer: a line saying
 * so, rather than a beginning-less history handed over as complete. Null when
 * nothing was lost, or when everything this client missed is still held.
 *
 * `room.lost` is the id of the newest line the room let go of for good (its
 * cap); with none, it is the line before the first one held, as it was before
 * compaction. A line compacted away (`compact`) was never owed to anyone, so it
 * does not count as lost.
 */
export function truncationNotice(room, after = 0) {
  if (!room.dropped) return null;
  const lost = Number.isFinite(room.lost) ? room.lost : room.lines.length ? room.lines[0].id - 1 : Infinity;
  if (after && after >= lost) return null;
  return { relay: 'truncated', room: room.name, dropped: room.dropped, kept: room.lines.length };
}

/**
 * The lines a room may let go of before it lets go of any history: the ones
 * `replay` would never send to anyone. Those are a hand's own `full` lines
 * that a newer own `full` of the same hand stands after — whoever connects,
 * from whatever id, is sent the newer one and never the older (a client past
 * the newer one is sent neither). Every newcomer's hello is answered by each
 * hand with its whole log, so these are most of what a busy room holds.
 * Pure: the lines kept, in order; replay of what is kept is replay of the
 * lines, for every last-seen id (Demos/relay.test.mjs proves it on random rooms).
 * A copy handed on (`relayed`) is never dropped here: replay sends every one.
 */
export function compact(lines) {
  const newest = new Map();
  for (const l of lines) if (l.kind === 'full') newest.set(l.participant, l.id);
  return lines.filter((l) => l.kind !== 'full' || newest.get(l.participant) === l.id);
}

// ===== Rooms anyone may open, names a hand claims, and a room's floodgate ===============
// A relay on the internet opens a room for anyone on the app's origins (`POST /rooms`): an unguessable
// name and, where the relay keeps keys, that room's key. Such a room ages out once nobody has used it for
// a while; a room named by hand (`claude`, a table) never does. In any room, a hand's name is claimed by
// the hand that first writes under it, with a secret of its sitting (`x-dyna-hand`, never in a line, a
// log or an address): a line under a name claimed by another secret is refused, so no one can write in
// another's name — a whole log in another's name would replace theirs on every board. And a hand that
// sends too much too fast is told to wait, rather than flushing the room's history out of its buffer.
// Pure functions with no socket and no Node import, read by both servers.

/** A room a relay opened (`POST /rooms`): `r-` and 22 base64url characters — 128 random bits. Only such a room ages out. */
export const MINTED_ROOM = /^r-[A-Za-z0-9_-]{22}$/;
export const isMintedRoom = (name) => typeof name === 'string' && MINTED_ROOM.test(name);

const b64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** A new room's name: 16 random bytes, base64url, after `r-`. Never a name a person chose, never `*`. */
export function mintRoomName(random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return 'r-' + b64url(random(16));
}

/** How many days a room a relay opened is kept after it was last used, when nothing says otherwise. */
export const DEFAULT_ROOM_IDLE_DAYS = 30;
/** The idle days a relay runs with: the option, else MM_RELAY_ROOM_IDLE_DAYS, else the default. */
export function roomIdleDaysFrom(option, env = {}) {
  for (const v of [option, env.MM_RELAY_ROOM_IDLE_DAYS]) {
    const n = Number(v);
    if (v !== undefined && v !== '' && v !== null && Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_ROOM_IDLE_DAYS;
}

/** The header a hand sends its sitting's secret in, with every line it posts. */
export const HAND_HEADER = 'x-dyna-hand';
/** A hand's secret: 16 to 128 base64url characters (a sitting mints 16 random bytes: 22). */
const HAND_SECRET = /^[A-Za-z0-9_-]{16,128}$/;
/** The longest name a hand writes under that a room keeps a claim for. */
export const MAX_HAND_NAME = 200;

/** A fresh secret for one sitting of a hand: 16 random bytes, base64url. Kept in memory only, by whoever mints it. */
export function mintHandSecret(random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return b64url(random(16));
}

/**
 * What a room keeps of a hand's secret: its SHA-256, as 64 hex digits — '' when no secret was sent, null when what
 * was sent is not one. The secret itself is never kept, and never said back.
 */
export async function handHashOf(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !HAND_SECRET.test(value)) return null;
  return sha256Of(new TextEncoder().encode('dyna-hand:' + value));
}

/** Who writes a line: the hand that posts it — a copy handed on is its sender's (`via`), anything else its participant's. */
export function writerOf(line) {
  if (!line || typeof line !== 'object') return '';
  if (typeof line.via === 'string' && line.via) return line.via;
  return typeof line.participant === 'string' ? line.participant : '';
}

/** The words for a line refused by a room's claims and its floodgate. */
export const CLAIM_WORDS = {
  taken: 'that name is another hand’s in this room — the line was not taken',
  secret: 'what was sent as this hand’s secret is not one (16–128 letters, digits, - and _)',
  long: 'a hand’s name in a room is at most ' + MAX_HAND_NAME + ' characters',
};

/**
 * Whether a room takes a line from a hand, by the names its hands have claimed: `{ ok: true }`, `{ ok: true, claim }`
 * when the line's writer is a name no one holds and the hand sent a secret (the room keeps `claim → hash` from now
 * on — the first claim wins), or `{ ok: false, status, words }`.
 *
 *   claims  what the room holds: a Map (or an object) of name → the SHA-256 `handHashOf` made of its claimer's secret
 *   line    the line, parsed
 *   hash    `handHashOf(the x-dyna-hand header)`: '' when the line came with none, null when it came with a bad one
 *
 * The writer is `writerOf(line)`: a copy handed on (`via`) is judged as its SENDER's line, so a hand may hand on a
 * departed hand's log; it may not write in that hand's own name (the store judges what a copy may change: it may
 * only add to what is held). A line with no header is taken only under a name no one has claimed, so a hand from
 * before claims still works in a room where nobody claims its name; it claims nothing.
 */
export function claimCheck(claims, line, hash) {
  if (hash === null) return { ok: false, status: 400, words: CLAIM_WORDS.secret };
  const writer = writerOf(line);
  if (!writer) return { ok: true };
  if (writer.length > MAX_HAND_NAME) return { ok: false, status: 400, words: CLAIM_WORDS.long };
  const held = claims && (typeof claims.get === 'function' ? claims.get(writer) : Object.prototype.hasOwnProperty.call(claims, writer) ? claims[writer] : undefined);
  if (held === undefined || held === null || held === '') return hash ? { ok: true, claim: writer } : { ok: true };
  if (hash && hash === held) return { ok: true };
  return { ok: false, status: 409, words: CLAIM_WORDS.taken };
}

/**
 * How much a hand may send a room: a token bucket of lines and one of characters, each full to begin with and
 * refilled at its rate — about 30 lines in 10 s and 8,000,000 characters a minute, with a burst of the same — so a
 * hand drawing, or carrying a 2,000-mark board in, is never held back, and a hand flooding a room is.
 */
export const FLOOD = { lines: 30, linesMs: 10_000, chars: 8_000_000, charsMs: 60_000 };

/**
 * One line of `chars` characters from a hand whose bucket is `bucket` (undefined for a hand not heard before):
 * `{ bucket, refused }` — the bucket as it stands after (or unspent, when refused), and null, or `{ status: 429,
 * retryAfter, words }` with when to ask again, in seconds. Pure: the caller keeps the bucket.
 */
export function spend(bucket, now, chars, limits = FLOOD) {
  const b = bucket
    ? {
      lines: Math.min(limits.lines, bucket.lines + ((now - bucket.at) * limits.lines) / limits.linesMs),
      chars: Math.min(limits.chars, bucket.chars + ((now - bucket.at) * limits.chars) / limits.charsMs),
      at: now,
    }
    : { lines: limits.lines, chars: limits.chars, at: now };
  const need = Math.min(chars, limits.chars);
  if (b.lines >= 1 && b.chars >= need) return { bucket: { lines: b.lines - 1, chars: b.chars - need, at: now }, refused: null };
  const waitLines = b.lines >= 1 ? 0 : ((1 - b.lines) * limits.linesMs) / limits.lines;
  const waitChars = b.chars >= need ? 0 : ((need - b.chars) * limits.charsMs) / limits.chars;
  const retryAfter = Math.max(1, Math.ceil(Math.max(waitLines, waitChars) / 1000));
  return { bucket: b, refused: { status: 429, retryAfter, words: 'this hand is sending more than a room takes at once — wait ' + retryAfter + ' s and send again' } };
}

// ===== Pictures in a room (PLAN-IPAD-NOTES A1) =========================================
// A room carries LOG LINES, and a picture's bytes are not in the log (an `import` event names an
// asset by the SHA-256 of its bytes and nothing more). So a room also keeps the bytes, by that hash:
//
//   PUT  /rooms/<room>/assets/<sha256>    the bytes as the body; the hash is verified on arrival
//   GET  /rooms/<room>/assets/<sha256>    the bytes back, for good: the address is the content
//   HEAD /rooms/<room>/assets/<sha256>    whether the room holds them
//
// Under the room's own key (cloudflare/relay) like the room's lines, and kept per room. Content is
// addressed, so a put is idempotent and a get never changes; a refusal is a status and a SENTENCE
// (`assetCheck`), said in words by whoever asked. Pure functions with no socket and no Node import,
// read by both servers — the cases that hold them to it are Demos/relay-assets.conformance.mjs.

/** The largest picture a room takes, in bytes. The tab keeps a picture at 2,560 px a side — a few MB at most. */
export const MAX_ASSET_BYTES = 12 * 1024 * 1024;
/** What a room keeps in pictures when nothing says otherwise: a refused put, never an evicted picture (an event may still name it). */
export const DEFAULT_ASSET_ROOM_BYTES = 64 * 1024 * 1024;
/** What a picture's answer says about caching: its address is its content, so it never changes. `private`: a room's key opened it. */
export const ASSET_CACHE_CONTROL = 'private, max-age=31536000, immutable';

/** What a relay keeps of one room in pictures: the option, else MM_RELAY_ASSET_BYTES, else the default. */
export function assetRoomBytesFrom(option, env = {}) {
  for (const v of [option, env.MM_RELAY_ASSET_BYTES]) {
    const n = Number(v);
    if (v !== undefined && v !== '' && v !== null && Number.isSafeInteger(n) && n > 0) return n;
  }
  return DEFAULT_ASSET_ROOM_BYTES;
}

const HEX64 = /^[0-9a-f]{64}$/;
/** Whether text is an asset's address: 64 lower-case hex digits, no `sha256:`. */
export const isAssetHash = (s) => typeof s === 'string' && HEX64.test(s);

/**
 * The room and the hash an asset path names, or null when it is no asset path. A hash that is not one is
 * carried as null (and a room that will not decode as null) so the server can refuse it in words.
 */
export function assetPathOf(pathname) {
  const m = /^\/rooms\/([^/]+)\/assets\/([^/]*)$/.exec(pathname || '');
  if (!m) return null;
  let room = null;
  try { room = decodeURIComponent(m[1]); } catch { /* the server says the room's name is not text */ }
  return { room, hash: isAssetHash(m[2]) ? m[2] : null };
}

const bytesAt = (b, i) => (i < b.length ? b[i] : 0);
const le16 = (b, i) => bytesAt(b, i) | (bytesAt(b, i + 1) << 8);
const be16 = (b, i) => (bytesAt(b, i) << 8) | bytesAt(b, i + 1);
const be32 = (b, i) => ((bytesAt(b, i) * 16777216) + (bytesAt(b, i + 1) << 16) + (bytesAt(b, i + 2) << 8) + bytesAt(b, i + 3));
const tag = (b, i, s) => { if (i + s.length > b.length) return false; for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false; return true; };

/**
 * What a picture's own header says it is: `{ mime, w, h }` — a PNG, JPEG, WebP or GIF, its size read by
 * hand from the first bytes, no image library — or null when the bytes are none of those. The type is the
 * bytes', never the sender's: a relay that served what a put called its bytes would serve a page from its own
 * address. A JPEG whose frame the walk does not find is a JPEG of no known size (w and h 0).
 */
export function sniffImage(bytes) {
  const b = bytes;
  if (!b || b.length < 4) return null;
  // PNG: the signature, then IHDR first, whose first eight bytes are the size.
  if (b.length >= 24 && b[0] === 0x89 && tag(b, 1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a && tag(b, 12, 'IHDR')) return { mime: 'image/png', w: be32(b, 16), h: be32(b, 20) };
  // JPEG: segments, each with its own length; the size is in the first frame header (a start of frame that is no table or arithmetic tag).
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0x00) { i += 2; continue; }
      if (m === 0xd9 || m === 0xda) break;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: 'image/jpeg', w: be16(b, i + 7), h: be16(b, i + 5) };
      i += 2 + be16(b, i + 2);
    }
    return { mime: 'image/jpeg', w: 0, h: 0 };
  }
  // WebP: a RIFF whose first chunk is lossy (VP8 ), lossless (VP8L) or extended (VP8X).
  if (b.length >= 25 && tag(b, 0, 'RIFF') && tag(b, 8, 'WEBP')) {
    if (b.length >= 30 && tag(b, 12, 'VP8X')) return { mime: 'image/webp', w: 1 + (bytesAt(b, 24) | (bytesAt(b, 25) << 8) | (bytesAt(b, 26) << 16)), h: 1 + (bytesAt(b, 27) | (bytesAt(b, 28) << 8) | (bytesAt(b, 29) << 16)) };
    if (tag(b, 12, 'VP8L') && b[20] === 0x2f) { const bits = (bytesAt(b, 21) | (bytesAt(b, 22) << 8) | (bytesAt(b, 23) << 16) | (bytesAt(b, 24) * 16777216)) >>> 0; return { mime: 'image/webp', w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) }; }
    if (b.length >= 30 && tag(b, 12, 'VP8 ') && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { mime: 'image/webp', w: le16(b, 26) & 0x3fff, h: le16(b, 28) & 0x3fff };
    return null;
  }
  // GIF: the logical screen's size follows the signature.
  if (b.length >= 10 && (tag(b, 0, 'GIF87a') || tag(b, 0, 'GIF89a'))) return { mime: 'image/gif', w: le16(b, 6), h: le16(b, 8) };
  return null;
}

const mb = (n) => { const v = n / (1024 * 1024); return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + ' MB'; };

/** What is said of a picture over the cap, its size in words (a few bytes over is said so, not as "12 MB — up to 12 MB"). */
export function tooLargeWords(n) {
  return 'that picture is ' + (n < MAX_ASSET_BYTES * 1.05 ? 'a little over 12 MB' : mb(n)) + ' — a room takes pictures up to 12 MB';
}
/** The verdict on a size alone, before a body is read: null, or `{ status, words }`. */
export function assetSizeVerdict(n) {
  if (n > MAX_ASSET_BYTES) return { status: 413, words: tooLargeWords(n) };
  return null;
}

/** The SHA-256 of some bytes as 64 hex digits (the platform's own: a Worker and Node both have it). */
export async function sha256Of(bytes) {
  const d = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  let out = '';
  for (const x of d) out += x.toString(16).padStart(2, '0');
  return out;
}

/**
 * What a put of `bytes` under `hash` is told: null when the room takes it, else `{ status, words }`. In the
 * order the questions can be answered — nothing, too large, not a picture, not the bytes the address names, and
 * last the room's own cap (`held` bytes of `cap`, unless the picture is already `have`n, which costs nothing).
 */
export async function assetCheck(bytes, hash, o = {}) {
  if (!bytes || !bytes.length) return { status: 400, words: 'nothing was sent — a picture is its bytes' };
  const big = assetSizeVerdict(bytes.length);
  if (big) return big;
  if (!sniffImage(bytes)) return { status: 415, words: 'a picture here is a PNG, JPEG, WebP or GIF — those bytes are none of them' };
  const actual = await sha256Of(bytes);
  if (actual !== hash) return { status: 422, words: 'those are not the bytes this address names — they hash to ' + actual.slice(0, 12) + '…' };
  return o.have ? null : assetFull(o.held || 0, bytes.length, o.cap || DEFAULT_ASSET_ROOM_BYTES);
}

/**
 * The room's own cap: null while `n` more bytes fit beside the `held` ones, else the refusal. Asked again by a
 * server at the moment it keeps a picture, with nothing awaited between, so two puts at once cannot both fit.
 */
export function assetFull(held, n, cap) {
  if (held + n <= cap) return null;
  return { status: 507, words: 'this room holds all the pictures it keeps (' + mb(cap) + ') — nothing was added, and what it holds stays' };
}

/** The words for an address that is no hash, a room that is no text, a picture the room does not hold. */
export const ASSET_WORDS = {
  hash: 'a picture is named by its SHA-256 — 64 lower-case hex digits',
  room: 'a room name is text',
  missing: 'this room holds no picture with that hash',
};

/** The headers a picture is answered with: what the bytes are, how long they are, and that they never change. */
export function assetHeaders(mime, size, hash) {
  return {
    'content-type': mime,
    'content-length': String(size),
    etag: '"' + hash + '"',
    'cache-control': ASSET_CACHE_CONTROL,
    'x-content-type-options': 'nosniff',
    // Opened by address, a picture is only a picture: no script, no frame, no navigation out of it.
    'content-security-policy': "default-src 'none'; sandbox",
  };
}
