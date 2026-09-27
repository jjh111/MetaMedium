// How a hand is named in a room (DIRECTOR-PLAN-W2 L1).
//
// Every hand writes its own log, and every id its events mint is derived from
// that log's name and the event's number in it (ids per hand,
// SURFACE-v10-PLAN D8). So one rule decides whether a number can ever be
// issued twice under one name:
//
//   **A log name is reused only when its whole history was loaded first.**
//
// A folder board's history is its file, read before anything is minted, so it
// may keep one name for good. A board in browser storage restores its whole
// log before the first mark. A LIVE hand has no such history to load: a tab
// keeps no log of its own and never hears its own lines back, and a process
// starts empty. Resuming an old name there would start the numbering again at
// one, under a name whose numbers the room already holds for other marks — the
// reload defect (D2). So a live hand's log is ONE SITTING: a tab's page load,
// a process. The name is the person's; the suffix is the sitting's, new every
// time. The session keeps the sitting's high-water mark in memory, so within
// a sitting nothing rewinds it either (D1).
//
// The person is unchanged across sittings: what is shown — the name on a card,
// the colour a hand's ink is drawn in — is derived from the name WITHOUT its
// suffix (`handLabel`), so a reload is a new log and the same hand.

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A fresh token, `length` letters and digits: a sitting's suffix, or a
 * store's own sitting id. Never derived from anything, so two sittings share
 * one only by chance.
 */
export function sittingToken(length = 4, random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  return out;
}

/**
 * The log name for one sitting of a hand: the person's name, and a suffix
 * this sitting mints (`person~k3j9`). A host mints the suffix ONCE per sitting
 * — a tab at page load, a process at start — and never stores it anywhere a
 * reload would find it. Any suffix the person's name already carries is
 * dropped, so a name is never a suffix deep in another.
 */
export function sittingName(person: string, suffix: string = sittingToken()): string {
  const who = String(person ?? '').replace(/~.*$/, '').trim() || 'hand';
  return `${who}~${suffix}`;
}

/** A hand's name as a person sees it: its log name without the sitting's suffix. */
export function handLabel(name: string): string {
  return String(name ?? '').replace(/~[^~]*$/, '');
}
