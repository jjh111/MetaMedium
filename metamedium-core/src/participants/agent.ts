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
import { describeSession, describeSignature, describeRegions, describeAddressed } from './serialize';
import { frameOf, regionsOf } from '../session/regions';

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

const ASK_PROMPT = `You are a participant on a shared drawing canvas, answering a question about specific marks the human has selected.

You are given GROUNDED FACTS: measured geometry, spatial relations between marks, and how each participant (including the canvas's own recognizer) currently reads them. You are not given an image.

Answer the question directly, in 1–3 short sentences of plain prose.

Rules:
- CITE THE EVIDENCE. Refer to the actual measurements and relations you were given — "these three closed shapes are joined by two strokes that touch both" — not to a general impression of what the drawing looks like.
- Do not restate the drawing back to the human. They can see it. Say the thing they cannot see.
- If the readings disagree, say so and explain what separates them. The disagreement is usually the answer.
- If the facts do not support an answer, say what is missing rather than guessing.
- No preamble, no markdown, no bullet points. Just the answer.`;

const MAKE_PROMPT = `You are a participant on a shared drawing canvas. The human has drawn a layout and asked you to build it.

You are given the FRAME and the REGIONS the human drew, measured in pixels, plus grounded facts about each mark. You are not given an image.

THE REGIONS ARE NOT SUGGESTIONS. The human drew them and their ink stays visible on the canvas outlining what you build. If you move, resize, or ignore a region, the ink will no longer line up with the result and the drawing will be visibly wrong. You choose what goes in a region and how it looks. You do not choose where the regions are.

Rules:
- Output a single self-contained HTML fragment: markup plus one <style> block. No <html>, <head>, or <body> tags, no external requests, no <script> unless the human asked for behaviour.
- Position each region with \`position:absolute\` at exactly the left/top/width/height you were given, on a \`position:relative\` root sized to the frame.
- Give every region-backed element \`data-region="rN"\` matching its region id. This is how the canvas knows which of your elements the human's ink is pointing at — omitting it breaks the link between the drawing and the code.
- A region that contains others is their container; nest accordingly and position children relative to it.
- Design it well within those constraints: real copy, considered type, sensible colour. Do not emit placeholder lorem ipsum.

Reply with ONLY the HTML. No prose, no code fences, no explanation.`;

const REVISE_PROMPT = `You are a participant on a shared drawing canvas, revising code you or another participant already generated.

You are given the existing HTML, the region frame it was built against, and which regions the human's new mark lands on.

Rules:
- Return the COMPLETE revised HTML fragment, not a diff and not a fragment of a fragment.
- Change only what the addressed regions cover. Everything else must come back byte-identical.
- Keep every \`data-region\` attribute and every absolute position exactly as they were. The human's ink is registered against those coordinates.
- If the request cannot be satisfied without moving a region, do the closest thing that keeps the geometry, and do not move it.

Reply with ONLY the HTML. No prose, no code fences, no explanation.`;

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

/**
 * Pull HTML out of a model reply.
 *
 * Same tolerance as `parseReadings`, for the same reason: local models fence
 * their output and add a sentence of preamble however firmly you ask them not
 * to. A reply we cannot use returns empty rather than throwing into the canvas.
 */
export function parseCode(text: string): string {
  if (!text) return '';
  const fenced = text.match(/```(?:html|xml)?\s*\n([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  // Drop any preamble before the first tag; models narrate despite instructions.
  const first = body.indexOf('<');
  if (first === -1) return '';
  const last = body.lastIndexOf('>');
  return body.slice(first, last + 1).trim();
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
  /**
   * Answer a question about some marks, placing the answer IN the canvas.
   *
   * Never throws. Several agents may answer the same question; each answer is
   * its own held, attributed node and none replaces another.
   */
  ask(question: string, nodeIds: string[], at: number): Promise<AskResult>;
  /**
   * Build (or revise) the code for an artifact and attach it to the canvas.
   *
   * ONE method, because it is one gesture: circle, command, prompt. Whether
   * that makes something or changes something is decided by whether the
   * artifact already carries code — the human does not pick a mode.
   *
   * Never throws. On failure the artifact keeps whatever code it had.
   */
  generate(args: {
    prompt: string;
    artifactId: string;
    at: number;
    /** Region ids the human's ink landed on. Present only when revising. */
    addressed?: string[];
  }): Promise<GenerateResult>;
}

export interface GenerateResult {
  ok: boolean;
  code?: string;
  /** True when this revised existing code rather than building from scratch. */
  revised?: boolean;
  error?: string;
  raw?: string;
}

export interface AskResult {
  ok: boolean;
  /** The prose answer, when the call succeeded. */
  text?: string;
  /** Id of the explanation node placed in the canvas. */
  explanationId?: string;
  error?: string;
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

  async function ask(question: string, nodeIds: string[], now: number): Promise<AskResult> {
    const q = question.trim();
    if (!q) return { ok: false, error: 'no question' };

    const state = session.getState();
    const targets = nodeIds.filter((n) => state.nodes.has(n));
    if (targets.length === 0) return { ok: false, error: 'no such nodes' };

    const context = describeSession(state, { nodeIds: targets });
    const result = await complete(config, [
      { role: 'system', content: ASK_PROMPT },
      { role: 'user', content: `${context}\n\nQuestion: ${q}` },
    ]);
    if (!result.ok) return { ok: false, error: result.error };

    const text = result.text.trim();
    if (!text) return { ok: false, error: 'empty answer' };

    const explanationId = session.answer({
      participantId: id,
      question: q,
      text,
      aboutIds: targets,
      at: now,
    });

    return { ok: true, text, explanationId: explanationId ?? undefined };
  }

  async function generate(args: {
    prompt: string;
    artifactId: string;
    at: number;
    addressed?: string[];
  }): Promise<GenerateResult> {
    const prompt = args.prompt.trim();
    if (!prompt) return { ok: false, error: 'no prompt' };

    const state = session.getState();
    const artifact = state.nodes.get(args.artifactId);
    if (!artifact) return { ok: false, error: 'no such artifact' };

    const frame = frameOf(artifact);
    if (!frame) return { ok: false, error: 'artifact has no frame' };
    const regions = regionsOf(artifact, state.nodes);

    // The newest code rep is what the surface renders, so it is what we revise.
    const existing = [...artifact.reps].reverse().find((r) => r.modality === 'code');
    const revising = !!existing;

    const context = describeSession(state, {
      nodeIds: regions.map((r) => r.nodeId),
    });

    const user = revising
      ? [
          describeRegions(regions, frame),
          '',
          'EXISTING CODE:',
          String((existing!.data as { code: string }).code),
          '',
          describeAddressed(regions, args.addressed ?? []),
          '',
          `The human asks: ${prompt}`,
        ].join('\n')
      : [context, '', describeRegions(regions, frame), '', `The human asks: ${prompt}`].join('\n');

    const result = await complete(config, [
      { role: 'system', content: revising ? REVISE_PROMPT : MAKE_PROMPT },
      { role: 'user', content: user },
    ]);
    if (!result.ok) return { ok: false, error: result.error };

    const code = parseCode(result.text);
    if (!code) return { ok: false, error: 'no usable code in reply', raw: result.text };

    session.attachCode({
      participantId: id,
      nodeId: args.artifactId,
      code,
      language: 'html',
      prompt,
      at: args.at,
    });

    return { ok: true, code, revised: revising, raw: result.text };
  }

  return { id, name, config, interpret, ask, generate };
}
