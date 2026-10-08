// The Feynman diagram's fill-ins (MATHS-SPEC §4, §8 M27): a particle's name
// offered for a line nobody has named, from how it is drawn and what flows
// through its vertices — written faint where the name would go, and taken by a
// tap as a one-line text beside the line, which the notation then reads as the
// line's label (so the offer is gone, and the conservation checks hold it).
//
//   - **A wavy line** is γ when what meets at its vertices balances without it
//     (an electron in and out, a photon between: nothing changes charge), and
//     W⁺ or W⁻ when its vertex needs the charge it would carry — the sign the
//     way time runs; with its vertices not yet all known, γ, more quietly.
//   - **A curly line** is g. **A dashed line** is H.
//   - **A fermion line** takes the name of the fermion it continues through a
//     vertex where a neutral boson meets it (a photon, a gluon, a Z, the Higgs
//     changes no flavour), as particle or antiparticle by its arrow and which
//     way it goes.
//
// A line with writing beside it — read or not — is offered nothing: the person
// has said, or is saying, what it is. Derived, like every fill-in: nothing here
// writes an event. The reading is the notation's (`readFeynman`), only above
// its floor.

import type { Bounds, Point } from '../types';
import type { FillIn, FillSource } from './fill';
import type { FeynmanLine, FeynmanReading, FeynmanVertex } from '../notations/feynman';
import { feynmanParticle, intoVertex, readFeynman } from '../notations/feynman';
import { NOTATION_FLOOR } from '../notations/notation';

/** How strong each offer is: a photon whose vertices balance without it, a W they need, a gluon, a fermion carried through, the Higgs, a photon on what is not yet known. */
export const FEYNMAN_FILL_RANK = { photon: 0.75, w: 0.7, gluon: 0.7, fermion: 0.6, higgs: 0.5, guess: 0.5 } as const;
/** A name stands off its line by this share of the line's length, past a wave's crests. */
export const NAME_OFF = 0.1;
/** …and is this share of the diagram's typical line tall. */
export const NAME_SIZE = 0.1;

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Where a name for the line stands: past its free end, or beside its middle — above a level line, right of a plumb one. */
function placeFor(l: FeynmanLine, h: number): { at: Point; from: Point; away: Point } {
  const [a, b] = l.lineEnds;
  const free = l.lineEnds.find((e) => !e.vertex);
  if (free) {
    const other = free === a ? b : a;
    const d = Math.hypot(free.point.x - other.point.x, free.point.y - other.point.y) || 1;
    const away = { x: (free.point.x - other.point.x) / d, y: (free.point.y - other.point.y) / d };
    const off = NAME_OFF * l.length + h / 2;
    return { at: { x: free.point.x + away.x * off, y: free.point.y + away.y * off }, from: free.point, away };
  }
  const path = l.path;
  const mid = path[Math.floor(path.length / 2)] ?? { x: (a.point.x + b.point.x) / 2, y: (a.point.y + b.point.y) / 2 };
  const dx = b.point.x - a.point.x, dy = b.point.y - a.point.y;
  const len = Math.hypot(dx, dy) || 1;
  let n = { x: -dy / len, y: dx / len };
  if (Math.abs(n.y) >= Math.abs(n.x) ? n.y > 0 : n.x < 0) n = { x: -n.x, y: -n.y };
  const off = (l.wave?.amplitude ?? 0) + NAME_OFF * l.length + h / 2;
  return { at: { x: mid.x + n.x * off, y: mid.y + n.y * off }, from: mid, away: n };
}

/** What the other lines at a vertex bring into it, in thirds of a charge — or null when one of them cannot say. */
function balanceAt(v: FeynmanVertex, lines: ReadonlyMap<string, FeynmanLine>, except: FeynmanLine): number | null {
  let sum = 0;
  let skipped = false;
  for (const x of v.lines) {
    const l = lines.get(x.line)!;
    if (l === except && !skipped) {
      skipped = true;
      continue;
    }
    const got = intoVertex(l, x.end);
    if (got.sign === null || got.either) return null;
    sum += got.sign * (got.p?.charge3 ?? 0);
  }
  return sum;
}

/** The name to offer for one unnamed line, why, and how strongly — or null when nothing says. */
function nameFor(l: FeynmanLine, lines: ReadonlyMap<string, FeynmanLine>, vertices: ReadonlyMap<string, FeynmanVertex>, time: (p: Point) => number): { text: string; particle: string; reason: string; rank: number } | null {
  const ends = l.lineEnds.filter((e) => e.vertex).map((e) => ({ e, v: vertices.get(e.vertex!)! })).filter((x) => x.v);
  const fermionVertex = (v: FeynmanVertex) => v.lines.filter((x) => lines.get(x.line)?.kind === 'fermion').length === 2;
  if (l.kind === 'gluon') return { text: 'g', particle: 'gluon', reason: 'a curly line — a gluon, g', rank: FEYNMAN_FILL_RANK.gluon };
  if (l.kind === 'scalar') return { text: 'H', particle: 'higgs', reason: 'a dashed line — a scalar, the Higgs, H', rank: FEYNMAN_FILL_RANK.higgs };
  if (l.kind === 'boson') {
    // What must flow through it: the charge the other lines leave at each of its vertices.
    const needs = ends.map(({ e, v }) => ({ e, v, need: balanceAt(v, lines, l) }));
    if (needs.length && needs.every((x) => x.need === 0)) {
      const between = needs.length === 2 && needs.every((x) => fermionVertex(x.v));
      return {
        text: 'γ',
        particle: 'photon',
        reason: `a wavy line ${between ? 'between two vertices where fermions meet' : 'at a vertex where fermions meet'}, and nothing there changes charge — a photon, γ`,
        rank: between ? FEYNMAN_FILL_RANK.photon : FEYNMAN_FILL_RANK.photon - 0.05,
      };
    }
    const known = needs.filter((x) => x.need !== null && x.need !== 0);
    if (known.length && known.every((x) => Math.abs(x.need!) === 3)) {
      // The charge it carries the way time runs: into its later end, out of its earlier.
      // It must bring into each vertex what the others there leave wanting: −need. Coming in it brings its own
      // charge, going out the opposite; inside, it brings its own into its later vertex.
      let q: number | null = null;
      if (l.external) {
        const n = known[0].need!;
        q = l.external === 'in' ? -n : n;
      } else if (ends.length === 2) {
        const [p, r] = ends;
        const dt = time(r.v.at) - time(p.v.at);
        if (Math.abs(dt) >= 0.2 * l.length) {
          const later = dt > 0 ? r : p;
          const need = needs.find((x) => x.v === later.v)?.need;
          if (need !== null && need !== undefined) q = -need;
        }
      }
      if (q !== null) {
        const sign = q > 0 ? '⁺' : '⁻';
        return { text: `W${sign}`, particle: 'w', reason: `a wavy line whose vertex needs a charge of ${q > 0 ? '+1' : '−1'} carried through it the way time runs — a W boson, W${sign}`, rank: FEYNMAN_FILL_RANK.w };
      }
      return { text: 'W', particle: 'w', reason: 'a wavy line carrying a charge across time — a W boson, W⁺ one way and W⁻ the other', rank: FEYNMAN_FILL_RANK.w - 0.1 };
    }
    return { text: 'γ', particle: 'photon', reason: 'a wavy line — taken as a photon, γ, while what meets at its vertices is not yet all known', rank: FEYNMAN_FILL_RANK.guess };
  }
  // A fermion: the one it continues through a vertex a neutral boson meets.
  for (const { e, v } of ends) {
    const others = v.lines.map((x) => ({ line: lines.get(x.line)!, end: x.end })).filter((x) => x.line && x.line !== l);
    const fermions = others.filter((x) => x.line.kind === 'fermion');
    const bosons = others.filter((x) => x.line.kind !== 'fermion');
    if (fermions.length !== 1 || bosons.length !== 1) continue;
    const f = fermions[0].line;
    const b = bosons[0].line;
    const bp = b.particle && feynmanParticle(b.particle.id);
    if (!f.particle || !bp || bp.charge3 !== 0) continue;
    const p = feynmanParticle(f.particle.id);
    if (!p || p.line !== 'fermion') continue;
    // Particle or antiparticle: by its flow and which way it goes.
    let anti: boolean | null = null;
    if (l.flow) {
      if (l.external) {
        const into = l.flow.to === e.end;
        anti = (l.external === 'in') !== into;
      } else {
        const other = l.lineEnds.find((x) => x !== e && x.vertex);
        const ov = other && vertices.get(other.vertex!);
        if (ov) {
          const fromV = l.flow.to === e.end ? ov : v;
          const toV = l.flow.to === e.end ? v : ov;
          const dt = time(toV.at) - time(fromV.at);
          if (Math.abs(dt) >= 0.2 * l.length) anti = dt < 0;
        }
      }
    }
    const text = anti === null ? p.said[0].replace(/[⁺⁻]$/, '') : p.said[anti ? 1 : 0];
    return {
      text,
      particle: p.id,
      reason: `a fermion carried on through ${v.name ? `vertex ${v.name}` : 'its vertex'} from ${f.particle.said}: a ${bp.name} there changes no flavour — ${anti === null ? `a ${p.name}` : anti ? `the antiparticle of the ${p.name}` : `a ${p.name}`}, ${text}`,
      rank: FEYNMAN_FILL_RANK.fermion,
    };
  }
  return null;
}

/** Every name a reading offers, one per unnamed line. */
export function feynmanFillIns(reading: FeynmanReading): FillIn[] {
  const lines = new Map(reading.lines.map((l) => [l.id, l]));
  const vertices = new Map(reading.vertices.map((v) => [v.id, v]));
  const typical = median(reading.lines.map((l) => l.length));
  const h = Math.max(8, NAME_SIZE * typical);
  const out: FillIn[] = [];
  for (const d of reading.diagrams) {
    const time = (p: Point) => (d.time === 'left to right' ? p.x : -p.y);
    for (const id of d.lines) {
      const l = lines.get(id);
      if (!l || l.written || l.unread || l.labels.length) continue;
      const named = nameFor(l, lines, vertices, time);
      if (!named) continue;
      const { at, from, away } = placeFor(l, h);
      const w = h * (0.6 * [...named.text].length + 0.4);
      const bounds: Bounds = { minX: at.x - w / 2, maxX: at.x + w / 2, minY: at.y - h / 2, maxY: at.y + h / 2 };
      out.push({
        key: `feynman:${l.id}:particle`,
        kind: 'value',
        source: 'feynman',
        text: named.text,
        at,
        from,
        away,
        about: [...l.ids],
        quantity: `particle:${named.particle}`,
        reason: named.reason,
        answer: true,
        rank: named.rank,
        take: { kind: 'text', text: named.text, bounds },
      });
    }
  }
  return out;
}

/** The fill source: the names a Feynman diagram on the board offers, when the board reads as one. */
export const FEYNMAN_FILL: FillSource = {
  id: 'feynman',
  fillIns(state) {
    const r = readFeynman(state);
    if (!r || r.confidence < NOTATION_FLOOR) return [];
    return feynmanFillIns(r);
  },
};
