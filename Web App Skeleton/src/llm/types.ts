// LLM Integration Types

import type { Point, Fingerprint, Library, SpatialGraph } from '../types';

// ===== INTERPRETATION TYPES =====

export interface InterpretationCandidate {
  type: string;
  label: string;
  confidence: number;
  reasoning: string;
  isUserPrimitive?: boolean;
  isComposition?: boolean;
}

export interface InterpretationResult {
  candidates: InterpretationCandidate[];
  isSelectionGesture: boolean;
  selectionDetails: {
    enclosedShapeIndices: number[];
    confidence: number;
  } | null;
  rawResponse?: string;
  tier: 0 | 1 | 2;
  latencyMs: number;
}

// ===== CONTEXT FOR INTERPRETATION =====

export interface InterpretationContext {
  // The stroke being interpreted
  stroke: {
    points: Point[];
    fingerprint: Fingerprint;
    drawingDurationMs: number;
  };

  // User's calibrated fingerprints (from onboarding)
  userFingerprints: UserFingerprints | null;

  // Library of saved shapes
  library: Library;

  // Current canvas state
  canvas: {
    strokeCount: number;
    acceptedShapes: Array<{
      index: number;
      type: string;
      bounds: { minX: number; maxX: number; minY: number; maxY: number };
    }>;
    spatialGraph: SpatialGraph | null;
  };
}

// ===== USER PROFILE =====

export interface FingerprintRange {
  examples: Fingerprint[];
  ranges: {
    straightness: { min: number; max: number; mean: number };
    aspectRatio: { min: number; max: number; mean: number };
    closureDistance: { min: number; max: number; mean: number };
    size: { min: number; max: number; mean: number };
  };
  averageVelocity: number;
  averagePointCount: number;
}

export interface UserFingerprints {
  id: string;
  name: string;
  createdAt: number;
  version: number;

  // Calibration data (from onboarding sequence)
  calibration: {
    fastCircle?: Fingerprint;
    carefulCircle?: Fingerprint;
    fastLine?: Fingerprint;
    carefulLine?: Fingerprint;
    rectangle?: Fingerprint;
    triangle?: Fingerprint;
    squiggle?: Fingerprint;
    spiral?: Fingerprint;
    star?: Fingerprint;
    crossingLines?: Fingerprint;
  };

  // Derived ranges
  ranges: {
    circle?: FingerprintRange;
    line?: FingerprintRange;
    rectangle?: FingerprintRange;
    triangle?: FingerprintRange;
  };

  // Selection gesture
  selectionGesture?: {
    examples: Fingerprint[];
    averageFingerprint: Fingerprint;
  };

  // Drawing style metrics
  style: {
    averageVelocity: number;
    velocityVariance: number;
    prefersClosed: boolean;
    typicalSize: { small: number; medium: number; large: number };
  };
}

// ===== API SETTINGS =====

export interface LLMSettings {
  tier1ApiKey: string | null;  // Haiku/light model
  tier2ApiKey: string | null;  // Sonnet/Opus
  preferredTier: 0 | 1 | 2;
  autoEscalate: boolean;
  autoEscalateThreshold: number;  // Confidence below which to escalate
}

// ===== INTERPRETER INTERFACE =====

export interface LLMInterpreter {
  interpret(context: InterpretationContext): Promise<InterpretationResult>;
  isAvailable(): boolean;
  tier: 0 | 1 | 2;
}
