// Regions: the drawn boxes, read as a layout frame.
//
// MVP.md §6.2 — generation is CONSTRAINED by the ink, not merely prompted by
// it. If a model is asked politely to respect the boxes it will sometimes not,
// and the ink then floats off the divs it supposedly outlines: the premise
// fails visibly on the first demo where it drifts.
//
// So the drawn geometry is not advice, it is the frame. Each member mark of an
// artifact becomes a region with a rect in artifact-local pixels. The model
// chooses what goes in a region and how it looks. It does not choose where the
// regions are — the human drew that, and the ink is the record of it.
//
// This is also the address space for ink-over-artifact (MVP.md §5.4): a mark
// drawn on a live artifact resolves to a region before it resolves to an
// element.

import type { Bounds } from '../types';
import {
  type MMNode,
  boundsOf,
  getRep,
  topInterpretation,
  wordOf,
} from './nodes';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Region {
  /** Stable, short, and prompt-friendly — the model refers to regions by this. */
  id: string;
  /** The mark that defines this region. */
  nodeId: string;
  /** What Tier 0 reads the mark as ('rectangle', 'circle', 'line', 'art'). */
  shape: string;
  /** Artifact-local pixels — the coordinate space generated code is written in. */
  rect: Rect;
  /** World pixels — what the canvas draws and hit-tests in. */
  world: Rect;
  /** Region ids fully inside this one. Nesting the human drew, preserved. */
  contains: string[];
}

const rectOf = (b: Bounds): Rect => ({
  x: b.minX,
  y: b.minY,
  w: b.maxX - b.minX,
  h: b.maxY - b.minY,
});

const insideOf = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h &&
  !(inner.x === outer.x && inner.y === outer.y && inner.w === outer.w && inner.h === outer.h);

/** The artifact's own frame in world pixels — the origin regions are local to. */
export function frameOf(artifact: MMNode): Rect | null {
  const b = (getRep(artifact, 'bounds')?.data as Bounds | undefined) ?? boundsOf(artifact);
  return b ? rectOf(b) : null;
}

/**
 * The artifact's member marks as a layout frame, in READING ORDER: top to
 * bottom, left to right, with a container always ahead of what it contains.
 *
 * Ordering is not cosmetic. Region ids are how the human, the model and the
 * generated DOM refer to the same thing, so `r1` must mean the mark a person
 * would call first. Sorting by area — which is all the containment pass needs —
 * made `r1` the right-hand column of a four-box page, and the model then wrote
 * its markup in that order too.
 */
export function regionsOf(artifact: MMNode, nodes: ReadonlyMap<string, MMNode>): Region[] {
  const frame = frameOf(artifact);
  if (!frame) return [];

  const members = artifact.edges
    .filter((e) => e.rel === 'has-part')
    .map((e) => nodes.get(e.to))
    .filter((n): n is MMNode => !!n && !getRep(n, 'erased'));

  const sized = members
    .map((n) => {
      const b = boundsOf(n);
      return b ? { node: n, world: rectOf(b) } : null;
    })
    .filter((m): m is { node: MMNode; world: Rect } => !!m)
    .sort((a, b) => b.world.w * b.world.h - a.world.w * a.world.h);

  // Containment is computed on area order (an outer box is always larger), then
  // the tree is walked in reading order to assign the ids.
  const draft = sized.map(({ node, world }, i) => ({
    key: i,
    node,
    world,
    contains: [] as number[],
    parent: -1,
  }));
  for (const outer of draft) {
    for (const inner of draft) {
      if (outer.key !== inner.key && insideOf(outer.world, inner.world)) {
        outer.contains.push(inner.key);
        // Area order means the LAST container to claim it is the smallest.
        inner.parent = outer.key;
      }
    }
  }

  const readingOrder = (a: typeof draft[number], b: typeof draft[number]) => {
    // Same band vertically? Then left to right. Otherwise top to bottom.
    const overlap =
      Math.min(a.world.y + a.world.h, b.world.y + b.world.h) - Math.max(a.world.y, b.world.y);
    const shorter = Math.min(a.world.h, b.world.h);
    if (overlap > shorter * 0.5) return a.world.x - b.world.x;
    return a.world.y - b.world.y;
  };

  const ordered: typeof draft = [];
  const visit = (parentKey: number) => {
    draft
      .filter((d) => d.parent === parentKey)
      .sort(readingOrder)
      .forEach((d) => {
        ordered.push(d);
        visit(d.key);
      });
  };
  visit(-1);

  const idByKey = new Map(ordered.map((d, i) => [d.key, `r${i + 1}`]));
  return ordered.map((d) => ({
    id: idByKey.get(d.key)!,
    nodeId: d.node.id,
    shape: wordOf(d.node) ?? topInterpretation(d.node) ?? 'art',
    rect: { x: d.world.x - frame.x, y: d.world.y - frame.y, w: d.world.w, h: d.world.h },
    world: d.world,
    contains: d.contains.map((k) => idByKey.get(k)!).filter(Boolean),
  }));
}

/** Which region a world point falls in — innermost wins, so nesting resolves correctly. */
export function regionAt(regions: Region[], x: number, y: number): Region | null {
  let best: Region | null = null;
  for (const r of regions) {
    const { world: w } = r;
    if (x < w.x || y < w.y || x > w.x + w.w || y > w.y + w.h) continue;
    if (!best || w.w * w.h < best.world.w * best.world.h) best = r;
  }
  return best;
}

/** Every region a world rect overlaps — how ink drawn over an artifact addresses it. */
export function regionsOverlapping(regions: Region[], b: Bounds): Region[] {
  return regions.filter(
    (r) =>
      !(b.maxX < r.world.x || b.minX > r.world.x + r.world.w || b.maxY < r.world.y || b.minY > r.world.y + r.world.h)
  );
}
