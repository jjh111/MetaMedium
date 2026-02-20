// MetaMedium v4 - Zustand Store
// Central state management with LLM integration

import { create } from 'zustand';
import type { Store, Point, RecognitionResult, RefinementSettings, Library } from '../types';
import { analyzeStroke } from '../core/recognition';
import { smoothStroke, simplifyStroke, normalizeStroke, getFingerprint, getBounds } from '../utils/geometry';
import { buildSpatialGraph, checkCanvasForCompositions } from '../core/spatial';
import { createCompositionFingerprint } from '../core/matching';
import { setVerboseMode as setLoggerVerbose } from '../utils/logger';
import { refineStroke } from '../utils/refinement';
import { createShapeFromRecognition } from '../utils/shapeBuilder';
import { interpret, type InterpretationContext } from '../llm';

// ===== INITIAL LIBRARY =====

const initialLibrary: Library = {
  circle: {
    type: 'builtin-primitive',
    shapeType: 'circle',
    label: 'Circle',
    usageCount: 0,
  },
  triangle: {
    type: 'builtin-primitive',
    shapeType: 'triangle',
    label: 'Triangle',
    usageCount: 0,
  },
  rectangle: {
    type: 'builtin-primitive',
    shapeType: 'rectangle',
    label: 'Rectangle',
    usageCount: 0,
  },
};

// ===== STORE =====

export const useStore = create<Store>((set, get) => ({
  // ===== STATE =====

  // Drawing data
  shapes: [],
  strokes: [],
  strokeIds: [],
  refinedStrokes: [],
  semanticData: [],
  tipDebugData: [],
  cornerDebugData: [],
  context: [],

  // Current stroke
  currentStroke: [],
  currentStrokeStartTime: null,
  isDrawing: false,

  // UI state
  nextStrokeId: 1,
  suggestions: [],
  compositionMatches: [],
  selectedStrokeIndex: null,
  lastFingerprint: null,
  debugMode: false,
  verboseMode: false,
  showSaveUI: false,
  saveMode: 'single',
  showApiSettings: false,

  // Selection state
  selection: {
    isActive: false,
    selectedIndices: [],
    selectionBounds: null,
  },

  // LLM state
  llm: {
    isInterpreting: false,
    lastInterpretationTier: null,
    lastInterpretationMs: null,
    interpretationError: null,
  },

  // Settings
  refinement: {
    enabled: true,
    smooth: 2,
    simplify: 2,
    normalize: false,
  },

  // Systems
  history: {
    actions: [],
    currentIndex: -1,
    maxSize: 100,
  },
  library: initialLibrary,

  // ===== ACTIONS =====

  startStroke: (point: Point) => {
    set({
      currentStroke: [point],
      currentStrokeStartTime: Date.now(),
      isDrawing: true,
    });
  },

  addPoint: (point: Point) => {
    const state = get();
    if (!state.isDrawing) return;

    set({
      currentStroke: [...state.currentStroke, point],
    });
  },

  endStroke: () => {
    const state = get();
    if (state.currentStroke.length === 0) return;

    // Add stroke to arrays
    let processedStroke = [...state.currentStroke];
    const newStrokeId = `stroke-${state.nextStrokeId}`;

    // Apply refinement if enabled
    let refinedStroke: Point[] | null = null;
    if (state.refinement.enabled) {
      refinedStroke = processedStroke;

      // Apply smoothing
      if (state.refinement.smooth > 0) {
        refinedStroke = smoothStroke(refinedStroke, state.refinement.smooth);
      }

      // Apply simplification
      if (state.refinement.simplify > 0) {
        refinedStroke = simplifyStroke(refinedStroke, state.refinement.simplify);
      }

      // Apply normalization if enabled
      if (state.refinement.normalize) {
        refinedStroke = normalizeStroke(refinedStroke, 200);
      }
    }

    // Analyze stroke (use refined if available, otherwise original)
    const strokeForAnalysis = refinedStroke || processedStroke;
    const analysis = analyzeStroke(strokeForAnalysis);

    const newStrokes = [...state.strokes, processedStroke];
    const newStrokeIds = [...state.strokeIds, newStrokeId];
    const newContext = [...state.context, ''];
    const newRefinedStrokes = [...state.refinedStrokes, refinedStroke];
    const newShapes = [...state.shapes, undefined as any]; // Shape will be created when accepted

    // Check for composition matches with updated canvas state
    const compositionMatches = checkCanvasForCompositions(
      newStrokes,
      newStrokeIds,
      newContext,
      newRefinedStrokes,
      newShapes,
      state.library,
      35 // proximity threshold
    );

    set({
      strokes: newStrokes,
      strokeIds: newStrokeIds,
      context: newContext,
      refinedStrokes: newRefinedStrokes,
      semanticData: [...state.semanticData, null],
      tipDebugData: [...state.tipDebugData, null],
      cornerDebugData: [...state.cornerDebugData, null],
      shapes: newShapes,
      currentStroke: [],
      isDrawing: false,
      nextStrokeId: state.nextStrokeId + 1,
      selectedStrokeIndex: state.strokes.length,
      lastFingerprint: analysis.fingerprint,
      suggestions: analysis.results,
      compositionMatches,
    });
  },

  clearCanvas: () => {
    set({
      shapes: [],
      strokes: [],
      strokeIds: [],
      refinedStrokes: [],
      semanticData: [],
      tipDebugData: [],
      cornerDebugData: [],
      context: [],
      currentStroke: [],
      suggestions: [],
      compositionMatches: [],
      selectedStrokeIndex: null,
      lastFingerprint: null,
      nextStrokeId: 1,
    });
  },

  acceptSuggestion: (suggestion: RecognitionResult) => {
    const state = get();
    if (state.selectedStrokeIndex === null) return;

    const idx = state.selectedStrokeIndex;
    const originalStroke = state.strokes[idx];
    const newContext = [...state.context];
    newContext[idx] = suggestion.type;

    // Update library usage
    const newLibrary = { ...state.library };
    if (newLibrary[suggestion.type]) {
      newLibrary[suggestion.type] = {
        ...newLibrary[suggestion.type],
        usageCount: newLibrary[suggestion.type].usageCount + 1,
      };
    }

    // Determine if this is a user primitive (no refinement) or builtin (should refine)
    const isUserPrimitive = newLibrary[suggestion.type] &&
                           newLibrary[suggestion.type].type === 'user-primitive';
    const builtinShapes = ['circle', 'line', 'rectangle', 'triangle'];
    const isBuiltin = builtinShapes.includes(suggestion.type);

    // Generate refined geometry ONLY for built-in shapes
    // User-saved shapes are NOT refined - they stay as original stroke (just turn blue)
    const newRefinedStrokes = [...state.refinedStrokes];
    const newCornerDebugData = [...state.cornerDebugData];
    const newTipDebugData = [...state.tipDebugData];
    const newShapes = [...state.shapes];

    if (isUserPrimitive) {
      // No refinement for user primitives
      newRefinedStrokes[idx] = null;
      newTipDebugData[idx] = null;
      newCornerDebugData[idx] = null;
      newShapes[idx] = undefined as any; // No geometric shape for user primitives
    } else if (isBuiltin) {
      // Refine built-in shapes (circle, line, rectangle, triangle)
      const refined = refineStroke(originalStroke, suggestion.type, state.lastFingerprint);
      newRefinedStrokes[idx] = refined;

      // Store tip debug data for triangles
      if (suggestion.type === 'triangle' && state.lastFingerprint?.tipPoint) {
        newTipDebugData[idx] = state.lastFingerprint.tipPoint;
      } else {
        newTipDebugData[idx] = null;
      }

      // Store corner debug data for visualization (triangles and rectangles)
      if ((suggestion.type === 'triangle' || suggestion.type === 'rectangle') &&
          state.lastFingerprint && state.lastFingerprint.cornerData) {
        newCornerDebugData[idx] = state.lastFingerprint.cornerData;
      } else {
        newCornerDebugData[idx] = null;
      }

      // Create geometric shape for intersection detection
      const strokeBounds = getBounds(originalStroke);
      const geometricShape = createShapeFromRecognition(
        originalStroke,
        suggestion.type,
        refined,
        strokeBounds,
        state.lastFingerprint
      );
      newShapes[idx] = geometricShape;
    }

    // Update composition matches with new context
    const compositionMatches = checkCanvasForCompositions(
      state.strokes,
      state.strokeIds,
      newContext,
      newRefinedStrokes,
      newShapes,
      newLibrary,
      35
    );

    set({
      context: newContext,
      library: newLibrary,
      refinedStrokes: newRefinedStrokes,
      cornerDebugData: newCornerDebugData,
      tipDebugData: newTipDebugData,
      shapes: newShapes,
      selectedStrokeIndex: null,
      suggestions: [],
      compositionMatches,
    });
  },

  rejectSuggestion: () => {
    set({
      selectedStrokeIndex: null,
      suggestions: [],
    });
  },

  saveToLibrary: (name: string, key: string) => {
    const state = get();

    // Check if name already exists
    if (state.library[key]) {
      console.error('Name already exists:', name);
      return;
    }

    // Determine if single stroke or composition
    const acceptedStrokes = state.strokes.filter((_, idx) => state.context[idx]);

    if (acceptedStrokes.length === 1) {
      // Save single stroke primitive
      const strokeIndex = state.strokes.findIndex((_, idx) => state.context[idx]);
      if (strokeIndex === -1) return;

      const stroke = state.strokes[strokeIndex];

      // Always save original stroke for user primitives (refinement is just visual)
      // This ensures we have Point[] for fingerprint matching
      const fingerprint = getFingerprint(stroke);

      // Capture what this shape is based on (builtin shapes only)
      const oldContext = state.context[strokeIndex];
      const builtinShapes = ['circle', 'rectangle', 'triangle', 'line', 'arc'];
      const basedOn = builtinShapes.includes(oldContext) ? oldContext : null;

      const newLibrary = { ...state.library };
      newLibrary[key] = {
        type: 'user-primitive',
        label: name,
        strokes: [stroke],
        fingerprint: fingerprint,
        basedOn: basedOn,
        usageCount: 1,
        created: Date.now(),
      };

      // Update context to reference the new primitive
      const newContext = [...state.context];
      newContext[strokeIndex] = key;

      set({ library: newLibrary, context: newContext });
    } else {
      // Save compound composition (all strokes on canvas)
      // Auto-accept any pending strokes as artN
      let artCounter = 0;
      const newContext = state.context.map((ctx, _idx) => {
        if (!ctx || ctx === '') {
          const artName = `art${artCounter}`;
          artCounter++;
          return artName;
        }
        return ctx;
      });

      // Build components array
      const components = state.strokes.map((stroke, idx) => {
        const refinedStroke = state.refinedStrokes[idx] || null;
        const recognizedAs = newContext[idx];
        const fingerprint = getFingerprint(stroke);
        const bounds = getBounds(stroke);

        // Extract type from recognizedAs
        let type = 'unknown';
        if (recognizedAs.startsWith('art')) {
          type = 'art';
        } else if (state.library[recognizedAs]) {
          const libItem = state.library[recognizedAs];
          type = libItem.shapeType || libItem.type || 'user-shape';
        } else {
          type = recognizedAs;
        }

        return {
          index: idx,
          strokeId: state.strokeIds[idx],
          originalStroke: stroke,
          refinedStroke: refinedStroke,
          recognizedAs: recognizedAs,
          type: type,
          fingerprint: fingerprint,
          bounds: bounds,
          geometricShape: state.shapes[idx],
        };
      });

      // Build spatial graph
      const spatialGraph = buildSpatialGraph(components);

      // Create composition fingerprint
      const compositionFingerprint = createCompositionFingerprint(
        components,
        spatialGraph
      );
      compositionFingerprint.fuzzyRelationships = true;

      // Create semantics for hierarchical queries
      const typeCounts: { [key: string]: number } = {};
      components.forEach((c) => {
        typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
      });

      const semantics = {
        type: 'composition' as const,
        name: name,
        components: components,
        relationships: spatialGraph.connections.map((conn) => {
          return `${components[conn.a].recognizedAs} ${conn.relationship} ${components[conn.b].recognizedAs}`;
        }),
      };

      const newLibrary = { ...state.library };
      newLibrary[key] = {
        type: 'composition',
        label: name,
        components: components,
        fingerprint: compositionFingerprint,
        spatialGraph: spatialGraph,
        semantics: semantics,
        usageCount: 1,
        created: Date.now(),
        fuzzyRelationships: true,
      };

      set({ library: newLibrary, context: newContext });
    }

    // Persist to localStorage
    try {
      const library = get().library;
      localStorage.setItem('metamedium_library_v1', JSON.stringify(library));
    } catch (e) {
      console.error('Failed to save library:', e);
    }

    // Close save dialog after successful save
    set({ showSaveUI: false });
  },

  deleteFromLibrary: (key: string) => {
    const state = get();
    const newLibrary = { ...state.library };
    delete newLibrary[key];

    set({ library: newLibrary });
  },

  undo: () => {
    const state = get();
    if (state.history.currentIndex < 0) return;

    const action = state.history.actions[state.history.currentIndex];

    // Restore previous state
    set({
      ...action.before,
      history: {
        ...state.history,
        currentIndex: state.history.currentIndex - 1,
      },
    });
  },

  redo: () => {
    const state = get();
    if (state.history.currentIndex >= state.history.actions.length - 1) return;

    const nextIndex = state.history.currentIndex + 1;
    const action = state.history.actions[nextIndex];

    // Restore next state
    set({
      ...action.after,
      history: {
        ...state.history,
        currentIndex: nextIndex,
      },
    });
  },

  setDebugMode: (enabled: boolean) => {
    set({ debugMode: enabled });
  },

  setVerboseMode: (enabled: boolean) => {
    setLoggerVerbose(enabled);
    set({ verboseMode: enabled });
  },

  setRefinement: (settings: Partial<RefinementSettings>) => {
    const state = get();
    set({
      refinement: {
        ...state.refinement,
        ...settings,
      },
    });
  },

  showSaveDialog: (mode: 'single' | 'compound') => {
    set({ showSaveUI: true, saveMode: mode });
  },

  hideSaveDialog: () => {
    set({ showSaveUI: false });
  },

  showApiSettingsDialog: () => {
    set({ showApiSettings: true });
  },

  hideApiSettingsDialog: () => {
    set({ showApiSettings: false });
  },

  // LLM Interpretation
  setLLMInterpreting: (isInterpreting: boolean) => {
    set((state) => ({
      llm: { ...state.llm, isInterpreting },
    }));
  },

  interpretWithLLM: async (strokeIndex: number) => {
    const state = get();
    const stroke = state.strokes[strokeIndex];
    if (!stroke) return;

    // Set loading state
    set((s) => ({
      llm: { ...s.llm, isInterpreting: true, interpretationError: null },
    }));

    try {
      // Calculate drawing duration
      const drawingDurationMs = state.currentStrokeStartTime
        ? Date.now() - state.currentStrokeStartTime
        : 500; // Default if not tracked

      // Build interpretation context
      const context: InterpretationContext = {
        stroke: {
          points: stroke,
          fingerprint: state.lastFingerprint || getFingerprint(stroke),
          drawingDurationMs,
        },
        userFingerprints: null, // TODO: Load from profile
        library: state.library,
        canvas: {
          strokeCount: state.strokes.length,
          acceptedShapes: state.strokes
            .map((s, idx) => {
              if (!state.context[idx]) return null;
              const bounds = getBounds(s);
              return {
                index: idx,
                type: state.context[idx],
                bounds,
              };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null),
          spatialGraph: state.strokes.length > 1
            ? buildSpatialGraph(
                state.strokes.map((s, idx) => ({
                  index: idx,
                  strokeId: state.strokeIds[idx],
                  originalStroke: s,
                  refinedStroke: state.refinedStrokes[idx],
                  bounds: getBounds(s),
                  recognizedAs: state.context[idx] || '',
                  type: state.context[idx] || 'unknown',
                  fingerprint: getFingerprint(s),
                  geometricShape: state.shapes[idx],
                }))
              )
            : null,
        },
      };

      // Call LLM interpreter
      const result = await interpret(context);

      // Handle selection gesture
      if (result.isSelectionGesture && result.selectionDetails) {
        set((s) => ({
          llm: {
            ...s.llm,
            isInterpreting: false,
            lastInterpretationTier: result.tier,
            lastInterpretationMs: result.latencyMs,
          },
          selection: {
            isActive: true,
            selectedIndices: result.selectionDetails!.enclosedShapeIndices,
            selectionBounds: null, // TODO: Calculate
          },
          // Remove the gesture stroke from canvas
          strokes: s.strokes.slice(0, -1),
          strokeIds: s.strokeIds.slice(0, -1),
          context: s.context.slice(0, -1),
          refinedStrokes: s.refinedStrokes.slice(0, -1),
          shapes: s.shapes.slice(0, -1),
          semanticData: s.semanticData.slice(0, -1),
          tipDebugData: s.tipDebugData.slice(0, -1),
          cornerDebugData: s.cornerDebugData.slice(0, -1),
          nextStrokeId: s.nextStrokeId - 1,
          selectedStrokeIndex: null,
          suggestions: [],
        }));
        return;
      }

      // Convert LLM candidates to RecognitionResult format
      const suggestions: RecognitionResult[] = result.candidates.map((c) => ({
        type: c.type,
        label: c.label,
        score: c.confidence * 100,
        confidence: c.confidence,
        isUserPrimitive: c.isUserPrimitive,
        isComposition: c.isComposition,
        matchDetails: { reasoning: c.reasoning },
      }));

      set((s) => ({
        llm: {
          ...s.llm,
          isInterpreting: false,
          lastInterpretationTier: result.tier,
          lastInterpretationMs: result.latencyMs,
        },
        suggestions,
        selectedStrokeIndex: strokeIndex,
      }));
    } catch (error) {
      console.error('[Store] LLM interpretation error:', error);
      set((s) => ({
        llm: {
          ...s.llm,
          isInterpreting: false,
          interpretationError: String(error),
        },
      }));
    }
  },

  // Selection
  setSelection: (indices: number[]) => {
    set({
      selection: {
        isActive: indices.length > 0,
        selectedIndices: indices,
        selectionBounds: null, // TODO: Calculate union bounds
      },
    });
  },

  clearSelection: () => {
    set({
      selection: {
        isActive: false,
        selectedIndices: [],
        selectionBounds: null,
      },
    });
  },
}));
