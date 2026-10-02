// Read a CPU profile back to the engine's source (PERF.md, the hotspots).
//
//     node --cpu-prof --cpu-prof-dir=metamedium-core/dist/bench/prof \
//          metamedium-core/bench/engine.mjs replay --size=2000 --core=source
//     node metamedium-core/bench/profile.mjs metamedium-core/dist/bench/prof/<file>.cpuprofile
//
// Self time is where the samples landed; inclusive time counts a function
// once per sample however deep it recurses. Frames in the engine bundle are
// mapped through the source build's map (`dist/bench/core-source.mjs.map`) to
// `src/<file>:<line>` — the source build is byte-identical to the committed
// Node bundle (lib.mjs builds it with the same banner and working directory),
// so the map reads a profile of either.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { join } from 'node:path';
import { OUT_DIR, REPO, args } from './lib.mjs';

function mapFrom(file) {
  if (!existsSync(file)) return null;
  return new SourceMap(JSON.parse(readFileSync(file, 'utf8')));
}

/**
 * Where each surface fragment sits in the built `Demos/session-engine.js`,
 * computed the way `Demos/build-surface.mjs` concatenates them (a banner,
 * `(function () {`, then the fragments joined by one blank line), and checked
 * against the committed file so a stale map is refused, not trusted.
 */
function surfaceMap() {
  const dir = join(REPO, 'Demos', 'surface');
  const names = readdirSync(dir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
  const parts = names.map((f) => readFileSync(join(dir, f), 'utf8').replace(/\s+$/, ''));
  const built = '/* Built from Demos/surface/*.js by Demos/build-surface.mjs — do not edit; edit the fragments. */\n' +
    '(function () {\n' + parts.join('\n\n') + '\n})();\n';
  if (built !== readFileSync(join(REPO, 'Demos', 'session-engine.js'), 'utf8')) return null;
  const spans = [];
  let line = 3;
  parts.forEach((p, i) => {
    const n = p.split('\n').length;
    spans.push({ file: `Demos/surface/${names[i]}`, start: line, end: line + n - 1 });
    line += n + 1;
  });
  return (l) => {
    const s = spans.find((x) => l >= x.start && l <= x.end);
    return s ? `${s.file}:${l - s.start + 1}` : null;
  };
}

/** The maps a profile is read through: the Node bundle's, the browser bundle's, the surface's. */
export function loadMap() {
  return {
    node: mapFrom(join(OUT_DIR, 'core-source.mjs.map')),
    browser: mapFrom(join(OUT_DIR, 'core-browser.js.map')),
    surface: surfaceMap(),
  };
}

/** `src/file.ts:line` (or `Demos/surface/…:line`) for a frame, else the frame's own place. */
export function place(frame, maps) {
  const url = frame.url || '';
  const viaMap = (map) => {
    const e = map && map.findEntry(frame.lineNumber, frame.columnNumber);
    if (e && e.originalSource) return `${e.originalSource.replace(/^.*?(src\/)/, '$1')}:${e.originalLine + 1}`;
    return null;
  };
  if (/core-source[^/]*\.mjs|metamedium-core\.node\.mjs/.test(url)) {
    const p = viaMap(maps && maps.node);
    if (p) return p;
  }
  if (/metamedium-core\.browser\.js/.test(url)) {
    const p = viaMap(maps && maps.browser);
    if (p) return p;
  }
  if (/session-engine\.js/.test(url) && maps && maps.surface) {
    const p = maps.surface(frame.lineNumber + 1);
    if (p) return p;
  }
  if (!url) return '(native)';
  const short = url.replace(/^file:\/\//, '').replace(/\?.*$/, '').replace(/^.*\/(MetaMedium[^/]*)\//, '');
  return `${short}:${frame.lineNumber + 1}`;
}

export function analyze(profile, map, { top = 25 } = {}) {
  const byId = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);

  const keyOf = (n) => {
    const f = n.callFrame;
    return `${f.functionName || '(anonymous)'}@${f.url}:${f.lineNumber}:${f.columnNumber}`;
  };
  const info = new Map();
  const get = (n) => {
    const k = keyOf(n);
    let v = info.get(k);
    if (!v) {
      v = { name: n.callFrame.functionName || '(anonymous)', where: place(n.callFrame, map), self: 0, total: 0 };
      info.set(k, v);
    }
    return v;
  };

  let totalMs = 0;
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const dt = (deltas[i] || 0) / 1000;
    totalMs += dt;
    let n = byId.get(samples[i]);
    if (!n) continue;
    get(n).self += dt;
    const seen = new Set();
    while (n) {
      const k = keyOf(n);
      if (!seen.has(k)) {
        seen.add(k);
        get(n).total += dt;
      }
      const p = parent.get(n.id);
      n = p === undefined ? null : byId.get(p);
    }
  }
  const idle = new Set(['(idle)', '(program)', '(garbage collector)', '(root)']);
  const rows = [...info.values()];
  const bySelf = rows.filter((r) => r.self > 0).sort((a, b) => b.self - a.self).slice(0, top);
  const byTotal = rows.filter((r) => !idle.has(r.name)).sort((a, b) => b.total - a.total).slice(0, top);
  return { totalMs, bySelf, byTotal };
}

function pct(x, of) {
  return ((100 * x) / Math.max(1e-9, of)).toFixed(1).padStart(5) + '%';
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const a = args();
  const file = a._[0];
  if (!file) {
    console.error('usage: node profile.mjs <file.cpuprofile> [--top=25] [--map=<file.map>]');
    process.exit(2);
  }
  const map = loadMap();
  const profile = JSON.parse(readFileSync(file, 'utf8'));
  const { totalMs, bySelf, byTotal } = analyze(profile, map, { top: Number(a.top || 25) });
  console.log(`${file}\n${(totalMs / 1000).toFixed(1)} s sampled${map.node ? '' : ' (no Node source map — run a --core=source measurement first)'}${map.surface ? '' : ' (session-engine.js does not match its fragments — surface frames unmapped)'}\n`);
  console.log('self time');
  for (const r of bySelf) console.log(`  ${pct(r.self, totalMs)}  ${(r.self / 1000).toFixed(2).padStart(7)} s  ${r.name}  ${r.where}`);
  console.log('\ninclusive time');
  for (const r of byTotal) console.log(`  ${pct(r.total, totalMs)}  ${(r.total / 1000).toFixed(2).padStart(7)} s  ${r.name}  ${r.where}`);
}
