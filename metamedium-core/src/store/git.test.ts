// A repository as the folder: the tree listed in one request, files read by
// path, this participant's log committed as one file. Driven by a fake API.

import { describe, it, expect } from 'vitest';
import { GitStore, parseGitSpec, type GitFetcher } from './git';
import { ReadOnlyError, encodeLog, logPathFor, LOG_DIR } from './seam';
import { createSession } from '../session/session';
import { rectStroke } from '../test/strokes';

function fakeGitHub(files: Record<string, string>, opts: { defaultBranch?: string } = {}) {
  const shas = new Map<string, string>();
  let n = 0;
  const shaOf = (p: string) => shas.get(p) ?? (shas.set(p, 'sha' + ++n), shas.get(p)!);
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const enc = (s: string) => btoa(unescape(encodeURIComponent(s)));
  const dec = (s: string) => decodeURIComponent(escape(atob(s)));
  const fetcher: GitFetcher = async (url, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined });
    const ok = (obj: unknown, status = 200) => ({ ok: status < 300, status, text: async () => JSON.stringify(obj) });
    if (/\/repos\/o\/r$/.test(url)) return ok({ default_branch: opts.defaultBranch ?? 'main' });
    if (/\/git\/trees\//.test(url)) return ok({ tree: Object.keys(files).map((p) => ({ path: p, type: 'blob', sha: shaOf(p), size: files[p].length })) });
    const m = /\/contents\/(.+?)(?:\?ref=(.+))?$/.exec(url);
    if (m) {
      const path = decodeURIComponent(m[1]);
      if (method === 'PUT') {
        const body = init && init.body ? JSON.parse(init.body) as { content: string; sha?: string; message: string; branch: string } : null;
        if (files[path] !== undefined && !body?.sha) return ok({ message: 'sha required' }, 422);
        files[path] = dec(body!.content);
        shas.set(path, 'sha' + ++n);
        return ok({ content: { sha: shas.get(path) } }, 201);
      }
      if (files[path] === undefined) return ok({ message: 'Not Found' }, 404);
      return ok({ content: enc(files[path]), sha: shaOf(path), encoding: 'base64' });
    }
    return ok({ message: 'no route' }, 404);
  };
  return { fetcher, calls, files };
}

function someEvents() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  return s.getEvents();
}

describe('the git store', () => {
  it('parses a spec: owner/repo, a branch, a directory', () => {
    expect(parseGitSpec('o/r')).toEqual({ owner: 'o', repo: 'r', branch: undefined, dir: undefined });
    expect(parseGitSpec('o/r@dev')).toEqual({ owner: 'o', repo: 'r', branch: 'dev', dir: undefined });
    expect(parseGitSpec('o/r/some/dir/')).toEqual({ owner: 'o', repo: 'r', branch: undefined, dir: 'some/dir' });
    expect(parseGitSpec('o/r@dev/deep/er')).toEqual({ owner: 'o', repo: 'r', branch: 'dev', dir: 'deep/er' });
    expect(parseGitSpec('nonsense')).toBeNull();
  });

  it('lists the known kinds from one tree request, reads by path, and refuses writes without a token', async () => {
    const gh = fakeGitHub({ 'index.html': '<p>hi</p>', 'notes/a.md': '# a', 'Makefile': 'all:', [`${LOG_DIR}/me.jsonl`]: encodeLog(someEvents()) });
    const store = new GitStore({ owner: 'o', repo: 'r' }, gh.fetcher);
    expect(store.capabilities()).toEqual({ write: false, watch: false });
    expect((await store.list()).map((e) => e.path)).toEqual(['index.html', 'notes/a.md']);
    expect(gh.calls.filter((c) => /trees/.test(c.url))).toHaveLength(1);
    expect(await store.read('notes/a.md')).toBe('# a');
    const logs = await store.readLogs();
    expect(logs.me).toHaveLength(1);
    await expect(store.write('x.md', '#')).rejects.toBeInstanceOf(ReadOnlyError);
    await expect(store.read('missing.md')).rejects.toThrow(/not in the repository/);
  });

  it('with a token, a write is one commit with the blob\'s sha; a log append reads then commits this participant\'s file', async () => {
    const gh = fakeGitHub({ 'index.html': '<p>hi</p>' }, { defaultBranch: 'trunk' });
    const store = new GitStore({ owner: 'o', repo: 'r' }, gh.fetcher, 'tok');
    expect(store.capabilities().write).toBe(true);
    await store.list();
    await store.write('index.html', '<p>changed</p>');
    const put = gh.calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toMatch(/\/contents\/index\.html$/);
    expect((put.body as { sha: string; branch: string }).sha).toBe('sha1');
    expect((put.body as { branch: string }).branch).toBe('trunk');
    expect(gh.files['index.html']).toBe('<p>changed</p>');
    const events = someEvents();
    await store.appendLog('me', events);
    await store.appendLog('me', events);
    const logText = gh.files[logPathFor('me')];
    expect(logText.split('\n').filter(Boolean)).toHaveLength(2);
    const puts = gh.calls.filter((c) => c.method === 'PUT' && /jsonl/.test(c.url));
    expect(puts).toHaveLength(2);
    expect((puts[1].body as { message: string }).message).toMatch(/me, 1 event/);
    // The token travels only in the Authorization header.
    expect(gh.calls.every((c) => !/tok/.test(c.url))).toBe(true);
  });

  it('a subfolder of the repository can be the canvas', async () => {
    const gh = fakeGitHub({ 'site/index.html': '<p>site</p>', 'index.html': '<p>root</p>', 'site/deep/a.md': '# a' });
    const store = new GitStore({ owner: 'o', repo: 'r', dir: 'site' }, gh.fetcher);
    expect((await store.list()).map((e) => e.path)).toEqual(['deep/a.md', 'index.html']);
    expect(await store.read('index.html')).toBe('<p>site</p>');
  });
});
