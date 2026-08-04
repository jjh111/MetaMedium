// An LLM tier as a participant.
//
// This is the adapter the whole of v7 turns on: session state → prompt →
// several readings → propose(). It is deliberately thin, because the engine
// already did the hard part — `propose()` holds an attributed, unblessed edge
// and nothing auto-commits (ARCHITECTURE-v7 §2).
//
// THE RULE THIS FILE EXISTS TO ENFORCE: a model is asked for N candidate
// interpretations, never for "the answer" (§4.1). Collapsing to one reading
// would make an LLM tier less expressive than the Tier 0 heuristics it sits
// beside, which are already multi-parse.

import type { Session, ProposedEdge } from '../session/session';
import type { ProviderConfig } from '../llm/provider';
import { complete, providerLabel, providerTier } from '../llm/provider';
import { describeSession, describeSignature } from './serialize';

/** One candidate reading, as the model reports it. */
export interface AgentReading {
  label: string;
  confidence: number;
  reasoning: string;
}

export interface InterpretResult {
  ok: boolean;
  /** Every reading the model offered — plural by design. */
  readings: AgentReading[];
  /** Present when the call failed; the canvas degrades to Tier 0. */
  error?: string;
  /** Raw text, kept for debugging a model that won't follow the format. */
  raw?: string;
}

export const MAX_READINGS = 4;

const SYSTEM_PROMPT = `You are a participant on a shared drawing canvas, alongside a human and the canvas's own geometric recognizer.

You are given GROUNDED FACTS about marks that were drawn: measured geometry, spatial relations, and how other participants already read them. You are not given an image. Trust the measurements — they are exact.

Your job is to offer INTERPRETATIONS, not answers.

Rules:
- Offer between 1 and ${MAX_READINGS} genuinely different readings, ranked by confidence. A drawing can be several things at once; that ambiguity is useful information, not a problem to resolve.
- Do NOT simply restate a reading that is already listed unless you actively agree with it — and if you do agree, say why it holds up.
- If you disagree with another participant's reading, offer yours anyway. Disagreement is a signal the human wants to see.
- Ground every reading in the facts you were given. Cite the specific geometry or relation that supports it.
- Confidence is 0.0–1.0 and should be honest. Low confidence on a real possibility beats false certainty.

Reply with ONLY a JSON array, no prose, no code fences:
[{"label":"short-name","confidence":0.0-1.0,"reasoning":"one sentence citing the evidence"}]`;

function clamp01(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/**
 * Parse the model's reply into readings.
 *
 * Tolerant on purpose: local models wrap JSON in prose or code fences, and a
 * malformed reply must degrade to "no readings", never throw into the canvas.
 */
export function parseReadings(text: string): AgentReading[] {
  if (!text) return [];

  // Strip code fences, then take the outermost array.
  const unfenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = unfenced.indexOf('[');
  const end = unfenced.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const readings: AgentReading[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === 'string' ? rec.label.trim() : '';
    if (!label) continue;
    readings.push({
      label,
      confidence: clamp01(rec.confidence),
      reasoning: typeof rec.reasoning === 'string' ? rec.reasoning.trim() : '',
    });
  }

  // Rank, but never truncate below what the model considered worth saying —
  // the cap is a prompt instruction, and a model that offers more is not wrong.
  return readings.sort((a, b) => b.confidence - a.confidence);
}

/** Readings → the edges `propose()` expects. */
export function readingsToEdges(readings: AgentReading[], targetIsCluster: boolean): ProposedEdge[] {
  return readings.map((r) => ({
    // A cluster reading names a possible composition; a stroke reading names a
    // type. Both live in the same `type:` namespace the engine already uses.
    to: `type:${r.label.toLowerCase().replace(/\s+/g, '-')}`,
    rel: 'resembles',
    weight: r.confidence,
    reasoning: r.reasoning || (targetIsCluster ? 'proposed for this group' : 'proposed for this mark'),
  }));
}

export interface AgentParticipant {
  /** The participant node id — use it to attribute anything this agent does. */
  id: string;
  /** Display name, e.g. `llm:qwen3`. */
  name: string;
  config: ProviderConfig;
  /**
   * Read some marks and propose every interpretation the model offers.
   *
   * Never throws. On failure the session is untouched and the canvas keeps
   * working from Tier 0.
   */
  interpret(nodeIds: string[], at: number): Promise<InterpretResult>;
}

/**
 * Register a model as a participant in a session.
 *
 * The agent joins as a first-class citizen — same `join`/`propose` channel a
 * human uses, same attribution, same "nothing commits without a blessing".
 */
export function createAgentParticipant(
  session: Session,
  config: ProviderConfig,
  at: number = 0
): AgentParticipant {
  const name = providerLabel(config);
  // Join at the provider's tier so surfaces can group readings by voice.
  const id = session.join('agent', name, at, providerTier(config));

  async function interpret(nodeIds: string[], now: number): Promise<InterpretResult> {
    const state = session.getState();
    const targets = nodeIds.filter((n) => state.nodes.has(n));
    if (targets.length === 0) return { ok: false, readings: [], error: 'no such nodes' };

    const isCluster = targets.length > 1;
    const context = describeSession(state, { nodeIds: targets });
    const signature = isCluster ? describeSignature(state, targets) : '';

    const question = isCluster
      ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.`
      : `What could this mark be? Offer several readings.`;

    const result = await complete(config, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${context}\n\n${question}` },
    ]);

    if (!result.ok) return { ok: false, readings: [], error: result.error };

    const readings = parseReadings(result.text);
    if (readings.length === 0) {
      return { ok: false, readings: [], error: 'no parseable readings', raw: result.text };
    }

    // Propose against the group's first member for a cluster, or the mark
    // itself for a single stroke. Every reading becomes its own held edge.
    const target = targets[0];
    session.propose({
      participantId: id,
      nodeId: target,
      edges: readingsToEdges(readings, isCluster),
      at: now,
    });

    return { ok: true, readings, raw: result.text };
  }

  return { id, name, config, interpret };
}
