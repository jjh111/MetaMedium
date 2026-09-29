// The log format (V1-PLAN R2): a written log begins with a header line, a
// reader accepts version 0 (today's bare events, every log already kept) and
// version 1, and a version newer than this build knows is refused in a
// sentence — never half-read. The last describe is the trap: a week-old
// surface, reading a version 1 file, must still open it.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  LOG_FORMAT, LOG_VERSION, LogFormatError, appendToLogText, decodeLog, encodeLog, encodeLogTail, logHeader,
} from './format';
import { MemoryStore, logPathFor } from './seam';
import { mergeLogs } from './merge';
import { createSession } from '../session/session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';

function someEvents() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(circleStroke(200, 160, 200), 2000);
  s.addStroke(checkStroke(420, 150), 3000);
  s.bless({ summonId: s.getState().summon!.id, name: 'A', at: 4000 });
  return s.getEvents();
}
const bare = (events: readonly unknown[]) => events.map((e) => JSON.stringify(e)).join('\n') + '\n';

describe('the header', () => {
  it('a written log begins with one header line naming the format and its version', () => {
    const evs = someEvents();
    const lines = encodeLog(evs).split('\n');
    expect(lines.length).toBe(evs.length + 2); // header, events, the trailing newline
    const h = JSON.parse(lines[0]);
    expect(h.format).toBe(LOG_FORMAT);
    expect(h.version).toBe(LOG_VERSION);
    expect(LOG_VERSION).toBe(1);
    expect(lines.slice(1, -1).map((l) => JSON.parse(l))).toEqual(evs);
  });

  it('carries the app that wrote it when it is told, and no more', () => {
    expect(JSON.parse(encodeLog(someEvents(), { app: '0.4.0' }).split('\n')[0]).app).toBe('0.4.0');
    expect('app' in JSON.parse(encodeLog(someEvents()).split('\n')[0])).toBe(false);
    expect(logHeader({ app: '1.2.3' })).toMatchObject({ format: LOG_FORMAT, version: 1, app: '1.2.3' });
  });

  it('an empty log is still a file with a header; a tail is bare events, so appends concatenate', () => {
    expect(decodeLog(encodeLog([]))).toMatchObject({ events: [], skipped: 0, version: 1 });
    const evs = someEvents();
    expect(encodeLogTail(evs)).toBe(bare(evs));
    expect(encodeLogTail([])).toBe('');
  });
});

describe('the readers', () => {
  it('version 0 — bare events, today’s files — reads as it always did', () => {
    const evs = someEvents();
    const d = decodeLog(bare(evs));
    expect(d.version).toBe(0);
    expect(d.events).toEqual(evs);
    expect(d.skipped).toBe(0);
  });

  it('version 1 reads, and the header is never an event', () => {
    const evs = someEvents();
    const d = decodeLog(encodeLog(evs, { app: '0.4.0' }));
    expect(d).toMatchObject({ version: 1, app: '0.4.0', skipped: 0 });
    expect(d.events).toEqual(evs);
    expect(d.events.some((e) => (e as { format?: string }).format === LOG_FORMAT)).toBe(false);
  });

  it('a header with fields this build does not know is still a version 1 header', () => {
    const evs = someEvents();
    const text = JSON.stringify({ ...logHeader(), extra: { anything: 1 } }) + '\n' + bare(evs);
    expect(decodeLog(text)).toMatchObject({ version: 1, skipped: 0 });
    expect(decodeLog(text).events).toEqual(evs);
  });

  it('a broken line is skipped and counted, never fatal, in either version', () => {
    const evs = someEvents();
    expect(decodeLog(encodeLog(evs) + 'not json\n')).toMatchObject({ version: 1, skipped: 1 });
    expect(decodeLog(bare(evs) + 'not json\n')).toMatchObject({ version: 0, skipped: 1 });
  });

  it('a version newer than this build reads is refused, naming both versions, and nothing of it is read', () => {
    const evs = someEvents();
    const future = JSON.stringify({ type: 'format', format: LOG_FORMAT, version: 2, app: '0.9.0' }) + '\n' + bare(evs);
    let err: unknown = null;
    try { decodeLog(future, { source: 'canvas.jsonl' }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(LogFormatError);
    const e = err as LogFormatError;
    expect(e.found).toBe(2);
    expect(e.supported).toBe(1);
    expect(e.message).toMatch(/canvas\.jsonl/);
    expect(e.message).toMatch(/version 2/);
    expect(e.message).toMatch(/version 1|versions 0 and 1/);
    expect(e.message).toMatch(/0\.9\.0/);
    expect(e.message).toMatch(/nothing/);
  });

  it('a header that names no version at all is refused too, not guessed at', () => {
    for (const v of ['"two"', '0', '-1', '1.5', 'null']) {
      const text = `{"type":"format","format":"${LOG_FORMAT}","version":${v}}\n` + bare(someEvents());
      expect(() => decodeLog(text), v).toThrow(LogFormatError);
    }
  });

  it('a log that says another format is not this one’s header: it is an event line as before', () => {
    const d = decodeLog('{"type":"format","format":"something-else","version":9}\n' + bare(someEvents()));
    expect(d.version).toBe(0);
  });
});

describe('the writers', () => {
  it('appending to nothing writes the header first; to a version 1 file, only the tail', () => {
    const [a, b, ...rest] = someEvents();
    const first = appendToLogText('', [a, b]);
    expect(first.split('\n')[0]).toContain(LOG_FORMAT);
    const both = appendToLogText(first, rest);
    expect(both).toBe(first + bare(rest));
    expect(decodeLog(both).events).toEqual(someEvents());
    expect(both.match(new RegExp(LOG_FORMAT, 'g'))!.length).toBe(1);
  });

  it('appending to a version 0 file brings the whole file to version 1, its events untouched', () => {
    const [a, b, ...rest] = someEvents();
    const up = appendToLogText(bare([a, b]), rest);
    expect(decodeLog(up)).toMatchObject({ version: 1, skipped: 0 });
    expect(decodeLog(up).events).toEqual(someEvents());
  });

  it('appending to a file of a newer version writes nothing and says why', () => {
    const future = JSON.stringify({ type: 'format', format: LOG_FORMAT, version: 2 }) + '\n' + bare(someEvents());
    expect(() => appendToLogText(future, someEvents())).toThrow(LogFormatError);
  });

  it('a store’s log file is version 1 on disk and reads back the same events', async () => {
    const store = new MemoryStore();
    const evs = someEvents();
    await store.appendLog('me', evs.slice(0, 2));
    await store.appendLog('me', evs.slice(2));
    const text = new TextDecoder().decode(await (store as unknown as { files: Map<string, Uint8Array> }).files.get(logPathFor('me')));
    expect(text.split('\n')[0]).toContain(LOG_FORMAT);
    expect((await store.readLogs()).me).toEqual(evs);
  });

  it('a store holding a log of a newer version says so when it is read, with the file’s path', async () => {
    const future = JSON.stringify({ type: 'format', format: LOG_FORMAT, version: 7 }) + '\n' + bare(someEvents());
    const store = new MemoryStore({ [logPathFor('them')]: future });
    await expect(store.readLogs()).rejects.toThrow(/them\.jsonl.*version 7/s);
  });

  it('a merge of version 1 and version 0 logs is the merge of their events', async () => {
    const evs = someEvents();
    const store = new MemoryStore({ [logPathFor('a')]: encodeLog(evs), [logPathFor('b')]: bare(evs) });
    const logs = await store.readLogs();
    expect(mergeLogs(logs)).toEqual(mergeLogs({ a: evs, b: evs }));
  });
});

// ---- every log this repository keeps still reads ---------------------------

const ROOT = resolve(__dirname, '../../..');
function logFilesUnder(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') logFilesUnder(p, out); }
    else if (/\.(jsonl|mm\.log)$/.test(name)) out.push(p);
  }
  return out;
}

describe('the logs kept in this repository', () => {
  const files = [...logFilesUnder(join(ROOT, 'boards')), ...logFilesUnder(join(ROOT, 'shard-3d/fixtures'))];

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
  type Old = {
    decodeLog: (t: string) => { events: unknown[]; skipped: number };
    mergeLogs: (l: Record<string, unknown[]>, o?: object) => unknown[];
    createSession: () => { load: (e: unknown[]) => void; getEvents: () => unknown[]; getState: () => { nodes?: unknown; content?: unknown[] } };
  };
  async function oldCore(): Promise<Old> {
    // master's committed Node bundle from the day before this format (gzipped: fixtures/README says why it is kept)
    const gz = readFileSync(join(__dirname, 'fixtures/core-before-r2.node.mjs.gz'));
    const dir = mkdtempSync(join(tmpdir(), 'mm-old-core-'));
    const file = join(dir, 'core.mjs');
    writeFileSync(file, gunzipSync(gz));
    return (await import(/* @vite-ignore */ pathToFileURL(file).href)) as Old;
  }

  it('it opens: the header is an event it has no case for, and every mark is there', async () => {
    const old = await oldCore();
    const evs = someEvents();
    const v1 = encodeLog(evs, { app: '0.4.0' });
    const d = old.decodeLog(v1);
    expect(d.skipped).toBe(0);
    expect(d.events.length).toBe(evs.length + 1);
    // every event has a string type, as the boards pane's import demands of a log
    expect(d.events.every((e) => typeof (e as { type?: unknown }).type === 'string')).toBe(true);
    const merged = old.mergeLogs({ me: d.events });
    const oldSession = old.createSession();
    oldSession.load(merged);
    const newSession = createSession();
    newSession.load(evs);
    const idsOf = (s: { getState: () => { content?: unknown[] } }) => JSON.stringify(s.getState().content);
    expect(idsOf(oldSession)).toBe(idsOf(newSession as never));
    expect(JSON.stringify(oldSession.getState().content)).not.toBe('[]');
  });
});
