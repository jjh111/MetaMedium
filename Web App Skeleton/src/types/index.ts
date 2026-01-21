// MetaMedium Day 6 - TypeScript Type Definitions
// Migrated from day5.html

// ===== CORE GEOMETRIC TYPES =====

export interface Point {
  x: number;
  y: number;
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
  closureDistance: number;
  bounds: Bounds;
  size: number;
  corners: number;
  cornerAngles?: number[]; // In radians
  cornerData?: { index: number; angle: number; x: number; y: number }[];
  tipPoint?: Point; // For triangles - the sharpest corner
  angleAnalysis: AngleAnalysis;
  pointCount: number;
}

// ===== SHAPE TYPES =====

export interface Shape {
  type: string;
  label: string;
  bounds: Bounds;
  accepted: boolean;
  formalism: string;
  definition: any; // Varies by shape type (circle, line, etc.)
}

// ===== LIBRARY TYPES =====

export type LibraryItemType =
  | 'builtin-primitive'
  | 'user-primitive'
  | 'builtin-composition'
  | 'composition';

export interface LibraryItem {
  type: LibraryItemType;
  label: string;
  shapeType?: string;
  usageCount: number;
  created?: number;

  // Primitive fields
  strokes?: Point[][];
  fingerprint?: Fingerprint | CompositionFingerprint;
  basedOn?: string | null;

  // Composition fields
  components?: Component[];
  relationships?: SpatialConnection[];
  spatialGraph?: SpatialGraph;
  semantics?: SemanticDescription;
  fuzzyRelationships?: boolean;
}

export interface Library {
  [key: string]: LibraryItem;
}

// ===== COMPOSITION TYPES =====

export interface Component {
  index: number;
  strokeId: string;
  originalStroke: Point[];
  refinedStroke: Point[] | Point[][] | null; // Point[] for circles/lines, Point[][] for rectangles/triangles
  recognizedAs: string;
  type: string;
  fingerprint: Fingerprint;
  bounds: Bounds;
  geometricShape: Shape;
}

export interface CompositionFingerprint {
  componentTypes: string[];
  componentCount: number;
  typeHistogram: { [key: string]: number };
  relationshipHistogram: {
    touching: number;
    intersecting: number;
    containment: number;
  };
  topologyHash: string;
  canonicalOrder: number[];
  fuzzyRelationships?: boolean;
}

export interface SpatialConnection {
  a: number;
  b: number;
  relationship: 'touching' | 'intersecting';
  distance: number;
  intersectionPoints?: Point[]; // Actual geometric intersection points (for intersecting relationships)
}

export interface SpatialContainment {
  outer: number;
  inner: number;
}

export interface SpatialGraph {
  connections: SpatialConnection[];
  containment: SpatialContainment[];
}

export interface SemanticDescription {
  type: 'composition';
  name: string;
  components: Component[];
  relationships: string[];
}

// ===== RECOGNITION TYPES =====

export interface RecognitionResult {
  type: string;
  label: string;
  score: number;
  confidence: number;
  isComposition?: boolean;
  componentCount?: number;
  isUserPrimitive?: boolean;
  matchDetails?: any;
  clusterIndex?: number;
  componentIndices?: number[];
}

export interface StrokeAnalysis {
  fingerprint: Fingerprint;
  results: RecognitionResult[];
}

// ===== HISTORY/UNDO TYPES =====

export interface HistoryAction {
  type: string;
  timestamp: number;
  before: AppState;
  after: AppState;
  metadata: any;
}

export interface History {
  actions: HistoryAction[];
  currentIndex: number;
  maxSize: number;
}

// ===== APPLICATION STATE =====

export interface RefinementSettings {
  enabled: boolean;
  smooth: number;
  simplify: number;
  normalize: boolean;
}

export interface AppState {
  // Drawing data
  shapes: Shape[];
  strokes: Point[][];
  strokeIds: string[];
  refinedStrokes: (Point[] | Point[][] | null)[]; // Point[] for circles/lines, Point[][] for rectangles/triangles
  semanticData: (any | null)[];
  tipDebugData: (any | null)[];
  cornerDebugData: (any | null)[];
  context: string[];

  // Current stroke
  currentStroke: Point[];
  isDrawing: boolean;

  // UI state
  nextStrokeId: number;
  suggestions: RecognitionResult[];
  compositionMatches: any[];
  selectedStrokeIndex: number | null;
  lastFingerprint: Fingerprint | null;
  debugMode: boolean;
  verboseMode: boolean;
  showSaveUI: boolean;
  saveMode: 'single' | 'compound';

  // Settings
  refinement: RefinementSettings;

  // Systems
  history: History;
  library: Library;
}

// ===== STORE ACTIONS =====

export interface StoreActions {
  // Drawing
  startStroke: (point: Point) => void;
  addPoint: (point: Point) => void;
  endStroke: () => void;
  clearCanvas: () => void;

  // Recognition
  acceptSuggestion: (suggestion: RecognitionResult) => void;
  rejectSuggestion: () => void;

  // Library
  saveToLibrary: (name: string, key: string) => void;
  deleteFromLibrary: (key: string) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Settings
  setDebugMode: (enabled: boolean) => void;
  setVerboseMode: (enabled: boolean) => void;
  setRefinement: (settings: Partial<RefinementSettings>) => void;

  // UI actions
  showSaveDialog: (mode: 'single' | 'compound') => void;
  hideSaveDialog: () => void;
}

export type Store = AppState & StoreActions;
