// Each concept's conversions, as the offers of the tool that performs them
// (V1-PLAN B1). A concept is a reading — *row 0.83* — and stays one; what it
// lets the engine do is an offer from the tool its conversion names
// (`Conversion.tool`): a row lined up or its sizes matched is the tidy tool's,
// a line with a dot on it made a slider is the control tool's. Naming a
// concept is its reading's own pill, and a seeded brief is the field with
// words in it, so neither is offered here.

import type { Conversion } from '../concepts/concept';
import type { Offer, ToolScope } from './tool';
import { baseOn } from './rank';

/** The words that type to a conversion, by what it does. */
const VERBS: Partial<Record<Conversion['effect']['kind'], string[]>> = {
  tidy: ['line up', 'align', 'tidy'],
  equalize: ['match sizes', 'same size', 'equalize', 'equal'],
  control: ['slider', 'control'],
};

/**
 * The offers a tool makes of the concepts a scope reads as: every conversion
 * naming the tool, concept by concept, best concept first, each keyed
 * `<concept>:<conversion>` and standing on its concept's reading.
 */
export function conversionOffers(scope: ToolScope, toolId: string): Offer[] {
  const out: Offer[] = [];
  for (const concept of scope.reading.concepts) {
    for (const conv of concept.conversions) {
      if (conv.tool !== toolId) continue;
      const key = concept.concept + ':' + conv.id;
      if (out.some((o) => o.key === key)) continue;
      const grounds = { on: concept.concept, confidence: concept.confidence, why: concept.reasoning };
      out.push({
        key,
        label: conv.label,
        reason: conv.hint || '',
        base: baseOn(grounds),
        tool: toolId,
        ...(conv.tier === 2 ? { asks: 'model' as const } : {}),
        grounds,
        verbs: VERBS[conv.effect.kind] ?? [],
        data: { concept: concept.concept, effect: conv.effect },
      });
    }
  }
  return out;
}
