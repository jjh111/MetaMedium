// The string literals of a script, found by a scanner — one home for the tests that read what a person sees
// (scripts/name.test.mjs, RENAME-PLAN N3a; scripts/words.test.mjs, the UX pass's copy test).

const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);

/**
 * The string literals of a script, as [from, to) ranges of their contents — single, double and the static parts
 * of template literals, through `${…}` however deep. Comments and regular expressions are read past, never as
 * strings. A scanner, not a parser: it knows what it needs to tell a string from everything else.
 */
export function stringRanges(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  /** The last significant character or word before `at`, to tell a regex from a division. */
  const regexAllowed = (at) => {
    let j = at - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    if (j < 0) return true;
    const c = src[j];
    if (/[(,=:[!&|?{};+\-*%<>~^]/.test(c)) return true;
    if (/[\w$]/.test(c)) {
      let k = j;
      while (k >= 0 && /[\w$]/.test(src[k])) k--;
      return REGEX_AFTER_WORD.has(src.slice(k + 1, j + 1));
    }
    return false;
  };
  const quoted = (q) => { // at the opening quote
    const start = ++i;
    while (i < n && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    out.push([start, i]);
    i++;
  };
  const regex = () => { // at the opening slash
    i++;
    let cls = false;
    while (i < n && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (cls) { if (c === ']') cls = false; } else if (c === '[') cls = true; else if (c === '/') break;
      i++;
    }
    i++;
    while (i < n && /[a-z]/i.test(src[i])) i++;
  };
  const template = () => { // at the opening backtick
    let start = ++i;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { out.push([start, i]); i++; return; }
      if (c === '$' && src[i + 1] === '{') { out.push([start, i]); i += 2; code(true); start = i; continue; }
      i++;
    }
    out.push([start, i]);
  };
  const code = (inBraces) => {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '\'' || c === '"') { quoted(c); continue; }
      if (c === '`') { template(); continue; }
      if (c === '/' && regexAllowed(i)) { regex(); continue; }
      if (c === '{') depth++;
      if (c === '}') { if (inBraces && depth === 0) { i++; return; } depth--; }
      i++;
    }
  };
  code(false);
  return out;
}
