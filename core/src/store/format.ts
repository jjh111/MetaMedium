// The log format (V1-PLAN R2): one definition, for every reader and writer of
// a log kept as a file — a folder's per-participant log, the board out as a
// file and back, the examples, the shard's export.
//
// A log is one JSON value a line. **Version 1** begins with a header line;
// **version 0** — every log kept before this file existed — has none, only
// events. Three rules:
//
//   1. **Every reader accepts 0 and 1.** A file with no header is version 0,
//      so nothing already kept is migrated, rewritten or refused.
//   2. **A version newer than this build knows is refused, whole.** The
//      sentence names both versions and what wrote the file; not one event of
//      it is read, and nothing writes into it. Half a log is a wrong board.
//   3. **The header is shaped for the week-old reader** (the trap). Today's
//      surface took every line that parses for an event, and its boards pane
//      refuses a file whose lines have no string `type`. So the header
//      carries `type: 'format'` — a type the session has no case for and
//      ignores — and a version 1 file opens in a surface that has never
//      heard of versions, its header one event that does nothing.
//      `format.test.ts` proves it against master's Node bundle from the day
//      before. What that reader does not do is refuse a version 2; that is
//      the whole reason to write the number down now.
//
// Every writer writes 1. A header line is not an event: `decodeLog` reads it
// and it is never in what comes back, so nothing after it — merge, replay,
// undo — has to know it exists. The journal a browser keeps a board in is
// records of events and is not a file, so it has no header; the file the
// board leaves as is.

import type { SessionEvent } from '../session/session';

/** What a header's `format` says. */
export const LOG_FORMAT = 'metamedium-log';
/** The version every writer writes and the newest this build reads. Version 0 is a log with no header. */
export const LOG_VERSION = 1;

export interface LogHeader {
  /** A type the session has no case for, so a reader that predates the header ignores the line. */
  type: 'format';
  format: typeof LOG_FORMAT;
  version: number;
  /** The build that wrote it (`VERSION`), when the writer knew. */
  app?: string;
  /**
   * How many pictures sit beside this log, in a board bundle (PLAN-IPAD-NOTES I4: a zip holding the log and
   * `assets/<hash>.<ext>`). The assets are never in the log — the `import` events name them — so this is
   * what a reader may say about a file whose pictures it was not given. A header without it is as it was.
   */
  assets?: number;
}

export interface LogWriteOptions {
  /** `VERSION` of the app writing, for whoever reads the file later. Left out where a file is generated and drift-checked. */
  app?: string;
  /** The pictures carried beside the log (a board bundle); left out when there are none. */
  assets?: number;
}

export function logHeader(opts: LogWriteOptions = {}): LogHeader {
  const h: LogHeader = { type: 'format', format: LOG_FORMAT, version: LOG_VERSION };
  if (opts.app) h.app = opts.app;
  if (typeof opts.assets === 'number' && Number.isInteger(opts.assets) && opts.assets > 0) h.assets = opts.assets;
  return h;
}

/** A log this build will not read: a newer version, or a header that names none. Its message is the sentence. */
export class LogFormatError extends Error {
  /** The version the file says, or null when the header names none this build can make sense of. */
  found: number | null;
  /** The newest version this build reads. */
  supported: number;
  app?: string;
  source?: string;
  constructor(found: number | null, raw: unknown, app: string | undefined, source: string | undefined) {
    const what = source ? `“${source}”` : 'this log';
    const by = app ? `, written by dyna.ink ${app}` : '';
    const reads = LOG_VERSION > 1 ? `versions 0 to ${LOG_VERSION}` : 'versions 0 and 1';
    super(found === null
      ? `${what} begins with a log header that names no version this build can read (${JSON.stringify(raw)})${by} — this build reads ${reads}, so nothing of it was read`
      : `${what} is a version ${found} log${by} — this build reads ${reads}, so nothing of it was read; open it with a newer dyna.ink`);
    this.name = 'LogFormatError';
    this.found = found;
    this.supported = LOG_VERSION;
    this.app = app;
    this.source = source;
  }
}

/** One event per line, a trailing newline, no header: what an append adds. */
export function encodeLogTail(events: readonly SessionEvent[]): string {
  return events.map((ev) => JSON.stringify(ev)).join('\n') + (events.length ? '\n' : '');
}

/** A whole log, version 1: the header, then one event per line, a trailing newline so appends concatenate. */
export function encodeLog(events: readonly SessionEvent[], opts: LogWriteOptions = {}): string {
  return JSON.stringify(logHeader(opts)) + '\n' + encodeLogTail(events);
}

export interface DecodedLog {
  events: SessionEvent[];
  /** Lines that were not JSON, counted and never fatal. */
  skipped: number;
  /** 0 for a file with no header. */
  version: number;
  app?: string;
  /** The header's count of pictures carried beside the log, when it says one (read, not trusted: a whole number above nothing). */
  assets?: number;
}

function isHeader(v: unknown): v is { format: string; version?: unknown; app?: unknown; assets?: unknown } {
  return !!v && typeof v === 'object' && (v as { format?: unknown }).format === LOG_FORMAT;
}

/**
 * Lines back into events; a broken line is skipped and counted, never fatal.
 * Throws `LogFormatError` — before returning anything — for a header this
 * build cannot read: a newer version, or none.
 */
export function decodeLog(text: string, opts: { source?: string } = {}): DecodedLog {
  const events: SessionEvent[] = [];
  let skipped = 0;
  let version = 0;
  let app: string | undefined;
  let assets: number | undefined;
  let seen = false;
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    let v: unknown;
    try { v = JSON.parse(l); } catch { skipped++; continue; }
    if (isHeader(v)) {
      const n = v.version;
      const theirApp = typeof v.app === 'string' ? v.app : undefined;
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) throw new LogFormatError(null, n, theirApp, opts.source);
      if (n > LOG_VERSION) throw new LogFormatError(n, n, theirApp, opts.source);
      if (!seen) {
        version = n; app = theirApp; seen = true;
        if (typeof v.assets === 'number' && Number.isInteger(v.assets) && v.assets > 0) assets = v.assets;
      }
      continue;
    }
    events.push(v as SessionEvent);
  }
  const out: DecodedLog = { events, skipped, version };
  if (app !== undefined) out.app = app;
  if (assets !== undefined) out.assets = assets;
  return out;
}

/**
 * What a log file's text becomes when `events` are appended to it. Nothing
 * yet: the header first. A version 1 file: only the tail. A version 0 file
 * (no header): the whole file, brought to version 1 with its events as they
 * were — every writer writes 1. A newer file is refused, and nothing is
 * written into what this build cannot read.
 */
export function appendToLogText(existing: string, events: readonly SessionEvent[], opts: LogWriteOptions & { source?: string } = {}): string {
  if (!existing.trim()) return encodeLog(events, opts);
  const d = decodeLog(existing, { source: opts.source }); // refuses a newer version
  const joined = existing.endsWith('\n') ? existing : existing + '\n';
  if (d.version >= 1) return joined + encodeLogTail(events);
  return JSON.stringify(logHeader(opts)) + '\n' + joined + encodeLogTail(events);
}
