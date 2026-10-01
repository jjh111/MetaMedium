// The session engine: a headless, renderer-agnostic state machine implementing
// the no-modes flow (ARCHITECTURE-v6-SESSION-ENGINE.md §5).
//
// Invariants enforced here:
//   - Input is never refused; there is no mode in which addStroke fails.
//   - Interpretations are held (multi-parse), never auto-committed.
//   - A lasso-shaped stroke is simultaneously content and gesture-candidate;
//     the NEXT event resolves it (deferred commitment with retroactivity).
//   - A check summons; it does not confirm. Blessing is a separate act.
//   - Drawing past an active summon dissolves it (ignoring is a valid answer).
//   - Gestures are per hand: a loop that waits, a summon, a selection, the
//     look-back and a taught mark are each hand's own, so another hand's
//     events never dissolve, take up or open them (V1-PLAN L2h).
//   - Ink is never destroyed: gesture/member/erased strokes keep their nodes.
//   - The engine is event-sourced: every input is logged, state is a pure
//     function of the log, and undo = drop this hand's last act and replay —
//     its own, found by authorship, never another hand's (V1-PLAN L2j).

import type { Bounds, Point } from '../types';
import type { Fingerprint, StrokeAnalysis } from '../types';
import {
  getFingerprint,
  getBounds,
  distancePointToBounds,
  boundsOverlap,
  boundingBoxDistance,
  boundsContain,
} from '../geometry';
import { HAND_RESOLUTION_PX, analyzeStroke } from '../recognition';
import {
  type MMNode,
  type Edge,
  type Rep,
  type ParticipantKind,
  type Capability,
  createBootstrapNodes,
  createParticipantNode,
  createExplanationNode,
  typeNodeId,
  fingerprintOf,
  getRep,
  wordOf,
  topInterpretation,
  boundsOf,
  strokePointsOf,
  resemblances,
  transcriptOf,
  isWord,
  lettersOf,
  authorOf,
  isPackDefinition,
  standingPointsOf,
  standsClosed,
  followMapOf,
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
  type Locality,
} from './nodes';
import {
  type GestureConfig,
  strokesIntersect,
  DEFAULT_GESTURE_CONFIG,
  isLassoLike,
  enclosedBy,
  resolvesLasso,
} from './gesture';
import { type CommandMark } from './commandmark';
import { type MarkMiss, whyNotResolved } from './gesture';
import { type Expectation, type StaleResult, describeStale } from './stale';
import { handLabel } from './hands';
import { DEFAULT_ERASE_CROSSINGS, type Meeting, distanceToPath, headOf, scratchedOut } from './erase';
import { bindingsOf, magnetRadius, ownSitesOf } from './magnets';
import { connectorEndsOf, headApartAt } from '../diagram/heads';
import { figuresAmong } from '../diagram/figures';
import { type Region, regionsOf, regionsOverlapping } from './regions';
import { type Mark, type Relation, ENGAGING_KINDS, clusters, reachAround, relate, withinReach } from '../relate/relations';
import { MarkGrid } from '../relate/grid';
import { type ConceptMatch, type ConceptScope, matchConcepts } from '../concepts/concept';
import { type GenreReading, type RoleReading, type Wire, assignRoles, genreOf } from '../diagram/roles';
import { BUILTIN_COMMAND_MARK, matchesCommandMark } from './commandmark';
import { type SnapReading, idealize, snapReading, cleanOf } from './clean';
import { reshapePreview, reshapedClean } from './handles';
import { connectorEnds, followed, followThrough, releasedBy, reshapeDecision } from './follow';
import { deriveRoute, routable, routeAffectedBy, routeRepOf } from '../diagram/route';
import { type Manipulation, manipulableOf, manipulatedReps, markFrameOf } from './manipulate';

/** A move, scale or turn event as the manipulation it writes. */
function manipulationOf(ev: Extract<SessionEvent, { type: 'move' | 'scale' | 'rotate' }>): Manipulation {
  if (ev.type === 'move') return { type: 'move', dx: ev.dx, dy: ev.dy };
  if (ev.type === 'scale') return { type: 'scale', about: ev.about, sx: ev.sx, sy: ev.sy };
  return { type: 'rotate', about: ev.about, radians: ev.radians };
}
import { FIGURE_MEET_SHARE, LETTER_TINY_PX, WORD_WINDOW_MS, endsPairUp, isLetterLike, joinsRun, longAgainst, wordConfidence, xHeightOf } from './words';
import { type StructuralSignature, type Examples, structuralSignature, matchDefinition, addExample, MATCH_FLOOR, mayMatchBySize, shapeCount } from './signature';
import type { Kind } from '../kinds/kinds';
import { isPictureKind, isAssetRef } from '../kinds/picture';
import type { Behaviour } from '../behave/verbs';
import type { Connection } from '../frames/frame';
import type { Pack, PackNotice } from '../packs/pack';
import { describePackNotice, describePackRefusal, libraryId, packOfId, packRef, parsePackRef } from '../packs/pack';
import { type PackSource, shippedPack } from '../packs/registry';
import { type LibraryDefinition, libraryDefinitions } from '../packs/definitions';

// ===== Public state shape =====

export interface Suggestion {
  id: string;
  kind: 'match' | 'name-as-new' | 'keep-as-drawing' | 'prompt';
  label: string;
  artifactId?: string; // for 'match'
  score?: number;
  /** Why it matched, in the terms the signature was measured in. */
  reasoning?: string;
  /** For a match against a library pack's definition: the pack (`basics@1`) — the definition is the pack's, not a thing on this board (B3). */
  pack?: string;
}

/** How the command mark decided what it was about. */
export type ScopeSource =
  /** You circled it first — an explicit selection. */
  | 'lasso'
  /** The mark crossed it. */
  | 'crossed'
  /** It came along with something the mark crossed, because you had just drawn them together. */
  | 'recent'
  /** You pointed at it — a tap on the chip beside a matching group, a card, a button. */
  | 'pointed';

export interface Summon {
  id: string;
  enclosedIds: string[];
  /** Where the scope came from, and why — shown, so a wrong guess is visible. */
  scopeSource: ScopeSource;
  scopeReasoning: string;
  suggestions: Suggestion[];
  gestureIds: string[]; // lasso + check (provenance)
  at: number;
  /**
   * Set when the lasso was drawn ON a live artifact. Ink over a running
   * artifact addresses the regions beneath it, so this is how "circle a bit of
   * the generated page and prompt again" reaches the right code (MVP.md §5.4).
   */
  onArtifact?: { artifactId: string; regionIds: string[] };
}

export interface Clock {
  playing: boolean;
  seed: number;
  /** When the last clock event landed. */
  at: number;
  /** Why it stopped, when it was stopped by something other than a hand — a throw, a budget. */
  reason?: string;
}

export interface ClusterCandidate {
  nodeIds: string[];
  /**
   * Every definition above the floor, best first — plural, like every
   * reading; on a tie, this board's own before a library pack's. `pack` says
   * when the definition is a pack's (`basics@1`): the id is then the pack's
   * definition, never an artifact on the board (B3).
   */
  matches: { artifactId: string; name: string; score: number; reasoning?: string; pack?: string }[];
}

/**
 * The gesture state of the board's own hand — its reader. `pendingLassoId`,
 * `summon`, `selection`, `markMiss`, `commandMark` and `recentIds` below are
 * all this hand's; every other hand in a room holds its own, which the board
 * keeps and replays but never shows as the reader's (V1-PLAN L2h).
 */
export interface SessionState {
  /** Live view of the node graph (not a snapshot) — read, don't mutate. */
  nodes: ReadonlyMap<string, MMNode>;
  /** Nodes on the content plane (strokes not yet in artifacts, plus artifacts). */
  contentIds: string[];
  /** This hand's stroke currently held as gesture-candidate (also still content). */
  pendingLassoId: string | null;
  /** This hand's summon: the field opens on it. Another hand's never does. */
  summon: Summon | null;
  clusterCandidates: ClusterCandidate[];
  artifacts: string[];
  /** Participant node ids (humans, agents, and the engine's own recognizers). */
  participants: string[];
  /**
   * Answers placed in the canvas. A third plane beside content and gesture:
   * an explanation is visible and erasable but is not ink, so it never joins a
   * lasso, a cluster, or a signature.
   */
  explanations: string[];
  /**
   * The mark this hand taught, or null while the built-in check stands. Each
   * hand's own: a mark another hand taught judges only that hand's strokes.
   */
  commandMark: CommandMark | null;
  /**
   * Why this hand's last stroke drawn against its waiting lasso did not
   * summon. Cleared by its next stroke. A gesture that fails silently cannot
   * be learned.
   */
  markMiss: MarkMiss | null;
  /**
   * The last deferred result refused because the board had moved on — the
   * target erased, the board replaced, the version superseded. Nonfatal and
   * transient, like `markMiss`: cleared by the next event. A model answering
   * late must not stop the board, and must not vanish without a reason
   * (STATE-1; see `stale.ts`).
   */
  staleResult: StaleResult | null;
  /**
   * How many times the whole board has been replaced (a `load`, including
   * `load([])` to reset). A deferred caller pins its request to the generation
   * it was made in, so a result computed against a board that has since been
   * thrown away is refused rather than landing on whatever now holds that id.
   */
  generation: number;
  /** Artifacts carrying a 'code' rep — the ones that render and run. */
  live: string[];
  /**
   * Per-artifact clocks (v8). Nothing runs unblessed: an artifact's code
   * runs only while its clock is `playing`, and `play` is the human's bless.
   * Time itself is runtime state the surface derives; what the log holds is
   * whether it runs, its seed, and why it last stopped.
   */
  clocks: Record<string, Clock>;
  /**
   * The marks this hand's held loop became once it was taken up (by the mark
   * or the chip), or that it selected outright. Transient: the hand's next
   * content stroke clears it; undoing a `deselect` brings it back in place. It
   * is state the human just made and can see — the one place a stroke's
   * meaning may depend on state (a tap dismisses it and is never a dot).
   */
  selection: string[];
  /**
   * Content this hand drew inside the recent window, oldest first — "what you
   * were just doing". The command mark reads back over this, and over nobody
   * else's: another hand drawing beside you just now is not you.
   */
  recentIds: string[];
  /**
   * The library packs this board uses, by `id@version`, in the order its
   * `use` events named them (V1-PLAN §2.3, B3). A pack's definitions are
   * matched on this board only because its log says it uses them: `use` and
   * `unuse` are events, so a board replays with the same library everywhere.
   */
  packs: string[];
  /**
   * Packs this board says it uses that this build cannot give it — a name it
   * does not ship, or no pack's name at all — each with its sentence. Standing
   * while the log says so (an `unuse` clears one), never thrown: the board
   * loads without them and the surface says it (B3).
   */
  packNotices: PackNotice[];
}

/**
 * One hand's gestures (V1-PLAN L2h). A merged log interleaves the hands'
 * events by time, so state shared by the board let another hand's stroke
 * dissolve a summon on replay — and the bless after it made nothing, on every
 * board — or leave a loop untaken between it and its check. Each hand holds
 * its own, under the key its acts carry (`handOf`).
 */
interface Gestures {
  /** This hand's stroke held as a gesture-candidate: a loop waiting for this hand's mark. */
  pendingLasso: { id: string; at: number } | null;
  summon: Summon | null;
  selection: string[];
  markMiss: MarkMiss | null;
  /** The mark this hand taught, or null for the built-in check. */
  commandMark: CommandMark | null;
}

// Every event is attributed: participantId defaults to the local human.
// Humans and AI agents contribute through the SAME events — there is no
// separate "AI input" channel (one class of citizen).
type SessionEventUnion =
  | {
      type: 'stroke';
      points: Point[];
      at: number;
      participantId?: string;
      /**
       * World units per screen pixel when this stroke was drawn (1/zoom).
       * Fixed-pixel thresholds are about the HAND, so they are interpreted in
       * the space the hand worked in — see getFingerprint. Logged with the
       * stroke so replay is deterministic across later zoom changes.
       */
      scale?: number;
      /**
       * Declared content: this stroke is never read as a gesture. A model that
       * says "I would draw a rectangle here" is drawing, not selecting,
       * commanding or erasing — those are commitments, and no tier commits.
       * Any participant may declare it; `agent.draw()` always does.
       */
      content?: boolean;
    }
  | {
      /**
       * Resolve the held lasso as a selection WITHOUT the command mark — a
       * button beside the loop, a tap, a key. The mark is the fluent way; this
       * is the discoverable one, and it reaches exactly the same summon.
       */
      type: 'summon';
      at: number;
      participantId?: string;
      /**
       * Summon THESE marks rather than the held lasso: a tap on the chip
       * beside a group the engine matched. Ids not in the content plane are
       * ignored; nothing is summoned when none remain.
       */
      ids?: string[];
    }
  | {
      /** Split a held word back into its letters — the grouping was inferred, and this is the human saying no. */
      type: 'split';
      nodeId: string;
      at: number;
    }
  | { type: 'select'; ids: string[]; at: number }
  | { type: 'deselect'; at: number }
  /** Direct manipulation of a selection: written as transform reps, so the ink is untouched and undo springs back. */
  | { type: 'move'; ids: string[]; dx: number; dy: number; at: number }
  | { type: 'scale'; ids: string[]; about: Point; sx: number; sy: number; at: number }
  | { type: 'rotate'; ids: string[]; about: Point; radians: number; at: number }
  | { type: 'tick'; at: number }
  | { type: 'bless'; summonId: string; name?: string; suggestionId?: string; at: number; participantId?: string }
  | { type: 'dismiss'; summonId: string; at: number; participantId?: string }
  | { type: 'erase'; nodeId: string; at: number; participantId?: string }
  | { type: 'join'; kind: ParticipantKind; name: string; at: number; capability?: Capability; locality?: Locality }
  | { type: 'propose'; participantId: string; nodeId: string; edges: ProposedEdge[]; reps?: ProposedRep[]; at: number }
  /**
   * A word a hand puts on its OWN ink (the notes, §B). Not a bless — the
   * engine's readings stay beside it — and not an artifact, so it never
   * becomes a file in the folder view. Refused when the mark was made by
   * another hand: `not-your-ink`. An empty text takes the label off again.
   */
  | { type: 'label'; nodeId: string; text: string; participantId?: string; at: number }
  | { type: 'teach'; mark: CommandMark | null; at: number }
  /**
   * The board uses a library pack (V1-PLAN §2.3, B3): its definitions are
   * matched here from this event on, attributed to the pack; its notation's
   * ports may reach the pen and its affinities lift what stands beside the
   * hand. `pack` is `id@version`. A board-wide fact: whichever hand said it,
   * every hand's board uses it once the logs are merged.
   */
  | { type: 'use'; pack: string; at: number; participantId?: string }
  /** The board stops using a pack: its definitions leave the matching (what corrections taught them is kept for a later use). */
  | { type: 'unuse'; pack: string; at: number; participantId?: string }
  /**
   * A behaviour for a definition, held as a rep. From a human it is blessed
   * by the act; from a model or the engine's own fit it is held, attributed,
   * and drives nothing until a human gives it again in their own name.
   */
  | { type: 'behave'; nodeId: string; behaviour: Behaviour; participantId?: string; at: number }
  /**
   * A frame: artifacts wired together by reference (ARCHITECTURE-v8 §15).
   * The members stay where they are; the frame is a new artifact holding
   * their ids and the connections between their ports.
   */
  | { type: 'frame'; ids: string[]; name: string; connections: Connection[]; at: number; participantId?: string }
  /**
   * A file of a known kind, or a traced picture, brought onto the canvas
   * (ARCHITECTURE-v8 §11, §17). With `code` it is an artifact of that kind
   * at `bounds`, its path kept so a folder can write it back; with `strokes`
   * it is ink, drawn as declared content attributed to the importer. **A picture**
   * (PLAN-IPAD-NOTES I1) names the asset its bytes are kept under — `asset`, a
   * `sha256:` reference, with its `mime` and its size in pixels, `w` × `h` — and
   * never carries them; an event with no asset is a log from before, drawn as its name.
   */
  | { type: 'import'; kind: Kind; path: string; name?: string; bounds: Bounds; code?: string; strokes?: Point[][]; asset?: string; mime?: string; w?: number; h?: number; at: number; participantId?: string }
  /** An artifact's clock: play (the bless to run), pause, reset, or reseed. */
  | { type: 'clock'; nodeId: string; op: 'play' | 'pause' | 'reset' | 'seed'; seed?: number; reason?: string; at: number; participantId?: string }
  /**
   * The human correcting a match: this group IS (or is NOT) that definition.
   * The group's structural signature joins the definition's accepted or
   * rejected examples, so the next group like it is matched — or not — and
   * the correction holds. What the definition is called is never consulted.
   */
  | { type: 'correct'; ids: string[]; definitionId: string; verdict: 'is' | 'is-not'; at: number; participantId?: string }
  | {
      type: 'tidy';
      ids: string[];
      /** 'align' spaces them evenly along an axis; 'equalize' matches their sizes. */
      mode: 'align' | 'equalize';
      axis?: 'row' | 'column';
      at: number;
    }
  | {
      /**
       * Redraw confident marks as their clean form — or drop that form again.
       * The ink stays; a `'clean'` rep is added beside it (clean.ts).
       */
      type: 'snap';
      ids: string[];
      mode?: 'clean' | 'raw';
      at: number;
      participantId?: string;
    }
  | {
      /**
       * Bind a stroke's endpoint to a magnet site on another mark
       * (CONTROL-POINTS-PLAN P1): the arrow ends AT the box, and the graph
       * says so — an edge `bound-to`, with the site kept as a `'bound'` rep
       * so a later package can re-anchor the point when the target moves.
       */
      type: 'bind';
      strokeId: string;
      nodeId: string;
      site: { kind: string; index: number };
      end: 'start' | 'end';
      at: number;
      participantId?: string;
    }
  | {
      /**
       * Let go of one end's binding (V1-PLAN E2): the claim for that end is
       * withdrawn — its `bound-to` edge and its `'bound'` rep, keyed by the
       * end as BIND-1 keys removal — and the connector stays where it stands.
       * What a hand's act writes when it drags a bound end off its site, or
       * moves a connector whole off the sites it sat on, in the same act.
       */
      type: 'unbind';
      strokeId: string;
      end: 'start' | 'end';
      at: number;
      participantId?: string;
    }
  | {
      /**
       * Route connectors (V1-PLAN D7; diagram/route.ts): each connector named
       * that has both ends tied is marked as routed — a `'route'` rep whose
       * polyline is DERIVED from the sites its ends are bound to, wherever
       * they stand, and from the marks in its way, so no coordinate is ever
       * in the log. `'raw'` takes the routing off again (`snap`'s own
       * counterpart): the ink was never touched, and stands in front once more.
       */
      type: 'route';
      ids: string[];
      mode?: 'route' | 'raw';
      at: number;
      participantId?: string;
    }
  | {
      /**
       * A handle dragged (V1-PLAN E1, CONTROL-POINTS-PLAN P2): one of the
       * mark's own points, `handle` — `{ kind, index }` as `handlesOf` names
       * it — let go at `to`, in the mark's OWN space (the space its ink was
       * drawn in, before any move, scale or turn placed it). Its clean form
       * is reshaped; the ink never is. A mark not yet snapped is snapped by
       * the same act.
       */
      type: 'reshape';
      id: string;
      handle: { kind: string; index: number };
      to: Point;
      at: number;
      participantId?: string;
    }
  | {
      type: 'code';
      participantId: string;
      nodeId: string;
      code: string;
      language?: string;
      /** Which kind of artifact this code makes (the closed table). Default: html. */
      kind?: Kind;
      /** The library entry this code was taken from, when it was reused rather than written. */
      from?: string;
      prompt?: string;
      /**
       * The per-region content the code was built from. Kept so a revision can
       * start from what is already there instead of re-deriving it from markup:
       * the page is generated, but the CONTENT is the thing being edited.
       */
      fill?: unknown;
      at: number;
    }
  | {
      type: 'answer';
      participantId: string;
      question: string;
      text: string;
      aboutIds: string[];
      at: number;
    };

/**
 * Every event, and where it came from. `by` is the name of the log another
 * participant's event was merged from (store/merge.ts): the session
 * attributes such an event to a participant of that name, made on first
 * sight, so another hand's ink is another hand's. Events from this
 * participant's own log carry no `by`.
 *
 * `origin` and `seq` are the event's AUTHORSHIP: the name of the log that
 * wrote it, and this event's own number in that log. They are stamped once,
 * by the writing session, at the moment the event is made, and never
 * rewritten by anyone who reads it — an input recorded in the log, the way
 * `at` is, not derived state. Every node id the event mints is derived from
 * them (ids per hand, SURFACE-v10-PLAN D8), which is what makes an id the
 * same in every replay on every machine however the logs were merged.
 * `by` cannot do that job: it is the name the READER's merge gave the log it
 * found the event in, and it is absent on the reader's own events.
 *
 * An event carrying neither was written before this rule, or by a session
 * that was never told what its log is called; it keeps the numbering it
 * always had (see `nextId`).
 *
 * `tool` is the tool whose offer wrote the event, when one did (V1-PLAN B1,
 * `tools/`), and `offer` that offer's key: stamped by the writing session
 * while `withTool` holds, so the log says which tool did what and context
 * (B2) can read what was just taken where. Like `by`, they are provenance,
 * never state: replay ignores them.
 *
 * `act` says which ACT of its log the event belongs to, when it is one of
 * several written at once (V1-PLAN L2j): every event a tool writes inside one
 * outermost `withTool` carries the same number, so undo takes them back in one
 * step. The number is its log's to compare, never another's — one past the
 * highest this sitting has seen, so no two acts of one log share it. An event
 * with none is an act of its own. Provenance too: replay ignores it.
 */
export type SessionEvent = SessionEventUnion & { by?: string; origin?: string; seq?: number; tool?: string; offer?: string; act?: number };

/**
 * An attributed, inferred REP offered by a participant — what a model read
 * where the reading is not a type but a value: the text of some handwriting.
 * Held on the node with its source, ranked by confidence, never blessed by the
 * act of proposing, exactly like an edge.
 */
export interface ProposedRep {
  modality: string;
  data: unknown;
  confidence?: number;
  reasoning?: string;
}

/** An attributed, inferred edge offered by a participant (e.g. an LLM tier). */
export interface ProposedEdge {
  to: string;
  rel: string;
  weight?: number;
  /** Why this participant makes this claim — surfaced by "why?" in any surface. */
  reasoning?: string;
}

export interface SessionConfig {
  gesture: GestureConfig;
  /**
   * How close a connector's end must land to a mark to be read as joining it,
   * as a fraction of that mark's own size. A hand floor of a few screen pixels
   * is applied underneath, because a pen can miss a small target by more than
   * 15% of it and still plainly mean it.
   */
  wireEndpointRatio: number;
  /** Crossings before a stroke is read as scratching a mark out. See erase.ts. */
  eraseCrossings: number;
  /**
   * How far back "what you were just doing" reaches, in ms.
   *
   * The command mark understands RETROACTIVELY: it looks at the marks you made
   * in this window and decides which of them you meant. Without it the mark can
   * only act on something you explicitly circled first, which is a mode wearing
   * a different hat.
   */
  recentWindowMs: number;
  /**
   * What the log THIS session writes is called — one log per hand, per
   * sitting (`john~a1b2` for one page load of a tab, `claude~k3j9` for one
   * process; `sittingName` in `hands.ts`), or one stable name for a folder,
   * whose whole history is loaded before anything is minted. A log name is
   * reused only when its whole history was loaded first. It is stamped on every event
   * this session authors, and the ids those events mint are derived from it,
   * so a host that shares a room must pass the same name it writes its log
   * file under (`mergeLogs`' `me`). It never numbers anything at replay time:
   * an event carries the name it was written under, so opening a board in a
   * new tab — a new name, every time — renumbers nothing. It is read at replay
   * for one thing only: which person this board's own hand is, so a sitting
   * may label what the same person drew in another (V1-PLAN L2i) — the name
   * every other board reads off this log when it merges it.
   *
   * **Left unset, ids are minted the old way**, off a counter over the replay.
   * That is not a hedge, it is the honest answer: a writer with no name cannot
   * be named, and the one thing that could stand in for its name — the log
   * file its events were found in — is the reader's fact, not the writer's, so
   * it would change with the reader and be no better than the counter. Saying
   * the name is therefore the switch, and a host that shares a room must
   * throw it.
   */
  logName?: string;
  /**
   * How many events apart the reducer's state is snapshotted, so an undo or a
   * room's merge that cuts back replays from the nearest snapshot rather than
   * from zero. 200 when unset. No reading depends on it — state is a pure
   * function of the log however often it is snapshotted — which is what the
   * room's oracle checks by setting it small.
   */
  checkpointEvery?: number;
  /**
   * Where the packs a board uses come from: a pack's name to its content
   * (`packs/registry.ts`). The packs this build ships when unset — which is
   * every surface; a bench hands in the pack it measures. Content under one
   * name never changes, so the same log replays to the same board with any
   * source that has the packs it names.
   */
  packs?: PackSource;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  wireEndpointRatio: 0.15,
  eraseCrossings: DEFAULT_ERASE_CROSSINGS,
  recentWindowMs: 20_000,
};


export interface Session {
  addStroke(points: Point[], at: number, participantId?: string, scale?: number, options?: { content?: boolean }): string;
  /** Register a participant (human or AI agent). Returns its node id. */
  join(kind: ParticipantKind, name: string, at: number, capability?: Capability, locality?: Locality): string;
  /**
   * Offer attributed, inferred edges on a node — the channel LLM tiers use.
   * Refused, with a reason on `state.staleResult`, when the node is gone or
   * `expect` says the board has moved on since the request (STATE-1).
   */
  propose(args: { participantId: string; nodeId: string; edges: ProposedEdge[]; reps?: ProposedRep[]; at: number; expect?: Expectation }): void;
  /**
   * Place an answer in the canvas, anchored to the marks it is about.
   *
   * Returns the explanation node's id. Several participants may answer the
   * same question — every answer is held, none replaces another. Refused when
   * every mark it was about has been erased.
   */
  answer(args: {
    participantId: string;
    question: string;
    text: string;
    aboutIds: string[];
    at: number;
    expect?: Expectation;
  }): string | null;
  /**
   * Put a word on a mark this participant made — labelling your own ink, which
   * any hand may do (the notes, §B).
   *
   * Returns the mark's id, or null with the reason on `state.staleResult`: the
   * mark is gone, or it was made by another hand (`not-your-ink`). A label is
   * NOT a bless — it is one named reading held beside the engine's own, and it
   * is a rep on the mark rather than an artifact, so it never becomes a file.
   * An empty `text` takes this hand's label off again.
   */
  label(args: { nodeId: string; text: string; participantId?: string; at: number }): string | null;
  /**
   * Whether a mark is the participant's own ink — `participantId` defaults to
   * this board's own hand. The question the label rule asks, at the door and on
   * replay, and the one the field asks before Enter: the hand that made it, or
   * another sitting of the same person, since a reload must not make someone a
   * stranger to their own ink (V1-PLAN L2i). Whose it IS is unchanged —
   * `authorOf` still names the sitting that made it. Pure; no event.
   */
  isMine(nodeId: string, participantId?: string): boolean;
  /**
   * Install (or clear) the mark that resolves a lasso. An event, not a setting:
   * teaching is part of the session's history and replays with it.
   */
  teachCommandMark(mark: CommandMark | null, at: number): void;
  /** Bring a file, or a traced picture, onto the canvas. Returns the artifact's id, or the first stroke's. */
  import(args: { kind: Kind; path: string; name?: string; bounds: Bounds; code?: string; strokes?: Point[][]; asset?: string; mime?: string; w?: number; h?: number; at: number; participantId?: string }): string | null;
  /** Wire artifacts into a frame, by reference. Returns the frame's id. */
  frame(args: { ids: string[]; name: string; connections: Connection[]; at: number; participantId?: string }): string | null;
  /** Give a definition a behaviour. A human's is blessed by the act; a model's or the fit's is held until a human gives it. */
  behave(args: { nodeId: string; behaviour: Behaviour; participantId?: string; at: number }): void;
  /** Play, pause, reset or reseed an artifact's clock. Play is the bless that lets its code run (I9). */
  clock(args: { nodeId: string; op: 'play' | 'pause' | 'reset' | 'seed'; seed?: number; reason?: string; at: number; participantId?: string }): void;
  /** Say that a group is, or is not, a definition; the correction is remembered on the definition. */
  correct(args: { ids: string[]; definitionId: string; verdict: 'is' | 'is-not'; at: number; participantId?: string }): void;
  /**
   * Which definitions a group matches now, best first, with reasoning — this
   * board's own and those of the library packs it uses, a pack's marked with
   * `pack`, and on a tie this board's own first. Pure; no event.
   */
  matchesOf(ids: string[]): { artifactId: string; name: string; score: number; reasoning: string; pack?: string }[];
  /**
   * Use a library pack on this board, by `id@version` (V1-PLAN §2.3, B3): one
   * `use` event, and the pack's definitions are matched from it on. Returns
   * null when the board uses the pack now — already, or from this call — or
   * the notice saying why it cannot: no pack's name, or one this build does
   * not ship. A refusal writes nothing into the log.
   */
  use(pack: string, at: number, participantId?: string): PackNotice | null;
  /** Stop using a pack — one it uses, or one it names that this build lacks: one `unuse` event. Nothing, when the board does not name it. */
  unuse(pack: string, at: number, participantId?: string): void;
  /**
   * Attach generated code to an artifact — the 'code' rep that makes it live.
   * Several participants may each attach code to the same artifact; every
   * attempt is held and attributed, and the surface renders the chosen one.
   *
   * Returns null, and leaves a reason on `state.staleResult`, when the target
   * is gone or `expect` says the board has moved on since the request went
   * out. A refused attachment never enters the log (STATE-1).
   */
  attachCode(args: {
    participantId: string;
    nodeId: string;
    code: string;
    language?: string;
    kind?: Kind;
    prompt?: string;
    fill?: unknown;
    from?: string;
    at: number;
    expect?: Expectation;
  }): string | null;
  /**
   * How many versions of code the node carries. A deferred revision pins the
   * version it was written from, so a newer one standing refuses it.
   */
  codeVersion(nodeId: string): number;
  /**
   * Straighten a set of marks — a Tier 0 conversion, needing no model at all.
   * The originals are untouched; each mark gains a transform saying where it
   * now sits, so undo springs them back exactly.
   */
  tidy(args: { ids: string[]; mode: 'align' | 'equalize'; axis?: 'row' | 'column'; at: number }): void;
  /**
   * Redraw marks as the clean form of what they confidently read as
   * (`mode: 'clean'`, the default), or put the ink back in front (`'raw'`).
   * Only marks `snapCandidates` would offer are changed; the rest are left as
   * they are and the call says nothing, because a snap is an offer taken up,
   * not a command that can fail.
   */
  snap(args: { ids: string[]; mode?: 'clean' | 'raw'; at: number }): void;
  /**
   * Tie a stroke's endpoint to a magnet site on another mark (CONTROL-POINTS-PLAN
   * P1). From then on the end follows the site wherever the mark stands
   * (V1-PLAN E2) — derived at replay, never logged: the bind carries the end
   * onto the site at once.
   */
  bind(args: { strokeId: string; nodeId: string; site: { kind: string; index: number }; end: 'start' | 'end'; at: number; participantId?: string }): void;
  /**
   * Let go of one end's binding (V1-PLAN E2): one `unbind` event, and the
   * connector stays where it stands. Nothing is written when that end is
   * bound to nothing.
   */
  unbind(args: { strokeId: string; end: 'start' | 'end'; at: number; participantId?: string }): void;
  /**
   * Route connectors (V1-PLAN D7): draw each connector named — one with both
   * ends tied — at right angles between the sites it is tied to, its ink kept
   * faint beneath (`mode: 'route'`, the default); or take the routing off
   * again (`'raw'`). One `route` event, and its route derived on every replay
   * from where the sites stand, so a box moved carries it. Returns how many
   * connectors it changed; nothing is written when that is none.
   */
  route(args: { ids: string[]; mode?: 'route' | 'raw'; at: number; participantId?: string }): number;
  /**
   * Drag one of a mark's handles (V1-PLAN E1): `handle` as `handlesOf` names
   * it, let go at `to` on the board. One `reshape` event — one act — and the
   * mark's clean form is reshaped, born reshaped when it held none; the ink
   * is never touched. False, and nothing written, when the mark has no clean
   * form to reshape or the handle is not one of its own.
   *
   * A connector's own end dragged (V1-PLAN E2, the director's decision): let
   * go where a magnet holds it — `bind`, the site the caller found in the
   * pen's reach there — it binds there, the old claim for that end replaced;
   * let go anywhere else, that end's binding is released. Moved whole by a
   * handle that moves it whole (its middle), it lets go of the ends that no
   * longer sit on their sites. Either way the `unbind` and `bind` events are
   * written in the same act as the reshape, so one undo takes them all back.
   */
  reshape(args: {
    id: string;
    handle: { kind: string; index: number };
    to: Point;
    at: number;
    participantId?: string;
    bind?: { nodeId: string; site: { kind: string; index: number } } | null;
  }): boolean;
  /**
   * Which marks read cleanly enough to be redrawn, and as what. Defaults to
   * every loose mark on the board. Marks already snapped are not offered again.
   */
  snapCandidates(ids?: string[]): (SnapReading & { id: string })[];
  /** The artifact's member marks as a layout frame (MVP.md §6.2). */
  regions(artifactId: string): Region[];
  /**
   * Everything Tier 0 can see about a set of marks: the relations between them,
   * and the concepts those relations read as. This is the substrate a palette
   * offers from and a model is handed — nobody downstream re-derives it.
   */
  read(ids: string[]): {
    scope: ConceptScope;
    relations: Relation[];
    /** The diagram rung: what each mark plays (KEYFRAMES.md §2). */
    roles: RoleReading[];
    /** Which way this drawing compiles: a page, a graph, or both. */
    genre: GenreReading;
    concepts: ConceptMatch[];
  };
  tick(at: number): void;
  /**
   * Summon the held lasso's contents explicitly, as the command mark would.
   * Returns the summon id, or null when nothing is held.
   */
  summonHeld(at: number): string | null;
  /**
   * Summon some marks outright — a tap on the chip beside a matching group.
   * The same summon a loop and a mark would reach, with `scopeSource: 'pointed'`.
   */
  summonMarks(ids: string[], at: number): string | null;
  /** Split a held word back into its letter strokes. */
  splitWord(nodeId: string, at: number): void;
  /** Select marks outright (a grid view, a tap on a card). Ids not in the content plane are ignored. */
  select(ids: string[], at: number): void;
  deselect(at: number): void;
  /**
   * Move, scale or rotate marks — a hand dragging a selection. Artifacts move
   * their members. A connector bound to a moved mark follows it (V1-PLAN E2).
   * A connector moved whole lets go of the bound ends that no longer sit on
   * their sites — an `unbind` each, written before the move in the same act —
   * and keeps the ones on a mark moved with it, or still within the magnet's
   * reach of their sites.
   */
  move(args: { ids: string[]; dx: number; dy: number; at: number }): void;
  scale(args: { ids: string[]; about: Point; sx: number; sy: number; at: number }): void;
  rotate(args: { ids: string[]; about: Point; radians: number; at: number }): void;
  bless(args: {
    summonId: string;
    name?: string;
    suggestionId?: string;
    at: number;
    participantId?: string;
  }): string | null;
  dismiss(summonId: string, at: number): void;
  /** Remove a node from the content plane. Members degrade their artifact. Ink is kept. */
  erase(nodeId: string, at: number): void;
  /**
   * Take back this hand's last ACT and replay (V1-PLAN L2j): what `lastAct`
   * names, dropped from the log wherever the merge put it; every other
   * hand's event stays where it stands. An act is one dispatched event, or
   * everything a tool wrote inside one outermost `withTool`. Ticks are never
   * taken back. Nothing of this hand's on the board: nothing happens.
   */
  undo(): void;
  /**
   * The act `undo` would take back now: this hand's last, its events in the
   * order they stand in the log; empty when there is none.
   *
   * This hand's events are its own log's — the ones no merge stamped `by`,
   * whoever they name (a model's reading in this hand's log is this hand's
   * act, as `handOf` reads it) — and the last is the one it wrote last, never
   * the last the merge put on the board: under the name this sitting writes,
   * the highest number (`seq` only rises in a sitting, and a merge that
   * interleaves logs by time changes no number); with none, under the name of
   * the last named event of its own in the log, the highest number there; and
   * with no names at all, the last of its own in the log — a board of one
   * hand, exactly as before.
   */
  lastAct(): readonly SessionEvent[];
  getState(): SessionState;
  subscribe(listener: (state: SessionState) => void): () => void;
  /** Full input log — state is a pure function of this. */
  getEvents(): readonly SessionEvent[];
  /**
   * Say what this session's own log is called, for a host that learns it
   * after the session was made — joining a room, opening a folder.
   *
   * It applies to what is written NEXT. Every event already in the log keeps
   * the authorship it was written under, so nothing on the board is
   * renumbered and no id anyone already holds goes stale. Pass the same name
   * the log file is written under, or the ids this hand hands out will not be
   * the ids the room knows its marks by.
   */
  setLogName(name: string): void;
  /** What this session calls its own log, or null when it was never told. */
  logName(): string | null;
  /**
   * Replace the log and replay it.
   *
   * State is a pure function of the log, so a recorded session — the canonical
   * loop run once against a real model, every proposal and every answer
   * captured as the events they were — replays deterministically anywhere,
   * with no model attached. That is what makes a recording a FIGURE rather
   * than a screenshot: the actual engine, the actual events, in the reader's
   * browser, inspectable at every step. Load a prefix to stand at that step;
   * draw afterwards to continue the recorded session with your own marks.
   */
  load(events: readonly SessionEvent[]): void;
  /**
   * Take a tool's act: every event `fn` writes carries `tool: toolId`, and
   * `offer: offerKey` when the act took one of its offers (V1-PLAN B1), so
   * the log says which tool did what. Nothing else changes — replay reads
   * neither, and an event that already carries a tool keeps its own. Nested,
   * the innermost is the one stamped; `fn`'s result is returned.
   *
   * It is one ACT (V1-PLAN L2j): what the outermost call writes carries one
   * `act` number, and one undo takes it all back — a tool's own events and a
   * host's inside the same stamp alike. The field a tool closes first (a
   * `dismiss` or `deselect` before anything else, L2e's order) is not part of
   * it: those are written as events of their own, so undo takes back what the
   * tool made and leaves the field closed, as it did before acts.
   */
  withTool<T>(toolId: string, fn: () => T, offerKey?: string): T;
  /**
   * Keep the first `keep` events of the log and put `tail` after them: what a
   * live room's merge hands the session when only the end of the merged log
   * changed (V1-PLAN §9 R4d, `store/livemerge.ts`).
   *
   * When nothing is cut — `keep` is the log's length — the tail is APPLIED,
   * event by event, exactly as `dispatch` applies one: no replay. When
   * something is, the state goes back to the nearest checkpoint at or before
   * `keep` and replays from there, never from zero. Either way the log and the
   * state are what `load` of the whole log would give — state is a pure
   * function of the log — and subscribers hear it once.
   *
   * Unlike `load`, the board is not replaced, so `generation` stands and a
   * model still thinking about a mark answers about it: an id minted from an
   * event's authorship names that event's mark however the log is ordered.
   * Except when the stretch replayed holds an event with no authorship, whose
   * ids come off the replay's counter and may now name other marks — then it
   * is bumped, as a load bumps it.
   *
   * The events are taken as they are, not copied: the caller hands them over
   * and does not change them. Nothing is stamped — they were written elsewhere;
   * their numbers only raise the high-water marks, as a load's do.
   */
  rebase(keep: number, tail: readonly SessionEvent[]): RebaseReport;
}

/** What `rebase` did. */
export interface RebaseReport {
  /** Whether anything already applied was cut; false is an append. */
  cut: boolean;
  /** Where the state was rebuilt from: the checkpoint gone back to when something was cut, else the old end of the log. */
  from: number;
  /** Events applied, from `from` to the new end. */
  applied: number;
}

export function createSession(config: SessionConfig = DEFAULT_SESSION_CONFIG): Session {
  let events: SessionEvent[] = [];
  let nodes = new Map<string, MMNode>();
  let contentIds: string[] = [];
  let artifacts: string[] = [];
  let clusterCandidates: ClusterCandidate[] = [];
  /** Whether a change has been made since the candidates were last settled (`settledCandidates`). */
  let candidatesStale = false;
  let participants: string[] = [];
  let explanations: string[] = [];
  let live: string[] = [];
  let clocks: Record<string, Clock> = {};
  // The library packs this board uses (B3): their names in the order the log
  // used them, the definitions they add to the matching (pack by pack, each
  // pack's in its own order), and the names it uses that this build lacks.
  let packs: string[] = [];
  let library: string[] = [];
  let packNotices: PackNotice[] = [];
  const packSource: PackSource = config.packs ?? shippedPack;
  // Every hand's gestures, keyed by the hand whose acts they are (`handOf`):
  // the board's own under LOCAL_PARTICIPANT, another's under
  // `participant:hand:<name>` — so every board keys one hand alike (L2h).
  let gestures = new Map<string, Gestures>();
  // The hand whose act made each mark on the content plane — the hand of the
  // event, not only the participant it names: a model's mark is its hand's.
  // What the command mark's look-back is limited to.
  let markHands = new Map<string, string>();
  // Runtime notices, not log facts: neither is derived from the events, so
  // neither is checkpointed and neither survives into another session's log.
  let staleResult: StaleResult | null = null;
  // The tool whose act is being taken (`withTool`), and the offer it took:
  // runtime, never derived from the log; what they stamp on the events
  // written meanwhile is the log's.
  let actingTool: { tool: string; offer?: string } | null = null;
  // The act the outermost `withTool` is writing (V1-PLAN L2j): its number,
  // taken at its first event that is not the field closing, or null until
  // then. Runtime, like the tool; the number it stamps is the log's.
  let openAct: { n: number | null } | null = null;
  // The highest act number this sitting has seen or issued. Like the
  // high-water mark below it only rises — a load, a merge, an undo never
  // lower it — so no two acts of one log are given one number.
  let actHigh = 0;
  const sawAct = (n: unknown) => {
    if (typeof n === 'number' && Number.isSafeInteger(n) && n > actHigh) actHigh = n;
  };
  let generation = 0;
  let lastAt = 0;
  let counter = 0;
  // Authorship, not derived state: what this session's own log is called, and
  // the highest number this SITTING has seen or issued under each log name.
  // Neither is read off the log at replay — they are what this session STAMPS
  // — so neither is checkpointed, and a replay of the same log stamps nothing.
  //
  // The high-water mark is the one thing kept outside the events, and it only
  // ever rises (DIRECTOR-PLAN-W2 L1). A number dropped by an undo was very
  // likely already sent, and a peer holds that mark under it; a merge that no
  // longer carries the dropped event, or a `load([])`, says nothing about what
  // the room still holds. So nothing `load()` sees lowers it. It never changes
  // what a log replays to: it only decides the next number this sitting
  // writes. A new sitting — a reload, a new process — has no memory of it,
  // which is why a live hand takes a new log name every sitting
  // (`sittingName` in session/hands.ts) and a folder's history is loaded before
  // its first mark.
  let myLog = config.logName;
  let logNameSaid = config.logName !== undefined;
  const highWater = new Map<string, number>();
  /** Note a number written under a name; lower numbers change nothing. */
  const sawNumber = (name: string, seq: number) => {
    if (Number.isSafeInteger(seq) && seq > (highWater.get(name) ?? 0)) highWater.set(name, seq);
  };
  const listeners = new Set<(state: SessionState) => void>();

  // ===== Checkpoints =====
  // State is a pure function of the log, and undo is "drop an event and
  // replay". A log of ten thousand events must not replay from zero on every
  // undo, so every CHECKPOINT_EVERY events the reducer's state is snapshotted
  // and a replay starts from the nearest snapshot at or before where it needs
  // to get to. Snapshots are derived, never logged, and are discarded past any
  // point the log is cut back to.
  //
  // A snapshot copies what changes and SHARES what never does. The reducer
  // changes a node only by replacing its reps or edges array, or pushing onto
  // one; a rep, an edge, and the data a rep carries (a stroke's points, a
  // fingerprint) are never altered once made. So a snapshot holds its own copy
  // of every node and of its two arrays, and the same rep and edge objects the
  // live graph holds — a structured clone copied every point of every stroke
  // and every stored relation into every checkpoint, and held 950 MB of them at
  // 2,000 marks (PERF.md, hotspot 4). The gestures are small and are mutated
  // in place (a summon's suggestions), so they are cloned outright. Restoring
  // copies again, so a snapshot stays as it was however often it is used.
  //
  // It keeps the index too (V1-PLAN §9 R4d) — where the marks are, which are
  // within reach of which, the components and what they match, as they stood
  // — because rebuilding all of that from the nodes, then scoring every
  // component again, cost a 2,000-mark board 10 ms on every restore, and a
  // room's line that lands a little before the end restores one. The index is
  // derived and decides no reading, so kept or rebuilt it reads the same; kept,
  // a replay from a checkpoint finds again only what the replayed events touch.
  // Only the last few checkpoints keep it — those are the ones a line or an
  // undo goes back to — and an older one rebuilds it as a restore always did,
  // so a 5,000-mark board does not hold two dozen copies of its index.
  const CHECKPOINT_EVERY = 200;
  const checkpointEvery = config.checkpointEvery !== undefined && config.checkpointEvery >= 1 ? Math.floor(config.checkpointEvery) : CHECKPOINT_EVERY;
  let checkpoints: { length: number; snap: Snapshot }[] = [];

  interface Snapshot {
    nodes: Map<string, MMNode>; contentIds: string[]; artifacts: string[];
    clusterCandidates: ClusterCandidate[]; participants: string[]; explanations: string[];
    live: string[]; gestures: Map<string, Gestures>; markHands: Map<string, string>;
    lastAt: number; counter: number; clocks: Record<string, Clock>;
    packs: string[]; library: string[]; packNotices: PackNotice[];
    /** The index as it stood — kept by the last few checkpoints only. */
    derived?: Derived;
  }

  /** The index a snapshot keeps: everything `rebuildDerived` would otherwise find again. */
  interface Derived {
    order: Map<string, number>; nextOrder: number; inContent: Set<string>;
    reach: MarkGrid; ink: MarkGrid; linked: Map<string, Set<string>>;
    componentOf: Map<string, Component>; matchable: Set<Component>; unsettled: Set<string>;
    definitionsSeen: Map<string, DefinitionKey>; definitionsChanged: boolean; definitionSizes: number[];
    holding: Set<Component>; holdingInOrder: Component[]; holdingMoved: boolean;
    boundBy: Map<string, Set<string>>;
  }

  /**
   * A copy of the index that shares nothing either side changes. A component
   * is changed in place only in its scores and its candidate and whether it is
   * retired, so each is copied with its own scores; its members and its
   * signature are never changed and are shared, as the filed boxes are.
   * `grids`: false leaves the two indexes to the caller, which copies them
   * into the session's own.
   */
  function copyDerived(d: Derived, grids = true): Derived {
    const copies = new Map<Component, Component>();
    const cp = (c: Component): Component => {
      let x = copies.get(c);
      if (!x) {
        x = { ...c, scores: new Map(c.scores) };
        copies.set(c, x);
      }
      return x;
    };
    const linkedCopy = new Map<string, Set<string>>();
    for (const [id, set] of d.linked) linkedCopy.set(id, new Set(set));
    const componentOfCopy = new Map<string, Component>();
    for (const [id, c] of d.componentOf) componentOfCopy.set(id, cp(c));
    let reachCopy = d.reach, inkCopy = d.ink;
    if (grids) {
      reachCopy = new MarkGrid();
      reachCopy.copyFrom(d.reach);
      inkCopy = new MarkGrid();
      inkCopy.copyFrom(d.ink);
    }
    const boundByCopy = new Map<string, Set<string>>();
    for (const [id, set] of d.boundBy) boundByCopy.set(id, new Set(set));
    return {
      order: new Map(d.order), nextOrder: d.nextOrder, inContent: new Set(d.inContent),
      reach: reachCopy, ink: inkCopy, linked: linkedCopy,
      componentOf: componentOfCopy, matchable: new Set([...d.matchable].map(cp)), unsettled: new Set(d.unsettled),
      definitionsSeen: new Map(d.definitionsSeen), definitionsChanged: d.definitionsChanged, definitionSizes: d.definitionSizes,
      holding: new Set([...d.holding].map(cp)), holdingInOrder: d.holdingInOrder.map(cp), holdingMoved: d.holdingMoved,
      boundBy: boundByCopy,
    };
  }

  /** A node of its own, holding the same reps and edges: they are never changed in place. */
  const nodeCopy = (n: MMNode): MMNode => ({ ...n, reps: n.reps.slice(), edges: n.edges.slice() });

  function snapshot(): Snapshot {
    settledCandidates();
    const copied = new Map<string, MMNode>();
    for (const [id, n] of nodes) copied.set(id, nodeCopy(n));
    return {
      nodes: copied, contentIds: contentIds.slice(), artifacts: artifacts.slice(),
      clusterCandidates: clusterCandidates.slice(), participants: participants.slice(),
      explanations: explanations.slice(), live: live.slice(), gestures: structuredClone(gestures),
      markHands: new Map(markHands), lastAt, counter, clocks: { ...clocks },
      packs: packs.slice(), library: library.slice(), packNotices: packNotices.slice(),
      derived: copyDerived({
        order, nextOrder, inContent, reach, ink, linked, componentOf, matchable, unsettled,
        definitionsSeen, definitionsChanged, definitionSizes, holding, holdingInOrder, holdingMoved, boundBy,
      }),
    };
  }
  function restore(s: Snapshot) {
    nodes = new Map();
    for (const [id, n] of s.nodes) nodes.set(id, nodeCopy(n));
    contentIds = s.contentIds.slice(); artifacts = s.artifacts.slice();
    clusterCandidates = s.clusterCandidates.slice(); candidatesStale = false; participants = s.participants.slice();
    explanations = s.explanations.slice(); live = s.live.slice(); gestures = structuredClone(s.gestures);
    markHands = new Map(s.markHands);
    lastAt = s.lastAt; counter = s.counter; clocks = { ...(s.clocks ?? {}) };
    packs = s.packs.slice(); library = s.library.slice(); packNotices = s.packNotices.slice();
    if (!s.derived) {
      rebuildDerived();
      return;
    }
    const d = copyDerived(s.derived, false);
    order = d.order; nextOrder = d.nextOrder; inContent = d.inContent;
    reach.copyFrom(s.derived.reach); ink.copyFrom(s.derived.ink); linked = d.linked;
    componentOf = d.componentOf; matchable = d.matchable; unsettled = d.unsettled;
    definitionsSeen = d.definitionsSeen; definitionsChanged = d.definitionsChanged; definitionSizes = d.definitionSizes;
    holding = d.holding; holdingInOrder = d.holdingInOrder; holdingMoved = d.holdingMoved;
    boundBy = d.boundBy;
  }

  /** How many of the latest checkpoints keep the index. */
  const DERIVED_KEPT = 4;
  function keepCheckpoint(c: { length: number; snap: Snapshot }) {
    checkpoints.push(c);
    for (let i = checkpoints.length - 1 - DERIVED_KEPT; i >= 0 && checkpoints[i].snap.derived; i--) delete checkpoints[i].snap.derived;
  }
  function maybeCheckpoint(length: number) {
    if (length > 0 && length % checkpointEvery === 0 && !checkpoints.some((c) => c.length === length)) {
      keepCheckpoint({ length, snap: snapshot() });
    }
  }

  // A room's line most often lands a LITTLE before the end of the log — this
  // hand drew a moment later, by the clocks, than the line it now meets — so
  // `rebase` leaves a checkpoint where it ended, and the next line that cuts
  // back a little goes back to that one rather than to the last of the
  // regular ones, up to `checkpointEvery` events further. Only the last few
  // of these are kept; a regular one is never dropped for them.
  const END_CHECKPOINTS = 3;
  function checkpointAtEnd() {
    const length = events.length;
    if (length === 0 || checkpoints.some((c) => c.length === length)) return;
    keepCheckpoint({ length, snap: snapshot() });
    let kept = 0;
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (checkpoints[i].length % checkpointEvery === 0) continue;
      if (++kept > END_CHECKPOINTS) checkpoints.splice(i, 1);
    }
  }

  // ===== What the board holds, found without walking it (V1-PLAN §9 R4b) =====
  //
  // Derived from the node graph, never logged and never checkpointed: rebuilt
  // whenever the graph is replaced whole (reset, restore) and kept current by
  // the few places that change what is on the content plane or where a mark
  // stands. None of it decides what a reading says. Each piece finds the marks
  // a reading would have found by walking the whole board, and the reading
  // still makes its own exact test of them:
  //
  //   - `order`: each content id's place along `contentIds`, as a number that
  //     only increases along it, so a handful of ids can be put in the board's
  //     order without walking the board;
  //   - `reach`: the content plane at its marks' current bounds (grid.ts);
  //   - `linked`: which content marks are within reach of which now — the
  //     engaging relations `clusters` groups by (`withinReach`, relations.ts);
  //   - `ink`: every stroke at its current bounds, for the scratch test;
  //   - the components of `linked`, each holding the candidate reading
  //     `recomputeClusterCandidates` would give it, found again only where a
  //     mark was added, taken away or moved;
  //   - `boundBy`: each mark, and the connectors whose ends are bound to it
  //     (active or not) — who follows a mark when it moves (V1-PLAN E2).
  let order = new Map<string, number>();
  let nextOrder = 0;
  let inContent = new Set<string>();
  const reach = new MarkGrid();
  const ink = new MarkGrid();
  let linked = new Map<string, Set<string>>();
  let boundBy = new Map<string, Set<string>>();

  /** A cluster of the content plane: marks joined by relations that engage. */
  interface Component {
    /** The member earliest on the content plane — where `clusters` begins its walk. */
    first: string;
    /** Every member; in the order `clusters` walks them once `ordered` (a group too big to match anything is not walked in order until a definition it could match is made). */
    members: string[];
    /** The members that are not artifacts, when there are two or more: what a candidate names. In `members`' order. */
    strokeIds: string[] | null;
    ordered: boolean;
    signature: StructuralSignature | null;
    /** How it scores against each definition it matches (not vetoed, at or above the floor). */
    scores: Map<string, { score: number; reasoning: string }>;
    candidate: ClusterCandidate | null;
    retired: boolean;
  }
  let componentOf = new Map<string, Component>();
  /** Live components with two or more strokes — the ones a definition can match. */
  let matchable = new Set<Component>();
  /** Content marks whose component must be found again. */
  let unsettled = new Set<string>();
  /** What each definition was when the components were last scored against it. */
  interface DefinitionKey { signature: Rep | undefined; examples: Rep | undefined; text: boolean }
  let definitionsSeen = new Map<string, DefinitionKey>();
  let definitionsChanged = true;
  /** How many marks each thing a group is matched against stands for (`mayMatchBySize`), distinct and in no order. */
  let definitionSizes: number[] = [];
  let holding = new Set<Component>();
  let holdingInOrder: Component[] = [];
  let holdingMoved = false;

  const byOrder = (p: string, q: string) => order.get(p)! - order.get(q)!;

  function rebuildDerived() {
    order = new Map();
    nextOrder = 0;
    inContent = new Set();
    reach.clear();
    ink.clear();
    linked = new Map();
    componentOf = new Map();
    matchable = new Set();
    unsettled = new Set();
    definitionsSeen = new Map();
    definitionsChanged = true;
    definitionSizes = [];
    holding = new Set();
    holdingInOrder = [];
    holdingMoved = false;
    for (const id of contentIds) {
      inContent.add(id);
      order.set(id, ++nextOrder);
    }
    for (const id of contentIds) fileContent(id);
    boundBy = new Map();
    for (const [id, n] of nodes) {
      for (const e of n.edges) if (e.rel === 'bound-to') followerOf(e.to, id);
      if (!getRep(n, 'stroke') || getRep(n, 'erased')) continue;
      const b = boundsOf(n);
      if (b) ink.set(id, b);
    }
  }

  /** `connector` has an end bound to `target`: it follows it (V1-PLAN E2). */
  function followerOf(target: string, connector: string) {
    const set = boundBy.get(target);
    if (set) set.add(connector);
    else boundBy.set(target, new Set([connector]));
  }

  /** `connector` has no end bound to `target` any more. */
  function noFollowerOf(target: string, connector: string) {
    const set = boundBy.get(target);
    if (!set) return;
    set.delete(connector);
    if (!set.size) boundBy.delete(target);
  }

  function reset() {
    nodes = new Map();
    contentIds = [];
    artifacts = [];
    clusterCandidates = [];
    candidatesStale = false;
    participants = [LOCAL_PARTICIPANT, TIER0_PARTICIPANT];
    explanations = [];
    live = [];
    clocks = {};
    packs = [];
    library = [];
    packNotices = [];
    gestures = new Map();
    markHands = new Map();
    lastAt = 0;
    counter = 0;
    for (const n of createBootstrapNodes(0)) nodes.set(n.id, n);
    rebuildDerived();
  }
  reset();

  // ===== Ids per hand (SURFACE-v10-PLAN D8) =====
  //
  // A node id is a function of the EVENT that made it: the log that wrote
  // that event, and the event's own number in that log. Both travel on the
  // event itself, so the id is the same in every replay, on every machine, in
  // every session, however the logs were merged and whatever the reader calls
  // its own log. Nothing here reads the merged position, a clock, a random
  // source, or any table held outside the log.
  //
  // `counter` — the merged replay position — is the rule as it was, and it
  // stays the rule for two kinds of event: one written before this change (no
  // `seq`), and one written by a session that was never told what its log is
  // called. So every held log opens as itself. That is not politeness: a log's
  // own events REFER to the ids it minted (`bless` names its summon, `code`
  // and `propose` name their node, `erase` names its targets), so renumbering
  // a held log would break it from the inside. The two forms cannot collide —
  // a counter id is `stroke:7`, an authored one `stroke:ada:7`.

  /** What the event being applied mints from, and what it has minted already. */
  let mint: string | null = null;
  const minted = new Map<string, number>();

  /**
   * What an event mints from, or null for the counter.
   *
   * The name goes in **unscrubbed**, and that is the safe choice, not the lazy
   * one. A scrub that mapped every awkward character onto `_` would give
   * `qwen3:8b` and `qwen3-8b` the same marks — two hands sharing one id is the
   * very failure this change exists to end, and the names in this system
   * really do carry colons. It does not need one: the number is always the
   * LAST colon-separated field and always digits, so `name:seq` reads back to
   * exactly one pair of parts whatever the name contains, and one name can
   * never be another.
   *
   * Both parts must be there and well formed, because a log is read, not
   * trusted (DATA-1): an empty name or a number that is not a whole one would
   * blur the authored form into the counter's.
   */
  function mintKeyOf(ev: SessionEvent): string | null {
    if (!ev.origin || typeof ev.seq !== 'number') return null;
    if (!Number.isSafeInteger(ev.seq) || ev.seq < 0) return null;
    return `${ev.origin}:${ev.seq}`;
  }

  /**
   * The id this event mints for a family of node. The first of a family reads
   * `prefix:log:number`; a second of the SAME family in one event — a summon's
   * suggestions — is numbered after it, so the common case stays plain.
   */
  const nextId = (prefix: string) => {
    if (mint === null) return `${prefix}:${++counter}`;
    const n = (minted.get(prefix) ?? 0) + 1;
    minted.set(prefix, n);
    return n === 1 ? `${prefix}:${mint}` : `${prefix}:${mint}.${n}`;
  };

  function notify() {
    const state = getState();
    listeners.forEach((l) => l(state));
  }

  // ===== Derived helpers =====

  function contentBoundsList(excludeId?: string): { id: string; bounds: Bounds }[] {
    return contentIds
      .filter((id) => id !== excludeId)
      .map((id) => ({ id, bounds: boundsOf(nodes.get(id)!)! }))
      .filter((c) => c.bounds !== undefined);
  }

  function signatureOf(ids: readonly string[]): StructuralSignature {
    return structuralSignature(ids, nodes, (id) => topInterpretation(nodes.get(id)!) ?? 'art');
  }

  /**
   * Every definition a group could be matched against, in the order a tie
   * keeps: this board's own — its artifacts — then the definitions of the
   * library packs it uses (B3), pack by pack.
   */
  function definitionIds(): string[] {
    return library.length ? artifacts.concat(library) : artifacts;
  }

  /** Best first; on a tie, this board's own definition before a library pack's (V1-PLAN §2.3). */
  const byScoreOwnFirst = (p: { score: number; pack?: string }, q: { score: number; pack?: string }) =>
    q.score - p.score || (p.pack ? 1 : 0) - (q.pack ? 1 : 0);

  /**
   * Every definition a group matches, best first: its signature against each
   * artifact's own, and against what corrections have taught that artifact —
   * and against each library pack's definition in use, the same way (B3).
   * Plural on purpose — two definitions with the same shapes are both offered,
   * with the reasoning that ranks them, and the human decides.
   */
  function matchesFor(ids: readonly string[]) {
    const sig = signatureOf(ids);
    const out: { artifactId: string; name: string; score: number; reasoning: string; pack?: string }[] = [];
    for (const aid of definitionIds()) {
      const a = nodes.get(aid)!;
      // Writing taken as text is a transcription, not vocabulary: a group of
      // words is never offered as "another hello world" (v10 F8).
      const code = [...a.reps].reverse().find((r) => r.modality === 'code')?.data as { kind?: string } | undefined;
      if (code?.kind === 'text') continue;
      const aSig = getRep(a, 'signature')?.data as StructuralSignature | undefined;
      if (!aSig) continue;
      const examples = getRep(a, 'examples')?.data as Examples | undefined;
      const m = matchDefinition(sig, aSig, examples);
      if (m.vetoed || m.score < MATCH_FLOOR) continue;
      const pack = packOfId(aid);
      out.push({ artifactId: aid, name: wordOf(a) ?? aid, score: m.score, reasoning: m.reasoning, ...(pack ? { pack } : {}) });
    }
    return out.sort(byScoreOwnFirst);
  }

  /**
   * The groups of the content plane that match a definition, best first, in
   * the board's order — what `clusters(marks, relate(marks))` and `matchesFor`
   * over every group gave, when they were run over the whole board on every
   * event (PERF.md, hotspot 2). The components are kept (`settle`), and only
   * the ones a mark joined, left or moved within are found again; a changed
   * definition is scored against every component, and nothing else is.
   */
  function recomputeClusterCandidates() {
    candidatesStale = true;
  }

  /**
   * The candidates, settled when something reads them, not at every change
   * (V1-PLAN I2). What an event changes it files at once (`fileContent`,
   * `unsettle`: the links, and the components that must be found again), but
   * the finding of a component and the reading of it against the definitions
   * wait for whoever asks — `getState`, a checkpoint — so an event that makes
   * a thousand marks (an import of a traced picture) settles once, not once a
   * mark: a component that grows by one mark at a time was gathered and
   * signed again whole each time, and one picture's strokes are one component.
   * The answer is a function of the board as it stands when it is asked, as it
   * was when it was found at every change.
   */
  function settledCandidates(): ClusterCandidate[] {
    if (!candidatesStale) return clusterCandidates;
    candidatesStale = false;
    if ((artifacts.length === 0 && library.length === 0) || contentIds.length === 0) {
      clusterCandidates = [];
      return clusterCandidates;
    }
    refreshDefinitions();
    settle();
    if (holdingMoved) {
      holdingInOrder = [...holding].sort((p, q) => order.get(p.first)! - order.get(q.first)!);
      holdingMoved = false;
    }
    clusterCandidates = holdingInOrder.map((c) => c.candidate!);
    return clusterCandidates;
  }

  // ===== The content plane, kept filed (R4b) =====
  //
  // Every change to what is on the content plane goes through these, so the
  // index, the links and the components are never out of step with it.

  function contentPush(id: string) {
    contentIds.push(id);
    inContent.add(id);
    order.set(id, ++nextOrder);
    fileContent(id);
  }

  function removeFromContent(id: string) {
    const idx = contentIds.indexOf(id);
    if (idx < 0) return;
    contentIds.splice(idx, 1);
    inContent.delete(id);
    order.delete(id);
    unfileContent(id);
  }

  /** `next` takes `prev`'s place on the content plane — a word where its first letter stood. */
  function contentReplace(prev: string, next: string) {
    const idx = contentIds.indexOf(prev);
    const place = order.get(prev)!;
    contentIds.splice(idx, 1, next);
    inContent.delete(prev);
    order.delete(prev);
    unfileContent(prev);
    inContent.add(next);
    order.set(next, place);
    fileContent(next);
  }

  /** `ids` take `prev`'s place — a dissolved word's letters, back where it stood. */
  function contentSpread(prev: string, ids: string[]) {
    const idx = contentIds.indexOf(prev);
    if (idx < 0) return;
    contentIds.splice(idx, 1, ...ids);
    inContent.delete(prev);
    unfileContent(prev);
    // Places between two neighbours: number the plane again, in its order.
    order = new Map();
    nextOrder = 0;
    for (const c of contentIds) order.set(c, ++nextOrder);
    for (const c of ids) {
      inContent.add(c);
      fileContent(c);
    }
  }

  /** `ids` go back on the plane just before `anchor` — letters a word let go of (W1), before the stroke that showed they were none. */
  function contentInsertBefore(anchor: string, ids: readonly string[]) {
    const idx = contentIds.indexOf(anchor);
    contentIds.splice(idx < 0 ? contentIds.length : idx, 0, ...ids);
    order = new Map();
    nextOrder = 0;
    for (const c of contentIds) order.set(c, ++nextOrder);
    for (const c of ids) {
      inContent.add(c);
      fileContent(c);
    }
  }

  /**
   * File a content mark at its current bounds and link it to every mark
   * within its reach: the index is asked for the marks whose boxes meet this
   * one's grown by its reach (`reachAround`), and each is kept only when
   * `withinReach` says so — the test `relate` makes for `near`.
   */
  function fileContent(id: string) {
    const n = nodes.get(id);
    const b = n && boundsOf(n);
    if (!b) return;
    reach.set(id, b);
    if (!reach.has(id)) return; // a box that is not finite is within reach of nothing
    const mine = new Set<string>();
    const r = reachAround(b);
    for (const o of reach.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
      if (o === id || !withinReach(b, reach.boundsOf(o)!)) continue;
      mine.add(o);
      linked.get(o)!.add(id);
    }
    linked.set(id, mine);
    if (joinsBigGroup(id, mine)) return;
    for (const o of mine) unsettle(o);
    unsettle(id);
  }

  /**
   * A mark that lands in a group too big for any definition (V1-PLAN I2) joins
   * it where it stands, instead of the group being taken apart and found again
   * whole: the marks of one photograph traced into ink are one group of
   * thousands, and each stroke drawn on it used to gather them all again and
   * walk them in `clusters`' order, for a group that matches nothing. Only when
   * every mark the new one is within reach of is in that one group and the group
   * is still unsigned, unscored and unwalked (it matched nothing when it was
   * found), would still be too big for every definition with this mark in it,
   * and no definition is waiting to be read (`refreshDefinitions` would size it
   * again). The group is replaced by one with the mark in it — its lists new
   * arrays, since a checkpoint holds the old ones — and `first` is where the
   * order says. Everything else takes the way it always did.
   */
  function joinsBigGroup(id: string, mine: ReadonlySet<string>): boolean {
    if (mine.size === 0 || definitionsChanged) return false;
    let group: Component | undefined;
    for (const o of mine) {
      const c = componentOf.get(o);
      if (!c || c.retired || (group && c !== group)) return false;
      group = c;
    }
    if (!group || !group.strokeIds || group.ordered || group.signature || group.scores.size) return false;
    const isArtifact = artifacts.includes(id);
    const n = group.strokeIds.length + (isArtifact ? 0 : 1);
    if (definitionSizes.some((m) => mayMatchBySize(n, m))) return false;
    // Too big now and, being only bigger, for good unless a definition changes — which sizes it again.
    if (definitionSizes.some((m) => m >= group!.strokeIds!.length)) return false;
    group.members = [...group.members, id];
    if (!isArtifact) group.strokeIds = [...group.strokeIds, id];
    if (order.get(id)! < order.get(group.first)!) group.first = id;
    componentOf.set(id, group);
    return true;
  }

  function unfileContent(id: string) {
    const mine = linked.get(id);
    if (mine) {
      for (const o of mine) {
        linked.get(o)?.delete(id);
        unsettle(o);
      }
    }
    const c = componentOf.get(id);
    if (c) retire(c);
    linked.delete(id);
    componentOf.delete(id);
    unsettled.delete(id);
    reach.delete(id);
  }

  /** A mark stands somewhere else now (a transform, a turn, a word's letters): file it again. */
  function boundsMoved(id: string) {
    const n = nodes.get(id);
    if (!n) return;
    if (inContent.has(id)) {
      unfileContent(id);
      fileContent(id);
    }
    if (ink.has(id)) {
      const b = boundsOf(n);
      if (b) ink.set(id, b);
      else ink.delete(id);
    }
  }

  /** This mark's component must be found again — and so must every mark that was in it. */
  function unsettle(id: string) {
    const c = componentOf.get(id);
    if (c) retire(c);
    if (linked.has(id)) unsettled.add(id);
  }

  function retire(c: Component) {
    if (c.retired) return;
    c.retired = true;
    matchable.delete(c);
    if (holding.delete(c)) holdingMoved = true;
    for (const m of c.members) {
      if (componentOf.get(m) === c) componentOf.delete(m);
      if (linked.has(m)) unsettled.add(m);
    }
  }

  // ===== Components, and what they match =====

  /** Find the components of every unsettled mark, and read each against the definitions. */
  function settle() {
    if (unsettled.size === 0) return;
    const fresh: Component[] = [];
    for (const id of unsettled) {
      if (!linked.has(id) || componentOf.has(id)) continue;
      fresh.push(gather(id));
    }
    unsettled.clear();
    const defs = definitionIds();
    for (const c of fresh) {
      if (c.strokeIds) {
        matchable.add(c);
        if (signedComponent(c)) for (const aid of defs) scoreAgainst(c, aid);
      }
      assemble(c);
    }
  }

  /** The component `start` is in: its members, the one `clusters` starts from, and the order it walks them in. */
  function gather(start: string): Component {
    const seen = new Set<string>([start]);
    const stack = [start];
    let first = start;
    while (stack.length) {
      const id = stack.pop()!;
      if (order.get(id)! < order.get(first)!) first = id;
      for (const o of linked.get(id)!) {
        if (seen.has(o)) continue;
        seen.add(o);
        stack.push(o);
      }
    }
    // Don't offer an artifact as a match for itself.
    const own = artifacts.length ? new Set(artifacts) : null;
    const strokesOf = (ids: Iterable<string>) => {
      const out: string[] = [];
      for (const id of ids) if (!own || !own.has(id)) out.push(id);
      return out;
    };
    // The walk in `clusters`' order sorts every mark's links, and a group of
    // thousands is gathered again whole each time a mark joins it: it is made
    // only when a candidate could be named from it (`mayMatchBySize`).
    let members = [...seen];
    let strokeIds = strokesOf(members);
    const ordered = definitionSizes.some((m) => mayMatchBySize(strokeIds.length, m));
    if (ordered) {
      members = walkFrom(first);
      strokeIds = strokesOf(members);
    }
    const c: Component = {
      first,
      members,
      strokeIds: strokeIds.length >= 2 ? strokeIds : null,
      ordered,
      signature: null,
      scores: new Map(),
      candidate: null,
      retired: false,
    };
    for (const m of members) componentOf.set(m, c);
    return c;
  }

  /**
   * The order `clusters` walks a component in: depth first from its earliest
   * mark, each mark's links taken in the board's order and the last one taken
   * first — which is how `clusters` meets them, since `relate` lists pairs in
   * the board's order.
   */
  function walkFrom(first: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const stack = [first];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      for (const o of [...linked.get(id)!].sort(byOrder)) if (!seen.has(o)) stack.push(o);
    }
    return out;
  }

  /** What `matchesFor` reads of a definition: its signature, its examples, and whether it is writing taken as text. */
  function definitionKeyOf(aid: string): DefinitionKey {
    const a = nodes.get(aid)!;
    const code = [...a.reps].reverse().find((r) => r.modality === 'code')?.data as { kind?: string } | undefined;
    return { signature: getRep(a, 'signature'), examples: getRep(a, 'examples'), text: code?.kind === 'text' };
  }

  /**
   * A component's signature, read when it can matter (V1-PLAN I2): reading one
   * walks every link of the group, and a photograph's strokes are one group of
   * thousands that each new stroke made read again whole. A group is signed
   * only when some definition, or an example one was taught, stands for a
   * number of marks it could be like (`mayMatchBySize`); otherwise it matches
   * none and says so with no scores, as reading it would have. Signed later if
   * a definition that could match it is made — and read then from the marks as
   * they stand, which is what they stood as, since a change to a member's
   * readings or links unsettles its component.
   */
  function signedComponent(c: Component): StructuralSignature | null {
    if (c.signature) return c.signature;
    if (!c.strokeIds) return null;
    const n = c.strokeIds.length;
    if (!definitionSizes.some((m) => mayMatchBySize(n, m))) return null;
    if (!c.ordered) {
      c.members = walkFrom(c.first);
      c.strokeIds = c.members.filter((id) => !artifacts.includes(id));
      c.ordered = true;
    }
    c.signature = signatureOf(c.strokeIds);
    return c.signature;
  }

  /** `matchesFor`'s test, for one component against one definition. */
  function scoreAgainst(c: Component, aid: string) {
    c.scores.delete(aid);
    const k = definitionsSeen.get(aid) ?? definitionKeyOf(aid);
    // Writing taken as text is a transcription, not vocabulary (v10 F8).
    if (k.text) return;
    const aSig = k.signature?.data as StructuralSignature | undefined;
    if (!aSig) return;
    const signature = signedComponent(c);
    if (!signature) return;
    const m = matchDefinition(signature, aSig, k.examples?.data as Examples | undefined);
    if (m.vetoed || m.score < MATCH_FLOOR) return;
    c.scores.set(aid, { score: m.score, reasoning: m.reasoning });
  }

  /** A definition made, changed, corrected or gone: score every component against what changed. */
  function refreshDefinitions() {
    if (!definitionsChanged) return;
    definitionsChanged = false;
    const now = new Map<string, DefinitionKey>();
    for (const aid of definitionIds()) now.set(aid, definitionKeyOf(aid));
    const changed: string[] = [];
    for (const [aid, k] of now) {
      const was = definitionsSeen.get(aid);
      if (!was || was.signature !== k.signature || was.examples !== k.examples || was.text !== k.text) changed.push(aid);
    }
    const gone = [...definitionsSeen.keys()].filter((aid) => !now.has(aid));
    definitionsSeen = now;
    if (changed.length === 0 && gone.length === 0) return;
    // What a group could be like, by size: each definition's, and each example it was taught.
    const sizes = new Set<number>();
    for (const k of now.values()) {
      if (k.text) continue;
      const sig = k.signature?.data as StructuralSignature | undefined;
      if (sig) sizes.add(shapeCount(sig));
      for (const x of (k.examples?.data as Examples | undefined)?.accepted ?? []) sizes.add(shapeCount(x));
    }
    definitionSizes = [...sizes];
    for (const c of matchable) {
      for (const aid of gone) c.scores.delete(aid);
      for (const aid of changed) scoreAgainst(c, aid);
      assemble(c);
    }
  }

  /** A component's candidate: `matchesFor`'s list, in its order, when there is one. */
  function assemble(c: Component) {
    let candidate: ClusterCandidate | null = null;
    if (c.strokeIds && c.scores.size) {
      const matches: ClusterCandidate['matches'] = [];
      for (const aid of definitionIds()) {
        const s = c.scores.get(aid);
        if (!s) continue;
        const pack = packOfId(aid);
        matches.push({ artifactId: aid, name: wordOf(nodes.get(aid)!) ?? aid, score: s.score, reasoning: s.reasoning, ...(pack ? { pack } : {}) });
      }
      matches.sort(byScoreOwnFirst);
      if (matches.length) candidate = { nodeIds: c.strokeIds, matches };
    }
    c.candidate = candidate;
    if (candidate) {
      if (!holding.has(c)) {
        holding.add(c);
        holdingMoved = true;
      }
    } else if (holding.delete(c)) holdingMoved = true;
  }

  function makeSuggestions(enclosedIds: string[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    for (const m of matchesFor(enclosedIds)) {
      suggestions.push({
        id: nextId('sug'),
        kind: 'match',
        label: m.name,
        artifactId: m.artifactId,
        score: m.score,
        reasoning: m.reasoning,
        ...(m.pack ? { pack: m.pack } : {}),
      });
    }
    suggestions.push({ id: nextId('sug'), kind: 'prompt', label: 'Make…' });
    suggestions.push({ id: nextId('sug'), kind: 'name-as-new', label: 'Name this…' });
    suggestions.push({ id: nextId('sug'), kind: 'keep-as-drawing', label: 'Keep as drawing' });
    return suggestions;
  }

  /**
   * Record what Tier 0 can see between the new mark and the marks within its
   * reach, as held (unblessed) edges on both ends. This is the SAME relate()
   * the palette and the diagram rung read from — one relation system, one set
   * of thresholds, all of them ratios of the marks' own sizes.
   *
   * What is stored is what is read (V1-PLAN §9 R4b). A pair within reach —
   * one engaging the other: contains, inside, crossing, touching, near — keeps
   * every relation `relate` finds between them, how they sit included. A pair
   * out of reach keeps none: what holds between two marks at any distance —
   * above, left-of, same-row, same-column, same-size — is computed for the
   * scope that asks, by `session.read` and the concepts over it, and stored it
   * was 88% of a 2,000-mark board and read by nothing but the brief.
   */
  function addSpatialEdges(node: MMNode) {
    // Relations are pairwise, so the new mark is related to each mark within
    // its reach one pair at a time, in the board's order: the same relations,
    // in the same order, as relating it to every mark and keeping the pairs
    // that engage. The index found them (`fileContent`, when the mark joined
    // the plane); walking the whole board for them made every stroke linear
    // in the board and every replay quadratic.
    const me = markOf(node.id);
    if (!me) return;
    for (const id of [...(linked.get(node.id) ?? [])].sort(byOrder)) {
      const other = markOf(id);
      if (!other) continue;
      const found = relate([me, other]);
      if (!found.some((r) => ENGAGING_KINDS.has(r.kind))) continue;
      for (const r of found) {
        nodes.get(r.from)?.edges.push({
          to: r.to,
          rel: r.kind,
          weight: r.strength,
          via: TIER0_PARTICIPANT,
          reasoning: r.reasoning,
        });
      }
    }
  }

  /**
   * Wire inference (inferred-then-blessed): a line-like stroke whose endpoints
   * land near two different content nodes is held as a candidate connection.
   * The line IS the relation node (relations are nodes — core schema).
   */
  function inferWire(node: MMNode, points: Point[], scale: number, given?: [Point, Point]) {
    const top = resemblances(node)[0];
    if (!top) return;
    const kind = top.to.replace(/^type:/, '');
    if (kind !== 'line' && kind !== 'arrow') return;

    // An arrow's ends are its tip and tail, not the stroke's first and last
    // points — the last point is the end of a wing. A connector that follows
    // its bindings is read again from its ends where it stands (`rewire`).
    const arrow = getRep(node, 'reading:arrow')?.data as { tip: Point; tail: Point } | undefined;
    const ends = given ?? (kind === 'arrow' && arrow ? [arrow.tail, arrow.tip] : [points[0], points[points.length - 1]]);

    // The nearest content mark an end lands on, within that mark's own reach
    // (a fraction of its size, with a hand's floor under it); the earliest on
    // the board wins a tie. The index is asked level by level, each level
    // with the reach its biggest mark could have, so no mark that could count
    // is left unasked and the board is not walked for the rest.
    const floor = 10 * scale;
    const nearest = (p: Point) => {
      let best: { id: string; d: number } | null = null;
      let bestPlace = Infinity;
      for (const id of reach.around(p, (cell) => Math.max(floor, cell * config.wireEndpointRatio))) {
        if (id === node.id) continue;
        const bounds = boundsOf(nodes.get(id)!)!;
        const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        const within = Math.max(floor, size * config.wireEndpointRatio);
        const d = distancePointToBounds(p, bounds);
        if (!(d < within)) continue;
        const place = order.get(id)!;
        if (!best || d < best.d || (d === best.d && place < bestPlace)) {
          best = { id, d };
          bestPlace = place;
        }
      }
      return best;
    };

    const a = nearest(ends[0]);
    const b = nearest(ends[1]);
    if (!a || !b || a.id === b.id) return;
    // Its ends' marks carry a new edge; their components are read again.
    unsettle(a.id);
    unsettle(b.id);

    const weight = top.weight;
    const why = `its ${kind === 'arrow' ? 'tail' : 'start'} lands on ${a.id} and its ${kind === 'arrow' ? 'tip' : 'end'} on ${b.id}`;
    node.edges.push({ to: a.id, rel: 'connects', weight, reasoning: why } satisfies Edge);
    node.edges.push({ to: b.id, rel: 'connects', weight, reasoning: why } satisfies Edge);
    nodes.get(a.id)!.edges.push({ to: node.id, rel: 'connected-by', weight });
    nodes.get(b.id)!.edges.push({ to: node.id, rel: 'connected-by', weight });
    if (kind === 'arrow') {
      // Direction is a fact about the stroke, so it is recorded as one.
      node.edges.push({ to: a.id, rel: 'points-from', weight, reasoning: why });
      node.edges.push({ to: b.id, rel: 'points-to', weight, reasoning: why });
    }
  }

  /**
   * Every mark a scratch could rub out: loose strokes, plus the member marks
   * inside artifacts (which have left the content plane but are still ink).
   */
  function scratchTargets(excludeId: string) {
    const ids = new Set<string>();
    for (const id of contentIds) {
      if (id === excludeId) continue;
      const n = nodes.get(id)!;
      if (strokePointsOf(n)) {
        ids.add(id);
        continue;
      }
      // The ink under a text made from writing is provenance, not a target:
      // a scratch over the text strikes a WORD (the surface's act), never
      // the hidden strokes that would break the text (v10 F12).
      const code = [...n.reps].reverse().find((r) => r.modality === 'code')?.data as { kind?: string } | undefined;
      if (code?.kind === 'text') continue;
      for (const e of n.edges) if (e.rel === 'has-part') ids.add(e.to);
    }
    return [...ids]
      .map((id) => nodes.get(id))
      .filter((n): n is MMNode => !!n && !getRep(n, 'erased') && !!strokePointsOf(n))
      .map((n) => ({
        id: n.id,
        // Where it stands: a reshaped form is scratched out where it is drawn (E1).
        points: standingPointsOf(n)!,
        closed: standsClosed(n) ?? false,
      }));
  }

  // ===== Whose gesture (V1-PLAN L2h) =====

  /**
   * Whose act an event is: the key a hand's gestures are held under, and the
   * maker of what it blesses (L2f). A person's act is theirs — the board's own
   * hand, another hand (`participant:hand:<name>`, which "local" in its log
   * already reads as, `applyEvent`), or a person who joined. Anyone else — a
   * model, the engine — acts inside the act of the hand whose log holds the
   * event, because every tier proposes and none commits: the shard's bless in
   * the engine's name takes up its hand's summon, and a model's loop waits
   * for its hand. So one hand's gesture keys alike on every board, however
   * each board names that hand.
   */
  function handOf(ev: SessionEvent): string {
    const named = (ev as { participantId?: string }).participantId ?? LOCAL_PARTICIPANT;
    if (isHuman(named)) return named;
    return ev.by ? handId(ev.by) : LOCAL_PARTICIPANT;
  }

  // ===== Whose ink (V1-PLAN L2i) =====
  //
  // A live hand's log is one SITTING (`sittingName` in hands.ts): a reload is a
  // new log, a new participant and a new numbering, and all three stay per
  // sitting — as do gestures (`handOf`), because two tabs of one person draw
  // independently. But the rules that ask "is this mine?" ask it of the PERSON,
  // or a reload would make someone a stranger to their own ink.

  /**
   * The person a participant is: the name its log is written under without the
   * sitting's suffix (`handLabel`) — the name every board already shows it by —
   * or null for a participant that is no person (a model, the engine), which is
   * only ever itself.
   *
   * This board's own hand is the person its log is written under (`logName`):
   * the one fact about the reader this rule reads, and the same fact every
   * other board reads off that log's name when it merges it (`by`). Another
   * hand is shown by its person already (`handParticipant`). A board never told
   * what its log is called is no sitting of anyone, and its rules compare hands
   * exactly, as they always did.
   *
   * A name is self-asserted — there are no accounts — so one name is one
   * person, on the same trust the name and the colour already carry. It is not
   * authentication.
   */
  function personOf(pid: string): string | null {
    if (pid === LOCAL_PARTICIPANT) return myLog === undefined ? null : handLabel(myLog);
    if (!isHuman(pid)) return null;
    const name = getRep(nodes.get(pid)!, 'word')?.data;
    return typeof name === 'string' && name !== '' ? name : null;
  }

  /**
   * Whether `writer` may call `maker`'s ink its own: the same hand, or two
   * sittings of one person. The label rule's question, at the door and on
   * replay, and the field's (`isMine`).
   */
  function samePerson(maker: string, writer: string): boolean {
    if (maker === writer) return true;
    const person = personOf(maker);
    return person !== null && person === personOf(writer);
  }

  function blankGestures(hand: string): Gestures {
    // The configured mark is the session's own hand's; another hand's is
    // whatever its own log taught.
    const commandMark = hand === LOCAL_PARTICIPANT ? (config.gesture.commandMark ?? null) : null;
    return { pendingLasso: null, summon: null, selection: [], markMiss: null, commandMark };
  }

  /** A hand's gestures, made on first use. */
  function gesturesOf(hand: string): Gestures {
    let g = gestures.get(hand);
    if (!g) gestures.set(hand, (g = blankGestures(hand)));
    return g;
  }

  /** Whether a mark is a loop some hand still holds as a gesture-candidate. */
  function isPendingLasso(id: string): boolean {
    for (const g of gestures.values()) if (g.pendingLasso?.id === id) return true;
    return false;
  }

  function buildSummon(
    ids: string[],
    source: ScopeSource,
    reasoning: string,
    gestureIds: string[],
    scopeBounds: Bounds,
    excludeId: string,
    at: number,
    g: Gestures
  ): Summon {
    const artifactId = liveArtifactUnder(scopeBounds, excludeId);
    const onArtifact = artifactId
      ? {
          artifactId,
          regionIds: regionsOverlapping(regionsOf(nodes.get(artifactId)!, nodes), scopeBounds).map((r) => r.id),
        }
      : undefined;
    // Taking a loop up IS selecting what it held: the summon and the
    // selection are one act, so the palette and the handles agree.
    g.selection = ids.slice();
    return {
      id: nextId('summon'),
      enclosedIds: ids,
      scopeSource: source,
      scopeReasoning: reasoning,
      suggestions: makeSuggestions(ids),
      gestureIds,
      at,
      ...(onArtifact ? { onArtifact } : {}),
    };
  }

  /**
   * Content this hand drew inside the recent window — what it was just doing.
   * Another hand drawing beside it just now is not it (L2h): a merge sets the
   * hands' marks side by side in time, and the look-back swept a stranger's
   * box into a hand's group.
   */
  function recentWithin(at: number, hand: string): string[] {
    return contentIds.filter((id) => {
      if ((markHands.get(id) ?? LOCAL_PARTICIPANT) !== hand) return false;
      const n = nodes.get(id);
      if (!n || getRep(n, 'erased')) return false;
      return at - n.createdAt <= config.recentWindowMs;
    });
  }

  /**
   * A mark as the relations read it: where it stands — its reshaped clean
   * form when a hand reshaped it (V1-PLAN E1), else its ink as placed.
   */
  function markOf(id: string): Mark | null {
    const n = nodes.get(id);
    const b = n && boundsOf(n);
    if (!n || !b) return null;
    return { id, bounds: b, points: standingPointsOf(n) ?? undefined, closed: standsClosed(n) };
  }

  /**
   * What the command mark is about, when nothing was circled first.
   *
   * Reads backwards. The marks the stroke actually crossed are what you pointed
   * at; anything you drew alongside them inside the recent window comes with
   * them, because a group you just made is a group you still mean. Drawing four
   * boxes and striking through one is how you say "these four" — without having
   * to say it twice.
   */
  function scopeFromMark(
    points: Point[],
    fp: Fingerprint,
    at: number,
    hand: string
  ): { ids: string[]; source: ScopeSource; reasoning: string } | null {
    const candidates = contentIds
      .map(markOf)
      .filter((m): m is Mark => !!m && !getRep(nodes.get(m.id)!, 'erased'));

    // With no loop, the mark fires on what it CROSSES — and, for a closed
    // mark (a box, a loop, an artifact's frame: a thing you point at), on
    // what it lands inside or close beside, relative to that mark's size. An
    // open stroke is engaged only by a crossing: a letter the mark merely
    // sits near is every letter of a word being written, and a letter shaped
    // like the mark summoned the word mid-sentence (v10 F3).
    const engaged = candidates.filter((m) => {
      if (m.points && strokesIntersect(points, m.points)) return true;
      if (m.points && !m.closed) return false;
      // An artifact is engaged by a mark ON it, never one beside it: its
      // frame is large, so "close relative to its size" reached across the
      // board and swept a text into a field opened "on hello world".
      if (!m.points) return boundsOverlap(fp.bounds, m.bounds);
      if (boundsOverlap(fp.bounds, m.bounds)) return true;
      const size = Math.max(1, m.bounds.maxX - m.bounds.minX, m.bounds.maxY - m.bounds.minY);
      return boundingBoxDistance(fp.bounds, m.bounds) < size * config.gesture.checkProximityRatio;
    });
    if (engaged.length === 0) return null;

    // A mark that dwarfs everything it touched is a drawing, not a gesture.
    const union = engaged.reduce(
      (acc, m) => ({
        minX: Math.min(acc.minX, m.bounds.minX),
        minY: Math.min(acc.minY, m.bounds.minY),
        maxX: Math.max(acc.maxX, m.bounds.maxX),
        maxY: Math.max(acc.maxY, m.bounds.maxY),
      }),
      engaged[0].bounds
    );
    const scopeSize = Math.max(union.maxX - union.minX, union.maxY - union.minY);
    if (fp.size > scopeSize) return null;

    // Grow the selection through things this hand drew in the same breath —
    // what it crossed may be anyone's, what comes along with it is its own.
    const recent = new Set(recentWithin(at, hand));
    const pool = candidates.filter((m) => recent.has(m.id) || engaged.some((e) => e.id === m.id));
    const groups = clusters(pool, relate(pool));
    const ids = new Set(engaged.map((m) => m.id));
    for (const g of groups) {
      if (g.some((id) => ids.has(id))) g.forEach((id) => ids.add(id));
    }

    const grown = ids.size - engaged.length;
    return {
      ids: [...ids],
      source: grown > 0 ? 'recent' : 'crossed',
      reasoning:
        grown > 0
          ? `the mark crossed ${engaged.length}, and ${grown} more you drew alongside just now came with it`
          : `the mark crossed ${engaged.length} mark${engaged.length === 1 ? '' : 's'}`,
    };
  }

  /** The live artifact a closed stroke was drawn over, if any. */
  function liveArtifactUnder(b: Bounds, excludeId?: string): string | null {
    for (const aid of live) {
      if (aid === excludeId) continue;
      const ab = boundsOf(nodes.get(aid)!);
      if (ab && boundsOverlap(ab, b)) return aid;
    }
    return null;
  }

  /**
   * The strokes a scratch across `span` could rub out, in the order the old
   * walk of every target meets them — the same answer as `scratchedOut` over
   * `scratchTargets`, found without walking the board (PERF.md, hotspot 5).
   * Only strokes whose boxes meet the scratch's can be crossed, so the ink
   * index is asked for those and each is counted as it would have been; when
   * something was crossed enough, the targets are walked once for their order
   * (and to keep only real targets: a letter of a word inside an artifact is
   * ink but no target). Ordinary ink crosses nothing, and never walks.
   */
  function scratchHits(points: Point[], span: Bounds, excludeId: string, scale: number, analyzed: () => StrokeAnalysis): string[] {
    if (points.length < 3) return [];
    // A billionth is scratchedOut's own margin; this is wider, so the index's
    // boxes (a moved mark's frame, not its placed points) never shave a crossing.
    const pad = 1e-6 * (1 + Math.max(Math.abs(span.minX), Math.abs(span.maxX), Math.abs(span.minY), Math.abs(span.maxY)));
    // The stroke's own head, read only once something was crossed enough (erase.ts, W1).
    let head: Meeting | null | undefined;
    const meetings = (id: string): Meeting[] => {
      if (head === undefined) {
        const arrow = analyzed().results.find((r) => r.type === 'arrow');
        head = arrow?.meta ? headOf(points, arrow.meta as { head?: string; tip?: Point; tail?: Point }, HAND_RESOLUTION_PX * scale) : null;
      }
      return meetingsOf(points, scale, head, id);
    };
    const hits = new Set<string>();
    for (const id of ink.query({ minX: span.minX - pad, minY: span.minY - pad, maxX: span.maxX + pad, maxY: span.maxY + pad })) {
      if (id === excludeId) continue;
      const n = nodes.get(id)!;
      if (getRep(n, 'erased')) continue;
      const pts = standingPointsOf(n);
      if (!pts) continue;
      if (scratchedOut(points, [{ id, points: pts, closed: standsClosed(n) ?? false }], config.eraseCrossings, meetings).length) hits.add(id);
    }
    if (hits.size === 0) return [];
    return scratchTargets(excludeId).filter((t) => hits.has(t.id)).map((t) => t.id);
  }

  /**
   * Where the stroke just drawn meets a mark it crossed enough to rub out
   * (erase.ts, V1-PLAN §9 W1): its own head, when the rung reads a barb at one
   * of its ends; an end of it that lands on the mark — on a site of the mark
   * where the pen's magnet would bind it, within the magnet's reach relative
   * to the mark (a bind always follows its stroke in the log, so this is the
   * bind about to be made), or on the mark's ink within the hand's resolution;
   * and an end of the mark, when it is an open stroke, that this stroke is
   * drawn over (a wing or a chevron drawn apart, over its shaft's tip). A
   * meeting about an end is a place ON the mark, so a mark no bigger than four
   * of them offers none: a dot or a letter scratched over is scratched out
   * whole, as before.
   */
  function meetingsOf(points: Point[], scale: number, head: Meeting | null, targetId: string): Meeting[] {
    const out: Meeting[] = head ? [head] : [];
    const n = nodes.get(targetId);
    const outline = n && standingPointsOf(n);
    const b = n && boundsOf(n);
    if (!n || !outline || outline.length < 2 || !b) return out;
    const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    const closed = standsClosed(n) ?? false;
    const touch = HAND_RESOLUTION_PX * scale;
    const magnet = magnetRadius(size, scale);
    const sites = size >= 4 * magnet ? ownSitesOf(n, nodes) : [];
    for (const e of [points[0], points[points.length - 1]]) {
      if (sites.some((site) => Math.hypot(site.point.x - e.x, site.point.y - e.y) <= magnet)) {
        out.push({ at: e, radius: magnet, why: 'its end on a site the magnet binds' });
      } else if (size >= 4 * touch && distanceToPath(e, outline, closed) <= touch) {
        out.push({ at: e, radius: touch, why: "its end on the mark's ink" });
      }
    }
    if (!closed && size >= 4 * touch) {
      const own = connectorEnds(n, nodes);
      const ends = [outline[0], outline[outline.length - 1], ...(own ? [own.start, own.end] : [])];
      for (const f of ends) {
        if (distanceToPath(f, points) <= touch) out.push({ at: f, radius: touch, why: "the mark's own end, drawn over" });
      }
    }
    return out;
  }

  /** Whether a closed stroke's box holds any other mark on the content plane — what makes it a loop that may wait. */
  function enclosesAny(b: Bounds, excludeId: string): boolean {
    for (const id of reach.query(b)) {
      if (id === excludeId) continue;
      const inner = boundsOf(nodes.get(id)!);
      if (inner && boundsContain(b, inner)) return true;
    }
    return false;
  }

  // ===== Event application (the reducer — all mutation lives here) =====

  function applyStroke(ev: Extract<SessionEvent, { type: 'stroke' }>): string {
    const { points, at } = ev;
    const pid = ev.participantId ?? LOCAL_PARTICIPANT;
    const scale = ev.scale && ev.scale > 0 ? ev.scale : 1;
    const fp = getFingerprint(points, scale);
    const node: MMNode = {
      id: nextId('stroke'),
      reps: [
        { modality: 'stroke', data: { points, at, scale }, source: pid },
        { modality: 'fingerprint', data: fp, source: TIER0_PARTICIPANT },
      ],
      edges: [{ to: pid, rel: 'made-by' }],
      capability: 0,
      createdAt: at,
    };
    nodes.set(node.id, node);
    ink.set(node.id, fp.bounds);
    // Whose gesture this stroke can be: its hand's, never the board's. Every
    // gesture read below is that hand's — its waiting loop, its mark, what it
    // just drew, its summon — and nothing another hand holds is touched.
    const hand = handOf(ev);
    const g = gesturesOf(hand);
    markHands.set(node.id, hand);

    // Declared content is never a gesture. Lassoing, commanding and scratching
    // out are commitments, and a stroke whose author said "this is a drawing"
    // — a model's arrow that happens to cross a box three times, a model's loop
    // around some marks — must not erase, select or summon. Who drew it does
    // not decide this (participants are one class, v6 §3); what they declared
    // does. `agent.draw()` always declares it.
    const byHand = !ev.content;

    // --- Gesture resolution first: does this stroke complete its hand's pending lasso? ---
    if (g.pendingLasso && byHand) {
      const lassoNode = nodes.get(g.pendingLasso.id)!;
      const lassoFp = fingerprintOf(lassoNode)!;
      const lassoPoints = strokePointsOf(lassoNode) ?? [];
      // No scale correction is needed here any more: every term in the gesture
      // rule is a ratio of the lasso's own size, so it is zoom-free by
      // construction rather than by compensation.
      const gestureConfig = { ...config.gesture, commandMark: g.commandMark };
      const strokePair = { check: points, lasso: lassoPoints };
      if (resolvesLasso(fp, at, lassoFp, g.pendingLasso.at, gestureConfig, strokePair)) {
        // Retroactivity: the lasso was a gesture all along. Both strokes get
        // gesture reps and leave the content plane; their ink and prior
        // candidate edges remain (provenance, principle 9).
        node.reps.push({
          modality: 'gesture',
          data: { role: g.commandMark ? 'command' : 'check' },
          source: g.commandMark ? `command-mark:${g.commandMark.name}` : 'heuristic',
        });
        lassoNode.reps.push({ modality: 'gesture', data: { role: 'lasso' }, source: 'heuristic' });
        removeFromContent(lassoNode.id);

        const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
        g.summon = buildSummon(
          enclosedIds,
          'lasso',
          `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? '' : 's'}`,
          [lassoNode.id, node.id],
          lassoFp.bounds,
          lassoNode.id,
          at,
          g
        );
        g.pendingLasso = null;
        g.markMiss = null;
        recomputeClusterCandidates();
        return node.id;
      }
      // It did not resolve the lasso. Fall through — it may still be the mark,
      // acting on what was drawn just now — and remember why, if it is not.
      g.markMiss = whyNotResolved(fp, at, lassoFp, g.pendingLasso.at, gestureConfig, strokePair);
    } else {
      g.markMiss = null;
    }

    // --- The mark, with nothing circled first. It reads BACKWARDS: what did
    //     this stroke cross, and what did this hand draw alongside it just now? ---
    if (byHand && matchesCommandMark(fp, g.commandMark ?? BUILTIN_COMMAND_MARK).match) {
      const scope = scopeFromMark(points, fp, at, hand);
      if (scope) {
        node.reps.push({
          modality: 'gesture',
          data: { role: g.commandMark ? 'command' : 'check', scope: scope.source },
          source: g.commandMark ? `command-mark:${g.commandMark.name}` : 'heuristic',
        });
        const union = getBounds(
          scope.ids.flatMap((id) => {
            const b = boundsOf(nodes.get(id)!)!;
            return [
              { x: b.minX, y: b.minY },
              { x: b.maxX, y: b.maxY },
            ];
          })
        );
        g.summon = buildSummon(scope.ids, scope.source, scope.reasoning, [node.id], union, node.id, at, g);
        g.pendingLasso = null;
        g.markMiss = null;
        recomputeClusterCandidates();
        return node.id;
      }
    }

    // --- Scratch-out: did this stroke cross something enough times to rub it
    //     out? Relational, not gestural — see erase.ts. Runs on every stroke
    //     because ordinary ink crosses nothing and costs nothing to test. ---
    //
    //     Targets are INK, not artifacts. An artifact has no stroke of its own,
    //     so scratching one would have to test its bounding box — and a mark
    //     merely tangent to that box would rub out a whole page. Scratching
    //     across a member erases the member and degrades its artifact, which is
    //     both safer and truer: the doodles are what decompose the artifact.
    //
    //     A CLOSED stroke is never a scratch — it is a lasso. Closure already
    //     does most of the discriminating everywhere else in the engine, and
    //     without this rule a loop that grazes a shape's edge tangentially can
    //     count six crossings and rub out what the user meant to select.
    //     And crossings made where the stroke MEETS a mark — its head arriving,
    //     an end landing on it — are not a scratch (erase.ts, W1), so the
    //     shape rung is asked, once, when something was crossed enough.
    let analysis: StrokeAnalysis | undefined;
    const analyzed = () => (analysis ??= analyzeStroke(points, scale));
    const scratched = fp.isClosed || !byHand
      ? []
      : scratchHits(points, fp.bounds, node.id, scale, analyzed);
    if (scratched.length > 0) {
      node.reps.push({
        modality: 'gesture',
        data: { role: 'scratch', erased: scratched },
        source: 'heuristic',
      });
      g.pendingLasso = null;
      g.summon = null;
      for (const id of scratched) eraseNode(id, at);
      return node.id;
    }

    // --- Not a gesture: this is content. A hand drawing past its own summon
    //     dissolves it — when it is the hand drawing; a model adding a mark
    //     while the human is still choosing takes nothing away from them, and
    //     another hand drawing meanwhile takes nothing from either. ---
    if (byHand) { g.summon = null; g.selection = []; }
    contentPush(node.id);

    // Multi-parse: every qualifying recognition becomes a held 'resembles' edge.
    const { results } = analyzed();
    for (const r of results) {
      node.edges.push({
        to: typeNodeId(r.type),
        rel: 'resembles',
        weight: r.confidence,
        via: TIER0_PARTICIPANT, // even the heuristics are a participant
        reasoning: r.reasoning, // grounded "why", carried with the claim
      } satisfies Edge);
    }

    // What a detector measured beyond its label — an arrow's tip and tail —
    // is kept on the node so the rungs above can read it as fact.
    for (const r of results) {
      if (r.meta) node.reps.push({ modality: `reading:${r.type}`, data: r.meta, source: TIER0_PARTICIPANT });
    }

    // Printed letters gather into a word. If this stroke joined one, the WORD
    // now stands in the content plane and this stroke is one of its parts;
    // relations belong to the word and are read live, so none are stored here.
    if (absorbIntoWord(node, fp, at, scale, hand)) {
      recomputeClusterCandidates();
      return node.id;
    }

    addSpatialEdges(node);
    inferWire(node, points, scale);

    // Held ambiguity: a closed stroke enclosing content is BOTH a content
    // candidate (edges above) and its hand's new pending lasso. That hand's
    // next stroke decides; another hand's decides nothing about it.
    //
    // A closed stroke drawn ON a live artifact is also lasso-like even when it
    // encloses no whole mark — it encloses a REGION of the running thing, which
    // is the whole point of being able to draw on top of it.
    // Only a closed stroke can be a loop, and a loop needs one mark inside it:
    // the index is asked for the marks its box meets, not the board.
    const enclosed = fp.isClosed && enclosesAny(fp.bounds, node.id) ? 1 : 0;
    const onLive = liveArtifactUnder(fp.bounds, node.id);
    g.pendingLasso =
      byHand && (isLassoLike(fp, enclosed) || (fp.isClosed && onLive)) ? { id: node.id, at } : null;

    recomputeClusterCandidates();
    return node.id;
  }

  function applyBless(ev: Extract<SessionEvent, { type: 'bless' }>): string | null {
    // A bless takes up its OWN hand's summon — whatever other hands did since,
    // and on every board (L2h). The maker of what it makes is that hand (L2f).
    const hand = handOf(ev);
    const own = gestures.get(hand);
    const summon = own?.summon;
    if (!own || !summon || summon.id !== ev.summonId) return null;

    const chosen = ev.suggestionId
      ? summon.suggestions.find((s) => s.id === ev.suggestionId)
      : undefined;

    if (chosen?.kind === 'keep-as-drawing') {
      // Un-gesture: the strokes return to the content plane as plain ink.
      for (const gid of summon.gestureIds) {
        const g = nodes.get(gid)!;
        g.reps = g.reps.filter((r) => r.modality !== 'gesture');
        contentPush(gid);
      }
      own.summon = null;
      recomputeClusterCandidates();
      return null;
    }

    const name = ev.name ?? chosen?.label;
    if (!name) return null;

    const memberIds = summon.enclosedIds;
    const memberBounds = memberIds.map((id) => boundsOf(nodes.get(id)!)!);
    const unionBounds = getBounds(
      memberBounds.flatMap((b) => [
        { x: b.minX, y: b.minY },
        { x: b.maxX, y: b.maxY },
      ])
    );

    // An artifact is made by whoever BLESSED it (V1-PLAN L2f) — the same
    // attribution a stroke gets: "local" in another hand's log means that hand
    // (`applyEvent`). Not whoever drew its marks: a hand may bless a group
    // several hands drew, and each mark stays its drawer's. With no maker
    // written, every board read an artifact as its own reader's, so the label
    // rule (`applyLabel`, `staleFor`) took the maker's word for a stranger's on
    // every other board and let a stranger's through.
    //
    // A bless is a person's act — every tier proposes, none commits — so one
    // in the ENGINE's name (the shard stands a hull at tier 1, inside its
    // hand's act) is the act of the hand whose log holds it; the engine keeps
    // its name on the word, which is its word for what it made. The edge is
    // written only for a maker other than this board's own hand, which
    // `authorOf` reads from no edge at all: a board's own blesses — every held
    // log — replay node for node. That rule is `handOf`'s, and the hand it
    // names is the one whose summon this bless took up.
    const named = ev.participantId ?? LOCAL_PARTICIPANT;
    const maker = hand;
    // Another hand's participant, made on first sight, when the edge names it.
    if (ev.by && maker === handId(ev.by)) handParticipant(ev.by);
    const artifact: MMNode = {
      id: nextId('artifact'),
      reps: [
        { modality: 'word', data: name, source: named },
        { modality: 'bounds', data: unionBounds },
        { modality: 'signature', data: signatureOf(memberIds), source: TIER0_PARTICIPANT },
      ],
      edges: [
        ...(maker !== LOCAL_PARTICIPANT ? [{ to: maker, rel: 'made-by' }] : []),
        ...memberIds.map((id) => ({ to: id, rel: 'has-part', blessed: true })),
        ...summon.gestureIds.map((id) => ({ to: id, rel: 'blessed-by' })),
        ...(chosen?.artifactId
          ? [{ to: chosen.artifactId, rel: 'instance-of', blessed: true }]
          : []),
      ],
      capability: 0,
      createdAt: ev.at,
    };
    nodes.set(artifact.id, artifact);
    markHands.set(artifact.id, hand);

    // Members join the artifact: opaque from outside, transparent within.
    // Their nodes (ink, candidates) persist; they just leave the content plane.
    for (const id of memberIds) {
      nodes.get(id)!.edges.push({ to: artifact.id, rel: 'part-of', blessed: true });
      removeFromContent(id);
    }

    contentPush(artifact.id);
    artifacts.push(artifact.id);
    definitionsChanged = true;
    // Blessing ends the selection rather than moving it onto the artifact: the
    // hand's next act on a page is usually ink over it, and a selected page
    // would catch that pointer as a drag. A page is selected by circling it.
    own.selection = [];
    own.summon = null;
    recomputeClusterCandidates();
    return artifact.id;
  }

  function applyErase(ev: Extract<SessionEvent, { type: 'erase' }>) {
    eraseNode(ev.nodeId, ev.at);
    // A route tied to it stands no more, and one that went round it is found again (D7).
    reroute([ev.nodeId]);
  }

  function eraseNode(nodeId: string, at: number) {
    const node = nodes.get(nodeId);
    // A type node is popular, not sacred, but not ink; a library pack's node is
    // the pack's content, never on the board — `unuse` is how it leaves (B3).
    if (!node || node.id.startsWith('type:') || isLibraryNode(node.id)) return;
    if (getRep(node, 'erased')) return;

    // Ink is never destroyed: the node stays in the graph, marked erased.
    node.reps.push({ modality: 'erased', data: { at }, source: 'user' });
    removeFromContent(node.id);
    ink.delete(node.id);
    definitionsChanged = true;

    const li = live.indexOf(node.id);
    if (li >= 0) live.splice(li, 1);

    // A mark that is gone is gone from every hand's gestures — whoever erased
    // it: a loop cannot wait, nor a summon hold, what is no longer there.
    for (const g of gestures.values()) {
      g.selection = g.selection.filter((id) => id !== node.id);
      if (g.pendingLasso?.id === node.id) g.pendingLasso = null;
      if (g.summon && (g.summon.enclosedIds.includes(node.id) || g.summon.gestureIds.includes(node.id))) g.summon = null;
    }

    const degrade = (artifactId: string) => {
      const artifact = nodes.get(artifactId);
      if (!artifact || getRep(artifact, 'status')) return;
      // Never a silent phantom: the artifact is demoted, visibly broken, and
      // its surviving members return to the content plane as loose ink.
      artifact.reps.push({ modality: 'status', data: 'broken', source: 'engine' });
      removeFromContent(artifactId);
      const ai = artifacts.indexOf(artifactId);
      if (ai >= 0) artifacts.splice(ai, 1);
      // It leaves the live plane too. Generated code is a contract with the
      // marks that framed it; once those marks are gone the contract is void,
      // and a page still rendering over ink that no longer exists is exactly
      // the silent phantom this degradation exists to prevent. The 'code' rep
      // stays on the node, so undo restores the whole thing.
      const li2 = live.indexOf(artifactId);
      if (li2 >= 0) live.splice(li2, 1);
      for (const e of artifact.edges) {
        if (e.rel !== 'has-part') continue;
        const member = nodes.get(e.to);
        if (member && !getRep(member, 'erased') && !inContent.has(e.to)) {
          contentPush(e.to);
        }
      }
    };

    if (isWord(node)) {
      // Erasing a word erases what it is made of — that is what was scratched.
      for (const id of lettersOf(node)) eraseNode(id, at);
    }
    for (const e of node.edges) {
      if (e.rel === 'part-of' && !e.blessed && nodes.get(e.to) && isWord(nodes.get(e.to)!)) shrinkWord(e.to, node.id);
    }

    if (artifacts.includes(node.id)) {
      // Erasing an artifact demotes it; its members survive as ink.
      degrade(node.id);
    } else {
      // Erasing a member degrades the artifact it belonged to.
      for (const e of node.edges) {
        if (e.rel === 'part-of' && e.blessed) degrade(e.to);
      }
    }

    recomputeClusterCandidates();
  }

  function applyJoin(ev: Extract<SessionEvent, { type: 'join' }>): string {
    const node = createParticipantNode(nextId('participant'), ev.kind, ev.name, ev.at, ev.capability ?? 0, ev.locality);
    nodes.set(node.id, node);
    participants.push(node.id);
    return node.id;
  }

  function applyPropose(ev: Extract<SessionEvent, { type: 'propose' }>) {
    const node = nodes.get(ev.nodeId);
    if (!node || !participants.includes(ev.participantId)) return;
    // A library pack's content is read, not read INTO: a reading is about marks.
    if (isLibraryNode(node.id)) return;
    // A reading of ink that is no longer there is about a board that no longer
    // exists (STATE-1). Checked here too, for a log that arrives out of order.
    if (getRep(node, 'erased')) return;
    // Proposals are held like every other interpretation: attributed,
    // inferred, never blessed by the act of proposing.
    for (const e of ev.edges) {
      node.edges.push({
        to: e.to,
        rel: e.rel,
        weight: e.weight,
        via: ev.participantId,
        reasoning: e.reasoning,
      });
    }
    for (const r of ev.reps ?? []) {
      // Where a connector's bindings carried it is the engine's to derive
      // (V1-PLAN E2), never a reading a participant offers.
      if (r.modality === 'follow' || r.modality === 'route') continue;
      node.reps.push({
        modality: r.modality,
        data: r.reasoning === undefined ? r.data : { ...(r.data as object), reasoning: r.reasoning },
        confidence: r.confidence,
        source: ev.participantId,
      });
    }
    // A proposal may change what the node reads as, what it links to, or —
    // a rep is any rep — where it stands: file it again and read its group again.
    if (getRep(node, 'stroke') && !ink.has(node.id)) {
      const b = boundsOf(node);
      if (b) ink.set(node.id, b);
    }
    boundsMoved(node.id);
    unsettle(node.id);
    definitionsChanged = true;
    followFrom([node.id]);
    recomputeClusterCandidates();
  }

  /**
   * A hand's word on its own ink. Held as a rep, attributed, never blessed.
   *
   * The authorship rule is checked HERE as well as at the door, for the same
   * reason `applyCode` re-checks `erased`: a merged log can carry another
   * hand's label event, and state must be a pure function of the log however
   * the logs were put together. A label whose writer is not the person who
   * made the mark — in this sitting or another (L2i) — is dropped on replay
   * exactly as it is refused at the door.
   */
  function applyLabel(ev: Extract<SessionEvent, { type: 'label' }>): string | null {
    const node = nodes.get(ev.nodeId);
    if (!node || getRep(node, 'erased')) return null;
    const pid = ev.participantId ?? LOCAL_PARTICIPANT;
    if (!samePerson(authorOf(node), pid)) return null;
    node.reps.push({ modality: 'label', data: { text: ev.text, at: ev.at }, source: pid });
    return node.id;
  }

  function applyAnswer(ev: Extract<SessionEvent, { type: 'answer' }>): string | null {
    if (!participants.includes(ev.participantId)) return null;
    // Anchored only to marks that are still there. An answer about marks the
    // human has since rubbed out would be placed beside nothing; when every
    // mark it was about is gone, the answer is refused outright (STATE-1).
    const about = ev.aboutIds.filter((id) => {
      const n = nodes.get(id);
      return !!n && !getRep(n, 'erased');
    });
    if (about.length === 0) return null;

    // Anchor the answer beside what it is about, so the reader never has to
    // hold "which marks was this for?" in their head — the placement says it.
    const subject = about
      .map((id) => boundsOf(nodes.get(id)!))
      .filter((b): b is Bounds => !!b);
    const union = subject.length
      ? getBounds(
          subject.flatMap((b) => [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.maxY },
          ])
        )
      : { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    const gap = 28;
    const width = 260;
    const bounds: Bounds = {
      minX: union.maxX + gap,
      minY: union.minY,
      maxX: union.maxX + gap + width,
      maxY: union.minY + 120,
    };

    const participant = nodes.get(ev.participantId);
    const node = createExplanationNode(
      nextId('explanation'),
      { question: ev.question, text: ev.text },
      about,
      bounds,
      ev.participantId,
      (participant?.capability ?? 0) as Capability,
      ev.at
    );
    nodes.set(node.id, node);
    explanations.push(node.id);
    return node.id;
  }

  /**
   * Line marks up, or match their sizes.
   *
   * The axis is inferred from how they already sit when it is not given: marks
   * spread wider than they are tall are a row. Spacing is made even across the
   * span the human already used, so tidying feels like straightening what is
   * there rather than relaying it out somewhere else.
   */
  function applyTidy(ev: Extract<SessionEvent, { type: 'tidy' }>) {
    const targets = ev.ids
      .map((id) => ({ id, node: nodes.get(id), bounds: nodes.get(id) ? boundsOf(nodes.get(id)!) : undefined }))
      .filter((t): t is { id: string; node: MMNode; bounds: Bounds } => !!t.node && !!t.bounds && !getRep(t.node, 'erased'));
    if (targets.length < 2) return;

    const w = (b: Bounds) => b.maxX - b.minX;
    const h = (b: Bounds) => b.maxY - b.minY;
    const span = getBounds(targets.flatMap((t) => [
      { x: t.bounds.minX, y: t.bounds.minY },
      { x: t.bounds.maxX, y: t.bounds.maxY },
    ]));
    const axis = ev.axis ?? (w(span) >= h(span) ? 'row' : 'column');

    let placed: { id: string; to: Bounds }[];

    if (ev.mode === 'equalize') {
      // The largest wins: shrinking to the smallest loses whatever detail the
      // human put in the big one.
      const tw = Math.max(...targets.map((t) => w(t.bounds)));
      const th = Math.max(...targets.map((t) => h(t.bounds)));
      placed = targets.map((t) => {
        const cx = (t.bounds.minX + t.bounds.maxX) / 2;
        const cy = (t.bounds.minY + t.bounds.maxY) / 2;
        return { id: t.id, to: { minX: cx - tw / 2, maxX: cx + tw / 2, minY: cy - th / 2, maxY: cy + th / 2 } };
      });
    } else {
      const along = (b: Bounds) => (axis === 'row' ? (b.minX + b.maxX) / 2 : (b.minY + b.maxY) / 2);
      const ordered = [...targets].sort((a, b) => along(a.bounds) - along(b.bounds));
      const sizes = ordered.map((t) => (axis === 'row' ? w(t.bounds) : h(t.bounds)));
      const total = sizes.reduce((a, b) => a + b, 0);
      const start = axis === 'row' ? span.minX : span.minY;
      const end = axis === 'row' ? span.maxX : span.maxY;
      const gap = ordered.length > 1 ? (end - start - total) / (ordered.length - 1) : 0;
      // The shared line is the mean of the centres they already had.
      const cross =
        ordered.reduce((acc, t) => acc + (axis === 'row' ? (t.bounds.minY + t.bounds.maxY) / 2 : (t.bounds.minX + t.bounds.maxX) / 2), 0) /
        ordered.length;

      let cursor = start;
      placed = ordered.map((t, i) => {
        const size = sizes[i];
        const half = (axis === 'row' ? h(t.bounds) : w(t.bounds)) / 2;
        const to: Bounds =
          axis === 'row'
            ? { minX: cursor, maxX: cursor + size, minY: cross - half, maxY: cross + half }
            : { minX: cross - half, maxX: cross + half, minY: cursor, maxY: cursor + size };
        cursor += size + gap;
        return { id: t.id, to };
      });
    }

    for (const p of placed) {
      const node = nodes.get(p.id)!;
      // A transform is the frame of a mark's INK. A mark a hand reshaped
      // stands where its clean form is (E1), and one its bindings carried
      // where they carried it (E2), so the box tidy placed is where it STANDS
      // goes, and its ink's frame is taken there by the same fit.
      const shown = cleanOf(node)?.reshaped || followMapOf(node) ? boundsOf(node) : undefined;
      const frame = shown && markFrameOf(node);
      const to = shown && frame ? refit(frame, shown, p.to) : p.to;
      node.reps = node.reps.filter((r) => r.modality !== 'transform');
      node.reps.push({ modality: 'transform', data: to, source: 'engine' });
      boundsMoved(p.id);
    }
    followFrom(placed.map((p) => p.id));
    recomputeClusterCandidates();
  }

  /** `b` taken by the fit that takes `from` to `to`, axis by axis; an axis `from` has no extent on is carried. */
  function refit(b: Bounds, from: Bounds, to: Bounds): Bounds {
    const fw = from.maxX - from.minX, fh = from.maxY - from.minY;
    const sx = fw > 0 ? (to.maxX - to.minX) / fw : 1, sy = fh > 0 ? (to.maxY - to.minY) / fh : 1;
    return {
      minX: to.minX + (b.minX - from.minX) * sx, maxX: to.minX + (b.maxX - from.minX) * sx,
      minY: to.minY + (b.minY - from.minY) * sy, maxY: to.minY + (b.maxY - from.minY) * sy,
    };
  }

  /** Every mark on the board: loose ones, and the members of artifacts. A box
   *  inside a live page is still a box, and drawn clean it IS the div's outline. */
  function snappableIds(): string[] {
    // A held lasso is a circle until the next mark says otherwise; offering to
    // draw it clean would be offering to redraw a gesture.
    const out = contentIds.filter((id) => !artifacts.includes(id) && !isPendingLasso(id));
    for (const aid of artifacts) {
      const a = nodes.get(aid);
      if (a) for (const e of a.edges) if (e.rel === 'has-part') out.push(e.to);
    }
    return out;
  }

  function candidatesAmong(ids: string[]): (SnapReading & { id: string })[] {
    const out: (SnapReading & { id: string })[] = [];
    for (const id of ids) {
      const node = nodes.get(id);
      if (!node || getRep(node, 'erased') || !getRep(node, 'stroke') || cleanOf(node)) continue;
      const r = snapReading(node, nodes);
      if (r.ok) out.push({ id, ...r });
    }
    return out;
  }

  /**
   * The doodle, drawn clean. Same shape as `applyTidy`: the ink is untouched,
   * the mark gains a rep saying what it now shows, and undo drops the rep.
   */
  function applySnap(ev: Extract<SessionEvent, { type: 'snap' }>) {
    if (ev.mode === 'raw') {
      let moved = false;
      const put: string[] = [];
      for (const id of ev.ids) {
        const node = nodes.get(id);
        if (!node) continue;
        // A reshaped form stood somewhere its ink does not (E1): the mark
        // stands on its ink again, and is filed there.
        const reshaped = !!cleanOf(node)?.reshaped;
        if (getRep(node, 'clean')) put.push(id);
        node.reps = node.reps.filter((r) => r.modality !== 'clean');
        if (reshaped) {
          boundsMoved(id);
          moved = true;
        }
      }
      // Its sites are read off its ink again, and a connector's ends: what follows them follows (E2).
      if (followFrom(put)) moved = true;
      if (moved) recomputeClusterCandidates();
      return;
    }
    const drawn: string[] = [];
    for (const c of candidatesAmong(ev.ids)) {
      const node = nodes.get(c.id)!;
      const clean = idealize(node, c.shape);
      if (!clean) continue;
      node.reps.push({ modality: 'clean', data: clean, confidence: c.weight, source: ev.participantId ?? 'engine' });
      drawn.push(c.id);
    }
    // A held form's sites are its own, and a connector drawn clean stands as its form (E2).
    if (followFrom(drawn)) recomputeClusterCandidates();
  }

  /**
   * A stroke's END tied to another mark's site — one `bound-to` edge per
   * endpoint, carrying that end and its site, with a `'bound'` rep alongside
   * carrying the same payload (the contract is stated in magnets.ts).
   *
   * The ENDPOINT identifies the claim, never the target. Keying removal by
   * target meant that binding both ends of one stroke to two sites on the
   * same rectangle left two reps and one edge, whose reason described only
   * the second end — the first claim was lost at the edge level
   * (DIRECTOR-REVIEW-2026-09-15, BIND-1). Re-binding an end moves that one
   * claim and leaves the other end exactly where it was.
   */
  function applyBind(ev: Extract<SessionEvent, { type: 'bind' }>) {
    const stroke = nodes.get(ev.strokeId);
    const target = nodes.get(ev.nodeId);
    if (!stroke || !target || ev.strokeId === ev.nodeId) return;
    const by = ev.participantId ?? LOCAL_PARTICIPANT;
    // The site is COPIED, not held: the log is the source, and a derived
    // graph that aliases an event's object could write back into it.
    const site = { kind: ev.site.kind, index: ev.site.index };
    const was = stroke.edges.find((e) => e.rel === 'bound-to' && e.end === ev.end)?.to;
    stroke.edges = stroke.edges.filter((e) => !(e.rel === 'bound-to' && e.end === ev.end));
    stroke.edges.push({
      to: ev.nodeId,
      rel: 'bound-to',
      blessed: true,
      via: by,
      end: ev.end,
      site,
      reasoning: `its ${ev.end} was released on ${ev.site.kind} ${ev.site.index} of this mark`,
    });
    stroke.reps = stroke.reps.filter((r) => !(r.modality === 'bound' && (r.data as { end?: string }).end === ev.end));
    stroke.reps.push({
      modality: 'bound',
      data: { end: ev.end, nodeId: ev.nodeId, site: { ...site } },
      source: by,
    });
    if (was && was !== ev.nodeId && !stroke.edges.some((e) => e.rel === 'bound-to' && e.to === was)) noFollowerOf(was, stroke.id);
    followerOf(ev.nodeId, stroke.id);
    // The end is carried onto its site at once (V1-PLAN E2), so the board is
    // the same whether the site's mark moved before this bind or after it.
    if (followFrom([stroke.id])) recomputeClusterCandidates();
  }

  /**
   * One end's binding let go (V1-PLAN E2): its `bound-to` edge and its
   * `'bound'` rep, keyed by the end as BIND-1 keys removal. The connector
   * keeps the map its bindings carried it by, so it stays where it stands.
   */
  function applyUnbind(ev: Extract<SessionEvent, { type: 'unbind' }>) {
    const stroke = nodes.get(ev.strokeId);
    if (!stroke) return;
    const was = stroke.edges.find((e) => e.rel === 'bound-to' && e.end === ev.end)?.to;
    if (!was) return;
    stroke.edges = stroke.edges.filter((e) => !(e.rel === 'bound-to' && e.end === ev.end));
    stroke.reps = stroke.reps.filter((r) => !(r.modality === 'bound' && (r.data as { end?: string }).end === ev.end));
    if (!stroke.edges.some((e) => e.rel === 'bound-to' && e.to === was)) noFollowerOf(was, stroke.id);
    // A routed connector with an end let go has nothing to route between (D7) — found here, not by
    // way of what is tied to what, since it may have let go of its last tie.
    if (routeRepOf(stroke)) putRoute(stroke);
  }

  // ===== Bindings follow (V1-PLAN E2; follow.ts) =====

  /**
   * Read one connector again and carry its bound ends onto their sites where
   * they stand now: its `'follow'` rep replaced (never changed in place), the
   * mark filed where it stands, its wire read again. True when it stands
   * somewhere else now.
   */
  function refollow(id: string): boolean {
    const node = nodes.get(id);
    if (!node) return false;
    const rep = followed(node, nodes);
    if (!rep) return false;
    node.reps = node.reps.filter((r) => r.modality !== 'follow');
    node.reps.push(rep);
    boundsMoved(id);
    rewire(node);
    return true;
  }

  /**
   * Everything that follows these marks, carried: the connectors bound to
   * them, those of them that are bound themselves, and on down the chain.
   * Nothing at all on a board with no binding. True when anything moved.
   */
  function followFrom(changed: readonly string[]): boolean {
    if (!boundBy.size || !changed.length) return false;
    const isBound = (id: string) => !!nodes.get(id)?.edges.some((e) => e.rel === 'bound-to');
    const moved: string[] = [];
    const n = followThrough(changed, (id) => boundBy.get(id) ?? [], isBound, (id) => {
      const did = refollow(id);
      if (did) moved.push(id);
      return did;
    });
    // What is routed is derived again from where the sites stand now (D7).
    reroute(changed.concat(moved));
    return n > 0;
  }

  // ===== Routing (V1-PLAN D7; diagram/route.ts) =====

  /**
   * The routed connectors' polylines, derived again where a change can have
   * changed them: each connector bound to something that holds a `'route'`
   * rep, when it or a mark it is tied to changed, or a mark it was routed among
   * did, or one stands now in the window it was routed in. The rep is replaced,
   * never changed in place. Nothing at all on a board with no binding.
   */
  function reroute(touched: readonly string[]): void {
    if (!boundBy.size || !touched.length) return;
    const routed = new Set<string>();
    for (const set of boundBy.values()) for (const id of set) routed.add(id);
    for (const id of [...routed].sort()) {
      const node = nodes.get(id);
      const rep = node && routeRepOf(node);
      if (!node || !rep || !routeAffectedBy(node, rep, nodes, touched)) continue;
      putRoute(node);
    }
  }

  /** The route a connector stands as now, held on it as a rep of its own (replacing the one it held). */
  function putRoute(node: MMNode, source: string = 'engine') {
    const next = deriveRoute(node, nodes, (box) => ink.query(box));
    node.reps = node.reps.filter((r) => r.modality !== 'route');
    node.reps.push({ modality: 'route', data: next, source });
  }

  /** The connectors routed, or their routing taken off (V1-PLAN D7). */
  function applyRoute(ev: Extract<SessionEvent, { type: 'route' }>) {
    for (const id of Array.isArray(ev.ids) ? ev.ids : []) {
      const node = nodes.get(id);
      if (!node) continue;
      if (ev.mode === 'raw') {
        node.reps = node.reps.filter((r) => r.modality !== 'route');
      } else if (routable(node, nodes)) {
        putRoute(node, ev.participantId ?? 'engine');
      }
    }
  }

  /**
   * The wire a connector that followed is read as, found again where it
   * stands (V1-PLAN E2): its `connects`, `points-from` and `points-to` — and
   * the `connected-by` on the marks at its old ends — taken off, and inferred
   * again from its ends as they stand now, by the rule a stroke's wire is
   * inferred by when it is drawn. So a moved box's arrow still points at it.
   */
  function rewire(node: MMNode) {
    const old = node.edges.filter((e) => e.rel === 'connects').map((e) => e.to);
    if (!old.length && !inContent.has(node.id)) return;
    if (old.length) {
      node.edges = node.edges.filter((e) => e.rel !== 'connects' && e.rel !== 'points-from' && e.rel !== 'points-to');
      for (const t of new Set(old)) {
        const tn = nodes.get(t);
        if (!tn) continue;
        tn.edges = tn.edges.filter((e) => !(e.rel === 'connected-by' && e.to === node.id));
        unsettle(t);
      }
    }
    const ends = connectorEnds(node, nodes);
    if (!ends) return;
    const scale = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale;
    const [tail, tip] = ends.tail === 'start' ? [ends.start, ends.end] : [ends.end, ends.start];
    inferWire(node, [], scale && scale > 0 ? scale : 1, [tail, tip]);
  }

  /**
   * A handle let go (V1-PLAN E1; handles.ts): the mark's clean form — the
   * one it holds, or the one it would be offered, which this same act holds —
   * reshaped in the mark's own space. The ink is never touched; the rep is
   * replaced, never changed in place, so undo drops it and the form before
   * it (or none) stands again. The mark now stands where its form is, so it
   * is filed there and its group read again, as a move is.
   */
  function applyReshape(ev: Extract<SessionEvent, { type: 'reshape' }>) {
    const node = nodes.get(ev.id);
    // A log is read, not trusted (DATA-1): a point that is not one reshapes nothing.
    if (!node || !ev.handle || !ev.to || !Number.isFinite(ev.to.x) || !Number.isFinite(ev.to.y)) return;
    // A loop that waits is a gesture in waiting, never redrawn (as `snappableIds` never offers it).
    if (isPendingLasso(ev.id)) return;
    const clean = reshapedClean(node, nodes, { kind: ev.handle.kind, index: ev.handle.index }, { x: ev.to.x, y: ev.to.y });
    if (!clean) return;
    const was = getRep(node, 'clean');
    const confidence = was?.confidence ?? snapReading(node, nodes).weight;
    node.reps = node.reps.filter((r) => r.modality !== 'clean');
    node.reps.push({ modality: 'clean', data: clean, confidence, source: ev.participantId ?? LOCAL_PARTICIPANT });
    boundsMoved(node.id);
    // What is bound to its sites follows them, and it follows its own (V1-PLAN E2).
    followFrom([node.id]);
    recomputeClusterCandidates();
  }

  // ===== Words from letters (words.ts) =====

  function wordBounds(letterIds: string[]): Bounds {
    return getBounds(letterIds.flatMap((id) => {
      const b = boundsOf(nodes.get(id)!)!;
      return [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }];
    }));
  }

  function setWordReps(word: MMNode, letterIds: string[]) {
    word.reps = word.reps.filter((r) => r.modality !== 'word-run' && r.modality !== 'bounds');
    word.reps.push({ modality: 'word-run', data: { letters: letterIds }, source: TIER0_PARTICIPANT });
    word.reps.push({ modality: 'bounds', data: wordBounds(letterIds), source: TIER0_PARTICIPANT });
    word.edges = word.edges.filter((e) => e.rel !== 'has-part' && e.rel !== 'resembles');
    for (const id of letterIds) word.edges.push({ to: id, rel: 'has-part' });
    word.edges.push({
      to: typeNodeId('text'),
      rel: 'resembles',
      weight: wordConfidence(letterIds.length),
      via: TIER0_PARTICIPANT,
      reasoning: `${letterIds.length} small strokes in a row on one line — printed letters`,
    });
    boundsMoved(word.id);
    unsettle(word.id);
  }

  /**
   * A letter is small on screen — but so is a box drawn zoomed out. What
   * tells them apart is the reading. Two grades:
   *
   *   - `neverLetter`: a stroke the shape rung confidently calls a rectangle
   *     or a triangle is a shape whatever its size, and joins no word.
   *   - `shapeAlone`: any confident shape reading — a circle, a line, an
   *     arc. An O is a circle and a letter at once, so such a stroke may JOIN
   *     a word being written; but two of them never START one. Three small
   *     bubbles and two lines drawn quickly in a row are a molecule, not a
   *     word, and the first hand-sized run of the canonical loop found that
   *     the earlier rule gathered the whole thing into one word — after which
   *     the lasso and the mark had nothing to act on.
   *
   * A word starts, then, from a stroke the rung could NOT place — an N, an
   * A, a V — and gathers the letter-like strokes written just before it.
   */
  const SHAPE_NOT_LETTER = 0.72;
  function topShape(n: MMNode): { type: string; weight: number } | null {
    const top = resemblances(n)[0];
    if (!top) return null;
    return { type: top.to.replace(/^type:/, ''), weight: top.weight ?? 0 };
  }
  function neverLetter(n: MMNode): boolean {
    const t = topShape(n);
    return !!t && (t.type === 'rectangle' || t.type === 'triangle') && t.weight >= SHAPE_NOT_LETTER;
  }
  function shapeAlone(n: MMNode): boolean {
    const t = topShape(n);
    return !!t && t.type !== 'text' && t.type !== 'art' && t.weight >= SHAPE_NOT_LETTER;
  }

  /** A content stroke that could be a letter of a word being written: small, not a gesture, not a held loop, not a shape. */
  function letterCandidate(id: string, scale: number): { node: MMNode; bounds: Bounds; at: number; scale: number } | null {
    const n = nodes.get(id);
    if (!n || isWord(n) || getRep(n, 'gesture') || isPendingLasso(id)) return null;
    const fp = fingerprintOf(n);
    const st = getRep(n, 'stroke')?.data as { at: number; scale?: number } | undefined;
    if (!fp || !st) return null;
    const sc = st.scale ?? scale;
    if (!isLetterLike(fp.bounds, sc) || neverLetter(n)) return null;
    return { node: n, bounds: fp.bounds, at: st.at, scale: sc };
  }

  // ===== What is drawing, not writing (V1-PLAN §9 W1; words.ts) =====
  //
  // The letter rules read bounds and time; three kinds of stroke are drawing
  // however letter-like their bounds: a connector, two halves of a figure, and
  // a head drawn apart from its connector. Each is read on the stroke's own
  // geometry and its neighbours', never on who drew it or how fast.

  /** The pen's own bar for a connector: the magnet binds a stroke that reads as a line, an arrow or an arc at this or more (07-input.js) — a hand's arrow reads 0.6–0.9. */
  const CONNECTOR_READING = 0.5;
  function readsAsConnector(n: MMNode): boolean {
    const t = topShape(n);
    return !!t && (t.type === 'line' || t.type === 'arrow' || t.type === 'arc') && t.weight >= CONNECTOR_READING;
  }

  function strokeScaleOf(n: MMNode): number {
    const sc = (getRep(n, 'stroke')?.data as { scale?: number } | undefined)?.scale;
    return sc && sc > 0 ? sc : 1;
  }

  function sizeOfBounds(b: Bounds): number {
    return Math.max(b.maxX - b.minX, b.maxY - b.minY);
  }

  /** The ink a mark stands as, path by path, each with whether it closes: a stroke's own, an artifact's members'. */
  function inkPathsOf(n: MMNode): [Point[], boolean][] {
    const own = standingPointsOf(n);
    if (own) return [[own, standsClosed(n) ?? false]];
    const out: [Point[], boolean][] = [];
    for (const e of n.edges) {
      if (e.rel !== 'has-part') continue;
      const m = nodes.get(e.to);
      const pts = m && standingPointsOf(m);
      if (m && pts && !getRep(m, 'erased')) out.push([pts, standsClosed(m) ?? false]);
    }
    return out;
  }

  /**
   * A mark that is not writing, and so can be what a connector connects: not a
   * word, not read as words, not a stroke the rung reads as writing — and
   * bigger than a letter, or a shape no letter is (a confident rectangle or
   * triangle). An artifact is one unless it is text.
   */
  function nonWriting(n: MMNode): boolean {
    if (isWord(n) || transcriptOf(n) || getRep(n, 'gesture') || getRep(n, 'erased')) return false;
    if (artifacts.includes(n.id)) {
      const code = [...n.reps].reverse().find((r) => r.modality === 'code')?.data as { kind?: string } | undefined;
      return code?.kind !== 'text';
    }
    const fp = fingerprintOf(n);
    if (!fp || topShape(n)?.type === 'text') return false;
    return !isLetterLike(fp.bounds, strokeScaleOf(n)) || neverLetter(n);
  }

  /** Whether a letter of a run meets a mark too — any of its ink within `r` of the mark's. */
  function letterMeets(letterId: string, m: MMNode, mb: Bounds, r: number): boolean {
    const l = nodes.get(letterId);
    const lb = l && boundsOf(l);
    if (!l || !lb || boundingBoxDistance(lb, mb) > r) return false;
    const paths = inkPathsOf(m);
    for (const [pts] of inkPathsOf(l)) {
      for (const p of pts) if (paths.some(([q, c]) => distanceToPath(p, q, c) <= r)) return true;
    }
    return false;
  }

  /**
   * Whether this connector meets what it connects (words.ts): bound at an end
   * to a mark that is not writing, or its ends arriving at such marks — on the
   * mark's ink or one of its sites, or heading into it, within the mark's
   * magnet reach. A closed mark counts at one end, met from outside it
   * (writing inside a box is the box's). A line counts only when the connector
   * meets something at both its ends — a line is written under and beside as
   * often as it is connected to, and a connector runs between two things —
   * measured as two strokes' ends meet (the reach of the smaller, as
   * figures.ts reads it), and never a line in the same box as the connector (a
   * member under its compartment line). Nor is the ground the run's other
   * letters stand on too anything connected (a caption sitting on a box).
   */
  function meetsAtAnEnd(n: MMNode, run: readonly string[]): boolean {
    for (const b of bindingsOf(n, nodes)) {
      const m = b.active ? nodes.get(b.nodeId) : undefined;
      if (m && nonWriting(m)) return true;
    }
    const ends = connectorEndsOf(n, nodes);
    const nb = boundsOf(n);
    if (!ends || !nb) return false;
    const scale = strokeScaleOf(n);
    const touch = HAND_RESOLUTION_PX * scale;
    const nSize = sizeOfBounds(nb);
    // The closed marks this connector stands inside, asked for once a line is met: a line in one of them is the box's, not connected.
    let held: string[] | undefined;
    const holders = () => (held ??= reach.query(nb).filter((id) => {
      const h = nodes.get(id)!;
      const hb = boundsOf(h);
      return id !== n.id && !!hb && boundsContain(hb, nb) && (artifacts.includes(id) || (standsClosed(h) ?? false)) && nonWriting(h);
    }));
    const meets = { closed: false, open: [false, false] };
    ends.forEach((e, k) => {
      for (const id of reach.around(e.point, (cell) => magnetRadius(cell, scale))) {
        if (id === n.id || run.includes(id)) continue;
        const m = nodes.get(id)!;
        const mb = boundsOf(m);
        if (!mb || !nonWriting(m)) continue;
        const closed = artifacts.includes(id) || (standsClosed(m) ?? false);
        const r = magnetRadius(closed ? sizeOfBounds(mb) : Math.min(nSize, sizeOfBounds(mb)), scale);
        if (distancePointToBounds(e.point, mb) > r) continue;
        if (closed && boundsContain(mb, nb)) continue;
        if (!closed && holders().some((h) => boundsContain(boundsOf(nodes.get(h)!)!, mb))) continue;
        // Where it arrives: the nearest of the mark's ink and sites.
        let q: Point | null = null, d = Infinity;
        for (const [pts, c] of inkPathsOf(m)) {
          for (let i = 1; i < pts.length + (c ? 1 : 0); i++) {
            const a = pts[i - 1], b = pts[i % pts.length];
            const abx = b.x - a.x, aby = b.y - a.y, l2 = abx * abx + aby * aby;
            const t = l2 > 0 ? Math.max(0, Math.min(1, ((e.point.x - a.x) * abx + (e.point.y - a.y) * aby) / l2)) : 0;
            const x = a.x + abx * t, y = a.y + aby * t, dd = Math.hypot(e.point.x - x, e.point.y - y);
            if (dd < d) { d = dd; q = { x, y }; }
          }
        }
        // Its sites (a box's centre is off its ink) — read only when its ink is not already under the end.
        if (d > touch) {
          for (const site of ownSitesOf(m, nodes)) {
            const dd = Math.hypot(site.point.x - e.point.x, site.point.y - e.point.y);
            if (dd < d) { d = dd; q = site.point; }
          }
        }
        if (!q || d > r) continue;
        // On it, or heading into it: within 60° of the way the connector leaves through this end.
        if (d > touch && ((q.x - e.point.x) * e.out.x + (q.y - e.point.y) * e.out.y) / d < 0.5) continue;
        if (run.some((l) => l !== n.id && letterMeets(l, m, mb, r))) continue;
        if (closed) meets.closed = true;
        else meets.open[k] = true;
      }
    });
    return meets.closed || (meets.open[0] && meets.open[1]);
  }

  /** Whether this connector is long against the x-height of the run it would join (words.ts). */
  function longAgainstRun(n: MMNode, run: readonly string[]): boolean {
    const letters = run.filter((id) => id !== n.id).map((id) => nodes.get(id)).filter((l): l is MMNode => !!l);
    const xh = xHeightOf(letters.map((l) => {
      const b = boundsOf(l);
      const h = b ? b.maxY - b.minY : 0;
      return { height: h, tiny: h / strokeScaleOf(l) < LETTER_TINY_PX, connector: readsAsConnector(l) };
    }));
    const b = boundsOf(n);
    if (xh === null || !b) return false;
    const ends = connectorEnds(n, nodes);
    const length = Math.max(ends ? Math.hypot(ends.end.x - ends.start.x, ends.end.y - ends.start.y) : 0, sizeOfBounds(b));
    return longAgainst(length, xh);
  }

  /** A connector is not a letter: it reads as one and meets what it connects at an end, or is long against the run's x-height. */
  function connectorNotLetter(n: MMNode, run: readonly string[]): boolean {
    return readsAsConnector(n) && (meetsAtAnEnd(n, run) || longAgainstRun(n, run));
  }

  /** Halves are not letters: two strokes whose ends meet, each within a share of the smaller's size of the other's, closing a figure. */
  function closesFigure(a: MMNode, b: MMNode): boolean {
    const pa = standingPointsOf(a), pb = standingPointsOf(b);
    const ba = boundsOf(a), bb = boundsOf(b);
    if (!pa || !pb || pa.length < 2 || pb.length < 2 || !ba || !bb) return false;
    const limit = FIGURE_MEET_SHARE * Math.min(sizeOfBounds(ba), sizeOfBounds(bb));
    if (!endsPairUp([pa[0], pa[pa.length - 1]], [pb[0], pb[pb.length - 1]], limit)) return false;
    return figuresAmong(nodes, [a.id, b.id]).some((f) => f.shape !== 'polygon' && f.ids.includes(a.id) && f.ids.includes(b.id));
  }

  /**
   * Two strokes that are one drawing, and neither of them a letter: halves of
   * a figure, or a connector and its head drawn apart right before or after it
   * — within the word window, the time a run of letters is written in.
   */
  function oneDrawing(a: MMNode, b: MMNode): boolean {
    if (getRep(a, 'erased') || getRep(b, 'erased')) return false;
    const atOf = (n: MMNode) => (getRep(n, 'stroke')?.data as { at?: number } | undefined)?.at ?? n.createdAt;
    const together = Math.abs(atOf(b) - atOf(a)) <= WORD_WINDOW_MS;
    return (together && (headApartAt(a, b, nodes) !== null || headApartAt(b, a, nodes) !== null)) || closesFigure(a, b);
  }

  /**
   * Letters a later stroke showed were never letters leave their word (W1):
   * back on the content plane just before `before` — where they were drawn,
   * in the order drawn — related and wired as a stroke drawn there is. A word
   * left with one letter dissolves, as it does when a letter is erased.
   */
  function releaseLetters(word: MMNode, ids: readonly string[], before: string) {
    const keep = lettersOf(word).filter((id) => !ids.includes(id));
    for (const id of ids) {
      const n = nodes.get(id)!;
      n.edges = n.edges.filter((e) => !(e.rel === 'part-of' && e.to === word.id));
    }
    if (keep.length >= 2) setWordReps(word, keep);
    else {
      contentSpread(word.id, keep);
      for (const id of keep) {
        const n = nodes.get(id)!;
        n.edges = n.edges.filter((e) => !(e.rel === 'part-of' && e.to === word.id));
      }
      word.reps.push({ modality: 'status', data: 'dissolved', source: 'engine' });
      word.edges = word.edges.filter((e) => e.rel !== 'has-part');
    }
    contentInsertBefore(before, ids);
    for (const id of ids) {
      const n = nodes.get(id)!;
      const st = getRep(n, 'stroke')?.data as { points: Point[] };
      addSpatialEdges(n);
      inferWire(n, st.points, strokeScaleOf(n));
    }
  }

  /**
   * The stroke just made: does it continue a word, or start one with the strokes before it?
   *
   * A word is ONE hand's run (V1-PLAN L2g), so the run is read over the marks
   * this stroke's maker made, never the board's last mark whoever made it: a
   * merge interleaves the hands' events by time, and the mark just before her
   * next letter may be his — taken for the last letter of her run, it joined
   * her word or broke it in two. The word is made by the hand that wrote its
   * letters, on every board (the gathering wrote the local participant whoever
   * wrote them, so her word read as the reader's everywhere else, and the
   * label rule took her word on it for a stranger's). A board's own words name
   * its own hand as they always did, so every held log replays node for node.
   *
   * And a stroke that is drawing is no letter, however letter-like its bounds
   * (W1, above): a connector, two halves of a figure, a head drawn apart. So
   * the run is read on each stroke's ends as well as its bounds — a stroke
   * that closes a figure with the word's last letter, or is its head, takes
   * that letter back out of the word with it.
   */
  function absorbIntoWord(node: MMNode, fp: Fingerprint, at: number, scale: number, hand: string): boolean {
    if (!isLetterLike(fp.bounds, scale) || neverLetter(node)) return false;
    const maker = authorOf(node);
    // This hand's marks on the plane, newest first, walked back only as far as
    // the run reaches — a word is written in the last few marks, and taking
    // every mark on the board to find them was a walk of the board per letter.
    const mine = (function* () {
      for (let i = contentIds.length - 1; i >= 0; i--) {
        const id = contentIds[i];
        if (id !== node.id && authorOf(nodes.get(id)!) === maker) yield id;
      }
    })();
    const walked: string[] = [];
    const behind = (k: number): string | undefined => {
      while (walked.length <= k) {
        const step = mine.next();
        if (step.done) return undefined;
        walked.push(step.value);
      }
      return walked[k];
    };
    const prevId = behind(0);
    if (!prevId) return false;
    const prev = nodes.get(prevId)!;
    const letter = { bounds: fp.bounds, at };

    if (isWord(prev)) {
      const letters = lettersOf(prev);
      const last = nodes.get(letters[letters.length - 1])!;
      const lastAt = (getRep(last, 'stroke')?.data as { at: number }).at;
      // Drawn right after the word's last letter, this stroke may show that
      // letter was never one: the other half of its figure, or its head.
      if (at - lastAt <= WORD_WINDOW_MS && oneDrawing(last, node)) {
        releaseLetters(prev, [last.id], node.id);
        return false;
      }
      const j = joinsRun({ bounds: boundsOf(prev)!, lastAt }, letter, scale);
      if (!j.ok || connectorNotLetter(node, letters)) return false;
      letters.push(node.id);
      setWordReps(prev, letters);
      node.edges.push({ to: prev.id, rel: 'part-of', reasoning: j.reasoning });
      removeFromContent(node.id);
      return true;
    }

    const first = letterCandidate(prevId, scale);
    if (!first) return false;
    // Two confident shapes side by side are a drawing. A word needs a letter
    // the rung could not read as a shape — in this stroke or the one before.
    if (shapeAlone(node) && shapeAlone(prev)) return false;
    const j = joinsRun({ bounds: first.bounds, lastAt: first.at }, letter, scale);
    if (!j.ok) return false;
    // Nor is a stroke that is drawing a letter: halves of a figure, a head and
    // its connector — this stroke and the one before, or that one and the one
    // before it — and a connector (W1).
    if (oneDrawing(prev, node)) return false;
    const before = behind(1);
    if (before && oneDrawing(nodes.get(before)!, prev)) return false;
    if (connectorNotLetter(node, [prevId]) || connectorNotLetter(prev, [node.id])) return false;

    // Gather back: the letters this hand wrote just before these two, while
    // each still sits on the run's line and came within the window of the
    // next — and is no drawing.
    const run = [first];
    let bounds = first.bounds;
    for (let k = 1; ; k++) {
      const id = behind(k);
      if (!id) break;
      const cand = letterCandidate(id, scale);
      if (!cand) break;
      const back = joinsRun({ bounds, lastAt: cand.at }, { bounds: cand.bounds, at: run[0].at }, cand.scale);
      if (!back.ok) break;
      const earlier = behind(k + 1);
      if (earlier && oneDrawing(nodes.get(earlier)!, cand.node)) break;
      if (connectorNotLetter(cand.node, [...run.map((r) => r.node.id), node.id])) break;
      run.unshift(cand);
      bounds = { minX: Math.min(bounds.minX, cand.bounds.minX), minY: Math.min(bounds.minY, cand.bounds.minY), maxX: Math.max(bounds.maxX, cand.bounds.maxX), maxY: Math.max(bounds.maxY, cand.bounds.maxY) };
    }
    const letterIds = run.map((r) => r.node.id).concat(node.id);

    // The word takes their place in the content plane, where the first
    // letter stood, so reading order is where the writing began. It is made
    // by the hand that wrote them.
    const word: MMNode = { id: nextId('word'), reps: [], edges: [{ to: maker, rel: 'made-by' }], capability: 0, createdAt: at };
    nodes.set(word.id, word);
    markHands.set(word.id, hand);
    setWordReps(word, letterIds);
    for (const id of letterIds) {
      nodes.get(id)!.edges.push({ to: word.id, rel: 'part-of', reasoning: j.reasoning });
    }
    contentReplace(letterIds[0], word.id);
    for (const id of letterIds.slice(1)) removeFromContent(id);
    const own = gestures.get(hand);
    if (own && own.pendingLasso?.id === node.id) own.pendingLasso = null;
    return true;
  }

  /** A letter left (erased, or the word split): shrink the word, or dissolve it. */
  function shrinkWord(wordId: string, without: string | null) {
    const word = nodes.get(wordId);
    if (!word || !isWord(word)) return;
    const letters = lettersOf(word).filter((id) => id !== without && !getRep(nodes.get(id)!, 'erased'));
    if (letters.length >= 2 && without !== null) {
      setWordReps(word, letters);
      return;
    }
    // Dissolve: the surviving letters go back where the word stood.
    contentSpread(wordId, letters);
    for (const id of letters) {
      const n = nodes.get(id)!;
      n.edges = n.edges.filter((e) => !(e.rel === 'part-of' && e.to === wordId));
    }
    word.reps.push({ modality: 'status', data: 'dissolved', source: 'engine' });
    word.edges = word.edges.filter((e) => e.rel !== 'has-part');
  }

  // ===== Selection and direct manipulation =====

  /** A hand selects outright: its own selection, never another's (L2h). */
  function applySelect(ev: Extract<SessionEvent, { type: 'select' }>) {
    gesturesOf(handOf(ev)).selection = ev.ids.filter((id) => inContent.has(id));
  }

  /**
   * A move, a scale or a turn (manipulate.ts): each stroke it moves — a
   * stroke itself, or an artifact's or a word's members — gains its transform
   * and turn, by the very function a surface's preview of the drag runs; and
   * what is bound to what moved follows it (V1-PLAN E2).
   */
  function applyManipulation(ev: Extract<SessionEvent, { type: 'move' | 'scale' | 'rotate' }>) {
    const moved: string[] = [];
    const m = manipulationOf(ev);
    for (const n of manipulableOf(nodes, ev.ids)) {
      const reps = manipulatedReps(n, m);
      if (!reps) continue;
      n.reps = reps;
      boundsMoved(n.id);
      refreshWordBounds(n);
      moved.push(n.id);
    }
    followFrom(moved);
    recomputeClusterCandidates();
  }

  /** A moved letter moves its word's bounds with it. */
  function refreshWordBounds(letter: MMNode) {
    for (const e of letter.edges) {
      if (e.rel !== 'part-of') continue;
      const w = nodes.get(e.to);
      if (w && isWord(w)) setWordReps(w, lettersOf(w));
    }
  }

  function applySplit(ev: Extract<SessionEvent, { type: 'split' }>) {
    shrinkWord(ev.nodeId, null);
  }

  /**
   * A correction lands on the definition as examples, and the candidates are
   * read again. A library pack's definition is corrected as a taught one is
   * (B3): *Not a molecule* on this board is remembered on this board, and
   * kept through an `unuse` for the pack's next use.
   */
  function applyCorrect(ev: Extract<SessionEvent, { type: 'correct' }>) {
    const def = nodes.get(ev.definitionId);
    if (!def || !(artifacts.includes(ev.definitionId) || isPackDefinition(def))) return;
    const ids = ev.ids.filter((id) => nodes.has(id));
    if (ids.length === 0) return;
    const sig = signatureOf(ids);
    const prev = getRep(def, 'examples')?.data as Examples | undefined;
    def.reps = def.reps.filter((r) => r.modality !== 'examples');
    def.reps.push({
      modality: 'examples',
      data: addExample(prev, sig, ev.verdict),
      source: ev.participantId ?? LOCAL_PARTICIPANT,
    });
    definitionsChanged = true;
    recomputeClusterCandidates();
    // The corrector's own summon, open on these very marks, reads its matches
    // again, so the offer the human just refused is gone from the palette
    // rather than waiting for the next mark. Another hand's field is its own.
    const summon = gestures.get(handOf(ev))?.summon;
    if (summon && sameSet(summon.enclosedIds, ids)) {
      summon.suggestions = summon.suggestions.filter((g) => g.kind !== 'match');
      summon.suggestions.unshift(...makeSuggestions(ids).filter((g) => g.kind === 'match'));
    }
  }

  /**
   * A clock lives on an artifact: a definition whose instances move, or a
   * live artifact whose code runs. Play is the bless: until a hand has played
   * it, nothing of it moves or runs (I9). A pause carries the reason
   * when something other than a hand stopped it — a throw, a budget — so the
   * board says why a thing went still.
   */
  function applyClock(ev: Extract<SessionEvent, { type: 'clock' }>) {
    if (!artifacts.includes(ev.nodeId) && !live.includes(ev.nodeId)) return;
    const prev = clocks[ev.nodeId] ?? { playing: false, seed: 1, at: ev.at };
    switch (ev.op) {
      case 'play': clocks[ev.nodeId] = { playing: true, seed: prev.seed, at: ev.at }; break;
      case 'pause': clocks[ev.nodeId] = { playing: false, seed: prev.seed, at: ev.at, ...(ev.reason ? { reason: ev.reason } : {}) }; break;
      case 'reset': clocks[ev.nodeId] = { playing: prev.playing, seed: prev.seed, at: ev.at }; break;
      case 'seed': clocks[ev.nodeId] = { playing: prev.playing, seed: ev.seed ?? prev.seed, at: ev.at }; break;
    }
  }

  /**
   * A frame is an artifact that REFERENCES its members: they keep their own
   * place on the board, and the frame carries their ids, the wiring, and a
   * signature over what they are, so a frame built once can be offered again.
   */
  function applyFrame(ev: Extract<SessionEvent, { type: 'frame' }>): string | null {
    const members = ev.ids.filter((id) => artifacts.includes(id) && !getRep(nodes.get(id)!, 'erased'));
    if (members.length < 1 || !ev.name.trim()) return null;
    const pid = ev.participantId ?? LOCAL_PARTICIPANT;
    const bs = members.map((id) => boundsOf(nodes.get(id)!)).filter((b): b is NonNullable<typeof b> => !!b);
    const union = bs.length ? getBounds(bs.flatMap((b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }])) : null;
    const frame: MMNode = {
      id: nextId('frame'),
      reps: [
        { modality: 'word', data: ev.name.trim(), source: pid },
        { modality: 'frame', data: { members, connections: ev.connections.filter((c) => members.includes(c.from.id) && members.includes(c.to.id)) }, source: pid },
        { modality: 'signature', data: signatureOf(members), source: TIER0_PARTICIPANT },
        ...(union ? [{ modality: 'bounds', data: union, source: TIER0_PARTICIPANT }] : []),
      ],
      edges: [
        { to: pid, rel: 'made-by' },
        ...members.map((id) => ({ to: id, rel: 'refers-to', blessed: true })),
      ],
      capability: 0,
      createdAt: ev.at,
    };
    nodes.set(frame.id, frame);
    artifacts.push(frame.id);
    definitionsChanged = true;
    return frame.id;
  }

  /**
   * A file becomes an artifact with no members: its bounds are where it was
   * placed, its code rep carries the kind, the content and the path. Textual
   * kinds render, so they join the live plane; a picture's kind is kept so
   * the surface can show the file itself. Strokes (a traced picture) are ink,
   * declared content, attributed to whoever imported them.
   */
  function applyImport(ev: Extract<SessionEvent, { type: 'import' }>): string | null {
    const pid = ev.participantId ?? LOCAL_PARTICIPANT;
    if (!participants.includes(pid)) return null;
    if (ev.strokes && ev.strokes.length) {
      let first: string | null = null;
      let at = ev.at;
      for (const pts of ev.strokes) {
        if (!pts || pts.length < 2) continue;
        // `by` carried along, so each stroke is its hand's as the import is.
        const id = applyStroke({ type: 'stroke', points: pts, at, participantId: pid, scale: 1, content: true, ...(ev.by ? { by: ev.by } : {}) });
        if (id && !first) first = id;
        at += 1;
      }
      return first;
    }
    // A picture is held by its asset and has no code; a file by its text.
    const picture = isPictureKind(ev.kind);
    if (ev.code === undefined && !(picture && ev.asset !== undefined)) return null;
    const name = ev.name?.trim() || ev.path.split('/').pop() || ev.path;
    // What a picture names, read: an asset that is not a reference, a size that is not a number, a mime that is not an image are not kept.
    const kept: Record<string, unknown> = {};
    if (picture) {
      if (isAssetRef(ev.asset)) kept.asset = ev.asset;
      if (typeof ev.mime === 'string' && /^image\/[a-z0-9.+-]+$/i.test(ev.mime)) kept.mime = ev.mime;
      if (typeof ev.w === 'number' && Number.isFinite(ev.w) && ev.w > 0) kept.w = Math.round(ev.w);
      if (typeof ev.h === 'number' && Number.isFinite(ev.h) && ev.h > 0) kept.h = Math.round(ev.h);
    }
    const node: MMNode = {
      id: nextId('artifact'),
      reps: [
        { modality: 'word', data: name, source: pid },
        { modality: 'bounds', data: { ...ev.bounds }, source: pid },
        { modality: 'code', data: { code: ev.code ?? '', language: ev.kind, kind: ev.kind, path: ev.path, regions: [], at: ev.at, ...kept }, source: pid },
        { modality: 'signature', data: { shapes: { [ev.kind]: 1 }, links: {}, size: 1 }, source: TIER0_PARTICIPANT },
      ],
      edges: [{ to: pid, rel: 'made-by' }],
      capability: 0,
      createdAt: ev.at,
    };
    nodes.set(node.id, node);
    markHands.set(node.id, handOf(ev));
    artifacts.push(node.id);
    contentPush(node.id);
    definitionsChanged = true;
    if (!picture) live.push(node.id);
    recomputeClusterCandidates();
    return node.id;
  }

  /** A person: the local hand, another hand, or a human who joined. Not the engine, not a model — and not an id this board has never seen. */
  function isHuman(participantId: string): boolean {
    if (participantId === LOCAL_PARTICIPANT) return true;
    const p = nodes.get(participantId);
    const kind = p ? (getRep(p, 'participant')?.data as { kind?: string } | undefined)?.kind : undefined;
    return kind === 'human';
  }

  /** A behaviour lands on a definition as a rep; whether it is blessed is who gave it. */
  function applyBehave(ev: Extract<SessionEvent, { type: 'behave' }>) {
    const node = nodes.get(ev.nodeId);
    if (!node || !artifacts.includes(ev.nodeId)) return;
    const pid = ev.participantId ?? LOCAL_PARTICIPANT;
    if (!participants.includes(pid)) return;
    const terms = Array.isArray(ev.behaviour?.terms) ? ev.behaviour.terms : [];
    if (terms.length === 0 && !ev.behaviour?.code) return;
    node.reps.push({
      modality: 'behaviour',
      data: { ...ev.behaviour, terms, blessed: isHuman(pid), at: ev.at },
      source: pid,
    });
  }

  function sameSet(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const set = new Set(a);
    return b.every((x) => set.has(x));
  }

  function applySummon(ev: Extract<SessionEvent, { type: 'summon' }>): string | null {
    // The summoning hand's own: its pointed marks, or the loop IT holds (L2h).
    const g = gesturesOf(handOf(ev));
    if (ev.ids) {
      // Pointed at: the marks named, no loop involved. A tap on a match chip.
      const ids = ev.ids.filter((id) => inContent.has(id));
      const boxes = ids.map((id) => boundsOf(nodes.get(id)!)).filter((b): b is Bounds => !!b);
      if (!ids.length || !boxes.length) return null;
      const union = boxes.reduce((a, b) => ({
        minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
        maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
      }));
      const summon = buildSummon(ids, 'pointed', `you pointed at ${ids.length} mark${ids.length === 1 ? '' : 's'}`, [], union, '', ev.at, g);
      g.summon = summon;
      g.markMiss = null;
      recomputeClusterCandidates();
      return summon.id;
    }
    if (!g.pendingLasso) return null;
    const lassoNode = nodes.get(g.pendingLasso.id);
    const lassoFp = lassoNode && fingerprintOf(lassoNode);
    if (!lassoNode || !lassoFp) return null;
    // Same retroactivity as the mark: the loop was a gesture all along.
    lassoNode.reps.push({ modality: 'gesture', data: { role: 'lasso' }, source: 'heuristic' });
    removeFromContent(lassoNode.id);
    const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
    const summon = buildSummon(
      enclosedIds,
      'lasso',
      `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? '' : 's'} and asked`,
      [lassoNode.id],
      lassoFp.bounds,
      lassoNode.id,
      ev.at,
      g
    );
    g.summon = summon;
    g.pendingLasso = null;
    g.markMiss = null;
    recomputeClusterCandidates();
    return summon.id;
  }

  /** A hand's mark is the one IT taught: another hand's teaching judges only that hand's strokes (L2h). */
  function applyTeach(ev: Extract<SessionEvent, { type: 'teach' }>) {
    gesturesOf(handOf(ev)).commandMark = ev.mark;
  }

  // ===== Library packs (V1-PLAN §2.3, B3) =====
  //
  // A board uses a pack by an event, and only by an event: `use` puts the
  // pack's definitions into the matching, `unuse` takes them out, and replay,
  // undo and a room's merge carry both as they carry a stroke. A definition is
  // a node — attributed to the pack (`library:basics@1`), carrying the
  // signature its drawings read as and the accepted examples the rest of them
  // did — so it is matched, ranked and corrected by the very code a taught one
  // is. It is never on the board: not on the content plane, not an artifact,
  // not live, never erased, never read into. Its node outlasts an `unuse`, so
  // what a correction taught it holds for the pack's next use.

  /** Whether a node is a library pack's — the pack's own node or one of its definitions. */
  function isLibraryNode(id: string): boolean {
    return id.startsWith('library:');
  }

  /** A notice for a name the board uses that this build cannot give it, once per name, standing. */
  function noticePack(pack: string, reason: PackNotice['reason'], at: number) {
    if (packNotices.some((n) => n.pack === pack)) return;
    packNotices = packNotices.concat({ pack, reason, detail: describePackNotice(pack, reason), at });
  }

  /** The pack's own node: what its definitions are made by, and what the panel calls it. */
  function packNodeOf(pack: Pack, ref: string, at: number): MMNode {
    return {
      id: libraryId(ref),
      reps: [
        { modality: 'pack', data: { pack: ref, id: pack.id, version: pack.version, name: pack.name, describes: pack.describes, ...(pack.notation ? { notation: pack.notation } : {}) }, source: 'library' },
        { modality: 'word', data: pack.name, source: 'library' },
      ],
      edges: [],
      capability: 1,
      createdAt: at,
    };
  }

  /** A pack's definition as a node: its name, its signature, the other drawings as accepted examples, and the pack as its maker. */
  function definitionNodeOf(def: LibraryDefinition, at: number): MMNode {
    const by = libraryId(def.pack);
    return {
      id: def.id,
      reps: [
        { modality: 'word', data: def.name, source: by },
        { modality: 'signature', data: def.signature, source: by },
        ...(def.accepted.length ? [{ modality: 'examples', data: { accepted: def.accepted.slice(), rejected: [] } as Examples, source: by }] : []),
        {
          modality: 'pack-definition',
          data: {
            pack: def.pack, definition: def.name,
            ...(def.describes !== undefined ? { describes: def.describes } : {}),
            ...(def.role !== undefined ? { role: def.role } : {}),
            ...(def.ports !== undefined ? { ports: def.ports } : {}),
            ...(def.export !== undefined ? { export: { ...def.export } } : {}),
          },
          source: by,
        },
      ],
      edges: [{ to: by, rel: 'made-by' }],
      capability: 1,
      createdAt: at,
    };
  }

  function applyUse(ev: Extract<SessionEvent, { type: 'use' }>) {
    // Read, not trusted (DATA-1): whatever stands where a pack's name should.
    const ref = typeof ev.pack === 'string' ? ev.pack : String(ev.pack);
    if (!parsePackRef(ref)) return noticePack(ref, 'malformed', ev.at);
    if (packs.includes(ref)) return;
    const pack = packSource(ref);
    if (!pack || packRef(pack) !== ref) return noticePack(ref, 'unknown', ev.at);
    packs.push(ref);
    const pid = libraryId(ref);
    if (!nodes.has(pid)) nodes.set(pid, packNodeOf(pack, ref, ev.at));
    // What the pack's drawings read as — read once per pack, on a scratch
    // board of its own (packs/definitions.ts), never on this one.
    for (const def of libraryDefinitions(pack, () => createSession())) {
      if (!nodes.has(def.id)) nodes.set(def.id, definitionNodeOf(def, ev.at));
      library.push(def.id);
    }
    definitionsChanged = true;
    recomputeClusterCandidates();
    rereadSummonMatches();
  }

  /**
   * Every hand's open summon reads its matches again, as a correction's does
   * for its corrector (`applyCorrect`): the definitions this board matches by
   * changed for every hand, so a field open on some marks offers what the
   * board now knows them as — the pack's molecule the moment it is used, and
   * not a moment after it is stopped.
   */
  function rereadSummonMatches() {
    for (const g of gestures.values()) {
      if (!g.summon) continue;
      g.summon.suggestions = g.summon.suggestions.filter((x) => x.kind !== 'match');
      g.summon.suggestions.unshift(...makeSuggestions(g.summon.enclosedIds).filter((x) => x.kind === 'match'));
    }
  }

  function applyUnuse(ev: Extract<SessionEvent, { type: 'unuse' }>) {
    const ref = typeof ev.pack === 'string' ? ev.pack : String(ev.pack);
    // A name this build could not give the board stops being said.
    if (packNotices.some((n) => n.pack === ref)) packNotices = packNotices.filter((n) => n.pack !== ref);
    const at = packs.indexOf(ref);
    if (at < 0) return;
    packs.splice(at, 1);
    const prefix = libraryId(ref) + ':';
    library = library.filter((id) => !id.startsWith(prefix));
    definitionsChanged = true;
    recomputeClusterCandidates();
    rereadSummonMatches();
  }

  /** How many versions of code a node carries. A revision is pinned to one of these. */
  function codeVersion(nodeId: string): number {
    const node = nodes.get(nodeId);
    return node ? node.reps.filter((r) => r.modality === 'code').length : 0;
  }

  /**
   * Is this result about a board that still exists? The one place the question
   * is asked — the canonical mutation boundary, not the surface, because a
   * second surface (the MCP hand, another tab) reaches the same session by
   * the same door.
   *
   * Returns the refusal, or null to let the event through.
   */
  function staleFor(ev: SessionEvent, expect?: Expectation): StaleResult | null {
    let what: StaleResult['what'];
    let targets: string[];
    switch (ev.type) {
      case 'code': what = 'code'; targets = [ev.nodeId]; break;
      case 'propose': what = 'propose'; targets = [ev.nodeId]; break;
      // An answer may be about several marks. It is refused only when NOTHING
      // it was about is left; while one mark survives the answer still has
      // something to be anchored beside, and applyAnswer drops the rest.
      case 'answer': what = 'answer'; targets = ev.aboutIds; break;
      case 'label': what = 'label'; targets = [ev.nodeId]; break;
      default: return null;
    }
    const participantId = 'participantId' in ev ? ev.participantId : undefined;
    const at = 'at' in ev && typeof ev.at === 'number' ? ev.at : lastAt;
    // A participant's name is its 'word' rep — the name the human sees on its
    // cards, so the name the refusal says.
    const pNode = participantId ? nodes.get(participantId) : undefined;
    const name = pNode ? getRep(pNode, 'word')?.data : undefined;
    const refuse = (reason: Parameters<typeof describeStale>[0], nodeId: string, maker?: string): StaleResult => ({
      what,
      reason,
      nodeId,
      participantId,
      detail: describeStale(reason, what, typeof name === 'string' ? name : undefined, maker),
      at,
    });

    // The board itself was thrown away and another loaded: whatever holds this
    // id now is not what the request was about. Checked FIRST, because on a
    // replaced board everything else is downstream of it — the target and the
    // participant are both gone, and "who was that?" is a worse answer than
    // "the board you asked about is no longer here".
    if (expect?.generation !== undefined && expect.generation !== generation) {
      return refuse('replaced', targets[0] ?? '');
    }
    if (participantId !== undefined && !participants.includes(participantId)) {
      return refuse('unknown-participant', targets[0] ?? '');
    }
    const alive = targets.filter((id) => {
      const n = nodes.get(id);
      return !!n && !getRep(n, 'erased');
    });
    if (alive.length === 0) {
      const id = targets[0] ?? '';
      const n = nodes.get(id);
      return refuse(!n ? 'missing' : 'erased', id);
    }
    // A label is a word on your OWN ink. Naming a mark another person made is
    // blessing it, and a bless is the human's act — so the person who made the
    // mark is the only one who may label it, from this sitting or another
    // (L2i), and the refusal says whose it is (the notes, §B).
    if (ev.type === 'label') {
      const node = nodes.get(targets[0]);
      const maker = node ? authorOf(node) : LOCAL_PARTICIPANT;
      const mine = ev.participantId ?? LOCAL_PARTICIPANT;
      if (node && !samePerson(maker, mine)) {
        const makerNode = nodes.get(maker);
        const makerName = makerNode ? getRep(makerNode, 'word')?.data : undefined;
        return refuse('not-your-ink', targets[0], typeof makerName === 'string' ? makerName : maker);
      }
    }
    // A revision was written FROM a particular version; if the target has
    // moved past it, the standing newer version wins and this one is refused.
    // Only when the caller pins it — an unpinned attachment stays plural.
    if (expect?.version !== undefined && what === 'code' && codeVersion(targets[0]) !== expect.version) {
      return refuse('superseded', targets[0]);
    }
    return null;
  }

  function applyCode(ev: Extract<SessionEvent, { type: 'code' }>): string | null {
    const node = nodes.get(ev.nodeId);
    if (!node || !participants.includes(ev.participantId)) return null;
    // A library pack's content never becomes a thing on the board (B3).
    if (isLibraryNode(node.id)) return null;
    // Also checked here, not only at the door: a merged or loaded log can put
    // an erase BEFORE a code event (another hand's log arriving out of order),
    // and state must be a pure function of the log either way.
    if (getRep(node, 'erased')) return null;

    // Held, attributed, and NOT blessed — generated code is a proposal like any
    // other reading. Several participants may each attach code to the same
    // artifact; the newest is what the surface renders, all of them are kept.
    node.reps.push({
      modality: 'code',
      data: {
        code: ev.code,
        language: ev.language ?? ev.kind ?? 'html',
        kind: ev.kind ?? 'html',
        prompt: ev.prompt,
        from: ev.from,
        fill: ev.fill,
        regions: regionsOf(node, nodes),
        at: ev.at,
      },
      source: ev.participantId,
    });
    if (!live.includes(node.id)) live.push(node.id);
    // Writing taken as text stops being a definition (matchesFor).
    definitionsChanged = true;
    return node.id;
  }

  /** The id of the participant another log's events belong to: stable, from the log's name. */
  function handId(name: string): string {
    return 'participant:hand:' + name.replace(/[^A-Za-z0-9._-]+/g, '_');
  }

  /** The participant another log's events belong to, made on first sight; a stable id from the log's name. */
  function handParticipant(name: string): string {
    const id = handId(name);
    if (!nodes.has(id)) {
      // A hand in a room is one SITTING — a tab's page load, a process —
      // named `person~suffix` (`sittingName`); the person's name is what is
      // shown on its cards and readings, the suffix only tells the logs
      // apart, so a reload is a new log and the same hand.
      nodes.set(id, createParticipantNode(id, 'human', handLabel(name), lastAt));
      participants.push(id);
    }
    return id;
  }

  function applyEvent(raw: SessionEvent): string | null {
    // An event from another hand's log is that hand's: attributed to a
    // participant of the log's name unless it already says who (a model's
    // proposal in their log names their model). "Local" in their log means
    // THEM — their answers, proposals and code arrive in their name, not in
    // the name of whoever is reading.
    const pid = 'participantId' in raw ? raw.participantId : undefined;
    const ev: SessionEvent = raw.by && (!pid || pid === LOCAL_PARTICIPANT)
      ? ({ ...raw, participantId: handParticipant(raw.by) } as SessionEvent)
      : raw;
    if ('at' in ev && typeof ev.at === 'number') lastAt = Math.max(lastAt, ev.at);
    // Every id this event mints comes from the event's own authorship, never
    // from where it landed in the merge. Cleared again on the way out, so a
    // node minted outside an event can never be handed an id this event
    // already gave away.
    mint = mintKeyOf(ev);
    minted.clear();
    try {
      return applyByType(ev);
    } finally {
      mint = null;
      minted.clear();
    }
  }

  function applyByType(ev: SessionEvent): string | null {
    switch (ev.type) {
      case 'stroke': {
        const id = applyStroke(ev);
        // A mark drawn where a route was read among the marks in its way derives it again (D7).
        reroute([id]);
        return id;
      }
      case 'bless':
        return applyBless(ev);
      case 'join':
        return applyJoin(ev);
      case 'propose':
        applyPropose(ev);
        return null;
      case 'answer':
        return applyAnswer(ev);
      case 'label':
        return applyLabel(ev);
      case 'teach':
        applyTeach(ev);
        return null;
      case 'use':
        applyUse(ev);
        return null;
      case 'unuse':
        applyUnuse(ev);
        return null;
      case 'correct':
        applyCorrect(ev);
        return null;
      case 'clock':
        applyClock(ev);
        return null;
      case 'behave':
        applyBehave(ev);
        return null;
      case 'frame':
        return applyFrame(ev);
      case 'import':
        return applyImport(ev);
      case 'summon':
        return applySummon(ev);
      case 'split':
        applySplit(ev);
        return null;
      case 'select':
        applySelect(ev);
        return null;
      case 'deselect':
        gesturesOf(handOf(ev)).selection = [];
        return null;
      case 'move':
      case 'scale':
      case 'rotate':
        applyManipulation(ev);
        return null;
      case 'tidy':
        applyTidy(ev);
        return null;
      case 'snap':
        applySnap(ev);
        return null;
      case 'bind':
        applyBind(ev);
        return null;
      case 'unbind':
        applyUnbind(ev);
        return null;
      case 'route':
        applyRoute(ev);
        return null;
      case 'reshape':
        applyReshape(ev);
        return null;
      case 'code':
        return applyCode(ev);
      case 'dismiss': {
        // A hand dismisses its own field; another hand's is not its to close.
        const g = gestures.get(handOf(ev));
        if (g && g.summon?.id === ev.summonId) g.summon = null;
        return null;
      }
      case 'erase':
        applyErase(ev);
        return null;
      case 'tick':
        // Reserved: quiescence is an input the host provides; v0.x resolution
        // is event-driven (the next stroke decides), so a tick only logs time.
        return null;
    }
  }

  function replay() {
    // From the nearest checkpoint at or before the log's length; from zero
    // when there is none. Checkpoints past the log's end are stale.
    checkpoints = checkpoints.filter((c) => c.length <= events.length);
    const from = checkpoints[checkpoints.length - 1];
    let start = 0;
    if (from) { restore(from.snap); start = from.length; } else reset();
    for (let i = start; i < events.length; i++) {
      applyEvent(events[i]);
      maybeCheckpoint(i + 1);
    }
  }

  // ===== Public API =====

  function dispatch(given: SessionEvent): string | null {
    staleResult = null;
    // The tool taking its act is stamped here too, beside authorship (B1).
    const stamped: SessionEvent = actingTool !== null && given.tool === undefined
      ? { ...given, tool: actingTool.tool, ...(actingTool.offer !== undefined ? { offer: actingTool.offer } : {}) }
      : given;
    // And the act it belongs to (L2j): inside a tool's act, the act's number —
    // taken at its first event, one past the highest this sitting has seen —
    // except the field the tool closes before it writes anything else, which
    // is an event of its own, as L2e ordered it. An event that already says
    // its act was written elsewhere and keeps it.
    let raw = stamped;
    if (openAct !== null && stamped.act === undefined) {
      const closing = openAct.n === null && (stamped.type === 'dismiss' || stamped.type === 'deselect');
      if (!closing) {
        if (openAct.n === null) openAct.n = ++actHigh;
        raw = { ...stamped, act: openAct.n };
      }
    }
    sawAct(raw.act);
    // Authorship is stamped HERE, because this is the only place an event is
    // made; an event that already carries it was written elsewhere and keeps
    // what it was written with. The number is one past the sitting's
    // high-water mark for this name, which undo, a merge and a reset never
    // lower: a dropped event's number is not handed to a different one, or a
    // peer that already heard the first would hold two different marks under
    // a single id (D1).
    const ev: SessionEvent =
      myLog === undefined || raw.seq !== undefined ? raw : { ...raw, origin: myLog, seq: (highWater.get(myLog) ?? 0) + 1 };
    if (ev.origin && typeof ev.seq === 'number') sawNumber(ev.origin, ev.seq);
    events.push(ev);
    const result = applyEvent(ev);
    maybeCheckpoint(events.length);
    notify();
    return result;
  }

  /**
   * The door a deferred result comes back through. A refused result never
   * reaches the log — an event in the log is replayed, so a discarded answer
   * parked there would come back to life the moment the human undid the erase
   * that discarded it (STATE-1). It is a notice, not a throw: the board goes
   * on drawing and the surface says what happened.
   */
  function guarded(ev: SessionEvent, expect?: Expectation): string | null {
    const stale = staleFor(ev, expect);
    if (stale) {
      staleResult = stale;
      notify();
      return null;
    }
    return dispatch(ev);
  }

  function rebase(keepAt: number, tail: readonly SessionEvent[]): RebaseReport {
    const keep = Math.max(0, Math.min(Math.floor(Number(keepAt) || 0), events.length));
    if (keep === events.length && !tail.length) return { cut: false, from: keep, applied: 0 };
    staleResult = null;
    // As a load notes them: the next number this sitting writes is past them.
    for (const ev of tail) {
      if (ev.origin && typeof ev.seq === 'number') sawNumber(ev.origin, ev.seq);
      sawAct(ev.act);
    }
    let report: RebaseReport;
    if (keep === events.length) {
      // Nothing cut: each event applied as `dispatch` applies one.
      const from = events.length;
      for (const ev of tail) {
        events.push(ev);
        applyEvent(ev);
        maybeCheckpoint(events.length);
      }
      report = { cut: false, from, applied: tail.length };
    } else {
      // Something cut: back to the nearest checkpoint that holds none of it.
      // A checkpoint past `keep` was taken with events the new log does not
      // have there, so it is dropped before the replay can use it.
      checkpoints = checkpoints.filter((c) => c.length <= keep);
      if (tail.some((ev) => mintKeyOf(ev) === null)) generation++;
      events = events.slice(0, keep).concat(tail);
      const from = checkpoints.length ? checkpoints[checkpoints.length - 1].length : 0;
      replay();
      report = { cut: true, from, applied: events.length - from };
    }
    checkpointAtEnd();
    // A host that never said what its log is called: the name this log
    // remembers, as a load reads it (the last of my own events' names).
    if (!logNameSaid) {
      let remembered: string | undefined;
      for (const ev of events) if (!ev.by && ev.origin) remembered = ev.origin;
      if (remembered !== undefined) myLog = remembered;
    }
    notify();
    return report;
  }

  // ===== Undo is per hand (V1-PLAN L2j) =====
  //
  // A room's board is every hand's log merged by time, so the last event on
  // it is whoever acted last by the clocks — and undo dropped it, another
  // hand's as readily as this one's, sent nothing (this hand's log had not
  // changed), and the mark came back at the next line. Undo takes back this
  // hand's own last act: found among the events of its own log — the ones no
  // merge stamped `by` — by the order it wrote them, never by where they
  // stand. Ticks are not acts and stay, as they always did.

  /** Whether an event is this hand's to take back: its own log's (no `by`), and not a tick. */
  const ownAct = (ev: SessionEvent) => ev.by === undefined && ev.type !== 'tick';

  /** Where this hand's event with the highest number under `name` stands, or -1. */
  function highestUnder(name: string): number {
    let at = -1;
    let best = -1;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ownAct(ev) || ev.origin !== name || mintKeyOf(ev) === null) continue;
      if (at < 0 || ev.seq! > best) {
        at = i;
        best = ev.seq!;
      }
    }
    return at;
  }

  /** Where this hand's last act stands in the log: its events' places, in order; empty when it has none. */
  function lastActAt(): number[] {
    // What this sitting writes: the highest number under its log's name.
    let last = myLog !== undefined ? highestUnder(myLog) : -1;
    if (last < 0) {
      // None: what it wrote before, under another name — the name of the last
      // of its own named events in the log — the highest number there; and
      // with no names at all, the last of its own events in the log: a board
      // of one hand, taken back exactly as before.
      let named: string | undefined;
      for (let i = events.length - 1; i >= 0 && named === undefined; i--) {
        if (ownAct(events[i]) && mintKeyOf(events[i]) !== null) named = events[i].origin;
      }
      if (named !== undefined) last = highestUnder(named);
      else for (let i = events.length - 1; i >= 0 && last < 0; i--) if (ownAct(events[i])) last = i;
    }
    if (last < 0) return [];
    const top = events[last];
    if (typeof top.act !== 'number') return [last];
    // One of several written at once: all of that act — its log's own events
    // under the same name and number.
    const at: number[] = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ownAct(ev) && ev.act === top.act && ev.origin === top.origin) at.push(i);
    }
    return at;
  }

  function undo() {
    const take = lastActAt();
    if (!take.length) return;
    const first = take[0];
    const dropped = new Set(take);
    // What stands after the act is replayed again. An event there with no
    // authorship mints its ids off the replay's counter, and they may now name
    // other marks — the board is replaced for what was asked about it, as a
    // load or a merge's cut replaces it (ticks mint nothing).
    for (let i = first + 1; i < events.length; i++) {
      if (dropped.has(i) || events[i].type === 'tick' || mintKeyOf(events[i]) !== null) continue;
      generation++;
      break;
    }
    events = events.filter((_, i) => !dropped.has(i));
    // Every checkpoint past the first event taken back was taken with it in
    // the log; the replay starts from the nearest one before it.
    checkpoints = checkpoints.filter((c) => c.length <= first);
    replay();
    notify();
  }

  // ===== The hand on a connector itself (V1-PLAN E2, the director's decision) =====

  /** Write inside one act (L2j): what `fn` dispatches carries one act number — the act already open, when one is. */
  function inOneAct<T>(fn: () => T): T {
    const outermost = openAct === null;
    if (outermost) openAct = { n: null };
    try {
      return fn();
    } finally {
      if (outermost) openAct = null;
    }
  }

  /** A move, a scale or a turn, and the bound ends it walks off their sites let go first (`releasedBy`) — one act. */
  function manipulate(ev: Extract<SessionEvent, { type: 'move' | 'scale' | 'rotate' }>) {
    const releases = boundBy.size ? releasedBy(nodes, ev.ids, manipulationOf(ev)) : [];
    if (!releases.length) {
      dispatch(ev);
      return;
    }
    inOneAct(() => {
      for (const r of releases) dispatch({ type: 'unbind', strokeId: r.strokeId, end: r.end, at: ev.at });
      dispatch(ev);
    });
  }

  function getState(): SessionState {
    // The board's gestures are its reader's own: the board's own hand. Every
    // other hand's are held and replayed, and shown to nobody here (L2h).
    const reader = gestures.get(LOCAL_PARTICIPANT) ?? blankGestures(LOCAL_PARTICIPANT);
    return {
      nodes,
      contentIds: [...contentIds],
      pendingLassoId: reader.pendingLasso?.id ?? null,
      summon: reader.summon ? { ...reader.summon, enclosedIds: [...reader.summon.enclosedIds] } : null,
      // A group's candidate is kept while the group stands, so what is handed
      // out is a copy all the way down to its lists.
      clusterCandidates: settledCandidates().map((c) => ({ ...c, nodeIds: c.nodeIds.slice(), matches: c.matches.slice() })),
      artifacts: [...artifacts],
      participants: [...participants],
      explanations: [...explanations],
      commandMark: reader.commandMark,
      markMiss: reader.markMiss,
      staleResult,
      generation,
      recentIds: recentWithin(lastAt, LOCAL_PARTICIPANT),
      live: [...live],
      clocks: { ...clocks },
      selection: [...reader.selection],
      packs: [...packs],
      packNotices: packNotices.map((n) => ({ ...n })),
    };
  }

  function subscribe(listener: (state: SessionState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    addStroke: (points, at, participantId, scale, options) =>
      dispatch({ type: 'stroke', points, at, participantId, scale, content: options?.content }) as string,
    join: (kind, name, at, capability, locality) => dispatch({ type: 'join', kind, name, at, capability, ...(locality ? { locality } : {}) }) as string,
    propose: ({ expect, ...args }) => void guarded({ type: 'propose', ...args }, expect),
    answer: ({ expect, ...args }) => guarded({ type: 'answer', ...args }, expect),
    label: (args) => guarded({ type: 'label', ...args }),
    isMine: (nodeId, participantId) => {
      const node = nodes.get(nodeId);
      return !!node && samePerson(authorOf(node), participantId ?? LOCAL_PARTICIPANT);
    },
    teachCommandMark: (mark, at) => void dispatch({ type: 'teach', mark, at }),
    use: (pack, at, participantId) => {
      // Refused at the door, never written: a name that is no pack's, or one
      // this build does not ship — the log names only packs it could use.
      const ref = typeof pack === 'string' ? pack.trim() : String(pack);
      const refuse = (reason: PackNotice['reason']): PackNotice => ({ pack: ref, reason, detail: describePackRefusal(ref, reason), at });
      if (!parsePackRef(ref)) return refuse('malformed');
      const content = packSource(ref);
      if (!content || packRef(content) !== ref) return refuse('unknown');
      if (packs.includes(ref)) return null;
      dispatch({ type: 'use', pack: ref, at, ...(participantId !== undefined ? { participantId } : {}) });
      return null;
    },
    unuse: (pack, at, participantId) => {
      const ref = typeof pack === 'string' ? pack.trim() : String(pack);
      if (!packs.includes(ref) && !packNotices.some((n) => n.pack === ref)) return;
      dispatch({ type: 'unuse', pack: ref, at, ...(participantId !== undefined ? { participantId } : {}) });
    },
    correct: (args) => void dispatch({ type: 'correct', ...args }),
    clock: (args) => void dispatch({ type: 'clock', ...args }),
    behave: (args) => void dispatch({ type: 'behave', ...args }),
    frame: (args) => dispatch({ type: 'frame', ...args }),
    import: (args) => dispatch({ type: 'import', ...args }),
    matchesOf: (ids) => matchesFor(ids),
    tidy: (args) => void dispatch({ type: 'tidy', ...args }),
    snap: (args) => void dispatch({ type: 'snap', ...args }),
    bind: (args) => void dispatch({ type: 'bind', ...args }),
    unbind: (args) => {
      // A claim there is to let go of, or nothing written.
      const stroke = args && nodes.get(args.strokeId);
      if (!stroke || !stroke.edges.some((e) => e.rel === 'bound-to' && e.end === args.end)) return;
      dispatch({ type: 'unbind', strokeId: args.strokeId, end: args.end, at: args.at, ...(args.participantId !== undefined ? { participantId: args.participantId } : {}) });
    },
    route: (args) => {
      // Only what would change is written: a connector with both ends tied and not routed yet,
      // or (`'raw'`) one that is routed — never an event that does nothing.
      const raw = args?.mode === 'raw';
      const ids = (Array.isArray(args?.ids) ? args.ids : []).filter((id) => {
        const n = nodes.get(id);
        return !!n && (raw ? !!routeRepOf(n) : !routeRepOf(n) && routable(n, nodes));
      });
      if (!ids.length) return 0;
      dispatch({ type: 'route', ids, ...(raw ? { mode: 'raw' as const } : {}), at: args.at, ...(args.participantId !== undefined ? { participantId: args.participantId } : {}) });
      return ids.length;
    },
    reshape: (args) => {
      // The same function the replay runs, so what the hand was shown is what
      // is written: the handle let go at `to` on the board, kept in the
      // mark's own space. Nothing to reshape, nothing written.
      const node = args && nodes.get(args.id);
      if (!node || !args.handle || isPendingLasso(args.id)) return false;
      const handle = { kind: args.handle.kind, index: args.handle.index };
      const pv = reshapePreview(node, nodes, handle, args.to);
      if (!pv) return false;
      const pid = args.participantId !== undefined ? { participantId: args.participantId } : {};
      // What the hand does to a connector's own bindings (V1-PLAN E2, the
      // director's decision), decided here and written in the same act: its
      // own end dragged binds where a magnet holds it and lets go anywhere
      // else; moved whole, it lets go of what it no longer sits on.
      const { releases, tie } = reshapeDecision(node, nodes, handle, pv.node, pv.clean.shape, args.bind);
      const write = () => {
        for (const e of releases) dispatch({ type: 'unbind', strokeId: node.id, end: e, at: args.at, ...pid });
        dispatch({ type: 'reshape', id: args.id, handle, to: pv.to, at: args.at, ...pid });
        if (tie) dispatch({ type: 'bind', strokeId: node.id, nodeId: tie.nodeId, site: tie.site, end: tie.end, at: args.at, ...pid });
      };
      if (releases.length || tie) inOneAct(write);
      else write();
      return true;
    },
    snapCandidates: (ids) => candidatesAmong(ids ?? snappableIds()),
    attachCode: ({ expect, ...args }) => guarded({ type: 'code', ...args }, expect),
    codeVersion,
    regions: (artifactId) => {
      const node = nodes.get(artifactId);
      return node ? regionsOf(node, nodes) : [];
    },
    read: (ids) => {
      const marks = ids.map(markOf).filter((m): m is Mark => !!m);
      const relations = relate(marks);
      const shapes: Record<string, string> = {};
      const shapeConfidence: Record<string, number> = {};
      const names: Record<string, string> = {};
      const transcripts: Record<string, string> = {};
      const wires: Record<string, Wire> = {};
      for (const m of marks) {
        const n = nodes.get(m.id)!;
        // The shape rung, as the engine reads it — a blessed name outranks a guess.
        const top = resemblances(n)[0];
        shapes[m.id] = top ? top.to.replace(/^type:/, '') : 'art';
        shapeConfidence[m.id] = top?.weight ?? 0;
        const word = wordOf(n);
        if (word) names[m.id] = word;
        const said = transcriptOf(n);
        if (said) transcripts[m.id] = said;
        // Wires the session inferred when the mark was drawn, direction included.
        const ends = n.edges.filter((e) => e.rel === 'connects').map((e) => e.to);
        if (ends.length) {
          wires[m.id] = {
            ends,
            from: n.edges.find((e) => e.rel === 'points-from')?.to,
            to: n.edges.find((e) => e.rel === 'points-to')?.to,
          };
        }
      }
      const scopeIds = marks.map((m) => m.id);
      const roles = assignRoles({ ids: scopeIds, shapes, shapeConfidence, relations, wires });
      const genre = genreOf(roles);
      const scope: ConceptScope = { ids: scopeIds, marks, relations, shapes, names, transcripts, roles };
      return { scope, relations, roles, genre, concepts: matchConcepts(scope) };
    },
    tick: (at) => void dispatch({ type: 'tick', at }),
    summonHeld: (at) => dispatch({ type: 'summon', at }),
    summonMarks: (ids, at) => dispatch({ type: 'summon', ids: ids.slice(), at }),
    splitWord: (nodeId, at) => void dispatch({ type: 'split', nodeId, at }),
    select: (ids, at) => void dispatch({ type: 'select', ids, at }),
    deselect: (at) => void dispatch({ type: 'deselect', at }),
    move: (args) => manipulate({ type: 'move', ...args }),
    scale: (args) => manipulate({ type: 'scale', ...args }),
    rotate: (args) => manipulate({ type: 'rotate', ...args }),
    bless: (args) => dispatch({ type: 'bless', ...args }),
    dismiss: (summonId, at) => void dispatch({ type: 'dismiss', summonId, at }),
    erase: (nodeId, at) => void dispatch({ type: 'erase', nodeId, at }),
    undo,
    lastAct: () => lastActAt().map((i) => events[i]),
    withTool: <T>(toolId: string, fn: () => T, offerKey?: string): T => {
      const before = actingTool;
      // The outermost call is the act (L2j); a nested one writes into it.
      const outermost = openAct === null;
      if (outermost) openAct = { n: null };
      actingTool = offerKey === undefined ? { tool: toolId } : { tool: toolId, offer: offerKey };
      try {
        return fn();
      } finally {
        actingTool = before;
        if (outermost) openAct = null;
      }
    },
    load: (log) => {
      // The whole board is replaced — including `load([])`, which is how a
      // surface resets. Anything asked for against the old board is now about
      // a board that no longer exists, and says so rather than landing on
      // whatever holds that id next (STATE-1).
      generation++;
      staleResult = null;
      events = log.map((ev) => ({ ...ev }));
      checkpoints = [];
      // Pick the writing up where this log left it. When the host has not
      // said what its log is called, take the name this log remembers — my
      // own events are the ones with no `by`, a merge stamps every other
      // log's — so an autosave reopened in place goes on being one log
      // rather than splitting in two.
      if (!logNameSaid) {
        let remembered: string | undefined;
        for (const ev of events) if (!ev.by && ev.origin) remembered = ev.origin;
        if (remembered !== undefined) myLog = remembered;
      }
      // Then note the highest number already written under every name,
      // wherever in the merge it came from, so the next one this sitting
      // writes is past them — a reopened board goes on past its own log.
      // Noting only RAISES the mark: what this sitting issued and this load
      // no longer carries (an undo never sent, a reset) stays issued (D1).
      for (const ev of events) {
        if (ev.origin && typeof ev.seq === 'number') sawNumber(ev.origin, ev.seq);
        sawAct(ev.act);
      }
      replay();
      notify();
    },
    rebase,
    getState,
    subscribe,
    getEvents: () => events,
    setLogName: (name) => {
      myLog = name;
      logNameSaid = true;
    },
    logName: () => myLog ?? null,
  };
}
