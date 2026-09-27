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

import { readFileSync, existsSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { join } from 'node:path';
import { OUT_DIR, args } from './lib.mjs';

export function loadMap(file = join(OUT_DIR, 'core-source.mjs.map')) {
  if (!existsSync(file)) return null;
  return new SourceMap(JSON.parse(readFileSync(file, 'utf8')));
}

/** `src/file.ts:line` for a frame in the engine bundle, else the frame's own place. */
export function place(frame, map) {
  const url = frame.url || '';
  const inEngine = /core-source[^/]*\.mjs|metamedium-core\.node\.mjs/.test(url);
  if (inEngine && map) {
    const e = map.findEntry(frame.lineNumber, frame.columnNumber);
    if (e && e.originalSource) {
      const src = e.originalSource.replace(/^.*?(src\/)/, '$1');
      return `${src}:${e.originalLine + 1}`;
    }
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
  const map = loadMap(a.map);
  const profile = JSON.parse(readFileSync(file, 'utf8'));
  const { totalMs, bySelf, byTotal } = analyze(profile, map, { top: Number(a.top || 25) });
  console.log(`${file}\n${(totalMs / 1000).toFixed(1)} s sampled${map ? '' : ' (no source map found — frames are bundle positions)'}\n`);
  console.log('self time');
  for (const r of bySelf) console.log(`  ${pct(r.self, totalMs)}  ${(r.self / 1000).toFixed(2).padStart(7)} s  ${r.name}  ${r.where}`);
  console.log('\ninclusive time');
  for (const r of byTotal) console.log(`  ${pct(r.total, totalMs)}  ${(r.total / 1000).toFixed(2).padStart(7)} s  ${r.name}  ${r.where}`);
}
