// The Feynman diagram as a core test (MATHS-SPEC §8, M27; the teacher's scene
// T7): the four boards — e⁻ e⁺ → μ⁻ μ⁺ in the s-channel, Møller in the
// t-channel, Compton, and u d → u d by a gluon — read with the right process,
// channel and order, through the platform's own doors (the index): *a Feynman
// diagram 0.92 — s-channel, two vertices, order α²*. A vertex that breaks
// charge is said, with its vertex; lepton number is held family by family; the
// way time runs is said, and read bottom to top when the page stands so; the
// six roles hold; nothing enters the log. And the fill-ins: γ offered for a
// wavy line between two fermion vertices, written faint where its name would
// go, taken as a one-line text the notation then reads as the line's name; W⁻
// where a vertex needs the charge; the electron carried through Compton's
// vertex; g for a gluon.

import { describe, it, expect } from 'vitest';
import {
  createSession,
  notationsOf,
  describeNotation,
  NOTATION_FLOOR,
  readFeynman,
  parseParticle,
  FEYNMAN,
  FEYNMAN_TABLE,
  ROLES,
  fillInsOf,
  BUILTIN_FILL_SOURCES,
  FEYNMAN_FILL,
  shippedPack,
  notationById,
} from '../index';
import type { Session, FeynmanReading, FeynmanDiagram } from '../index';
import { drawFeynman, drawBoard, readFeynmanWords, FEYNMAN_VARIANTS, FEYNMAN_BOARDS, BOARD } from './fixtures/feynman';
import type { BoardSpec, FeynmanExpected } from './fixtures/feynman';

const V = FEYNMAN_VARIANTS;
const read = (s: Session) => readFeynman(s.getState()) as FeynmanReading;
const first = (s: Session): FeynmanDiagram => read(s).diagrams[0];

describe('T7 — the four boards read with their process, channel and order', () => {
  const want: Record<string, { said: string; process: string }> = {
    s: { said: 's-channel, two vertices, order α²', process: 'e⁻ e⁺ → μ⁻ μ⁺' },
    t: { said: 't-channel, two vertices, order α²', process: 'e⁻ e⁻ → e⁻ e⁻' },
    compton: { said: 's-channel, two vertices, order α²', process: 'e⁻ γ → e⁻ γ' },
    gluon: { said: 't-channel, two vertices, order αₛ²', process: 'u d → u d' },
  };
  for (const board of FEYNMAN_BOARDS) {
    for (const v of [V[0], V[1], V[5], V[22]]) {
      it(`${board}, seed ${v.seed} (${v.arrows}, ${v.photon}): a Feynman diagram, first, ${want[board].said} — then ${want[board].process} once its names are read`, () => {
        const s = createSession();
        const e = drawFeynman(s, board, v);
        const all = notationsOf(s.getState());
        const r = all.find((x) => x.notation === 'feynman') as FeynmanReading;
        expect(r, all.map((x) => x.notation).join()).toBeDefined();
        expect(all[0].notation).toBe('feynman');
        expect(r.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
        expect(describeNotation(r)).toBe(`a Feynman diagram ${r.confidence.toFixed(2)} — ${want[board].said}`);
        expect(r.diagrams).toHaveLength(1);
        expect(r.diagrams[0].process).toBeNull();
        readFeynmanWords(s, e);
        const d = first(s);
        expect(d.process).toBe(want[board].process);
        expect(describeNotation(read(s))).toBe(`a Feynman diagram ${read(s).confidence.toFixed(2)} — ${want[board].said} — ${want[board].process}`);
        expect(d.breaks).toEqual([]);
        expect(d.loops).toBe(0);
        if (board === 'compton') {
          // Compton's inner electron has no name written on it: its vertices are not checked until one is — and the
          // name it carries through the photon's vertex is offered, faint, where it would be written. Taken, both keep charge.
          expect(d.checks.filter((c) => c.quantity === 'charge').map((c) => `${c.name} ${c.status}`)).toEqual(['a unknown', 'b unknown']);
          const offer = fillInsOf(s.getState()).find((f) => f.source === 'feynman')!;
          expect(offer.text).toBe('e⁻');
          if (offer.take.kind === 'text') s.import({ kind: 'text', path: 'e.txt', code: offer.take.text, bounds: offer.take.bounds, at: 950_000 });
        }
        expect(first(s).checks.filter((c) => c.quantity === 'charge').map((c) => `${c.name} ${c.status}`)).toEqual(['a kept', 'b kept']);
      });
    }
  }

  it('the board reads as none of the other notations above the floor', () => {
    for (const board of FEYNMAN_BOARDS) {
      const s = createSession();
      drawFeynman(s, board, V[3]);
      const others = notationsOf(s.getState()).filter((r) => r.notation !== 'feynman' && r.confidence >= NOTATION_FLOOR);
      expect(others.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`), board).toEqual([]);
    }
  });

  it('it names its vertices a, b in time and its particles i1, i2 coming in and f1, f2 going out, each across time', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', V[0]);
    const r = read(s);
    const d = r.diagrams[0];
    const vertexNamed = (n: string) => r.vertices.find((v) => d.names[v.id] === n)!;
    expect(vertexNamed('a').lines.map((x) => x.line).sort()).toEqual(e.vertices.a.slice().sort());
    expect(vertexNamed('b').lines.map((x) => x.line).sort()).toEqual(e.vertices.b.slice().sort());
    const ext = (name: string) => r.externals.find((x) => d.names[x.id] === name)!.line;
    expect([ext('i1'), ext('i2'), ext('f1'), ext('f2')]).toEqual(['e⁻ in', 'e⁺ in', 'μ⁻ out', 'μ⁺ out'].map((n) => e.lines.find((l) => l.name === n)!.id));
    expect(d.time).toBe('left to right');
    expect(d.assumed[0]).toMatch(/^time is read left to right/);
  });

  it('a fermion’s arrow is its flow, along it on a particle and against it on an antiparticle, as a chevron or as a barb', () => {
    for (const v of [V[0], V[1]]) {
      const s = createSession();
      const e = drawFeynman(s, 's', v);
      readFeynmanWords(s, e);
      const r = read(s);
      for (const name of ['e⁻ in', 'e⁺ in', 'μ⁻ out', 'μ⁺ out']) {
        const l = r.lines.find((x) => x.id === e.lines.find((y) => y.name === name)!.id)!;
        expect(l.arrow?.how, name).toBe(v.arrows);
        expect(l.flow?.from, name).toBe('label');
        expect(l.notes, name).toEqual([]);
      }
      const ext = r.externals.map((x) => x.said).sort();
      expect(ext).toEqual(['e⁺', 'e⁻', 'μ⁺', 'μ⁻']);
    }
  });
});

describe('conservation at each vertex', () => {
  it('a vertex that breaks charge is said, with its vertex and its sum — the other vertex kept', () => {
    const s = createSession();
    // μ⁻ written where μ⁺ goes out: two μ⁻ leave b, and a photon brings no charge.
    const e = drawFeynman(s, 's', V[0], 1000, { words: { 'μ⁺ out': 'μ⁻' } });
    readFeynmanWords(s, e);
    const r = read(s);
    const d = r.diagrams[0];
    const charge = d.checks.filter((c) => c.quantity === 'charge');
    expect(charge.map((c) => `${c.name} ${c.status} ${c.sum}`)).toEqual(['a kept 0', 'b broken 2']);
    expect(d.breaks[0]).toBe('charge is not kept at vertex b: what meets there comes to +2, not 0');
    expect(d.breaks).toContain('lepton number (μ family) is not kept at vertex b: what meets there comes to −2, not 0');
    expect(describeNotation(r)).toMatch(/; charge is not kept at vertex b$/);
    expect(d.process).toBe('e⁻ e⁺ → μ⁻ μ⁻');
    // The label rules the particle, and the arrow it contradicts is said.
    const line = r.lines.find((l) => l.id === e.lines.find((x) => x.name === 'μ⁺ out')!.id)!;
    expect(line.notes[0]).toMatch(/its label says μ⁻ — the label is taken/);
  });

  it('lepton number is held family by family: e⁻ e⁺ → μ⁻ e⁺ keeps charge and breaks both families at b', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', V[0], 1000, { words: { 'μ⁻ out': 'μ⁻', 'μ⁺ out': 'e⁺' } });
    readFeynmanWords(s, e);
    const d = first(s);
    expect(d.checks.filter((c) => c.quantity === 'charge').every((c) => c.status === 'kept')).toBe(true);
    expect(d.breaks.sort()).toEqual([
      'lepton number (e family) is not kept at vertex b: what meets there comes to +1, not 0',
      'lepton number (μ family) is not kept at vertex b: what meets there comes to −1, not 0',
    ]);
  });

  it('before its names are read, a vertex is not checked, and it says why', () => {
    const s = createSession();
    drawFeynman(s, 's', V[0]);
    const d = first(s);
    expect(d.checks.every((c) => c.status === 'unknown')).toBe(true);
    expect(d.checks[0].reason).toMatch(/^charge at vertex a not checked: the writing beside stroke:\d+ has not been read$/);
    expect(d.processSaid).toBe('f f̄ → f f̄');
  });

  it('a gluon exchange keeps baryon number at each vertex, a third in and a third out', () => {
    const s = createSession();
    const e = drawFeynman(s, 'gluon', V[0]);
    readFeynmanWords(s, e);
    const d = first(s);
    expect(d.checks.filter((c) => c.quantity === 'baryon number').map((c) => `${c.name} ${c.status}`)).toEqual(['a kept', 'b kept']);
    expect(d.order.said).toBe('αₛ²');
  });
});

/** β decay by a W, drawn as a hand draws it: d → u, and the W on to e⁻ ν̄_e. */
const BETA: BoardSpec = {
  vertices: { a: [300, 300], b: [560, 300] },
  lines: [
    { name: 'd in', kind: 'fermion', from: [110, 300], to: 'a', ends: ['free', 'a'], word: 'd', wordAt: 'free' },
    { name: 'u out', kind: 'fermion', from: 'a', to: [470, 120], ends: ['a', 'free'], word: 'u', wordAt: 'free' },
    { name: 'W', kind: 'boson', from: 'a', to: 'b', ends: ['a', 'b'] },
    { name: 'e⁻ out', kind: 'fermion', from: 'b', to: [750, 150], ends: ['b', 'free'], word: 'e⁻', wordAt: 'free' },
    { name: 'ν̄ out', kind: 'fermion', from: [750, 450], to: 'b', ends: ['free', 'b'], word: 'ν̄_e', wordAt: 'free' },
  ],
  process: 'd → u e⁻ ν̄_e',
  channel: null,
  order: 'α_W²',
};

describe('the names a diagram offers for its unnamed lines (fill-ins)', () => {
  const lineNamed = (e: FeynmanExpected, name: string) => e.lines.find((l) => l.name === name)!.id;

  it('γ on a wavy line between two fermion vertices, where its name would be written; taken as a one-line text, the line is named and the offer gone; undone, it is offered again', () => {
    expect(BUILTIN_FILL_SOURCES).toContain(FEYNMAN_FILL);
    const s = createSession();
    const e = drawFeynman(s, 's', V[0], 1000, { named: false });
    readFeynmanWords(s, e);
    const photon = lineNamed(e, 'γ');
    const offers = fillInsOf(s.getState()).filter((f) => f.source === 'feynman');
    expect(offers.map((f) => `${f.key} ${f.text}`)).toEqual([`feynman:${photon}:particle γ`]);
    const f = offers[0];
    expect(f.kind).toBe('value');
    expect(f.reason).toMatch(/^a wavy line between two vertices where fermions meet, and nothing there changes charge — a photon, γ$/);
    expect(f.about).toEqual([photon]);
    expect(f.quantity).toBe('particle:photon');
    expect(f.answer).toBe(true);
    // Above the line's middle, clear of its crests.
    const r0 = read(s);
    const line = r0.lines.find((l) => l.id === photon)!;
    const mid = line.path[Math.floor(line.path.length / 2)];
    expect(f.at.y).toBeLessThan(mid.y - (line.wave!.amplitude + 10));
    expect(Math.abs(f.at.x - mid.x)).toBeLessThan(5);
    expect(f.take.kind).toBe('text');
    if (f.take.kind !== 'text') return;
    // Taken: one act, a one-line text in the taker's name.
    const before = s.getEvents().length;
    s.withTool('fill', () => s.import({ kind: 'text', path: 'γ.txt', code: f.take.kind === 'text' ? f.take.text : '', bounds: f.take.kind === 'text' ? f.take.bounds : f.at as never, at: 900_500 }), f.key);
    expect(s.getEvents().length).toBe(before + 1);
    const r = read(s);
    const named = r.lines.find((l) => l.id === photon)!;
    expect(named.particle).toMatchObject({ id: 'photon', from: 'label' });
    expect(named.written).toBe('γ');
    expect(fillInsOf(s.getState()).filter((x) => x.source === 'feynman')).toEqual([]);
    expect(r.diagrams[0].assumed.some((a) => /taken as a photon/.test(a))).toBe(false);
    // Undone, it is offered again.
    s.undo();
    expect(fillInsOf(s.getState()).filter((x) => x.source === 'feynman').map((x) => x.text)).toEqual(['γ']);
  });

  it('a wavy line whose vertices need a charge is offered as a W — W⁻ in β decay, the way time runs', () => {
    const s = createSession();
    const e = drawBoard(s, BETA, 'beta', V[0]);
    readFeynmanWords(s, e);
    const d = first(s);
    expect(d.channel).toBeNull();
    expect(d.processSaid).toBe('d → u e⁻ ν̄_e');
    const offers = fillInsOf(s.getState()).filter((f) => f.source === 'feynman');
    expect(offers.map((f) => f.text)).toEqual(['W⁻']);
    expect(offers[0].reason).toMatch(/needs a charge of −1 carried through it the way time runs — a W boson, W⁻$/);
    // Named W⁻, every vertex keeps charge, lepton number and baryon number, and its order is weak.
    const t = createSession();
    const e2 = drawBoard(t, { ...BETA, lines: BETA.lines.map((l) => (l.name === 'W' ? { ...l, word: 'W⁻', wordAt: 'middle' as const } : l)) }, 'beta', V[0], 1000, { named: true });
    readFeynmanWords(t, e2);
    const d2 = first(t);
    expect(d2.breaks).toEqual([]);
    expect(d2.checks.filter((c) => c.status !== 'kept')).toEqual([]);
    expect(d2.checks.map((c) => `${c.name} ${c.quantity}${c.family ? ' ' + c.family : ''}`)).toEqual(['a charge', 'a baryon number', 'b charge', 'b lepton number e']);
    expect(d2.order.said).toBe('α_W²');
  });

  it('Compton’s inner line is offered the electron it carries through the photon’s vertex; a gluon is offered g', () => {
    const s = createSession();
    const e = drawFeynman(s, 'compton', V[0]);
    readFeynmanWords(s, e);
    const inner = lineNamed(e, 'e⁻ between');
    expect(fillInsOf(s.getState()).filter((f) => f.source === 'feynman').map((f) => `${f.about[0] === inner ? 'inner' : f.about[0]} ${f.text}`)).toEqual(['inner e⁻']);
    const g = createSession();
    drawFeynman(g, 'gluon', V[0], 1000, { named: false });
    expect(fillInsOf(g.getState()).filter((f) => f.source === 'feynman').map((f) => f.text)).toEqual(['g']);
  });

  it('a line with writing beside it — read or not — is offered nothing', () => {
    const s = createSession();
    drawFeynman(s, 's', V[0], 1000, { named: true });
    expect(fillInsOf(s.getState()).filter((f) => f.source === 'feynman')).toEqual([]);
  });
});

/** The Higgs decaying to a bottom quark and its antiquark: the Higgs a dashed line. */
const HIGGS: BoardSpec = {
  vertices: { a: [400, 300] },
  lines: [
    { name: 'H in', kind: 'scalar', from: [110, 300], to: 'a', ends: ['free', 'a'], word: 'H', wordAt: 'free' },
    { name: 'b out', kind: 'fermion', from: 'a', to: [650, 150], ends: ['a', 'free'], word: 'b', wordAt: 'free' },
    { name: 'b̄ out', kind: 'fermion', from: [650, 450], to: 'a', ends: ['free', 'a'], word: 'b̄', wordAt: 'free' },
  ],
  process: 'H → b b̄',
  channel: null,
  order: 'y',
};

/** An electron's self-energy: it emits a photon and takes it back — the photon an arc over the inner electron, one loop. */
const SELF: BoardSpec = {
  vertices: { a: [300, 320], b: [560, 320] },
  lines: [
    { name: 'e⁻ in', kind: 'fermion', from: [110, 320], to: 'a', ends: ['free', 'a'], word: 'e⁻', wordAt: 'free' },
    { name: 'e⁻ between', kind: 'fermion', from: 'a', to: 'b', ends: ['a', 'b'] },
    { name: 'γ', kind: 'boson', from: 'a', to: 'b', ends: ['a', 'b'], bow: -0.4 },
    { name: 'e⁻ out', kind: 'fermion', from: 'b', to: [750, 320], ends: ['b', 'free'], word: 'e⁻', wordAt: 'free' },
  ],
  process: 'e⁻ → e⁻',
  channel: null,
  order: 'α²',
};

describe('a dashed line, and a loop', () => {
  it('the Higgs, dashed, decaying to b b̄: one vertex of the Yukawa coupling, charge and baryon number kept — and H offered when it is not named', () => {
    for (const v of [V[0], V[1], V[7]]) {
      const s = createSession();
      const e = drawBoard(s, HIGGS, 'higgs', v);
      const r0 = read(s);
      expect(r0, `seed ${v.seed}`).not.toBeNull();
      const dashed = r0.lines.find((l) => l.kind === 'scalar')!;
      expect(dashed.drawn).toBe('dashed');
      expect(dashed.ids.slice().sort()).toEqual(e.lines[0].ids.slice().sort());
      readFeynmanWords(s, e);
      const d = first(s);
      expect(d.process).toBe('H → b b̄');
      expect(d.order.said).toBe('y');
      expect(d.channel).toBeNull();
      expect(d.summary).toBe('1 → 2, one vertex, order y — H → b b̄');
      expect(d.checks.map((c) => `${c.quantity} ${c.status}`)).toEqual(['charge kept', 'baryon number kept']);
    }
    const t = createSession();
    drawBoard(t, { ...HIGGS, lines: HIGGS.lines.map((l) => (l.kind === 'scalar' ? { ...l, word: undefined } : l)) }, 'higgs', V[0]);
    expect(fillInsOf(t.getState()).filter((f) => f.source === 'feynman').map((f) => f.text)).toEqual(['H']);
    expect(first(t).assumed.some((a) => /taken as the Higgs/.test(a))).toBe(true);
  });

  it('a photon in a loop is an arc, read as a wavy line along a curve: one loop, two vertices, order α²', () => {
    for (const v of [V[0], V[1], V[4]]) {
      const s = createSession();
      const e = drawBoard(s, SELF, 'self', v);
      readFeynmanWords(s, e);
      const r = read(s);
      const photon = r.lines.find((l) => l.id === e.lines.find((x) => x.name === 'γ')!.id)!;
      expect(photon.kind, `seed ${v.seed}`).toBe('boson');
      const d = r.diagrams[0];
      expect(d.loops).toBe(1);
      expect(d.summary).toBe('1 → 1, one loop, two vertices, order α² — e⁻ → e⁻');
    }
  });
});

describe('the way time runs', () => {
  it('a page standing so the free lines are below and above is read bottom to top — and says so', () => {
    for (const tilt of [-90, -86]) {
      const s = createSession();
      const e = drawFeynman(s, 's', { ...V[0], tilt });
      readFeynmanWords(s, e);
      const d = first(s);
      expect(d.time).toBe('bottom to top');
      expect(d.assumed[0]).toBe('time is read bottom to top: the free lines stand below and above, not to either side');
      expect(d.channel).toBe('s');
      // Turned a quarter: the e⁻ stands left of the e⁺, below; the μ⁻ left of the μ⁺, above.
      expect(d.process).toBe('e⁻ e⁺ → μ⁻ μ⁺');
    }
  });
});

describe('what the reading is', () => {
  it('derived: reading writes nothing, and a replay of the log reads the same', () => {
    const s = createSession();
    const e = drawFeynman(s, 'compton', V[1]);
    readFeynmanWords(s, e);
    const n = s.getEvents().length;
    const once = JSON.stringify(read(s));
    expect(s.getEvents().length).toBe(n);
    const t = createSession();
    t.load(s.getEvents().slice());
    expect(JSON.stringify(read(t))).toBe(once);
  });

  it('the six roles hold: lines, their chevrons and the dashes are edges, a dot at a vertex is a node, the names labels', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', V[0]);
    const r = read(s);
    expect(new Set(Object.values(r.roles)).size).toBeGreaterThan(0);
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    for (const l of e.lines) for (const id of l.ids) expect(r.roles[id], `${l.name} ${id}`).toBe('edge');
    for (const id of Object.keys(e.words)) expect(r.roles[id]).toBe('label');
    expect(r.unplaced).toEqual([]);
    for (const sym of r.symbols) expect(sym.role).toBe('node');
    for (const def of [...FEYNMAN.symbols, ...FEYNMAN.connectors]) expect(ROLES).toContain(def.role);
    expect(notationById('feynman')).toBe(FEYNMAN);
  });

  it('a dot drawn at a vertex is that vertex’s mark, and plays a node', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', V[0]);
    const r0 = read(s);
    const a = r0.vertices.find((v) => r0.diagrams[0].names[v.id] === 'a')!;
    const dot = s.addStroke(
      Array.from({ length: 40 }, (_, i) => ({ x: a.at.x + 5 * (1 - i / 40) * Math.cos(i * 0.9), y: a.at.y + 5 * (1 - i / 40) * Math.sin(i * 0.9) })),
      800_000
    );
    const r = read(s);
    const v = r.vertices.find((x) => r.diagrams[0].names[x.id] === 'a')!;
    expect(v.ids).toEqual([dot]);
    expect(r.roles[dot]).toBe('node');
    void e;
  });

  it('the pack names the notation and restates none of its table', () => {
    const p = shippedPack('feynman@1')!;
    expect(p).toBeDefined();
    expect(p.notation).toBe('feynman');
    expect(p.definitions).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/charge|lepton|baryon/);
    expect(FEYNMAN_TABLE.particles.length).toBe(18);
  });
});

describe('reading a particle’s name', () => {
  const said = (t: string) => {
    const p = parseParticle(t);
    return p ? `${p.particle.id}${p.anti === null ? '' : p.anti ? ' anti' : ' particle'}` : null;
  };
  it('the ways a hand writes them', () => {
    expect(said('e⁻')).toBe('electron particle');
    expect(said('e-')).toBe('electron particle');
    expect(said('e^-')).toBe('electron particle');
    expect(said('e^{+}')).toBe('electron anti');
    expect(said('e+')).toBe('electron anti');
    expect(said('ē')).toBe('electron anti');
    expect(said('e')).toBe('electron');
    expect(said('positron')).toBe('electron anti');
    expect(said('Electron')).toBe('electron particle');
    expect(said('µ+')).toBe('muon anti'); // the micro sign
    expect(said('mu-')).toBe('muon particle');
    expect(said('\\mu^{-}')).toBe('muon particle');
    expect(said('τ⁻')).toBe('tau particle');
    // A fermion's name with no sign and no bar names its kind; its arrow says particle or antiparticle.
    expect(said('ν_e')).toBe('nu-e');
    expect(said('νe')).toBe('nu-e');
    expect(said('ν̄_e')).toBe('nu-e anti');
    expect(said('\\bar{\\nu}_{\\mu}')).toBe('nu-mu anti');
    expect(said('ν')).toBe('nu');
    expect(said('u')).toBe('up');
    expect(said('ū')).toBe('up anti');
    expect(said('\\bar{d}')).toBe('down anti');
    expect(said('dbar')).toBe('down anti');
    expect(said('γ')).toBe('photon particle');
    expect(said('gamma')).toBe('photon particle');
    expect(said('g')).toBe('gluon particle');
    expect(said('W+')).toBe('w particle');
    expect(said('W⁻')).toBe('w anti');
    expect(said('W')).toBe('w');
    expect(said('Z')).toBe('z particle');
    expect(said('Z0')).toBe('z particle');
    expect(said('Z⁰')).toBe('z particle');
    expect(said('H')).toBe('higgs particle');
  });
  it('and what names no particle, or one in a way it cannot be, is refused — never guessed', () => {
    for (const t of ['', 'x', 'hello', 'u⁺', 'd-', 'γ⁻', 'g+', 'ν⁻', 'e⁰', 'W0', 'Z+', 'eee', 'mu mu']) expect(parseParticle(t), t).toBeNull();
  });
});

describe('the boards are the spec’s', () => {
  it('each board’s process, channel and order', () => {
    expect(Object.fromEntries(Object.entries(BOARD).map(([k, b]) => [k, `${b.process} ${b.channel} ${b.order}`]))).toEqual({
      s: 'e⁻ e⁺ → μ⁻ μ⁺ s α²',
      t: 'e⁻ e⁻ → e⁻ e⁻ t α²',
      compton: 'e⁻ γ → e⁻ γ s α²',
      gluon: 'u d → u d t αₛ²',
    });
  });
});
