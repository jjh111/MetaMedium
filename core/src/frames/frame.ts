// Frames: a selection of artifacts wired together, by reference.
//
// A frame is a named artifact whose members are other artifacts, wherever
// they live, and whose CONNECTIONS say which member's output feeds which
// member's input: a drawn slider's value into a script's tunable, a word into
// a page's slot, a slider into a behaviour's weight. Nothing is copied; the
// frame references its members and the engine writes the harness — here, a
// plain resolution: read every connection's source value and substitute it
// into its target, so what the frame's members render and run is the wired
// version (ARCHITECTURE-v8 §15).
//
// Interfaces are read, not declared. A script's tunables are its top-level
// numeric constants; a control's port is its value; a word's is its text; a
// page's slots are its regions; a behaviour's are its speed and each term's
// weight. Connections are offered by type — a number to a number, words to
// a slot — ranked by how the ports are named, with the reasoning attached.
//
// The drawn slider is the first drawn control: a line with a dot on it. Its
// VALUE is where the dot sits along the line, read from the ink where it
// stands now — so dragging the dot is setting the value, and the `move` that
// records the drag is the only event there is (I2: nothing but reps and
// events, and the drawing is the program).

import type { Point } from '../types';
import type { MMNode } from '../session/nodes';
import { wordOf, boundsOf, strokePointsOf, fingerprintOf, resemblances, blessedBehaviourOf, transcriptOf } from '../session/nodes';
import { functionsOf } from '../kinds/address';

export interface Port {
  /** `value`, `param:NAME`, `key:a.b`, `slot:r1`, `speed`, `term:0`, `words`. */
  id: string;
  label: string;
  type: 'number' | 'text';
  /** For a number: the range it makes sense in, when known. */
  min?: number;
  max?: number;
  /** Its value now, when it has one. */
  value?: number | string;
}

export interface Interface {
  offers: Port[];
  accepts: Port[];
}

export interface Connection {
  from: { id: string; port: string };
  to: { id: string; port: string };
  reasoning?: string;
}

export interface FrameRep {
  members: string[];
  connections: Connection[];
}

// ===== The drawn slider ======================================================

/** Where `p` falls along the segment a→b, 0 at a, 1 at b, clamped; and how far off the line it is. */
export function alongSegment(a: Point, b: Point, p: Point): { t: number; off: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return { t: 0, off: Math.hypot(p.x - a.x, p.y - a.y) };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const q = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, off: Math.hypot(p.x - q.x, p.y - q.y) };
}

function centreOf(node: MMNode): Point | null {
  const b = boundsOf(node);
  return b ? { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 } : null;
}

function endsOf(node: MMNode): { a: Point; b: Point } | null {
  const pts = strokePointsOf(node);
  if (!pts || pts.length < 2) return null;
  return { a: pts[0], b: pts[pts.length - 1] };
}

function topShape(node: MMNode): string | undefined {
  return resemblances(node)[0]?.to.replace(/^type:/, '');
}

/**
 * A slider is a line and a dot (or a small circle) whose centre sits on it.
 * Returns the track, the knob and the value, or null. `scale` is the hand's:
 * the knob may sit off the line by a hand's width, not a world's.
 */
export function sliderOf(ids: readonly string[], nodes: ReadonlyMap<string, MMNode>, scale = 1): { track: string; knob: string; t: number; reasoning: string } | null {
  const members = ids.map((id) => nodes.get(id)).filter((n): n is MMNode => !!n);
  const tracks = members.filter((n) => topShape(n) === 'line' || topShape(n) === 'arrow');
  const knobs = members.filter((n) => {
    const s = topShape(n);
    if (s === 'dot') return true;
    if (s !== 'circle') return false;
    const fp = fingerprintOf(n);
    return !!fp && fp.size / scale <= 40;
  });
  let best: { track: string; knob: string; t: number; off: number } | null = null;
  for (const tr of tracks) {
    const ends = endsOf(tr);
    if (!ends) continue;
    for (const k of knobs) {
      const c = centreOf(k);
      if (!c) continue;
      const { t, off } = alongSegment(ends.a, ends.b, c);
      const trackLen = Math.hypot(ends.b.x - ends.a.x, ends.b.y - ends.a.y);
      if (off > Math.max(12 * scale, trackLen * 0.12)) continue;
      if (!best || off < best.off) best = { track: tr.id, knob: k.id, t, off };
    }
  }
  if (!best) return null;
  return { ...best, reasoning: `the knob sits ${Math.round(best.t * 100)}% along the track, ${Math.round(best.off)}px off it` };
}

export interface ControlData {
  min: number;
  max: number;
  label?: string;
}

/** A control artifact's value now: the knob's place along the track, in the control's range. */
export function controlOf(artifact: MMNode, nodes: ReadonlyMap<string, MMNode>): { value: number; t: number; min: number; max: number; reasoning: string } | null {
  const code = [...artifact.reps].reverse().find((r) => r.modality === 'code' && (r.data as { kind?: string }).kind === 'control');
  if (!code) return null;
  let data: ControlData = { min: 0, max: 1 };
  try { data = { ...data, ...(JSON.parse((code.data as { code: string }).code) as Partial<ControlData>) }; } catch { /* the defaults */ }
  const members = artifact.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
  const s = sliderOf(members, nodes);
  if (!s) return null;
  const value = data.min + (data.max - data.min) * s.t;
  return { value, t: s.t, min: data.min, max: data.max, reasoning: s.reasoning };
}

// ===== Interfaces ============================================================

const PARAM = /^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*;?/;

/** A script's tunables: top-level numeric constants, by name, with their values. */
export function paramsOf(source: string): { name: string; value: number; start: number; end: number }[] {
  const out: { name: string; value: number; start: number; end: number }[] = [];
  for (const f of functionsOf(source)) {
    const text = source.slice(f.start, f.end);
    const m = PARAM.exec(text);
    if (!m) continue;
    const at = text.indexOf(m[2], m[0].indexOf('=')) + f.start;
    out.push({ name: m[1], value: Number(m[2]), start: at, end: at + m[2].length });
  }
  return out;
}

/** The source with tunables set: the literal replaced in place, nothing else touched. */
export function withParams(source: string, values: Record<string, number>): string {
  const params = paramsOf(source).filter((p) => p.name in values).sort((a, b) => b.start - a.start);
  let out = source;
  for (const p of params) out = out.slice(0, p.start) + String(values[p.name]) + out.slice(p.end);
  return out;
}

/** The regions a page carries — every `data-region` in its markup, in order, once each. */
export function slotsIn(html: string): string[] {
  const out: string[] = [];
  const re = /data-region="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

function newestCode(node: MMNode): { kind: string; code: string } | null {
  const r = [...node.reps].reverse().find((x) => x.modality === 'code');
  if (!r) return null;
  const d = r.data as { kind?: string; language?: string; code: string };
  return { kind: d.kind ?? d.language ?? 'html', code: d.code };
}

/** What an artifact offers and accepts, read from what it is. */
export function interfacesOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Interface {
  const offers: Port[] = [];
  const accepts: Port[] = [];
  const code = newestCode(node);
  const name = wordOf(node);
  if (code?.kind === 'control') {
    const c = controlOf(node, nodes);
    if (c) offers.push({ id: 'value', label: name ?? 'value', type: 'number', min: c.min, max: c.max, value: c.value });
  } else if (code?.kind === 'js') {
    for (const p of paramsOf(code.code)) accepts.push({ id: `param:${p.name}`, label: p.name, type: 'number', value: p.value });
  } else if (code?.kind === 'json') {
    try {
      const obj = JSON.parse(code.code) as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number') accepts.push({ id: `key:${k}`, label: k, type: 'number', value: v });
        else if (typeof v === 'string') accepts.push({ id: `key:${k}`, label: k, type: 'text', value: v });
      }
    } catch { /* not an object: nothing to wire */ }
  } else if (code?.kind === 'html') {
    for (const id of slotsIn(code.code)) accepts.push({ id: `slot:${id}`, label: id, type: 'text' });
  } else if (code?.kind === 'text') {
    offers.push({ id: 'words', label: name ?? 'words', type: 'text', value: code.code });
  }
  const said = transcriptOf(node);
  if (said && !offers.some((o) => o.id === 'words')) offers.push({ id: 'words', label: said, type: 'text', value: said });
  const b = blessedBehaviourOf(node);
  if (b) {
    accepts.push({ id: 'speed', label: 'speed', type: 'number', min: 10, max: 600, value: (b.speed as number | undefined) ?? 120 });
    (b.terms as { verb: string; target?: string; weight: number }[]).forEach((t, i) => {
      accepts.push({ id: `term:${i}`, label: `${t.verb}${t.target ? ' ' + t.target : ''} weight`, type: 'number', min: 0, max: 2, value: t.weight });
    });
  }
  return { offers, accepts };
}

function similarity(a: string, b: string): number {
  const x = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), y = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  const wa = new Set(x.split(' ')), wb = new Set(y.split(' '));
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared ? (0.6 * shared) / Math.max(wa.size, wb.size) : 0;
}

/**
 * Every connection the members' interfaces allow, best first. A number feeds
 * a number, words feed a slot or a text key; a port whose name matches the
 * source's outranks one that merely fits.
 */
export function connectionsFor(ids: readonly string[], nodes: ReadonlyMap<string, MMNode>): (Connection & { score: number })[] {
  const ifaces = ids.map((id) => ({ id, node: nodes.get(id), iface: nodes.get(id) ? interfacesOf(nodes.get(id)!, nodes) : { offers: [], accepts: [] } }));
  const out: (Connection & { score: number })[] = [];
  for (const src of ifaces) {
    for (const o of src.iface.offers) {
      for (const dst of ifaces) {
        if (dst.id === src.id) continue;
        for (const a of dst.iface.accepts) {
          if (a.type !== o.type) continue;
          const named = similarity(o.label, a.label);
          const score = 0.5 + 0.5 * named;
          const why = named > 0
            ? `${o.label} → ${a.label}: the names match`
            : `${o.label} → ${a.label}: a ${o.type} for a ${o.type}`;
          out.push({ from: { id: src.id, port: o.id }, to: { id: dst.id, port: a.id }, reasoning: why, score });
        }
      }
    }
  }
  return out.sort((p, q) => q.score - p.score);
}

// ===== Resolution: the harness the engine writes ============================

export interface Resolved {
  /** Per member: its code with the wired values substituted (js, json, html). */
  code: Record<string, string>;
  /** Per member with a behaviour: the wired speed and weights. */
  behaviour: Record<string, { speed?: number; weights: Record<number, number> }>;
  /** What each connection carried, for the panel. */
  carried: { connection: Connection; value: number | string | undefined }[];
}

function portValue(node: MMNode, port: string, nodes: ReadonlyMap<string, MMNode>): number | string | undefined {
  const iface = interfacesOf(node, nodes);
  return iface.offers.find((o) => o.id === port)?.value;
}

/** Every connection read and applied. Pure: nothing is written back; the surface renders and runs what comes out. */
export function resolveFrame(frame: FrameRep, nodes: ReadonlyMap<string, MMNode>): Resolved {
  const code: Record<string, string> = {};
  const behaviour: Record<string, { speed?: number; weights: Record<number, number> }> = {};
  const carried: Resolved['carried'] = [];
  const params: Record<string, Record<string, number>> = {};
  const keys: Record<string, Record<string, number | string>> = {};
  const slots: Record<string, Record<string, string>> = {};
  for (const c of frame.connections) {
    const src = nodes.get(c.from.id), dst = nodes.get(c.to.id);
    if (!src || !dst) continue;
    const raw = portValue(src, c.from.port, nodes);
    // A knob's place is a real number; what lands in source should read like one a hand would type.
    const value = typeof raw === 'number' ? +raw.toFixed(4) : raw;
    carried.push({ connection: c, value });
    if (value === undefined) continue;
    const [kind, name] = c.to.port.split(':');
    if (kind === 'param' && typeof value === 'number') (params[dst.id] ??= {})[name] = value;
    else if (kind === 'key') (keys[dst.id] ??= {})[name] = value;
    else if (kind === 'slot') (slots[dst.id] ??= {})[name] = String(value);
    else if (kind === 'speed' && typeof value === 'number') (behaviour[dst.id] ??= { weights: {} }).speed = value;
    else if (kind === 'term' && typeof value === 'number') (behaviour[dst.id] ??= { weights: {} }).weights[Number(name)] = value;
  }
  for (const id of frame.members) {
    const node = nodes.get(id);
    const nc = node && newestCode(node);
    if (!node || !nc) continue;
    if (nc.kind === 'js' && params[id]) code[id] = withParams(nc.code, params[id]);
    if (nc.kind === 'json' && keys[id]) {
      try { code[id] = JSON.stringify({ ...(JSON.parse(nc.code) as object), ...keys[id] }, null, 2); } catch { /* leave it */ }
    }
    if (nc.kind === 'html' && slots[id]) {
      let html = nc.code;
      for (const [region, text] of Object.entries(slots[id])) {
        // The region element's content becomes the words; its tag and attributes stay.
        html = html.replace(new RegExp(`(<([a-z0-9]+)[^>]*data-region="${region}"[^>]*>)([\\s\\S]*?)(</\\2>)`, 'i'), (_m, open, _tag, _inner, close) => `${open}${escapeHtml(text)}${close}`);
      }
      code[id] = html;
    }
  }
  return { code, behaviour, carried };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

/** "slider → speed, title → r1" — the frame's wiring in words. */
export function describeFrame(frame: FrameRep, nodes: ReadonlyMap<string, MMNode>): string {
  const name = (id: string) => wordOf(nodes.get(id)!) ?? id;
  const wires = frame.connections.map((c) => `${name(c.from.id)}.${c.from.port} → ${name(c.to.id)}.${c.to.port}`);
  return `${frame.members.length} member${frame.members.length === 1 ? '' : 's'}` + (wires.length ? `; ${wires.join(', ')}` : '; no connections');
}

// ===== Export: the frame as a folder ========================================

const EXT: Record<string, string> = { html: 'html', js: 'js', json: 'json', svg: 'svg', md: 'md', text: 'txt', control: 'json' };

/**
 * The frame collapsed to files: each member's WIRED code under its own name,
 * `frame.json` with the members and connections, and — when a page is among
 * the members — `index.html`, so the folder opens anywhere.
 */
export function exportFrame(frameName: string, frame: FrameRep, nodes: ReadonlyMap<string, MMNode>): Record<string, string> {
  const resolved = resolveFrame(frame, nodes);
  const files: Record<string, string> = {};
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member';
  const used = new Map<string, number>();
  const members: { id: string; file: string; kind: string }[] = [];
  for (const id of frame.members) {
    const node = nodes.get(id);
    const nc = node && newestCode(node);
    if (!node) continue;
    const kind = nc?.kind ?? 'control';
    const base = safe(wordOf(node) ?? id);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const file = `${base}${n > 1 ? '-' + n : ''}.${EXT[kind] ?? 'txt'}`;
    let content = resolved.code[id] ?? nc?.code ?? '';
    if (kind === 'control') {
      const c = controlOf(node, nodes);
      content = JSON.stringify({ value: c?.value ?? null, min: c?.min ?? 0, max: c?.max ?? 1 }, null, 2);
    }
    files[file] = content;
    members.push({ id, file, kind });
    if (kind === 'html' && !files['index.html']) files['index.html'] = content;
  }
  files['frame.json'] = JSON.stringify({ name: frameName, members, connections: frame.connections }, null, 2);
  return files;
}
