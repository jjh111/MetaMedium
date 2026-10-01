// Notations — what a drawing is in a notation's own terms (V1-PLAN §2.3, §3, §9 D1).
//
// The diagram rung says what each mark PLAYS — container, node, edge, label,
// annotation, unclassified — and stops there, on purpose: six entries anyone
// can argue with. A notation reads on top of it, the way a concept does: a
// predicate over a scope's shapes, measures, relations and roles that says
// what the marks are in ITS terms — a flowchart's processes, decisions and
// flows; later a class diagram's classes, a sequence's lifelines. Four rules:
//
//   - **It adds no role.** A notation says which of the six roles each of its
//     symbols plays; registering one that names a seventh throws, and a
//     reading that names one is left out.
//   - **Plural and ranked.** Every registered notation reads the scope, and
//     every reading comes back with a confidence and a reason, the likeliest
//     first — a flowchart 0.84 beside a class diagram 0.31, never one of them
//     silencing the other. A notation that throws is left out, not allowed to
//     stop the others.
//   - **Derived.** A reading is computed from the board on demand; nothing it
//     reads enters the log, so it replays, undoes and merges for free.
//   - **Its ports reach the pen through E3's hook** (`session/ports.ts`) — but
//     only when a board puts the notation in use (`offerPorts`), because what
//     the pen feels on every board is not a notation's to change by being
//     known. A board puts it in use by using its pack (B3): while the board's
//     log says it uses a pack naming the notation, `followPacks`
//     (packs/follow.ts) offers its ports, and takes them back when it does not.
//
// Some things a notation must know are content, not code: its symbols' names,
// which role each plays, the Mermaid each is said as. They live in a typed
// table beside the notation (FLOWCHART_TABLE in flowchart.ts), their single
// home; the notation's pack (`flowchart@1`, packs/shipped/) names the notation
// and restates none of it. What stays code is what a signature cannot see — a
// diamond is a box turned 45°, and the shape rung is blind to rotation by
// design.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { NotationPort, NotationPorts } from '../session/ports';
import { knowPorts, registerPorts } from '../session/ports';
import type { HeadKind } from '../diagram/heads';
import { withBoardIndex } from '../diagram/heads';
import type { Role } from '../diagram/roles';
import { ROLES } from '../diagram/roles';
import { FLOWCHART } from './flowchart';
import { UML_CLASS } from './uml-class';
import { SEQUENCE } from './sequence';
import { STATE } from './state';
import { ER } from './er';
import { MINDMAP } from './mindmap';
import { GARMENT } from './garment';

/** A symbol a notation knows, and which of the six roles it plays. */
export interface NotationSymbolDef {
  name: string;
  role: Role;
  /** What it looks like, in a line: 'an upright rectangle'. */
  describes: string;
  /** Where it takes a connector, in words: 'its four vertices'. */
  ports: string;
}

/** A kind of connector a notation knows. */
export interface NotationConnectorDef {
  name: string;
  role: Role;
  describes: string;
}

/** One reading of a mark as one of a notation's symbols. */
export interface SymbolReading {
  symbol: string;
  role: Role;
  /** 0–1, below the shape rung's own ceiling. */
  confidence: number;
  reason: string;
}

/** A mark — or several strokes read as one — as a notation's symbol. */
export interface NotationSymbol {
  /**
   * What stands for it: the stroke; the word the letter rules gathered its
   * strokes into; or, for a figure of several loose strokes, the figure's own
   * id (`figure:a+b`, diagram/figures.ts).
   */
  id: string;
  /** Every stroke it is drawn with. */
  ids: string[];
  /** The likeliest reading — its symbol, role, confidence and reason. */
  symbol: string;
  role: Role;
  confidence: number;
  reason: string;
  /** Every reading of it the notation holds, the likeliest first; the first is the one above. */
  readings: SymbolReading[];
  /** Its outline, convex, in canvas units — where a connector's end is measured to. */
  outline: Point[];
  bounds: Bounds;
  /** Where it takes a connector — the same ports E3's hook gives the pen once the notation is offered. */
  ports: NotationPort[];
  /** The writing that labels it. */
  labels: string[];
  /** A word a hand put on the symbol's own ink (a `label`), when one did — its writing is in `labels`. */
  text?: string;
}

/** One end of a connector, read past any head. */
export interface NotationEnd {
  /** Which end of the stroke — the names a `bind` uses. */
  end: 'start' | 'end';
  /** Where the connector really ends: past its head, at the head's tip. */
  point: Point;
  /** The symbol it lands on. */
  symbol?: string;
  /** What sits at this end (diagram/heads.ts), when a head does. */
  head?: { kind: HeadKind; filled: boolean; ids: string[]; confidence: number };
  /** A magnet tied it there (`bind`). */
  bound?: boolean;
  reason: string;
}

/** A connector between two of a notation's symbols. */
export interface NotationConnector {
  /** The connector's own stroke. */
  id: string;
  /** It and any head drawn apart from it. */
  ids: string[];
  /** Its kind in the notation: 'flow'. */
  kind: string;
  role: Role;
  /** `forward`: from `from` to `to`, as its head says; `both`: heads at both ends; `none`: no head, `from` and `to` in the order it was drawn. */
  direction: 'forward' | 'both' | 'none';
  directed: boolean;
  /** Symbol ids. */
  from: string;
  to: string;
  ends: { from: NotationEnd; to: NotationEnd };
  confidence: number;
  reason: string;
  /** The writing beside it. */
  labels: string[];
  /** A word a hand put on the connector's own ink (a `label`), when one did. */
  text?: string;
}

/** Writing, and what it labels. */
export interface NotationLabel {
  id: string;
  /** The symbol or connector it labels; none when it labels nothing. */
  of?: string;
  where: 'inside' | 'beside' | 'alone';
  /** What it says, when somebody has read it. */
  text?: string;
  /** Where the writing stands, in canvas units — so several pieces are read in order. */
  bounds?: Bounds;
  role: Role;
  confidence: number;
  reason: string;
}

/** What a scope is in a notation's terms. */
export interface NotationReading {
  notation: string;
  name: string;
  /** 0–1. */
  confidence: number;
  /** What it saw, in a few words: 'three processes, one decision, five flows'. */
  summary: string;
  /** Why, in the terms it was measured in. */
  reason: string;
  symbols: NotationSymbol[];
  connectors: NotationConnector[];
  labels: NotationLabel[];
  /** What every mark in the scope plays under this notation — always one of the six. */
  roles: Record<string, Role>;
  /** Marks in the scope the notation placed nowhere, said out loud (their role is `unclassified`). */
  unplaced: string[];
  /** How many of each symbol, connector kind and label. */
  counts: Record<string, number>;
}

export interface Notation {
  id: string;
  name: string;
  describes: string;
  symbols: readonly NotationSymbolDef[];
  connectors: readonly NotationConnectorDef[];
  /** Read the marks in `scopeIds` — null when they are nothing this notation knows. */
  read(state: SessionState, scopeIds: readonly string[]): NotationReading | null;
  /** Its side of E3's hook (session/ports.ts), offered to the pen by `offerPorts`. */
  ports?: NotationPorts;
}

/** Below this a reading is held but not said as what the drawing IS: the surface says "reads as" only above it. */
export const NOTATION_FLOOR = 0.5;

const registry = new Map<string, Notation>();
const offered = new Map<string, () => void>();
/** The way to forget each registered notation's ports as known (session/ports.ts `knowPorts`). */
const knownPorts = new Map<string, () => void>();

function sixRoles(n: Notation): void {
  const bad = [...n.symbols, ...n.connectors].filter((d) => !ROLES.includes(d.role));
  if (bad.length) {
    throw new Error(
      `a notation says which of the six roles its symbols play and adds none — ${bad.map((d) => `${d.name} plays "${d.role}"`).join(', ')}, not one of ${ROLES.join(', ')}`
    );
  }
}

/**
 * Let a notation read. A second registration under the same id replaces the
 * first (and, if its ports are offered, offers the new ones). Throws when a
 * symbol names a role outside the six. Returns the way to take it back.
 */
export function registerNotation(n: Notation): () => void {
  sixRoles(n);
  registry.set(n.id, n);
  // Its ports are known to the engine from here on, offered on the pen or not:
  // a binding already made to one is found again wherever the mark stands
  // (V1-PLAN E2). Offering them to the pen is the page's (`offerPorts`).
  knownPorts.get(n.id)?.();
  knownPorts.delete(n.id);
  if (n.ports) knownPorts.set(n.id, knowPorts(n.ports));
  if (offered.has(n.id)) offerPorts(n.id);
  return () => {
    if (registry.get(n.id) === n) unregisterNotation(n.id);
  };
}

/** Stop a notation reading, and take back its ports if they were offered. False when it was not registered. */
export function unregisterNotation(id: string): boolean {
  offered.get(id)?.();
  knownPorts.get(id)?.();
  knownPorts.delete(id);
  return registry.delete(id);
}

/** The notations that read, in the order they registered. */
export function registeredNotations(): string[] {
  return [...registry.keys()];
}

export function notationById(id: string): Notation | undefined {
  return registry.get(id);
}

/**
 * Put a notation's ports in the pen's reach through E3's hook: the magnet
 * queries then offer them after each mark's own sites. Returns the way to
 * take them back; a notation nobody knows, or one with no ports, offers
 * nothing and the returned function does nothing.
 */
export function offerPorts(id: string): () => void {
  const n = registry.get(id);
  if (!n?.ports) return () => {};
  offered.get(id)?.();
  const off = registerPorts(n.ports);
  const take = () => {
    if (offered.get(id) !== take) return;
    offered.delete(id);
    off();
  };
  offered.set(id, take);
  return take;
}

/** The board's own marks: the content plane, without artifacts. */
function boardScope(state: SessionState): string[] {
  const artifacts = new Set(state.artifacts);
  return state.contentIds.filter((id) => !artifacts.has(id));
}

/**
 * What the marks are, in every notation's terms: each registered notation's
 * reading of the scope (the board's content plane when none is given),
 * plural and ranked, the likeliest first. A notation that reads nothing, or
 * throws, or names a role outside the six, is left out. Reads the session
 * and changes nothing in it.
 */
export function notationsOf(state: SessionState, scopeIds?: readonly string[]): NotationReading[] {
  const scope = scopeIds ? [...new Set(scopeIds)].filter((id) => state.nodes.has(id)) : boardScope(state);
  if (!scope.length) return [];
  const out: NotationReading[] = [];
  // The plane filed once for every notation's reading of the heads in the scope (V1-PLAN I2).
  withBoardIndex(state, () => {
    for (const n of registry.values()) {
      let r: NotationReading | null;
      try {
        r = n.read(state, scope);
      } catch {
        continue;
      }
      if (!r || !(r.confidence > 0) || r.confidence > 1) continue;
      if (Object.values(r.roles).some((role) => !ROLES.includes(role))) continue;
      out.push(r);
    }
  });
  return out.sort((a, b) => b.confidence - a.confidence);
}

/**
 * A reading in one line, for a status line, a panel or a brief: "a flowchart
 * 0.84 — three processes, one decision, five flows". A name that opens with
 * an acronym keeps it: "a UML class diagram 0.85 — two classes, one
 * inheritance".
 */
export function describeNotation(r: NotationReading): string {
  const acronym = /^[A-Z]{2,}\b/.test(r.name);
  const name = acronym ? r.name : r.name.toLowerCase();
  // An acronym takes the article of the way it is said: “an ER diagram”, “a UML class diagram”.
  const vowel = acronym ? /^[AEFHILMNORSX]/.test(name) : /^[aeio]/.test(name);
  return `${vowel ? 'an' : 'a'} ${name} ${r.confidence.toFixed(2)} — ${r.summary}`;
}

// The notations shipped with the engine read from the start. Reading is
// derived and harmless; their ports wait to be offered.
registerNotation(FLOWCHART);
registerNotation(UML_CLASS);
registerNotation(SEQUENCE);
registerNotation(STATE);
registerNotation(ER);
registerNotation(MINDMAP);
registerNotation(GARMENT);
