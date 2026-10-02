// The storage seam: a folder of known kinds, per-participant logs, and the
// same canvas from any backend. The fixtures are generic files; nothing here
// knows what any of them is about.

import { describe, it, expect } from 'vitest';
import { MemoryStore, ReadOnlyError, logPathFor, participantOfLog, encodeLog, decodeLog, isCanvasFile, LOG_DIR } from './seam';
import { StaticStore, MANIFEST_PATH, type Fetcher } from './static';
import { FolderStore, type DirHandleLike, type FileHandleLike } from './folder';
import { mergeLogs } from './merge';
import { createSession } from '../session/session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { LOCAL_PARTICIPANT } from '../session/nodes';

const SEED = {
  'index.html': '<div data-region="r1">hello</div>',
  'scripts/steer.js': 'function steer(world) { return { fx: 1, fy: 0 }; }\nreturn steer(world);',
  'data/config.json': '{ "speed": 3 }',
  'notes/README.md': '# Notes\n\nSome prose.',
  'art/figure.svg': '<svg><rect/></svg>',
  'photo.png': new Uint8Array([137, 80, 78, 71]),
  'Makefile': 'all:',              // no known kind — not in the canvas
  '.git/HEAD': 'ref: refs/heads/main', // hidden — not in the canvas
  'node_modules/x/index.js': 'x',  // a known kind, and listed: the canvas does not know what node_modules is
};

/** A session's worth of events: a box, circled, checked, named. */
function someEvents() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(circleStroke(200, 160, 200), 2000);
  s.addStroke(checkStroke(420, 150), 3000);
  s.bless({ summonId: s.getState().summon!.id, name: 'A', at: 4000 });
  return s.getEvents();
}

describe('the seam', () => {
  it('lists every file of a known kind, recursively, and nothing else', async () => {
    const store = new MemoryStore(SEED);
    const entries = await store.list();
    expect(entries.map((e) => `${e.path} ${e.kind}`)).toEqual([
      'art/figure.svg svg', 'data/config.json json', 'index.html html', 'node_modules/x/index.js js',
      'notes/README.md md', 'photo.png png', 'scripts/steer.js js',
    ]);
    expect(isCanvasFile('.metamedium/manifest.json')).toBeNull();
  });

  it('reads text for textual kinds and bytes otherwise; writes land; read-only refuses with a reason', async () => {
    const store = new MemoryStore(SEED);
    expect(await store.read('data/config.json')).toBe('{ "speed": 3 }');
    expect(await store.read('photo.png')).toBeInstanceOf(Uint8Array);
    await store.write('data/config.json', '{ "speed": 4 }');
    expect(await store.read('data/config.json')).toBe('{ "speed": 4 }');
    const ro = new MemoryStore(SEED, { readOnly: true });
    await expect(ro.write('x.md', '#')).rejects.toBeInstanceOf(ReadOnlyError);
    await expect(ro.appendLog('me', someEvents())).rejects.toThrow(/read-only/);
    expect(ro.capabilities().write).toBe(false);
  });

  it('logs are per participant, append-only, one event per line, and merge into the same canvas', async () => {
    const store = new MemoryStore();
    const events = someEvents();
    await store.appendLog('john@laptop', events.slice(0, 2));
    await store.appendLog('john@laptop', events.slice(2));
    await store.appendLog('model:qwen', []);
    expect(store.paths()).toEqual([logPathFor('john@laptop')]);
    expect(participantOfLog(logPathFor('john@laptop'))).toBe('john_laptop');
    const logs = await store.readLogs();
    expect(Object.keys(logs)).toEqual(['john_laptop']);
    expect(logs.john_laptop).toEqual(events);
    // Loading the merge reproduces the state the events made.
    const s = createSession();
    s.load(mergeLogs(logs));
    expect(s.getState().artifacts).toHaveLength(1);
    // The log format survives a round trip and a bad line.
    const text = encodeLog(events) + 'not json\n';
    const back = decodeLog(text);
    expect(back.events).toEqual(events);
    expect(back.skipped).toBe(1);
  });

  it('a static site is read-only and discovered through its manifest', async () => {
    const files: Record<string, string> = {
      [MANIFEST_PATH]: JSON.stringify({ files: ['index.html', 'notes/a.md', `${LOG_DIR}/me.jsonl`, 'Makefile'] }),
      'index.html': '<p>hi</p>',
      'notes/a.md': '# a',
      [`${LOG_DIR}/me.jsonl`]: encodeLog(someEvents()),
    };
    const fetched: string[] = [];
    const fetcher: Fetcher = async (url) => {
      fetched.push(url);
      const path = decodeURIComponent(url.replace('https://site/', ''));
      const body = files[path];
      return {
        ok: body !== undefined, status: body !== undefined ? 200 : 404,
        text: async () => body ?? '', arrayBuffer: async () => new TextEncoder().encode(body ?? '').buffer as ArrayBuffer,
      };
    };
    const store = new StaticStore('https://site', fetcher);
    expect(store.capabilities()).toEqual({ write: false, watch: false });
    expect((await store.list()).map((e) => e.path)).toEqual(['index.html', 'notes/a.md']);
    expect(await store.read('notes/a.md')).toBe('# a');
    const logs = await store.readLogs();
    expect(logs.me).toHaveLength(someEvents().length);
    await expect(store.write('x.md', '#')).rejects.toBeInstanceOf(ReadOnlyError);
    expect(fetched[0]).toBe('https://site/.metamedium/manifest.json');
    await expect(store.read('missing.md')).rejects.toThrow(/404/);
  });

  it('a folder on disk: walked recursively, hidden directories skipped, logs appended in place', async () => {
    const folder = fakeFolder({
      'index.html': '<p>hi</p>',
      'deep/er/thing.json': '{}',
      '.git/config': 'x',
      'photo.jpg': new Uint8Array([255, 216]),
    });
    const store = new FolderStore(folder);
    expect((await store.list()).map((e) => e.path)).toEqual(['deep/er/thing.json', 'index.html', 'photo.jpg']);
    expect(await store.read('deep/er/thing.json')).toBe('{}');
    expect(await store.read('photo.jpg')).toEqual(new Uint8Array([255, 216]));
    await store.write('new/note.md', '# new');
    expect(await store.read('new/note.md')).toBe('# new');
    expect(await store.readLogs()).toEqual({});
    const events = someEvents();
    await store.appendLog('me', events.slice(0, 1));
    await store.appendLog('me', events.slice(1));
    await store.appendLog('model', events.slice(0, 2));
    const logs = await store.readLogs();
    expect(logs.me).toEqual(events);
    expect(logs.model).toHaveLength(2);
    // Each participant's log is its own events; merging one person's log alone replays their canvas.
    const s = createSession();
    s.load(mergeLogs({ me: logs.me }));
    expect(s.getState().artifacts).toHaveLength(1);
    const ro = new FolderStore(folder, { readOnly: true });
    await expect(ro.appendLog('me', events)).rejects.toBeInstanceOf(ReadOnlyError);
  });

  it('the local participant has a log path like anyone else', () => {
    expect(logPathFor(LOCAL_PARTICIPANT)).toBe(`${LOG_DIR}/participant_local.jsonl`);
  });
});

// ---- a fake File System Access folder ------------------------------------

function fakeFolder(seed: Record<string, string | Uint8Array>): DirHandleLike {
  type Node = { kind: 'file'; bytes: Uint8Array; modified: number } | { kind: 'dir'; children: Map<string, Node> };
  const root: Node = { kind: 'dir', children: new Map() };
  const enc = new TextEncoder(), dec = new TextDecoder();
  const put = (path: string, data: string | Uint8Array) => {
    const parts = path.split('/');
    let d: Node = root;
    for (const p of parts.slice(0, -1)) {
      if (!d.kind || d.kind !== 'dir') throw new Error();
      let n = d.children.get(p);
      if (!n) { n = { kind: 'dir', children: new Map() }; d.children.set(p, n); }
      d = n;
    }
    (d as { children: Map<string, Node> }).children.set(parts[parts.length - 1], {
      kind: 'file', bytes: typeof data === 'string' ? enc.encode(data) : data, modified: 1,
    });
  };
  for (const [p, d] of Object.entries(seed)) put(p, d);

  const fileHandle = (name: string, node: { bytes: Uint8Array; modified: number }): FileHandleLike => ({
    kind: 'file', name,
    getFile: async () => ({
      size: node.bytes.length, lastModified: node.modified,
      text: async () => dec.decode(node.bytes),
      arrayBuffer: async () => node.bytes.buffer.slice(node.bytes.byteOffset, node.bytes.byteOffset + node.bytes.byteLength) as ArrayBuffer,
    }),
    createWritable: async () => {
      const chunks: Uint8Array[] = [];
      return {
        write: async (data) => { chunks.push(typeof data === 'string' ? enc.encode(data) : data); },
        close: async () => {
          const len = chunks.reduce((n, c) => n + c.length, 0);
          const out = new Uint8Array(len);
          let at = 0;
          for (const c of chunks) { out.set(c, at); at += c.length; }
          node.bytes = out; node.modified = 2;
        },
      };
    },
  });
  const dirHandle = (name: string, node: { children: Map<string, Node> }): DirHandleLike => ({
    kind: 'directory', name,
    entries: async function* () {
      for (const [n, child] of node.children) {
        yield [n, child.kind === 'file' ? fileHandle(n, child) : dirHandle(n, child)] as [string, FileHandleLike | DirHandleLike];
      }
    },
    getFileHandle: async (n, opts) => {
      let child = node.children.get(n);
      if (!child) {
        if (!opts?.create) throw new Error(`${n}: not found`);
        child = { kind: 'file', bytes: new Uint8Array(), modified: 0 };
        node.children.set(n, child);
      }
      if (child.kind !== 'file') throw new Error(`${n}: a directory`);
      return fileHandle(n, child);
    },
    getDirectoryHandle: async (n, opts) => {
      let child = node.children.get(n);
      if (!child) {
        if (!opts?.create) throw new Error(`${n}: not found`);
        child = { kind: 'dir', children: new Map() };
        node.children.set(n, child);
      }
      if (child.kind !== 'dir') throw new Error(`${n}: a file`);
      return dirHandle(n, child);
    },
  });
  return dirHandle('', root as { children: Map<string, Node> });
}
