// Mermaid out and in for the mind map (V1-PLAN §3, §9 D6; D2 and D3's rules,
// for `mindmap`).
//
// Out: a mind-map reading (mindmap.ts) said as Mermaid text, at tier 1:
//
//   mindmap
//       stroke_1(("Trip"))
//           stroke_2["Food"]
//               stroke_5["Pizza"]
//           stroke_3(("Travel"))
//
//   - **D2's rules hold.** Ids are the marks' own said safely (`mermaidIds`: a
//     node is its shape's stroke, or a ruled box's figure); every word is quoted
//     and escaped (`mermaidString`); writing nobody has read is "(unread
//     writing)", named in `unread` and the notes, never invented; the order is
//     the drawing's — never the log's.
//   - **The tree is the indentation**: the root first, then each node's
//     branches one level in, in the order a hand reads round the node (mindmap.ts:
//     clockwise from the top round the root, from the way it faces round any
//     other). A node's shape is the brackets round its words, MINDMAP_TABLE's:
//     `((…))` a circle, `[…]` a box. Mermaid draws its own tree from the text;
//     the board's positions are not written, so they are not kept.
//
// In: a reader for `mindmap` — the shapes it writes and the others Mermaid
// takes (a rounded box, a bang, a cloud, a hexagon, and words with no shape at
// all, each drawn as a circle or a box and said), with what it does not draw
// refused, each statement with its line and why (an icon, a class, a second
// root). The parse is drawn as ink the notation reads: the root at the middle
// and the tree fanned out round it in rings, each node a circle or a box with
// its words on its own ink, each branch a plain line from one edge to the next,
// bound at both ends at a place along the node's border (`along:mindmap`), and
// every mark a confident shape or wider than a letter. Read back, what does not
// read as written — a root other than the one written, a branch out of place —
// is said. Tier 1; nothing derived enters the log; wrap the call in
// `session.withTool` for one undo.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { magnetSites } from '../session/magnets';
import { alongIndex } from '../session/ports';
import { strokeFor } from '../session/synthesize';
import type { NotationReading } from './notation';
import type { MermaidLink, MermaidOptions, MermaidText } from './mermaid';
import { mermaidIds, mermaidString, naturalCompare, registerMermaidWriter, unescapeMermaid, UNREAD_WRITING } from './mermaid';
import type { DrawMermaidOptions, DrawnEnd, DrawnMermaid, MermaidLinkRead, MermaidNodeRead, MermaidRead, MermaidReader, MermaidRefusal } from './mermaid-in';
import { MERMAID_MAX_LINKS, MERMAID_MAX_NODES, MERMAID_TEXT_PX, registerMermaidReader } from './mermaid-in';
import type { MindMapReading, MindMapShape } from './mindmap';
import { MINDMAP_TABLE, mindMapPortsOf, readMindMap, shapeTokens } from './mindmap';
import { countWord, saidWriting, someWords } from './graph-kit';
import { besideContent, clamp, pointAtShare, scaled, shareAt, spanOf } from './state-mermaid';
import type { Span } from './state-mermaid';

const T = MINDMAP_TABLE;

// ===== Out: the text =====

/** Mermaid's preprocessing strips the last character of a line matching these, so a line that does has its colons written as entities too. */
const PREPROCESSED = /style|classDef/;

/** The mind map in Mermaid: `mindmap`, the tree as indentation, each node its id and its words in its shape's brackets. */
export function writeMindMap(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const r = reading as MindMapReading;
  const byId = new Map(r.symbols.map((s) => [s.id, s]));
  const idOf = mermaidIds(r.symbols.map((s) => s.id));
  const lines: string[] = [T.mermaid.header];
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const links: MermaidLink[] = [];
  const unread: { where: string; ids: string[] }[] = [];
  const unreadIds = new Set<string>();
  const blank: string[] = [];
  const branchOf = new Map(r.connectors.filter((k) => k.tree).map((k) => [k.to, k]));
  const walk = (id: string, level: number) => {
    const s = byId.get(id)!;
    const m = idOf.get(id)!;
    const w = saidWriting(s.name, opts);
    if (w.unread.length) {
      unread.push({ where: `the words of ${m}`, ids: w.unread });
      w.unread.forEach((x) => unreadIds.add(x));
    }
    if (w.text === null) blank.push(m);
    const { open, close } = shapeTokens(s.shape);
    lines.push(`${T.mermaid.indent.repeat(level)}${m}${open}${mermaidString(w.text ?? ' ', { colons: PREPROCESSED.test(m + (w.text ?? '')) })}${close}`);
    ids[m] = s.id;
    marks[m] = [...new Set(s.ids.length ? s.ids : [s.id])].sort(naturalCompare);
    const parentId = s.parent;
    if (parentId) {
      const k = branchOf.get(id);
      if (k) links.push({ index: links.length, id: k.id, ids: [k.id, ...[...new Set(k.ids)].filter((x) => x !== k.id).sort(naturalCompare)], from: idOf.get(parentId)!, to: m });
    }
    for (const kid of s.children) walk(kid, level + 1);
  };
  walk(r.root, 1);

  // What the text does not say as drawn.
  const notes: string[] = [];
  if (unread.length) {
    const n = unread.reduce((a, u) => a + u.ids.length, 0);
    notes.push(`${n === 1 ? 'one piece of writing has' : `${countWord(n)} pieces of writing have`} not been read, so ${n === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}": ${someWords(unread.map((u) => u.where), 6)}`);
  }
  if (blank.length) notes.push(`${blank.length === 1 ? 'one node has' : `${countWord(blank.length)} nodes have`} no word in ${blank.length === 1 ? 'it' : 'them'} and ${blank.length === 1 ? 'is' : 'are'} written blank: ${someWords(blank, 6)}`);
  if (r.loops) notes.push(`${r.loops === 1 ? 'a line closes' : `${countWord(r.loops)} lines close`} a loop, which a mind map's tree has not — left out`);
  if (r.headed) notes.push(`${r.headed === 1 ? 'a line has' : `${countWord(r.headed)} lines have`} a head, which a branch has not — ignored`);
  if (r.written) notes.push(`${r.written === 1 ? 'a line has' : `${countWord(r.written)} lines have`} writing beside ${r.written === 1 ? 'it' : 'them'}, which Mermaid's mind map has no place for — left out`);
  if (r.classLike) notes.push(`${r.classLike === 1 ? 'a box has' : `${countWord(r.classLike)} boxes have`} compartments, as a class does — left out`);
  const saidIds = new Set<string>([...r.symbols.flatMap((s) => [s.id, ...s.ids, ...s.name.ids]), ...r.connectors.filter((k) => k.tree).flatMap((k) => k.ids)]);
  const alone = r.labels.filter((l) => !saidIds.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing that labels nothing in the diagram is left out: ${someWords(alone, 6)}`);
  const left = Object.keys(r.roles).filter((id) => !saidIds.has(id) && !alone.includes(id)).sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${countWord(left.length)} marks`} the diagram has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${someWords(left.map((id) => `${id} (${r.roles[id]})`), 8)}`);

  return {
    text: lines.join('\n') + '\n',
    notation: reading.notation,
    diagram: T.mermaid.header,
    ids,
    marks,
    links,
    unread: [...unreadIds].sort(naturalCompare),
    notes,
  };
}

registerMermaidWriter(T.notation, writeMindMap);

// ===== In: reading a mindmap text =====

/** A node as the text gives it. */
export interface MindMapNodeRead extends MermaidNodeRead {
  symbol: 'root' | 'node';
  /** How it is drawn: a circle for `((…))` and its kin, a box for the rest. */
  drawn: MindMapShape;
  /** Its distance from the root in the text's indentation. */
  depth: number;
  parent?: string;
}

/** A branch as the text gives it: the node above to the node nested under it. */
export type MindMapLinkRead = MermaidLinkRead;

/** A mindmap text as read, before anything is drawn. */
export interface MindMapDiagramRead extends MermaidRead {
  nodes: MindMapNodeRead[];
  links: MindMapLinkRead[];
}

/** The shapes Mermaid brackets a node with, tried in this order: the id, then the brackets round the words. */
const ID = String.raw`([^\s()\[\]{}]*)`;
const SHAPE_FORMS: { re: RegExp; drawn: MindMapShape; shape: string; note?: string }[] = [
  { re: new RegExp(`^${ID}\\(\\((.*)\\)\\)$`), drawn: 'circle', shape: '(())' },
  { re: new RegExp(`^${ID}\\)\\)(.*)\\(\\($`), drawn: 'circle', shape: ')) ((', note: 'a bang is drawn as a circle' },
  { re: new RegExp(`^${ID}\\{\\{(.*)\\}\\}$`), drawn: 'box', shape: '{{}}', note: 'a hexagon is drawn as a box' },
  { re: new RegExp(`^${ID}\\[(.*)\\]$`), drawn: 'box', shape: '[]' },
  { re: new RegExp(`^${ID}\\((.*)\\)$`), drawn: 'box', shape: '()', note: 'a rounded box is drawn as a box' },
  { re: new RegExp(`^${ID}\\)(.*)\\($`), drawn: 'circle', shape: ') (', note: 'a cloud is drawn as a circle' },
];

/** Statements the reader does not draw, by their first word, and why. */
const NOT_DRAWN: [RegExp, string][] = [
  [/^::icon\b/, 'an icon is not drawn'],
  [/^:::/, 'a class is not drawn: the board draws in its hand’s own colour'],
  [/^(classDef|class|style|cssClass)\b/, 'styling: the board draws in its hand’s own colour'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
  [/^title\b/i, 'a title is not drawn yet'],
];

const wordOf = (raw: string) => unescapeMermaid(raw.trim()).replace(/[ \t]+/g, ' ').trim();

/** Read a mind-map text into its nodes and branches. Never throws. */
export function readMindMapText(text: string): MindMapDiagramRead {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const notes = new Set<string>();
  const refused: MermaidRefusal[] = [];
  const nodes: MindMapNodeRead[] = [];
  const links: MindMapLinkRead[] = [];
  const taken = new Set<string>();
  let keyword = '';
  let header: number | null = null;
  const stack: { indent: number; node: MindMapNodeRead }[] = [];
  let skipping: number | null = null;
  const unique = (id: string) => {
    let k = id, n = 2;
    while (taken.has(k)) k = `${id}~${n++}`;
    taken.add(k);
    return k;
  };

  for (let i = 0; i < all.length; i++) {
    const n = i + 1;
    const raw = all[i];
    let t = raw.trim();
    if (!t) continue;
    if (t.startsWith('%%{')) {
      refused.push({ line: n, text: t, reason: 'a directive configures mermaid.js’s own rendering — nothing on the board takes it' });
      continue;
    }
    if (t.startsWith('%%')) continue;
    if (header === null) {
      if (t === '---') {
        const close = all.findIndex((l, k) => k > i && l.trim() === '---');
        const last = close >= 0 ? close : all.length - 1;
        refused.push({ line: n, text: '---', reason: `front matter (lines ${n}–${last + 1}) configures mermaid.js — nothing on the board takes it` });
        i = last;
        continue;
      }
      const m = /^(mindmap)\b\s*(.*)$/.exec(t);
      header = n;
      keyword = m ? m[1] : (/^[A-Za-z][\w-]*/.exec(t)?.[0] ?? '');
      if (!m) refused.push({ line: n, text: t, reason: 'a mind map opens with “mindmap”' });
      else if (m[2]) refused.push({ line: n, text: m[2], reason: 'nothing is read after the header on its own line' });
      continue;
    }
    const indent = [...raw.slice(0, raw.length - raw.trimStart().length)].reduce((a, ch) => a + (ch === '\t' ? 4 : 1), 0);
    if (skipping !== null && indent > skipping) {
      refused.push({ line: n, text: t, reason: 'inside a second root: a mind map has one' });
      continue;
    }
    skipping = null;
    const not = NOT_DRAWN.find(([re]) => re.test(t));
    if (not) {
      refused.push({ line: n, text: t, reason: not[1] });
      continue;
    }
    // A class after the words: `Node:::urgent`.
    const cls = /^(.*?):::\S+$/.exec(t);
    if (cls) {
      refused.push({ line: n, text: t, reason: 'a class is not drawn: the board draws in its hand’s own colour' });
      t = cls[1].trim();
    }
    // The node: an optional id, then the words in their brackets — or words alone.
    let id: string, words: string, drawn: MindMapShape, shape: string;
    const form = SHAPE_FORMS.map((f) => ({ f, m: f.re.exec(t) })).find((x) => x.m);
    if (form) {
      id = form.m![1];
      words = wordOf(form.m![2].trim().startsWith('"') ? form.m![2].trim() : form.m![2]);
      drawn = form.f.drawn;
      shape = form.f.shape;
      if (form.f.note) notes.add(form.f.note);
    } else {
      id = '';
      words = wordOf(t);
      drawn = 'box';
      shape = '';
      notes.add('a node with no shape is drawn as a box');
    }
    const at = unique(id || words.replace(/\s+/g, ' ') || `n${n}`);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    if (!parent && nodes.length) {
      refused.push({ line: n, text: t, reason: 'a second root: a mind map has one' });
      skipping = indent;
      taken.delete(at);
      continue;
    }
    const node: MindMapNodeRead = { id: at, line: n, symbol: parent ? 'node' : 'root', shape, text: words, drawn, depth: parent ? parent.depth + 1 : 0, ...(parent ? { parent: parent.id } : {}) };
    nodes.push(node);
    stack.push({ indent, node });
    if (parent) links.push({ index: links.length, line: n, from: parent.id, to: node.id, head: 'none', written: '' });
  }
  if (header === null) refused.push({ line: 1, text: '', reason: 'nothing to read: a mind map opens with “mindmap”' });
  return { keyword, notation: keyword ? T.notation : null, direction: 'TD', nodes, links, notes: [...notes], refused: refused.sort((x, y) => x.line - y.line) };
}

// ===== In: drawing a read mind map =====

/** A character's width, and the text's line, in text sizes (D3's). */
const CHAR = 0.6;
const LINE = 1.4;
/** A circle: at least this across and at most, in text sizes; a box: this wide and this tall for one line. */
const CIRCLE_MIN = 6;
const CIRCLE_MAX = 16;
const BOX_MIN = 7;
const BOX_MAX = 18;
const BOX_H = 3.4;
/** The gap between one ring and the next, and between neighbours on a ring, in text sizes. */
const RING_GAP = 4;
const SIBLING_GAP = 2.5;
/** No subtree fans over more than this much of the circle round its parent, in degrees: a lone branch stands out, and does not wrap round the map. */
const SPAN_CAP_DEG = 130;

const DEG = Math.PI / 180;

/** A branch as drawn — D3's `DrawnLink`, with what the text wrote. */
export interface DrawnMindMapLink {
  index: number;
  from: string;
  to: string;
  id: string;
  ids: string[];
  written: '';
  route: 'straight';
  start: DrawnEnd;
  end: DrawnEnd;
  /** Whether each end is bound. */
  bound: [boolean, boolean];
}

/**
 * Where each node of a tree stands about the root, as an angle clockwise from
 * the top and how far out: a node's subtree gets a share of its parent's wedge
 * in proportion to its leaves, capped, the slack shared as gaps, and its
 * children fan out over the wedge in the order written — so, read back, the
 * order round the root, and round any node from the way it faces, is the
 * order of the text.
 */
function fan(tree: ReadonlyMap<string, readonly string[]>, root: string): Map<string, number> {
  const leaves = new Map<string, number>();
  const count = (id: string): number => {
    const kids = tree.get(id) ?? [];
    const n = kids.length ? kids.reduce((a, k) => a + count(k), 0) : 1;
    leaves.set(id, n);
    return n;
  };
  count(root);
  const angle = new Map<string, number>();
  const place = (id: string, from: number, span: number) => {
    const kids = tree.get(id) ?? [];
    if (!kids.length) return;
    const total = kids.reduce((a, k) => a + leaves.get(k)!, 0);
    const shares = kids.map((k) => Math.min((span * leaves.get(k)!) / total, SPAN_CAP_DEG * DEG));
    const gap = (span - shares.reduce((a, x) => a + x, 0)) / kids.length;
    let at = from + gap / 2;
    kids.forEach((k, i) => {
      angle.set(k, at + shares[i] / 2);
      place(k, at, shares[i]);
      at += shares[i] + gap;
    });
  };
  place(root, 0, 2 * Math.PI);
  return angle;
}

/** Draw a read mind map. */
function drawMindMapRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const r = read as MindMapDiagramRead;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX * scale;
  const notes = [...r.notes];
  const refused = [...r.refused];
  let t = opts.at;
  const next = () => t++;
  const hand = (p: Point) => scaled(p, 1 / scale);
  const world = (p: Point) => scaled(p, scale);

  const nodes = r.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((x) => x.id));
  if (r.nodes.length > nodes.length) notes.push(`the text holds ${r.nodes.length} nodes and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn`);
  const links = r.links.filter((l) => kept.has(l.from) && kept.has(l.to)).slice(0, MERMAID_MAX_LINKS);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no node');
    return { notation: r.notation, direction: r.direction, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }
  const rootNode = nodes[0];
  const tree = new Map<string, string[]>(nodes.map((x) => [x.id, []]));
  for (const l of links) tree.get(l.from)!.push(l.to);

  // Sizes, in the hand's space: a circle as wide as its words, a box likewise.
  const chars = (s: string) => Math.max(...s.split('\n').map((x) => [...x].length), 0);
  const size = new Map(
    nodes.map((x) => {
      const lines = Math.max(1, x.text.split('\n').length);
      if (x.drawn === 'circle') {
        const d = clamp(chars(x.text) * CHAR + 4, CIRCLE_MIN, CIRCLE_MAX) * U;
        return [x.id, { w: d, h: d }] as const;
      }
      return [x.id, { w: clamp(chars(x.text) * CHAR + 3, BOX_MIN, BOX_MAX) * U, h: Math.max(BOX_H, lines * LINE + 2) * U }] as const;
    })
  );
  const big = (id: string) => Math.max(size.get(id)!.w, size.get(id)!.h);

  // Where they stand: angles from the fan, rings out from the root far enough apart for what is on them.
  const angle = fan(tree, rootNode.id);
  const byDepth = new Map<number, MindMapNodeRead[]>();
  for (const x of nodes) (byDepth.get(x.depth) ?? byDepth.set(x.depth, []).get(x.depth)!).push(x);
  const radius = new Map<number, number>([[0, 0]]);
  const half = (d: number) => Math.max(...(byDepth.get(d) ?? []).map((x) => big(x.id) / 2), 0);
  for (let d = 1; d <= Math.max(...byDepth.keys()); d++) {
    const level = (byDepth.get(d) ?? []).sort((a, b) => angle.get(a.id)! - angle.get(b.id)!);
    let R = radius.get(d - 1)! + half(d - 1) + half(d) + RING_GAP * U;
    for (let i = 1; i < level.length; i++) {
      const gap = angle.get(level[i].id)! - angle.get(level[i - 1].id)!;
      if (gap > 1e-6) R = Math.max(R, ((big(level[i].id) + big(level[i - 1].id)) / 2 + SIBLING_GAP * U) / gap);
    }
    radius.set(d, R);
  }
  const centre = new Map<string, Point>();
  for (const x of nodes) {
    const R = radius.get(x.depth) ?? 0, a = angle.get(x.id) ?? 0;
    centre.set(x.id, { x: R * Math.sin(a), y: -R * Math.cos(a) });
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const x of nodes) {
    const c = centre.get(x.id)!, z = size.get(x.id)!;
    minX = Math.min(minX, c.x - z.w / 2);
    minY = Math.min(minY, c.y - z.h / 2);
    maxX = Math.max(maxX, c.x + z.w / 2);
    maxY = Math.max(maxY, c.y + z.h / 2);
  }
  const origin = opts.origin ?? besideContent(session, BOX_MIN * U);
  const shift = { x: origin.x - minX, y: origin.y - minY };
  const at = (id: string): Point => ({ x: centre.get(id)!.x + shift.x, y: centre.get(id)!.y + shift.y });

  // The nodes, each a shape with its words on its own ink.
  const ids: Record<string, string> = {};
  const drawnMarks: string[] = [];
  const placeholder: string[] = [];
  for (const x of nodes) {
    const c = at(x.id), z = size.get(x.id)!;
    const shape = session.addStroke(strokeFor({ shape: x.drawn === 'circle' ? 'circle' : 'rectangle', x: c.x - z.w / 2, y: c.y - z.h / 2, w: z.w, h: z.h })!, next(), pid, scale, { content: true });
    ids[x.id] = shape;
    drawnMarks.push(shape);
    const words = x.text.trim();
    if (words) session.label({ nodeId: shape, text: words, participantId: pid, at: next() });
    if (words === UNREAD_WRITING) placeholder.push(x.id);
  }

  // Where a branch meets a node: the edge along the line between the centres — then bound: a site the mark offers there, else a place along its border.
  const st = () => session.getState();
  const spans = new Map<string, Span | null>();
  const spanOfNode = (id: string): Span | null => {
    if (!spans.has(id)) {
      const node = st().nodes.get(ids[id]);
      const port = node ? mindMapPortsOf(node, st().nodes)?.ports[0] : undefined;
      spans.set(id, port?.along && port.along.length >= 3 ? spanOf(port.along) : null);
    }
    return spans.get(id)!;
  };
  const edgeToward = (id: string, other: string): Point => {
    const c = at(id), o = at(other), z = size.get(id)!;
    const len = Math.hypot(o.x - c.x, o.y - c.y) || 1;
    const u = { x: (o.x - c.x) / len, y: (o.y - c.y) / len };
    const k = nodes.find((x) => x.id === id)!.drawn === 'circle' ? z.w / 2 : Math.min(Math.abs(u.x) > 1e-9 ? z.w / 2 / Math.abs(u.x) : Infinity, Math.abs(u.y) > 1e-9 ? z.h / 2 / Math.abs(u.y) : Infinity);
    return { x: c.x + u.x * k, y: c.y + u.y * k };
  };
  const near = (id: string, want: Point, tol: number) => {
    const node = st().nodes.get(ids[id])!;
    let best: { kind: string; index: number; point: Point; d: number } | null = null;
    for (const site of magnetSites(node, st().nodes)) {
      if (site.kind.startsWith('port:') || site.kind.startsWith('along:')) continue;
      const d = Math.hypot(site.point.x - want.x, site.point.y - want.y);
      if (d <= tol && (!best || d < best.d)) best = { kind: site.kind, index: site.index, point: { ...site.point }, d };
    }
    return best;
  };
  const endAt = (id: string, want: Point, port: string): { end: DrawnEnd; bound: boolean } => {
    const nodeId = ids[id];
    const site = near(id, want, 0.3 * U);
    if (site) return { end: { nodeId, site: { kind: site.kind, index: site.index }, of: 'mark', port, point: site.point }, bound: true };
    const span = spanOfNode(id);
    if (span) {
      const share = shareAt(span, want);
      return { end: { nodeId, site: { kind: `along:${T.notation}`, index: alongIndex(0, share) }, of: 'notation', port, point: pointAtShare(span, share) }, bound: true };
    }
    return { end: { nodeId, site: { kind: '', index: 0 }, of: 'mark', port, point: want }, bound: false };
  };

  // The branches, in the text's order: a plain line, bound at both ends.
  const drawn: DrawnMindMapLink[] = [];
  const unbound: string[] = [];
  for (const l of links) {
    const a = endAt(l.from, edgeToward(l.from, l.to), 'out'), z = endAt(l.to, edgeToward(l.to, l.from), 'in');
    const P = a.end.point, Q = z.end.point;
    const id = session.addStroke(strokeFor({ shape: 'line', from: hand(P), to: hand(Q) })!.map(world), next(), pid, scale, { content: true });
    for (const [end, e] of [['start', a], ['end', z]] as const) if (e.bound) session.bind({ strokeId: id, nodeId: e.end.nodeId, site: e.end.site, end, at: next(), participantId: pid });
    if (!a.bound || !z.bound) unbound.push(`${l.from} — ${l.to}`);
    drawnMarks.push(id);
    drawn.push({ index: l.index, from: l.from, to: l.to, id, ids: [id], written: '', route: 'straight', start: a.end, end: z.end, bound: [a.bound, z.bound] });
  }

  // Read back, as the board will read it: every node one, the root the one written, every branch between the nodes written and in their order.
  const back = readMindMap(session.getState(), drawnMarks);
  const nodeFor = (id: string) => back?.symbols.find((s) => s.ids.includes(ids[id]));
  const lost = nodes.filter((x) => !nodeFor(x.id)).map((x) => x.id);
  if (lost.length) notes.push(`read back, ${someWords(lost)} ${lost.length === 1 ? 'does' : 'do'} not read as a node`);
  else if (back) {
    if (nodeFor(rootNode.id)?.symbol !== 'root') notes.push(`read back, the centre of the map is ${back.symbols.find((s) => s.symbol === 'root')?.name.text ?? back.root}, not ${rootNode.id}: a mind map is read from its most central node, so this tree is rooted there`);
    const misread = links.filter((l) => nodeFor(l.to)?.parent !== nodeFor(l.from)?.id);
    if (misread.length) notes.push(`read back, ${misread.length === 1 ? 'a branch does' : `${countWord(misread.length)} branches do`} not hang from the node written: ${someWords(misread.map((l) => `${l.from} — ${l.to}`))}`);
    else {
      const wrongOrder = nodes.filter((x) => {
        const got = nodeFor(x.id)?.children ?? [];
        const want = (tree.get(x.id) ?? []).map((k) => nodeFor(k)?.id);
        return got.length === want.length && got.some((g, i) => g !== want[i]);
      });
      if (wrongOrder.length) notes.push(`read back, the branches of ${someWords(wrongOrder.map((x) => x.id))} come in another order than written`);
    }
  }
  if (unbound.length) notes.push(`${unbound.length === 1 ? 'a branch end has' : 'branch ends have'} no site to be tied to and ${unbound.length === 1 ? 'is' : 'are'} drawn free: ${someWords(unbound)}`);
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${someWords(placeholder)}`);

  const bounds: Bounds = { minX: origin.x, minY: origin.y, maxX: origin.x + (maxX - minX), maxY: origin.y + (maxY - minY) };
  return {
    notation: r.notation,
    direction: r.direction,
    ids,
    links: drawn.map((d) => ({ ...d, drawn: '' })) as unknown as DrawnMermaid['links'],
    notes,
    refused,
    bounds,
    lastAt: t - 1,
  };
}

/** The mind map's reader: `mindmap`. */
export const MINDMAP_READER: MermaidReader = {
  notation: T.notation,
  read: readMindMapText,
  draw: drawMindMapRead,
};

registerMermaidReader('mindmap', MINDMAP_READER);
