// The sentences a person says to make and relate kinds, read into acts. A TEST helper, and only that: the specimen's
// `read`, kept so the golden and the harmony tests can say things the way a person would. The field's reader — what
// a word with an article, `it's …` and `kind:` mean at the pen tip — is KN1's to own, and when it lands this goes.
// Nothing outside this folder's tests imports it, and it is not in the build or the bundles.
import { hueOfWord } from '../names';
import type { KindAct } from '../harmony';

/** The kind a phrase names: no article, a plural taken down to one. (Naive on purpose: it is the specimen's.) */
function kind(w: string): string {
  const x = w.trim().replace(/^(an?|the) /, '');
  if (/ies$/.test(x)) return x.replace(/ies$/, 'y');
  if (/(ss|x|ch|sh)es$/.test(x)) return x.replace(/es$/, '');
  return /(ss|us|is)$/.test(x) ? x : x.replace(/s$/, '');
}

/** Read one sentence into an act, or null when it is none of the few the specimen knew. */
export function readPhrase(text: string): KindAct | null {
  const t = text.trim().toLowerCase().replace(/[“”"']/g, m => (m === "'" ? "'" : '')).replace(/\s+/g, ' ').replace(/[.!]+$/, '');
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(?:it's|it is|this is|that's|these are|those are) (an? |the )?([a-z][a-z -]*?)(?:(?:\s*[·,;—–]\s*|\s+-\s+|\s+(?:in|and it's|coloured|colored)\s+)(#?[0-9a-z]+))?$/))) {
    return m[3] === undefined ? { act: 'say', a: kind(m[2]) } : { act: 'say', a: kind(m[2]), word: m[3] };
  }
  if ((m = t.match(/^([a-z][a-z -]*?) (?:is|are) (?:a |an )?(?:kind|sort|type) of (?:an? )?([a-z][a-z -]*)$/))) return { act: 'sub', a: kind(m[1]), b: kind(m[2]) };
  if ((m = t.match(/^([a-z][a-z -]*?) (?:opposes|oppose|is opposed to|contradicts|against|vs\.?|versus) (?:an? )?([a-z][a-z -]*)$/))) return { act: 'opposes', a: kind(m[1]), b: kind(m[2]) };
  if ((m = t.match(/^([a-z][a-z -]*?) (?:is|are) (?:kin to|like|related to|near|akin to) (?:an? )?([a-z][a-z -]*)$/))) return { act: 'kin', a: kind(m[1]), b: kind(m[2]) };
  if ((m = t.match(/^([a-z][a-z -]*?) (?:relates? to|goes with) (?:an? )?([a-z][a-z -]*)$/))) return { act: 'kin', a: kind(m[1]), b: kind(m[2]) };
  if ((m = t.match(/^(?:make |colou?r )?([a-z][a-z -]*?) (?:is |are |)(#[0-9a-f]{3,6}|[a-z]+)$/)) && hueOfWord(m[2])) return { act: 'say', a: kind(m[1]), word: m[2] };
  if ((m = t.match(/^(?:new kind|kind:?) ([a-z][a-z -]*?)(?:\s*[·,]\s*(#?[0-9a-z]+))?$/))) {
    return m[2] === undefined ? { act: 'say', a: kind(m[1]) } : { act: 'say', a: kind(m[1]), word: m[2] };
  }
  return null;
}
