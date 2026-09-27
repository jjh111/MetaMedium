// Printing at full size — a true-size drawing tiled onto pages (MATHS-PLAN.md
// §4 "print at full size"; V1-PLAN.md M7).
//
// Pinned here: a 22″ × 56″ piece on Letter at 100% — Letter is 8.5 × 11 in;
// ½ in margins and a 1.3 in footer (the 1 in test square with 0.15 in above
// and below it) leave 7.5 × 8.7 in of drawing on each page; neighbours share
// ½ in, so each page advances 7 in across and 8.2 in down; the piece with its
// labels and its name stands in about 22.5 × 56.8 in, so it takes
// ⌈(22.5 − ½) ÷ 7⌉ = 4 across and ⌈(56.8 − ½) ÷ 8.2⌉ = 7 down: 28 pages, A1 to
// G4. The pages cover the piece with exactly the stated overlap (read back
// from each page's own clip and transform), every page's test square is
// exactly 1 in, with the sentence that says to measure it before cutting,
// neighbours carry the same alignment marks where they meet, and one HTML
// document prints the lot one page per sheet. A4 with a metric piece: 2 cm
// squares. Landscape, a wider overlap, and byte-identical output.

import { describe, it, expect } from 'vitest';
import type { Bounds } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { rectStroke } from '../test/strokes';
import { solveBoard } from './solve';
import { quantity } from './quantity';
import { trueSize } from './truesize';
import type { TrueSize } from './truesize';
import { printTiled } from './print';
import type { PrintJob } from './print';

function text(s: Session, code: string, b: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: b, code, at })!;
}

const box = (cx: number, cy: number, w = 40, h = 30): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

/** A rectangular piece drawn 10 canvas units to the unit, labelled on its top and its left side. */
function piece(width: string, height: string, w: number, h: number): { doc: TrueSize; id: string } {
  const s = createSession();
  const id = s.addStroke(rectStroke(100, 100, w, h), 1000);
  text(s, width, box(100 + w / 2, 80, 70, 30), 20000);
  text(s, height, box(60, 100 + h / 2, 70, 30), 21000);
  return { doc: trueSize(solveBoard(s.getState())), id };
}

const inches = () => piece('22″', '56″', 220, 560);

// ===== Reading a page back, as a printer would =====

function rootOf(svg: string) {
  const tag = /<svg\b[^>]*>/.exec(svg)![0];
  const a = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
  const len = (v: string) => {
    const m = /^([\d.]+)([a-z]+)$/.exec(v)!;
    return { value: Number(m[1]), unit: m[2] };
  };
  return { width: len(a('width')), height: len(a('height')), viewBox: a('viewBox').split(/\s+/).map(Number) };
}

const MM: Record<string, number> = { in: 25.4, mm: 1, cm: 10 };

/** The test square's side, in millimetres, as the page prints it. */
function squareMm(svg: string): { w: number; h: number } {
  const root = rootOf(svg);
  const perUnit = MM[root.width.unit] * (root.width.value / root.viewBox[2]);
  const perUnitY = MM[root.height.unit] * (root.height.value / root.viewBox[3]);
  const m = /<rect data-test-square="[^"]*" x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/.exec(svg)!;
  return { w: Number(m[1]) * perUnit, h: Number(m[2]) * perUnitY };
}

/** The part of the drawing a page shows, read from its clip and its content's transform. */
function shownBy(svg: string): { x: number; y: number; width: number; height: number } {
  const c = /<clipPath id="[^"]+"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\/><\/clipPath>/.exec(svg)!;
  const t = /<g transform="matrix\(([-\d.]+) 0 0 ([-\d.]+) ([-\d.]+) ([-\d.]+)\)">/.exec(svg)!;
  const [cx, cy, cw, ch] = [1, 2, 3, 4].map((i) => Number(c[i]));
  const [k, , e, f] = [1, 2, 3, 4].map((i) => Number(t[i]));
  return { x: (cx - e) / k, y: (cy - f) / k, width: cw / k, height: ch / k };
}

function joinMark(svg: string, name: string): string | null {
  const esc = name.replace(/[|/]/g, '\\$&');
  return new RegExp(`<g data-join="${esc}">[\\s\\S]*?</g>`).exec(svg)?.[0] ?? null;
}

const across = (job: PrintJob) => Math.ceil((job.region.maxX - job.region.minX - job.overlap) / (job.tile.width - job.overlap) - 1e-9);
const down = (job: PrintJob) => Math.ceil((job.region.maxY - job.region.minY - job.overlap) / (job.tile.height - job.overlap) - 1e-9);

describe('a 22″ × 56″ piece on Letter at 100%', () => {
  it('takes the pages the arithmetic gives: 7.5 × 8.7 in of drawing a page, ½ in shared — 4 across, 7 down, 28', () => {
    const { doc } = inches();
    expect(doc.unit).toBe('in');
    const job = printTiled(doc, { paper: 'letter' });
    expect(job.error).toBeUndefined();
    expect(job.tile.width).toBeCloseTo(7.5, 9);
    expect(job.tile.height).toBeCloseTo(8.7, 9);
    expect(job.overlap).toBe(0.5);
    // What is covered: the piece, its labels and its name — a little more than 22 × 56, never the whole document.
    const w = job.region.maxX - job.region.minX, h = job.region.maxY - job.region.minY;
    expect(w).toBeGreaterThan(22);
    expect(w).toBeLessThan(23);
    expect(h).toBeGreaterThan(56);
    expect(h).toBeLessThan(57.2);
    expect([across(job), down(job)]).toEqual([4, 7]);
    expect([job.cols, job.rows]).toEqual([4, 7]);
    expect(job.pages).toHaveLength(28);
    const rows = 'ABCDEFG';
    expect(job.pages.map((p) => p.label)).toEqual([...rows].flatMap((r) => [1, 2, 3, 4].map((c) => `${r}${c}`)));
    expect(job.reason).toMatch(/^28 pages, 4 across and 7 down, on Letter portrait at 100%/);
  });

  it('the pages cover the piece, and neighbours share exactly the stated overlap', () => {
    const { doc, id } = inches();
    const job = printTiled(doc, { paper: 'letter' });
    const piece = doc.figures.find((f) => f.id === id)!.bounds;
    const shown = job.pages.map((p) => ({ p, s: shownBy(p.svg) }));
    for (const { p, s } of shown) {
      // What the page's own clip and transform show is the region it says it shows, 7.5 × 8.7 in of the drawing.
      expect(s.x).toBeCloseTo(p.region.minX, 3);
      expect(s.y).toBeCloseTo(p.region.minY, 3);
      expect(s.width).toBeCloseTo(7.5, 3);
      expect(s.height).toBeCloseTo(8.7, 3);
    }
    const at = (r: number, c: number) => shown.find(({ p }) => p.row === r && p.col === c)!.s;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) expect(at(r, c).x + at(r, c).width - at(r, c + 1).x).toBeCloseTo(0.5, 3);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) expect(at(r, c).y + at(r, c).height - at(r + 1, c).y).toBeCloseTo(0.5, 3);
    // Every corner of the piece is on a page.
    expect(at(0, 0).x).toBeLessThanOrEqual(piece.minX);
    expect(at(0, 0).y).toBeLessThanOrEqual(piece.minY);
    expect(at(6, 3).x + at(6, 3).width).toBeGreaterThanOrEqual(piece.maxX);
    expect(at(6, 3).y + at(6, 3).height).toBeGreaterThanOrEqual(piece.maxY);
  });

  it('every page is Letter at true scale, and its test square is exactly 1 in, with the sentence to measure it first', () => {
    const { doc } = inches();
    const job = printTiled(doc, { paper: 'letter' });
    expect(job.testSquare).toMatchObject({ size: 1, unit: 'in', text: '1 in' });
    for (const p of job.pages) {
      const root = rootOf(p.svg);
      expect(root.width).toEqual({ value: 8.5, unit: 'in' });
      expect(root.height).toEqual({ value: 11, unit: 'in' });
      expect(root.viewBox).toEqual([0, 0, 8.5, 11]);
      expect(squareMm(p.svg)).toEqual({ w: 25.4, h: 25.4 });
      expect(p.svg).toContain('Measure this square before you cut: it must be exactly 1 in on each side.');
      expect(p.svg).toContain(`>${p.label}</text>`);
      expect(p.svg).toContain(`>page ${p.index + 1} of 28</text>`);
      // The assembly map on every page, this page's cell marked.
      expect(p.svg).toMatch(new RegExp(`<rect data-cell="${p.label}" data-here="1"`));
    }
  });

  it('where pages meet, both carry the same alignment marks', () => {
    const { doc } = inches();
    const job = printTiled(doc, { paper: 'letter' });
    const page = (label: string) => job.pages.find((p) => p.label === label)!.svg;
    expect(joinMark(page('A1'), 'A1|A2')).not.toBeNull();
    expect(joinMark(page('A1'), 'A1|A2')).toBe(joinMark(page('A2'), 'A1|A2'));
    expect(joinMark(page('A1'), 'A1/B1')).toBe(joinMark(page('B1'), 'A1/B1'));
    // An inner page meets four neighbours; a corner page two.
    const inner = page('B2');
    for (const j of ['A2/B2', 'B1|B2', 'B2|B3', 'B2/C2']) expect(joinMark(inner, j)).not.toBeNull();
    expect((page('A1').match(/data-join=/g) ?? []).length).toBe(2);
    // Marks never stand where no page meets another.
    expect(joinMark(page('A1'), 'A2|A3')).toBeNull();
  });

  it('one HTML document prints every page, one per sheet, at 100%', () => {
    const { doc } = inches();
    const job = printTiled(doc, { paper: 'letter' });
    expect(job.html).toMatch(/^<!doctype html>/);
    expect(job.html).toContain('@page { size: 8.5in 11in; margin: 0; }');
    expect(job.html.match(/<section class="sheet"/g)).toHaveLength(28);
    for (const p of job.pages) expect(job.html).toContain(p.svg);
    // Each page's clip has its own id, so 28 pages inline in one document never share one.
    const ids = [...job.html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(28);
    expect(job.assembly).toMatch(/^<svg /);
    expect(job.html).toContain(job.assembly);
  });

  it('the same drawing gives byte-identical pages', () => {
    const a = printTiled(inches().doc, { paper: 'letter' });
    const b = printTiled(inches().doc, { paper: 'letter' });
    expect(a.html).toBe(b.html);
    expect(a.pages.map((p) => p.svg)).toEqual(b.pages.map((p) => p.svg));
  });
});

describe('other paper, other units', () => {
  it('A4 with a metric piece: 186 × 245 mm a page, 1 cm shared, and a 2 cm square on every page', () => {
    const { doc } = piece('50 cm', '100 cm', 250, 500);
    expect(doc.unit).toBe('cm');
    const job = printTiled(doc, { paper: 'a4' });
    expect(job.tile.width).toBeCloseTo(18.6, 9);
    expect(job.tile.height).toBeCloseTo(24.5, 9);
    expect(job.overlap).toBe(1);
    expect(job.pages).toHaveLength(across(job) * down(job));
    expect([across(job), down(job)]).toEqual([3, 5]);
    expect(job.testSquare).toMatchObject({ size: 2, unit: 'cm', text: '2 cm' });
    for (const p of job.pages) {
      const root = rootOf(p.svg);
      expect(root.width).toEqual({ value: 210, unit: 'mm' });
      expect(root.height).toEqual({ value: 297, unit: 'mm' });
      expect(root.viewBox).toEqual([0, 0, 210, 297]);
      expect(squareMm(p.svg)).toEqual({ w: 20, h: 20 });
      expect(p.svg).toContain('it must be exactly 2 cm on each side.');
    }
    expect(job.html).toContain('@page { size: 210mm 297mm; margin: 0; }');
  });

  it('the square follows the drawing, not the paper: an inch piece on A4 keeps its 1 in square', () => {
    const job = printTiled(inches().doc, { paper: 'a4' });
    for (const p of job.pages) expect(squareMm(p.svg)).toEqual({ w: 25.4, h: 25.4 });
  });

  it('landscape turns the sheet: 11 × 8.5 in, 10 × 6.2 in of drawing a page', () => {
    const job = printTiled(inches().doc, { paper: 'letter', orientation: 'landscape' });
    expect(job.tile.width).toBeCloseTo(10, 9);
    expect(job.tile.height).toBeCloseTo(6.2, 9);
    expect(job.pages).toHaveLength(across(job) * down(job));
    expect(rootOf(job.pages[0].svg).width).toEqual({ value: 11, unit: 'in' });
    expect(job.html).toContain('@page { size: 11in 8.5in; margin: 0; }');
  });

  it('a wider overlap is shared exactly, and costs pages', () => {
    const job = printTiled(inches().doc, { paper: 'letter', overlap: quantity(1, 'in') });
    expect(job.overlap).toBe(1);
    expect([job.cols, job.rows]).toEqual([across(job), down(job)]);
    const [a, b] = [job.pages[0], job.pages[1]].map((p) => shownBy(p.svg));
    expect(a.x + a.width - b.x).toBeCloseTo(1, 3);
    expect(job.pages.length).toBeGreaterThan(28);
  });

  it('nothing drawn is nothing to print, said', () => {
    const s = createSession();
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    const job = printTiled(doc, { paper: 'letter' });
    expect(job.pages).toEqual([]);
    expect(job.reason).toMatch(/^nothing to print/);
  });
});
