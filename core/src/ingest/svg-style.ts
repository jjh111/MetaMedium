// The paint of an SVG: colours, lengths, style declarations and the stylesheets that set them (V1-SPEC IN1).
//
// A pen stroke's colour is data (V1-SPEC KN2: kept as the source drew it until the stroke is given a kind), so
// every way an SVG can say a colour is read here: `#rgb`, `#rrggbb` and their alpha forms, `rgb()` and `rgba()`
// with commas or spaces, `hsl()`, the named colours, `currentColor`, `none`, and `url(#paint)` as a reference for
// the caller to resolve. Lengths come out in CSS pixels, the hand's unit. A stylesheet is read as far as
// Illustrator and Inkscape write one — a list of rules whose selectors are a type, a class, an id or those
// together — and a rule that needs more is counted, not guessed at.
//
// Read, not trusted (DATA-1): a value that does not read is null, never a throw and never a guess.

import { hexColor } from './source';

export type Paint =
  | { kind: 'none' }
  | { kind: 'color'; hex: string; alpha: number }
  | { kind: 'ref'; id: string; fallback: Paint | null };

const NAMED: Record<string, string> = {
  aliceblue: 'f0f8ff', antiquewhite: 'faebd7', aqua: '00ffff', aquamarine: '7fffd4', azure: 'f0ffff', beige: 'f5f5dc', bisque: 'ffe4c4',
  black: '000000', blanchedalmond: 'ffebcd', blue: '0000ff', blueviolet: '8a2be2', brown: 'a52a2a', burlywood: 'deb887', cadetblue: '5f9ea0',
  chartreuse: '7fff00', chocolate: 'd2691e', coral: 'ff7f50', cornflowerblue: '6495ed', cornsilk: 'fff8dc', crimson: 'dc143c', cyan: '00ffff',
  darkblue: '00008b', darkcyan: '008b8b', darkgoldenrod: 'b8860b', darkgray: 'a9a9a9', darkgreen: '006400', darkgrey: 'a9a9a9', darkkhaki: 'bdb76b',
  darkmagenta: '8b008b', darkolivegreen: '556b2f', darkorange: 'ff8c00', darkorchid: '9932cc', darkred: '8b0000', darksalmon: 'e9967a',
  darkseagreen: '8fbc8f', darkslateblue: '483d8b', darkslategray: '2f4f4f', darkslategrey: '2f4f4f', darkturquoise: '00ced1', darkviolet: '9400d3',
  deeppink: 'ff1493', deepskyblue: '00bfff', dimgray: '696969', dimgrey: '696969', dodgerblue: '1e90ff', firebrick: 'b22222', floralwhite: 'fffaf0',
  forestgreen: '228b22', fuchsia: 'ff00ff', gainsboro: 'dcdcdc', ghostwhite: 'f8f8ff', gold: 'ffd700', goldenrod: 'daa520', gray: '808080',
  green: '008000', greenyellow: 'adff2f', grey: '808080', honeydew: 'f0fff0', hotpink: 'ff69b4', indianred: 'cd5c5c', indigo: '4b0082', ivory: 'fffff0',
  khaki: 'f0e68c', lavender: 'e6e6fa', lavenderblush: 'fff0f5', lawngreen: '7cfc00', lemonchiffon: 'fffacd', lightblue: 'add8e6', lightcoral: 'f08080',
  lightcyan: 'e0ffff', lightgoldenrodyellow: 'fafad2', lightgray: 'd3d3d3', lightgreen: '90ee90', lightgrey: 'd3d3d3', lightpink: 'ffb6c1',
  lightsalmon: 'ffa07a', lightseagreen: '20b2aa', lightskyblue: '87cefa', lightslategray: '778899', lightslategrey: '778899', lightsteelblue: 'b0c4de',
  lightyellow: 'ffffe0', lime: '00ff00', limegreen: '32cd32', linen: 'faf0e6', magenta: 'ff00ff', maroon: '800000', mediumaquamarine: '66cdaa',
  mediumblue: '0000cd', mediumorchid: 'ba55d3', mediumpurple: '9370db', mediumseagreen: '3cb371', mediumslateblue: '7b68ee', mediumspringgreen: '00fa9a',
  mediumturquoise: '48d1cc', mediumvioletred: 'c71585', midnightblue: '191970', mintcream: 'f5fffa', mistyrose: 'ffe4e1', moccasin: 'ffe4b5',
  navajowhite: 'ffdead', navy: '000080', oldlace: 'fdf5e6', olive: '808000', olivedrab: '6b8e23', orange: 'ffa500', orangered: 'ff4500', orchid: 'da70d6',
  palegoldenrod: 'eee8aa', palegreen: '98fb98', paleturquoise: 'afeeee', palevioletred: 'db7093', papayawhip: 'ffefd5', peachpuff: 'ffdab9', peru: 'cd853f',
  pink: 'ffc0cb', plum: 'dda0dd', powderblue: 'b0e0e6', purple: '800080', rebeccapurple: '663399', red: 'ff0000', rosybrown: 'bc8f8f', royalblue: '4169e1',
  saddlebrown: '8b4513', salmon: 'fa8072', sandybrown: 'f4a460', seagreen: '2e8b57', seashell: 'fff5ee', sienna: 'a0522d', silver: 'c0c0c0',
  skyblue: '87ceeb', slateblue: '6a5acd', slategray: '708090', slategrey: '708090', snow: 'fffafa', springgreen: '00ff7f', steelblue: '4682b4', tan: 'd2b48c',
  teal: '008080', thistle: 'd8bfd8', tomato: 'ff6347', turquoise: '40e0d0', violet: 'ee82ee', wheat: 'f5deb3', white: 'ffffff', whitesmoke: 'f5f5f5',
  yellow: 'ffff00', yellowgreen: '9acd32',
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function channel(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const pct = t.endsWith('%');
  const v = Number(pct ? t.slice(0, -1) : t);
  if (!Number.isFinite(v)) return null;
  return pct ? (clamp01(v / 100)) * 255 : Math.max(0, Math.min(255, v));
}
function alphaOf(s: string | undefined): number | null {
  if (s === undefined) return 1;
  const t = s.trim();
  const pct = t.endsWith('%');
  const v = Number(pct ? t.slice(0, -1) : t);
  return Number.isFinite(v) ? clamp01(pct ? v / 100 : v) : null;
}
function hslToHex(h: number, s: number, l: number): string {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp01(s), ll = clamp01(l);
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const f = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return hexColor(f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255);
}

/** A colour as `#rrggbb` and an alpha, or null when it does not read. */
export function parseColor(value: string): { hex: string; alpha: number } | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v[0] === '#') {
    const h = v.slice(1);
    if (!/^[0-9a-f]+$/.test(h)) return null;
    if (h.length === 3 || h.length === 4) {
      const e = (i: number) => parseInt(h[i] + h[i], 16);
      return { hex: hexColor(e(0), e(1), e(2)), alpha: h.length === 4 ? e(3) / 255 : 1 };
    }
    if (h.length === 6 || h.length === 8) {
      return { hex: '#' + h.slice(0, 6), alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
    }
    return null;
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(v);
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const alpha = alphaOf(parts[3]);
    if (alpha === null) return null;
    if (fn[1].startsWith('rgb')) {
      const r = channel(parts[0]), g = channel(parts[1]), b = channel(parts[2]);
      return r === null || g === null || b === null ? null : { hex: hexColor(r, g, b), alpha };
    }
    const h = Number(parts[0].replace(/deg$/, ''));
    const s = channel(parts[1].endsWith('%') ? parts[1] : parts[1] + '%'), l = channel(parts[2].endsWith('%') ? parts[2] : parts[2] + '%');
    return !Number.isFinite(h) || s === null || l === null ? null : { hex: hslToHex(h, s / 255, l / 255), alpha };
  }
  if (v === 'transparent') return { hex: '#000000', alpha: 0 };
  const named = NAMED[v];
  return named ? { hex: '#' + named, alpha: 1 } : null;
}

/** A `fill` or `stroke` value: a colour, none, or a reference to a paint server, with `current` standing for `currentColor`. */
export function parsePaint(value: string, current: string): Paint | 'inherit' | null {
  const v = value.trim();
  const low = v.toLowerCase();
  if (low === 'none') return { kind: 'none' };
  if (low === 'inherit') return 'inherit';
  if (low === 'currentcolor') return { kind: 'color', hex: current, alpha: 1 };
  const ref = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)\s*(.*)$/i.exec(v);
  if (ref) {
    const rest = ref[2].trim();
    const fb = rest ? parsePaint(rest, current) : null;
    return { kind: 'ref', id: ref[1], fallback: fb && fb !== 'inherit' ? fb : null };
  }
  const c = parseColor(v);
  if (!c) return null;
  return c.alpha === 0 ? { kind: 'none' } : { kind: 'color', hex: c.hex, alpha: c.alpha };
}

const UNITS: Record<string, number> = { '': 1, px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };

/** A length in CSS pixels; `em` and `ex` are read against `fontPx`. Null for a percentage, `auto` or anything that is not one. */
export function parseLength(value: string | undefined, fontPx = 16): number | null {
  if (value === undefined) return null;
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-Z]*)\s*$/.exec(value);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const u = m[2].toLowerCase();
  if (u === 'em') return n * fontPx;
  if (u === 'ex') return (n * fontPx) / 2;
  const k = UNITS[u];
  return k === undefined ? null : n * k;
}

/** A plain number, as an attribute like `opacity` or `stroke-width` without a unit gives it; null when it is not one. */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** The numbers in a list (`viewBox`, `x="1 2 3"`), or null when anything in it is not a number. */
export function numberList(value: string | undefined): number[] | null {
  if (value === undefined) return null;
  const parts = value.trim().split(/[\s,]+/).filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out;
}

/** The declarations of a `style` attribute or a rule's body, `;` inside parentheses or quotes left alone. */
export function parseDeclarations(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let quote = '';
  let start = 0;
  const take = (end: number) => {
    const piece = text.slice(start, end);
    const colon = piece.indexOf(':');
    if (colon > 0) {
      const name = piece.slice(0, colon).trim().toLowerCase();
      const val = piece.slice(colon + 1).replace(/!important\s*$/i, '').trim();
      if (name && val) out[name] = val;
    }
    start = end + 1;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) take(i);
  }
  take(text.length);
  return out;
}

// ---- stylesheets ----------------------------------------------------------------------------------------

export interface Rule {
  tag: string | null;
  id: string | null;
  classes: string[];
  /** Specificity as CSS counts it: ids, then classes, then types. */
  weight: number;
  /** Where the rule stands in the sheet: later wins a tie. */
  order: number;
  decls: Record<string, string>;
}

export interface Sheet {
  rules: Rule[];
  /** The rules by what they name, so an element is tested against the few that could apply, not all of them. */
  byClass: Map<string, Rule[]>;
  byId: Map<string, Rule[]>;
  byTag: Map<string, Rule[]>;
  /** Rules that name nothing (`*`). */
  any: Rule[];
  /** How many selectors needed more than a type, class and id (a combinator, an attribute, a pseudo-class). */
  unsupported: number;
  /** How many rules were past `MAX_RULES` and not kept. */
  dropped: number;
}

/** More rules than this in a sheet are not read: a drawing has a handful, and each is tested against elements. */
export const MAX_RULES = 5000;

export const emptySheet = (): Sheet => ({ rules: [], byClass: new Map(), byId: new Map(), byTag: new Map(), any: [], unsupported: 0, dropped: 0 });

function simpleSelector(sel: string): Omit<Rule, 'decls' | 'order'> | null {
  const s = sel.trim();
  if (!s || /[\s>+~[\]:()]/.test(s)) return null;
  let tag: string | null = null;
  let id: string | null = null;
  const classes: string[] = [];
  const re = /([.#]?)([A-Za-z_][\w-]*|\*)/y;
  let pos = 0;
  while (pos < s.length) {
    re.lastIndex = pos;
    const m = re.exec(s);
    if (!m) return null;
    if (m[1] === '.') classes.push(m[2]);
    else if (m[1] === '#') id = m[2];
    else if (pos === 0) tag = m[2] === '*' ? null : m[2];
    else return null;
    pos = re.lastIndex;
  }
  return { tag, id, classes, weight: (id ? 100 : 0) + classes.length * 10 + (tag ? 1 : 0) };
}

/** A stylesheet's rules: comments out, at-rules skipped whole, each comma-separated selector a rule of its own. */
export function parseSheet(css: string): Sheet {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/@(?:import|charset|namespace)[^;{}]*;/gi, ' ');
  const sheet = emptySheet();
  let order = 0;
  let i = 0;
  const add = (map: Map<string, Rule[]>, key: string, r: Rule) => { const l = map.get(key); if (l) l.push(r); else map.set(key, [r]); };
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open === -1) break;
    const head = text.slice(i, open).trim();
    // The matching close, counting nested braces.
    let depth = 1;
    let j = open + 1;
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
    }
    const body = text.slice(open + 1, j - 1);
    i = j;
    if (head.startsWith('@')) continue;
    const decls = parseDeclarations(body);
    for (const sel of head.split(',')) {
      const parsed = simpleSelector(sel);
      if (!parsed) { if (sel.trim()) sheet.unsupported++; continue; }
      if (sheet.rules.length >= MAX_RULES) { sheet.dropped++; continue; }
      const rule: Rule = { ...parsed, order: order++, decls };
      sheet.rules.push(rule);
      // Filed under the most particular thing it names.
      if (rule.id) add(sheet.byId, rule.id, rule);
      else if (rule.classes.length) add(sheet.byClass, rule.classes[0], rule);
      else if (rule.tag) add(sheet.byTag, rule.tag, rule);
      else sheet.any.push(rule);
    }
  }
  return sheet;
}

/** The declarations the rules of `sheet` give an element, the heavier selector over the lighter and the later over the earlier. */
export function declarationsFor(sheet: Sheet, tag: string, id: string | undefined, classAttr: string | undefined): Record<string, string> {
  if (sheet.rules.length === 0) return {};
  const classes = classAttr ? classAttr.split(/\s+/).filter(Boolean) : [];
  const hits: Rule[] = [];
  const test = (r: Rule) => { if ((r.tag === null || r.tag === tag) && (r.id === null || r.id === id) && r.classes.every((c) => classes.includes(c))) hits.push(r); };
  if (id) for (const r of sheet.byId.get(id) ?? []) test(r);
  for (const c of classes) for (const r of sheet.byClass.get(c) ?? []) test(r);
  for (const r of sheet.byTag.get(tag) ?? []) test(r);
  for (const r of sheet.any) test(r);
  if (hits.length === 0) return {};
  // A rule filed under its first class is found once per class the element has in common; keep it once.
  const unique = [...new Set(hits)];
  unique.sort((a, b) => a.weight - b.weight || a.order - b.order);
  const out: Record<string, string> = {};
  for (const h of unique) Object.assign(out, h.decls);
  return out;
}
