// The garment pattern piece as a core test (V1-PLAN §0 A4, §9 M6): a panel of
// fabric outlined in one stroke, its grain line an arrow at both ends, two
// notches across its left edge, a dart standing on its top edge, and either a
// cutting line standing off it all round (a seam allowance) or a fold along
// its right edge — read as a garment pattern piece, above the floor and first
// among the readings, each mark as the thing it is. Asked through the
// platform's own doors (the index): the notation and its reading must be
// registered there.
//
// And the negatives, which matter as much: a box with an arrow in it, a card
// in a panel, a double-headed line alone, a tick alone read as no pattern piece
// above the floor; and the pattern board reads as none of the other diagrams.

import { describe, it, expect } from 'vitest';
import { createSession, describeNotation, notationsOf, NOTATION_FLOOR, readGarment, registeredNotations } from '../index';
import type { NotationReading, Session } from '../index';
import { drawGarment, GARMENT_VARIANTS, GARMENT_DART, GARMENT_SEAM_PX } from './fixtures/garment';
import type { GarmentExpected } from './fixtures/garment';
import { boxCorners, handShape } from './fixtures/hand';
import { handArrow, handLine } from '../test/strokes';

/** What this test reads of a symbol: the reading's own types are the notation's. */
interface Mark {
  id: string;
  ids: string[];
  symbol: string;
  role: string;
  piece?: string;
  heading?: number;
  along?: number;
  edge?: { side: number; at: number };
  width?: number;
  depth?: number;
  offset?: number;
  spread?: number;
  name?: { text?: string; ids: string[] };
}

const SLOW = 120_000;
const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const garmentOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'garment');
const marksOf = (r: NotationReading, symbol: string) => (r.symbols as unknown as Mark[]).filter((m) => m.symbol === symbol);

describe('M6 — a garment pattern piece: an outline with its grain line, notches, a dart, and a seam allowance or a fold', () => {
  it('is registered, reads through the index, and says what it is in the person’s words', () => {
    expect(registeredNotations()).toContain('garment');
    const s = createSession();
    drawGarment(s, GARMENT_VARIANTS[0]);
    const r = garmentOf(s)!;
    expect(r.name).toBe('Garment pattern piece');
    expect(describeNotation(r)).toMatch(/^a garment pattern piece 0\.\d\d — one piece: one grain line, two notches, one dart, a seam allowance$/);
    expect(readGarment(s.getState())!.confidence).toBeCloseTo(r.confidence, 9);
  });

  for (const v of GARMENT_VARIANTS) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt} ${v.grain} ${v.dart} ${v.edge}`;

    it(`reads as a garment pattern piece, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawGarment(s, v);
      const all = notationsOf(s.getState());
      const said = `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`;
      const g = all.find((r) => r.notation === 'garment');
      expect(g, said).toBeDefined();
      expect(g!.confidence, said).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation, said).toBe('garment');
    });

    it(`each mark is the thing it is, on the piece it is on, in a role of the six — ${label}`, () => {
      const s = createSession();
      const e: GarmentExpected = drawGarment(s, v);
      const r = garmentOf(s)!;
      expect(r).toBeDefined();
      const one = (symbol: string) => {
        const ms = marksOf(r, symbol);
        expect(ms, symbol).toHaveLength(1);
        return ms[0];
      };
      const piece = one('piece');
      expect(piece.id).toBe(e.piece);
      expect(piece.role).toBe('container');
      const grain = one('grain');
      expect(sameSet(grain.ids, e.grain), `grain ${grain.ids}`).toBe(true);
      expect(grain.piece).toBe(e.piece);
      // The line runs the way the piece stands, its heading within a few degrees of plumb less the page's tilt.
      expect(Math.abs((grain.heading ?? 0) - (90 + v.tilt)), `heading ${grain.heading}`).toBeLessThanOrEqual(6);
      expect(grain.along, 'parallel to a side of the piece').toBeDefined();
      const notches = marksOf(r, 'notch');
      expect(notches.map((n) => n.id).sort()).toEqual([...e.notches].sort());
      // Both on the one side of the piece, the upper before the lower.
      expect(new Set(notches.map((n) => n.edge!.side)).size).toBe(1);
      expect(notches.every((n) => n.piece === e.piece)).toBe(true);
      const dart = one('dart');
      expect(dart.id).toBe(e.dart);
      const want = Math.hypot(GARMENT_DART.base[1].x - GARMENT_DART.base[0].x, GARMENT_DART.base[1].y - GARMENT_DART.base[0].y);
      expect(dart.width!, 'a base of about fifty').toBeGreaterThan(want - 12);
      expect(dart.width!).toBeLessThan(want + 12);
      expect(dart.depth!, 'a point about 170 in').toBeGreaterThan(150);
      expect(dart.depth!).toBeLessThan(190);
      if (v.edge === 'seam') {
        const seam = one('seam');
        expect(seam.id).toBe(e.seam);
        expect(seam.piece).toBe(e.piece);
        expect(Math.abs(seam.offset! - GARMENT_SEAM_PX), `offset ${seam.offset}`).toBeLessThan(7);
        expect(seam.spread!).toBeLessThan(0.5);
        expect(marksOf(r, 'fold')).toHaveLength(0);
      } else {
        const fold = one('fold');
        expect(sameSet(fold.ids, e.fold!), `fold ${fold.ids}`).toBe(true);
        expect(marksOf(r, 'seam')).toHaveLength(0);
      }
      for (const m of r.symbols as unknown as Mark[]) expect(['container', 'annotation']).toContain(m.role);
      expect(r.unplaced, 'every mark is placed').toEqual([]);
      expect(r.connectors).toEqual([]);
      for (const id of e.all) expect(['container', 'annotation'], id).toContain(r.roles[id]);
    });
  }
});

describe('the writing inside a piece is its name', () => {
  it('a word a model that can see has read, inside the outline, names the piece', () => {
    const s = createSession();
    const e = drawGarment(s, GARMENT_VARIANTS[0]);
    // A scribbled word inside the piece, then read.
    const w = s.addStroke(handLine({ x: 170, y: 300 }, { x: 250, y: 302 }, { seed: 4, jitter: 1 }), 900_000);
    const pid = s.join('agent', 'llm:seeing', 900_100, 2);
    s.propose({ participantId: pid, nodeId: w, edges: [], reps: [{ modality: 'transcript', data: { text: 'FRONT' }, confidence: 0.9 }], at: 900_200 });
    const r = garmentOf(s)!;
    const piece = marksOf(r, 'piece')[0];
    expect(piece.id).toBe(e.piece);
    expect(piece.name!.text).toBe('FRONT');
    expect(piece.name!.ids).toEqual([w]);
  });
});

describe('what a pattern piece is not', () => {
  const stroke = (s: Session, pts: ReturnType<typeof handLine>, t: number) => s.addStroke(pts, t);
  const box = (s: Session, cx: number, cy: number, w: number, h: number, t: number, seed = 1) => stroke(s, handShape(boxCorners(cx, cy, w, h), { seed, jitter: 2, round: 0.04 }), t);

  it('a box with one arrow in it is a flow in a frame, not a grain line', () => {
    const s = createSession();
    box(s, 300, 340, 360, 520, 1000);
    stroke(s, handArrow({ x: 300, y: 150 }, { x: 300, y: 530 }, { seed: 3, headLen: 22 }), 5000);
    expect(readGarment(s.getState())).toBeNull();
  });

  it('a double-headed line with no outline round it is no grain line', () => {
    const s = createSession();
    stroke(s, handLine({ x: 300, y: 150 }, { x: 300, y: 530 }, { seed: 3 }), 1000);
    stroke(s, handArrow({ x: 300, y: 150 }, { x: 300, y: 530 }, { seed: 4, headLen: 22 }), 5000);
    stroke(s, handArrow({ x: 300, y: 530 }, { x: 300, y: 150 }, { seed: 5, headLen: 22 }), 9000);
    expect(readGarment(s.getState())).toBeNull();
  });

  it('a card in a panel — one box inside another, standing off it unevenly — is no seam allowance', () => {
    const s = createSession();
    box(s, 300, 340, 520, 400, 1000, 1);
    box(s, 380, 400, 260, 160, 5000, 2);
    const r = readGarment(s.getState());
    expect(r?.confidence ?? 0).toBeLessThan(NOTATION_FLOOR);
    expect(r?.symbols.filter((m) => m.symbol === 'seam') ?? []).toHaveLength(0);
  });

  it('a seam allowance alone, or a notch or two alone, is not enough to say a pattern piece: the grain line is what settles it', () => {
    for (const draw of [
      (s: Session) => { box(s, 300, 340, 360, 520, 1000); box(s, 300, 340, 416, 576, 5000, 2); },
      (s: Session) => { box(s, 300, 340, 360, 520, 1000); stroke(s, handLine({ x: 108, y: 250 }, { x: 134, y: 250 }, { seed: 3, jitter: 0.5 }), 5000); stroke(s, handLine({ x: 108, y: 420 }, { x: 134, y: 420 }, { seed: 4, jitter: 0.5 }), 9000); },
    ]) {
      const s = createSession();
      draw(s);
      expect(readGarment(s.getState())?.confidence ?? 0).toBeLessThan(NOTATION_FLOOR);
    }
  });

  it('a lone tick and a lone wedge inside no outline of a piece’s size read nothing', () => {
    const s = createSession();
    stroke(s, handLine({ x: 100, y: 100 }, { x: 126, y: 100 }, { seed: 3, jitter: 0.5 }), 1000);
    box(s, 400, 100, 50, 40, 5000);
    expect(readGarment(s.getState())).toBeNull();
  });
});

describe('the pattern board is no other diagram above the floor', () => {
  it('no flowchart, class, sequence, state, ER diagram or mind map', () => {
    const above: string[] = [];
    for (const v of GARMENT_VARIANTS) {
      const s = createSession();
      drawGarment(s, v);
      for (const r of notationsOf(s.getState())) if (r.notation !== 'garment' && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.notation} ${r.confidence.toFixed(2)}`);
    }
    expect(above).toEqual([]);
  }, SLOW);
});
