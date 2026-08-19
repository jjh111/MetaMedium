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

import type { Bounds, Component, Point } from '../types';
import { getFingerprint, getBounds, distancePointToBounds, boundsOverlap } from '../geometry';
import { analyzeStroke } from '../recognition';
import { buildSpatialGraph, spatialCluster } from '../spatial';
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
  DEFAULT_GESTURE_CONFIG,
  isLassoLike,
  enclosedBy,
  resolvesLasso,
} from './gesture';
import { type CommandMark } from './commandmark';
import { DEFAULT_ERASE_CROSSINGS, scratchedOut } from './erase';
import { type Region, regionsOf, regionsOverlapping } from './regions';

// ===== Public state shape =====

export interface Suggestion {
  id: string;
  kind: 'match' | 'name-as-new' | 'keep-as-drawing' | 'prompt';
  label: string;
  artifactId?: string; // for 'match'
  score?: number;
}

export interface Summon {
  id: string;
  enclosedIds: string[];
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
  /** Artifacts carrying a 'code' rep — the ones that render and run. */
  live: string[];
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
      type: 'code';
      participantId: string;
      nodeId: string;
      code: string;
      language?: string;
      prompt?: string;
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
  clusterThresholdPx: number;
  /** How close a line endpoint must be to a node to infer a 'connects' wire. */
  wireEndpointPx: number;
  /** Crossings before a stroke is read as scratching a mark out. See erase.ts. */
  eraseCrossings: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  clusterThresholdPx: 60,
  wireEndpointPx: 30,
  eraseCrossings: DEFAULT_ERASE_CROSSINGS,
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
    at: number;
  }): string | null;
  /** The artifact's member marks as a layout frame (MVP.md §6.2). */
  regions(artifactId: string): Region[];
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

  function asComponent(id: string, index: number): Component {
    const node = nodes.get(id)!;
    const fp = fingerprintOf(node);
    const type = topInterpretation(node) ?? 'art';
    return {
      index,
      recognizedAs: type,
      type,
      fingerprint: fp ?? ({ bounds: boundsOf(node)! } as Component['fingerprint']),
      bounds: boundsOf(node)!,
    };
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

    const comps = contentIds.map((id, i) => asComponent(id, i));
    const clusters = spatialCluster(comps, config.clusterThresholdPx);

    for (const cluster of clusters) {
      const ids = cluster.map((c) => contentIds[c.index]);
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

  function addSpatialEdges(node: MMNode) {
    // Pairwise relationships between the new node and existing content,
    // recorded as inferred (unblessed) edges on both nodes.
    const ids = [...contentIds.filter((id) => id !== node.id), node.id];
    const comps = ids.map((id, i) => asComponent(id, i));
    const graph = buildSpatialGraph(comps);
    const newIdx = ids.length - 1;

    const addPair = (i: number, j: number, rel: string, weight?: number) => {
      if (i !== newIdx && j !== newIdx) return; // only edges involving the new node
      const a = nodes.get(ids[i])!;
      const b = nodes.get(ids[j])!;
      a.edges.push({ to: b.id, rel, weight });
      b.edges.push({ to: a.id, rel, weight });
    };

    for (const c of graph.connections) addPair(c.a, c.b, c.relationship);
    for (const c of graph.containment) addPair(c.outer, c.inner, 'contains');
  }

  /**
   * Wire inference (inferred-then-blessed): a line-like stroke whose endpoints
   * land near two different content nodes is held as a candidate connection.
   * The line IS the relation node (relations are nodes — core schema).
   */
  function inferWire(node: MMNode, points: Point[], scale: number) {
    const top = resemblances(node)[0];
    if (!top || top.to !== typeNodeId('line')) return;

    const nearest = (p: Point) => {
      let best: { id: string; d: number } | null = null;
      for (const c of contentBoundsList(node.id)) {
        const d = distancePointToBounds(p, c.bounds);
        if (d < config.wireEndpointPx * scale && (!best || d < best.d)) best = { id: c.id, d };
      }
      return best;
    };

    const a = nearest(points[0]);
    const b = nearest(points[points.length - 1]);
    if (!a || !b || a.id === b.id) return;

    const weight = top.weight;
    node.edges.push({ to: a.id, rel: 'connects', weight } satisfies Edge);
    node.edges.push({ to: b.id, rel: 'connects', weight } satisfies Edge);
    nodes.get(a.id)!.edges.push({ to: node.id, rel: 'connected-by', weight });
    nodes.get(b.id)!.edges.push({ to: node.id, rel: 'connected-by', weight });
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
      if (
        resolvesLasso(fp, at, lassoFp, pendingLasso.at, gestureConfig, {
          check: points,
          lasso: lassoPoints,
        })
      ) {
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
        const artifactId = liveArtifactUnder(lassoFp.bounds, lassoNode.id);
        const onArtifact = artifactId
          ? {
              artifactId,
              regionIds: regionsOverlapping(
                regionsOf(nodes.get(artifactId)!, nodes),
                lassoFp.bounds
              ).map((r) => r.id),
            }
          : undefined;
        summon = {
          id: nextId('summon'),
          enclosedIds,
          suggestions: makeSuggestions(enclosedIds),
          gestureIds: [lassoNode.id, node.id],
          at,
          ...(onArtifact ? { onArtifact } : {}),
        };
        pendingLasso = null;
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
        regions: regionsOf(node, nodes),
        at: ev.at,
      },
      source: ev.participantId,
    });
    if (!live.includes(node.id)) live.push(node.id);
    return node.id;
  }

  function applyEvent(ev: SessionEvent): string | null {
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
    attachCode: (args) => dispatch({ type: 'code', ...args }),
    regions: (artifactId) => {
      const node = nodes.get(artifactId);
      return node ? regionsOf(node, nodes) : [];
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
