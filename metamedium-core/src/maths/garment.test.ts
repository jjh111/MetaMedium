// The garment maths (V1-PLAN §9 M6; MATHS-PLAN §1, §4): what the marks of a
// pattern piece mean in numbers, on the board and at true size.
//
// Pinned: a piece labelled 18 by 26 with a cutting line standing off it —
// the numbers in the gap between the two outlines are the piece's own — is cut
// at 19 by 27 and sewn at 18 by 26 when the page says ½″ of seam allowance
// (`Add ½″ seam allowance`, which the sheet already reads), and the page rules
// over the ink, whose cutting line stands 1.4″ off at the drawing's scale;
// with no page the ink's own offset at its scale says it, as the ink's; the
// numbers written outside the cutting line are its size, and the piece is sewn
// smaller — with the other reading said; a fold halves the piece — cut on the
// fold, opened it is twice as wide across it; and true size prints the cutting
// line dashed exactly the allowance out, the grain line at its length, the
// notches and the dart where they stand, the fold said, and leaves the marks'
// own strokes out of its list of what it could not draw.

import { describe, it, expect } from 'vitest';
import type { Bounds } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { drawGarment, GARMENT_VARIANTS } from '../notations/fixtures/garment';
import { rectStroke } from '../test/strokes';
import { boardMaths, mathsChips, mathsSaid } from './board';
import { trueSize } from './truesize';

function text(s: Session, code: string, box: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: box, code, at })!;
}

const seamVariant = { ...GARMENT_VARIANTS[0], tilt: 0 };
const foldVariant = { ...GARMENT_VARIANTS.find((v) => v.edge === 'fold')!, tilt: 0 };

/** The pattern piece, its numbers written where a hand writes them, and — when asked — the page that says the allowance. */
function pieceBoard(o: { numbers: 'gap' | 'outer' | 'above'; page?: boolean; fold?: boolean }) {
  const s = createSession();
  const e = drawGarment(s, o.fold ? foldVariant : seamVariant);
  if (o.numbers === 'gap') {
    text(s, '18″', { minX: 280, maxX: 320, minY: 55, maxY: 77 }, 40000);
    text(s, '26″', { minX: 94, maxX: 118, minY: 330, maxY: 350 }, 41000);
  } else if (o.numbers === 'outer') {
    text(s, '18″', { minX: 270, maxX: 330, minY: 8, maxY: 40 }, 40000);
    text(s, '26″', { minX: 20, maxX: 70, minY: 320, maxY: 360 }, 41000);
  } else {
    text(s, '18″', { minX: 270, maxX: 330, minY: 38, maxY: 68 }, 40000);
    text(s, '26″', { minX: 50, maxX: 100, minY: 320, maxY: 360 }, 41000);
  }
  if (o.page) text(s, 'Add ½″ seam allowance', { minX: 900, maxX: 1300, minY: 100, maxY: 130 }, 42000);
  return { s, e, board: boardMaths(s.getState())! };
}

const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;
const said = (lines: readonly string[]) => lines.join(' | ');

describe('the seam allowance: cutting size against sewing size', () => {
  it('numbers on the piece and a page saying ½″: cut at 19 × 27″, sewn at 18 × 26″, the page ruling over the ink’s 1.4″', () => {
    const { e, board } = pieceBoard({ numbers: 'gap', page: true });
    expect(board.garment).toHaveLength(1);
    const g = board.garment![0];
    expect(g.id).toBe(e.piece);
    expect(g.ids).toEqual(expect.arrayContaining(e.all));
    expect(g.figure).toMatchObject({ id: e.piece, on: 'sewing' });
    expect(g.unit).toBe('in');
    expect(g.seam).toBeDefined();
    expect(g.seam!.from).toBe('page');
    expect(near(g.seam!.amount, 0.5)).toBe(true);
    expect(g.seam!.sewn).toMatchObject({ width: 18, height: 26 });
    expect(near(g.seam!.cut!.width, 19) && near(g.seam!.cut!.height, 27)).toBe(true);
    expect(said(g.lines)).toContain('cut at 19 × 27″');
    expect(said(g.lines)).toContain('sewn at 18 × 26″');
    expect(said(g.lines)).toContain('½″');
    // The ink's own offset, at the drawing's scale, is said too, as the ink's — and disagrees.
    expect(g.seam!.ink).toBeGreaterThan(1.3);
    expect(g.seam!.ink).toBeLessThan(1.5);
    expect(said(g.lines)).toMatch(/the ink stands 1\.\d+″ off/);
  });

  it('numbers on the piece and no page: the ink’s own offset at its scale says the allowance, and says it is the ink’s', () => {
    const { board } = pieceBoard({ numbers: 'gap' });
    const g = board.garment![0];
    expect(g.figure!.on).toBe('sewing');
    expect(g.seam!.from).toBe('ink');
    expect(g.seam!.amount).toBeGreaterThan(1.3);
    expect(g.seam!.amount).toBeLessThan(1.5);
    expect(near(g.seam!.cut!.width, 18 + 2 * g.seam!.amount, 0.01)).toBe(true);
    expect(said(g.lines)).toMatch(/cut at 20\.\d+ × 28\.\d+″/);
    expect(said(g.lines)).toMatch(/as the ink draws it/);
  });

  it('numbers written outside the cutting line are its size: sewn at 17 × 25″, and if they are the finished size, cut at 19 × 27″', () => {
    const { e, board } = pieceBoard({ numbers: 'outer', page: true });
    const g = board.garment![0];
    expect(g.figure).toMatchObject({ on: 'cutting' });
    expect(g.figure!.id).not.toBe(e.piece);
    expect(g.seam!.cut).toMatchObject({ width: 18, height: 26 });
    expect(near(g.seam!.sewn!.width, 17) && near(g.seam!.sewn!.height, 25)).toBe(true);
    expect(said(g.lines)).toContain('cut at 18 × 26″');
    expect(said(g.lines)).toContain('sewn at 17 × 25″');
    expect(g.seam!.or).toBeDefined();
    expect(said([g.seam!.or!])).toContain('if 18 × 26″ is the finished size, cut at 19 × 27″');
  });

  it('the marks’ own numbers: the grain along the 26″ sides, two notches, a dart — in the piece’s units', () => {
    const { board } = pieceBoard({ numbers: 'gap', page: true });
    const g = board.garment![0];
    expect(g.grain!.text).toMatch(/grain runs along the 26″ sides/);
    expect(g.notches).toHaveLength(2);
    // On the left edge, 26″ long, at 170 and 340 of 520 from the top corner: 8.5 and 17″ — from the nearer corner, 8.5″ each.
    for (const n of g.notches) expect(n.side).toBeDefined();
    expect(g.darts).toHaveLength(1);
    // A base of about fifty on a scale of about 20 to the inch, and a point about 8.5″ in.
    expect(g.darts[0].width).toBeGreaterThan(2.2);
    expect(g.darts[0].width).toBeLessThan(2.8);
    expect(g.darts[0].depth).toBeGreaterThan(8);
    expect(g.darts[0].depth).toBeLessThan(9);
    expect(said(g.lines)).toMatch(/2 notches/);
    expect(said(g.lines)).toMatch(/a dart 2\.\d+″ wide and 8\.\d+″ long/);
  });
});

describe('a fold halves the piece', () => {
  it('cut on the fold: opened, twice as wide across it — 36″ where 18″ is drawn', () => {
    const { board } = pieceBoard({ numbers: 'above', fold: true });
    const g = board.garment![0];
    expect(g.fold).toBeDefined();
    expect(g.fold).toMatchObject({ drawn: 18, opened: 36 });
    expect(said(g.lines)).toContain('cut on the fold');
    expect(said(g.lines)).toContain('36″ across');
    expect(g.seam).toBeUndefined();
  });
});

describe('true size prints the piece’s marks', () => {
  it('the cutting line dashed exactly ½″ out all round, the grain line, both notches, the dart — and no mark of theirs left out', () => {
    const { e, board } = pieceBoard({ numbers: 'gap', page: true });
    const ts = trueSize(board);
    expect(ts.figures).toHaveLength(1);
    const f = ts.figures[0];
    expect(f.id).toBe(e.piece);
    const marks = f.garment!.marks;
    const kinds = marks.map((m) => m.kind).sort();
    expect(kinds).toEqual(['dart', 'grain', 'notch', 'notch', 'seam']);
    const seam = marks.find((m) => m.kind === 'seam')!;
    expect(seam.dashed).toBe(true);
    expect(seam.points).toHaveLength(4);
    const xs = seam.points.map((p) => p.x), ys = seam.points.map((p) => p.y);
    expect(near(Math.max(...xs) - Math.min(...xs), 19, 0.005)).toBe(true);
    expect(near(Math.max(...ys) - Math.min(...ys), 27, 0.005)).toBe(true);
    // Half an inch outside the piece on every side.
    const px = f.vertices.map((p) => p.x), py = f.vertices.map((p) => p.y);
    expect(near(Math.min(...px) - Math.min(...xs), 0.5, 0.005)).toBe(true);
    expect(near(Math.max(...xs) - Math.max(...px), 0.5, 0.005)).toBe(true);
    expect(near(Math.min(...py) - Math.min(...ys), 0.5, 0.005)).toBe(true);
    // The grain line runs the way the piece stands and about three quarters of its 26″.
    const grain = marks.find((m) => m.kind === 'grain')!;
    const shaft = [grain.points[0], grain.points[grain.points.length - 1]];
    expect(Math.abs(shaft[0].x - shaft[1].x)).toBeLessThan(0.3);
    expect(Math.abs(shaft[0].y - shaft[1].y)).toBeGreaterThan(18);
    expect(Math.abs(shaft[0].y - shaft[1].y)).toBeLessThan(20);
    // It is in the svg, dashed where it is the cutting line, and in what a print covers.
    expect(ts.svg).toContain('data-garment="grain"');
    expect(ts.svg).toMatch(/<path data-garment="seam"[^>]*stroke-dasharray/);
    expect(ts.print.markup).toContain('data-garment="grain"');
    // The strokes the marks are drawn with are not marks it could not draw.
    expect(ts.omitted).toEqual([]);
    expect(ts.notes.join(' ')).not.toMatch(/left out/);
  });

  it('a fold: the piece printed as drawn — half — the fold edge marked, and “cut on the fold, opened 36″ across” said', () => {
    const { board } = pieceBoard({ numbers: 'above', fold: true });
    const ts = trueSize(board);
    const f = ts.figures[0];
    const px = f.vertices.map((p) => p.x);
    expect(near(Math.max(...px) - Math.min(...px), 18, 0.005)).toBe(true);
    expect(f.garment!.marks.map((m) => m.kind)).toContain('fold');
    expect(ts.title).toContain('cut on the fold');
    expect(ts.notes.join(' ')).toContain('opened it is 36″ across');
    expect(ts.svg).toContain('data-garment="fold"');
  });
});

describe('what the board says of a piece, beside it and in the panel', () => {
  it('a chip beside the piece says cut and sewn; the panel says it in plain lines and each mark’s number behind details', () => {
    const { e, board } = pieceBoard({ numbers: 'gap', page: true });
    const chips = mathsChips(board).filter((c) => c.kind === 'garment');
    expect(chips.map((c) => c.text)).toContain('cut 19 × 27″ · sewn 18 × 26″');
    const chip = chips.find((c) => c.text.startsWith('cut'))!;
    expect(chip.ids).toEqual(expect.arrayContaining(e.all));
    expect(chip.standing).toBe(false);
    const said_ = mathsSaid(board, [e.grain[0]])!;
    expect(said_.lines.join(' ')).toContain('cut at 19 × 27″');
    expect(said_.rows.some((r) => /notch/.test(r.k + r.v))).toBe(true);
  });

  it('a board with no pattern piece has no garment maths, and a rectangle with numbers on it is unchanged', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 360, 520), 1000);
    text(s, '18″', { minX: 250, maxX: 310, minY: 60, maxY: 90 }, 40000);
    text(s, '26″', { minX: 30, maxX: 80, minY: 330, maxY: 370 }, 41000);
    const b = boardMaths(s.getState())!;
    expect(b.garment ?? []).toEqual([]);
    expect(mathsChips(b).filter((c) => c.kind === 'garment')).toEqual([]);
  });

  it('is derived only: reading it writes nothing to the log', () => {
    const { s } = pieceBoard({ numbers: 'gap', page: true });
    const before = s.getEvents().length;
    const b = boardMaths(s.getState())!;
    trueSize(b);
    mathsChips(b);
    expect(s.getEvents().length).toBe(before);
  });
});
