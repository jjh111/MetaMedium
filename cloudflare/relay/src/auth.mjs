// A room's key: HMAC-SHA256 of the room's name under a secret only the relay
// holds, as base64url — 43 characters. No table of keys to keep, nothing to
// store: John hands an agent the key for one room (`room-key.mjs claude`), the
// relay recomputes it for any room it is asked about, and a key for one room
// opens no other. The key for the room `*` opens every room — his own, never an
// agent's. Rotating the secret retires every key; the secret may list the new
// and the old (comma-separated) while hands are given the new keys.

const enc = new TextEncoder();
const PREFIX = 'dyna-room:';

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function fromB64url(text) {
  try {
    const t = text.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch { return null; }
}
const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

/** The secrets a relay accepts keys under: one, or a comma-separated list. */
export function secretsOf(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** The key for a room (or for `*`, every room) under a secret. */
export async function keyForRoom(secret, room) {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(PREFIX + room)));
}

/** Whether `key` is the key for `room` (or for every room) under any of `secrets`. Each check is constant-time. */
export async function keyOpens(secrets, room, key) {
  const sig = typeof key === 'string' && key.length === 43 ? fromB64url(key) : null;
  if (!sig) return false;
  let ok = false;
  for (const secret of secrets) {
    const k = await hmacKey(secret, 'verify');
    for (const name of [room, '*']) if (await crypto.subtle.verify('HMAC', k, sig, enc.encode(PREFIX + name))) ok = true;
  }
  return ok;
}
