// A static site as a folder: read-only, discovered through a manifest.
//
// A server that only serves files cannot list a directory, so a static
// canvas carries `.metamedium/manifest.json` — `{ "files": [...paths] }` —
// written by whatever deployed it (WP-14's exporter). Logs are listed in the
// same manifest. Everything is fetched relative to the base URL; writes are
// refused with a reason, which is what makes a published canvas safe to hand
// to anyone: they can draw on it, and their ink stays theirs.

import type { SessionEvent } from '../session/session';
import { kindOf } from '../kinds/kinds';
import {
  type Capabilities, type Entry, type Store,
  META_DIR, ReadOnlyError, decodeLog, isCanvasFile, participantOfLog,
} from './seam';

/** The part of `fetch` this store uses — structural, so a test can hand in a fake. */
export type Fetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export const MANIFEST_PATH = `${META_DIR}/manifest.json`;

export interface Manifest {
  files: string[];
}

export class StaticStore implements Store {
  private manifest: Promise<Manifest> | null = null;

  constructor(private base: string, private fetcher: Fetcher) {
    if (!this.base.endsWith('/')) this.base += '/';
  }

  capabilities(): Capabilities {
    return { write: false, watch: false };
  }

  private url(path: string): string {
    return this.base + path.split('/').map(encodeURIComponent).join('/');
  }

  private async loadManifest(): Promise<Manifest> {
    if (!this.manifest) {
      this.manifest = (async () => {
        const r = await this.fetcher(this.url(MANIFEST_PATH));
        if (!r.ok) throw new Error(`${MANIFEST_PATH}: ${r.status} — a static canvas needs its manifest`);
        const m = JSON.parse(await r.text()) as Partial<Manifest>;
        return { files: Array.isArray(m.files) ? m.files.filter((f) => typeof f === 'string') : [] };
      })();
    }
    return this.manifest;
  }

  async list(): Promise<Entry[]> {
    const m = await this.loadManifest();
    const out: Entry[] = [];
    for (const path of m.files) {
      const e = isCanvasFile(path);
      if (e) out.push(e);
    }
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  async read(path: string): Promise<string | Uint8Array> {
    const r = await this.fetcher(this.url(path));
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    const row = kindOf(path);
    if (row && !row.textual) return new Uint8Array(await r.arrayBuffer());
    return r.text();
  }

  async write(path: string, _data: string | Uint8Array): Promise<void> {
    throw new ReadOnlyError(`write ${path}`);
  }

  async appendLog(participant: string, _events: readonly SessionEvent[]): Promise<void> {
    throw new ReadOnlyError(`append to ${participant}'s log`);
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const m = await this.loadManifest();
    const out: Record<string, SessionEvent[]> = {};
    for (const path of m.files) {
      const who = participantOfLog(path);
      if (!who) continue;
      const r = await this.fetcher(this.url(path));
      if (!r.ok) continue; // a listed log that is gone is an empty log, not a failure to open the canvas
      out[who] = decodeLog(await r.text()).events;
    }
    return out;
  }
}
