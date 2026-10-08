// TikZ-Feynman out (MATHS-SPEC §8, M27): a Feynman diagram read from ink,
// written as the `\feynmandiagram` a physicist puts in a paper.
//
// TikZ-Feynman (Ellis, 2017) draws a diagram from a graph: vertices named,
// edges between them with a style — `fermion` (an arrow along the edge as
// written), `photon`, `boson`, `charged boson`, `gluon`, `scalar`, `plain` —
// a particle's name on an external vertex (`particle=`) and on an internal
// edge (`edge label=`), and a key that turns the diagram (`horizontal=a to b`:
// the edge from a to b level, pointing right; `vertical=a to b`: plumb,
// pointing down). Its automatic layout runs on LuaLaTeX.
//
// What is written:
//
//   - **the names the reading gave**: a, b … the vertices in time; i1 … the
//     particles coming in, f1 … those going out, each across time;
//   - **each fermion line as a chain along its flow** — in at a vertex, on
//     through it, out — so a fermion's arrow is the edge's own direction and
//     `fermion` is the only fermion style written; one whose flow is not drawn
//     is `plain`, said;
//   - **each boson from the earlier end to the later**, `photon` for a photon
//     (a wavy line no label names is taken as one, said), `boson` for a Z or a
//     W with no flow, `charged boson` for a W⁺ along its flow, `gluon`,
//     `scalar` for the Higgs;
//   - **only the table's names**: a particle's TeX is FEYNMAN_TABLE's, so no
//     text a hand wrote ever reaches TeX — a label naming no particle is left
//     out and said.
//
// Unverified by a compiler: the container this was written in has no LuaLaTeX,
// so the styles and keys are checked against the TikZ-Feynman manual as its
// author knows it, and the text has not been compiled.

import type { FeynmanDiagram, FeynmanExternal, FeynmanLine, FeynmanReading, FeynmanVertex } from './feynman';
import { FEYNMAN_TABLE } from './feynman';

export interface FeynmanTikz {
  /** The `\feynmandiagram … ;` itself. */
  text: string;
  /** What the document around it needs. */
  preamble: string;
  /** TikZ-Feynman's automatic layout runs on it. */
  engine: 'lualatex';
  /** Each TikZ name → the reading's symbol it stands for. */
  names: Record<string, string>;
  /** What was written otherwise than drawn, or left out, in a sentence each. */
  notes: string[];
}

const particle = (id: string) => FEYNMAN_TABLE.particles.find((p) => p.id === id);

/** A particle's name in TeX, from the table only. */
function texOf(id: string, anti: boolean | null): string | null {
  const p = particle(id);
  if (!p) return null;
  return p.tex[anti ? 1 : 0];
}

/** One diagram of a reading as TikZ-Feynman — the first, or the one at `which`. Null when there is none. */
export function toTikz(reading: FeynmanReading, which = 0): FeynmanTikz | null {
  const d: FeynmanDiagram | undefined = reading.diagrams[which];
  if (!d) return null;
  const notes: string[] = [];
  const nameOf = (symbol: string) => d.names[symbol];
  const lines = d.lines.map((id) => reading.lines.find((l) => l.id === id)!).filter(Boolean);
  const externals = new Map(reading.externals.filter((x) => d.externals.includes(x.id)).map((x) => [x.id, x]));
  const vertices = new Map(reading.vertices.filter((v) => d.vertices.includes(v.id)).map((v) => [v.id, v]));
  const order = d.vertices.map(nameOf);
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i >= 0 ? i : name.startsWith('i') ? -1 : order.length;
  };

  // Each end of a line as a TikZ name: the vertex it meets, or its own external.
  const nodeAt = (l: FeynmanLine, end: 'start' | 'end') => {
    const e = l.lineEnds.find((x) => x.end === end)!;
    return nameOf(e.vertex ?? `external:${l.id}`);
  };
  // A node's options, given at its first mention only.
  const said = new Set<string>();
  const opts = new Map<string, string>();
  for (const x of externals.values()) {
    const tex = x.particle ? texOf(x.particle.id, x.particle.anti) : null;
    if (tex) opts.set(x.name, `particle=\\(${tex}\\)`);
    else notes.push(`${x.name} has no particle written on it${lineOf(reading, x).written ? ` — “${lineOf(reading, x).written}” names none in the table` : ''}`);
  }
  for (const v of vertices.values()) if (v.ids.length) opts.set(v.name, 'dot');
  const node = (name: string) => {
    const o = opts.get(name);
    if (!o || said.has(name)) return name;
    said.add(name);
    return `${name} [${o}]`;
  };

  // ===== Fermions: chains along their flow =====
  const fermions = lines.filter((l) => l.kind === 'fermion');
  const edges = fermions.filter((l) => l.flow).map((l) => {
    const to = l.flow!.to;
    const from = to === 'end' ? 'start' : 'end';
    return { line: l, a: nodeAt(l, from), b: nodeAt(l, to) };
  });
  const used = new Set<FeynmanLine>();
  const statements: { first: number; fermion: boolean; text: string; key: string }[] = [];
  const startOf = (e: (typeof edges)[number]) => !edges.some((f) => f !== e && f.b === e.a);
  const chains: (typeof edges)[] = [];
  for (const e of [...edges].sort((p, q) => rank(p.a) - rank(q.a) || p.a.localeCompare(q.a))) {
    if (used.has(e.line) || !startOf(e)) continue;
    const chain = [e];
    used.add(e.line);
    for (let next = edges.find((f) => !used.has(f.line) && f.a === e.b); next; next = edges.find((f) => !used.has(f.line) && f.a === chain[chain.length - 1].b)) {
      chain.push(next);
      used.add(next.line);
    }
    chains.push(chain);
  }
  // A fermion loop has no start: begin it anywhere.
  for (const e of edges) {
    if (used.has(e.line)) continue;
    const chain = [e];
    used.add(e.line);
    for (let next = edges.find((f) => !used.has(f.line) && f.a === e.b); next; next = edges.find((f) => !used.has(f.line) && f.a === chain[chain.length - 1].b)) {
      chain.push(next);
      used.add(next.line);
    }
    chains.push(chain);
  }
  const edgeLabel = (l: FeynmanLine) => {
    if (l.external || !l.particle || l.particle.from !== 'label') return '';
    const tex = texOf(l.particle.id, l.particle.anti);
    return tex ? `, edge label=\\(${tex}\\)` : '';
  };
  for (const chain of chains) {
    let text = node(chain[0].a);
    for (const e of chain) text += ` -- [fermion${edgeLabel(e.line)}] ${node(e.b)}`;
    statements.push({ first: Math.min(...chain.flatMap((e) => [rank(e.a), rank(e.b)])), fermion: true, text, key: chain[0].a });
  }
  for (const l of fermions.filter((f) => !f.flow)) {
    notes.push(`the fermion ${l.id} has no arrow, and is written plain`);
    const [a, b] = [nodeAt(l, 'start'), nodeAt(l, 'end')].sort((p, q) => rank(p) - rank(q));
    statements.push({ first: Math.min(rank(a), rank(b)), fermion: true, text: `${node(a)} -- [plain${edgeLabel(l)}] ${node(b)}`, key: a });
  }

  // ===== Bosons: from the earlier end to the later =====
  for (const l of lines.filter((x) => x.kind !== 'fermion')) {
    let [a, b] = [nodeAt(l, 'start'), nodeAt(l, 'end')];
    const id = l.particle?.id ?? FEYNMAN_TABLE.assumed[l.kind as 'boson'];
    let style: string;
    if (id === 'w') {
      if (l.flow) {
        const to = l.flow.to;
        [a, b] = to === 'end' ? [nodeAt(l, 'start'), nodeAt(l, 'end')] : [nodeAt(l, 'end'), nodeAt(l, 'start')];
        style = l.particle?.anti ? 'anti charged boson' : 'charged boson';
      } else style = 'boson';
    } else {
      if (rank(b) < rank(a)) [a, b] = [b, a];
      style = id === 'photon' ? 'photon' : id === 'gluon' ? 'gluon' : id === 'higgs' ? 'scalar' : 'boson';
      if (!l.particle) notes.push(`${l.id} names no particle in the table, and is written as its line is drawn`);
      else if (l.particle.from === 'assumed' && l.kind !== 'gluon') notes.push(`the ${l.drawn} line ${l.id} is written as ${id === 'photon' ? 'a photon' : 'the Higgs'}, with no name on it, as nothing written says otherwise`);
    }
    statements.push({ first: Math.min(rank(a), rank(b)), fermion: false, text: `${node(a)} -- [${style}${edgeLabel(l)}] ${node(b)}`, key: a });
  }
  statements.sort((p, q) => p.first - q.first || Number(q.fermion) - Number(p.fermion) || p.key.localeCompare(q.key));

  // ===== The key that turns it =====
  let turn = '';
  const [va, vb] = d.vertices.map((id) => vertices.get(id)!).filter(Boolean) as FeynmanVertex[];
  if (va && vb && lines.some((l) => l.lineEnds.every((e) => e.vertex) && new Set(l.lineEnds.map((e) => e.vertex)).size === 2 && l.lineEnds.some((e) => e.vertex === va.id) && l.lineEnds.some((e) => e.vertex === vb.id))) {
    const dx = vb.at.x - va.at.x, dy = vb.at.y - va.at.y;
    turn = Math.abs(dx) >= Math.abs(dy) ? `${dx >= 0 ? 'horizontal' : "horizontal'"}=${va.name} to ${vb.name}` : `${dy >= 0 ? 'vertical' : "vertical'"}=${va.name} to ${vb.name}`;
  } else if (d.time === 'left to right' && d.initial.length && d.final.length) {
    turn = `horizontal=${nameOf(`external:${d.initial[0]}`)} to ${nameOf(`external:${d.final[0]}`)}`;
  }

  const body = statements.map((s) => `  ${s.text},`).join('\n');
  const text = `\\feynmandiagram${turn ? ` [${turn}]` : ''} {\n${body}\n};`;
  const names: Record<string, string> = {};
  for (const [symbol, name] of Object.entries(d.names)) names[name] = symbol;
  return { text, preamble: '\\usepackage{tikz-feynman}', engine: 'lualatex', names, notes };
}

function lineOf(reading: FeynmanReading, x: FeynmanExternal): FeynmanLine {
  return reading.lines.find((l) => l.id === x.line)!;
}
