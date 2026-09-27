// Shared plumbing for the performance baseline (V1-PLAN.md §9 R4a; PERF.md).
//
// Two ways to get the engine, because the plan asks for both: the committed
// Node bundle (`Demos/metamedium-core.node.mjs`, what the MCP hand runs) and
// core built from source right now (esbuild, the same tool and flags as
// `npm run build:node`, plus a source map so a CPU profile can be read back
// to `src/…:line`). The source build is written under `dist/bench/`, which is
// build output and ignored; nothing here writes into the source tree.
//
// Nothing in this directory is part of `npm test`: a benchmark that runs on
// every push is a benchmark someone turns off.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
export const CORE_DIR = resolve(here, '..');
export const REPO = resolve(CORE_DIR, '..');
export const OUT_DIR = join(CORE_DIR, 'dist', 'bench');
export const BUNDLE_PATH = join(REPO, 'Demos', 'metamedium-core.node.mjs');
const NODE_BANNER = '/* metamedium-core node bundle — built from metamedium-core/src via: npm run build:node. Do not edit directly. */';

/**
 * The engine, as a module namespace.
 *
 * `which`: 'bundle' (the committed Node bundle) or 'source' (built now).
 * `patch`: source-level string replacements applied at build time, for an
 * ABLATION only — "what does replay cost with checkpoints off" — never to
 * change what is measured by default. Each is `{ file, find, replace }`; a
 * find that does not match throws, so an ablation cannot silently measure
 * the unpatched engine.
 */
export async function loadCore(which = 'bundle', { patch = [], tag = '' } = {}) {
  if (which === 'bundle') {
    if (patch.length) throw new Error('patches apply to the source build only');
    return { core: await import(pathToFileURL(BUNDLE_PATH).href), path: BUNDLE_PATH, which };
  }
  if (which !== 'source') throw new Error(`unknown core "${which}" — bundle or source`);
  const { build } = await import('esbuild');
  mkdirSync(OUT_DIR, { recursive: true });
  const name = `core-source${tag ? '-' + tag : ''}.mjs`;
  const outfile = join(OUT_DIR, name);
  const plugins = patch.length
    ? [{
        name: 'bench-ablation',
        setup(b) {
          b.onLoad({ filter: /\.ts$/ }, (args) => {
            let text = readFileSync(args.path, 'utf8');
            for (const p of patch) {
              if (!args.path.endsWith(p.file)) continue;
              if (!text.includes(p.find)) throw new Error(`ablation: "${p.find}" not found in ${p.file}`);
              text = text.split(p.find).join(p.replace);
              p.applied = true;
            }
            return { contents: text, loader: 'ts' };
          });
        },
      }]
    : [];
  await build({
    entryPoints: [join(CORE_DIR, 'src', 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    // The same banner as `npm run build:node`, so this file's lines are the
    // committed bundle's lines and one source map reads a profile of either.
    banner: { js: NODE_BANNER },
    absWorkingDir: CORE_DIR,
    sourcemap: 'linked',
    sourcesContent: false,
    outfile,
    logLevel: 'silent',
    plugins,
  });
  for (const p of patch) if (!p.applied) throw new Error(`ablation: ${p.file} was never loaded`);
  // A fresh URL per build, so two ablations in one process are two modules.
  const url = pathToFileURL(outfile).href + `?t=${Date.now()}${tag}`;
  return { core: await import(url), path: outfile, which };
}

const BROWSER_BANNER = '/* metamedium-core browser bundle \u2014 built from metamedium-core/src via: npm run build:browser. Do not edit directly. */';
export const BROWSER_BUNDLE_PATH = join(REPO, 'Demos', 'metamedium-core.browser.js');

/**
 * The browser bundle built from source with a source map, the way
 * `npm run build:browser` builds it, so a browser profile of the committed
 * `Demos/metamedium-core.browser.js` reads back to `src/…:line`. Returns
 * whether the build is byte-identical to the committed copy (it must be, or
 * the map would describe a different file).
 */
export async function buildBrowserMap() {
  const { build } = await import('esbuild');
  mkdirSync(OUT_DIR, { recursive: true });
  const outfile = join(OUT_DIR, 'core-browser.js');
  await build({
    entryPoints: [join(CORE_DIR, 'src', 'index.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'MetaMediumCore',
    banner: { js: BROWSER_BANNER },
    absWorkingDir: CORE_DIR,
    sourcemap: 'linked',
    sourcesContent: false,
    outfile,
    logLevel: 'silent',
  });
  const built = readFileSync(outfile, 'utf8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
  return { map: outfile + '.map', identical: built === readFileSync(BROWSER_BUNDLE_PATH, 'utf8') };
}

/** Median, p95 and the rest of a list of milliseconds. Nearest-rank percentiles. */
export function summarize(samples) {
  const xs = samples.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!xs.length) return { n: 0 };
  const rank = (p) => xs[Math.min(xs.length - 1, Math.max(0, Math.ceil((p / 100) * xs.length) - 1))];
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { n: xs.length, median: rank(50), p95: rank(95), min: xs[0], max: xs[xs.length - 1], mean };
}

/** Milliseconds, to a sensible number of figures for a table. */
export function ms(x) {
  if (x === undefined || x === null || !Number.isFinite(x)) return '—';
  if (x >= 10000) return (x / 1000).toFixed(1) + ' s';
  if (x >= 1000) return (x / 1000).toFixed(2) + ' s';
  if (x >= 100) return x.toFixed(0) + ' ms';
  if (x >= 10) return x.toFixed(1) + ' ms';
  return x.toFixed(2) + ' ms';
}

export function mb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Time one call. */
export function timed(fn) {
  const t = performance.now();
  const value = fn();
  return { ms: performance.now() - t, value };
}

/** A full collection, when the process was started with --expose-gc; a no-op otherwise. */
export function gc() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    globalThis.gc();
  }
}

export function heapUsed() {
  gc();
  return process.memoryUsage().heapUsed;
}

/** The machine a number was taken on — said with every result. */
export function machine() {
  const cpus = os.cpus();
  return {
    cpu: cpus[0] ? cpus[0].model : 'unknown',
    cores: cpus.length,
    memory: mb(os.totalmem()),
    os: `${os.type()} ${os.release()}`,
    node: process.version,
    v8: process.versions.v8,
  };
}

export function writeResult(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

export function readResult(name) {
  const file = join(OUT_DIR, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** `--key=value` and bare `--flag` from argv. */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
    else out._.push(a);
  }
  return out;
}
