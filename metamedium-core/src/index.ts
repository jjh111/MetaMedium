// metamedium-core public API.
// Headless: no rendering, no framework, no LLM calls. Surfaces feed events in
// and render state out. See ARCHITECTURE-v6-SESSION-ENGINE.md.

// Geometry
export {
  getBounds,
  getBoundsFromStroke,
  calculateDistance,
  calculateStraightness,
  isStrokeClosed,
  convexHull,
  findCorners,
  findCornersWithSeparation,
  countCorners,
  resampleByArcLength,
  shapeExtent,
  denoise,
  DEFAULT_CORNER_OPTIONS,
  analyzeCornerAngles,
  checkOvershoot,
  getFingerprint,
  smoothStroke,
  simplifyStroke,
  normalizeStroke,
  boundingBoxDistance,
  boundsOverlap,
  boundsContain,
} from './geometry';

// Recognition (Tier 0 heuristics)
export { analyzeStroke, matchPrimitiveFromLibrary, MIN_CONFIDENCE, MAX_TIER0_CONFIDENCE } from './recognition';
export type { CornerOptions } from './geometry';

// Spatial graph & clustering
export { buildSpatialGraph, spatialCluster } from './spatial';
export type { IntersectionDetector } from './spatial';

// Node model
export {
  createBootstrapNodes,
  createParticipantNode,
  typeNodeId,
  getRep,
  fingerprintOf,
  strokePointsOf,
  wordOf,
  isGesture,
  isParticipant,
  isExplanation,
  explanationOf,
  aboutIdsOf,
  createExplanationNode,
  resemblances,
  topInterpretation,
  boundsOf,
  BUILTIN_TYPES,
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
} from './session/nodes';
export type { MMNode, Rep, Edge, Capability, ParticipantKind, ExplanationData } from './session/nodes';

// Gesture grammar
export {
  isLassoLike,
  isCheckLike,
  resolvesLasso,
  enclosedBy,
  strokesIntersect,
  whyNotResolved,
  DEFAULT_GESTURE_CONFIG,
} from './session/gesture';
export type { GestureConfig, MarkMiss, MissReason } from './session/gesture';

// The command mark — a gesture the user teaches the system (MVP.md §5.2).
export {
  learnCommandMark,
  matchesCommandMark,
  commandMarkFeatures,
  collidesWith,
  canonicalCheckSamples,
  BUILTIN_COMMAND_MARK,
  COMMAND_MARK_SAMPLES,
} from './session/commandmark';
export type { CommandMark, CommandMatch } from './session/commandmark';

// Scratch-out erase — relational, not gestural (MVP.md, erase.ts).
export {
  segmentsIntersect,
  countCrossings,
  outlineOf,
  scratchedOut,
  DEFAULT_ERASE_CROSSINGS,
} from './session/erase';
export type { ScratchTarget } from './session/erase';

// Regions — the drawn boxes as a layout frame, and the address space for ink
// drawn over a live artifact (MVP.md §5.4, §6.2).
export { regionsOf, frameOf, regionAt, regionsOverlapping } from './session/regions';
export type { Region, Rect } from './session/regions';

// Relations — what Tier 0 can SEE between marks: insideness, nearness,
// alignment, direction, peerhood. Measured, scale-free, and the substrate that
// concepts match against.
export {
  relate,
  relationsOf,
  between,
  has,
  clusters,
  describeRelations,
  DEFAULT_RELATE_CONFIG,
} from './relate/relations';
export type { Relation, RelationKind, Mark, RelateConfig } from './relate/relations';

// Concepts — the meaning-mappings, as a library rather than as code paths.
export { matchConcepts, BUILTIN_CONCEPTS } from './concepts/concept';
export type { Concept, ConceptMatch, ConceptScope, Conversion } from './concepts/concept';

// Parsing — the drawing read as a LAYOUT, and the page built from that reading.
// The engine owns structure because it measured it; the model owns content.
export { parseLayout, describeLayout } from './parse/layout';
export type { Layout, LayoutNode, Flow, Connection } from './parse/layout';
export { buildScaffold, validateRegions, prepare } from './parse/scaffold';
export type { RegionContent, Theme } from './parse/scaffold';

// Session engine
export { createSession, DEFAULT_SESSION_CONFIG } from './session/session';
export type {
  Session,
  SessionState,
  SessionConfig,
  SessionEvent,
  Summon,
  Suggestion,
  ClusterCandidate,
  ProposedEdge,
} from './session/session';

// Interpretations — the NON-COLLAPSING read path (ARCHITECTURE-v7 §4.1).
// `topInterpretation` above returns one reading for surfaces that need a
// headline; these keep every reading from every source and tier.
export {
  interpretationsOf,
  byTier,
  bySource,
  disagreement,
  sourcesOf,
  hasMultipleSources,
} from './session/interpretations';
export type { Interpretation, InterpretationGroup, Disagreement } from './session/interpretations';

// LLM transport (Tier 1–2). One client covers Ollama / LM Studio / OpenRouter;
// Anthropic has its own. Failures are returned, never thrown.
export { complete, listModels, providerLabel, providerTier, PRESETS, DEFAULT_TIMEOUT_MS, LOCAL_TIMEOUT_MS } from './llm/provider';
export type { ProviderConfig, ProviderKind, ChatMessage, CompletionResult, ModelList } from './llm/provider';

// Agent participants — a model joins through the same channel a human uses.
export { createAgentParticipant, parseReadings, parseCode, parseFill, readingsToEdges, MAX_READINGS } from './participants/agent';
export type { AgentParticipant, AgentReading, InterpretResult, AskResult, GenerateResult, RegionFill } from './participants/agent';
export { describeSession, describeSignature, describeRegions, describeAddressed } from './participants/serialize';
export type { SerializeOptions } from './participants/serialize';

// Types
export type * from './types';
