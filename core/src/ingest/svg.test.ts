// The SVG adapter (V1-SPEC IN1): paths, transforms, clones, units, paint, pen-shaped fills, and files that are not
// what they say. Every figure here is small enough to know where each point belongs.

import { describe, it, expect } from 'vitest';
import { ingestSvg } from './svg';
import { sha256Hex } from './sha256';
import type { InkDocument, InkStroke, IngestResult, IngestLimits } from './source';
import { penOutline } from './fixtures/pen';
import { makePng, toBase64 } from './fixtures/png';
import { analyzeStroke } from '../recognition';
import type { Point } from '../types';
import { mulberry32 } from '../packs/synthesize';

const enc = (s: string) => new TextEncoder().encode(s);
const svg = (body: string, attrs = 'width="200" height="100" viewBox="0 0 200 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ${attrs}>${body}</svg>`;
const read = (text: string, limits?: Partial<IngestLimits>): IngestResult => {
  const bytes = enc(text);
  return ingestSvg(bytes, 'test.svg', sha256Hex(bytes), { limits });
};
const ok = (r: IngestResult): { doc: InkDocument; notes: string[] } => {
  if (!r.ok) throw new Error('refused: ' + r.reason);
  return r;
};
const strokes = (text: string, limits?: Partial<IngestLimits>): InkStroke[] => ok(read(text, limits)).doc.pages[0].strokes;
const pen = (d: string, extra = '') => `<path d="${d}" fill="none" stroke="#000000" stroke-width="2" ${extra}/>`;

/** How far a point stands from a polyline given as [x, y] pairs. */
function offPath(p: Point, path: number[][]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy)));
  }
  return best;
}
const near = (pts: Point[], x: number, y: number, tol = 1e-6) => pts.some((p) => Math.hypot(p.x - x, p.y - y) <= tol);
const bounds = (pts: Point[]) => ({ minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)), minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)) });
const lengthOf = (pts: Point[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

describe('the document it makes', () => {
  it('says where it came from: the hash of the bytes, the name, the format', () => {
    const text = svg(pen('M10 10 L90 10'));
    const { doc } = ok(read(text));
    expect(doc.source.hash).toBe(sha256Hex(enc(text)));
    expect(doc.source.name).toBe('test.svg');
    expect(doc.source.format).toBe('svg');
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].width).toBe(200);
    expect(doc.pages[0].height).toBe(100);
  });

  it('is the same document the second time', () => {
    const text = svg(pen('M10 10 C 40 80 80 80 110 10') + `<path d="${penD()}" fill="#223344"/>`);
    expect(read(text)).toEqual(read(text));
  });
});

function penD(): string {
  const ring = penOutline(Array.from({ length: 30 }, (_, i) => ({ x: 20 + i * 5, y: 50 + 10 * Math.sin(i / 4) })), { width: 4, cap: 'round' });
  return 'M' + ring.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L') + ' Z';
}

describe('a stroked path is a stroke exactly as drawn', () => {
  it('keeps its own vertices, its colour and its width, and is no ribbon or skeleton', () => {
    const [s] = strokes(svg('<path d="M10 10 L110 10 L110 60" fill="none" stroke="#ff0000" stroke-width="3"/>'));
    expect(s).toMatchObject({ color: '#ff0000', width: 3, recovery: 'stroke', closed: false });
    expect(s.fidelity).toBeUndefined();
    for (const p of s.points) expect(offPath(p, [[10, 10], [110, 10], [110, 60]])).toBeLessThan(1e-6);
    expect(near(s.points, 10, 10)).toBe(true);
    expect(near(s.points, 110, 10)).toBe(true);
    expect(near(s.points, 110, 60)).toBe(true);
  });

  it('is given the density of ink, because the engine measures along a stroke and a stroke of corners reads as nothing', () => {
    const [s] = strokes(svg(pen('M10 10 L110 10 L110 60')));
    for (let i = 1; i < s.points.length; i++) expect(Math.hypot(s.points[i].x - s.points[i - 1].x, s.points[i].y - s.points[i - 1].y)).toBeLessThanOrEqual(2.0001);
  });

  it('a box drawn as a rect, a circle and an ellipse read as a rectangle, a circle and a circle', () => {
    const got = strokes(svg('<rect x="20" y="20" width="100" height="60" fill="none" stroke="#000"/><circle cx="150" cy="50" r="30" fill="none" stroke="#000"/><ellipse cx="60" cy="150" rx="40" ry="35" fill="none" stroke="#000"/>', 'width="200" height="200" viewBox="0 0 200 200"'));
    expect(got).toHaveLength(3);
    expect(got.map((s) => analyzeStroke(s.points).results[0].type)).toEqual(['rectangle', 'circle', 'circle']);
    expect(got.every((s) => s.closed && s.recovery === 'stroke')).toBe(true);
  });

  it('a line, a polyline and a polygon are lines', () => {
    const got = strokes(svg('<line x1="5" y1="5" x2="95" y2="5" stroke="#000"/><polyline points="10,20 50,20 50,60" fill="none" stroke="#000"/><polygon points="10,70 50,70 30,95" fill="none" stroke="#000"/>'));
    expect(got).toHaveLength(3);
    expect(near(got[0].points, 5, 5) && near(got[0].points, 95, 5)).toBe(true);
    expect(got[1].closed).toBe(false);
    expect(got[2].closed).toBe(true);
    expect(near(got[2].points, 30, 95)).toBe(true);
  });

  it('a path with several subpaths is a stroke each', () => {
    expect(strokes(svg(pen('M10 10 L50 10 M10 30 L50 30 M10 50 L50 50')))).toHaveLength(3);
  });
});

describe('every path command, absolute and relative', () => {
  const same = (a: string, b: string) => {
    const [x] = strokes(svg(pen(a))), [y] = strokes(svg(pen(b)));
    expect(x.points.length).toBe(y.points.length);
    x.points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(y.points[i].x, 6);
      expect(p.y).toBeCloseTo(y.points[i].y, 6);
    });
  };

  it('relative is absolute from where the pen is; H and V move one way; Z returns to the start', () => {
    same('M10 10 h 100 v 50 h -100 z', 'M10 10 L110 10 L110 60 L10 60 Z');
    same('m10 10 l 100 0 l 0 50', 'M10 10 L110 10 L110 60');
    same('M10 10 H110 V60', 'M10,10 L110,10 L110,60');
  });

  it('a command repeats without its letter, and a move followed by pairs is a move then lines', () => {
    same('M10 10 110 10 110 60', 'M10 10 L110 10 L110 60');
    same('m10 10 100 0 0 50', 'M10 10 L110 10 L110 60');
  });

  it('numbers written close together read: signs, a second point, an exponent', () => {
    const [s] = strokes(svg(pen('M10-20L30.5.5e1 40-1')));
    expect(near(s.points, 10, -20)).toBe(true);
    expect(near(s.points, 30.5, 5)).toBe(true);
    expect(near(s.points, 40, -1)).toBe(true);
  });

  it('a cubic is walked along its curve, and a smooth one reflects the control before it', () => {
    const [c] = strokes(svg(pen('M0 0 C 0 50 100 50 100 0')));
    expect(c.points.some((p) => Math.hypot(p.x - 50, p.y - 37.5) < 0.3)).toBe(true);
    const [s] = strokes(svg(pen('M0 0 C 0 50 50 50 50 0 S 100 -50 100 0')));
    // The second half is the first reflected: its middle is at (75, -37.5).
    expect(s.points.some((p) => Math.hypot(p.x - 75, p.y + 37.5) < 0.3)).toBe(true);
  });

  it('a quadratic and a smooth quadratic', () => {
    const [q] = strokes(svg(pen('M0 0 Q 50 100 100 0 T 200 0')));
    expect(q.points.some((p) => Math.hypot(p.x - 50, p.y - 50) < 0.3)).toBe(true);
    expect(q.points.some((p) => Math.hypot(p.x - 150, p.y + 50) < 0.3)).toBe(true);
  });

  it('an arc stays on its circle; its flags choose the way round and the long way or the short', () => {
    const [a] = strokes(svg(pen('M50 0 A 50 50 0 0 1 100 50')));
    for (const p of a.points) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThan(0.1);
    const [large] = strokes(svg(pen('M20 50 A 60 60 0 1 1 80 50')));
    const [small] = strokes(svg(pen('M20 50 A 60 60 0 0 1 80 50')));
    expect(lengthOf(large.points)).toBeGreaterThan(300);
    expect(lengthOf(large.points)).toBeLessThan(328);
    expect(lengthOf(small.points)).toBeGreaterThan(61);
    expect(lengthOf(small.points)).toBeLessThan(66);
  });

  it('arc flags need no separator after them, and a radius too small for its chord is made large enough', () => {
    const [a] = strokes(svg(pen('M0 0 a1 1 0 00.5.5')));
    expect(near(a.points, 0.5, 0.5, 1e-9)).toBe(true);
    const [b] = strokes(svg(pen('M0 50 A 1 1 0 0 1 100 50')));
    // The radius grows to 50: a half circle through the middle.
    expect(Math.max(...b.points.map((p) => Math.abs(p.y - 50)))).toBeGreaterThan(49);
  });

  it('stops where the path stops making sense, keeps what came before, and says so', () => {
    const r = ok(read(svg(pen('M10 10 L50 10 L'))));
    expect(r.doc.pages[0].strokes).toHaveLength(1);
    expect(near(r.doc.pages[0].strokes[0].points, 50, 10)).toBe(true);
    expect(r.notes.join(' ')).toMatch(/path/i);
  });

  it('a path with no commands draws nothing, and nothing goes wrong', () => {
    const r = ok(read(svg('<path d="" stroke="#000"/><path stroke="#000"/><path d="   " stroke="#000"/>')));
    expect(r.doc.pages[0].strokes).toHaveLength(0);
  });
});

describe('transforms nest, and a clone lands where it belongs', () => {
  it('translate, scale and rotate compose from the outside in, and a stroke is as wide as it is scaled', () => {
    const [s] = strokes(svg('<g transform="translate(100 50)"><g transform="scale(2) rotate(90)"><path d="M0 0 L10 0" stroke="#000" stroke-width="1"/></g></g>'));
    expect(near(s.points, 100, 50, 1e-9)).toBe(true);
    expect(near(s.points, 100, 70, 1e-9)).toBe(true);
    expect(s.width).toBeCloseTo(2, 9);
  });

  it('a list applies right to left: scale first, then the move', () => {
    const [s] = strokes(svg(pen('M0 0 L1 0', 'transform="translate(10 0) scale(2)"')));
    expect(near(s.points, 10, 0)).toBe(true);
    expect(near(s.points, 12, 0)).toBe(true);
  });

  it('matrix, rotate about a point, skewX and skewY', () => {
    const m = strokes(svg(pen('M0 0 L10 0', 'transform="matrix(1 0 0 1 5 6)"')))[0];
    expect(near(m.points, 5, 6) && near(m.points, 15, 6)).toBe(true);
    const r = strokes(svg(pen('M20 10 L20 10.0001', 'transform="rotate(90 10 10)"')))[0];
    expect(near(r.points, 10, 20, 1e-3)).toBe(true);
    const sx = strokes(svg(pen('M0 0 L0 10', 'transform="skewX(45)"')))[0];
    expect(near(sx.points, 10, 10, 1e-9)).toBe(true);
    const sy = strokes(svg(pen('M0 0 L10 0', 'transform="skewY(45)"')))[0];
    expect(near(sy.points, 10, 10, 1e-9)).toBe(true);
  });

  it('a clone with <use> lands where its x, y and transform put it, from <defs> and from the page', () => {
    const got = strokes(svg('<defs><path id="box" d="M0 0 H10 V10 H0 Z" fill="none" stroke="#00f"/></defs><use href="#box" x="20" y="30"/><use xlink:href="#box" transform="translate(100 0)"/>'));
    expect(got).toHaveLength(2);
    expect(bounds(got[0].points)).toEqual({ minX: 20, maxX: 30, minY: 30, maxY: 40 });
    expect(bounds(got[1].points)).toEqual({ minX: 100, maxX: 110, minY: 0, maxY: 10 });
  });

  it('a symbol is scaled to the size a use gives it', () => {
    const [s] = strokes(svg('<symbol id="s" viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10" fill="none" stroke="#000"/></symbol><use href="#s" x="50" y="50" width="20" height="20"/>'));
    expect(bounds(s.points)).toEqual({ minX: 50, maxX: 70, minY: 50, maxY: 70 });
  });

  it('a clone inherits what the use sets, a pen colour included, and keeps what it sets itself', () => {
    const got = strokes(svg('<defs><path id="a" d="M0 0 L10 0" fill="none"/><path id="b" d="M0 0 L10 0" fill="none" stroke="#00ff00"/></defs><g stroke="#ff0000" stroke-width="5"><use href="#a" y="10"/><use href="#b" y="20"/></g>'));
    expect(got.map((s) => s.color)).toEqual(['#ff0000', '#00ff00']);
    expect(got[0].width).toBe(5);
  });

  it('a use that refers to itself, or to a thing that is not there, is said and does not loop', () => {
    const r = ok(read(svg('<g id="a"><use href="#a"/><path d="M0 0 L5 5" stroke="#000"/></g><use href="#a"/><use href="#nothing"/><use href="https://example.com/x.svg#y"/>')));
    expect(r.doc.pages[0].strokes.length).toBeGreaterThanOrEqual(1);
    expect(r.notes.join(' ')).toMatch(/itself|refers/i);
  });

  it('thousands of clones are expanded, but only so many: past the cap the file is cut off with a sentence', () => {
    const uses = Array.from({ length: 40 }, (_, i) => `<use href="#d" x="${i}" y="${i}"/>`).join('');
    const r = ok(read(svg(`<defs><path id="d" d="M0 0 L1 1" stroke="#000"/></defs>${uses}`), { clones: 10 }));
    expect(r.doc.pages[0].strokes).toHaveLength(10);
    expect(r.doc.truncated).toMatch(/clone|<use>/i);
    expect(r.notes.join(' ')).toMatch(/10/);
  });

  it('clones that multiply (a use of a use of a use) are cut by the cap, not run for ever', () => {
    let defs = '<path id="p0" d="M0 0 L1 1" stroke="#000"/>';
    for (let i = 1; i <= 12; i++) defs += `<g id="p${i}">${Array.from({ length: 6 }, () => `<use href="#p${i - 1}"/>`).join('')}</g>`;
    const t0 = Date.now();
    const r = ok(read(svg(`<defs>${defs}</defs><use href="#p12"/>`), { clones: 5000, visited: 20000 }));
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(r.doc.truncated).toBeTruthy();
  });
});

describe('units arrive at the hand’s scale: CSS pixels', () => {
  const stroke = (attrs: string) => {
    const { doc } = ok(read(svg(pen('M0 0 L10 0'), attrs)));
    return { page: doc.pages[0], s: doc.pages[0].strokes[0] };
  };
  it('millimetres', () => {
    const { page, s } = stroke('width="210mm" height="297mm" viewBox="0 0 210 297"');
    expect(page.width).toBeCloseTo(793.7, 1);
    expect(page.height).toBeCloseTo(1122.52, 1);
    const end = s.points[s.points.length - 1];
    expect(end.x).toBeCloseTo(37.795, 2);
    expect(s.width).toBeCloseTo(2 * 3.7795, 2);
  });
  it('inches', () => {
    const { page, s } = stroke('width="2in" height="1in" viewBox="0 0 20 10"');
    expect(page.width).toBe(192);
    expect(page.height).toBe(96);
    expect(s.points[s.points.length - 1].x).toBeCloseTo(96, 6);
  });
  it('points', () => {
    const { page, s } = stroke('width="72pt" height="36pt" viewBox="0 0 72 36"');
    expect(page.width).toBeCloseTo(96, 6);
    expect(page.height).toBeCloseTo(48, 6);
    expect(s.points[s.points.length - 1].x).toBeCloseTo(13.3333, 3);
  });
  it('centimetres with no viewBox: a user unit is a pixel', () => {
    const { page, s } = stroke('width="10cm" height="5cm"');
    expect(page.width).toBeCloseTo(377.95, 1);
    expect(page.height).toBeCloseTo(188.98, 1);
    expect(s.points[s.points.length - 1].x).toBeCloseTo(10, 6);
  });
  it('a viewBox alone is a page of that many pixels', () => {
    const { page } = stroke('viewBox="0 0 300 150"');
    expect([page.width, page.height]).toEqual([300, 150]);
  });
  it('a viewBox that does not match the size is fitted, centred, as the default aspect says', () => {
    const { s } = stroke('width="200" height="100" viewBox="0 0 100 100"');
    expect(s.points[0].x).toBeCloseTo(50, 6);
    expect(s.points[s.points.length - 1].x).toBeCloseTo(60, 6);
  });
  it('a viewBox that starts away from the origin moves its corner to the origin', () => {
    const { s } = stroke('width="100" height="100" viewBox="50 50 100 100"');
    expect(s.points[0].x).toBeCloseTo(-50, 6);
  });
  it('a page with no size at all is as big as what is drawn, and says so', () => {
    const r = ok(read('<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L110 60" stroke="#000"/></svg>'));
    expect(r.doc.pages[0].width).toBeGreaterThanOrEqual(110);
    expect(r.doc.pages[0].height).toBeGreaterThanOrEqual(60);
    expect(r.notes.join(' ')).toMatch(/size/i);
  });
});

describe('paint: where a colour and a width come from', () => {
  it('a class in a <style> sets them; an inline style beats the sheet; the sheet beats an attribute', () => {
    const body = '<style>.a{fill:none;stroke:#0000ff;stroke-width:2} #b{stroke:#00ff00}</style><path class="a" d="M0 0 L10 0"/><path class="a" style="stroke:#ff00ff" d="M0 10 L10 10"/><path class="a" stroke="#ff0000" d="M0 20 L10 20"/><path id="b" class="a" d="M0 30 L10 30"/>';
    const got = strokes(svg(body));
    expect(got.map((s) => s.color)).toEqual(['#0000ff', '#ff00ff', '#0000ff', '#00ff00']);
    expect(got[0].width).toBe(2);
  });

  it('colours of every form read: names, short hex, rgb with percent, hsl, currentColor', () => {
    const body = ['stroke="red"', 'stroke="#0f0"', 'stroke="rgb(0, 0, 255)"', 'stroke="rgb(100%, 50%, 0%)"', 'stroke="hsl(120, 100%, 25%)"', 'color="#123456" stroke="currentColor"']
      .map((a, i) => `<path d="M0 ${i} L5 ${i}" fill="none" ${a}/>`).join('');
    expect(strokes(svg(body)).map((s) => s.color)).toEqual(['#ff0000', '#00ff00', '#0000ff', '#ff8000', '#008000', '#123456']);
  });

  it('inherits down groups: stroke, fill, widths', () => {
    const [s] = strokes(svg('<g stroke="#123456" fill="none" stroke-width="4"><g><path d="M0 0 L10 0"/></g></g>'));
    expect([s.color, s.width]).toEqual(['#123456', 4]);
  });

  it('an invisible thing is not drawn: display none, visibility hidden, opacity 0, no paint at all', () => {
    const body = ['display="none"', 'visibility="hidden"', 'opacity="0"', 'stroke="none"'].map((a, i) => `<path d="M0 ${i} L9 ${i}" fill="none" stroke="#000" ${a}/>`).join('')
      + '<g display="none"><path d="M0 9 L9 9" stroke="#000"/></g>';
    expect(strokes(svg(body))).toHaveLength(0);
  });

  it('translucent ink says how translucent', () => {
    const [s] = strokes(svg('<path d="M0 0 L9 0" fill="none" stroke="#ffff00" stroke-opacity="0.4" stroke-width="12"/>'));
    expect(s.opacity).toBeCloseTo(0.4, 6);
    const [t] = strokes(svg('<path d="M0 0 L9 0" fill="none" stroke="#ffff00"/>'));
    expect(t.opacity).toBeUndefined();
  });

  it('the first colour of a gradient stands for it, and it is said', () => {
    const r = ok(read(svg('<defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs><path d="M0 0 L9 0" fill="none" stroke="url(#g)"/>')));
    expect(r.doc.pages[0].strokes[0].color).toBe('#ff0000');
    expect(r.notes.join(' ')).toMatch(/gradient/i);
  });

  it('masks and clip paths are skipped, and said; what is drawn in a <defs> is not drawn in place', () => {
    const r = ok(read(svg('<defs><clipPath id="c"><rect width="5" height="5"/></clipPath><mask id="m"><rect width="9" height="9" fill="#fff"/></mask></defs><path d="M0 0 L9 0" stroke="#000" clip-path="url(#c)"/><path d="M0 5 L9 5" stroke="#000" mask="url(#m)"/><path d="M0 9 L9 9" stroke="#000"/>')));
    expect(r.doc.pages[0].strokes).toHaveLength(3);
    expect(r.notes.join(' ')).toMatch(/mask/i);
    expect(r.notes.join(' ')).toMatch(/clip/i);
  });
});

describe('a pen stroke stored as a filled outline comes back as a line, in its colour', () => {
  it('a ribbon of fill is recovered by pairing, and keeps the colour, the width, and how faithfully', () => {
    const { doc } = ok(read(svg(`<path d="${penD()}" fill="#102030"/>`)));
    const got = doc.pages[0].strokes;
    expect(got).toHaveLength(1);
    expect(got[0].recovery).toBe('ribbon');
    expect(got[0].color).toBe('#102030');
    expect(got[0].width).toBeGreaterThan(3.5);
    expect(got[0].width).toBeLessThan(4.5);
    expect(got[0].fidelity?.faithful).toBe(true);
  });

  it('under a transform, in a clone, and at another scale it is the same stroke moved', () => {
    const a = strokes(svg(`<defs><path id="p" d="${penD()}" fill="#102030"/></defs><use href="#p"/><use href="#p" x="0" y="20"/>`));
    expect(a).toHaveLength(2);
    expect(a[1].points.length).toBe(a[0].points.length);
    a[0].points.forEach((p, i) => {
      expect(a[1].points[i].x).toBeCloseTo(p.x, 6);
      expect(a[1].points[i].y).toBeCloseTo(p.y + 20, 6);
    });
    const big = strokes(svg(`<g transform="scale(2)"><path d="${penD()}" fill="#102030"/></g>`, 'width="400" height="200" viewBox="0 0 400 200"'));
    expect(big[0].width).toBeGreaterThan(7);
  });

  it('a compound path under even-odd is a ring and its hole: one closed line', () => {
    const outer = 'M100 50 A50 50 0 1 1 100 150 A50 50 0 1 1 100 50 Z';
    const inner = 'M100 54 A46 46 0 1 1 100 146 A46 46 0 1 1 100 54 Z';
    const got = strokes(svg(`<path d="${outer} ${inner}" fill-rule="evenodd" fill="#000"/>`, 'width="200" height="200" viewBox="0 0 200 200"'));
    expect(got).toHaveLength(1);
    expect(got[0].closed).toBe(true);
    expect(analyzeStroke(got[0].points).results[0].type).toBe('circle');
  });

  it('one path of several outlines gives each its own stroke', () => {
    const ring = (y: number) => 'M' + penOutline(Array.from({ length: 20 }, (_, i) => ({ x: 10 + i * 6, y })), { width: 3, cap: 'flat' }).map((p) => `${p.x} ${p.y}`).join(' L') + ' Z';
    const got = strokes(svg(`<path d="${ring(20)} ${ring(40)} ${ring(60)}" fill="#000"/>`));
    expect(got).toHaveLength(3);
    expect(new Set(got.map((s) => s.outline)).size).toBe(3);
  });

  it('inkscape:original-d is the line a path effect kept: the stroke is that line, exactly', () => {
    const [s] = strokes(svg('<path inkscape:path-effect="#path-effect1" inkscape:original-d="M20 50 L180 50" d="M20 48 L180 48 L180 52 L20 52 Z" fill="#333333"/>'));
    expect(s.recovery).toBe('stroke');
    expect(s.color).toBe('#333333');
    expect(s.width).toBeGreaterThan(3.5);
    expect(s.width).toBeLessThan(4.5);
    for (const p of s.points) expect(offPath(p, [[20, 50], [180, 50]])).toBeLessThan(1e-9);
    expect(near(s.points, 20, 50) && near(s.points, 180, 50)).toBe(true);
  });

  it('a solid shape no pen made is its edge, as drawn; one that fills the page is a ground and is left out, and said', () => {
    const r = ok(read(svg('<rect width="200" height="100" fill="#ffffff"/><rect x="20" y="20" width="60" height="40" fill="#ccddee"/>')));
    const got = r.doc.pages[0].strokes;
    expect(got).toHaveLength(1);
    expect(got[0].recovery).toBe('stroke');
    expect(analyzeStroke(got[0].points).results[0].type).toBe('rectangle');
    expect(r.notes.join(' ')).toMatch(/background|ground/i);
  });

  it('paint order is the order of the file, strokes first or last as drawn', () => {
    const got = strokes(svg(pen('M0 0 L9 0') + pen('M0 5 L9 5') + pen('M0 9 L9 9')));
    expect(got.map((s) => s.order)).toEqual([0, 1, 2]);
  });
});

describe('words, pictures and links', () => {
  it('<text> becomes a text run where it stands, at its size and in its colour', () => {
    const { doc } = ok(read(svg('<text x="10" y="20" font-size="16" fill="#112233">Hello &amp; <tspan>good</tspan>bye</text>')));
    expect(doc.pages[0].texts).toEqual([{ order: 0, text: 'Hello & goodbye', x: 10, y: 20, size: 16, color: '#112233', format: 'plain' }]);
  });

  it('an embedded picture comes with its bytes, its size and its box; one that lives elsewhere is a reference', () => {
    const png = makePng(3, 2);
    const { doc, notes } = ok(read(svg(`<image x="10" y="20" width="60" height="40" href="data:image/png;base64,${toBase64(png)}"/><image x="0" y="0" width="5" height="5" xlink:href="photos/cat.jpg"/>`)));
    const [a, b] = doc.pages[0].pictures;
    expect(a.box).toEqual({ x: 10, y: 20, w: 60, h: 40 });
    expect(a.mime).toBe('image/png');
    expect([a.w, a.h]).toEqual([3, 2]);
    expect(Array.from(a.bytes!)).toEqual(Array.from(png));
    expect(b.ref).toBe('photos/cat.jpg');
    expect(b.bytes).toBeUndefined();
    expect(notes.join(' ')).toMatch(/cat\.jpg|elsewhere|not part/i);
  });

  it('a link around marks is kept', () => {
    const { doc } = ok(read(svg('<a href="https://example.com/x"><path d="M0 0 L9 0" stroke="#000"/></a>')));
    expect(doc.pages[0].links).toEqual([{ kind: 'href', target: 'https://example.com/x' }]);
  });

  it('the file’s title names the document; the tool that made it and when are kept when the file says', () => {
    const text = '<?xml version="1.0" encoding="utf-8"?><!-- Generator: Adobe Illustrator 25.2.3, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->'
      + svg('<title>Wiring</title><metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:date>2017-03-04</dc:date></rdf:RDF></metadata><path d="M0 0 L9 0" stroke="#000"/>');
    const { doc } = ok(read(text));
    expect(doc.title).toBe('Wiring');
    expect(doc.source.tool).toMatch(/Illustrator/);
    expect(doc.source.created).toBe('2017-03-04');
    const ink = ok(read(svg('<path d="M0 0 L9 0" stroke="#000"/>').replace('<svg ', '<svg inkscape:version="1.2.1 (9c6d41e410, 2022-07-14)" ')));
    expect(ink.doc.source.tool).toMatch(/Inkscape 1\.2/);
  });

  it('an Illustrator file reads as it is written: a doctype with entities, a <style> of classes, a layer', () => {
    const text = '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [\n\t<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">\n\t<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">\n]>\n'
      + '<svg version="1.1" id="Layer_1" xmlns:x="&ns_extend;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 792" style="enable-background:new 0 0 612 792;" xml:space="preserve">'
      + '<style type="text/css">\n\t.st0{fill:none;stroke:#1D1D1B;stroke-width:2;stroke-miterlimit:10;}\n</style>'
      + '<g id="Layer_1_1_"><path class="st0" d="M10,10c20,0,40,40,60,40"/></g></svg>';
    const { doc } = ok(read(text));
    expect(doc.pages[0].width).toBe(612);
    expect(doc.pages[0].strokes[0]).toMatchObject({ color: '#1d1d1b', width: 2, recovery: 'stroke' });
  });
});

describe('a drawing is ink or a figure, and says why', () => {
  const ribbon = (y: number, x = 10) => `<path d="M${penOutline(Array.from({ length: 24 }, (_, i) => ({ x: x + i * 5, y: y + 6 * Math.sin(i / 3) })), { width: 3, cap: 'round' }).map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L')} Z" fill="#000"/>`;

  it('mostly pen-shaped fills is ink, with the counts it stands on', () => {
    const { doc } = ok(read(svg([20, 40, 60, 80].map((y) => ribbon(y)).join('') + '<text x="5" y="95">note</text>')));
    expect(doc.reading.as).toBe('ink');
    expect(doc.reading.evidence.penFills).toBe(4);
    expect(doc.reading.evidence.texts).toBe(1);
    expect(doc.reading.words).toMatch(/drawn|pen/i);
  });

  it('mostly shapes and words is a figure, and the shapes are still there as strokes for reading it as ink', () => {
    const { doc } = ok(read(svg('<rect x="5" y="5" width="40" height="30" fill="#eee" stroke="#000"/><rect x="60" y="5" width="40" height="30" fill="#eee" stroke="#000"/><circle cx="150" cy="20" r="12" fill="#cde"/><text x="10" y="60">one</text><text x="65" y="60">two</text><path d="M45 20 L60 20" stroke="#000"/>')));
    expect(doc.reading.as).toBe('figure');
    expect(doc.reading.evidence.texts).toBe(2);
    expect(doc.reading.words).toMatch(/designed|shapes/i);
    expect(doc.pages[0].strokes.length).toBeGreaterThanOrEqual(3);
  });

  it('a hand-drawn stroked path is ink, a ruled line is a figure', () => {
    const wobble = 'M10 10 C 30 40 50 -20 70 30 S 110 60 150 20';
    expect(ok(read(svg(pen(wobble) + pen('M10 60 C 30 90 50 40 70 80 S 110 100 150 70')))).doc.reading.as).toBe('ink');
    expect(ok(read(svg('<line x1="5" y1="5" x2="95" y2="5" stroke="#000"/><line x1="5" y1="15" x2="95" y2="15" stroke="#000"/><rect x="5" y="30" width="40" height="30" fill="none" stroke="#000"/>'))).doc.reading.as).toBe('figure');
  });

  it('a file with nothing painted is a figure with nothing in it', () => {
    const { doc } = ok(read(svg('')));
    expect(doc.reading.as).toBe('figure');
    expect(doc.pages[0].strokes).toHaveLength(0);
  });
});

describe('a file that is not what it says is refused with its reason, and never thrown', () => {
  const refused = (text: string | Uint8Array, limits?: Partial<IngestLimits>) => {
    const bytes = typeof text === 'string' ? enc(text) : text;
    const r = ingestSvg(bytes, 'bad.svg', sha256Hex(bytes), { limits });
    expect(r.ok).toBe(false);
    return r.ok ? '' : r.reason;
  };

  it.each([
    ['empty', ''],
    ['cut off inside a tag', '<svg xmlns="http://www.w3.org/2000/svg" width="10" hei'],
    ['cut off inside an attribute value', '<svg xmlns="http://www.w3.org/2000/svg" width="10'],
    ['cut off before the end', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><g><path d="M0 0"/>'],
    ['a closing tag that does not match', '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0"/></svg></g>'],
    ['a root that is not an svg', '<html><body><p>hello</p></body></html>'],
    ['not XML at all', 'this is a letter to a friend'],
    ['an unquoted attribute', '<svg xmlns="http://www.w3.org/2000/svg" width=10 height=10></svg>'],
    ['a comment never closed', '<svg xmlns="http://www.w3.org/2000/svg"><!-- oh'],
    ['two roots', '<svg xmlns="http://www.w3.org/2000/svg"></svg><svg xmlns="http://www.w3.org/2000/svg"></svg>'],
  ])('%s', (_, text) => {
    expect(refused(text).length).toBeGreaterThan(8);
  });

  it.each([
    ['a 0 × 0 viewBox', 'width="100" height="100" viewBox="0 0 0 0"'],
    ['a viewBox with a negative size', 'viewBox="0 0 100 -5"'],
    ['a viewBox that is not numbers', 'viewBox="a b c d"'],
    ['a viewBox of three numbers', 'viewBox="0 0 100"'],
    ['a width of zero', 'width="0" height="100" viewBox="0 0 100 100"'],
  ])('%s', (_, attrs) => {
    expect(refused(svg('<path d="M0 0 L9 9" stroke="#000"/>', attrs))).toMatch(/size|viewBox|width|height/i);
  });

  it('bytes that are not text', () => {
    const bytes = new Uint8Array(400);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 11) & 255;
    expect(refused(bytes).length).toBeGreaterThan(8);
  });

  it('nesting too deep to be a drawing', () => {
    expect(refused(svg('<g>'.repeat(600) + '</g>'.repeat(600)))).toMatch(/deep|nest/i);
  });

  it('a file too big is refused before it is read', () => {
    expect(refused(svg(pen('M0 0 L9 9')), { bytes: 50 })).toMatch(/big|large|limit/i);
  });

  it('numbers that are not numbers do not get through: a shape with a NaN is left out, a path with one stops there', () => {
    const r = ok(read(svg('<rect x="0" y="0" width="NaN" height="10" stroke="#000"/><circle cx="5" cy="5" r="-3" stroke="#000"/><path d="M NaN NaN L 10 10" stroke="#000"/><path d="M0 0 L1e999 5" stroke="#000"/><path d="M0 0 L9 9" stroke="#000" stroke-width="Infinity"/><line x1="1" y1="1" x2="x" y2="2" stroke="#000"/>')));
    for (const s of r.doc.pages[0].strokes) for (const p of s.points) { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true); }
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it('truncated at every length it never throws, and says what it is', () => {
    const text = svg(`<style>.a{stroke:#00f}</style><g transform="translate(5 5)"><path class="a" d="M0 0 C 10 20 30 40 50 60 S 70 80 90 100 Z"/><path d="${penD()}" fill="#223344"/><text x="1" y="2">hi &amp; bye</text></g>`);
    const rnd = mulberry32(99);
    for (let n = 0; n < 60; n++) {
      const cut = Math.floor(rnd() * text.length);
      const bytes = enc(text.slice(0, cut));
      const r = ingestSvg(bytes, 'cut.svg', sha256Hex(bytes));
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(5);
      else for (const s of r.doc.pages[0].strokes) for (const p of s.points) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });

  it('with its characters changed at random it never throws', () => {
    const text = svg(`<defs><path id="d" d="M0 0 H10 V10 Z"/></defs><use href="#d" x="3"/><g transform="rotate(30) scale(2 3)"><path d="${penD()}" fill="#223344" fill-rule="evenodd"/></g><rect x="1" y="2" width="30" height="40" rx="5" stroke="#000"/>`);
    const rnd = mulberry32(7);
    const chars = '<>/="\'&; 0123456789.-eMLCZAa#()xyz\u0000é';
    for (let n = 0; n < 200; n++) {
      let t = text;
      for (let k = 0; k < 4; k++) {
        const at = Math.floor(rnd() * t.length);
        t = t.slice(0, at) + chars[Math.floor(rnd() * chars.length)] + t.slice(at + 1);
      }
      const bytes = enc(t);
      const r = ingestSvg(bytes, 'fuzz.svg', sha256Hex(bytes));
      expect(typeof r.ok).toBe('boolean');
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('the work a file may cost', () => {
  const ribbons = (n: number) => Array.from({ length: n }, (_, i) => `<path d="${(() => {
    const ring = penOutline(Array.from({ length: 12 }, (_, k) => ({ x: 10 + k * 6, y: 5 + i * 7 })), { width: 2, cap: 'round' });
    return 'M' + ring.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L') + ' Z';
  })()}" fill="#000"/>`).join('');

  it('past the cap on outlines the rest are left, and the sentence says how many were read', () => {
    const r = ok(read(svg(ribbons(12), 'width="200" height="200" viewBox="0 0 200 200"'), { outlines: 5 }));
    expect(r.doc.pages[0].strokes).toHaveLength(5);
    expect(r.doc.truncated).toMatch(/5/);
    expect(r.doc.truncated).toMatch(/outline/);
  });

  it('past the time it may take, a file is cut off with a sentence, whatever else it holds', () => {
    const r = ok(read(svg(ribbons(30), 'width="300" height="300" viewBox="0 0 300 300"'), { ms: 0 }));
    expect(r.doc.truncated).toMatch(/time|long/i);
  });
});
