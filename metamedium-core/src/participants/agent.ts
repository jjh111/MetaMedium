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
import type { Capability } from '../session/nodes';
import type { ChatMessage, CompletionResult, ProviderConfig } from '../llm/provider';
import { complete, providerLabel, providerTier } from '../llm/provider';
import { describeSession, describeSignature, describeReading } from './serialize';
import { frameOf, regionsOf } from '../session/regions';
import { parseLayout, describeLayout, regionIdsIn } from '../parse/layout';
import { parseGraph, describeGraph, nodeIdsIn, buildGraphScaffold } from '../parse/graph';
import { getRep, strokePointsOf } from '../session/nodes';
import type { Point } from '../types';
import { buildScaffold, validateRegions, type RegionContent, type Theme } from '../parse/scaffold';
import { type DrawnShape, parseShapes, strokeFor, MAX_DRAWN } from '../session/synthesize';
import { boundsOf } from '../session/nodes';

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

THE DRAWING IS THE BRIEF. Below the layout you are told what each region PLAYS, how the regions sit, and any names the human gave. Read it before writing a word:
- A label is handwriting the human put inside a region. You cannot read it, so write the title or caption that belongs in exactly that place, and make the region it labels read as titled by it.
- Regions in a row are peers of equal standing. A column is a sequence, top to bottom. A container's contents are its sections, and the container itself frames them.
- A short request ("a page", "a card") is not a request for placeholders. Infer a specific subject from the structure — a header over two columns over a footer is a product page, a box with a label inside it is a titled panel — and commit to it throughout.

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

// The one place the canvas hands a model pixels. Handwriting is the exception
// the whole "grounded, not screenshots" commitment allows for, because the ink
// IS the ground truth of what was written and no fingerprint carries it. The
// model is asked to read, not to interpret: what the words say, ranked, with
// the same multi-reading rule as everything else (v7 Stage E).
const READ_PROMPT = `You are reading handwriting from a shared drawing canvas. The image shows one handwritten mark, dark ink on a light ground, exactly as the human drew it.

Transcribe what it says. Offer up to 3 readings ranked by confidence when the writing is ambiguous; one when it is clear. Keep the human's casing and punctuation. Do not describe the image, do not guess at meaning, do not add words that are not there.

Reply with ONLY a JSON array, no prose, no code fences:
[{"text":"what it says","confidence":0.0-1.0}]`;

// A model contributing MARKS. It says what it would draw in the shape rung's
// vocabulary and the engine draws it, attributed — the conversation benchmark's
// other half (ARCHITECTURE-v7 §1). The vocabulary is closed on purpose: a
// model that can only draw what the canvas can read makes marks the human can
// argue with on the same terms as their own.
const DRAW_PROMPT = `You are a participant on a shared drawing canvas, alongside a human. You have been asked to ADD MARKS to the drawing.

You are given the marks already on the canvas as measured facts — positions, sizes, what each reads as and plays — in canvas units (y grows downward). You are not given an image.

Say what you would draw. You may use only these shapes:
  - {"shape":"rectangle","x":..,"y":..,"w":..,"h":..,"why":"..."}
  - {"shape":"circle","x":..,"y":..,"w":..,"h":..,"why":"..."}   (x,y,w,h is the box the circle fills)
  - {"shape":"triangle","x":..,"y":..,"w":..,"h":..,"why":"..."}
  - {"shape":"line","from":{"x":..,"y":..},"to":{"x":..,"y":..},"why":"..."}
  - {"shape":"arrow","from":{"x":..,"y":..},"to":{"x":..,"y":..},"why":"..."}   (points from tail to tip)

Rules:
- At most ${MAX_DRAWN} shapes. Fewer is better; draw what was asked and nothing decorative.
- Place new marks relative to what is there: match the sizes and spacing you were given, sit beside or below the marks you were pointed at, and do not overlap them unless asked to.
- An arrow's ends should land on the marks it joins — near an edge, not at the centre.
- "why" is one short clause the human will see beside the mark.

Reply with ONLY a JSON array, no prose, no code fences.`;

export interface DrawResult {
  ok: boolean;
  /** Ids of the marks made, attributed to this participant. */
  ids: string[];
  shapes: DrawnShape[];
  error?: string;
  raw?: string;
}

export interface TranscriptReading {
  text: string;
  confidence: number;
}

/** Parse a read reply. Accepts `text` or `label`, and a bare string. */
export function parseTranscripts(text: string): TranscriptReading[] {
  if (!text) return [];
  const unfenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = unfenced.indexOf('[');
  const end = unfenced.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    // A model that just wrote the word is still answering the question.
    const bare = unfenced.replace(/^["'\s]+|["'\s]+$/g, '');
    return bare && bare.length <= 80 && !/\n/.test(bare) ? [{ text: bare, confidence: 0.5 }] : [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: TranscriptReading[] = [];
  for (const item of parsed) {
    if (typeof item === 'string' && item.trim()) { out.push({ text: item.trim(), confidence: 0.5 }); continue; }
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const t = typeof rec.text === 'string' ? rec.text : typeof rec.label === 'string' ? rec.label : '';
    if (!t.trim()) continue;
    out.push({ text: t.trim(), confidence: clamp01(rec.confidence) });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

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
  /**
   * Read a mark's handwriting from an image of its ink, and hold what it says
   * as attributed transcript reps on that mark — several when the writing is
   * ambiguous, none committed. Needs a model that can see
   * (`config.vision`); one that cannot returns an error without asking.
   *
   * Never throws.
   */
  read(args: {
    nodeId: string;
    /** The mark's ink as a data URL (PNG), rendered by the surface. */
    image: string;
    at: number;
    signal?: AbortSignal;
  }): Promise<ReadResult>;
  /**
   * Ask the model to add marks to the drawing. What it says it would draw, in
   * the shape rung's vocabulary, is drawn through `addStroke` attributed to
   * this participant — read, offered and erasable like any human mark.
   *
   * Never throws. A reply the canvas cannot read adds nothing.
   */
  draw(args: {
    prompt: string;
    /** The marks the human pointed at, as context; the whole board when empty. */
    nodeIds?: string[];
    at: number;
    signal?: AbortSignal;
  }): Promise<DrawResult>;
}

export interface ReadResult {
  ok: boolean;
  /** Every transcript offered, best first. */
  transcripts: TranscriptReading[];
  error?: string;
  raw?: string;
}

export interface GenerateResult {
  ok: boolean;
  code?: string;
  /** True when this revised existing content rather than building from scratch. */
  revised?: boolean;
  /** How the drawing compiled: a page that reflows, or a graph that keeps its positions. */
  genre?: 'layout' | 'graph' | 'mixed' | 'empty';
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
/**
 * How a participant is actually reached.
 *
 * Injectable so that "who answers" and "what is asked" stay separate concerns.
 * A model behind HTTP and a human answering by hand are the same participant
 * from the canvas's point of view — same prompts, same parsing, same propose
 * channel — and differ only here. That is what lets an assistant with no API,
 * or a model on a machine the browser cannot reach, take part as a peer rather
 * than as a special case bolted on beside one.
 */
export type Transport = (
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: { signal?: AbortSignal }
) => Promise<CompletionResult>;

export interface AgentOptions {
  /** Defaults to the HTTP transport. */
  transport?: Transport;
  /** Overrides the display name and the tier derived from the provider. */
  name?: string;
  tier?: Capability;
}

export function createAgentParticipant(
  session: Session,
  config: ProviderConfig,
  at: number = 0,
  options: AgentOptions = {}
): AgentParticipant {
  const send: Transport = options.transport ?? ((c, m, o) => complete(c, m, o));
  const name = options.name ?? providerLabel(config);
  // Join at the provider's tier so surfaces can group readings by voice.
  const id = session.join('agent', name, at, options.tier ?? providerTier(config));

  async function interpret(nodeIds: string[], now: number, signal?: AbortSignal): Promise<InterpretResult> {
    const state = session.getState();
    const targets = nodeIds.filter((n) => state.nodes.has(n));
    if (targets.length === 0) return { ok: false, readings: [], error: 'no such nodes' };

    const isCluster = targets.length > 1;
    const context = describeSession(state, { nodeIds: targets }) +
      (isCluster ? `\n\n${describeReading(session.read(targets), { noun: 'mark' })}` : '');
    const signature = isCluster ? describeSignature(state, targets) : '';

    const question = isCluster
      ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.`
      : `What could this mark be? Offer several readings.`;

    const result = await send(
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

    const context = describeSession(state, { nodeIds: targets }) +
      (targets.length > 1 ? `\n\n${describeReading(session.read(targets), { noun: 'mark' })}` : '');
    const result = await send(
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

    // The diagram rung decides how this drawing compiles. A page reflows; a
    // flowchart keeps its positions and its arrows (KEYFRAMES.md Stage 3–4).
    const reading = session.read(regions.map((r) => r.nodeId));
    const genre = reading.genre.genre;
    // The brief speaks in region ids — the same names the layout, the model's
    // reply and the DOM use — so a role placed on a mark lands on its region.
    const regionIdOf = new Map(regions.map((r) => [r.nodeId, r.id]));
    const idOf = (id: string) => regionIdOf.get(id);
    // Concepts are matched over a scope, and a container is not a peer of what
    // it holds — so the row INSIDE a frame is only visible when the frame's
    // contents are read on their own. Each container's contents get a reading.
    const inside: string[] = [];
    for (const r of reading.roles) {
      if (r.role !== 'container' || r.targets.length < 2) continue;
      const me = idOf(r.id);
      if (!me) continue;
      for (const c of session.read(r.targets).concepts) {
        const members = [...new Set(Object.values(c.roles ?? {}).flat())].map(idOf).filter((x): x is string => !!x);
        const who = members.length ? members.join(', ') : r.targets.map(idOf).filter(Boolean).join(', ');
        inside.push(`  within ${me}: ${who} read as a ${c.concept} (${c.confidence.toFixed(2)}) — ${c.reasoning}`);
      }
    }
    const brief = describeReading(reading, { idOf }) + (inside.length ? `\n\nWITHIN CONTAINERS:\n${inside.join('\n')}` : '');
    let plan: { describe: string; ids: string[]; build: (c: Record<string, RegionContent>, t: Theme) => string };
    if (genre === 'graph' || genre === 'mixed') {
      const strokes: Record<string, Point[]> = {};
      const arrows: Record<string, { tip: Point; tail: Point }> = {};
      for (const r of regions) {
        const n = state.nodes.get(r.nodeId);
        if (!n) continue;
        const pts = strokePointsOf(n);
        if (pts) strokes[r.nodeId] = pts;
        const a = getRep(n, 'reading:arrow')?.data as { tip: Point; tail: Point } | undefined;
        if (a) arrows[r.nodeId] = a;
      }
      const graph = parseGraph(regions, frame, reading.roles, { strokes, arrows });
      plan = {
        describe: `${describeGraph(graph)}\n\n${brief}`,
        ids: nodeIdsIn(graph),
        build: (c, t) => buildGraphScaffold(graph, c, t),
      };
    } else {
      const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));
      plan = {
        describe: `${describeLayout(layout)}\n\n${brief}`,
        // What the layout PLACES, not every mark that was drawn: a connector
        // is an edge, and content written for a line is content thrown away.
        ids: regionIdsIn(layout),
        build: (c, t) => buildScaffold(layout, c, t),
      };
    }

    // The newest fill is what the surface renders, so it is what we revise.
    const existing = [...artifact.reps].reverse().find((r) => r.modality === 'code');
    const previous = (existing?.data as { fill?: RegionFill } | undefined)?.fill;
    const revising = !!previous;

    const ids = plan.ids;
    if (ids.length === 0) return { ok: false, error: 'nothing in this artifact can hold content' };
    const addressed = args.addressed?.length ? args.addressed.filter((a) => ids.includes(a)) : ids;

    const lines = [plan.describe, ''];
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

    const result = await send(
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

    const code = plan.build(merged.regions, merged.theme ?? {});

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
      genre,
      filled,
      unfilled: ids.filter((x) => !merged.regions[x]),
      raw: result.text,
    };
  }

  async function read(args: { nodeId: string; image: string; at: number; signal?: AbortSignal }): Promise<ReadResult> {
    if (!config.vision) return { ok: false, transcripts: [], error: `${name} cannot see images` };
    const state = session.getState();
    const node = state.nodes.get(args.nodeId);
    if (!node) return { ok: false, transcripts: [], error: 'no such node' };
    if (!/^data:image\//.test(args.image)) return { ok: false, transcripts: [], error: 'image must be a data URL' };

    const result = await send(
      config,
      [
        { role: 'system', content: READ_PROMPT },
        { role: 'user', content: [{ type: 'image', dataUrl: args.image }, { type: 'text', text: 'What does this say?' }] },
      ],
      { signal: args.signal }
    );
    if (!result.ok) return { ok: false, transcripts: [], error: result.error };

    const transcripts = parseTranscripts(result.text);
    if (transcripts.length === 0) return { ok: false, transcripts: [], error: 'no readable transcript in reply', raw: result.text };

    // Every reading is its own held rep. The human sees them all, ranked by
    // confidence like every other reading on the canvas.
    session.propose({
      participantId: id,
      nodeId: args.nodeId,
      edges: [],
      reps: transcripts.map((t) => ({ modality: 'transcript', data: { text: t.text }, confidence: t.confidence })),
      at: args.at,
    });
    return { ok: true, transcripts, raw: result.text };
  }

  async function draw(args: { prompt: string; nodeIds?: string[]; at: number; signal?: AbortSignal }): Promise<DrawResult> {
    const prompt = args.prompt.trim();
    if (!prompt) return { ok: false, ids: [], shapes: [], error: 'no prompt' };
    const state = session.getState();
    const pointed = (args.nodeIds ?? []).filter((n) => state.nodes.has(n));
    const all = state.contentIds.filter((n) => !state.artifacts.includes(n));
    const context = describeSession(state, { nodeIds: all.length ? all : undefined });
    const reading = all.length > 1 ? `\n\n${describeReading(session.read(all), { noun: 'mark' })}` : '';
    const focus = pointed.length
      ? `\n\nTHE HUMAN POINTED AT: ${pointed.join(', ')}${(() => {
          const bs = pointed.map((p) => boundsOf(state.nodes.get(p)!)).filter((b): b is NonNullable<typeof b> => !!b);
          if (!bs.length) return '';
          const minX = Math.min(...bs.map((b) => b.minX)), minY = Math.min(...bs.map((b) => b.minY));
          const maxX = Math.max(...bs.map((b) => b.maxX)), maxY = Math.max(...bs.map((b) => b.maxY));
          return ` — together they span x ${Math.round(minX)}–${Math.round(maxX)}, y ${Math.round(minY)}–${Math.round(maxY)}`;
        })()}`
      : '';

    const result = await send(
      config,
      [
        { role: 'system', content: DRAW_PROMPT },
        { role: 'user', content: `${context}${reading}${focus}\n\nThe human asks: ${prompt}` },
      ],
      { signal: args.signal }
    );
    if (!result.ok) return { ok: false, ids: [], shapes: [], error: result.error };

    const shapes = parseShapes(result.text);
    if (shapes.length === 0) return { ok: false, ids: [], shapes: [], error: 'nothing drawable in reply', raw: result.text };

    const ids: string[] = [];
    let at = args.at;
    for (const s of shapes) {
      const points = strokeFor(s);
      if (!points) continue;
      // Spaced in time so the retroactive command mark can still tell "just
      // drawn" apart, and attributed so the surface can say who drew it.
      // Declared content: a drawn shape never lassoes, commands or erases.
      const made = session.addStroke(points, at, id, 1, { content: true });
      ids.push(made);
      at += 1;
      // Its reason sits beside the mark, as an answer does: attributed,
      // erasable, and never mistaken for ink.
      if (s.why) session.answer({ participantId: id, question: prompt, text: s.why, aboutIds: [made], at });
      at += 1;
    }
    if (ids.length === 0) return { ok: false, ids: [], shapes, error: 'every shape had no size', raw: result.text };
    return { ok: true, ids, shapes, raw: result.text };
  }

  return { id, name, config, interpret, ask, generate, read, draw };
}
