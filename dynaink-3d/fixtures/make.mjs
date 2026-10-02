#!/usr/bin/env node
//
// ===== fixtures/make.mjs — John's boards, written as the logs they are =====
//
// A `.json` in this directory is a **view** of a board: what `__shard.state()`
// exposed, captured before there was an export, with no stroke points in it at
// all. `boardFromFixture` can rebuild a drawing from those bounds, and the
// status line says every time that it is a reconstruction. A **log** is the
// board: core's own `encodeLog`, one JSON event per line, replayed straight
// into the session, so state is a pure function of it (invariant 4).
//
// This script writes the logs, so that `?fixture=` and *Open…* load the same
// file and that file is what a hand's export would be.
//
//     node fixtures/make.mjs                    # both boards
//     node fixtures/make.mjs massing            # just the second board
//     node fixtures/make.mjs castle-sketch      # just the first
//
// **Two boards, two doors, and the difference is honest.**
//
// - `john-2026-09-16-massing.mm.log` is stood up **in Node**, through the real
//   session: `createLog()` from `src/log.ts`, the three profiles `boardFromFixture`
//   rebuilds from his captured view, and `massable()` / `mass()` — the same door
//   `tier1()` reaches when a hand draws the third profile. No renderer is needed
//   because `log.ts` carries no three.js; it is the seam between the space and
//   the engine, and that is the whole of what a board is.
//
// - `john-2026-09-16-castle-sketch.mm.log` cannot be stood up that way, and
//   pretending otherwise would be writing a different drawing. Its three ⊓ lie
//   on **view planes** — planes built from where the camera stood and where the
//   cursor was placed — and a camera is three.js. So this one is exported from
//   **the surface itself**: a browser opens `?demo=castle-sketch`, the demo draws
//   the board through the same pointer path a hand uses, and the script takes
//   `__shard.logText()`. That is not a simulation of an export; it is one.
//
// Both files are then **stamped**: each distinct `at` in the log, in order, is
// rewritten to a fixed base plus a second. Nothing about the board changes —
// `at` is what undo groups an act by, and equal stays equal — but the file stops
// churning on every regeneration, so a diff shows a change in the DRAWING.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shard = resolve(here, '..');
const root = resolve(shard, '..');

/** Midnight, 16 September 2026, UTC — the day both boards were drawn. */
const BASE = Date.UTC(2026, 8, 16, 0, 0, 0);

/**
 * Rewrite the clock without touching the board.
 *
 * `at` carries one meaning the log depends on: events sharing one are one ACT,
 * which is how undo knows where an act ends (README, *How undo knows where an
 * act ends*). Mapping distinct values in order onto a fixed ladder keeps every
 * equality and every ordering and throws away only the wall clock.
 */
function stamp(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const seen = [];
  for (const line of lines) {
    const at = JSON.parse(line).at;
    if (typeof at === 'number' && !seen.includes(at)) seen.push(at);
  }
  seen.sort((a, b) => a - b);
  const to = new Map(seen.map((at, i) => [at, BASE + i * 1000]));
  return (
    lines
      .map((line) => {
        const e = JSON.parse(line);
        if (typeof e.at === 'number' && to.has(e.at)) e.at = to.get(e.at);
        return JSON.stringify(e);
      })
      .join('\n') + '\n'
  );
}

function write(name, text) {
  const file = join(here, name);
  const out = stamp(text);
  const same = existsSync(file) && readFileSync(file, 'utf8') === out;
  writeFileSync(file, out);
  const events = out.split('\n').filter((l) => l.trim()).length;
  console.log(`· ${name} — ${events} events, ${out.length} bytes${same ? ' (unchanged)' : ''}`);
  return out;
}

// ---------------------------------------------------------------------------
// John's second board — the massing, stood in Node through the real session.
// ---------------------------------------------------------------------------

async function makeMassing() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: shard,
    configFile: join(shard, 'vite.config.ts'),
    server: { middlewareMode: true },
    logLevel: 'error',
  });
  try {
    const { createLog } = await server.ssrLoadModule('/src/log.ts');
    const { boardFromFixture, encodeBoard, FIXTURE_PEN_PX } = await server.ssrLoadModule('/src/export.ts');
    const { NAMED } = await server.ssrLoadModule('/src/plane.ts');

    const captured = JSON.parse(readFileSync(join(here, 'john-2026-09-16-massing.json'), 'utf8'));
    const built = boardFromFixture(captured);
    if (!built.marks.length) throw new Error('nothing in the captured view could be rebuilt');

    const log = createLog();
    // The form rung asks the space for silhouettes and spans; in Node there is
    // no space to ask. A blind one answers nothing, which is the truth here and
    // is exactly what `export.test.ts` hands it — the three profiles on the
    // three named planes need no silhouette to stand a massing.
    log.sees({ silhouettes: () => [], spanAlong: () => 0, silhouetteOn: () => null });

    let at = BASE;
    for (const m of built.marks) {
      const xs = m.points.map((p) => p.x);
      const ys = m.points.map((p) => p.y);
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      log.add(m.points, NAMED[m.plane]('chosen', m.why), size / FIXTURE_PEN_PX, (at += 1000));
    }
    // The same door `tier1()` reaches: profiles on different world planes whose
    // projections overlap ARE a solid, and the massing stands with no model.
    const massable = log.massable();
    if (!massable) throw new Error('the three profiles did not afford a massing');
    const stood = log.mass(massable, (at += 1000));
    if (!stood) throw new Error('the massing did not stand');

    console.log(
      `  ${built.marks.length} marks rebuilt (${built.dropped.length} view-plane strokes dropped), ` +
        `${massable.planes.slice().sort().join(' + ')} → ${stood.name}`
    );
    return write('john-2026-09-16-massing.mm.log', encodeBoard(log.session.getEvents()));
  } finally {
    await server.close();
  }
}

// ---------------------------------------------------------------------------
// John's first board — the castle sketch, exported from the surface itself.
// ---------------------------------------------------------------------------

async function makeCastleSketch() {
  const e2e = join(root, 'e2e');
  if (!existsSync(join(e2e, 'node_modules'))) {
    throw new Error(`this board is exported from a browser and e2e/ has no node_modules — run \`npm ci\` in ${e2e}`);
  }
  // Playwright is the GATE's dependency, not the shard's — the shard runs with
  // no browser at all. `createRequire` rooted at `e2e/` resolves it from there
  // rather than adding it here; it is CommonJS, so it is required, not imported.
  const require = createRequire(join(e2e, 'package.json'));
  const { chromium } = require('playwright');
  const { startVite } = await import(join(e2e, 'servers.mjs'));

  const server = await startVite(shard);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    // The demo draws the board at boot through the same pointer path a hand
    // uses — `?demo=castle-sketch` is `CASTLE_SKETCH`'s own numbers in `main.ts`.
    await page.goto(`${server.origin}/?demo=castle-sketch`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => !!window.__shard, null, { timeout: 90000 });
    // Wait for the hull the board stands, not for a fixed sleep: what is being
    // exported is a board with something standing on it.
    await page.waitForFunction(() => window.__shard.solids().length > 0, null, { timeout: 60000 });
    const out = await page.evaluate(() => ({
      text: window.__shard.logText(),
      marks: window.__shard.state().marks.length,
      solids: window.__shard.solids().map((s) => s.name),
      parts: window.__shard.parts(window.__shard.solids()[0].id).map((p) => p.sentence),
    }));
    console.log(`  ${out.marks} marks, ${out.solids.join(' + ')}, ${out.parts.length} parts`);
    for (const p of out.parts) console.log(`    ${p}`);
    return write('john-2026-09-16-castle-sketch.mm.log', out.text);
  } finally {
    await browser.close().catch(() => {});
    await server.stop().catch(() => {});
  }
}

// ---------------------------------------------------------------------------

const WHICH = {
  massing: makeMassing,
  'castle-sketch': makeCastleSketch,
};

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const picked = wanted.length ? wanted : Object.keys(WHICH);
  for (const name of picked) {
    if (!WHICH[name]) {
      console.error(`no board called “${name}” — pick from: ${Object.keys(WHICH).join(', ')}`);
      process.exit(2);
    }
  }
  for (const name of picked) {
    console.log(`\n▸ ${name}`);
    await WHICH[name]();
  }
  console.log('\nwritten. `?fixture=<name>` and *Open…* both load these.');
}

main().catch((err) => {
  console.error('\nthe generator fell over:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
