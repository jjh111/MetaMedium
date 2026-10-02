// The magnet queries as they were before notations could offer ports (E3).
//
// V1-PLAN §9 E3: with no notation registered, every magnet query must return
// exactly what it returned before the ports hook existed. "Exactly" is only
// checkable against a record, so this board and these queries were run once
// against magnets.ts as it stood (w2-maths at d511465) and the answers are
// kept in `magnets.golden.ts`. The test runs the same board and the same
// queries through today's code and compares.
//
// One board with every shape the rung reads, drawn well apart so no stroke
// is a scratch across another, and one mark snapped clean so a held clean
// form is covered too. The queries are the pen's: the sites of every mark,
// the nearest site to a point, every site near a point, and the exclude set.

import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { magnetSites, nearestMagnet, magnetsNear, magnetRadius, describeMagnet } from '../session/magnets';
import type { MagnetSite } from '../session/magnets';
import {
  lineStroke,
  rectStroke,
  circleStroke,
  triangleStroke,
  arcStroke,
  handArrow,
  handText,
  handRect,
  handCircle,
  handDot,
} from './strokes';
import type { Point } from '../types';

export interface GoldenBoard {
  session: Session;
  ids: Record<string, string>;
}

export function goldenBoard(): GoldenBoard {
  const s = createSession();
  const at = (i: number) => 1000 + i * 5000;
  const ids: Record<string, string> = {};
  ids.line = s.addStroke(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }), at(0));
  ids.arrow = s.addStroke(handArrow({ x: 300, y: 100 }, { x: 600, y: 120 }, { seed: 3, wings: 2 }), at(1));
  ids.rect = s.addStroke(rectStroke(700, 100, 200, 120), at(2));
  ids.circle = s.addStroke(circleStroke(1100, 200, 80), at(3));
  ids.triangle = s.addStroke(triangleStroke({ x: 1300, y: 100 }, { x: 1420, y: 300 }, { x: 1180, y: 300 }), at(4));
  ids.arc = s.addStroke(arcStroke(300, 520, 100), at(5));
  ids.text = s.addStroke(handText(600, 460, 140, 40, { seed: 2 }), at(6));
  ids.handRect = s.addStroke(handRect(820, 450, 180, 120, { seed: 5, jitter: 2 }), at(7));
  ids.handCircle = s.addStroke(handCircle(1150, 540, 70, { seed: 7 }), at(8));
  ids.dot = s.addStroke(handDot(1350, 520, 2, { seed: 4 }), at(9));
  ids.snapped = s.addStroke(rectStroke(100, 700, 160, 100), at(10));
  s.snap({ ids: [ids.snapped], at: at(11) });
  return { session: s, ids };
}

/** Points the pen might be at: on sites, just off them, between marks, far away. */
export const GOLDEN_POINTS: Point[] = [
  { x: 104, y: 296 },
  { x: 100, y: 205 },
  { x: 598, y: 118 },
  { x: 706, y: 104 },
  { x: 800, y: 222 },
  { x: 1100, y: 125 },
  { x: 1300, y: 108 },
  { x: 400, y: 520 },
  { x: 610, y: 470 },
  { x: 830, y: 455 },
  { x: 1350, y: 520 },
  { x: 180, y: 750 },
  { x: 262, y: 698 },
  { x: 5000, y: 5000 },
];

export interface GoldenData {
  sites: Record<string, MagnetSite[]>;
  nearest: ({ site: MagnetSite; distance: number } | null)[];
  near: { site: MagnetSite; distance: number }[][];
  nearExcluding: { site: MagnetSite; distance: number }[][];
  radii: number[];
  described: string[];
}

/** Every query the golden pins, run against the board as the code stands now. */
export function goldenQueries(board: GoldenBoard): GoldenData {
  const st = board.session.getState();
  const names = Object.keys(board.ids);
  const all = names.map((k) => board.ids[k]);
  const sites: Record<string, MagnetSite[]> = {};
  for (const k of names) sites[k] = magnetSites(st.nodes.get(board.ids[k])!, st.nodes);
  const every = names.flatMap((k) => sites[k]);
  const exclude = new Set([board.ids.rect, board.ids.line]);
  return {
    sites,
    nearest: GOLDEN_POINTS.map((p) => nearestMagnet(p, every, 20)),
    near: GOLDEN_POINTS.map((p) => magnetsNear(p, st.nodes, all, 30)),
    nearExcluding: GOLDEN_POINTS.map((p) => magnetsNear(p, st.nodes, all, 30, exclude)),
    radii: [magnetRadius(10), magnetRadius(100, 2), magnetRadius(2000, 0.5)],
    described: names.map((k) => (sites[k][0] ? describeMagnet(sites[k][0]) : '')),
  };
}
