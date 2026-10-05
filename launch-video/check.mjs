// The film's layout check: every visible word inside the frame, inside its box, and on top.
//   node launch-video/check.mjs [--step 0.25] [--from 0] [--to <end>]
// Samples render(t) and reports, by kind, the text that:
//   clipped   — runs past the edge of the frame (frames where the camera is panning are skipped)
//   overflow  — spills out of the pill, chip, card or field it stands in (a rect marked data-box)
//   covered   — lies under a box drawn after it
//   overlap   — overlaps another visible text
// Exits 1 when anything is reported.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : Number(args[i + 1]); };
let pw; for (const p of [join(here, '../e2e/package.json'), '/opt/node22/lib/node_modules/playwright/package.json']) { try { pw = createRequire(p)('playwright'); break; } catch {} }
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(join(here, 'index.html')).href + '?render=1');
await page.waitForFunction(() => window.__ready === true);
const duration = await page.evaluate(() => window.DURATION);
const step = opt('step', 0.25), from = opt('from', 0), to = opt('to', duration);

const found = new Map(); // kind|text → [times]
for (let t = from; t <= to; t += step) {
  const issues = await page.evaluate(t => {
    window.render(t);
    const a = window.__camAt(t), b = window.__camAt(t + 0.1);
    const panning = Math.hypot(a.x - b.x, a.y - b.y) * a.s > 4 || Math.abs(a.s - b.s) > 0.004;
    const opacity = el => { let o = 1; for (let e = el; e && e.tagName !== 'svg'; e = e.parentElement) { const v = e.getAttribute('opacity'); if (v !== null) o *= Number(v); } return o; };
    const svg = document.getElementById('svg'), out = [];
    const texts = [...svg.querySelectorAll('text')].filter(e => e.textContent.trim() && opacity(e) > 0.35)
      .map(e => ({ e, r: e.getBoundingClientRect(), s: e.textContent.trim().slice(0, 48) })).filter(x => x.r.width > 2);
    const boxes = [...svg.querySelectorAll('rect[data-box]')].filter(e => opacity(e) > 0.35).map(e => ({ e, r: e.getBoundingClientRect() }));
    const inside = (p, r) => p[0] >= r.left && p[0] <= r.right && p[1] >= r.top && p[1] <= r.bottom;
    const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    for (const x of texts) {
      const r = x.r, onFrame = r.right > 0 && r.left < 1920 && r.bottom > 0 && r.top < 1080;
      if (!panning && onFrame && (r.left < -1 || r.right > 1921 || r.top < -1 || r.bottom > 1081)) out.push(['clipped', x.s]);
      const start = [r.left + 3, (r.top + r.bottom) / 2];
      const own = boxes.filter(b => inside(start, b.r)).sort((p, q) => p.r.width * p.r.height - q.r.width * q.r.height)[0];
      if (own && (r.right > own.r.right + 1 || r.left < own.r.left - 1)) out.push(['overflow', x.s]);
      for (const b of boxes) if (b !== own && !b.e.parentElement.contains(x.e) && (x.e.compareDocumentPosition(b.e) & Node.DOCUMENT_POSITION_FOLLOWING) && !inside(start, b.r) && area(r, b.r) > 0.15 * r.width * r.height) out.push(['covered', x.s]);
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const A = texts[i], B = texts[j], ov = area(A.r, B.r);
      if (ov > 0.2 * Math.min(A.r.width * A.r.height, B.r.width * B.r.height)) out.push(['overlap', A.s + '  ×  ' + B.s]);
    }
    return out;
  }, t);
  for (const [k, s] of issues) { const key = k + ' | ' + s; if (!found.has(key)) found.set(key, []); found.get(key).push(t); }
}
await browser.close();
const span = ts => { const out = []; let a = ts[0], p = ts[0]; for (const t of ts.slice(1)) { if (t - p > step * 1.5) { out.push([a, p]); a = t; } p = t; } out.push([a, p]); return out.map(([a, b]) => a === b ? a.toFixed(2) : `${a.toFixed(2)}–${b.toFixed(2)}`).join(', '); };
for (const [k, ts] of [...found].sort((a, b) => a[1][0] - b[1][0])) console.log(`${span(ts).padEnd(24)} ${k}`);
console.log(found.size ? `${found.size} problems` : 'clean');
if (found.size) process.exitCode = 1;
