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
//   - Ink is never destroyed: gesture/member/erased strokes keep their nodes.
//   - The engine is event-sourced: every input is logged, state is a pure
//     function of the log, and undo = drop the last input and replay.

import type { Bounds, Point } from '../types';
import type { Fingerprint } from '../types';
import {
  getFingerprint,
  getBounds,
  distancePointToBounds,
  boundsOverlap,
  boundingBoxDistance,
} from '../geometry';
import { analyzeStroke } from '../recognition';
import {
  type MMNode,
  type Edge,
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
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
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
import { DEFAULT_ERASE_CROSSINGS, scratchedOut } from './erase';
import { type Region, regionsOf, regionsOverlapping } from './regions';
import { type Mark, type Relation, clusters, relate } from '../relate/relations';
import { type ConceptMatch, type ConceptScope, matchConcepts } from '../concepts/concept';
import { type GenreReading, type RoleReading, type Wire, assignRoles, genreOf } from '../diagram/roles';
import { BUILTIN_COMMAND_MARK, matchesCommandMark } from './commandmark';
import { type SnapReading, idealize, snapReading, cleanOf } from './clean';

// ===== Public state shape =====

export interface Suggestion {
  id: string;
  kind: 'match' | 'name-as-new' | 'keep-as-drawing' | 'prompt';
  label: string;
  artifactId?: string; // for 'match'
  score?: number;
}

/** How the command mark decided what it was about. */
export type ScopeSource =
  /** You circled it first — an explicit selection. */
  | 'lasso'
  /** The mark crossed it. */
  | 'crossed'
  /** It came along with something the mark crossed, because you had just drawn them together. */
  | 'recent';

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

export interface ClusterCandidate {
  nodeIds: string[];
  matches: { artifactId: string; name: string; score: number }[];
}

export interface SessionState {
  /** Live view of the node graph (not a snapshot) — read, don't mutate. */
  nodes: ReadonlyMap<string, MMNode>;
  /** Nodes on the content plane (strokes not yet in artifacts, plus artifacts). */
  contentIds: string[];
  /** Stroke currently held as gesture-candidate (also still content). */
  pendingLassoId: string | null;
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
  /** The mark the user taught this session, or null while the built-in check stands. */
  commandMark: CommandMark | null;
  /**
   * Why the last stroke drawn against a waiting lasso did not summon. Cleared
   * by the next stroke. A gesture that fails silently cannot be learned.
   */
  markMiss: MarkMiss | null;
  /** Artifacts carrying a 'code' rep — the ones that render and run. */
  live: string[];
  /**
   * Content drawn inside the recent window, oldest first — "what you were just
   * doing". The command mark reads back over this.
   */
  recentIds: string[];
}

// Every event is attributed: participantId defaults to the local human.
// Humans and AI agents contribute through the SAME events — there is no
// separate "AI input" channel (one class of citizen).
export type SessionEvent =
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
    }
  | { type: 'tick'; at: number }
  | { type: 'bless'; summonId: string; name?: string; suggestionId?: string; at: number; participantId?: string }
  | { type: 'dismiss'; summonId: string; at: number; participantId?: string }
  | { type: 'erase'; nodeId: string; at: number; participantId?: string }
  | { type: 'join'; kind: ParticipantKind; name: string; at: number; capability?: Capability }
  | { type: 'propose'; participantId: string; nodeId: string; edges: ProposedEdge[]; at: number }
  | { type: 'teach'; mark: CommandMark | null; at: number }
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
      type: 'code';
      participantId: string;
      nodeId: string;
      code: string;
      language?: string;
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
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  wireEndpointRatio: 0.15,
  eraseCrossings: DEFAULT_ERASE_CROSSINGS,
  recentWindowMs: 20_000,
};

type Signature = Record<string, number>; // type histogram, e.g. { circle: 3, line: 2 }

export interface Session {
  addStroke(points: Point[], at: number, participantId?: string, scale?: number): string;
  /** Register a participant (human or AI agent). Returns its node id. */
  join(kind: ParticipantKind, name: string, at: number, capability?: Capability): string;
  /** Offer attributed, inferred edges on a node — the channel LLM tiers use. */
  propose(args: { participantId: string; nodeId: string; edges: ProposedEdge[]; at: number }): void;
  /**
   * Place an answer in the canvas, anchored to the marks it is about.
   *
   * Returns the explanation node's id. Several participants may answer the
   * same question — every answer is held, none replaces another.
   */
  answer(args: {
    participantId: string;
    question: string;
    text: string;
    aboutIds: string[];
    at: number;
  }): string | null;
  /**
   * Install (or clear) the mark that resolves a lasso. An event, not a setting:
   * teaching is part of the session's history and replays with it.
   */
  teachCommandMark(mark: CommandMark | null, at: number): void;
  /**
   * Attach generated code to an artifact — the 'code' rep that makes it live.
   * Several participants may each attach code to the same artifact; every
   * attempt is held and attributed, and the surface renders the chosen one.
   */
  attachCode(args: {
    participantId: string;
    nodeId: string;
    code: string;
    language?: string;
    prompt?: string;
    fill?: unknown;
    at: number;
  }): string | null;
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
  /** Drop the last input event and replay the log. */
  undo(): void;
  getState(): SessionState;
  subscribe(listener: (state: SessionState) => void): () => void;
  /** Full input log — state is a pure function of this. */
  getEvents(): readonly SessionEvent[];
}

export function createSession(config: SessionConfig = DEFAULT_SESSION_CONFIG): Session {
  let events: SessionEvent[] = [];
  let nodes = new Map<string, MMNode>();
  let contentIds: string[] = [];
  let artifacts: string[] = [];
  let pendingLasso: { id: string; at: number } | null = null;
  let summon: Summon | null = null;
  let clusterCandidates: ClusterCandidate[] = [];
  let participants: string[] = [];
  let explanations: string[] = [];
  let live: string[] = [];
  let commandMark: CommandMark | null = config.gesture.commandMark ?? null;
  let markMiss: MarkMiss | null = null;
  let lastAt = 0;
  let counter = 0;
  const listeners = new Set<(state: SessionState) => void>();

  function reset() {
    nodes = new Map();
    contentIds = [];
    artifacts = [];
    pendingLasso = null;
    summon = null;
    clusterCandidates = [];
    participants = [LOCAL_PARTICIPANT, TIER0_PARTICIPANT];
    explanations = [];
    live = [];
    commandMark = config.gesture.commandMark ?? null;
    markMiss = null;
    lastAt = 0;
    counter = 0;
    for (const n of createBootstrapNodes(0)) nodes.set(n.id, n);
  }
  reset();

  const nextId = (prefix: string) => `${prefix}:${++counter}`;

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

  function signatureOf(ids: string[]): Signature {
    const sig: Signature = {};
    for (const id of ids) {
      const t = topInterpretation(nodes.get(id)!) ?? 'art';
      sig[t] = (sig[t] ?? 0) + 1;
    }
    return sig;
  }

  function signaturesEqual(a: Signature, b: Signature): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
    return true;
  }

  function recomputeClusterCandidates() {
    clusterCandidates = [];
    if (artifacts.length === 0 || contentIds.length === 0) return;

    const marks = contentIds.map(markOf).filter((m): m is Mark => !!m);
    const groups = clusters(marks, relate(marks));

    for (const ids of groups) {
      // Don't offer an artifact as a match for itself.
      const strokeIds = ids.filter((id) => !artifacts.includes(id));
      if (strokeIds.length < 2) continue;
      const sig = signatureOf(strokeIds);

      const matches = artifacts
        .map((aid) => {
          const a = nodes.get(aid)!;
          const aSig = getRep(a, 'signature')?.data as Signature | undefined;
          if (!aSig || !signaturesEqual(sig, aSig)) return null;
          return { artifactId: aid, name: wordOf(a) ?? aid, score: 1 };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (matches.length > 0) clusterCandidates.push({ nodeIds: strokeIds, matches });
    }
  }

  function makeSuggestions(enclosedIds: string[]): Suggestion[] {
    const sig = signatureOf(enclosedIds);
    const suggestions: Suggestion[] = [];
    for (const aid of artifacts) {
      const a = nodes.get(aid)!;
      const aSig = getRep(a, 'signature')?.data as Signature | undefined;
      if (aSig && signaturesEqual(sig, aSig)) {
        suggestions.push({
          id: nextId('sug'),
          kind: 'match',
          label: wordOf(a) ?? aid,
          artifactId: aid,
          score: 1,
        });
      }
    }
    suggestions.push({ id: nextId('sug'), kind: 'prompt', label: 'Make…' });
    suggestions.push({ id: nextId('sug'), kind: 'name-as-new', label: 'Name this…' });
    suggestions.push({ id: nextId('sug'), kind: 'keep-as-drawing', label: 'Keep as drawing' });
    return suggestions;
  }

  /**
   * Record what Tier 0 can see between the new mark and everything else, as
   * held (unblessed) edges on both ends. This is the SAME relate() the palette
   * and the diagram rung read from — one relation system, one set of
   * thresholds, all of them ratios of the marks' own sizes.
   */
  function addSpatialEdges(node: MMNode) {
    const marks = contentIds.map(markOf).filter((m): m is Mark => !!m);
    for (const r of relate(marks)) {
      if (r.from !== node.id && r.to !== node.id) continue;
      nodes.get(r.from)?.edges.push({
        to: r.to,
        rel: r.kind,
        weight: r.strength,
        via: TIER0_PARTICIPANT,
        reasoning: r.reasoning,
      });
    }
  }

  /**
   * Wire inference (inferred-then-blessed): a line-like stroke whose endpoints
   * land near two different content nodes is held as a candidate connection.
   * The line IS the relation node (relations are nodes — core schema).
   */
  function inferWire(node: MMNode, points: Point[], scale: number) {
    const top = resemblances(node)[0];
    if (!top) return;
    const kind = top.to.replace(/^type:/, '');
    if (kind !== 'line' && kind !== 'arrow') return;

    // An arrow's ends are its tip and tail, not the stroke's first and last
    // points — the last point is the end of a wing.
    const arrow = getRep(node, 'reading:arrow')?.data as { tip: Point; tail: Point } | undefined;
    const ends = kind === 'arrow' && arrow ? [arrow.tail, arrow.tip] : [points[0], points[points.length - 1]];

    const nearest = (p: Point) => {
      let best: { id: string; d: number } | null = null;
      for (const c of contentBoundsList(node.id)) {
        const size = Math.max(c.bounds.maxX - c.bounds.minX, c.bounds.maxY - c.bounds.minY);
        const reach = Math.max(10 * scale, size * config.wireEndpointRatio);
        const d = distancePointToBounds(p, c.bounds);
        if (d < reach && (!best || d < best.d)) best = { id: c.id, d };
      }
      return best;
    };

    const a = nearest(ends[0]);
    const b = nearest(ends[1]);
    if (!a || !b || a.id === b.id) return;

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
      for (const e of n.edges) if (e.rel === 'has-part') ids.add(e.to);
    }
    return [...ids]
      .map((id) => nodes.get(id))
      .filter((n): n is MMNode => !!n && !getRep(n, 'erased') && !!strokePointsOf(n))
      .map((n) => ({
        id: n.id,
        points: strokePointsOf(n)!,
        closed: fingerprintOf(n)?.isClosed ?? false,
      }));
  }

  function buildSummon(
    ids: string[],
    source: ScopeSource,
    reasoning: string,
    gestureIds: string[],
    scopeBounds: Bounds,
    excludeId: string,
    at: number
  ): Summon {
    const artifactId = liveArtifactUnder(scopeBounds, excludeId);
    const onArtifact = artifactId
      ? {
          artifactId,
          regionIds: regionsOverlapping(regionsOf(nodes.get(artifactId)!, nodes), scopeBounds).map((r) => r.id),
        }
      : undefined;
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

  /** Content drawn inside the recent window — what the human was just doing. */
  function recentWithin(at: number): string[] {
    return contentIds.filter((id) => {
      const n = nodes.get(id);
      if (!n || getRep(n, 'erased')) return false;
      return at - n.createdAt <= config.recentWindowMs;
    });
  }

  function markOf(id: string): Mark | null {
    const n = nodes.get(id);
    const b = n && boundsOf(n);
    if (!n || !b) return null;
    return { id, bounds: b, points: strokePointsOf(n) ?? undefined, closed: fingerprintOf(n)?.isClosed };
  }

  /** Does this stroke engage that mark — cross it, overlap it, or sit close to it? */
  function engages(points: Point[], fp: Fingerprint, target: Mark): boolean {
    if (target.points && strokesIntersect(points, target.points)) return true;
    if (boundsOverlap(fp.bounds, target.bounds)) return true;
    const size = Math.max(
      1,
      Math.max(target.bounds.maxX - target.bounds.minX, target.bounds.maxY - target.bounds.minY)
    );
    return boundingBoxDistance(fp.bounds, target.bounds) < size * config.gesture.checkProximityRatio;
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
    at: number
  ): { ids: string[]; source: ScopeSource; reasoning: string } | null {
    const candidates = contentIds
      .map(markOf)
      .filter((m): m is Mark => !!m && !getRep(nodes.get(m.id)!, 'erased'));

    const engaged = candidates.filter((m) => engages(points, fp, m));
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

    // Grow the selection through things drawn in the same breath.
    const recent = new Set(recentWithin(at));
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

  function removeFromContent(id: string) {
    const idx = contentIds.indexOf(id);
    if (idx >= 0) contentIds.splice(idx, 1);
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

    // --- Gesture resolution first: does this stroke complete a pending lasso? ---
    if (pendingLasso) {
      const lassoNode = nodes.get(pendingLasso.id)!;
      const lassoFp = fingerprintOf(lassoNode)!;
      const lassoPoints = strokePointsOf(lassoNode) ?? [];
      // No scale correction is needed here any more: every term in the gesture
      // rule is a ratio of the lasso's own size, so it is zoom-free by
      // construction rather than by compensation.
      const gestureConfig = { ...config.gesture, commandMark };
      const strokePair = { check: points, lasso: lassoPoints };
      if (resolvesLasso(fp, at, lassoFp, pendingLasso.at, gestureConfig, strokePair)) {
        // Retroactivity: the lasso was a gesture all along. Both strokes get
        // gesture reps and leave the content plane; their ink and prior
        // candidate edges remain (provenance, principle 9).
        node.reps.push({
          modality: 'gesture',
          data: { role: commandMark ? 'command' : 'check' },
          source: commandMark ? `command-mark:${commandMark.name}` : 'heuristic',
        });
        lassoNode.reps.push({ modality: 'gesture', data: { role: 'lasso' }, source: 'heuristic' });
        removeFromContent(lassoNode.id);

        const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
        summon = buildSummon(
          enclosedIds,
          'lasso',
          `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? '' : 's'}`,
          [lassoNode.id, node.id],
          lassoFp.bounds,
          lassoNode.id,
          at
        );
        pendingLasso = null;
        markMiss = null;
        recomputeClusterCandidates();
        return node.id;
      }
      // It did not resolve the lasso. Fall through — it may still be the mark,
      // acting on what was drawn just now — and remember why, if it is not.
      markMiss = whyNotResolved(fp, at, lassoFp, pendingLasso.at, gestureConfig, strokePair);
    } else {
      markMiss = null;
    }

    // --- The mark, with nothing circled first. It reads BACKWARDS: what did
    //     this stroke cross, and what did you draw alongside it just now? ---
    if (matchesCommandMark(fp, commandMark ?? BUILTIN_COMMAND_MARK).match) {
      const scope = scopeFromMark(points, fp, at);
      if (scope) {
        node.reps.push({
          modality: 'gesture',
          data: { role: commandMark ? 'command' : 'check', scope: scope.source },
          source: commandMark ? `command-mark:${commandMark.name}` : 'heuristic',
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
        summon = buildSummon(scope.ids, scope.source, scope.reasoning, [node.id], union, node.id, at);
        pendingLasso = null;
        markMiss = null;
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
    const scratched = fp.isClosed
      ? []
      : scratchedOut(points, scratchTargets(node.id), config.eraseCrossings);
    if (scratched.length > 0) {
      node.reps.push({
        modality: 'gesture',
        data: { role: 'scratch', erased: scratched },
        source: 'heuristic',
      });
      pendingLasso = null;
      summon = null;
      for (const id of scratched) eraseNode(id, at);
      return node.id;
    }

    // --- Not a gesture: this is content. Drawing past a summon dissolves it. ---
    summon = null;
    contentIds.push(node.id);

    // Multi-parse: every qualifying recognition becomes a held 'resembles' edge.
    const analysis = analyzeStroke(points, scale);
    for (const r of analysis.results) {
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
    for (const r of analysis.results) {
      if (r.meta) node.reps.push({ modality: `reading:${r.type}`, data: r.meta, source: TIER0_PARTICIPANT });
    }

    addSpatialEdges(node);
    inferWire(node, points, scale);

    // Held ambiguity: a closed stroke enclosing content is BOTH a content
    // candidate (edges above) and the new pending lasso. The next event decides.
    //
    // A closed stroke drawn ON a live artifact is also lasso-like even when it
    // encloses no whole mark — it encloses a REGION of the running thing, which
    // is the whole point of being able to draw on top of it.
    const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
    const onLive = liveArtifactUnder(fp.bounds, node.id);
    pendingLasso =
      isLassoLike(fp, enclosed.length) || (fp.isClosed && onLive) ? { id: node.id, at } : null;

    recomputeClusterCandidates();
    return node.id;
  }

  function applyBless(ev: Extract<SessionEvent, { type: 'bless' }>): string | null {
    if (!summon || summon.id !== ev.summonId) return null;

    const chosen = ev.suggestionId
      ? summon.suggestions.find((s) => s.id === ev.suggestionId)
      : undefined;

    if (chosen?.kind === 'keep-as-drawing') {
      // Un-gesture: the strokes return to the content plane as plain ink.
      for (const gid of summon.gestureIds) {
        const g = nodes.get(gid)!;
        g.reps = g.reps.filter((r) => r.modality !== 'gesture');
        contentIds.push(gid);
      }
      summon = null;
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

    const artifact: MMNode = {
      id: nextId('artifact'),
      reps: [
        { modality: 'word', data: name, source: ev.participantId ?? LOCAL_PARTICIPANT },
        { modality: 'bounds', data: unionBounds },
        { modality: 'signature', data: signatureOf(memberIds), source: TIER0_PARTICIPANT },
      ],
      edges: [
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

    // Members join the artifact: opaque from outside, transparent within.
    // Their nodes (ink, candidates) persist; they just leave the content plane.
    for (const id of memberIds) {
      nodes.get(id)!.edges.push({ to: artifact.id, rel: 'part-of', blessed: true });
      removeFromContent(id);
    }

    contentIds.push(artifact.id);
    artifacts.push(artifact.id);
    summon = null;
    recomputeClusterCandidates();
    return artifact.id;
  }

  function applyErase(ev: Extract<SessionEvent, { type: 'erase' }>) {
    eraseNode(ev.nodeId, ev.at);
  }

  function eraseNode(nodeId: string, at: number) {
    const node = nodes.get(nodeId);
    if (!node || node.id.startsWith('type:')) return;
    if (getRep(node, 'erased')) return;

    // Ink is never destroyed: the node stays in the graph, marked erased.
    node.reps.push({ modality: 'erased', data: { at }, source: 'user' });
    removeFromContent(node.id);

    const li = live.indexOf(node.id);
    if (li >= 0) live.splice(li, 1);

    if (pendingLasso?.id === node.id) pendingLasso = null;
    if (
      summon &&
      (summon.enclosedIds.includes(node.id) || summon.gestureIds.includes(node.id))
    ) {
      summon = null;
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
        if (member && !getRep(member, 'erased') && !contentIds.includes(e.to)) {
          contentIds.push(e.to);
        }
      }
    };

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
    const node = createParticipantNode(nextId('participant'), ev.kind, ev.name, ev.at, ev.capability ?? 0);
    nodes.set(node.id, node);
    participants.push(node.id);
    return node.id;
  }

  function applyPropose(ev: Extract<SessionEvent, { type: 'propose' }>) {
    const node = nodes.get(ev.nodeId);
    if (!node || !participants.includes(ev.participantId)) return;
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
    recomputeClusterCandidates();
  }

  function applyAnswer(ev: Extract<SessionEvent, { type: 'answer' }>): string | null {
    if (!participants.includes(ev.participantId)) return null;
    const about = ev.aboutIds.filter((id) => nodes.has(id));
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
      node.reps = node.reps.filter((r) => r.modality !== 'transform');
      node.reps.push({ modality: 'transform', data: p.to, source: 'engine' });
    }
    recomputeClusterCandidates();
  }

  /** Every mark on the board: loose ones, and the members of artifacts. A box
   *  inside a live page is still a box, and drawn clean it IS the div's outline. */
  function snappableIds(): string[] {
    // A held lasso is a circle until the next mark says otherwise; offering to
    // draw it clean would be offering to redraw a gesture.
    const out = contentIds.filter((id) => !artifacts.includes(id) && id !== pendingLasso?.id);
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
      for (const id of ev.ids) {
        const node = nodes.get(id);
        if (node) node.reps = node.reps.filter((r) => r.modality !== 'clean');
      }
      return;
    }
    for (const c of candidatesAmong(ev.ids)) {
      const node = nodes.get(c.id)!;
      const clean = idealize(node, c.shape);
      if (!clean) continue;
      node.reps.push({ modality: 'clean', data: clean, confidence: c.weight, source: ev.participantId ?? 'engine' });
    }
  }

  function applyTeach(ev: Extract<SessionEvent, { type: 'teach' }>) {
    commandMark = ev.mark;
  }

  function applyCode(ev: Extract<SessionEvent, { type: 'code' }>): string | null {
    const node = nodes.get(ev.nodeId);
    if (!node || !participants.includes(ev.participantId)) return null;

    // Held, attributed, and NOT blessed — generated code is a proposal like any
    // other reading. Several participants may each attach code to the same
    // artifact; the newest is what the surface renders, all of them are kept.
    node.reps.push({
      modality: 'code',
      data: {
        code: ev.code,
        language: ev.language ?? 'html',
        prompt: ev.prompt,
        fill: ev.fill,
        regions: regionsOf(node, nodes),
        at: ev.at,
      },
      source: ev.participantId,
    });
    if (!live.includes(node.id)) live.push(node.id);
    return node.id;
  }

  function applyEvent(ev: SessionEvent): string | null {
    if ('at' in ev && typeof ev.at === 'number') lastAt = Math.max(lastAt, ev.at);
    switch (ev.type) {
      case 'stroke':
        return applyStroke(ev);
      case 'bless':
        return applyBless(ev);
      case 'join':
        return applyJoin(ev);
      case 'propose':
        applyPropose(ev);
        return null;
      case 'answer':
        return applyAnswer(ev);
      case 'teach':
        applyTeach(ev);
        return null;
      case 'tidy':
        applyTidy(ev);
        return null;
      case 'snap':
        applySnap(ev);
        return null;
      case 'code':
        return applyCode(ev);
      case 'dismiss':
        if (summon?.id === ev.summonId) summon = null;
        return null;
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
    reset();
    for (const ev of events) applyEvent(ev);
  }

  // ===== Public API =====

  function dispatch(ev: SessionEvent): string | null {
    events.push(ev);
    const result = applyEvent(ev);
    notify();
    return result;
  }

  function undo() {
    // Drop the most recent meaningful input and rebuild. Ticks are not
    // user actions, so they're skipped over (but kept in the log).
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type !== 'tick') {
        events = [...events.slice(0, i), ...events.slice(i + 1)];
        replay();
        notify();
        return;
      }
    }
  }

  function getState(): SessionState {
    return {
      nodes,
      contentIds: [...contentIds],
      pendingLassoId: pendingLasso?.id ?? null,
      summon: summon ? { ...summon, enclosedIds: [...summon.enclosedIds] } : null,
      clusterCandidates: clusterCandidates.map((c) => ({ ...c })),
      artifacts: [...artifacts],
      participants: [...participants],
      explanations: [...explanations],
      commandMark,
      markMiss,
      recentIds: recentWithin(lastAt),
      live: [...live],
    };
  }

  function subscribe(listener: (state: SessionState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    addStroke: (points, at, participantId, scale) =>
      dispatch({ type: 'stroke', points, at, participantId, scale }) as string,
    join: (kind, name, at, capability) => dispatch({ type: 'join', kind, name, at, capability }) as string,
    propose: (args) => void dispatch({ type: 'propose', ...args }),
    answer: (args) => dispatch({ type: 'answer', ...args }),
    teachCommandMark: (mark, at) => void dispatch({ type: 'teach', mark, at }),
    tidy: (args) => void dispatch({ type: 'tidy', ...args }),
    snap: (args) => void dispatch({ type: 'snap', ...args }),
    snapCandidates: (ids) => candidatesAmong(ids ?? snappableIds()),
    attachCode: (args) => dispatch({ type: 'code', ...args }),
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
      const wires: Record<string, Wire> = {};
      for (const m of marks) {
        const n = nodes.get(m.id)!;
        // The shape rung, as the engine reads it — a blessed name outranks a guess.
        const top = resemblances(n)[0];
        shapes[m.id] = top ? top.to.replace(/^type:/, '') : 'art';
        shapeConfidence[m.id] = top?.weight ?? 0;
        const word = wordOf(n);
        if (word) names[m.id] = word;
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
      const scope: ConceptScope = { ids: scopeIds, marks, relations, shapes, names, roles };
      return { scope, relations, roles, genre, concepts: matchConcepts(scope) };
    },
    tick: (at) => void dispatch({ type: 'tick', at }),
    bless: (args) => dispatch({ type: 'bless', ...args }),
    dismiss: (summonId, at) => void dispatch({ type: 'dismiss', summonId, at }),
    erase: (nodeId, at) => void dispatch({ type: 'erase', nodeId, at }),
    undo,
    getState,
    subscribe,
    getEvents: () => events,
  };
}
