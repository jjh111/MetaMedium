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
import { getFingerprint, getBounds, distancePointToBounds } from '../geometry';
import { analyzeStroke } from '../recognition';
import { buildSpatialGraph, spatialCluster } from '../spatial';
import {
  type MMNode,
  type Edge,
  createBootstrapNodes,
  typeNodeId,
  fingerprintOf,
  getRep,
  wordOf,
  topInterpretation,
  boundsOf,
  resemblances,
} from './nodes';
import {
  type GestureConfig,
  DEFAULT_GESTURE_CONFIG,
  isLassoLike,
  enclosedBy,
  resolvesLasso,
} from './gesture';

// ===== Public state shape =====

export interface Suggestion {
  id: string;
  kind: 'match' | 'name-as-new' | 'keep-as-drawing';
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
}

export type SessionEvent =
  | { type: 'stroke'; points: Point[]; at: number }
  | { type: 'tick'; at: number }
  | { type: 'bless'; summonId: string; name?: string; suggestionId?: string; at: number }
  | { type: 'dismiss'; summonId: string; at: number }
  | { type: 'erase'; nodeId: string; at: number };

export interface SessionConfig {
  gesture: GestureConfig;
  clusterThresholdPx: number;
  /** How close a line endpoint must be to a node to infer a 'connects' wire. */
  wireEndpointPx: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  clusterThresholdPx: 60,
  wireEndpointPx: 30,
};

type Signature = Record<string, number>; // type histogram, e.g. { circle: 3, line: 2 }

export interface Session {
  addStroke(points: Point[], at: number): string;
  tick(at: number): void;
  bless(args: { summonId: string; name?: string; suggestionId?: string; at: number }): string | null;
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
  let counter = 0;
  const listeners = new Set<(state: SessionState) => void>();

  function reset() {
    nodes = new Map();
    contentIds = [];
    artifacts = [];
    pendingLasso = null;
    summon = null;
    clusterCandidates = [];
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
  function inferWire(node: MMNode, points: Point[]) {
    const top = resemblances(node)[0];
    if (!top || top.to !== typeNodeId('line')) return;

    const nearest = (p: Point) => {
      let best: { id: string; d: number } | null = null;
      for (const c of contentBoundsList(node.id)) {
        const d = distancePointToBounds(p, c.bounds);
        if (d < config.wireEndpointPx && (!best || d < best.d)) best = { id: c.id, d };
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

  function removeFromContent(id: string) {
    const idx = contentIds.indexOf(id);
    if (idx >= 0) contentIds.splice(idx, 1);
  }

  // ===== Event application (the reducer — all mutation lives here) =====

  function applyStroke(ev: Extract<SessionEvent, { type: 'stroke' }>): string {
    const { points, at } = ev;
    const fp = getFingerprint(points);
    const node: MMNode = {
      id: nextId('stroke'),
      reps: [
        { modality: 'stroke', data: { points, at }, source: 'user' },
        { modality: 'fingerprint', data: fp, source: 'heuristic' },
      ],
      edges: [],
      capability: 0,
      createdAt: at,
    };
    nodes.set(node.id, node);

    // --- Gesture resolution first: does this stroke complete a pending lasso? ---
    if (pendingLasso) {
      const lassoNode = nodes.get(pendingLasso.id)!;
      const lassoFp = fingerprintOf(lassoNode)!;
      if (resolvesLasso(fp, at, lassoFp, pendingLasso.at, config.gesture)) {
        // Retroactivity: the lasso was a gesture all along. Both strokes get
        // gesture reps and leave the content plane; their ink and prior
        // candidate edges remain (provenance, principle 9).
        node.reps.push({ modality: 'gesture', data: { role: 'check' }, source: 'heuristic' });
        lassoNode.reps.push({ modality: 'gesture', data: { role: 'lasso' }, source: 'heuristic' });
        removeFromContent(lassoNode.id);

        const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
        summon = {
          id: nextId('summon'),
          enclosedIds,
          suggestions: makeSuggestions(enclosedIds),
          gestureIds: [lassoNode.id, node.id],
          at,
        };
        pendingLasso = null;
        recomputeClusterCandidates();
        return node.id;
      }
    }

    // --- Not a gesture: this is content. Drawing past a summon dissolves it. ---
    summon = null;
    contentIds.push(node.id);

    // Multi-parse: every qualifying recognition becomes a held 'resembles' edge.
    const analysis = analyzeStroke(points);
    for (const r of analysis.results) {
      node.edges.push({
        to: typeNodeId(r.type),
        rel: 'resembles',
        weight: r.confidence,
      } satisfies Edge);
    }

    addSpatialEdges(node);
    inferWire(node, points);

    // Held ambiguity: a closed stroke enclosing content is BOTH a content
    // candidate (edges above) and the new pending lasso. The next event decides.
    const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
    pendingLasso = isLassoLike(fp, enclosed.length) ? { id: node.id, at } : null;

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
        { modality: 'word', data: name, source: 'user' },
        { modality: 'bounds', data: unionBounds },
        { modality: 'signature', data: signatureOf(memberIds), source: 'heuristic' },
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
    const node = nodes.get(ev.nodeId);
    if (!node || node.id.startsWith('type:')) return;
    if (getRep(node, 'erased')) return;

    // Ink is never destroyed: the node stays in the graph, marked erased.
    node.reps.push({ modality: 'erased', data: { at: ev.at }, source: 'user' });
    removeFromContent(node.id);

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

  function applyEvent(ev: SessionEvent): string | null {
    switch (ev.type) {
      case 'stroke':
        return applyStroke(ev);
      case 'bless':
        return applyBless(ev);
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
    };
  }

  function subscribe(listener: (state: SessionState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    addStroke: (points, at) => dispatch({ type: 'stroke', points, at }) as string,
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
