// A folder on disk as the canvas, through the File System Access API.
//
// The browser hands over a directory handle; this store walks it for files
// of known kinds, reads and writes them in place, and appends each
// participant's log under `.metamedium/logs/`. The handle types are
// structural here — the smallest surface the store needs — so core stays
// free of DOM typings and a test can drive the store with a fake folder.

import type { SessionEvent } from '../session/session';
import { kindOf } from '../kinds/kinds';
import {
  type Capabilities, type Entry, type Store,
  LOG_DIR, ReadOnlyError, decodeLog, encodeLog, isCanvasFile, logPathFor, participantOfLog, toBytes, toText,
} from './seam';

/** What this store needs from a file: its bytes, its size, its modified time. */
export interface FileLike {
  size: number;
  lastModified: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface WritableLike {
  write(data: Uint8Array | string): Promise<void>;
  close(): Promise<void>;
}
export interface FileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<FileLike>;
  createWritable?(opts?: { keepExistingData?: boolean }): Promise<WritableLike>;
}
export interface DirHandleLike {
  kind: 'directory';
  name: string;
  entries(): AsyncIterable<[string, FileHandleLike | DirHandleLike]>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandleLike>;
}

/** Directories a folder walk never enters: not the canvas's, and never small. */
export const SKIP_DIRS: readonly string[] = ['node_modules', 'dist', 'build', 'out', 'coverage', 'target', 'vendor'];
/** How many files a walk lists before it stops and says so. */
export const DEFAULT_FILE_LIMIT = 400;

export class FolderStore implements Store {
  /** Set when the last `list()` hit the limit: the folder holds more than was shown. */
  truncated = false;

  constructor(private root: DirHandleLike, private opts: { readOnly?: boolean; skip?: readonly string[]; limit?: number } = {}) {}

  capabilities(): Capabilities {
    return { write: !this.opts.readOnly, watch: false };
  }

  private async walk(dir: DirHandleLike, prefix: string, out: Entry[], logs: string[]): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (out.length >= (this.opts.limit ?? DEFAULT_FILE_LIMIT)) { this.truncated = true; return; }
      if (handle.kind === 'directory') {
        // Hidden directories are skipped, except the canvas's own; so are the
        // directories every toolchain fills and nobody draws on.
        if (name.startsWith('.') && path !== '.metamedium' && !path.startsWith('.metamedium/')) continue;
        if ((this.opts.skip ?? SKIP_DIRS).includes(name)) continue;
        await this.walk(handle, path, out, logs);
        continue;
      }
      if (participantOfLog(path)) { logs.push(path); continue; }
      const e = isCanvasFile(path);
      if (!e) continue;
      const f = await handle.getFile();
      out.push({ ...e, size: f.size, modified: f.lastModified });
    }
  }

  async list(): Promise<Entry[]> {
    const out: Entry[] = [];
    this.truncated = false;
    await this.walk(this.root, '', out, []);
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  private async fileHandle(path: string, create: boolean): Promise<FileHandleLike> {
    const parts = path.split('/');
    let dir = this.root;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create });
    return dir.getFileHandle(parts[parts.length - 1], { create });
  }

  async read(path: string): Promise<string | Uint8Array> {
    const h = await this.fileHandle(path, false);
    const f = await h.getFile();
    const row = kindOf(path);
    if (row && !row.textual) return new Uint8Array(await f.arrayBuffer());
    return f.text();
  }

  async write(path: string, data: string | Uint8Array): Promise<void> {
    if (this.opts.readOnly) throw new ReadOnlyError(`write ${path}`);
    const h = await this.fileHandle(path, true);
    if (!h.createWritable) throw new ReadOnlyError(`write ${path}`);
    const w = await h.createWritable();
    await w.write(toBytes(data));
    await w.close();
  }

  async appendLog(participant: string, events: readonly SessionEvent[]): Promise<void> {
    if (this.opts.readOnly) throw new ReadOnlyError(`append to ${participant}'s log`);
    if (events.length === 0) return;
    const path = logPathFor(participant);
    const h = await this.fileHandle(path, true);
    if (!h.createWritable) throw new ReadOnlyError(`append to ${participant}'s log`);
    // Append by rewriting the tail: keepExistingData keeps what is there, and
    // the write lands at the old end. A backend without it gets the whole
    // file rewritten, which is the same bytes.
    const existing = await (await h.getFile()).text();
    const w = await h.createWritable({ keepExistingData: false });
    await w.write(toBytes(existing + encodeLog(events)));
    await w.close();
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const out: Record<string, SessionEvent[]> = {};
    let dir: DirHandleLike;
    try {
      dir = this.root;
      for (const p of LOG_DIR.split('/')) dir = await dir.getDirectoryHandle(p, { create: false });
    } catch {
      return out; // no logs yet: a fresh folder
    }
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind !== 'file') continue;
      const who = participantOfLog(`${LOG_DIR}/${name}`);
      if (!who) continue;
      out[who] = decodeLog(toText(await (await handle.getFile()).text())).events;
    }
    return out;
  }
}
