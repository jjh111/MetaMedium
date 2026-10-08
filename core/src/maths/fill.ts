// The fill-in (MATHS-SPEC §4, the contract C0): what the maths implies, as one
// kind of record every source gives — a missing side, an angle, a result, the
// next line, a curve, a particle's name — drawn faint where it would be written,
// and taken by a tap as the hand's own act.
//
// Derived, never logged: a fill-in is a pure function of the board, found again
// whenever the log changes, and nothing here writes an event. A source says what
// it can fill in; this file holds the sources in one registry, asks them all,
// keeps one fill-in per key and ranks them. A source that throws, or hands back
// a record that cannot be drawn, is left out and named — the others stand.
//
// A source is registered by one line in `fill-builtin.ts`, as a tool is in
// `tools/builtin.ts`; the order of those lines breaks ties.

import type { Bounds, Point } from '../types';
import type { Session, SessionEvent, SessionState } from '../session/session';
import { boardMaths, boardMathsOf } from './board';
import type { BoardMaths } from './solve';

/** What a fill-in is: a value (`5`, `36.87°`), an expression (`y = x²`), a mark (a side, a curve, a hole's ring), a step (`= x + 2`). */
export type FillKind = 'value' | 'expression' | 'mark' | 'step';

/** What a tap writes. */
export type FillTake =
  /** A one-line text at `bounds`, in the taker's name: the maths reads it back as written (`numbersOf`) and checks it from then on. */
  | { kind: 'text'; text: string; bounds: Bounds }
  /** Ink drawn in the taker's name, stamped with its tool and offer. */
  | { kind: 'strokes'; strokes: Point[][] }
  /** Nothing to write, and why (it is shown, not taken). */
  | { kind: 'none'; why: string };

export interface FillIn {
  /** Stable across paints while it says the same thing: `${source}:${figureOrMarkId}:${quantity}`. */
  key: string;
  kind: FillKind;
  /** The source that gave it: `figure`, `plane`, `limit`, `run`, `feynman` … */
  source: string;
  /** As it would be written: `5`, `36.87°`, `sin θ = 3/5`, `(x+2)(x−2)/(x−2)`. */
  text?: string;
  /** A mark's geometry in canvas units: a side, a curve, a hole's ring. */
  points?: Point[];
  closed?: boolean;
  dashed?: boolean;
  /** Where its words stand, in canvas units. */
  at: Point;
  /** M5's placement for a side: the side's middle and its outward normal. */
  from?: Point;
  away?: Point;
  /** The marks it concerns: what the selection test asks, and what the halo lies under. */
  about: string[];
  /** What it is, for its colour: `fig:<id>:side0`, `name:θ`, `fn:<id>`, `run:<id>:θ`. */
  quantity: string;
  /** The formula with its inputs: `√(3² + 4²) = 5`. */
  reason: string;
  /** An answer, which may wait on a board set so (MATHS-SPEC rule 9). */
  answer: boolean;
  /** 0–1: how strong it is — the one quiet offer at rest is the highest. */
  rank: number;
  take: FillTake;
}

/** What every source is handed beside the state: the board's maths, read once however many sources ask. */
export interface FillContext {
  board(): BoardMaths | null;
}

export interface FillSource {
  /** Unique among the sources; a second source under an id replaces the first. */
  id: string;
  fillIns(state: SessionState, ctx: FillContext): FillIn[];
}

/** A source left out of one reading, and why. */
export interface FillRefusal {
  source: string;
  reason: string;
}

export interface FillReport {
  /** Every source's fill-ins, one per key, strongest first. */
  fillIns: FillIn[];
  /** The sources (or their records) left out, each with its reason. */
  refused: FillRefusal[];
}

// ===== The registry =====

const sources: FillSource[] = [];
let version = 0;

/** Register a source; returns the way to take it back out. A source under an id already held replaces it, in its place. */
export function registerFillSource(s: FillSource): () => void {
  const at = sources.findIndex((x) => x.id === s.id);
  if (at >= 0) sources[at] = s;
  else sources.push(s);
  version++;
  return () => {
    const i = sources.indexOf(s);
    if (i >= 0) {
      sources.splice(i, 1);
      version++;
    }
  };
}

/** The sources, in the order they were registered (the tie-break). */
export function fillSources(): readonly FillSource[] {
  return sources.slice();
}

/** Moves whenever a source is registered or taken out, so what is kept from before is read again. */
export function fillSourcesVersion(): number {
  return version;
}

// ===== Reading =====

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const aPoint = (p: unknown): p is Point => !!p && finite((p as Point).x) && finite((p as Point).y);

/** Why a record cannot be drawn, or null when it can. Read, not trusted: a source is code, and code has bugs. */
function unusable(f: FillIn): string | null {
  if (!f || typeof f !== 'object') return 'is not a record';
  if (typeof f.key !== 'string' || !f.key) return 'has no key';
  if (!aPoint(f.at)) return `"${f.key}" has nowhere to stand`;
  if (!finite(f.rank)) return `"${f.key}" has no rank`;
  if (!Array.isArray(f.about)) return `"${f.key}" names no marks`;
  if (f.points && !f.points.every(aPoint)) return `"${f.key}" has a point that is no number`;
  if (!f.take || typeof f.take !== 'object') return `"${f.key}" says nothing a tap would write`;
  return null;
}

const stronger = (a: FillIn, b: FillIn) => b.rank - a.rank || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

function read(state: SessionState, ctx: FillContext): FillReport {
  const refused: FillRefusal[] = [];
  const kept = new Map<string, FillIn>();
  for (const s of sources) {
    let got: FillIn[];
    try {
      got = s.fillIns(state, ctx);
    } catch (e) {
      refused.push({ source: s.id, reason: `threw: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    if (!Array.isArray(got)) {
      refused.push({ source: s.id, reason: 'gave no list' });
      continue;
    }
    for (const f of got) {
      const why = unusable(f);
      if (why) {
        refused.push({ source: s.id, reason: `a fill-in ${why}` });
        continue;
      }
      const rank = Math.min(1, Math.max(0, f.rank));
      const one = rank === f.rank ? f : { ...f, rank };
      const had = kept.get(one.key);
      // One per key: the stronger stands, and on a tie the source registered first.
      if (!had || one.rank > had.rank) kept.set(one.key, one);
    }
  }
  return { fillIns: [...kept.values()].sort(stronger), refused };
}

/** A context whose board is read at most once, however many sources ask. */
function onceContext(readBoard: () => BoardMaths | null): FillContext {
  let held: { board: BoardMaths | null } | null = null;
  return {
    board() {
      if (!held) held = { board: readBoard() };
      return held.board;
    },
  };
}

/** Every source's fill-ins for a board, with what was left out and why. */
export function fillInsReport(state: SessionState): FillReport {
  return read(state, onceContext(() => boardMaths(state)));
}

/** Every source's fill-ins for a board: one per key, strongest first. */
export function fillInsOf(state: SessionState): FillIn[] {
  return fillInsReport(state).fillIns;
}

type Memo = {
  events: readonly SessionEvent[];
  length: number;
  last: SessionEvent | undefined;
  version: number;
  report: FillReport;
};
let memo: Memo | null = null;

/**
 * `fillInsReport` for a session, kept while its log stands and the sources are
 * the same — the key `boardMathsOf` keeps the board's maths by (which events
 * array the session holds, how long it is, which event ends it). The board's
 * maths a source asks for is that same memo, so a paint reads it once.
 */
export function fillInsReportOfSession(session: Pick<Session, 'getState' | 'getEvents'>): FillReport {
  const events = session.getEvents();
  const last = events.length ? events[events.length - 1] : undefined;
  if (memo && memo.events === events && memo.length === events.length && memo.last === last && memo.version === version) {
    return memo.report;
  }
  const report = read(session.getState(), onceContext(() => boardMathsOf(session)));
  memo = { events, length: events.length, last, version, report };
  return report;
}

/** `fillInsOf` for a session, kept while its log stands. */
export function fillInsOfSession(session: Pick<Session, 'getState' | 'getEvents'>): FillIn[] {
  return fillInsReportOfSession(session).fillIns;
}
