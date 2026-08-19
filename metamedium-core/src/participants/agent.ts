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
import { frameOf, regionsOf } from '../session/regions';
import { parseLayout, describeLayout } from '../parse/layout';
import { buildScaffold, validateRegions, type RegionContent, type Theme } from '../parse/scaffold';

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

const MAKE_PROMPT = `You are a participant on a shared drawing canvas. The human drew a layout and asked you to build it.

THE LAYOUT IS ALREADY DECIDED. It was measured from their drawing and the canvas will assemble it. You are not writing the page structure and you must not try to: no wrappers, no positioning, no widths or heights, no flexbox. If you emit layout it will be discarded, and if you omit a region it will render empty.

Your job is the CONTENT of each region: the words, the semantics, and the look.

For each region id you are given, return:
  - "html"  — the inner HTML of that region. Real copy, never lorem ipsum. Headings, paragraphs, links, lists, buttons. Inline styles are fine for type and colour.
  - "tag"   — one of div, section, header, footer, main, aside, nav, article, figure, form. Choose the one that fits what the region is.
  - "style" — optional inline style for the region box itself: background, padding, border, alignment.

Also return a "theme": background, color, accent, fontFamily for the page as a whole.

Rules:
- Fill EVERY region you are given, using its exact id.
- A wide region across the top is almost always a header; across the bottom, a footer. Side-by-side regions of similar size are columns of equal standing.
- Write as if this were shipping. Specific copy, considered colour, real link text.
- No <script>. No external images, fonts, or stylesheets — nothing that loads from the network.

Reply with ONLY a JSON object, no prose, no code fences:
{"theme":{"background":"#…","color":"#…","accent":"#…","fontFamily":"…"},"regions":{"r1":{"tag":"header","style":"…","html":"…"}}}`;

const REVISE_PROMPT = `You are a participant on a shared drawing canvas, changing part of a page you or another participant already filled in.

You are given the layout, the content each region currently holds, and which regions the human's new mark lands on.

Rules:
- Return ONLY the regions you are changing. Regions you leave out keep exactly what they have.
- Change only the regions the mark addresses. If the request cannot be satisfied within them, do the closest thing that can be, and say nothing about the rest.
- The layout is not yours to change. No positioning, no sizes, no wrappers.
- Return "theme" only if the request is about the whole page's look.

Reply with ONLY a JSON object, no prose, no code fences:
{"regions":{"r2":{"tag":"aside","style":"…","html":"…"}}}`;

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
  const first = body.indexOf('<');
  if (first === -1) return '';
  const last = body.lastIndexOf('>');
  return body.slice(first, last + 1).trim();
}

export interface RegionFill {
  theme?: Theme;
  regions: Record<string, RegionContent>;
}

/**
 * Parse JSON that a model wrote by hand.
 *
 * Strict JSON first, always. The repairs below only run on text that already
 * failed, and each one exists because a real local model produced it:
 *
 *   - **Backtick strings.** Asked for JSON whose values are HTML full of double
 *     quotes, devstral reaches for a JavaScript template literal rather than
 *     escaping — `` "html":`<p class="x">hi</p>` ``. It is the single most
 *     common way these replies are invalid, and it is unambiguous to fix.
 *   - **Trailing commas.** Written by everything, meant by nothing.
 *
 * Nothing here guesses at intent. A reply we still cannot read is reported as
 * unusable rather than half-understood.
 */
function parseLoose(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through and repair */
  }

  // Backtick-delimited values → properly escaped JSON strings. Scanning rather
  // than replacing, so a backtick INSIDE a normal JSON string is left alone.
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === '`') {
      let body = '';
      i++;
      while (i < text.length && text[i] !== '`') {
        body += text[i];
        i++;
      }
      out += JSON.stringify(body);
      continue;
    }
    out += c;
  }

  // Trailing commas before a closing brace or bracket.
  out = out.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

/** Find the outermost balanced JSON object in a reply that may be wrapped in prose. */
function outermostObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let inTemplate = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inTemplate) {
      // A brace inside a template literal is content, not structure.
      if (c === '`') inTemplate = false;
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '`') inTemplate = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Parse a fill reply: per-region content plus an optional theme.
 *
 * Tolerant in the same way and for the same reasons as `parseReadings`, with
 * one addition — a model that answers with a bare map of ids to HTML strings,
 * rather than the documented object, is understood too. That shape is what
 * smaller models reach for, and rejecting it would be pedantry rather than
 * safety.
 */
export function parseFill(text: string): RegionFill | null {
  if (!text) return null;
  const json = outermostObject(text.replace(/```(?:json)?/gi, ''));
  if (!json) return null;

  const parsed = parseLoose(json);
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const rawRegions =
    obj.regions && typeof obj.regions === 'object'
      ? (obj.regions as Record<string, unknown>)
      : obj;

  const regions: Record<string, RegionContent> = {};
  for (const [id, value] of Object.entries(rawRegions)) {
    if (!/^r\d+$/.test(id)) continue;
    if (typeof value === 'string') {
      regions[id] = { html: value };
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const html = typeof v.html === 'string' ? v.html : typeof v.content === 'string' ? v.content : '';
    if (!html) continue;
    regions[id] = {
      html,
      tag: typeof v.tag === 'string' ? v.tag.toLowerCase() : undefined,
      style: typeof v.style === 'string' ? v.style : undefined,
    };
  }
  if (Object.keys(regions).length === 0) return null;

  const t = obj.theme && typeof obj.theme === 'object' ? (obj.theme as Record<string, unknown>) : {};
  const str = (k: string) => (typeof t[k] === 'string' ? (t[k] as string) : undefined);
  return {
    theme: { background: str('background'), color: str('color'), accent: str('accent'), fontFamily: str('fontFamily') },
    regions,
  };
}

/** Readings → the edges `propose()` expects. *//** Readings → the edges `propose()` expects. */
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
  interpret(nodeIds: string[], at: number, signal?: AbortSignal): Promise<InterpretResult>;
  /**
   * Answer a question about some marks, placing the answer IN the canvas.
   *
   * Never throws. Several agents may answer the same question; each answer is
   * its own held, attributed node and none replaces another.
   */
  ask(question: string, nodeIds: string[], at: number, signal?: AbortSignal): Promise<AskResult>;
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
    /** Abort this call — a local server answers one request at a time. */
    signal?: AbortSignal;
  }): Promise<GenerateResult>;
}

export interface GenerateResult {
  ok: boolean;
  code?: string;
  /** True when this revised existing content rather than building from scratch. */
  revised?: boolean;
  /** Region ids that now hold content. */
  filled?: string[];
  /** Region ids the model left empty — reported, never hidden. */
  unfilled?: string[];
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

  async function interpret(nodeIds: string[], now: number, signal?: AbortSignal): Promise<InterpretResult> {
    const state = session.getState();
    const targets = nodeIds.filter((n) => state.nodes.has(n));
    if (targets.length === 0) return { ok: false, readings: [], error: 'no such nodes' };

    const isCluster = targets.length > 1;
    const context = describeSession(state, { nodeIds: targets });
    const signature = isCluster ? describeSignature(state, targets) : '';

    const question = isCluster
      ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.`
      : `What could this mark be? Offer several readings.`;

    const result = await complete(
      config,
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${context}\n\n${question}` },
      ],
      { signal }
    );

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

  async function ask(question: string, nodeIds: string[], now: number, signal?: AbortSignal): Promise<AskResult> {
    const q = question.trim();
    if (!q) return { ok: false, error: 'no question' };

    const state = session.getState();
    const targets = nodeIds.filter((n) => state.nodes.has(n));
    if (targets.length === 0) return { ok: false, error: 'no such nodes' };

    const context = describeSession(state, { nodeIds: targets });
    const result = await complete(
      config,
      [
        { role: 'system', content: ASK_PROMPT },
        { role: 'user', content: `${context}\n\nQuestion: ${q}` },
      ],
      { signal }
    );
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
    if (!explanationId) return { ok: false, error: 'the canvas did not accept the answer', text };

    return { ok: true, text, explanationId };
  }

  /** Wires the engine already inferred between member marks, as region pairs. */
  function connectionsOf(
    artifact: { edges: { to: string; rel: string }[] },
    state: ReturnType<Session['getState']>,
    regions: { id: string; nodeId: string }[]
  ) {
    const byNode = new Map(regions.map((r) => [r.nodeId, r.id]));
    const out: { from: string; to: string; via?: string }[] = [];
    for (const e of artifact.edges) {
      if (e.rel !== 'has-part') continue;
      const node = state.nodes.get(e.to);
      if (!node) continue;
      const ends = node.edges.filter((x) => x.rel === 'connects').map((x) => byNode.get(x.to)).filter(Boolean) as string[];
      if (ends.length === 2) out.push({ from: ends[0], to: ends[1], via: byNode.get(node.id) });
    }
    return out;
  }

  async function generate(args: {
    prompt: string;
    artifactId: string;
    at: number;
    addressed?: string[];
    signal?: AbortSignal;
  }): Promise<GenerateResult> {
    const prompt = args.prompt.trim();
    if (!prompt) return { ok: false, error: 'no prompt' };

    const state = session.getState();
    const artifact = state.nodes.get(args.artifactId);
    if (!artifact) return { ok: false, error: 'no such artifact' };

    const frame = frameOf(artifact);
    if (!frame) return { ok: false, error: 'artifact has no frame' };
    const regions = regionsOf(artifact, state.nodes);
    if (regions.length === 0) return { ok: false, error: 'nothing was drawn inside the artifact' };
    const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));

    // The newest fill is what the surface renders, so it is what we revise.
    const existing = [...artifact.reps].reverse().find((r) => r.modality === 'code');
    const previous = (existing?.data as { fill?: RegionFill } | undefined)?.fill;
    const revising = !!previous;

    const ids = regions.map((r) => r.id);
    const addressed = args.addressed?.length ? args.addressed : ids;

    const lines = [describeLayout(layout), ''];
    if (revising) {
      lines.push('WHAT EACH REGION HOLDS NOW:');
      for (const id of ids) {
        const c = previous!.regions[id];
        lines.push(`  ${id}: ${c ? `<${c.tag ?? 'div'}> ${c.html.replace(/\s+/g, ' ').slice(0, 160)}` : '(empty)'}`);
      }
      lines.push('', `THE MARK LANDS ON: ${addressed.join(', ')}. Change only those.`);
    } else {
      lines.push(`REGIONS TO FILL: ${ids.join(', ')}`);
    }
    lines.push('', `The human asks: ${prompt}`);

    const result = await complete(
      config,
      [
        { role: 'system', content: revising ? REVISE_PROMPT : MAKE_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
      { signal: args.signal }
    );
    if (!result.ok) return { ok: false, error: result.error };

    const fill = parseFill(result.text);
    if (!fill) return { ok: false, error: 'no usable content in reply', raw: result.text };

    // A revision keeps everything it did not mention; a build starts empty. The
    // model is told this, but the engine is what guarantees it.
    const merged: RegionFill = {
      theme: { ...(previous?.theme ?? {}), ...(fill.theme ?? {}) },
      regions: { ...(previous?.regions ?? {}) },
    };
    for (const [id, content] of Object.entries(fill.regions)) {
      if (!ids.includes(id)) continue; // a region the drawing does not have
      if (revising && !addressed.includes(id)) continue; // outside what the ink addressed
      merged.regions[id] = content;
    }

    const filled = ids.filter((id) => merged.regions[id]);
    if (filled.length === 0) {
      return { ok: false, error: 'the model filled none of the regions', raw: result.text };
    }

    const code = buildScaffold(layout, merged.regions, merged.theme);

    // The scaffold is built from the parse, so this cannot normally fail — but
    // it is the promise the whole design rests on, and a promise nobody checks
    // is a promise you find out about from a screenshot.
    const check = validateRegions(code, ids);
    if (!check.ok) {
      return {
        ok: false,
        error: `the page does not match the drawing (missing ${check.missing.join(', ') || 'none'}` +
          `${check.duplicated.length ? `, duplicated ${check.duplicated.join(', ')}` : ''})`,
        code,
        raw: result.text,
      };
    }

    const accepted = session.attachCode({
      participantId: id,
      nodeId: args.artifactId,
      code,
      language: 'html',
      prompt,
      fill: merged,
      at: args.at,
    });
    if (!accepted) {
      return { ok: false, error: 'the canvas did not accept the code', code, raw: result.text };
    }

    return {
      ok: true,
      code,
      revised: revising,
      filled,
      unfilled: ids.filter((x) => !merged.regions[x]),
      raw: result.text,
    };
  }

  return { id, name, config, interpret, ask, generate };
}
