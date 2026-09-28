// A small deterministic layered layout (V1-PLAN §3, §9 D3).
//
// Pinned here: the text's order is the drawing's reading order (the rule the
// round trip rests on); ranks are the longest path along the links that run
// forward, never above the node written before; a link back against the
// order is returned, with the cycle it closes; loops and unknown ids are left
// out and said; barycentre passes move places, never the order; the ranks
// stretch until the links run the direction's way; and the same input gives
// the same places every time.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { layoutLayered, keepApart, KEEP_DIRECTION } from './layered';
import type { LayeredDirection, LayeredLink, LayeredNode } from './layered';
import { inReadingOrder } from './mermaid';
import { rng } from '../test/strokes';

const box = (id: string, w = 120, h = 50): LayeredNode => ({ id, w, h });
const opts = (direction: LayeredDirection = 'TD') => ({ direction, rankGap: 56, nodeGap: 56 });

/** A seeded graph: n nodes of various sizes, links mostly forward in the order given, some back. */
function randomGraph(seed: number, n: number): { nodes: LayeredNode[]; links: LayeredLink[] } {
  const r = rng(seed);
  const nodes = Array.from({ length: n }, (_, i) => box(`n${i}`, 60 + Math.floor(r() * 180), 30 + Math.floor(r() * 100)));
  const links: LayeredLink[] = [];
  for (let k = 0; k < n + Math.floor(r() * n); k++) {
    const a = Math.floor(r() * n), b = Math.floor(r() * n);
    if (a !== b) links.push(r() < 0.8 ? { from: `n${Math.min(a, b)}`, to: `n${Math.max(a, b)}` } : { from: `n${Math.max(a, b)}`, to: `n${Math.min(a, b)}` });
  }
  return { nodes, links };
}

/** The nodes as the drawing reads them: rows down the page (or columns across), as D2 writes them. */
function readingOrder(nodes: readonly LayeredNode[], at: Map<string, Point>, across: boolean): string[] {
  const boxOf = (v: LayeredNode) => {
    const c = at.get(v.id)!;
    return { minX: c.x - v.w / 2, maxX: c.x + v.w / 2, minY: c.y - v.h / 2, maxY: c.y + v.h / 2 };
  };
  return inReadingOrder(nodes, boxOf, (v) => v.id, across).map((v) => v.id);
}

describe('the text’s order is the drawing’s reading order', () => {
  it('down the page and across it, for graphs of every shape', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { nodes, links } = randomGraph(seed, 2 + (seed % 17));
      for (const dir of ['TD', 'LR'] as const) {
        const l = layoutLayered(nodes, links, opts(dir));
        expect(readingOrder(nodes, l.at, dir === 'LR'), `seed ${seed} ${dir}`).toEqual(nodes.map((v) => v.id));
      }
    }
  });

  it('within a rank the nodes stand in the order written, even where a swap would uncross two links', () => {
    // a → c and b → d are drawn crossed if c and d stand as written: they do.
    const nodes = ['a', 'b', 'd', 'c'].map((id) => box(id));
    const l = layoutLayered(nodes, [{ from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'a', to: 'b' }], opts());
    expect(l.ranks).toEqual([['a'], ['b'], ['d', 'c']]);
    expect(l.at.get('d')!.x).toBeLessThan(l.at.get('c')!.x);
  });
});

describe('ranks', () => {
  it('the longest path along the links that run forward in the text', () => {
    const l = layoutLayered(['a', 'b', 'c', 'd'].map((id) => box(id)), [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }, { from: 'a', to: 'd' }], opts());
    expect([...l.rank.values()]).toEqual([0, 1, 1, 2]);
  });

  it('never above the node written before it: a source written after a sink stands beside it', () => {
    const l = layoutLayered(['a', 'b', 'c'].map((id) => box(id)), [{ from: 'a', to: 'b' }, { from: 'c', to: 'b' }], opts());
    expect(Object.fromEntries(l.rank)).toEqual({ a: 0, b: 1, c: 1 });
    expect(l.back.map((b) => b.index)).toEqual([1]);
  });

  it('when every link would run within a rank, every link crosses one — back links too', () => {
    const l = layoutLayered(['a', 'b', 'c'].map((id) => box(id)), [{ from: 'b', to: 'a' }, { from: 'c', to: 'b' }], opts());
    expect(Object.fromEntries(l.rank)).toEqual({ a: 0, b: 1, c: 2 });
    expect(l.kept).toBe(true);
  });
});

describe('links against the order, loops and strangers', () => {
  it('a link back that closes a cycle comes with the cycle; one that closes none, with null', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => box(id));
    const l = layoutLayered(nodes, [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'd', to: 'b' }], opts());
    expect(l.back).toEqual([
      { index: 2, cycle: ['a', 'b', 'c', 'a'] },
      { index: 3, cycle: null },
    ]);
  });

  it('a link from a node to itself, and one naming no node, are left out by index', () => {
    const l = layoutLayered([box('a'), box('b')], [{ from: 'a', to: 'a' }, { from: 'a', to: 'b' }, { from: 'a', to: 'x' }], opts());
    expect(l.loops).toEqual([0]);
    expect(l.unknown).toEqual([2]);
    expect(l.ranks).toEqual([['a'], ['b']]);
  });

  it('a node given twice is placed once, where it was first given', () => {
    const l = layoutLayered([box('a'), box('b'), box('a', 400, 400)], [{ from: 'a', to: 'b' }], opts());
    expect(l.ranks).toEqual([['a'], ['b']]);
  });
});

describe('places', () => {
  it('a chain stands in a line: each node pulled over the one it follows', () => {
    const l = layoutLayered([box('a', 100), box('b', 200), box('c', 60)], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }], opts());
    const xs = ['a', 'b', 'c'].map((id) => l.at.get(id)!.x);
    expect(xs[1]).toBeCloseTo(xs[0], 6);
    expect(xs[2]).toBeCloseTo(xs[0], 6);
  });

  it('a parent stands over the middle of its children, and they keep their spacing', () => {
    const nodes = [box('p'), box('a'), box('b'), box('c')];
    const l = layoutLayered(nodes, [{ from: 'p', to: 'a' }, { from: 'p', to: 'b' }, { from: 'p', to: 'c' }], opts());
    const x = (id: string) => l.at.get(id)!.x;
    expect(x('p')).toBeCloseTo(x('b'), 6);
    expect(x('b') - x('a')).toBeCloseTo(120 + 56, 6);
    expect(x('c') - x('b')).toBeCloseTo(120 + 56, 6);
  });

  it('keepApart: the least squared move that keeps the order and the spacing', () => {
    expect(keepApart([0, 0, 0], [0, 10, 10])).toEqual([-10, 0, 10]);
    expect(keepApart([0, 100, 300], [0, 10, 10])).toEqual([0, 100, 300]);
    expect(keepApart([5, 0], [0, 10])).toEqual([-2.5, 7.5]);
  });

  it('TD runs down, LR across, RL and BT the other way, the top-left corner at the origin', () => {
    const nodes = [box('a'), box('b')];
    const links = [{ from: 'a', to: 'b' }];
    const at = (d: LayeredDirection) => layoutLayered(nodes, links, opts(d));
    expect(at('TD').at.get('b')!.y).toBeGreaterThan(at('TD').at.get('a')!.y);
    expect(at('BT').at.get('b')!.y).toBeLessThan(at('BT').at.get('a')!.y);
    expect(at('LR').at.get('b')!.x).toBeGreaterThan(at('LR').at.get('a')!.x);
    expect(at('RL').at.get('b')!.x).toBeLessThan(at('RL').at.get('a')!.x);
    for (const d of ['TD', 'LR', 'RL', 'BT'] as const) {
      const l = at(d);
      const minX = Math.min(...nodes.map((v) => l.at.get(v.id)!.x - v.w / 2)), minY = Math.min(...nodes.map((v) => l.at.get(v.id)!.y - v.h / 2));
      expect([minX, minY, l.bounds.minX, l.bounds.minY]).toEqual([0, 0, 0, 0]);
    }
  });
});

describe('the direction kept', () => {
  it('a wide fan-out stretches the ranks until the links run more down than across — or across than down', () => {
    const kids = Array.from({ length: 7 }, (_, i) => box(`k${i}`, 200));
    const links = kids.map((k) => ({ from: 'p', to: k.id }));
    for (const dir of ['TD', 'LR'] as const) {
      const nodes = dir === 'TD' ? [box('p', 200), ...kids] : [box('p', 200, 50), ...kids.map((k) => box(k.id, 60, 200))];
      const l = layoutLayered(nodes, links, opts(dir));
      const along = (p: Point) => (dir === 'TD' ? p.y : p.x), across = (p: Point) => (dir === 'TD' ? p.x : p.y);
      const main = links.reduce((s, k) => s + Math.abs(along(l.at.get(k.to)!) - along(l.at.get(k.from)!)), 0);
      const side = links.reduce((s, k) => s + Math.abs(across(l.at.get(k.to)!) - across(l.at.get(k.from)!)), 0);
      expect(l.stretch, dir).toBeGreaterThan(1);
      expect(main / side, dir).toBeCloseTo(KEEP_DIRECTION, 6);
      expect(l.kept).toBe(true);
    }
  });

  it('a short fan-out is left as it is', () => {
    const l = layoutLayered([box('p'), box('a'), box('b')], [{ from: 'p', to: 'a' }, { from: 'p', to: 'b' }], opts());
    expect(l.stretch).toBe(1);
  });
});

describe('deterministic', () => {
  it('the same nodes and links give the same places, every time', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { nodes, links } = randomGraph(seed * 7, 12);
      const a = layoutLayered(nodes, links, opts('TD')), b = layoutLayered(nodes.map((v) => ({ ...v })), links.map((k) => ({ ...k })), opts('TD'));
      expect([...b.at.entries()]).toEqual([...a.at.entries()]);
      expect(b.back).toEqual(a.back);
      expect(b.stretch).toBe(a.stretch);
    }
  });

  it('nothing given, nothing placed', () => {
    const l = layoutLayered([], [], opts());
    expect(l.ranks).toEqual([]);
    expect(l.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});
