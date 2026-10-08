// The synthetic corpus, in every outline style (V1-SPEC IN1, red first): at least 95% faithful, every shape reading as
// its source did, every stroke keeping the colour it was drawn in, stroked paths exact, and millimetres, inches and
// points arriving at the hand's scale. The corpus is made by `fixtures/corpus.ts` from the engine's own shapes, so what
// every stroke should come back as is known; nothing in it is anyone's ink.

import { describe, it, expect } from 'vitest';
import { corpus, sample, hardFigures, mergedSvg, STYLES, SHAPES, type Sample, type Style } from './fixtures/corpus';
import { ingestSvg } from './svg';
import { sha256Hex } from './sha256';
import { analyzeStroke } from '../recognition';
import type { InkDocument, InkStroke } from './source';
import type { Point } from '../types';

const lengthOf = (pts: Point[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
function off(p: Point, path: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

function read(s: Sample): InkDocument {
  const bytes = new TextEncoder().encode(s.svg);
  const r = ingestSvg(bytes, s.name, sha256Hex(bytes));
  if (!r.ok) throw new Error(`${s.name} was refused: ${r.reason}`);
  return r.doc;
}

/** The strokes of each outline, in paint order: outline i is truth i. */
function byOutline(doc: InkDocument): InkStroke[][] {
  const groups = new Map<number, InkStroke[]>();
  for (const s of doc.pages[0].strokes) groups.set(s.outline, [...(groups.get(s.outline) ?? []), s]);
  return [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k)!);
}

const SEEDS = [1, 2, 3, 4];
const samples = corpus(SEEDS, 24);

describe('the corpus is what it says', () => {
  it('has every style and every shape, and each source line reads as the shape it was drawn as', () => {
    expect(new Set(samples.map((s) => s.style))).toEqual(new Set(STYLES));
    expect(new Set(samples.flatMap((s) => s.truth.map((t) => t.shape)))).toEqual(new Set(SHAPES));
    for (const s of samples) for (const t of s.truth) expect(t.reads).toBe(t.shape);
  });

  it('is the same on every call', () => {
    expect(sample('inkspace', 3).svg).toBe(sample('inkspace', 3).svg);
    expect(sample('inkspace', 3).svg).not.toBe(sample('inkspace', 4).svg);
  });
});

describe.each(STYLES)('the %s style', (style: Style) => {
  const mine = samples.filter((s) => s.style === style);
  const docs = mine.map((s) => ({ s, doc: read(s) }));

  it('comes in as ink, with every outline there and none made up', () => {
    for (const { s, doc } of docs) {
      expect(doc.pages[0].width).toBeCloseTo(s.page.width, 0);
      expect(doc.pages[0].height).toBeCloseTo(s.page.height, 0);
      expect(doc.reading.as).toBe('ink');
      expect(byOutline(doc)).toHaveLength(s.truth.length);
    }
  });

  it('is at least 95% faithful', () => {
    let n = 0, faithful = 0;
    for (const { doc } of docs) for (const group of byOutline(doc)) {
      n++;
      if (group.every((st) => st.recovery === 'stroke' || st.fidelity?.faithful)) faithful++;
    }
    expect(n).toBeGreaterThan(90);
    expect(faithful / n).toBeGreaterThanOrEqual(0.95);
  });

  it('reads as its source did: the shape rung’s top reading of the recovered stroke is the source’s', () => {
    const wrong: string[] = [];
    for (const { s, doc } of docs) {
      byOutline(doc).forEach((group, i) => {
        const longest = [...group].sort((a, b) => lengthOf(b.points) - lengthOf(a.points))[0];
        const got = analyzeStroke(longest.points).results[0]?.type;
        if (got !== s.truth[i].reads) wrong.push(`${s.name} #${i}: ${s.truth[i].shape} read as ${got}`);
      });
    }
    expect(wrong).toEqual([]);
  });

  it('keeps the colour of every stroke, as the source drew it', () => {
    for (const { s, doc } of docs) byOutline(doc).forEach((group, i) => { for (const st of group) expect(st.color).toBe(s.truth[i].color); });
  });

  it('lands each stroke on the line the pen followed, within half a pen and a little', () => {
    for (const { s, doc } of docs) {
      byOutline(doc).forEach((group, i) => {
        const t = s.truth[i];
        const slack = t.strokeWidth !== undefined ? 1e-6 : 0.5 * t.width * 1.4 + 2;
        for (const st of group) for (const p of st.points) expect(off(p, t.source)).toBeLessThan(slack);
      });
    }
  });

  it('gives each stroke the width of its pen', () => {
    for (const { s, doc } of docs) {
      byOutline(doc).forEach((group, i) => {
        const t = s.truth[i];
        const want = t.strokeWidth ?? t.width;
        for (const st of group) {
          expect(st.width).toBeGreaterThan(want * 0.6);
          expect(st.width).toBeLessThan(want * 1.4);
        }
      });
    }
  });

  it('numbers the strokes in the order they were painted', () => {
    for (const { doc } of docs) {
      const orders = doc.pages[0].strokes.map((st) => st.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(new Set(orders).size).toBe(orders.length);
    }
  });
});

describe('what only some styles have', () => {
  it('stroked paths are exact, through inches, a scale and a move: every recovered point is on the source line', () => {
    for (const s of samples.filter((x) => x.style === 'stroked')) {
      const doc = read(s);
      byOutline(doc).forEach((group, i) => {
        expect(group).toHaveLength(1);
        expect(group[0].recovery).toBe('stroke');
        expect(group[0].fidelity).toBeUndefined();
        for (const p of group[0].points) expect(off(p, s.truth[i].source)).toBeLessThan(1e-6);
        // …and every source point is within a gap of the recovered line.
        for (const p of s.truth[i].source) expect(off(p, group[0].points)).toBeLessThan(1e-6);
        expect(group[0].width).toBeCloseTo(s.truth[i].strokeWidth!, 6);
      });
    }
  });

  it('millimetres (the Inkspace style) and points (the OneNote style) arrive as CSS pixels', () => {
    expect(read(sample('inkspace', 1)).pages[0].width).toBeCloseTo(793.7, 1);
    expect(read(sample('onenote', 1)).pages[0].width).toBeCloseTo(816, 6);
    expect(read(sample('stroked', 1)).pages[0].width).toBeCloseTo(816, 6);
  });

  it('a whiteboard’s clones are read once and moved, its masks are skipped and said, its pictures come with their bytes', () => {
    const s = sample('whiteboard', 2);
    const bytes = new TextEncoder().encode(s.svg);
    const r = ingestSvg(bytes, s.name, sha256Hex(bytes));
    if (!r.ok) throw new Error(r.reason);
    const clones = r.doc.reading.evidence.clones, read1 = r.doc.reading.evidence.outlinesRead;
    expect(clones).toBe(s.truth.length);
    expect(read1).toBeLessThan(clones);
    expect(read1).toBe(s.truth.length - Math.max(2, Math.floor(24 / 4)));
    expect(r.notes.join(' ')).toMatch(/mask/i);
    expect(r.doc.pages[0].pictures).toHaveLength(2);
    expect(r.doc.pages[0].pictures.every((p) => p.mime === 'image/png' && p.bytes && p.bytes.length > 50)).toBe(true);
  });

  it('an Illustrator file says what made it', () => {
    expect(read(sample('illustrator', 1)).source.tool).toMatch(/Illustrator/);
  });
});

describe('figures whose strokes cross or merge — the hard material', () => {
  const figures = [1, 2, 3].flatMap((seed) => hardFigures(seed));

  it('are at least 90% faithful, whole, in the colour they came in', () => {
    let n = 0, faithful = 0;
    for (const m of figures) {
      const bytes = new TextEncoder().encode(mergedSvg(m, '#0057b8'));
      const r = ingestSvg(bytes, `${m.name}.svg`, sha256Hex(bytes));
      if (!r.ok) throw new Error(r.reason);
      for (const st of r.doc.pages[0].strokes) {
        n++;
        expect(st.color).toBe('#0057b8');
        if (st.fidelity?.faithful) faithful++;
      }
    }
    expect(n).toBeGreaterThan(20);
    expect(faithful / n).toBeGreaterThanOrEqual(0.9);
  });

  it('cover what the strokes drew: every point of every stroke is within a pen and a half of a recovered line', () => {
    for (const m of figures) {
      const bytes = new TextEncoder().encode(mergedSvg(m));
      const r = ingestSvg(bytes, `${m.name}.svg`, sha256Hex(bytes));
      if (!r.ok) throw new Error(r.reason);
      const lines = r.doc.pages[0].strokes.map((st) => st.points);
      expect(lines.length).toBeGreaterThan(0);
      for (const p of m.strokes.flat()) expect(Math.min(...lines.map((l) => off(p, l)))).toBeLessThan(m.width * 1.5 + 2);
    }
  });
});
