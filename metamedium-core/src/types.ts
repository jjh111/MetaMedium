// Core geometric and recognition types.
// Ported from Web App Skeleton/src/types (the session/node types live in session/nodes.ts).

export interface Point {
  x: number;
  y: number;
  t?: number; // timestamp, when the surface provides it
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface AngleAnalysis {
  avgAngle: number;
  variance: number;
  consistency: number;
  rectangleLikeness: number;
  triangleLikeness: number;
}

export interface Fingerprint {
  aspectRatio: number;
  straightness: number;
  isClosed: boolean;
  /**
   * Fraction of its own bounding box the outline encloses, 0–1.
   * Rectangle ~1.0, circle ~0.79, triangle ~0.5. Robust where corner count is
   * fragile, which is what keeps a box from reading as a triangle.
   */
  extent: number;
  closureDistance: number;
  bounds: Bounds;
  size: number;
  corners: number;
  cornerAngles?: number[]; // radians
  cornerData?: { index: number; angle: number; x: number; y: number; t: number }[];
  /** First and last point — where the stroke began and ended, direction included. */
  start: Point;
  end: Point;
  tipPoint?: Point; // sharpest corner (triangles)
  angleAnalysis: AngleAnalysis;
  pointCount: number;
}

export interface RecognitionResult {
  type: string;
  label: string;
  score: number;
  confidence: number;
  reasoning: string; // grounded "why" — part of the thesis, not decoration
}

export interface StrokeAnalysis {
  fingerprint: Fingerprint;
  results: RecognitionResult[];
}

// A recognized element participating in spatial analysis.
export interface Component {
  index: number;
  recognizedAs: string;
  type: string;
  fingerprint: Fingerprint;
  bounds: Bounds;
  /** Opaque refined-geometry handle; only used by an injected intersection detector. */
  geometricShape?: unknown;
}

export interface SpatialConnection {
  a: number;
  b: number;
  relationship: 'touching' | 'intersecting';
  distance: number;
  intersectionPoints?: Point[];
}

export interface SpatialContainment {
  outer: number;
  inner: number;
}

export interface SpatialGraph {
  connections: SpatialConnection[];
  containment: SpatialContainment[];
}
