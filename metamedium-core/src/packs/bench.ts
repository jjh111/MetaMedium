// Every pack has a bench (V1-PLAN §2.3, B3): the command mark's pattern
// (`session/commandmark.bench.test.ts`) for a board's vocabulary. Two
// questions, and the second matters more:
//
//   - **Does it read its own drawings?** Each definition's drawings, drawn
//     again with other seeds, somewhere else and at other sizes — never the
//     ink its signature was read from — are held on a board that uses the
//     pack, and the field's first match must be that definition. The rate is
//     reported, drawing by drawing, with what came first when it was not.
//   - **Does it stay quiet on everything else?** A corpus of other drawings —
//     the recognition corpus's single marks, flowcharts, wireframes, writing,
//     the drawings the other benches use — each held whole, and each group the
//     board would chip, on a board that uses the pack. A match above the floor
//     is a FALSE READ unless the drawing is, by its own label, that thing
//     (`is`), or reads as the very structure the definition is (a signature
//     cannot tell apart what has the same shapes and links: a lone circle IS a
//     bubble — that is said, as `same`, never hidden and never counted false).
//     What needs more than structure to tell apart is a notation's job.
//
// Pure: it builds its own boards (the pack handed in as their source, so a
// pack not yet shipped is benched the same way) and writes nothing anywhere.

import type { Point, Bounds } from '../types';
import { getBounds } from '../geometry';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionState } from '../session/session';
import { MATCH_FLOOR, SAME, compareSignatures, structuralSignature, type StructuralSignature } from '../session/signature';
import { topInterpretation } from '../session/nodes';
import type { Pack } from './pack';
import { packRef } from './pack';
import { libraryDefinitions, MARK_GAP_MS } from './definitions';
import { type Placement, drawingStrokes, drawingsOf, seedOf } from './synthesize';

/** A drawing the pack must not read, or must read as `is`. */
export interface BenchDrawing {
  /** What it is, for the report: 'flowchart seed 11', 'circle r90 start0 …'. */
  label: string;
  /** Its marks, as a hand left them, in canvas units at zoom 1. */
  strokes: Point[][];
  /** The definition it is, by name, when it is one of the pack's: read as it is right, read as another is false. */
  is?: string;
}

export interface PackBenchOptions {
  /** The drawings the pack must stay quiet on — or those drawings laid out once (`benchCorpus`), to bench several packs on one board. */
  corpus?: readonly BenchDrawing[] | BenchCorpus;
  /** The seeds its own drawings are drawn again with. Never the signature's own. */
  seeds?: readonly number[];
  /** Where and how big they are drawn again. */
  places?: readonly Placement[];
}

/** One of a definition's own drawings that did not read as it. */
export interface BenchMiss {
  drawing: string;
  /** What the field offered first instead, if anything, and how sure. */
  top: string | null;
  score: number;
}

export interface BenchRead {
  label: string;
  definition: string;
  score: number;
  reasoning: string;
  /** Where it was read: the drawing held whole, or a group of it the board would chip. */
  as: 'held' | 'chipped';
}

export interface PackBenchResult {
  pack: string;
  /** Each definition's own drawings: how many were drawn, how many read as it, and the misses. */
  own: { definition: string; drawn: number; read: number; rate: number; misses: BenchMiss[] }[];
  ownDrawn: number;
  ownRead: number;
  /** read / drawn over every definition; 1 for a pack with no definitions. */
  ownRate: number;
  corpus: {
    drawn: number;
    /** Read as a definition above the floor, and neither labelled it nor the same structure: what must be none. */
    falseReads: BenchRead[];
    /** Read as the definition it is labelled (`is`): right. */
    expected: BenchRead[];
    /** Labelled as a definition and not read as it. */
    missed: { label: string; is: string; top: string | null; score: number }[];
    /** Read as a definition whose very structure it has — a signature cannot tell them apart; said, not counted. */
    same: BenchRead[];
  };
}

/** The seeds and places a pack's own drawings are drawn again with, when not said. */
export const BENCH_SEEDS: readonly number[] = [101, 202, 303, 404, 505, 606, 707, 808];
export const BENCH_PLACES: readonly Placement[] = [
  { k: 1, dx: 0, dy: 0 },
  { k: 0.6, dx: 3000, dy: 0 },
  { k: 1.8, dx: 0, dy: 3000 },
];

const T0 = 1_000_000;

/** A board that uses the pack benched, whatever the build ships. */
function boardUsing(pack: Pack): Session {
  const ref = packRef(pack);
  const s = createSession({ ...DEFAULT_SESSION_CONFIG, packs: (r) => (r === ref ? pack : undefined) });
  s.use(ref, T0);
  return s;
}

/**
 * A corpus laid out once on a board of its own, so several packs are benched
 * against it without reading its thousands of marks again: each pack is used
 * on the board for its bench and stopped after (`packBench`).
 */
export interface BenchCorpus {
  drawings: readonly BenchDrawing[];
  board: Session;
  /** Each drawing's marks on the board, in the corpus's order. */
  ids: string[][];
  /** The packs the board can be told to use: whichever is being benched. */
  packs: Map<string, Pack>;
}

/** Lay a corpus out once, for `packBench`. */
export function benchCorpus(drawings: readonly BenchDrawing[]): BenchCorpus {
  const packs = new Map<string, Pack>();
  const board = createSession({ ...DEFAULT_SESSION_CONFIG, packs: (r) => packs.get(r) });
  return { drawings, board, ids: layOut(board, drawings.map((d) => d.strokes)), packs };
}

const union = (bs: Bounds[]): Bounds => getBounds(bs.flatMap((b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }]));

/**
 * Lay drawings out on one board, each in a cell of its own far enough apart
 * that nothing of one is within reach of another — within reach is a ratio of
 * the marks' own size, so a gap of twice the largest drawing is out of it —
 * and each mark a word window after the last, so none gather into a word.
 */
function layOut(s: Session, drawings: readonly Point[][][]): string[][] {
  const boxes = drawings.map((d) => (d.length ? union(d.map((st) => getBounds(st))) : { minX: 0, minY: 0, maxX: 0, maxY: 0 }));
  const size = Math.max(1, ...boxes.map((b) => Math.max(b.maxX - b.minX, b.maxY - b.minY)));
  const cell = size * 3;
  const across = Math.max(1, Math.ceil(Math.sqrt(drawings.length)));
  let at = T0;
  return drawings.map((d, i) => {
    const b = boxes[i];
    const dx = (i % across) * cell - b.minX, dy = Math.floor(i / across) * cell - b.minY;
    return d.map((st) => s.addStroke(st.map((p) => ({ x: p.x + dx, y: p.y + dy })), (at += MARK_GAP_MS), undefined, 1, { content: true }));
  });
}

/** What a group reads as, as a signature — the same one a bless and the matching read. */
function signatureIn(nodes: SessionState['nodes'], ids: readonly string[]): StructuralSignature {
  return structuralSignature(ids, nodes, (id) => topInterpretation(nodes.get(id)!) ?? 'art');
}

/** Measure a pack against its own drawings and a corpus of others. */
export function packBench(pack: Pack, opts: PackBenchOptions = {}): PackBenchResult {
  const ref = packRef(pack);
  const seeds = opts.seeds ?? BENCH_SEEDS;
  const places = opts.places ?? BENCH_PLACES;
  const defs = libraryDefinitions(pack, () => createSession());
  const idOf = new Map(defs.map((d) => [d.name, d.id]));

  // --- its own drawings, drawn again ---
  const own: PackBenchResult['own'] = [];
  for (const def of pack.definitions) {
    const want = idOf.get(def.name);
    if (!want) continue;
    const jobs: { label: string; strokes: Point[][] }[] = [];
    for (const d of drawingsOf(def)) {
      for (const seed of seeds) {
        for (const place of places) {
          jobs.push({
            label: `${def.name} ${d.kind} ${d.index} seed ${seed} ×${place.k}`,
            strokes: drawingStrokes(def, d, seedOf(`bench:${seed}:${ref}:${def.name}:${d.kind}:${d.index}`), place),
          });
        }
      }
    }
    const s = boardUsing(pack);
    const laid = layOut(s, jobs.map((j) => j.strokes));
    const misses: BenchMiss[] = [];
    let read = 0;
    laid.forEach((ids, i) => {
      const top = s.matchesOf(ids)[0];
      if (top && top.artifactId === want) read++;
      else misses.push({ drawing: jobs[i].label, top: top ? top.name : null, score: top ? top.score : 0 });
    });
    own.push({ definition: def.name, drawn: jobs.length, read, rate: jobs.length ? read / jobs.length : 1, misses });
  }
  const ownDrawn = own.reduce((a, o) => a + o.drawn, 0);
  const ownRead = own.reduce((a, o) => a + o.read, 0);

  // --- everything else ---
  const given = opts.corpus ?? [];
  const prepared: BenchCorpus | null = Array.isArray(given) ? (given.length ? benchCorpus(given) : null) : (given as BenchCorpus);
  const corpus = prepared ? prepared.drawings : [];
  const falseReads: BenchRead[] = [], expected: BenchRead[] = [], same: BenchRead[] = [];
  const missed: PackBenchResult['corpus']['missed'] = [];
  if (prepared && corpus.length) {
    const s = prepared.board;
    const laid = prepared.ids;
    const at = Math.max(T0, ...s.getEvents().map((e) => e.at)) + MARK_GAP_MS;
    prepared.packs.set(ref, pack);
    s.use(ref, at);
    // The live graph, read once: the state handed out copies the board's lists every time it is asked.
    const nodes = s.getState().nodes;
    const sameAs = (sig: StructuralSignature, defId: string) => {
      const d = defs.find((x) => x.id === defId);
      return !!d && [d.signature, ...d.accepted].some((x) => compareSignatures(sig, x).score >= SAME);
    };
    const judge = (c: BenchDrawing, ids: string[], as: BenchRead['as'], seen: Set<string>) => {
      const sig = signatureIn(nodes, ids);
      for (const m of s.matchesOf(ids)) {
        if (m.pack !== ref || m.score < MATCH_FLOOR || seen.has(m.artifactId + as)) continue;
        seen.add(m.artifactId + as);
        const r: BenchRead = { label: c.label, definition: m.name, score: m.score, reasoning: m.reasoning, as };
        if (c.is === m.name) expected.push(r);
        else if (sameAs(sig, m.artifactId)) same.push(r);
        else falseReads.push(r);
      }
    };
    const candidates = s.getState().clusterCandidates;
    corpus.forEach((c, i) => {
      const ids = laid[i];
      if (!ids.length) return;
      const seen = new Set<string>();
      judge(c, ids, 'held', seen);
      const mine = new Set(ids);
      for (const cand of candidates) if (cand.nodeIds.every((id) => mine.has(id))) judge(c, cand.nodeIds, 'chipped', seen);
      if (c.is && idOf.has(c.is) && !expected.some((r) => r.label === c.label)) {
        const top = s.matchesOf(ids)[0];
        missed.push({ label: c.label, is: c.is, top: top ? top.name : null, score: top ? top.score : 0 });
      }
    });
    s.unuse(ref, at + 1);
  }

  return {
    pack: ref,
    own,
    ownDrawn,
    ownRead,
    ownRate: ownDrawn ? ownRead / ownDrawn : 1,
    corpus: { drawn: corpus.length, falseReads, expected, missed, same },
  };
}
