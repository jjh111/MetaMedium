#!/usr/bin/env node
// Does a label sit on ink it does not name?
//
//   node e2e/whitepaper-figure-ink.mjs [width ...]     (default: 1440 1024 768 390 320)
//
// Beside the gate, not in it: a diagnostic for the whitepaper's plates, run by
// hand after editing Assets/whitepaper-figures/build.py. The plates' labels are
// HTML at reading size, positioned in percentages over a 1000-unit drawing, so
// a label that clears the geometry on a desktop can land on it when three
// scenes share a row — and nothing in the plate audit sees that, because a
// label with the plate's own background simply hides what it covers.
//
// It samples every geometry element along its own outline, maps the points to
// the screen, and reports any that land inside a label's box. It also reports
// geometry drawn outside the canvas, and labels pushed outside their drawing.
//
// A label MAY interrupt the line it names — that is what a contour label does,
// and the plates rely on it twice (`ALLOWED` below). Anything else is a defect:
// at the time this was written it found 27 collisions at 1024, including every
// vertex name of the semiotic triangle sitting on its own vertex circle.
//
// Phone widths are crowded by construction: a 1000-unit drawing in a ~300px box
// with labels that must stay readable leaves little room, so the narrow numbers
// are a watch list, not a pass/fail.
import { chromium } from 'playwright';
import { startStatic } from './servers.mjs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const widths = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
const sizes = widths.length ? widths : [1440, 1024, 768, 390, 320];

// A label naming the dashed return path it interrupts.
const ALLOWED = [
  { where: 'triad', label: 'Interpret ↔ revise', el: 'fp-line fp-model' },
  { where: 'alignment/shared', label: 'Inspect ↔ revise', el: 'fp-line fp-model' },
];

const collect = () => {
  const out = [];
  const samplePoints = (el) => {
    const svg = el.ownerSVGElement, m = el.getScreenCTM();
    if (!m) return [];
    const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); };
    const tag = el.tagName.toLowerCase(), N = 72, res = [];
    try {
      if (tag === 'circle' || tag === 'ellipse') {
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy');
        const rx = +(el.getAttribute('r') ?? el.getAttribute('rx')), ry = +(el.getAttribute('r') ?? el.getAttribute('ry'));
        for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI; res.push(pt(cx + rx * Math.cos(a), cy + ry * Math.sin(a))); }
      } else if (tag === 'rect') {
        const x = +el.getAttribute('x'), y = +el.getAttribute('y'), w = +el.getAttribute('width'), h = +el.getAttribute('height');
        for (let i = 0; i <= 20; i++) { const t = i / 20; res.push(pt(x + w * t, y), pt(x + w * t, y + h), pt(x, y + h * t), pt(x + w, y + h * t)); }
      } else if (el.getTotalLength) {
        const L = el.getTotalLength(); if (!L) return [];
        const steps = Math.max(24, Math.min(400, Math.round(L / 4)));
        for (let i = 0; i <= steps; i++) { const q = el.getPointAtLength(L * i / steps); res.push(pt(q.x, q.y)); }
      }
    } catch { return []; }
    return res;
  };
  for (const map of document.querySelectorAll('.fp-map')) {
    const fig = map.closest('[data-plate]'), scene = map.closest('.fp-scene');
    const where = fig.dataset.plate + (scene ? '/' + scene.dataset.scene : '');
    const mapRect = map.getBoundingClientRect();
    // An enhanced plate hides its static node names and shows buttons in their
    // place; only what is actually on screen can cover anything.
    const labels = [...map.querySelectorAll('.fp-map-label, .fp-map-action')]
      .filter(l => { const c = getComputedStyle(l); return c.display !== 'none' && c.visibility !== 'hidden'; })
      .map(l => ({ text: l.textContent.trim().slice(0, 28), r: l.getBoundingClientRect() }));
    const svg = map.querySelector('svg');
    const vb = svg.viewBox.baseVal, ctm = svg.getScreenCTM();
    const corner = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(ctm); };
    const tl = corner(vb.x, vb.y), br = corner(vb.x + vb.width, vb.y + vb.height);
    for (const el of svg.querySelectorAll('path,circle,ellipse,rect,polyline,polygon,line')) {
      if (el.closest('marker') || el.closest('defs')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || +cs.opacity === 0) continue;
      let o = 1; for (let n = el; n && n !== svg; n = n.parentElement) o *= +getComputedStyle(n).opacity;
      if (o < 0.08) continue;                     // a layer faded out covers nothing
      const pts = samplePoints(el);
      const cls = el.getAttribute('class') || el.tagName;
      for (const lab of labels) {
        const hits = pts.filter(q => q.x > lab.r.left + 2 && q.x < lab.r.right - 2 && q.y > lab.r.top + 2 && q.y < lab.r.bottom - 2).length;
        if (hits) out.push({ kind: 'label-on-ink', where, label: lab.text, el: cls, hits });
      }
      const outside = pts.filter(q => q.x < tl.x - 0.5 || q.x > br.x + 0.5 || q.y < tl.y - 0.5 || q.y > br.y + 0.5).length;
      if (outside) out.push({ kind: 'outside-canvas', where, el: cls, points: outside, of: pts.length });
    }
    for (const lab of labels)
      if (lab.r.left < mapRect.left - 0.5 || lab.r.right > mapRect.right + 0.5 || lab.r.top < mapRect.top - 0.5 || lab.r.bottom > mapRect.bottom + 0.5)
        out.push({ kind: 'label-outside-map', where, label: lab.text });
  }
  return out;
};

const server = await startStatic(root);
const browser = await chromium.launch();
let worst = 0;
try {
  for (const width of sizes) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width < 850, hasTouch: width < 1100 });
    const page = await context.newPage();
    await page.goto(server.origin, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelectorAll('[data-enhanced]').length === 7);
    const found = (await page.evaluate(collect)).filter(r =>
      !ALLOWED.some(a => a.where === r.where && a.label === r.label && a.el === r.el));
    console.log(`\n${width}px — ${found.length || 'no'} finding${found.length === 1 ? '' : 's'}`);
    for (const r of found) console.log('  ' + JSON.stringify(r));
    if (width >= 768) worst = Math.max(worst, found.length);
    await context.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
// Desktop and tablet are held to zero; phone widths are reported, not enforced.
console.log(worst ? `\nFAIL: ${worst} finding(s) at 768px or wider` : '\nPASS: nothing covered at 768px and wider');
process.exit(worst ? 1 : 0);
