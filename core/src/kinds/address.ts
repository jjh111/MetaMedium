// Render for addressing: what ink over an artifact lands on, per kind.
//
// MVP's rule — the drawn boxes ARE the outlines of the divs — generalises:
// every artifact renders as something ink can address, and what the ink
// lands on is what a prompt changes. A page has regions; a script has
// functions; data has keys; prose has headings; a vector has elements. Ids
// are stable across edits that do not reorder, so a comment on `fn:steer`
// survives a reflow of the source.

import type { Kind } from './kinds';

export interface Addressable {
  /** Stable within the artifact: `fn:name`, `key:a.b`, `h:slug`, `el:tag#n`. */
  id: string;
  label: string;
  /** Character offsets into the source, half-open. */
  start: number;
  end: number;
  /** Nesting, where the kind has it. */
  depth: number;
}

export function addressablesOf(kind: Kind, source: string): Addressable[] {
  switch (kind) {
    case 'js': return functionsOf(source);
    case 'json': return keysOf(source);
    case 'md': return headingsOf(source);
    case 'svg': return elementsOf(source);
    case 'text': return runsOf(source);
    default: return [];
  }
}

// ===== js: top-level declarations, brace-matched, string- and comment-aware =====

/** Index just past the block that opens at `open` (a `{`), or -1. */
export function matchBrace(src: string, open: number): number {
  let depth = 0, i = open;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; if (q === '`' && src[i] === '$' && src[i + 1] === '{') { const e = matchBrace(src, i + 1); if (e === -1) return -1; i = e; continue; } i++; }
      i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) return -1; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if (i === -1) return -1; i += 2; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return -1;
}

const DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:(function\*?)\s+([A-Za-z_$][\w$]*)|(class)\s+([A-Za-z_$][\w$]*)|(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/;

export function functionsOf(src: string): Addressable[] {
  const out: Addressable[] = [];
  const seen = new Map<string, number>();
  let i = 0;
  while (i < src.length) {
    // Only at line starts with no indentation: top level.
    const lineEnd = src.indexOf('\n', i);
    const line = src.slice(i, lineEnd === -1 ? src.length : lineEnd);
    const m = DECL.exec(line);
    if (m) {
      const name = m[2] ?? m[4] ?? m[6];
      const isBlock = !!(m[1] || m[3]);
      let end: number;
      if (isBlock) {
        const open = src.indexOf('{', i);
        end = open === -1 ? -1 : matchBrace(src, open);
      } else {
        // const x = ...; ends at the first `;` at depth 0, or a blank line, or EOF.
        end = statementEnd(src, i);
      }
      if (end !== -1) {
        const n = (seen.get(name) ?? 0) + 1;
        seen.set(name, n);
        out.push({ id: `fn:${name}${n > 1 ? '#' + n : ''}`, label: name, start: i, end, depth: 0 });
        i = end;
        continue;
      }
    }
    if (lineEnd === -1) break;
    i = lineEnd + 1;
  }
  return out;
}

function statementEnd(src: string, from: number): number {
  let depth = 0, i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) return src.length; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if (i === -1) return src.length; i += 2; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ';' && depth === 0) return i + 1;
    else if (c === '\n' && depth === 0 && /^\s*\n/.test(src.slice(i + 1, i + 3))) return i + 1;
    i++;
  }
  return src.length;
}

// ===== json: keys, with dotted paths into nested objects =====

export function keysOf(src: string, maxDepth = 3): Addressable[] {
  const out: Addressable[] = [];
  let parsed: unknown;
  try { parsed = JSON.parse(src); } catch { return out; }
  // Offsets come from a tolerant scan for `"key":` in document order.
  const walk = (obj: unknown, path: string[], from: number, depth: number): number => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || depth > maxDepth) return from;
    let cursor = from;
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const needle = JSON.stringify(key);
      const at = src.indexOf(needle + ':', cursor) !== -1 ? src.indexOf(needle + ':', cursor) : src.indexOf(needle, cursor);
      if (at === -1) continue;
      const valueStart = src.indexOf(':', at) + 1;
      const end = valueEnd(src, valueStart);
      const id = ['key', ...path, key].join(path.length ? '.' : ':').replace(/^key\./, 'key:');
      out.push({ id: path.length ? `key:${[...path, key].join('.')}` : `key:${key}`, label: [...path, key].join('.'), start: at, end, depth });
      void id;
      walk((obj as Record<string, unknown>)[key], [...path, key], valueStart, depth + 1);
      cursor = end;
    }
    return cursor;
  };
  walk(parsed, [], 0, 0);
  return out;
}

function valueEnd(src: string, from: number): number {
  let i = from;
  while (i < src.length && /\s/.test(src[i])) i++;
  const c = src[i];
  if (c === '{' || c === '[') {
    const close = c === '{' ? '}' : ']';
    let depth = 0;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '"') { i++; while (i < src.length && src[i] !== '"') { if (src[i] === '\\') i++; i++; } continue; }
      if (ch === c) depth++;
      else if (ch === close) { depth--; if (depth === 0) return i + 1; }
    }
    return src.length;
  }
  if (c === '"') { i++; while (i < src.length && src[i] !== '"') { if (src[i] === '\\') i++; i++; } return i + 1; }
  while (i < src.length && !/[,}\]\n]/.test(src[i])) i++;
  return i;
}

// ===== md: sections by heading =====

export function headingsOf(src: string): Addressable[] {
  const out: Addressable[] = [];
  const re = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  const heads: { level: number; text: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) heads.push({ level: m[1].length, text: m[2], start: m.index });
  const seen = new Map<string, number>();
  heads.forEach((h, i) => {
    let end = src.length;
    for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= h.level) { end = heads[j].start; break; }
    const slug = h.text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const n = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, n);
    out.push({ id: `h:${slug}${n > 1 ? '#' + n : ''}`, label: h.text, start: h.start, end, depth: h.level - 1 });
  });
  return out;
}

// ===== svg: the elements directly inside <svg> =====

export function elementsOf(source: string): Addressable[] {
  const out: Addressable[] = [];
  // Comments are blanked, not removed, so offsets still index the source.
  const src = source.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));
  const root = src.search(/<svg[\s>]/i);
  if (root === -1) return out;
  const rootOpenEnd = src.indexOf('>', root);
  if (rootOpenEnd === -1) return out;
  const counts = new Map<string, number>();
  let i = rootOpenEnd + 1, depth = 0;
  const tag = /<\/?([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g;
  tag.lastIndex = i;
  let m: RegExpExecArray | null;
  let openAt = -1, openName = '', openAttrs = '';
  while ((m = tag.exec(src))) {
    const closing = src[m.index + 1] === '/';
    const name = m[1], selfClosing = m[3] === '/';
    if (closing) {
      if (name.toLowerCase() === 'svg' && depth === 0) break;
      depth--;
      if (depth === 0 && openAt !== -1) { push(openName, openAttrs, openAt, m.index + m[0].length); openAt = -1; }
      continue;
    }
    if (depth === 0) {
      if (selfClosing) { push(name, m[2], m.index, m.index + m[0].length); continue; }
      openAt = m.index; openName = name; openAttrs = m[2];
    }
    if (!selfClosing) depth++;
  }
  function push(name: string, attrs: string, start: number, end: number) {
    const idAttr = /\bid\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    out.push({ id: idAttr ? `el:${idAttr}` : `el:${name}#${n}`, label: idAttr ?? `${name} ${n}`, start, end, depth: 0 });
  }
  return out;
}

// ===== text: paragraphs (runs separated by blank lines) =====

export function runsOf(src: string): Addressable[] {
  const out: Addressable[] = [];
  const re = /[^\n][\s\S]*?(?=\n\s*\n|$)/g;
  let m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(src))) {
    if (!m[0].trim()) continue;
    n++;
    out.push({ id: `p:${n}`, label: m[0].trim().slice(0, 40), start: m.index, end: m.index + m[0].length, depth: 0 });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}
