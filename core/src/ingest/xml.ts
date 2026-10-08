// A small XML reader, by hand (V1-SPEC IN1: core has no dependencies and no DOM).
//
// It reads what an SVG is made of — elements, attributes, text, CDATA, comments, a doctype with an internal
// subset — into a tree, and refuses what is not XML in a sentence that says where: a tag never closed, a closing
// tag that does not match, a file that stops in the middle of one. It is strict about the structure and about
// nothing else. No entity a document declares for itself is ever expanded (a billion-laughs file is a file with
// text in it that says `&lol9;`); the five named references and numeric ones are.
//
// Caps are the caller's: a file with more elements than `maxNodes`, or nested deeper than `maxDepth`, is
// refused, not read for as long as it takes. Nothing here throws.

import { decodeEntities } from '../search/entities';

export interface XNode {
  /** The element's name; `svg:` is dropped, any other prefix is kept (`inkscape:path-effect`). */
  name: string;
  attrs: Record<string, string>;
  /** Child elements and text, in order. */
  kids: (XNode | string)[];
  parent: XNode | null;
  /** Offset of the tag in the text: for saying where. */
  pos: number;
  /** A number unique in the tree: what a clone cache is keyed by. */
  uid: number;
}

export type XmlResult =
  | { ok: true; root: XNode; comments: string[]; nodes: number; byId: Map<string, XNode> }
  | { ok: false; reason: string };

export interface XmlLimits {
  maxNodes: number;
  maxDepth: number;
}

const NAME_START = /[A-Za-z_:À-￿]/;
const WS = /\s/;

/** Elements whose white-space-only text between children is meaningful (it is words). */
const KEEP_SPACE = new Set(['text', 'tspan', 'textPath', 'style', 'title', 'desc']);

function lineOf(text: string, pos: number): number {
  let n = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < pos; i = text.indexOf('\n', i + 1)) n++;
  return n;
}

export function parseXml(text: string, limits: XmlLimits): XmlResult {
  const n = text.length;
  const byId = new Map<string, XNode>();
  const comments: string[] = [];
  const stack: XNode[] = [];
  let root: XNode | null = null;
  let nodes = 0;
  let i = 0;
  const fail = (reason: string, at: number): XmlResult => ({ ok: false, reason: `${reason} (line ${lineOf(text, at)})` });

  const addText = (s: string) => {
    if (!s || stack.length === 0) return;
    const top = stack[stack.length - 1];
    if (!KEEP_SPACE.has(top.name) && !/\S/.test(s)) return;
    top.kids.push(s);
  };

  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt === -1) {
      if (stack.length === 0) break;
      addText(decodeEntities(text.slice(i)));
      i = n;
      break;
    }
    if (lt > i) addText(text.slice(i, lt).indexOf('&') === -1 ? text.slice(i, lt) : decodeEntities(text.slice(i, lt)));
    i = lt;
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end === -1) return fail('a comment is never closed', i);
      if (comments.length < 24) comments.push(text.slice(i + 4, Math.min(end, i + 4 + 400)));
      i = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      const end = text.indexOf(']]>', i + 9);
      if (end === -1) return fail('a CDATA section is never closed', i);
      if (stack.length) stack[stack.length - 1].kids.push(text.slice(i + 9, end));
      i = end + 3;
      continue;
    }
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      if (end === -1) return fail('a processing instruction is never closed', i);
      i = end + 2;
      continue;
    }
    if (text.startsWith('<!', i)) {
      // A doctype, with an internal subset in brackets that may hold declarations with `>` inside quotes.
      let depth = 0;
      let quote = '';
      let j = i + 2;
      for (; j < n; j++) {
        const c = text[j];
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") quote = c;
        else if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '>' && depth <= 0) break;
      }
      if (j >= n) return fail('a declaration is never closed', i);
      i = j + 1;
      continue;
    }
    if (text[i + 1] === '/') {
      const end = text.indexOf('>', i + 2);
      if (end === -1) return fail('a closing tag is never finished', i);
      let name = text.slice(i + 2, end).trim();
      if (name.startsWith('svg:')) name = name.slice(4);
      const top = stack[stack.length - 1];
      if (!top) return fail(`a closing </${name}> has nothing open`, i);
      if (top.name !== name) return fail(`a </${name}> closes a <${top.name}> opened at line ${lineOf(text, top.pos)}`, i);
      stack.pop();
      i = end + 1;
      continue;
    }
    if (!NAME_START.test(text[i + 1] ?? '')) return fail('a < that does not start a tag', i);
    // A start tag.
    const tagStart = i;
    let j = i + 1;
    while (j < n && !WS.test(text[j]) && text[j] !== '/' && text[j] !== '>') j++;
    let name = text.slice(i + 1, j);
    if (name.startsWith('svg:')) name = name.slice(4);
    const attrs: Record<string, string> = {};
    let selfClose = false;
    for (;;) {
      while (j < n && WS.test(text[j])) j++;
      if (j >= n) return fail(`the tag <${name}> is cut off`, tagStart);
      if (text[j] === '>') { j++; break; }
      if (text[j] === '/') {
        if (text[j + 1] !== '>') return fail(`a / inside the tag <${name}> is not followed by >`, tagStart);
        selfClose = true;
        j += 2;
        break;
      }
      const a0 = j;
      while (j < n && !WS.test(text[j]) && text[j] !== '=' && text[j] !== '>' && text[j] !== '/') j++;
      const an = text.slice(a0, j);
      if (!an) return fail(`the tag <${name}> has an attribute with no name`, tagStart);
      while (j < n && WS.test(text[j])) j++;
      if (text[j] !== '=') return fail(`the attribute ${an} of <${name}> has no value`, tagStart);
      j++;
      while (j < n && WS.test(text[j])) j++;
      const q = text[j];
      if (q !== '"' && q !== "'") return fail(`the value of ${an} in <${name}> is not quoted`, tagStart);
      const close = text.indexOf(q, j + 1);
      if (close === -1) return fail(`the value of ${an} in <${name}> is never closed`, tagStart);
      const raw = text.slice(j + 1, close);
      attrs[an] = raw.indexOf('&') === -1 ? raw : decodeEntities(raw);
      j = close + 1;
    }
    if (++nodes > limits.maxNodes) return { ok: false, reason: `the file has more than ${limits.maxNodes.toLocaleString('en')} elements — more than is read` };
    const node: XNode = { name, attrs, kids: [], parent: stack[stack.length - 1] ?? null, pos: tagStart, uid: nodes };
    if (stack.length === 0) {
      if (root) return fail(`there is a second root element, <${name}>, after <${root.name}>`, tagStart);
      root = node;
    } else {
      stack[stack.length - 1].kids.push(node);
    }
    const id = attrs.id;
    if (id && !byId.has(id)) byId.set(id, node);
    if (!selfClose) {
      if (stack.length >= limits.maxDepth) return { ok: false, reason: `the file nests elements more than ${limits.maxDepth} deep` };
      stack.push(node);
    }
    i = j;
  }
  if (stack.length) {
    const open = stack[stack.length - 1];
    return fail(`the file stops inside <${open.name}>, opened at line ${lineOf(text, open.pos)}, which is never closed`, open.pos);
  }
  if (!root) return { ok: false, reason: 'there is no element in the file' };
  return { ok: true, root, comments, nodes, byId };
}

/** The text an element holds, its children's included, white space squeezed. */
export function textOf(node: XNode): string {
  let out = '';
  const walk = (x: XNode | string) => {
    if (typeof x === 'string') out += x;
    else for (const k of x.kids) walk(k);
  };
  walk(node);
  return out.replace(/\s+/g, ' ').trim();
}
