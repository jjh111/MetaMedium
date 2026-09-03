// The storage seam: the canvas is a folder, and nothing is invented.
//
// Every file of a known kind in the folder is an artifact; every participant
// appends to its own log; the canvas is the merge (ARCHITECTURE-v8 Part II,
// BUILD-PLAN contract 1.5). This module is the seam the surface talks
// through, so what is behind it — a static site, a folder on disk, a git
// checkout — is a backend, not a design. Three rules:
//
//   1. **Discovery is a list of known kinds.** `list()` returns every file
//      the kinds table recognises, recursively; anything else is not there.
//   2. **Logs are per participant, append-only, one event per line.** Nobody
//      writes anyone else's file, so there is nothing to lock and nothing to
//      merge by hand — `mergeLogs` is the merge.
//   3. **A backend says what it can do.** A read-only backend rejects writes
//      with a reason rather than pretending; a backend that can watch says so.
//
// `MemoryStore` is the backend the tests use, and the one a fresh canvas
// starts on before it has a folder at all.

import type { SessionEvent } from '../session/session';
import { type Kind, kindOf } from '../kinds/kinds';

export interface Entry {
  /** Path within the folder, `/`-separated, no leading slash. */
  path: string;
  kind: Kind;
  size?: number;
  /** Milliseconds since the epoch, when the backend knows. */
  modified?: number;
}

export interface Capabilities {
  write: boolean;
  watch: boolean;
}

export interface Store {
  /** Every file of a known kind, recursively, sorted by path. */
  list(): Promise<Entry[]>;
  /** The file's content: text for textual kinds, bytes otherwise. */
  read(path: string): Promise<string | Uint8Array>;
  /** Rejects with a reason on a read-only backend. */
  write(path: string, data: string | Uint8Array): Promise<void>;
  /** Append events to one participant's log. Rejects when read-only. */
  appendLog(participant: string, events: readonly SessionEvent[]): Promise<void>;
  /** Every participant's log, by participant name. */
  readLogs(): Promise<Record<string, SessionEvent[]>>;
  capabilities(): Capabilities;
}

/** Where a folder keeps what the canvas knows about it. */
export const META_DIR = '.metamedium';
export const LOG_DIR = `${META_DIR}/logs`;
export const LOG_EXT = '.jsonl';

/** The log file for a participant: a name safe for any filesystem. */
export function logPathFor(participant: string): string {
  const safe = participant.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${LOG_DIR}/${safe}${LOG_EXT}`;
}

/** The participant a log path belongs to, or null when the path is not a log. */
export function participantOfLog(path: string): string | null {
  if (!path.startsWith(LOG_DIR + '/') || !path.endsWith(LOG_EXT)) return null;
  return path.slice(LOG_DIR.length + 1, -LOG_EXT.length);
}

/** One event per line. A trailing newline, so appends concatenate. */
export function encodeLog(events: readonly SessionEvent[]): string {
  return events.map((ev) => JSON.stringify(ev)).join('\n') + (events.length ? '\n' : '');
}

/** Lines back into events; a broken line is skipped and counted, never fatal. */
export function decodeLog(text: string): { events: SessionEvent[]; skipped: number } {
  const events: SessionEvent[] = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try { events.push(JSON.parse(l) as SessionEvent); } catch { skipped++; }
  }
  return { events, skipped };
}

/** Whether a path is one the canvas should show: a known kind, outside the meta directory. */
export function isCanvasFile(path: string): Entry | null {
  if (path === META_DIR || path.startsWith(META_DIR + '/')) return null;
  const parts = path.split('/');
  if (parts.some((p) => p.startsWith('.') && p !== META_DIR)) return null;
  const row = kindOf(path);
  return row ? { path, kind: row.kind } : null;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? encoder.encode(data) : data;
}
export function toText(data: string | Uint8Array): string {
  return typeof data === 'string' ? data : decoder.decode(data);
}

export class ReadOnlyError extends Error {
  constructor(what: string) {
    super(`${what}: this store is read-only`);
    this.name = 'ReadOnlyError';
  }
}

/**
 * A folder held in memory. The tests' backend, and the one a canvas starts
 * on before it is given a folder — nothing here is lost by design, it is
 * just not on disk yet.
 */
export class MemoryStore implements Store {
  private files = new Map<string, Uint8Array>();
  private readOnly: boolean;

  constructor(seed: Record<string, string | Uint8Array> = {}, opts: { readOnly?: boolean } = {}) {
    for (const [path, data] of Object.entries(seed)) this.files.set(path, toBytes(data));
    this.readOnly = !!opts.readOnly;
  }

  capabilities(): Capabilities {
    return { write: !this.readOnly, watch: false };
  }

  async list(): Promise<Entry[]> {
    const out: Entry[] = [];
    for (const [path, bytes] of this.files) {
      const e = isCanvasFile(path);
      if (e) out.push({ ...e, size: bytes.length });
    }
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  async read(path: string): Promise<string | Uint8Array> {
    const bytes = this.files.get(path);
    if (!bytes) throw new Error(`${path}: not in the folder`);
    const row = kindOf(path);
    return row && !row.textual ? bytes : toText(bytes);
  }

  async write(path: string, data: string | Uint8Array): Promise<void> {
    if (this.readOnly) throw new ReadOnlyError(`write ${path}`);
    this.files.set(path, toBytes(data));
  }

  async appendLog(participant: string, events: readonly SessionEvent[]): Promise<void> {
    if (this.readOnly) throw new ReadOnlyError(`append to ${participant}'s log`);
    if (events.length === 0) return;
    const path = logPathFor(participant);
    const prev = this.files.get(path);
    const next = encoder.encode(encodeLog(events));
    if (!prev) { this.files.set(path, next); return; }
    const joined = new Uint8Array(prev.length + next.length);
    joined.set(prev, 0); joined.set(next, prev.length);
    this.files.set(path, joined);
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const out: Record<string, SessionEvent[]> = {};
    for (const [path, bytes] of this.files) {
      const who = participantOfLog(path);
      if (who) out[who] = decodeLog(toText(bytes)).events;
    }
    return out;
  }

  /** Every path held, logs included — for tests and for export. */
  paths(): string[] {
    return [...this.files.keys()].sort();
  }
}
