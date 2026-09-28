// A tool: one contract for what the canvas can do with a scope, with no model
// and no wait (V1-PLAN §1, §2.1; B1).
//
// Before this the field's affordances were built by hand in the surface — a
// list of pills in `09-palette.js`, beside the concepts' conversions and the
// tier-1 library's entries, three lists saying overlapping things. Now each
// thing the canvas can do is a TOOL: what it reads, what it offers, and what
// taking an offer writes. The field's affordance row is `offersFor(scope)`,
// ranked (`rank.ts`), and a new tool is one file and one registration line
// (`builtin.ts`).
//
// Three rules the contract keeps:
//
//   - **Readings are not offers.** What a scope IS — a name you gave it, the
//     words you wrote, what a model read it as, the concepts it reads as — is
//     a reading, and stays one: the field's top row. An offer is what the
//     marks AFFORD: an act, with a reason and a likelihood. A tool may read
//     (`reads`), but what it reads is never offered as an act.
//   - **The canvas decides, the host performs.** Offers are computed here, from
//     the board and what the host says only it knows (device preferences,
//     runtime state: `ToolHost`). Taking one writes events through the session
//     — stamped with the tool's id (`session.withTool`) — or names an act only
//     the host can perform (ask a model, open an editor, flip a text over),
//     which the host performs inside the same stamp.
//   - **No tier commits.** An offer that asks a model says so (`asks`) and is
//     never taken automatically; the field marks it with a dot.

import type { Session, SessionState, Summon } from '../session/session';

/** What `session.read` returns for a scope: relations, roles, the genre, concepts. */
export type ScopeReading = ReturnType<Session['read']>;

/**
 * The session as a tool may read it while offering: never written through.
 * `take` is handed the whole session; `offers` and `reads` only this.
 */
export type SessionReader = Pick<Session, 'getState' | 'read' | 'snapCandidates' | 'matchesOf' | 'isMine' | 'regions' | 'codeVersion' | 'getEvents'>;

/**
 * What only the host knows, handed to every tool: device preferences and
 * runtime state that is never in the log. A host that knows none of it
 * passes `defaultHost(session)`.
 */
export interface ToolHost {
  /** The device's snap preference; `off` offers nothing clean. */
  snap: 'offer' | 'auto' | 'off';
  /** The models joined here, by name; `sees` when one can read writing. */
  models: { name: string; sees: boolean }[];
  /** Whether a mark's writing has been read — a transcript held, or read with its line (runtime). */
  isRead(id: string): boolean;
  /** Whether a text made from writing is flipped over to show its ink (runtime). */
  isFlipped(id: string): boolean;
  /** How the host says a participant: `you` for this hand. */
  nameOf(participantId: string): string;
  /** The text made from writing that ink with these bounds sits on or beside, if any. */
  textNear(bounds: { minX: number; minY: number; maxX: number; maxY: number }): string | null;
}

/**
 * What a tool reads: the marks a summon holds, as the board has them, what
 * the engine reads of them, what is typed, and what only the host knows.
 * Gathered once per field (`toolScope`); a tool never gathers its own.
 */
export interface ToolScope {
  /** The session, to read: never written through while offering. */
  session: SessionReader;
  /** The board as it stood when the scope was gathered. */
  state: SessionState;
  /** The summon the field stands on: its marks, its suggestions, what it is over. */
  summon: Summon;
  /** The summon's marks on the content plane — its enclosed ids that are content. */
  marks: string[];
  /** What the engine reads of `summon.enclosedIds`. */
  reading: ScopeReading;
  /** What is typed in the field, trimmed; `''` when nothing is. */
  text: string;
  /**
   * The word the typed text offers to name or label with — the field's reader
   * decides it (`typedWord` in the surface's `09-field.js`) — or null.
   */
  word: string | null;
  host: ToolHost;
}

/**
 * Where the hand is working (V1-PLAN §2.2) — B2 fills this: which notations
 * and concepts are active near the hand, and what was just taken there, read
 * from the log. A lift, never a filter. Until B2, every scope is read with
 * `NO_CONTEXT`, and the order is exactly the field's order before tools.
 */
export interface Context {
  scopeIds: string[];
  notations: { id: string; weight: number; reason: string }[];
  concepts: { name: string; weight: number }[];
  recent: { tool: string; offer: string; at: number }[];
}

export const NO_CONTEXT: Context = Object.freeze({ scopeIds: [], notations: [], concepts: [], recent: [] }) as Context;

/**
 * What an offer stands on: the reading of these marks it is offered under,
 * how sure that reading is, and why. `on` is a concept's name, or `known`
 * (a definition you named, matched again), `written` (your handwriting),
 * `proposed` (a model's reading, or a behaviour acted out), `clean` (the
 * clean forms). An offer standing on something the hand named, wrote, or a
 * model read HERE is specific to these marks, and learned use never lifts
 * another above it (`rank.ts`). Typing `on` finds the offer.
 */
export interface Grounds {
  on: string;
  confidence: number;
  why: string;
}

/** One thing the marks afford, as the field shows it and the reader names it. */
export interface Offer {
  /**
   * Unique in a field: how the reader names it again, and the key its learned
   * use is counted under on a device. A tool keys its offers by a prefix of
   * its own, and a key, once shipped, is kept — a device's counts are by it.
   */
  key: string;
  /** What the pill says. */
  label: string;
  /** Why, in one line: the pill's tooltip, before its grounds. */
  reason: string;
  /** How likely the hand is to want it, before use and context lift it (`rank.ts`). */
  base: number;
  /** The tool that offers it, and takes it. */
  tool: string;
  /** Whom taking it asks: nobody (the canvas does it), a seat, or a model. A model's is marked, and never taken automatically. */
  asks?: 'seat' | 'model';
  /** The reading it stands on, said after its reason. */
  grounds?: Grounds;
  /** Words that type to it besides its label ('line up', 'dup'). */
  verbs?: string[];
  /** Typed, never a slot: reached by a word, never shown in the row. */
  hidden?: boolean;
  /**
   * Stands with the readings in the top row: an act as particular to these
   * marks as a reading is — *Fold “…” into the text*. It is still an offer.
   */
  lead?: boolean;
  /**
   * Where an offer that completes what is TYPED stands, instead of by rank:
   * `first` before everything the field shows, `head` at the head of what it
   * affords, `last` after it. Unset for every offer the marks afford untyped.
   */
  place?: 'first' | 'head' | 'last';
  /** The word it takes as a name, or puts on the ink, where it takes one. */
  name?: string;
  /** What the line under the field says while this pill is pointed at: for one whose act must be told from its twin's (Name it, Label it). */
  line?: string;
  /** What taking it needs, opaque to everyone but its tool. */
  data?: unknown;
}

/** A reading a tool offers of a scope: derived, plural, each with a confidence and a reason. */
export interface ToolReading {
  label: string;
  confidence: number;
  reason: string;
}

/**
 * What taking an offer did, and what is left for the host. `host` names an
 * act only the host can perform with the offer's data — ask a model, open an
 * editor, flip a text, hold a clip — which it performs inside the same stamp,
 * so whatever that act writes carries the tool's id too.
 */
export interface Taken {
  /** The act the host performs, by name; absent when the tool did it all. */
  host?: string;
  /** What the tool made, where it made one: an artifact, a frame. */
  made?: string | null;
  /** Anything else the host needs to say what happened. */
  detail?: unknown;
}

export interface Tool {
  /** 'tidy', 'clean', 'graph3d' …: unique in the registry, and stamped on every event taking it writes. */
  id: string;
  /** For people. */
  name: string;
  /** One line: what it does, for `HERE`, the models pane and a brief. */
  describe(): string;
  /** Whom its acts ask, when every one asks the same: a model's tools are said apart in `HERE`. */
  asks?: 'seat' | 'model';
  /** What it reads of a scope, if it reads anything worth saying. */
  reads?(scope: ToolScope): ToolReading[];
  /** What it affords here, each with a base likelihood and a reason. Pure: it writes nothing. */
  offers(scope: ToolScope, ctx: Context): Offer[];
  /**
   * What the TYPED text completes to here — `scope.text` and `scope.word` —
   * each with a `place` in the field rather than a rank: *Name it “inlet”*,
   * *Label it “inlet”*, words a definition can be told. Asked on every
   * keystroke, so it reads only what the typing changes. Pure.
   */
  completes?(scope: ToolScope, ctx: Context): Offer[];
  /**
   * Take one of its offers: write events through `session` (the registry's
   * `takeOffer` stamps them with this tool's id), or name the act the host
   * performs. Undoable, as every event is.
   */
  take(offer: Offer, scope: ToolScope, session: Session, at: number): Taken | void;
}
