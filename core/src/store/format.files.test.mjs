// The log format (V1-PLAN R2), against files: every log this repository keeps
// still reads, and the reader a week-old surface runs opens a version 1 file.
// A .mjs beside format.test.ts because it reads the disk and core's typecheck
// carries no Node types.

import { describe, it, expect } from 'vitest';
import { gunzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeLog, encodeLog } from './format';
import { createSession } from '../session/session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';

const HERE = dirname(fileURLToPath(import.meta.url));

function someEvents() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(circleStroke(200, 160, 200), 2000);
  s.addStroke(checkStroke(420, 150), 3000);
  s.bless({ summonId: s.getState().summon.id, name: 'A', at: 4000 });
  return s.getEvents();
}

// ---- every log this repository keeps still reads ---------------------------

const ROOT = resolve(HERE, '../../..');
function logFilesUnder(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') logFilesUnder(p, out); }
    else if (/\.(jsonl|mm\.log)$/.test(name)) out.push(p);
  }
  return out;
}

describe('the logs kept in this repository', () => {
  const files = [...logFilesUnder(join(ROOT, 'boards')), ...logFilesUnder(join(ROOT, 'dynaink-3d/fixtures'))];

  it('finds the boards and the shard’s fixtures', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const f of files) {
    it(`${f.slice(ROOT.length + 1)} reads, whole, whatever version it is`, () => {
      const text = readFileSync(f, 'utf8');
      const d = decodeLog(text, { source: f });
      expect(d.events.length).toBeGreaterThan(0);
      expect(d.skipped).toBe(0);
      expect([0, 1]).toContain(d.version);
      // and the same events come back through today's writer
      expect(decodeLog(encodeLog(d.events)).events).toEqual(d.events);
    });
  }
});

// ---- the trap: a week-old surface reads a version 1 file --------------------

describe('a surface from before the header reads a version 1 file', () => {
  async function oldCore() {
    // master's committed Node bundle from the day before this format (gzipped: fixtures/README says why it is kept)
    const gz = readFileSync(join(HERE, 'fixtures/core-before-r2.node.mjs.gz'));
    const dir = mkdtempSync(join(tmpdir(), 'mm-old-core-'));
    const file = join(dir, 'core.mjs');
    writeFileSync(file, gunzipSync(gz));
    return await import(/* @vite-ignore */ pathToFileURL(file).href);
  }

  it('it opens: the header is an event it has no case for, and every mark is there', async () => {
    const old = await oldCore();
    const evs = someEvents();
    const v1 = encodeLog(evs, { app: '0.4.0' });
    const d = old.decodeLog(v1);
    expect(d.skipped).toBe(0);
    expect(d.events.length).toBe(evs.length + 1);
    // every event has a string type, as the boards pane's import demands of a log
    expect(d.events.every((e) => typeof e.type === 'string')).toBe(true);
    const merged = old.mergeLogs({ me: d.events });
    const oldSession = old.createSession();
    oldSession.load(merged);
    const newSession = createSession();
    newSession.load(evs);
    const idsOf = (s) => JSON.stringify(s.getState().content);
    expect(idsOf(oldSession)).toBe(idsOf(newSession));
    expect(JSON.stringify(oldSession.getState().content)).not.toBe('[]');
  });

  it('every board the repository keeps, written as version 1, opens in it as it opened as version 0', async () => {
    const old = await oldCore();
    const boards = logFilesUnder(join(ROOT, 'boards'));
    expect(boards.length).toBeGreaterThan(0);
    for (const f of boards) {
      // the board as version 0 — bare events — whatever version the file on disk is
      const text = decodeLog(readFileSync(f, 'utf8')).events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      const v0 = old.decodeLog(text);
      const v1 = old.decodeLog(encodeLog(decodeLog(text).events, { app: '9.9.9' }));
      expect(v1.skipped, f).toBe(0);
      expect(v1.events.length, f).toBe(v0.events.length + 1);
      const load = (evs) => { const s = old.createSession(); s.load(old.mergeLogs({ me: evs })); return JSON.stringify(s.getState().content); };
      expect(load(v1.events), f).toBe(load(v0.events));
    }
  });
});
