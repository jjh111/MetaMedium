// Printing at full size — a true-size drawing tiled onto pages (MATHS-PLAN.md
// §4 "print at full size"; V1-PLAN.md phase 4, M7).
//
// A pattern piece is bigger than a sheet, so it prints in tiles that are
// taped together. What makes that work is on every page:
//
//   - **A measured test square** — 1 in for an imperial drawing, 2 cm for a
//     metric one, whatever the paper — and the sentence that tells the person
//     to measure it before they cut. A printer scales a page to fit without
//     saying so; the square is how a piece is not cut 3% small.
//   - **Overlap and alignment marks.** Neighbouring pages share a strip (½ in,
//     or 1 cm). A dashed line runs down its middle with a ⊕ on it, labelled
//     with the two pages it joins (A1|A2 across, A1/B1 down), drawn in the
//     drawing's own coordinates — so it prints on both pages at the same
//     place in the drawing, and the pages align when the marks do.
//   - **A grid label and an assembly map.** Rows are letters and columns
//     numbers — A1, A2 … B1 — and a small map marks where this page goes.
//   - **Exactly the sheet.** Each page is an SVG whose root is the paper
//     (8.5in × 11in, 210mm × 297mm) with a viewBox in the paper's unit; the
//     drawing is placed in it by one exact transform and clipped to the
//     printable area. The HTML prints each page as one sheet under
//     `@page { margin: 0 }`, so at 100% nothing is scaled.
//
// The pages cover what the true-size document says a print covers — the
// pieces with their labels and names (`TrueSize.print`) — and the count is
// arithmetic: a sheet less its margins and its footer (the square, padded)
// is the tile; neighbours share the overlap, so each page advances by the
// tile less the overlap; a region `L` long takes ⌈(L − overlap) ÷ (tile −
// overlap)⌉ pages that way. Pure, deterministic, and nothing enters the log.

import type { Bounds } from '../types';
import type { LengthUnit, Quantity } from './quantity';
import { formatNumber, formatQuantity, quantity } from './quantity';
import type { TrueSize } from './truesize';
import { COORD_PLACES } from './truesize';
import { FONT_FAMILY, esc, fmt, systemOf, textWidth, unitFactor, wrap } from './svg';

export type Paper = 'letter' | 'a4';
export type Orientation = 'portrait' | 'landscape';

/** A sheet, portrait, in its own unit — and the page's furniture in that unit. */
export interface PaperSize {
  name: string;
  width: number;
  height: number;
  unit: 'in' | 'mm';
  /** Unprinted paper round the sheet: what most home printers leave. */
  margin: number;
  /** Above and below the test square, in the footer. */
  pad: number;
  /** Type: the grid label, and everything else in the footer. */
  big: number;
  small: number;
  thin: number;
  /** The largest cell of the map in the footer, and a cell of the assembly map. */
  cell: number;
  mapCell: number;
}

export const PAPERS: Readonly<Record<Paper, PaperSize>> = {
  letter: { name: 'Letter', width: 8.5, height: 11, unit: 'in', margin: 0.5, pad: 0.15, big: 0.28, small: 0.09, thin: 0.01, cell: 0.16, mapCell: 0.6 },
  a4: { name: 'A4', width: 210, height: 297, unit: 'mm', margin: 12, pad: 4, big: 7, small: 2.3, thin: 0.25, cell: 4, mapCell: 15 },
};

/** Decimals a page coordinate is written to: a ten-thousandth of an inch, a thousandth of a millimetre. */
const PAGE_PLACES: Record<'in' | 'mm', number> = { in: 4, mm: 3 };

export interface PrintOptions {
  /** Unset: Letter. */
  paper?: Paper;
  /** Unset: portrait. */
  orientation?: Orientation;
  /** Unprinted paper round each sheet; a bare number is in the paper's unit. Unset: ½ in on Letter, 12 mm on A4. */
  margin?: Quantity;
  /** What neighbouring pages share; a bare number is in the drawing's unit. Unset: ½ in for an imperial drawing, 1 cm for a metric one. */
  overlap?: Quantity;
}

export interface PrintPage {
  /** A row letter and a column number: A1, A2 … B1. */
  label: string;
  row: number;
  col: number;
  /** Its place in the print, from 0. */
  index: number;
  /** The part of the drawing it shows, in the drawing's unit and coordinates. */
  region: Bounds;
  /** The page as an SVG document the size of the sheet. */
  svg: string;
}

export interface PrintJob {
  paper: Paper;
  orientation: Orientation;
  /** The drawing's unit: every size below is in it. */
  unit: LengthUnit;
  rows: number;
  cols: number;
  pages: PrintPage[];
  /** How much of the drawing one page shows. */
  tile: { width: number; height: number };
  /** How much neighbouring pages share. */
  overlap: number;
  /** What the pages cover: the true-size document's pieces. */
  region: Bounds;
  /** The square on every page, in its own unit: 1 in, or 2 cm. */
  testSquare: { size: number; unit: LengthUnit; text: string };
  /** The pages as they are taped together, each labelled: an SVG. */
  assembly: string;
  /** Every page, one per sheet, at 100%: an HTML document. */
  html: string;
  reason: string;
  /** Why nothing could be tiled: margins or an overlap that leave no room. */
  error?: string;
}

/** A … Z, then AA, AB …: rows named as a spreadsheet names its columns. */
function rowName(r: number): string {
  let s = '';
  for (let n = r + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** An amount as a drafter writes it: halves and quarters of an inch as fractions, anything else as a decimal. */
function amount(v: number, unit: LengthUnit): string {
  const q = quantity(v, unit);
  return systemOf(unit) === 'imperial' ? formatQuantity(q, { fractions: 16, words: true }) : formatQuantity(q, { words: true });
}

/** A number as it would be written: to `places` decimals. */
function tidy(v: number, places: number): number {
  return Number(fmt(v, places));
}

/**
 * A true-size document tiled onto pages at 100%: each page an SVG the size
 * of the sheet showing its part of the drawing, with the overlap and the
 * alignment marks it shares with its neighbours, its grid label and map, and
 * a test square with the sentence to measure it before cutting; and one HTML
 * document that prints them one per sheet.
 */
export function printTiled(doc: Pick<TrueSize, 'unit' | 'title' | 'print'>, options: PrintOptions = {}): PrintJob {
  const paper = options.paper ?? 'letter';
  const P = PAPERS[paper];
  const orientation = options.orientation ?? 'portrait';
  const [pw, ph] = orientation === 'landscape' ? [P.height, P.width] : [P.width, P.height];
  const pu = P.unit;
  const U = doc.unit;
  const imperial = systemOf(U) === 'imperial';
  const k = unitFactor(U, pu);
  const pn = (v: number) => fmt(v, PAGE_PLACES[pu]);
  const places = COORD_PLACES[U];
  const dn = (v: number) => fmt(v, places);

  // The sheet: margins, then a footer as tall as the test square with room above and below it; the rest is the tile.
  const testSquare = imperial ? { size: 1, unit: 'in' as LengthUnit, text: '1 in' } : { size: 2, unit: 'cm' as LengthUnit, text: '2 cm' };
  const S = testSquare.size * unitFactor(testSquare.unit, pu);
  const m = options.margin ? options.margin.lo * unitFactor(options.margin.unit ?? pu, pu) : P.margin;
  const footer = S + 2 * P.pad;
  const Wp = pw - 2 * m, Hp = ph - 2 * m - footer;
  const od = options.overlap ? options.overlap.lo * unitFactor(options.overlap.unit ?? U, U) : imperial ? unitFactor('in', U) / 2 : unitFactor('cm', U);
  const Wd = Wp / k, Hd = Hp / k;
  const region = doc.print.region;
  const rw = region.maxX - region.minX, rh = region.maxY - region.minY;
  const base = {
    paper,
    orientation,
    unit: U,
    tile: { width: tidy(Wd, places), height: tidy(Hd, places) },
    overlap: tidy(od, places),
    region,
    testSquare,
  };
  const empty = (reason: string, error?: string): PrintJob => ({ ...base, rows: 0, cols: 0, pages: [], assembly: '', html: '', reason, ...(error ? { error } : {}) });
  if (!(rw > 0 && rh > 0) || !doc.print.markup) return empty('nothing to print: no figure is drawn at true size');
  if (!(od >= 0) || Wd <= od || Hd <= od) {
    const why = `the margins and a ${amount(od, U)} overlap leave no room on ${P.name} ${orientation}`;
    return empty(`nothing to print: ${why}`, why);
  }

  // The arithmetic: each page advances by the tile less the overlap.
  const count = (len: number, tile: number) => (len <= tile + 1e-9 ? 1 : Math.ceil((len - od) / (tile - od) - 1e-9));
  const cols = count(rw, Wd), rows = count(rh, Hd);
  const n = rows * cols;
  const x0 = (c: number) => region.minX + c * (Wd - od);
  const y0 = (r: number) => region.minY + r * (Hd - od);
  const label = (r: number, c: number) => `${rowName(r)}${c + 1}`;

  // Alignment marks, in the drawing's coordinates: the same bytes on both pages that share them.
  const F = imperial ? { rho: 0.12, font: 0.1, dash: 0.1, thin: 0.01, gap: 0.04 } : { rho: 3, font: 2.5, dash: 2.5, thin: 0.25, gap: 1 };
  const kf = unitFactor(imperial ? 'in' : 'mm', U);
  // A mark and its label stay inside the strip, so both pages print all of it: a narrow overlap makes them smaller.
  const longest = 2 * (rowName(rows - 1).length + String(cols).length) + 1;
  const rho = Math.min(F.rho * kf, 0.4 * od), font = Math.min(F.font * kf, (0.9 * od) / (0.6 * longest)), dash = F.dash * kf, gap = F.gap * kf;
  const text = (x: number, y: number, t: string, anchor: 'middle' | 'start') =>
    `<text x="${dn(x)}" y="${dn(y + 0.35 * font)}" font-size="${dn(font)}"${anchor === 'middle' ? ' text-anchor="middle"' : ''} fill="currentColor" stroke="none">${esc(t)}</text>`;
  // The dashed line stops at the mark and its label, so neither is crossed; the ⊕ says where the line runs.
  const dashes = `stroke-dasharray="${dn(dash)} ${dn(dash)}"`;
  const across = (r: number, c: number): string => {
    // Between (r, c) and (r, c + 1): down the middle of the strip they share.
    const x = x0(c + 1) + od / 2, top = y0(r), yM = top + Hd / 2;
    const name = `${label(r, c)}|${label(r, c + 1)}`;
    const below = yM + rho + gap + 1.2 * font + gap;
    return [
      `<g data-join="${name}">`,
      `<path d="M ${dn(x)} ${dn(top)} L ${dn(x)} ${dn(yM - rho)} M ${dn(x)} ${dn(below)} L ${dn(x)} ${dn(top + Hd)}" ${dashes}/>`,
      `<circle cx="${dn(x)}" cy="${dn(yM)}" r="${dn(rho)}"/>`,
      `<path d="M ${dn(x - rho)} ${dn(yM)} L ${dn(x + rho)} ${dn(yM)} M ${dn(x)} ${dn(yM - rho)} L ${dn(x)} ${dn(yM + rho)}"/>`,
      text(x, yM + rho + gap + 0.6 * font, name, 'middle'),
      '</g>',
    ].join('\n');
  };
  const down = (r: number, c: number): string => {
    // Between (r, c) and (r + 1, c): along the middle of the strip they share.
    const y = y0(r + 1) + od / 2, left = x0(c), xM = left + Wd / 2;
    const name = `${label(r, c)}/${label(r + 1, c)}`;
    const after = xM + rho + gap + textWidth(name, font) + gap;
    return [
      `<g data-join="${name}">`,
      `<path d="M ${dn(left)} ${dn(y)} L ${dn(xM - rho)} ${dn(y)} M ${dn(after)} ${dn(y)} L ${dn(left + Wd)} ${dn(y)}" ${dashes}/>`,
      `<circle cx="${dn(xM)}" cy="${dn(y)}" r="${dn(rho)}"/>`,
      `<path d="M ${dn(xM - rho)} ${dn(y)} L ${dn(xM + rho)} ${dn(y)} M ${dn(xM)} ${dn(y - rho)} L ${dn(xM)} ${dn(y + rho)}"/>`,
      text(xM + rho + gap, y, name, 'start'),
      '</g>',
    ].join('\n');
  };

  // The footer's words, the same on every page.
  const square = testSquare.text;
  const sentences = [
    `Measure this square before you cut: it must be exactly ${square} on each side.`,
    'If it is not, the printer scaled this page: print again at 100% (actual size), not fit to page.',
    `Pages overlap by ${amount(od, U)}: trim one along a dashed line and lay it over its neighbour, matching the ⊕ marks.`,
  ];
  const lastPage = `page ${n} of ${n}`;
  const colW = Math.max(textWidth('W'.repeat(rowName(rows - 1).length + String(cols).length), P.big), textWidth(lastPage, P.small));
  const gap2 = 1.5 * P.pad;
  const cell = Math.min(P.cell, S / rows, (1.6 * S) / cols);
  const fy = ph - m - footer;
  const mapRight = pw - m - colW - gap2;
  const mapLeft = mapRight - cols * cell;
  const textLeft = m + S + gap2;
  const textWide = Math.max(mapLeft - gap2 - textLeft, 10 * P.small);
  const words = sentences.flatMap((s) => wrap(s, textWide, P.small));
  const style = (thin: number) => `fill="none" stroke="currentColor" stroke-width="${pn(thin)}" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT_FAMILY}"`;

  const pages: PrintPage[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = label(r, c);
      const index = pages.length;
      const joins: string[] = [];
      if (r > 0) joins.push(down(r - 1, c));
      if (c > 0) joins.push(across(r, c - 1));
      if (c < cols - 1) joins.push(across(r, c));
      if (r < rows - 1) joins.push(down(r, c));
      const e = m - k * x0(c), f = m - k * y0(r);
      const footerEls: string[] = [];
      // The test square: filled to exactly its size, its outline drawn inside the fill so its outer edge is the square's.
      footerEls.push(`<rect data-test-square="${square}" x="${pn(m)}" y="${pn(fy + P.pad)}" width="${pn(S)}" height="${pn(S)}" fill="currentColor" fill-opacity="0.12" stroke="none"/>`);
      footerEls.push(`<rect x="${pn(m + P.thin / 2)}" y="${pn(fy + P.pad + P.thin / 2)}" width="${pn(S - P.thin)}" height="${pn(S - P.thin)}"/>`);
      footerEls.push(`<text x="${pn(m + S / 2)}" y="${pn(fy + P.pad + S / 2 + 0.35 * P.small)}" font-size="${pn(P.small)}" text-anchor="middle" fill="currentColor" stroke="none">${esc(square)}</text>`);
      words.forEach((line, i) => {
        footerEls.push(`<text x="${pn(textLeft)}" y="${pn(fy + P.pad + (i + 0.8) * 1.3 * P.small)}" font-size="${pn(P.small)}" fill="currentColor" stroke="none">${esc(line)}</text>`);
      });
      // The map: every page a cell, this one filled.
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          const here = rr === r && cc === c;
          footerEls.push(`<rect data-cell="${label(rr, cc)}"${here ? ' data-here="1"' : ''} x="${pn(mapLeft + cc * cell)}" y="${pn(fy + P.pad + rr * cell)}" width="${pn(cell)}" height="${pn(cell)}"${here ? ' fill="currentColor"' : ''}/>`);
        }
      }
      footerEls.push(`<text x="${pn(pw - m)}" y="${pn(fy + P.pad + 0.8 * P.big)}" font-size="${pn(P.big)}" font-weight="600" text-anchor="end" fill="currentColor" stroke="none">${name}</text>`);
      footerEls.push(`<text x="${pn(pw - m)}" y="${pn(fy + P.pad + P.big + 1.3 * P.small)}" font-size="${pn(P.small)}" text-anchor="end" fill="currentColor" stroke="none">page ${index + 1} of ${n}</text>`);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${pn(pw)}${pu}" height="${pn(ph)}${pu}" viewBox="0 0 ${pn(pw)} ${pn(ph)}" data-page="${name}">`,
        `<title>${esc(`${name} · page ${index + 1} of ${n} · ${doc.title}`)}</title>`,
        `<defs><clipPath id="mm-tile-${name}"><rect x="${pn(m)}" y="${pn(m)}" width="${pn(Wp)}" height="${pn(Hp)}"/></clipPath></defs>`,
        `<g clip-path="url(#mm-tile-${name})">`,
        `<g transform="matrix(${fmt(k, 10)} 0 0 ${fmt(k, 10)} ${pn(e)} ${pn(f)})">`,
        doc.print.markup,
        ...(joins.length ? [`<g ${style(F.thin * kf)}>`, ...joins, '</g>'] : []),
        '</g>',
        '</g>',
        `<rect data-tile-frame="${name}" x="${pn(m)}" y="${pn(m)}" width="${pn(Wp)}" height="${pn(Hp)}" fill="none" stroke="currentColor" stroke-width="${pn(P.thin)}" stroke-opacity="0.35"/>`,
        `<g data-footer="${name}" ${style(P.thin)}>`,
        ...footerEls,
        '</g>',
        '</svg>',
        '',
      ].join('\n');
      pages.push({
        label: name,
        row: r,
        col: c,
        index,
        region: { minX: tidy(x0(c), places), maxX: tidy(x0(c) + Wd, places), minY: tidy(y0(r), places), maxY: tidy(y0(r) + Hd, places) },
        svg,
      });
    }
  }

  // The assembly map, on its own.
  const mc = P.mapCell;
  const assembly = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pn(cols * mc)}${pu}" height="${pn(rows * mc)}${pu}" viewBox="0 0 ${pn(cols * mc)} ${pn(rows * mc)}" data-assembly="${cols}×${rows}">`,
    `<g ${style(P.thin)}>`,
    ...pages.map((p) => [
      `<rect data-cell="${p.label}" x="${pn(p.col * mc)}" y="${pn(p.row * mc)}" width="${pn(mc)}" height="${pn(mc)}"/>`,
      `<text x="${pn((p.col + 0.5) * mc)}" y="${pn((p.row + 0.5) * mc + 0.35 * 0.3 * mc)}" font-size="${pn(0.3 * mc)}" text-anchor="middle" fill="currentColor" stroke="none">${p.label}</text>`,
    ].join('\n')),
    '</g>',
    '</svg>',
  ].join('\n');

  const pages1 = n === 1 ? 'page' : 'pages';
  const reason = `${n} ${pages1}, ${cols} across and ${rows} down, on ${P.name} ${orientation} at 100%: each shows ${formatNumber(Wd, 2)} × ${formatNumber(Hd, 2)} ${U} of the drawing, and neighbours share ${amount(od, U)}; measure the ${square} square on any page before cutting`;

  const sheetW = `${pn(pw)}${pu}`, sheetH = `${pn(ph)}${pu}`;
  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${esc(`${doc.title} — ${n} ${pages1}, ${P.name} ${orientation}`)}</title>`,
    '<style>',
    `@page { size: ${sheetW} ${sheetH}; margin: 0; }`,
    'html, body { margin: 0; padding: 0; background: #fff; color: #000; }',
    `.sheet { width: ${sheetW}; height: ${sheetH}; overflow: hidden; break-after: page; page-break-after: always; }`,
    '.sheet:last-child { break-after: auto; page-break-after: auto; }',
    `.sheet > svg { display: block; width: ${sheetW}; height: ${sheetH}; }`,
    `.guide { font: 14px/1.5 ${FONT_FAMILY}; max-width: 46em; margin: 0 auto; padding: 24px 16px; }`,
    '.guide svg { display: block; max-width: 100%; height: auto; margin-top: 16px; }',
    '@media screen { body { background: #e9e7e2; } .sheet { margin: 24px auto; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); } }',
    '@media print { .guide { display: none; } }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="guide">',
    `<h1>${esc(doc.title)}</h1>`,
    `<p>${esc(`${n} ${pages1}, ${cols} across and ${rows} down, on ${P.name} ${orientation}.`)}</p>`,
    '<ol>',
    '<li>Print at 100% — “actual size” — with fit to page turned off.</li>',
    `<li>${esc(`Measure the square on the first page before you cut: it must be exactly ${square} on each side. If it is not, the printer scaled the page; print again.`)}</li>`,
    `<li>${esc(`Lay the pages out as the map shows, A1 at the top left. Pages overlap by ${amount(od, U)}: trim one along a dashed line, lay it over its neighbour with the ⊕ marks on each other, and tape.`)}</li>`,
    '</ol>',
    assembly,
    '</div>',
    ...pages.map((p) => `<section class="sheet" aria-label="page ${p.label}">\n${p.svg}</section>`),
    '</body>',
    '</html>',
    '',
  ].join('\n');

  return { ...base, rows, cols, pages, assembly, html, reason };
}
