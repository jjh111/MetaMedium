// The node model: everything is a node; meaning emerges from representations
// and connections. See ARCHITECTURE-v6-SESSION-ENGINE.md §4 and
// metamedium-core-schema.md. This open structure — not a closed
// {strokes, shape, name} record — is what lets the same artifact carry ink
// today and renderable/executable payloads later (capability tiers, §7).

import type { Bounds, Fingerprint, Point } from '../types';
import { getBounds } from '../geometry';
import { type Affine, IDENTITY, applyAffine, compose, invert, isAffine } from './affine';

/**
 * A kind of knowing, not a place (CLAUDE.md, the tiers redressed 6 Sep 2026):
 * 0 the shape rung, 1 the instant library, 2 a model, 3 structural proposals —
 * and **1.5, the decision seat** (`participants/decide.ts`): typed questions in,
 * a typed value out, slower than the library and narrower than a model. It is a
 * number rather than a name so that every ordering already written over tiers —
 * ranking, grouping, the router's cheapest-first — keeps working unchanged.
 */
export type Capability = 0 | 1 | 1.5 | 2 | 3;

export interface Rep {
  modality: string; // 'stroke' | 'fingerprint' | 'word' | 'gesture' | 'signature' | 'html' | ... (open set)
  data: unknown;
  confidence?: number;
  source?: string; // provenance: 'heuristic' | 'user' | 'llm:<model>' | ...
}

export interface Edge {
  to: string;
  rel: string; // 'resembles' | 'part-of' | 'has-part' | 'instance-of' | 'blessed-by' | 'touching' | 'intersecting' | 'contains' | 'connects' | 'bound-to' | ...
  weight?: number;
  blessed?: boolean; // inferred (absent/false) vs blessed (true)
  via?: string;
  /** Grounded justification for this claim — the substance behind "why?". */
  reasoning?: string;
  /**
   * Which END of this mark the claim is about, when it is about one end
   * rather than the whole mark (`bound-to`; magnets.ts). Two ends of one
   * stroke may land on two sites of the SAME mark, so the endpoint — not the
   * target — is what identifies the claim: removing by target lost one of
   * them (DIRECTOR-REVIEW-2026-09-15, BIND-1).
   */
  end?: string;
  /** Where on the target that end sits, when the edge is about an end. */
  site?: { kind: string; index: number };
}

export interface MMNode {
  id: string;
  reps: Rep[];
  edges: Edge[];
  capability: Capability;
  createdAt: number;
}

// ===== Bootstrap type nodes =====
// Not privileged — just nodes many others connect to ("popular, not sacred").

export const BUILTIN_TYPES = ['circle', 'line', 'rectangle', 'triangle', 'arc', 'arrow', 'text', 'dot'] as const;

export function typeNodeId(type: string): string {
  return `type:${type}`;
}

// ===== Participants =====
// One class of citizen: humans, AI agents, and the engine's own recognizers
// are all participants — nodes that contribute attributed acts to the shared
// canvas. What differs is the nuance of their marks (humans enter through
// stroke dynamics; agents may enter through words, refined geometry, or
// payloads), not their standing.

export type ParticipantKind = 'human' | 'agent' | 'engine';

/** The default local human, present in every session. */
export const LOCAL_PARTICIPANT = 'participant:local';
/**
 * The engine itself — the medium is a participant. Its readings are tier 0
 * (the shape rung) and its instant library is tier 1; one voice, two rungs.
 * The id keeps its old name for the logs' sake.
 */
export const TIER0_PARTICIPANT = 'participant:tier0';
export const ENGINE_PARTICIPANT = TIER0_PARTICIPANT;
/** What the engine participant is called wherever a participant is named. */
export const ENGINE_NAME = 'engine';

/** Where a participant runs: a cost when choosing who to ask, never a tier. */
export type Locality = 'local' | 'hosted';

/** Where a participant runs, when it said: a model's locality, else null. */
export function localityOf(node: MMNode): Locality | null {
  const rep = node.reps.find((r) => r.modality === 'participant');
  const l = (rep?.data as { locality?: Locality } | undefined)?.locality;
  return l === 'local' || l === 'hosted' ? l : null;
}

/**
 * Who made a node: the `made-by` edge's target, else the local human. A mark
 * is made by the hand that drew it; an artifact by whoever BLESSED it, not by
 * whoever drew its marks (V1-PLAN L2f) — a person, so a bless in the engine's
 * name is the hand's whose log holds it. A bless writes the edge only for a
 * maker other than this board's own hand, so no edge here means that hand.
 */
export function authorOf(node: MMNode): string {
  const e = node.edges.find((x) => x.rel === 'made-by');
  return e ? e.to : LOCAL_PARTICIPANT;
}

export function createParticipantNode(
  id: string,
  kind: ParticipantKind,
  name: string,
  at: number,
  /**
   * Which tier this participant speaks at. Humans and the engine are 0 (the
   * shape rung; the engine's instant library is tier 1 of the same voice);
   * every model is 2, local or hosted (ARCHITECTURE-v7 §4, redressed 6 Sep
   * 2026). Tiers are simultaneous, so this labels a voice — it never ranks
   * one above another or gates what a participant may propose.
   */
  capability: Capability = 0,
  /** Where it runs, when it is a model: the router asks local before hosted. */
  locality?: Locality
): MMNode {
  return {
    id,
    reps: [
      { modality: 'participant', data: locality ? { kind, locality } : { kind } },
      { modality: 'word', data: name },
    ],
    edges: [],
    capability,
    createdAt: at,
  };
}

/**
 * An answer placed IN the canvas rather than in a chat log.
 *
 * An explanation is a node like everything else: attributed, positioned,
 * erasable, and — crucially — **unblessed**. It is a participant's proposal
 * about some marks, not a verdict, so several participants can answer the same
 * question and every answer is held (ARCHITECTURE-v7 §4.1).
 */
export interface ExplanationData {
  question: string;
  text: string;
}

export function createExplanationNode(
  id: string,
  data: ExplanationData,
  aboutIds: string[],
  bounds: Bounds,
  participantId: string,
  capability: Capability,
  at: number
): MMNode {
  return {
    id,
    reps: [
      { modality: 'explanation', data, source: participantId },
      { modality: 'bounds', data: bounds },
    ],
    edges: [
      // `about` is inferred, not blessed: the human may disagree that this
      // answer is about these marks, and ignoring it is a valid response.
      ...aboutIds.map((to) => ({ to, rel: 'about' })),
      { to: participantId, rel: 'made-by', blessed: true },
    ],
    capability,
    createdAt: at,
  };
}

export function isExplanation(node: MMNode): boolean {
  return node.reps.some((r) => r.modality === 'explanation');
}

export function explanationOf(node: MMNode): ExplanationData | undefined {
  return getRep(node, 'explanation')?.data as ExplanationData | undefined;
}

/** Which marks an explanation claims to be about. */
export function aboutIdsOf(node: MMNode): string[] {
  return node.edges.filter((e) => e.rel === 'about').map((e) => e.to);
}

export function isParticipant(node: MMNode): boolean {
  return getRep(node, 'participant') !== undefined;
}

export function createBootstrapNodes(at: number): MMNode[] {
  return [
    ...BUILTIN_TYPES.map((t) => ({
      id: typeNodeId(t),
      reps: [{ modality: 'word', data: t, source: 'bootstrap' }],
      edges: [],
      capability: 0 as const,
      createdAt: at,
    })),
    createParticipantNode(LOCAL_PARTICIPANT, 'human', 'local', at),
    createParticipantNode(TIER0_PARTICIPANT, 'engine', ENGINE_NAME, at),
  ];
}

// ===== Accessors =====

export function getRep(node: MMNode, modality: string): Rep | undefined {
  return node.reps.find((r) => r.modality === modality);
}

export function fingerprintOf(node: MMNode): Fingerprint | undefined {
  return getRep(node, 'fingerprint')?.data as Fingerprint | undefined;
}

/**
 * A mark's points, as they stand now.
 *
 * Tidying a drawing has to move ink, and "ink is never destroyed" has to keep
 * meaning something. So a moved mark keeps its original stroke untouched and
 * gains a `'transform'` rep saying where it now sits; the two are composed
 * here. Undo drops the transform event and the mark springs back, because the
 * original was never overwritten in the first place.
 */
export function strokePointsOf(node: MMNode): Point[] | undefined {
  const rep = getRep(node, 'stroke');
  if (!rep) return undefined;
  const points = (rep.data as { points: Point[] }).points;
  return placed(node, points);
}

/**
 * Where a mark's points stand now: the raw points, carried first by the map
 * its bindings have carried it by when it follows them (`'follow'`, V1-PLAN
 * E2 — derived, never logged), then fitted to the `transform` frame if there
 * is one, then turned by the `rotation` rep about that frame's centre. All
 * three are reps beside the ink; undo drops them and the ink is as it was.
 * Used for the stroke and for the clean form alike, so they never disagree.
 *
 * The follow comes FIRST, in the mark's own space: what the hand does to the
 * mark afterwards — a move, a scale, a turn — is done to the mark as it
 * stands, on the board, exactly as it is done to any other.
 */
export function placed(node: MMNode, points: Point[]): Point[] {
  const raw = (getRep(node, 'stroke')?.data as { points: Point[] } | undefined)?.points ?? points;
  const to = getRep(node, 'transform')?.data as Bounds | undefined;
  const rotation = (getRep(node, 'rotation')?.data as number | undefined) ?? 0;
  const follow = followMapOf(node);
  let out = points;
  if (follow) out = out.map((p) => applyAffine(follow, p));
  if (to) {
    const from = getBounds(raw);
    const { sx, sy } = frameScale(from, to);
    out = out.map((p) => ({ ...p, x: to.minX + (p.x - from.minX) * sx, y: to.minY + (p.y - from.minY) * sy }));
  }
  if (rotation) {
    const frame = to ?? getBounds(raw);
    const cx = (frame.minX + frame.maxX) / 2, cy = (frame.minY + frame.maxY) / 2;
    const c = Math.cos(rotation), s = Math.sin(rotation);
    out = out.map((p) => ({ ...p, x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
  }
  return out;
}

/**
 * How a `transform` fits the ink's own box to where the mark stands, axis by
 * axis. An axis the ink has NO extent on — a ruled line's height, a tap — is
 * carried, never stretched: every point of such ink lies on the box's edge,
 * so it lands where it always did, and a clean form a hand reshaped off that
 * edge (V1-PLAN E1: a flat line's end dragged up) moves with the mark instead
 * of being flattened back onto it. Every other axis is the fit it always was.
 */
function frameScale(from: Bounds, to: Bounds): { sx: number; sy: number } {
  const fw = from.maxX - from.minX, fh = from.maxY - from.minY;
  return {
    sx: fw > 0 ? (to.maxX - to.minX) / Math.max(1e-6, fw) : 1,
    sy: fh > 0 ? (to.maxY - to.minY) / Math.max(1e-6, fh) : 1,
  };
}

/**
 * The inverse of `placed`: points where they stand on the board, taken back
 * into the mark's OWN space — the space its ink was drawn in, before any
 * move, scale or turn. A reshape is kept there (V1-PLAN E1), so a move, a
 * scale or a turn that lands before it or after it carries it as it carries
 * the ink.
 */
export function unplaced(node: MMNode, points: Point[]): Point[] {
  const raw = (getRep(node, 'stroke')?.data as { points: Point[] } | undefined)?.points ?? points;
  const to = getRep(node, 'transform')?.data as Bounds | undefined;
  const rotation = (getRep(node, 'rotation')?.data as number | undefined) ?? 0;
  let out = points;
  if (rotation) {
    const frame = to ?? getBounds(raw);
    const cx = (frame.minX + frame.maxX) / 2, cy = (frame.minY + frame.maxY) / 2;
    const c = Math.cos(-rotation), s = Math.sin(-rotation);
    out = out.map((p) => ({ ...p, x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
  }
  if (to) {
    const from = getBounds(raw);
    const { sx, sy } = frameScale(from, to);
    out = out.map((p) => ({ ...p, x: from.minX + (p.x - to.minX) / (sx || 1), y: from.minY + (p.y - to.minY) / (sy || 1) }));
  }
  const follow = followMapOf(node);
  const back = follow && invert(follow);
  if (back) out = out.map((p) => applyAffine(back, p));
  return out;
}

/**
 * The map a mark's bindings have carried it by (V1-PLAN E2), in its own space
 * — the `'follow'` rep the engine holds for a connector that follows the
 * sites its ends are bound to — or null for a mark that follows nothing. A
 * log is read, not trusted: a map that is not six finite numbers that can be
 * undone carries nothing.
 */
export function followMapOf(node: MMNode): Affine | null {
  const m = (getRep(node, 'follow')?.data as { map?: unknown } | undefined)?.map;
  return isAffine(m) ? m : null;
}

/**
 * The hand's own placement of a mark as one map: its `transform`'s fit, then
 * its `rotation` — what `placed` does after the follow. The follow is carried
 * through it (session/follow.ts), so a map made on the board is held in the
 * mark's own space, where the hand's later moves leave it be.
 */
export function placementOf(node: MMNode): Affine {
  const raw = (getRep(node, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
  if (!raw || !raw.length) return IDENTITY;
  const to = getRep(node, 'transform')?.data as Bounds | undefined;
  const rotation = (getRep(node, 'rotation')?.data as number | undefined) ?? 0;
  let m = IDENTITY;
  if (to) {
    const from = getBounds(raw);
    const { sx, sy } = frameScale(from, to);
    m = { a: sx, b: 0, c: 0, d: sy, e: to.minX - from.minX * sx, f: to.minY - from.minY * sy };
  }
  if (rotation) {
    const frame = to ?? getBounds(raw);
    const cx = (frame.minX + frame.maxX) / 2, cy = (frame.minY + frame.maxY) / 2;
    const c = Math.cos(rotation), s = Math.sin(rotation);
    m = compose({ a: c, b: s, c: -s, d: c, e: cx - c * cx + s * cy, f: cy - s * cx - c * cy }, m);
  }
  return m;
}

/** The clean form a hand reshaped (V1-PLAN E1), as the rep holds it — or nothing. */
function reshapedForm(node: MMNode): { points: Point[]; closed?: boolean } | undefined {
  const clean = getRep(node, 'clean')?.data as { points?: Point[]; closed?: boolean; reshaped?: unknown } | undefined;
  return clean && clean.reshaped && clean.points && clean.points.length > 0 && getRep(node, 'stroke') ? (clean as { points: Point[]; closed?: boolean }) : undefined;
}

/**
 * The outline a mark stands as NOW, for everything that reads where a mark
 * is — its relations, the scratch that would rub it out, a hit: the clean
 * form a hand reshaped it to (V1-PLAN E1), where it stands; else its ink as
 * placed. A reshaped form is the hand's own geometry, set by a handle, and
 * the ink under it is where it was drawn. A clean form only SNAPPED is the
 * ink's own measurements redrawn, and the ink still stands for it.
 */
export function standingPointsOf(node: MMNode): Point[] | undefined {
  const clean = reshapedForm(node);
  return clean ? placed(node, clean.points) : strokePointsOf(node);
}

/** Whether the outline a mark stands as closes on itself: the reshaped clean form's, else the ink's (unknown for a mark with no ink). */
export function standsClosed(node: MMNode): boolean | undefined {
  const clean = reshapedForm(node);
  return clean ? !!clean.closed : fingerprintOf(node)?.isClosed;
}

export function wordOf(node: MMNode): string | undefined {
  return getRep(node, 'word')?.data as string | undefined;
}

/**
 * What a mark's writing SAYS, as participants have read it — ranked, every
 * reading kept. A transcript is a proposal like any other: attributed to the
 * model that read it and never blessed by being proposed (v7 Stage E).
 */
export interface Transcript {
  text: string;
  confidence: number;
  source?: string;
  reasoning?: string;
}

export function transcriptsOf(node: MMNode): Transcript[] {
  return node.reps
    .filter((r) => r.modality === 'transcript')
    .map((r) => {
      const d = r.data as { text?: unknown; reasoning?: unknown };
      return {
        text: typeof d?.text === 'string' ? d.text : '',
        confidence: r.confidence ?? 0,
        source: r.source,
        reasoning: typeof d?.reasoning === 'string' ? d.reasoning : undefined,
      };
    })
    .filter((t) => t.text.length > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

/** The top transcript's text, if any participant has read this mark. */
export function transcriptOf(node: MMNode): string | undefined {
  return transcriptsOf(node)[0]?.text;
}

/**
 * A word a hand put on its OWN ink.
 *
 * Naming a mark somebody else made is blessing — the human's act, and one no
 * other hand may take. Naming a mark you just made is not: it is labelling
 * your own ink, which any hand may do (the notes, §B). So a label is held as
 * a rep on the mark, attributed to whoever wrote it, and it is deliberately
 * NOT the `word` rep a bless writes: the engine's own readings stay beside it
 * and nothing is settled.
 *
 * It is also not an artifact. A label used to be a text or svg artifact with
 * a filename, so a figure's six labels showed up as six files in the folder
 * view (the notes, §D). A word on a drawing is not a file; a rep on the mark
 * cannot become one.
 */
export interface Label {
  text: string;
  /**
   * Who wrote it: the participant that made the mark, or another sitting of
   * the same person — a reload is a new participant and the same person
   * (V1-PLAN L2i, `Session.isMine`).
   */
  source?: string;
  at: number;
}

/** Every label written on a mark, oldest first. Relabelling keeps the history. */
export function labelsOf(node: MMNode): Label[] {
  return node.reps
    .filter((r) => r.modality === 'label')
    .map((r) => {
      const d = r.data as { text?: unknown; at?: unknown };
      return {
        text: typeof d?.text === 'string' ? d.text : '',
        source: r.source,
        at: typeof d?.at === 'number' ? d.at : node.createdAt,
      };
    });
}

/**
 * What this mark is labelled now: the newest label, or undefined when it was
 * never labelled — or when the newest one is empty, which is how a hand takes
 * its own label off again.
 */
export function labelOf(node: MMNode): Label | undefined {
  const all = labelsOf(node);
  const last = all[all.length - 1];
  return last && last.text.length > 0 ? last : undefined;
}

/** A held run of printed letters, standing in the content plane as one mark. */
export function isWord(node: MMNode): boolean {
  return getRep(node, 'word-run') !== undefined;
}

/** The letter strokes a word is made of, in the order they were written. */
export function lettersOf(node: MMNode): string[] {
  return ((getRep(node, 'word-run')?.data as { letters?: string[] } | undefined)?.letters ?? []).slice();
}

export function isGesture(node: MMNode): boolean {
  return getRep(node, 'gesture') !== undefined;
}

/** Ranked 'resembles' interpretations — the held multi-parse. */
export function resemblances(node: MMNode): Edge[] {
  return node.edges
    .filter((e) => e.rel === 'resembles')
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

/** The current best reading of a node: blessed name, else top resemblance. */
export function topInterpretation(node: MMNode): string | undefined {
  const name = wordOf(node);
  if (name) return name;
  const top = resemblances(node)[0];
  return top ? top.to.replace(/^type:/, '') : undefined;
}

export function boundsOf(node: MMNode): Bounds | undefined {
  // One pass over the reps, each modality's first as `getRep` finds it: this
  // is asked of every mark by every relation and every paint.
  let stroke: Rep | undefined, rotation: Rep | undefined, transform: Rep | undefined, fp: Rep | undefined, clean: Rep | undefined, bounds: Rep | undefined, follow: Rep | undefined;
  for (const r of node.reps) {
    switch (r.modality) {
      case 'stroke': if (!stroke) stroke = r; break;
      case 'rotation': if (!rotation) rotation = r; break;
      case 'transform': if (!transform) transform = r; break;
      case 'fingerprint': if (!fp) fp = r; break;
      case 'clean': if (!clean) clean = r; break;
      case 'bounds': if (!bounds) bounds = r; break;
      case 'follow': if (!follow) follow = r; break;
    }
  }
  // A mark a hand reshaped stands where its clean form is (V1-PLAN E1); its
  // ink is where it was drawn, faint beneath.
  if (stroke && clean && (clean.data as { reshaped?: unknown }).reshaped) {
    const pts = (clean.data as { points?: Point[] }).points;
    if (pts && pts.length) return getBounds(placed(node, pts));
  }
  // A turned mark's box is the box of its turned points; a mark its bindings
  // carried (V1-PLAN E2), the box of its points where they carried it.
  if ((rotation || (follow && followMapOf(node))) && stroke) return getBounds(strokePointsOf(node)!);
  // A transform is where the mark IS; the fingerprint records where it was
  // drawn. Anything asking for bounds wants the former.
  if (transform?.data) return transform.data as Bounds;
  if (fp?.data) return (fp.data as Fingerprint).bounds;
  return bounds?.data as Bounds | undefined;
}

/** The behaviour that drives a definition: the newest one a human gave (or gave again in their name). */
export function blessedBehaviourOf(node: MMNode): (Record<string, unknown> & { terms: unknown[] }) | undefined {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    const r = node.reps[i];
    if (r.modality === 'behaviour' && (r.data as { blessed?: boolean }).blessed) return r.data as Record<string, unknown> & { terms: unknown[] };
  }
  return undefined;
}

/** Every behaviour held on a definition, newest first, blessed or not — the panel shows them all. */
export function behavioursOf(node: MMNode): Rep[] {
  return node.reps.filter((r) => r.modality === 'behaviour').reverse();
}

/**
 * What a library pack's definition carries on the board that uses the pack
 * (V1-PLAN §2.3, B3): the pack it came from (`basics@1`), its name there, and
 * what the pack says of it. Such a node is attributed to the pack
 * (`library:basics@1`, its `made-by`), matched and corrected as a taught
 * definition is, and never on the board: not content, not an artifact, not a
 * file.
 */
export interface PackDefinitionRep {
  pack: string;
  definition: string;
  describes?: string;
  role?: string;
  ports?: string;
  export?: Record<string, string>;
}

/** The pack a node is a definition of, and what it says of it — or undefined for every other node. */
export function packDefinitionOf(node: MMNode): PackDefinitionRep | undefined {
  return getRep(node, 'pack-definition')?.data as PackDefinitionRep | undefined;
}

/** A library pack's definition: held while its pack is in use, never on the board (B3). */
export function isPackDefinition(node: MMNode): boolean {
  return getRep(node, 'pack-definition') !== undefined;
}

/** A frame: an artifact that refers to other artifacts and wires them. */
export function isFrame(node: MMNode): boolean {
  return getRep(node, 'frame') !== undefined;
}
export function frameOfNode(node: MMNode): { members: string[]; connections: { from: { id: string; port: string }; to: { id: string; port: string }; reasoning?: string }[] } | undefined {
  return getRep(node, 'frame')?.data as { members: string[]; connections: { from: { id: string; port: string }; to: { id: string; port: string }; reasoning?: string }[] } | undefined;
}

/**
 * A region's own rep (PLAN-IPAD-NOTES I5): its name, the drawn rectangle it was taken from, when. The
 * newest `region` rep is the name (a rename pushes another); its box is the node's `bounds`, moved as
 * any mark is. Null for a node that is no region.
 */
export interface RegionRep { name: string; from?: string; at: number }
export function regionRepOf(node: MMNode): RegionRep | null {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    const r = node.reps[i];
    if (r.modality !== 'region') continue;
    const d = r.data as Partial<RegionRep> | null;
    return d && typeof d.name === 'string' ? { name: d.name, ...(typeof d.from === 'string' ? { from: d.from } : {}), at: typeof d.at === 'number' ? d.at : 0 } : null;
  }
  return null;
}
