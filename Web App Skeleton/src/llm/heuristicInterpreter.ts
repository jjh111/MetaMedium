// Heuristic Interpreter (Tier 0 Fallback)
// Uses geometric rules when no LLM is available
// This will eventually be replaced by in-browser LLM

import type {
  InterpretationContext,
  InterpretationResult,
  InterpretationCandidate,
  LLMInterpreter,
} from './types';
import type { Fingerprint, Library } from '../types';

export class HeuristicInterpreter implements LLMInterpreter {
  public tier = 0 as const;

  isAvailable(): boolean {
    return true; // Always available as fallback
  }

  async interpret(context: InterpretationContext): Promise<InterpretationResult> {
    const startTime = performance.now();
    const { stroke, library } = context;
    const fp = stroke.fingerprint;

    const candidates: InterpretationCandidate[] = [];

    // Check for selection gesture first
    const selectionResult = this.detectSelectionGesture(context);
    if (selectionResult.isSelectionGesture && selectionResult.confidence > 0.7) {
      return {
        candidates: [],
        isSelectionGesture: true,
        selectionDetails: {
          enclosedShapeIndices: selectionResult.enclosedIndices,
          confidence: selectionResult.confidence,
        },
        tier: 0,
        latencyMs: performance.now() - startTime,
      };
    }

    // Try builtin primitives
    const line = this.detectLine(fp);
    if (line) candidates.push(line);

    const circle = this.detectCircle(fp);
    if (circle) candidates.push(circle);

    const triangle = this.detectTriangle(fp);
    if (triangle) candidates.push(triangle);

    const rectangle = this.detectRectangle(fp);
    if (rectangle) candidates.push(rectangle);

    // Try matching against user library items
    const libraryMatches = this.matchLibrary(fp, library);
    candidates.push(...libraryMatches);

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    return {
      candidates,
      isSelectionGesture: false,
      selectionDetails: null,
      tier: 0,
      latencyMs: performance.now() - startTime,
    };
  }

  private detectLine(fp: Fingerprint): InterpretationCandidate | null {
    const isStraight = fp.straightness > 0.65;
    const notClosed = !fp.isClosed;
    const fewCorners = fp.corners <= 2;

    if (isStraight && notClosed && fewCorners) {
      return {
        type: 'line',
        label: 'Line',
        confidence: 0.9,
        reasoning: `Straight (${fp.straightness.toFixed(2)}), not closed, few corners`,
      };
    }
    return null;
  }

  private detectCircle(fp: Fingerprint): InterpretationCandidate | null {
    const isClosed = fp.isClosed || fp.closureDistance < 50;
    const fewCorners = fp.corners <= 1;
    const notStraight = fp.straightness < 0.5;
    const reasonableRatio = fp.aspectRatio >= 0.5 && fp.aspectRatio <= 2.0;

    if (isClosed && fewCorners && notStraight && reasonableRatio) {
      return {
        type: 'circle',
        label: 'Circle',
        confidence: 0.8,
        reasoning: `Closed, curved (straightness ${fp.straightness.toFixed(2)}), no corners`,
      };
    }
    return null;
  }

  private detectTriangle(fp: Fingerprint): InterpretationCandidate | null {
    const isClosed = fp.isClosed;
    const hasThreeCorners = fp.corners >= 2 && fp.corners <= 3;
    const reasonableShape = fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0;

    if (isClosed && hasThreeCorners && reasonableShape) {
      return {
        type: 'triangle',
        label: 'Triangle',
        confidence: 0.85,
        reasoning: `Closed with ${fp.corners} corners`,
      };
    }
    return null;
  }

  private detectRectangle(fp: Fingerprint): InterpretationCandidate | null {
    const isClosed = fp.isClosed;
    const hasFourCorners = fp.corners >= 3 && fp.corners <= 5;
    const aspectRatioOk = fp.aspectRatio > 0.3 && fp.aspectRatio < 3.0;

    if (isClosed && hasFourCorners && aspectRatioOk) {
      return {
        type: 'rectangle',
        label: 'Rectangle',
        confidence: 0.8,
        reasoning: `Closed with ${fp.corners} corners, aspect ${fp.aspectRatio.toFixed(2)}`,
      };
    }
    return null;
  }

  private matchLibrary(fp: Fingerprint, library: Library): InterpretationCandidate[] {
    const matches: InterpretationCandidate[] = [];

    Object.entries(library).forEach(([key, item]) => {
      if (item.type !== 'user-primitive' || !item.fingerprint) return;

      const libFp = item.fingerprint as Fingerprint;
      const similarity = this.compareFingerprints(fp, libFp);

      if (similarity > 0.6) {
        matches.push({
          type: key,
          label: item.label,
          confidence: similarity,
          reasoning: `Matches saved "${item.label}" (${(similarity * 100).toFixed(0)}% similar)`,
          isUserPrimitive: true,
        });
      }
    });

    return matches;
  }

  private compareFingerprints(fp1: Fingerprint, fp2: Fingerprint): number {
    let score = 0;
    let weights = 0;

    // Straightness (weight: 0.3)
    const straightnessDiff = Math.abs(fp1.straightness - fp2.straightness);
    if (straightnessDiff > 0.5) return 0; // Veto if too different
    score += (1 - straightnessDiff) * 0.3;
    weights += 0.3;

    // Aspect ratio (weight: 0.25)
    const ar1 = Math.min(fp1.aspectRatio, 1 / fp1.aspectRatio);
    const ar2 = Math.min(fp2.aspectRatio, 1 / fp2.aspectRatio);
    const aspectDiff = Math.abs(ar1 - ar2);
    score += Math.max(0, 1 - aspectDiff * 2) * 0.25;
    weights += 0.25;

    // Corner count (weight: 0.2)
    const cornerDiff = Math.abs(fp1.corners - fp2.corners);
    score += Math.max(0, 1 - cornerDiff / 4) * 0.2;
    weights += 0.2;

    // Closure match (weight: 0.15)
    const closureMatch = fp1.isClosed === fp2.isClosed ? 1.0 : 0.0;
    score += closureMatch * 0.15;
    weights += 0.15;

    // Size similarity (weight: 0.1)
    const sizeDiff = Math.abs(fp1.size - fp2.size) / Math.max(fp1.size, fp2.size, 1);
    score += Math.max(0, 1 - sizeDiff) * 0.1;
    weights += 0.1;

    return score / weights;
  }

  // Hardcoded selection gesture detection (circle + checkmark)
  private detectSelectionGesture(context: InterpretationContext): {
    isSelectionGesture: boolean;
    confidence: number;
    enclosedIndices: number[];
  } {
    const { stroke, canvas } = context;
    // stroke.fingerprint available for future use
    const points = stroke.points;

    // Must have existing shapes to select
    if (canvas.acceptedShapes.length === 0) {
      return { isSelectionGesture: false, confidence: 0, enclosedIndices: [] };
    }

    // Analyze stroke structure: circle-ish start + tail end
    if (points.length < 20) {
      return { isSelectionGesture: false, confidence: 0, enclosedIndices: [] };
    }

    // Split stroke: ~75% should be circular, ~25% is the tail/checkmark
    const splitPoint = Math.floor(points.length * 0.75);
    const circularPart = points.slice(0, splitPoint);
    const tailPart = points.slice(splitPoint);

    // Check circular part
    const circularClosed = this.isApproximatelyClosed(circularPart);
    const circularNotStraight = this.calculateStraightness(circularPart) < 0.5;

    if (!circularNotStraight) {
      return { isSelectionGesture: false, confidence: 0, enclosedIndices: [] };
    }

    // Check tail part (should be relatively straight - the checkmark)
    const tailStraightness = this.calculateStraightness(tailPart);
    const hasTail = tailStraightness > 0.3 && tailPart.length > 5;

    if (!hasTail) {
      return { isSelectionGesture: false, confidence: 0, enclosedIndices: [] };
    }

    // Check drawing speed (selection gestures are typically quick)
    const isQuickDraw = stroke.drawingDurationMs < 1500;

    // Find enclosed shapes
    const enclosedIndices = this.findEnclosedShapes(circularPart, canvas.acceptedShapes);

    // Calculate confidence
    let confidence = 0;
    if (circularClosed) confidence += 0.3;
    if (circularNotStraight) confidence += 0.2;
    if (hasTail) confidence += 0.3;
    if (isQuickDraw) confidence += 0.1;
    if (enclosedIndices.length > 0) confidence += 0.1;

    return {
      isSelectionGesture: confidence > 0.6 && enclosedIndices.length > 0,
      confidence,
      enclosedIndices,
    };
  }

  private isApproximatelyClosed(points: { x: number; y: number }[]): boolean {
    if (points.length < 5) return false;
    const start = points[0];
    const end = points[points.length - 1];
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    return distance < 80; // More lenient for gesture
  }

  private calculateStraightness(points: { x: number; y: number }[]): number {
    if (points.length < 2) return 0;
    const start = points[0];
    const end = points[points.length - 1];
    const directDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    return pathLength === 0 ? 0 : directDistance / pathLength;
  }

  private findEnclosedShapes(
    lassoPoints: { x: number; y: number }[],
    shapes: Array<{ index: number; bounds: { minX: number; maxX: number; minY: number; maxY: number } }>
  ): number[] {
    // Get lasso bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    lassoPoints.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    // Find shapes whose bounds are within lasso bounds
    const enclosed: number[] = [];
    shapes.forEach(shape => {
      const b = shape.bounds;
      const centerX = (b.minX + b.maxX) / 2;
      const centerY = (b.minY + b.maxY) / 2;

      // Check if shape center is within lasso bounds
      if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
        enclosed.push(shape.index);
      }
    });

    return enclosed;
  }
}

// Singleton instance
let heuristicInstance: HeuristicInterpreter | null = null;

export function getHeuristicInterpreter(): HeuristicInterpreter {
  if (!heuristicInstance) {
    heuristicInstance = new HeuristicInterpreter();
  }
  return heuristicInstance;
}
