// Words, for Find (PLAN-IPAD-NOTES I6): what a person types and what a board says are folded the same way —
// case, diacritics, a few ligatures — and cut into words at anything that is not a letter or a digit. Each word
// keeps where it stands in the text it came from, so a hit can show the words that matched.
//
// No stemming, on purpose: prefix matching as the person types already finds *pricing* from *pric*, and a stemmer
// is a guess about a language the person did not name. A later seat (I9) brings meaning; this is the lexical floor.

/** A word as folded, and where it stands in what was written (`start` and `end` index the ORIGINAL text). */
export interface Token { text: string; start: number; end: number }

const SPECIAL: Record<string, string> = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l', 'ı': 'i' };

/** One character folded: lower case, its accents taken off (`é` → `e`), `ß` → `ss`. A lone combining mark folds to nothing. */
export function foldChar(ch: string): string {
  const low = ch.toLowerCase();
  const sp = SPECIAL[low];
  if (sp) return sp;
  return low.normalize('NFD').replace(/\p{M}/gu, '');
}

const WORD = /^[\p{L}\p{N}]+$/u;

/** The words of a text, folded, in order, each with its place in the text. Anything else — space, a dash, a bullet — is between words. */
export function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let cur: Token | null = null;
  const text = typeof s === 'string' ? s : '';
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const next = i + ch.length;
    const f = foldChar(ch);
    if (f === '') { if (cur) cur.end = next; } // an accent on its own, written after its letter
    else if (WORD.test(f)) {
      if (cur) { cur.text += f; cur.end = next; } else { cur = { text: f, start: i, end: next }; out.push(cur); }
    } else cur = null;
    i = next;
  }
  return out;
}

/** The words of a text, folded and joined by a space: how two sayings are compared. */
export function normalise(s: string): string {
  return tokenize(s).map((t) => t.text).join(' ');
}
