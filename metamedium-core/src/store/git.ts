// A git repository as the folder, through the GitHub contents API.
//
// The third backend (ARCHITECTURE-v8 §18): a phone, or a browser with no
// folder handle, opens a repository and appends to its own log file directly,
// and git carries the logs between machines as it carries everything else.
// Reads of a public repository need no token; writes need one the user has
// pasted in — the store never sees one it was not handed. Every write is a
// commit: this participant's log, one file, whose message says what landed.
//
// Structural `fetch`, like the static store, so a test drives it with a fake.

import type { SessionEvent } from '../session/session';
import { kindOf } from '../kinds/kinds';
import {
  type Capabilities, type Entry, type Store,
  ReadOnlyError, decodeLog, encodeLog, isCanvasFile, logPathFor, participantOfLog, toBytes, toText,
} from './seam';

export type GitFetcher = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export interface GitSpec {
  owner: string;
  repo: string;
  branch?: string;
  /** A subfolder of the repository to open as the canvas; the root by default. */
  dir?: string;
}

/** `owner/repo`, `owner/repo@branch`, `owner/repo/some/dir`, `owner/repo@branch/some/dir`. */
export function parseGitSpec(spec: string): GitSpec | null {
  const m = /^([^/@\s]+)\/([^/@\s]+)(?:@([^/\s]+))?(?:\/(.+))?$/.exec(spec.trim());
  if (!m) return null;
  return { owner: m[1], repo: m[2], branch: m[3] || undefined, dir: m[4] ? m[4].replace(/\/+$/, '') : undefined };
}

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(text: string): Uint8Array {
  const s = atob(text.replace(/\s+/g, ''));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const GITHUB_API = 'https://api.github.com';

export class GitStore implements Store {
  private shas = new Map<string, string>(); // path -> blob sha, from the last list or read
  private branch: string | null;

  constructor(private spec: GitSpec, private fetcher: GitFetcher, private token?: string, private api = GITHUB_API) {
    this.branch = spec.branch ?? null;
  }

  capabilities(): Capabilities {
    return { write: !!this.token, watch: false };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private full(path: string): string {
    return this.spec.dir ? `${this.spec.dir}/${path}` : path;
  }
  private relative(full: string): string | null {
    if (!this.spec.dir) return full;
    return full.startsWith(this.spec.dir + '/') ? full.slice(this.spec.dir.length + 1) : null;
  }

  private async branchName(): Promise<string> {
    if (this.branch) return this.branch;
    const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}`, { headers: this.headers() });
    if (!r.ok) throw new Error(`${this.spec.owner}/${this.spec.repo}: ${r.status}`);
    const info = JSON.parse(await r.text()) as { default_branch?: string };
    this.branch = info.default_branch || 'main';
    return this.branch;
  }

  /** The whole tree in one request; only files of known kinds, under the canvas's directory. */
  async list(): Promise<Entry[]> {
    const branch = await this.branchName();
    const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: this.headers() });
    if (!r.ok) throw new Error(`tree of ${this.spec.owner}/${this.spec.repo}@${branch}: ${r.status}`);
    const tree = JSON.parse(await r.text()) as { tree?: { path: string; type: string; sha: string; size?: number }[]; truncated?: boolean };
    const out: Entry[] = [];
    for (const t of tree.tree ?? []) {
      if (t.type !== 'blob') continue;
      const rel = this.relative(t.path);
      if (rel === null) continue;
      this.shas.set(rel, t.sha);
      if (participantOfLog(rel)) continue;
      const e = isCanvasFile(rel);
      if (e) out.push({ ...e, size: t.size });
    }
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  private async contents(path: string): Promise<{ content: Uint8Array; sha: string } | null> {
    const branch = await this.branchName();
    const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/contents/${this.full(path).split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`, { headers: this.headers() });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    const body = JSON.parse(await r.text()) as { content?: string; sha: string; encoding?: string };
    this.shas.set(path, body.sha);
    return { content: body.content ? b64decode(body.content) : new Uint8Array(), sha: body.sha };
  }

  async read(path: string): Promise<string | Uint8Array> {
    const c = await this.contents(path);
    if (!c) throw new Error(`${path}: not in the repository`);
    const row = kindOf(path);
    return row && !row.textual ? c.content : toText(c.content);
  }

  /** A write is a commit of one file. The blob's sha is needed to update; a missing one means a new file. */
  async write(path: string, data: string | Uint8Array, message?: string): Promise<void> {
    if (!this.token) throw new ReadOnlyError(`write ${path}`);
    const branch = await this.branchName();
    let sha = this.shas.get(path);
    if (!sha) { const c = await this.contents(path); sha = c?.sha; }
    const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/contents/${this.full(path).split('/').map(encodeURIComponent).join('/')}`, {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message ?? `metamedium: ${path}`, content: b64encode(toBytes(data)), branch, ...(sha ? { sha } : {}) }),
    });
    if (!r.ok) throw new Error(`write ${path}: ${r.status}`);
    const body = JSON.parse(await r.text()) as { content?: { sha?: string } };
    if (body.content?.sha) this.shas.set(path, body.content.sha);
  }

  async appendLog(participant: string, events: readonly SessionEvent[]): Promise<void> {
    if (!this.token) throw new ReadOnlyError(`append to ${participant}'s log`);
    if (events.length === 0) return;
    const path = logPathFor(participant);
    const existing = await this.contents(path);
    const text = (existing ? toText(existing.content) : '') + encodeLog(events);
    await this.write(path, text, `metamedium: ${participant}, ${events.length} event${events.length === 1 ? '' : 's'}`);
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    if (this.shas.size === 0) await this.list();
    const out: Record<string, SessionEvent[]> = {};
    for (const path of this.shas.keys()) {
      const who = participantOfLog(path);
      if (!who) continue;
      const c = await this.contents(path);
      if (c) out[who] = decodeLog(toText(c.content)).events;
    }
    return out;
  }
}
