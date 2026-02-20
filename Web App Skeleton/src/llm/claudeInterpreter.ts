// Claude API Interpreter (Tier 1/2)
// Direct API calls to Claude for stroke interpretation

import type {
  InterpretationContext,
  InterpretationResult,
  LLMInterpreter,
} from './types';

// Note: In browser, we'll use fetch directly instead of the SDK
// The SDK is primarily for Node.js environments

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export class ClaudeInterpreter implements LLMInterpreter {
  private apiKey: string;
  public tier: 1 | 2;
  private model: string;

  constructor(apiKey: string, tier: 1 | 2 = 1) {
    this.apiKey = apiKey;
    this.tier = tier;
    this.model = tier === 1 ? 'claude-3-haiku-20240307' : 'claude-sonnet-4-20250514';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async interpret(context: InterpretationContext): Promise<InterpretationResult> {
    const startTime = performance.now();

    const prompt = this.buildPrompt(context);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const rawResponse = data.content[0]?.text || '';
      const latencyMs = performance.now() - startTime;

      return this.parseResponse(rawResponse, latencyMs);
    } catch (error) {
      console.error('[ClaudeInterpreter] Error:', error);
      return {
        candidates: [],
        isSelectionGesture: false,
        selectionDetails: null,
        rawResponse: String(error),
        tier: this.tier,
        latencyMs: performance.now() - startTime,
      };
    }
  }

  private buildPrompt(context: InterpretationContext): string {
    const { stroke, library, canvas, userFingerprints } = context;
    const fp = stroke.fingerprint;

    // Build library summary
    const libraryItems = Object.entries(library)
      .map(([_key, item]) => {
        if (item.type === 'builtin-primitive') {
          return `- "${item.label}" (builtin ${item.shapeType})`;
        } else if (item.type === 'user-primitive') {
          return `- "${item.label}" (user-saved, based on ${item.basedOn || 'unknown'})`;
        } else if (item.type === 'composition') {
          const componentCount = item.components?.length || 0;
          return `- "${item.label}" (composition, ${componentCount} components)`;
        }
        return `- "${item.label}" (${item.type})`;
      })
      .join('\n');

    // Build canvas state summary
    const canvasSummary = canvas.acceptedShapes.length > 0
      ? canvas.acceptedShapes.map(s => `  - ${s.type} at (${Math.round(s.bounds.minX)},${Math.round(s.bounds.minY)})`).join('\n')
      : '  (empty canvas)';

    // Build fingerprint comparison if available
    let fingerprintContext = '';
    if (userFingerprints?.ranges) {
      const ranges = userFingerprints.ranges;
      fingerprintContext = `
USER'S CALIBRATED PATTERNS:
${ranges.circle ? `- Circle: straightness ${ranges.circle.ranges.straightness.min.toFixed(2)}-${ranges.circle.ranges.straightness.max.toFixed(2)}` : ''}
${ranges.line ? `- Line: straightness ${ranges.line.ranges.straightness.min.toFixed(2)}-${ranges.line.ranges.straightness.max.toFixed(2)}` : ''}
${ranges.rectangle ? `- Rectangle: corners ~${ranges.rectangle.ranges.straightness.mean.toFixed(2)}` : ''}
${ranges.triangle ? `- Triangle: corners ~${ranges.triangle.ranges.straightness.mean.toFixed(2)}` : ''}
`;
    }

    return `You are interpreting a hand-drawn stroke in a compositional drawing system.

STROKE FINGERPRINT:
- Points: ${fp.pointCount}
- Straightness: ${fp.straightness.toFixed(3)} (1.0 = perfectly straight line, <0.4 = curved)
- Aspect ratio: ${fp.aspectRatio.toFixed(2)} (width/height)
- Corners detected: ${fp.corners}
- Is closed: ${fp.isClosed}
- Closure distance: ${fp.closureDistance.toFixed(1)}px
- Size: ${fp.size.toFixed(0)}px
- Drawing duration: ${stroke.drawingDurationMs}ms
${fingerprintContext}
LIBRARY (available shapes):
${libraryItems}

CANVAS STATE:
${canvasSummary}

TASK: Determine what shape this stroke represents.

Consider:
1. Does it match a builtin primitive (circle, line, rectangle, triangle)?
2. Does it match a user-saved shape from the library?
3. Could it be a SELECTION GESTURE? (circle with checkmark tail, drawn quickly around existing shapes)

For selection gesture detection:
- The stroke should be closed or nearly closed
- It should enclose existing shapes on the canvas
- It may have a "checkmark" flourish at the end
- Drawing speed is typically faster than careful shape drawing

Return ONLY valid JSON in this exact format:
{
  "candidates": [
    {
      "type": "circle",
      "label": "Circle",
      "confidence": 0.85,
      "reasoning": "Low straightness (0.23), closed shape, no corners"
    }
  ],
  "isSelectionGesture": false,
  "selectionDetails": null
}

If it IS a selection gesture, include:
{
  "candidates": [],
  "isSelectionGesture": true,
  "selectionDetails": {
    "enclosedShapeIndices": [0, 1, 2],
    "confidence": 0.9
  }
}`;
  }

  private parseResponse(rawResponse: string, latencyMs: number): InterpretationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = rawResponse;
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);

      return {
        candidates: parsed.candidates || [],
        isSelectionGesture: parsed.isSelectionGesture || false,
        selectionDetails: parsed.selectionDetails || null,
        rawResponse,
        tier: this.tier,
        latencyMs,
      };
    } catch (error) {
      console.error('[ClaudeInterpreter] Failed to parse response:', rawResponse);
      return {
        candidates: [],
        isSelectionGesture: false,
        selectionDetails: null,
        rawResponse,
        tier: this.tier,
        latencyMs,
      };
    }
  }
}

// Factory function
export function createClaudeInterpreter(
  apiKey: string,
  tier: 1 | 2 = 1
): ClaudeInterpreter | null {
  if (!apiKey) return null;
  return new ClaudeInterpreter(apiKey, tier);
}
