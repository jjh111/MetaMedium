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
export { analyzeStroke, matchPrimitiveFromLibrary } from './recognition';

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
  resemblances,
  topInterpretation,
  boundsOf,
  BUILTIN_TYPES,
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
} from './session/nodes';
export type { MMNode, Rep, Edge, Capability, ParticipantKind } from './session/nodes';

// Gesture grammar
export {
  isLassoLike,
  isCheckLike,
  resolvesLasso,
  enclosedBy,
  DEFAULT_GESTURE_CONFIG,
} from './session/gesture';
export type { GestureConfig } from './session/gesture';

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
export { complete, listModels, providerLabel, providerTier, PRESETS, DEFAULT_TIMEOUT_MS } from './llm/provider';
export type { ProviderConfig, ProviderKind, ChatMessage, CompletionResult } from './llm/provider';

// Agent participants — a model joins through the same channel a human uses.
export { createAgentParticipant, parseReadings, readingsToEdges, MAX_READINGS } from './participants/agent';
export type { AgentParticipant, AgentReading, InterpretResult } from './participants/agent';
export { describeSession, describeSignature } from './participants/serialize';
export type { SerializeOptions } from './participants/serialize';

// Types
export type * from './types';
