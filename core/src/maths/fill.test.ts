// The fill-in's registry (MATHS-SPEC §4, the contract C0). Pinned: a source's
// fill-ins are read and taken back out with it; one fill-in per key, the stronger
// standing and, on a tie, the source registered first; strongest first; a source
// that throws, or gives a record that cannot be drawn, is left out and named
// while the others stand; every source is handed the board's maths read once;
// and a session's fill-ins are kept while its log and its sources stand.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { lineStroke } from '../test/strokes';
import {
  registerFillSource,
  fillInsOf,
  fillInsReport,
  fillInsOfSession,
  fillSources,
  fillSourcesVersion,
} from './fill';
import type { FillIn, FillSource } from './fill';
import { BUILTIN_FILL_SOURCES } from './fill-builtin';
import type { CompileFunction } from './compile';

const taken: Array<() => void> = [];
const register = (s: FillSource) => taken.push(registerFillSource(s));
afterEach(() => {
  while (taken.length) taken.pop()!();
});

function fill(key: string, rank: number, extra: Partial<FillIn> = {}): FillIn {
  return {
    key,
    kind: 'value',
    source: 'test',
    text: key,
    at: { x: 10, y: 20 },
    about: [],
    quantity: `q:${key}`,
    reason: `${key} because`,
    answer: true,
    rank,
    take: { kind: 'none', why: 'a test' },
    ...extra,
  };
}

const board = () => createSession().getState();

describe('the fill-in registry', () => {
  it('reads nothing with no source, and the built-in list registers what it lists', () => {
    const own = fillSources().filter((s) => !BUILTIN_FILL_SOURCES.includes(s));
    expect(own).toEqual([]);
    for (const s of BUILTIN_FILL_SOURCES) expect(fillSources()).toContain(s);
  });

  it("reads a source's fill-ins, and takes them back out with it", () => {
    const v = fillSourcesVersion();
    const off = registerFillSource({ id: 'a', fillIns: () => [fill('a:1', 0.5)] });
    expect(fillSourcesVersion()).toBeGreaterThan(v);
    expect(fillInsOf(board()).map((f) => f.key)).toContain('a:1');
    off();
    expect(fillInsOf(board()).map((f) => f.key)).not.toContain('a:1');
  });

  it('keeps one fill-in per key: the stronger, and on a tie the source registered first', () => {
    register({ id: 'first', fillIns: () => [fill('k', 0.5, { text: 'first' }), fill('tie', 0.4, { text: 'first' })] });
    register({ id: 'second', fillIns: () => [fill('k', 0.7, { text: 'second' }), fill('tie', 0.4, { text: 'second' })] });
    const got = fillInsOf(board());
    expect(got.filter((f) => f.key === 'k').map((f) => f.text)).toEqual(['second']);
    expect(got.filter((f) => f.key === 'tie').map((f) => f.text)).toEqual(['first']);
  });

  it('ranks strongest first, ties by key, and holds a rank to 0–1', () => {
    register({ id: 'r', fillIns: () => [fill('b', 0.3), fill('a', 0.3), fill('c', 0.9), fill('d', 7)] });
    const got = fillInsOf(board());
    expect(got.map((f) => f.key)).toEqual(['d', 'c', 'a', 'b']);
    expect(got[0].rank).toBe(1);
  });

  it('leaves out a source that throws, and names it, while the others stand', () => {
    register({ id: 'ok', fillIns: () => [fill('ok:1', 0.5)] });
    register({ id: 'broken', fillIns: () => { throw new Error('no figure'); } });
    const r = fillInsReport(board());
    expect(r.fillIns.map((f) => f.key)).toEqual(['ok:1']);
    expect(r.refused).toEqual([{ source: 'broken', reason: 'threw: no figure' }]);
  });

  it('leaves out a record that cannot be drawn, and says which', () => {
    register({
      id: 'sloppy',
      fillIns: () => [
        fill('good', 0.5),
        fill('nowhere', 0.5, { at: { x: NaN, y: 0 } }),
        fill('', 0.5),
        fill('bad-point', 0.5, { points: [{ x: 0, y: 0 }, { x: Infinity, y: 1 }] }),
      ],
    });
    const r = fillInsReport(board());
    expect(r.fillIns.map((f) => f.key)).toEqual(['good']);
    expect(r.refused.map((x) => x.reason)).toEqual([
      'a fill-in "nowhere" has nowhere to stand',
      'a fill-in has no key',
      'a fill-in "bad-point" has a point that is no number',
    ]);
  });

  it("hands every source the board's maths, read once", () => {
    const seen: unknown[] = [];
    register({ id: 'one', fillIns: (_s, ctx) => (seen.push(ctx.board()), []) });
    register({ id: 'two', fillIns: (_s, ctx) => (seen.push(ctx.board()), seen.push(ctx.board()), []) });
    fillInsOf(board());
    expect(seen).toHaveLength(3);
    expect(new Set(seen).size).toBe(1);
  });
});

describe("a session's fill-ins, kept while its log stands", () => {
  it('reads again when the log changes or a source comes or goes, and not otherwise', () => {
    const s = createSession();
    let asked = 0;
    register({ id: 'count', fillIns: (st) => (asked++, [fill(`n:${st.contentIds.length}`, 0.5)]) });
    const a = fillInsOfSession(s);
    expect(fillInsOfSession(s)).toBe(a);
    expect(asked).toBe(1);

    s.addStroke(lineStroke({ x: 0, y: 0 }, { x: 200, y: 0 }), 1000);
    const b = fillInsOfSession(s);
    expect(b).not.toBe(a);
    expect(b.map((f) => f.key)).toEqual(['n:1']);
    expect(asked).toBe(2);

    register({ id: 'late', fillIns: () => [fill('late', 0.1)] });
    expect(fillInsOfSession(s).map((f) => f.key)).toEqual(['n:1', 'late']);
    expect(asked).toBe(3);
  });
});

describe("compileFunction's shape", () => {
  it('is a function of one variable that may be undefined at a point, or a reason', () => {
    // The shape C plots with until B's `fn.ts` is merged: a plain function standing in.
    const stand: CompileFunction = (text, variable = 'x') =>
      text === '(x^2-4)/(x-2)'
        ? { ok: true, f: (x) => (x === 2 ? null : (x * x - 4) / (x - 2)), variables: [variable], text: '(x² − 4)/(x − 2)' }
        : { ok: false, reason: `cannot read “${text}”` };
    const c = stand('(x^2-4)/(x-2)');
    expect(c.ok && c.f(3)).toBe(5);
    expect(c.ok && c.f(2)).toBeNull();
    const no = stand('2 ∰ x');
    expect(no.ok).toBe(false);
  });
});
