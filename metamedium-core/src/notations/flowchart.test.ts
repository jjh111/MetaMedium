// The flowchart notation (V1-PLAN §3, §9 D1).
//
// Symbols: a process is an upright rectangle; a decision a diamond — a box or
// a quadrilateral turned about 45°, in one stroke or several; a terminator an
// elongated round-ended form; data a parallelogram; start and end small
// circles. Flows are arrows and lines between symbols, directed by their
// heads, their ends read PAST any head. Labels are writing inside a symbol or
// beside a flow. Each symbol offers its ports — a decision's four vertices, a
// process's edge middles, a terminator's ends and sides — through E3's hook
// once the notation is put in use.
//
// The trap: the shape rung is blind to rotation by design, so a diamond is
// known only from its corners' angle — and a box drawn a little tilted must
// stay a process.

import { describe, it, expect, afterEach } from 'vitest';
import type { Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { isWord, lettersOf } from '../session/nodes';
import { magnetSites, nearestMagnet } from '../session/magnets';
import { registeredPorts, unregisterPorts } from '../session/ports';
import { headsOf } from '../diagram/heads';
import { ROLES } from '../diagram/roles';
import { readFlowchart } from './flowchart';
import { offerPorts, describeNotation, NOTATION_FLOOR } from './notation';
import type { NotationReading, NotationSymbol } from './notation';
import { handArrow, handLine, handText, handCircle, triangleStroke, lineStroke } from '../test/strokes';
import { inkAround, stadiumOutline, ovalOutline, diamondCorners, boxCorners, parallelogramCorners, handShape, diamondTopBottom, diamondLeftRight, boxInFour } from './fixtures/hand';

afterEach(() => {
  for (const n of registeredPorts()) unregisterPorts(n);
});

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const near = (a: Point, b: Point, tol: number) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
const arrow = (from: Point, to: Point, seed = 7, extra: Parameters<typeof handArrow>[2] = {}) => handArrow(from, to, { wings: 2, headLen: 16, seed, jitter: 1, ...extra });

function symbolOf(r: NotationReading, ids: readonly string[]): NotationSymbol {
  const found = r.symbols.find((x) => sameSet(x.ids, ids));
  if (!found) throw new Error(`no symbol drawn with ${ids.join(', ')} — symbols: ${r.symbols.map((x) => `${x.symbol}[${x.ids}]`).join(' ')}`);
  return found;
}

function read(s: Session, ids?: string[]): NotationReading {
  const r = readFlowchart(s.getState(), ids);
  if (!r) throw new Error('no flowchart reading');
  return r;
}

/**
 * A process above, the mark under test below it, and an arrow from one to the
 * other: the least a flowchart needs to be read at all. `draw` puts the mark
 * under test on the board and returns its ids; `top` is where its top is.
 */
function underABox(draw: (s: Session, at: number) => string[], top: number) {
  const s = createSession();
  const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 91 }), 1000);
  const f = s.addStroke(arrow({ x: 200, y: 139 }, { x: 200, y: top - 4 }), 5000);
  const x = draw(s, 9000);
  return { s, a, f, x };
}

describe('symbols', () => {
  it('an upright box is a process', () => {
    const { s, x } = underABox((s, at) => [s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 2 }), at)], 285);
    const sym = symbolOf(read(s), x);
    expect(sym).toMatchObject({ symbol: 'process', role: 'node' });
    expect(sym.confidence).toBeGreaterThanOrEqual(0.6);
    expect(sym.reason).toMatch(/upright/);
  });

  it('the trap: a box drawn a little tilted stays a process', () => {
    for (const tilt of [-12, -8, -4, 3, 6, 9, 12]) {
      const { s, x } = underABox((s, at) => [s.addStroke(handShape(boxCorners(200, 320, 160, 70, tilt), { seed: 3 + tilt }), at)], 286);
      const sym = symbolOf(read(s), x);
      expect(sym.symbol, `tilted ${tilt}°`).toBe('process');
      const decision = sym.readings.find((r) => r.symbol === 'decision');
      expect(decision?.confidence ?? 0, `tilted ${tilt}°`).toBeLessThan(0.2);
    }
  });

  it('a diamond in one stroke is a decision, known from its corners — flat or square, which the rung reads as a circle or a box', () => {
    for (const [w, h] of [[180, 110], [140, 140], [200, 100]]) {
      const { s, x } = underABox((s, at) => [s.addStroke(handShape(diamondCorners(200, 330, w, h), { seed: w + h }), at)], 330 - h / 2);
      const sym = symbolOf(read(s), x);
      expect(sym, `${w}×${h}`).toMatchObject({ symbol: 'decision', role: 'node' });
      expect(sym.reason).toMatch(/45°/);
      expect(sym.confidence).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('a diamond in two strokes — its top half and its bottom half — is one decision', () => {
    const { s, x } = underABox((s, at) => {
      const [top, bottom] = diamondTopBottom(diamondCorners(200, 330, 160, 100), { seed: 5, jitter: 1 });
      return [s.addStroke(top, at), s.addStroke(bottom, at + 1000)];
    }, 280);
    const r = read(s);
    const sym = symbolOf(r, x);
    expect(sym.symbol).toBe('decision');
    for (const id of x) expect(r.roles[id]).toBe('node');
    // Neither half is a flow of its own.
    expect(r.connectors.some((c) => x.includes(c.id))).toBe(false);
  });

  it('a diamond drawn as left and right halves, quickly, is gathered as a word by the letter rules — and still read as a decision', () => {
    const { s, x } = underABox((s, at) => {
      const [left, right] = diamondLeftRight(diamondCorners(200, 330, 160, 100), { seed: 6, jitter: 1 });
      return [s.addStroke(left, at), s.addStroke(right, at + 800)];
    }, 280);
    const st = s.getState();
    // The letter rules (session.ts) see two small strokes side by side on one band, a second apart.
    const word = st.contentIds.find((id) => isWord(st.nodes.get(id)!));
    expect(word).toBeDefined();
    expect(lettersOf(st.nodes.get(word!)!)).toEqual(x);
    // The notation reads the word's two strokes meeting end to end.
    const sym = symbolOf(read(s), x);
    expect(sym).toMatchObject({ id: word, symbol: 'decision' });
    expect(sym.reason).toMatch(/word/);
  });

  it('an elongated round-ended form is a terminator: a stadium, and an oval', () => {
    const stadium = underABox((s, at) => [s.addStroke(inkAround(stadiumOutline(200, 320, 170, 56), { seed: 8 }), at)], 292);
    expect(symbolOf(read(stadium.s), stadium.x)).toMatchObject({ symbol: 'terminator', role: 'node' });
    const oval = underABox((s, at) => [s.addStroke(inkAround(ovalOutline(200, 320, 170, 64), { seed: 9 }), at)], 288);
    expect(symbolOf(read(oval.s), oval.x).symbol).toBe('terminator');
  });

  it('a parallelogram is data', () => {
    const { s, x } = underABox((s, at) => [s.addStroke(handShape(parallelogramCorners(200, 320, 180, 64, 28), { seed: 10 }), at)], 288);
    const sym = symbolOf(read(s), x);
    expect(sym).toMatchObject({ symbol: 'data', role: 'node' });
    expect(sym.reason).toMatch(/lean/);
  });

  it('a box ruled in four strokes is a process', () => {
    const { s, x } = underABox((s, at) => boxInFour(boxCorners(200, 320, 160, 70), { seed: 11 }).map((pts, i) => s.addStroke(pts, at + i * 1000)), 285);
    expect(symbolOf(read(s), x).symbol).toBe('process');
  });

  it('small circles: one a flow leaves is the start, one a flow arrives at is the end', () => {
    const s = createSession();
    const start = s.addStroke(handCircle(200, -60, 12, { seed: 12, jitter: 1 }), 1000);
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 13 }), 5000);
    const end = s.addStroke(handCircle(200, 272, 12, { seed: 14, jitter: 1 }), 9000);
    s.addStroke(arrow({ x: 200, y: -46 }, { x: 200, y: 61 }, 15), 13000);
    s.addStroke(arrow({ x: 200, y: 139 }, { x: 200, y: 257 }, 16), 17000);
    const r = read(s);
    expect(symbolOf(r, [start]).symbol).toBe('start');
    expect(symbolOf(r, [end]).symbol).toBe('end');
    expect(symbolOf(r, [a]).symbol).toBe('process');
  });
});

describe('flows', () => {
  it('an arrow is a directed flow from the symbol at its tail to the one past its head', () => {
    const { s, a, f, x } = underABox((s, at) => [s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 17 }), at)], 285);
    const r = read(s);
    const flow = r.connectors.find((c) => c.id === f)!;
    expect(flow).toMatchObject({ kind: 'flow', role: 'edge', directed: true, direction: 'forward', from: a, to: x[0] });
    expect(flow.ends.to.head?.kind).toBe('arrow');
    expect(r.roles[f]).toBe('edge');
  });

  it('an arrow drawn head first is read by its head, not by the order it was drawn', () => {
    const s = createSession();
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 18 }), 1000);
    const x = s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 19 }), 5000);
    // Pointing down at x, drawn from its head up to its tail.
    const f = s.addStroke(arrow({ x: 200, y: 281 }, { x: 200, y: 139 }, 20, { headAt: 'start' }), 9000);
    expect(headsOf(s.getState(), f)!.start.heads[0]?.kind).toBe('arrow');
    expect(read(s).connectors.find((c) => c.id === f)).toMatchObject({ from: a, to: x, directed: true });
  });

  it('a line with no head joins two symbols, undirected, in the order it was drawn', () => {
    const s = createSession();
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 21 }), 1000);
    const x = s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 22 }), 5000);
    const f = s.addStroke(handLine({ x: 200, y: 139 }, { x: 200, y: 281 }, { seed: 23, jitter: 1 }), 9000);
    const flow = read(s).connectors.find((c) => c.id === f)!;
    expect(flow).toMatchObject({ direction: 'none', directed: false, from: a, to: x });
    expect(flow.reason).toMatch(/no head/);
  });

  it('past the head: a head drawn apart is part of the flow, which lands on the symbol beyond its tip', () => {
    const s = createSession();
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 24 }), 1000);
    const x = s.addStroke(handShape(boxCorners(200, 305, 160, 70), { seed: 25 }), 5000);
    // The line stops thirty short of x; a small hollow triangle, drawn first, carries it the rest of the way.
    const head = s.addStroke(triangleStroke({ x: 189, y: 240 }, { x: 211, y: 240 }, { x: 200, y: 263 }, 16), 9000);
    const f = s.addStroke(lineStroke({ x: 200, y: 139 }, { x: 200, y: 240 }), 13000);
    const st = s.getState();
    // The session's own wire stops at the head (E3's note)…
    expect(st.nodes.get(f)!.edges.filter((e) => e.rel === 'connects').map((e) => e.to)).toContain(head);
    // …the flowchart looks past it.
    const r = read(s);
    const flow = r.connectors.find((c) => c.id === f)!;
    expect(flow).toMatchObject({ from: a, to: x, directed: true });
    expect(flow.ids).toEqual(expect.arrayContaining([f, head]));
    expect(flow.ends.to.head).toMatchObject({ kind: 'triangle', filled: false });
    expect(r.roles[head]).toBe('edge');
    expect(r.symbols.some((y) => y.ids.includes(head))).toBe(false);
  });

  it('a small start dot reads as a circle head to heads.ts; the flowchart decides it is the start', () => {
    const s = createSession();
    const dot = s.addStroke(handCircle(200, -60, 10, { seed: 26, jitter: 1 }), 1000);
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 27 }), 5000);
    const f = s.addStroke(arrow({ x: 200, y: -49 }, { x: 200, y: 61 }, 28), 9000);
    expect(headsOf(s.getState(), f)!.start.heads[0]?.kind).toBe('circle');
    const r = read(s);
    expect(symbolOf(r, [dot]).symbol).toBe('start');
    expect(r.connectors.find((c) => c.id === f)).toMatchObject({ from: dot, to: a, directed: true });
  });

  it('a line whose ends both lie inside one box joins nothing', () => {
    const { s, x, f } = underABox((s, at) => [s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 29 }), at)], 285);
    const inner = s.addStroke(handLine({ x: 150, y: 320 }, { x: 250, y: 320 }, { seed: 30, jitter: 1 }), 20000);
    const r = read(s);
    expect(r.connectors.map((c) => c.id)).toEqual([f]);
    expect(r.roles[inner]).not.toBe('edge');
    expect(symbolOf(r, x).symbol).toBe('process');
  });

  it('a flow a magnet bound lands where it was bound, though its ink stops short', () => {
    const s = createSession();
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 31 }), 1000);
    const x = s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 32 }), 5000);
    const f = s.addStroke(arrow({ x: 200, y: 139 }, { x: 200, y: 232 }, 33), 9000);
    s.bind({ strokeId: f, nodeId: x, site: { kind: 'middle', index: 0 }, end: 'end', at: 9001 });
    const flow = read(s).connectors.find((c) => c.id === f)!;
    expect(flow).toMatchObject({ from: a, to: x });
    expect(flow.ends.to.bound).toBe(true);
    expect(flow.ends.to.reason).toMatch(/magnet/);
  });
});

/** A decision with a flow leaving each side vertex, "yes" beside the left one and "no" beside the right. */
function yesNo() {
  const s = createSession();
  const pa = s.addStroke(handShape(boxCorners(300, 120, 160, 70), { seed: 41 }), 1000);
  const q = s.addStroke(handShape(diamondCorners(300, 300, 180, 110), { seed: 42 }), 5000);
  const pb = s.addStroke(handShape(boxCorners(130, 460, 160, 70), { seed: 43 }), 9000);
  const pc = s.addStroke(handShape(boxCorners(470, 460, 160, 70), { seed: 44 }), 13000);
  const f0 = s.addStroke(arrow({ x: 300, y: 159 }, { x: 300, y: 241 }, 45), 17000);
  const fl = s.addStroke(arrow({ x: 206, y: 304 }, { x: 134, y: 421 }, 46), 21000);
  const fr = s.addStroke(arrow({ x: 394, y: 304 }, { x: 466, y: 421 }, 47), 25000);
  const yes = s.addStroke(handText(128, 341, 44, 18, { seed: 48, humps: 3, jitter: 1 }), 29000);
  const no = s.addStroke(handText(433, 342, 34, 16, { seed: 49, humps: 3, jitter: 1 }), 33000);
  const inQ = s.addStroke(handText(272, 290, 56, 20, { seed: 50, humps: 3, jitter: 1 }), 37000);
  return { s, pa, q, pb, pc, f0, fl, fr, yes, no, inQ };
}

describe('labels', () => {
  it('writing inside a symbol labels it', () => {
    const { s, q, inQ } = yesNo();
    const r = read(s);
    expect(r.labels.find((l) => l.id === inQ)).toMatchObject({ of: q, where: 'inside', role: 'label' });
    expect(symbolOf(r, [q]).labels).toContain(inQ);
    expect(r.roles[inQ]).toBe('label');
    // A decision with its question written in it is still a node, not a container.
    expect(r.roles[q]).toBe('node');
  });

  it('writing beside a flow labels that flow — the yes and the no of a decision', () => {
    const { s, fl, fr, yes, no } = yesNo();
    const r = read(s);
    expect(r.labels.find((l) => l.id === yes)).toMatchObject({ of: fl, where: 'beside' });
    expect(r.labels.find((l) => l.id === no)).toMatchObject({ of: fr, where: 'beside' });
    expect(r.connectors.find((c) => c.id === fl)!.labels).toEqual([yes]);
    expect(r.connectors.find((c) => c.id === fr)!.labels).toEqual([no]);
  });

  it('what the writing says, once somebody has read it', () => {
    const { s, yes } = yesNo();
    const pid = s.join('agent', 'llm:seeing', 40000, 2);
    s.propose({ participantId: pid, nodeId: yes, edges: [], reps: [{ modality: 'transcript', data: { text: 'yes' }, confidence: 0.9 }], at: 40100 });
    expect(read(s).labels.find((l) => l.id === yes)!.text).toBe('yes');
  });
});

describe('ports, through E3’s hook', () => {
  const portsOn = (s: Session, id: string) => magnetSites(s.getState().nodes.get(id)!, s.getState().nodes).filter((x) => x.kind === 'port:flowchart' || x.kind === 'along:flowchart');

  it('not offered, the pen feels what it felt before', () => {
    const { s, q } = yesNo();
    expect(portsOn(s, q)).toEqual([]);
  });

  it('offered, a decision’s four vertices reach the pen — top, right, bottom, left', () => {
    offerPorts('flowchart');
    const { s, q } = yesNo();
    const ports = portsOn(s, q);
    expect(ports.map((p) => p.kind)).toEqual(['port:flowchart', 'port:flowchart', 'port:flowchart', 'port:flowchart']);
    expect(ports.map((p) => p.port)).toEqual(['top', 'right', 'bottom', 'left']);
    diamondCorners(300, 300, 180, 110).forEach((corner, i) => expect(near(ports[i].point, corner, 9), ports[i].port).toBe(true));
    expect(ports[0].reasoning).toMatch(/decision/);
  });

  it('a process offers its edge middles; a terminator its two ends and its two sides', () => {
    offerPorts('flowchart');
    const s = createSession();
    const p = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 51 }), 1000);
    const t = s.addStroke(inkAround(stadiumOutline(200, 320, 170, 56), { seed: 52 }), 5000);
    const box = portsOn(s, p);
    expect(box.map((x) => x.port)).toEqual(['top', 'right', 'bottom', 'left']);
    [{ x: 200, y: 65 }, { x: 280, y: 100 }, { x: 200, y: 135 }, { x: 120, y: 100 }].forEach((m, i) => expect(near(box[i].point, m, 8), box[i].port).toBe(true));
    const ends = portsOn(s, t).filter((x) => x.kind === 'port:flowchart');
    expect(ends.map((x) => x.port)).toEqual(['left end', 'right end']);
    expect(near(ends[0].point, { x: 115, y: 320 }, 8)).toBe(true);
    expect(near(ends[1].point, { x: 285, y: 320 }, 8)).toBe(true);
    const sides = portsOn(s, t).filter((x) => x.kind === 'along:flowchart');
    expect([...new Set(sides.map((x) => x.port))]).toEqual(['top side', 'bottom side']);
  });

  it('the reading carries the ports the pen feels', () => {
    offerPorts('flowchart');
    const { s, q } = yesNo();
    const sym = symbolOf(read(s), [q]);
    expect(sym.ports.map((p) => p.name)).toEqual(['top', 'right', 'bottom', 'left']);
    portsOn(s, q).forEach((site, i) => expect(near(site.point, sym.ports[i].at!, 1e-6)).toBe(true));
  });

  it('a two-stroke decision offers its four vertices once, from one of its strokes', () => {
    offerPorts('flowchart');
    const s = createSession();
    const [top, bottom] = diamondTopBottom(diamondCorners(200, 330, 160, 100), { seed: 53, jitter: 1 });
    const ids = [s.addStroke(top, 1000), s.addStroke(bottom, 2000)];
    const ports = ids.flatMap((id) => portsOn(s, id));
    expect(ports.map((x) => x.port)).toEqual(['top', 'right', 'bottom', 'left']);
  });

  it('offered, the hook never asks itself without end: halves bound to each other’s ports still read as one decision', () => {
    offerPorts('flowchart');
    const s = createSession();
    const [top, bottom] = diamondTopBottom(diamondCorners(200, 330, 160, 100), { seed: 57, jitter: 1 });
    const a = s.addStroke(top, 1000);
    const b = s.addStroke(bottom, 2000);
    // The bottom half's ends tied to the decision's left and right vertices, which the top half offers.
    const offeredBy = [a, b].find((id) => portsOn(s, id).length)!;
    const vertex = (name: string) => portsOn(s, offeredBy).find((x) => x.port === name)!;
    s.bind({ strokeId: b, nodeId: offeredBy, site: { kind: 'port:flowchart', index: vertex('left').index }, end: 'start', at: 2001 });
    s.bind({ strokeId: b, nodeId: offeredBy, site: { kind: 'port:flowchart', index: vertex('right').index }, end: 'end', at: 2002 });
    const p = s.addStroke(handShape(boxCorners(200, 120, 160, 70), { seed: 58 }), 6000);
    s.addStroke(arrow({ x: 200, y: 159 }, { x: 200, y: 276 }, 59), 10000);
    expect(symbolOf(read(s), [a, b]).symbol).toBe('decision');
    expect(symbolOf(read(s), [p]).symbol).toBe('process');
  });

  it('a flow released on a decision’s vertex binds there, and the reading says so', () => {
    offerPorts('flowchart');
    const s = createSession();
    const q = s.addStroke(handShape(diamondCorners(300, 300, 180, 110), { seed: 54 }), 1000);
    const p = s.addStroke(handShape(boxCorners(80, 460, 120, 60), { seed: 55 }), 5000);
    // Drawn from the box up to where the pen felt the decision's left vertex.
    const hit = nearestMagnet({ x: 214, y: 303 }, magnetSites(s.getState().nodes.get(q)!, s.getState().nodes), 14)!;
    expect(hit.site).toMatchObject({ kind: 'port:flowchart', port: 'left' });
    const f = s.addStroke(arrow({ x: 84, y: 426 }, hit.site.point, 56), 9000);
    s.bind({ strokeId: f, nodeId: q, site: { kind: hit.site.kind, index: hit.site.index }, end: 'end', at: 9001 });
    const flow = read(s).connectors.find((c) => c.id === f)!;
    expect(flow).toMatchObject({ from: p, to: q });
    expect(flow.ends.to).toMatchObject({ bound: true });
  });
});

/** Three processes, one decision and five flows. */
function fiveFlows() {
  const s = createSession();
  let t = 0;
  const at = () => (t += 4000);
  const pa = s.addStroke(handShape(boxCorners(300, 100, 160, 70), { seed: 61 }), at());
  const q = s.addStroke(handShape(diamondCorners(300, 290, 180, 110), { seed: 62 }), at());
  const pb = s.addStroke(handShape(boxCorners(120, 470, 160, 70), { seed: 63 }), at());
  const pc = s.addStroke(handShape(boxCorners(480, 470, 160, 70), { seed: 64 }), at());
  const flows = [
    s.addStroke(arrow({ x: 300, y: 139 }, { x: 300, y: 231 }, 65), at()),
    s.addStroke(arrow({ x: 206, y: 294 }, { x: 124, y: 431 }, 66), at()),
    s.addStroke(arrow({ x: 394, y: 294 }, { x: 476, y: 431 }, 67), at()),
    s.addStroke(arrow({ x: 204, y: 470 }, { x: 396, y: 470 }, 68), at()),
    s.addStroke(arrow({ x: 540, y: 431 }, { x: 384, y: 100 }, 69), at()),
  ];
  return { s, pa, q, pb, pc, flows };
}

describe('the reading', () => {
  it('says what it saw: a flowchart — three processes, one decision, five flows', () => {
    const { s, pa, q, pb, pc, flows } = fiveFlows();
    const r = read(s);
    expect(r.notation).toBe('flowchart');
    expect(r.summary).toBe('three processes, one decision, five flows');
    expect(describeNotation(r)).toBe(`a flowchart ${r.confidence.toFixed(2)} — three processes, one decision, five flows`);
    expect(r.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(r.counts).toMatchObject({ process: 3, decision: 1, flow: 5 });
    const pairs = flows.map((id) => {
      const c = r.connectors.find((x) => x.id === id)!;
      return [c.from, c.to];
    });
    expect(pairs).toEqual([[pa, q], [q, pb], [q, pc], [pb, pc], [pc, pa]]);
    expect(r.unplaced).toEqual([]);
  });

  it('every mark plays one of the six roles, and the notation adds none', () => {
    const { s, flows, q } = fiveFlows();
    const r = read(s);
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(r.roles[q]).toBe('node');
    for (const f of flows) expect(r.roles[f]).toBe('edge');
  });

  it('derived: reading writes nothing, and a replay reads the same', () => {
    const { s } = fiveFlows();
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const first = read(s);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
    expect(read(s)).toEqual(first);
    const again = createSession();
    again.load(s.getEvents());
    expect(read(again)).toEqual(first);
  });

  it('a scope reads only what it holds', () => {
    const { s, pa, q, flows } = fiveFlows();
    const r = read(s, [pa, q, flows[0]]);
    expect(r.symbols.map((x) => x.id).sort()).toEqual([pa, q].sort());
    expect(r.connectors.map((c) => c.id)).toEqual([flows[0]]);
    expect(Object.keys(r.roles).sort()).toEqual([pa, q, flows[0]].sort());
  });

  it('boxes with nothing joining them are no flowchart', () => {
    const s = createSession();
    s.addStroke(handShape(boxCorners(100, 100, 160, 70), { seed: 71 }), 1000);
    s.addStroke(handShape(boxCorners(300, 100, 160, 70), { seed: 72 }), 5000);
    expect(readFlowchart(s.getState())).toBeNull();
  });
});
