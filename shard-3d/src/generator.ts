// ===== generator =====
// The generator seat (SHARD-3D-PLAN §6): a model proposes an OP TREE in the
// shard's own closed vocabulary, through the same channel a hand uses.
//
// **Invariant 5, and it is the point of the package: no model writes code that
// runs in this page.** What comes back is data in the shard's vocabulary —
// steps over profiles, names on steps, a colour word — and the shard derives
// the mesh from it. A step outside the vocabulary is dropped and counted; a
// profile outside the shape rung's vocabulary is dropped and counted; and the
// reply is then clipped to the drawing before it is offered at all.
//
// **Invariant 6: a model is asked only by a deliberate act.** Nothing here is
// called on draw, on select or on join. The one entry point is `propose`, and
// the surface calls it on Enter.
//
// The transport is core's (`llm/provider.ts`) and it is INJECTABLE, which is
// what lets the tests and the e2e run a stub that never touches the network —
// the `participants/bridge.ts` pattern, ported.

import {
  complete,
  stripThink,
  type ChatMessage,
  type CompletionResult,
  type ProviderConfig,
  type Point,
} from 'metamedium-core';
import { COLOUR_WORDS } from './op';

/** The transport, exactly core's shape — so `complete` is the default and a stub is a function. */
export type SpaceTransport = (
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: { signal?: AbortSignal }
) => Promise<CompletionResult>;

/**
 * The steps a MODEL may propose. A strict subset of §2.4: `massing` and
 * `match` are the engine's own (the drawing is the extent, and the diff is the
 * engine's arithmetic), and `place` / `along` / `mesh` are not P5's.
 */
export const PROPOSABLE = ['extrude', 'revolve', 'cut', 'boss', 'mirror'] as const;
export type ProposableOp = (typeof PROPOSABLE)[number];

/** The shapes a model may add a profile in — the shape rung's own closed vocabulary. */
export const PROPOSABLE_SHAPES = ['rectangle', 'circle', 'polygon', 'triangle'] as const;

/** At most this many steps in one reply. A tree nobody can read is not a proposal. */
export const MAX_STEPS = 24;
/** At most this many profiles drawn into the log by one reply. */
export const MAX_PROFILES = 16;

export interface ProposedStep {
  id: string;
  op: ProposableOp;
  /** The step this one acts on. */
  on?: string;
  /** A stroke id from the brief, or the id of a profile in this same reply. */
  profile?: string;
  /** For a revolve: the stroke the profile turns about. */
  axis?: string;
  /** Plane units, along the profile plane's own normal. */
  depth?: number;
  /** Radians, for a revolve. */
  sweep?: number;
  /** For a mirror: the world plane it reflects across. */
  plane?: string;
  name?: string;
  material?: { colour: string };
  why?: string;
}

export interface ProposedProfile {
  id: string;
  shape: string;
  /** A world plane's name, or a face named in the brief. */
  plane: string;
  /**
   * How far that plane is slid along its own normal before the profile is laid
   * on it — the gizmo's own handle, said as a number.
   *
   * A named world plane passes through the origin, so without this a model can
   * say *a circle on the foundation* and cannot say *and it sits on top of the
   * tower*. Found by asking a stub for a cap and getting one buried inside the
   * castle: everything it could say put the profile on the ground.
   */
  at?: number;
  /** For a polygon or a triangle: the outline, in the plane's own units. */
  points?: Point[];
  /** For a rectangle or a circle. */
  centre?: Point;
  r?: number;
  w?: number;
  h?: number;
}

export interface Proposal {
  steps: ProposedStep[];
  profiles: ProposedProfile[];
  /** The model saying the library already holds what was asked for (v9 S5's rule). */
  reuse?: string;
  /** How much of the reply was outside the vocabulary and dropped. */
  dropped: number;
  droppedWhy: string[];
  reasoning: string;
}

export interface ProposeResult {
  ok: boolean;
  proposal?: Proposal;
  error?: string;
  /** Kept when a reply cannot be read, so the panel can say what came back. */
  raw?: string;
}

// ---- the prompts -------------------------------------------------------------

const RULES = `Reply with ONLY a JSON object, no prose, no code fences:

{"steps":[ … ], "profiles":[ … ]}

A STEP is one of exactly these, and nothing else:
  {"id":"s1","op":"extrude","profile":"<stroke or profile id>","depth":<plane units>,"name":"…","why":"…"}
  {"id":"s2","op":"boss","on":"s1","profile":"<id>","depth":<plane units>,"name":"…","why":"…"}
  {"id":"s3","op":"cut","on":"s2","profile":"<id>","depth":<plane units>,"why":"…"}
  {"id":"s4","op":"revolve","profile":"<id>","axis":"<a line's stroke id>","sweep":<radians, optional>,"why":"…"}
  {"id":"s5","op":"mirror","on":"s4","plane":"height","why":"…"}

A PROFILE you add is one of exactly these, in the named plane's own u, v:
  {"id":"p1","shape":"rectangle","plane":"foundation","centre":{"x":0,"y":0},"w":1.2,"h":0.8}
  {"id":"p2","shape":"circle","plane":"height","centre":{"x":0,"y":0},"r":0.5}
  {"id":"p3","shape":"polygon","plane":"width","points":[{"x":0,"y":0},{"x":1,"y":0},{"x":0.5,"y":-1}]}

A named plane passes through the origin. Add "at":<number> to slide it along its own
normal before you lay the profile on it — that is how a cap sits on top of a tower:
  {"id":"p4","shape":"circle","plane":"foundation","at":3.2,"centre":{"x":1.5,"y":-1},"r":0.4}

Rules, and each of them is checked:
- Every step's "op" must be one of extrude, revolve, cut, boss, mirror. Anything else is dropped.
- "on" must name a step earlier in YOUR list. The first step has no "on".
- "profile" must be a stroke id from the brief above, or the id of a profile in your own "profiles" list.
- "depth" is a number in the plane's own units, measured from the sizes you were given. Never invent a scale.
- NAME the steps with the human's own words where they apply, and reuse a name already in play exactly.
  Several steps may share one name — three turrets are three steps all named "turret".
- "material" is {"colour":"<word>"} and the word must be one of: ${Object.keys(COLOUR_WORDS).join(', ')}.
- At most ${MAX_STEPS} steps and ${MAX_PROFILES} profiles. Fewer is better.
- "why" is one short clause the human will see beside the step.

If a definition the library already holds IS what was asked for, reply {"reuse":"<its name>"} and nothing else.`;

/** The making prompt, with the brief as the user message. */
export function messagesFor(brief: string, words: string, opts: { regen?: boolean } = {}): ChatMessage[] {
  const system = opts.regen
    ? `You are a participant in a 3D drawing space, changing part of a solid you or another participant already proposed.

Your job is to return REPLACEMENT steps for the steps you are told may change, and nothing else. Every other step in the tree is fixed. Keep the names exactly as they are: a step named "turret" that gets taller is still named "turret".

${RULES}`
    : `You are a participant in a 3D drawing space, alongside a human and the space's own geometric reader.

The human has drawn profiles on the world planes, and the space has already stood a MASSING up from them — the volume their views share. That massing is an INVARIANT: whatever you propose is intersected with it before it is shown, so anything reaching outside the drawing is simply cut off. Work inside it.

Your job is to fill that volume with named steps: the drawing says the shape, your reply says what the parts ARE and what they are made of.

${RULES}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: `${brief}\n\nPropose the tree.${words ? ` The human asked for: “${words}”` : ''}` },
  ];
}

// ---- reading the reply -------------------------------------------------------

/**
 * Strict JSON first, always. Repaired, never guessed — the two repairs are
 * core's own (`parseFill` in `participants/agent.ts`), for the two reasons it
 * found by running real local models: a JavaScript template literal where a
 * JSON string was asked for, and a trailing comma.
 *
 * Nothing here infers intent. A reply that still will not read is reported as
 * unusable, and the brief leaves nothing behind.
 */
export function parseLoose(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through and repair */
  }
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
  out = out.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

/** The outermost balanced JSON object in a reply that may be wrapped in prose. */
export function outermostObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let inTemplate = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inTemplate) {
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

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function pointsOf(v: unknown): Point[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Point[] = [];
  for (const p of v) {
    if (!p || typeof p !== 'object') continue;
    const x = num((p as Record<string, unknown>).x);
    const y = num((p as Record<string, unknown>).y);
    if (x === undefined || y === undefined) continue;
    out.push({ x, y });
  }
  return out.length >= 3 ? out : undefined;
}

/**
 * The reply, read into the closed vocabulary.
 *
 * Everything outside it is DROPPED AND COUNTED — never coerced into something
 * near it. A reply of ten steps where two are `sweep` comes back as eight steps
 * and *2 steps outside the vocabulary were dropped*, said out loud, because a
 * proposal quietly reduced is a proposal nobody agreed to.
 */
export function parseProposal(text: string): Proposal {
  const droppedWhy: string[] = [];
  const empty = (why: string): Proposal => ({
    steps: [],
    profiles: [],
    dropped: 0,
    droppedWhy: [why],
    reasoning: why,
  });
  if (!text) return empty('the model replied with nothing');

  const unfenced = stripThink(text).replace(/```(?:json)?/gi, '').trim();
  const body = outermostObject(unfenced);
  if (!body) return empty('there is no JSON object in the reply');
  const parsed = parseLoose(body);
  if (!parsed || typeof parsed !== 'object') return empty('the reply is not JSON, even repaired');

  const rec = parsed as Record<string, unknown>;

  const reuse = str(rec.reuse);
  const rawProfiles = Array.isArray(rec.profiles) ? rec.profiles : [];
  const rawSteps = Array.isArray(rec.steps) ? rec.steps : [];
  if (reuse && !rawSteps.length) {
    return { steps: [], profiles: [], reuse, dropped: 0, droppedWhy: [], reasoning: `the library already holds “${reuse}” — reused, not written` };
  }

  // ---- the profiles, in the shape rung's own vocabulary ---------------------
  const profiles: ProposedProfile[] = [];
  for (const raw of rawProfiles) {
    if (profiles.length >= MAX_PROFILES) {
      droppedWhy.push(`more than ${MAX_PROFILES} profiles — the rest were dropped`);
      break;
    }
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const id = str(p.id);
    const shape = str(p.shape)?.toLowerCase();
    const plane = str(p.plane);
    if (!id || !shape || !plane) {
      droppedWhy.push('a profile with no id, shape or plane');
      continue;
    }
    if (!(PROPOSABLE_SHAPES as readonly string[]).includes(shape)) {
      droppedWhy.push(`a profile shaped “${shape}” — outside the shape rung's closed vocabulary`);
      continue;
    }
    const centre = p.centre && typeof p.centre === 'object'
      ? { x: num((p.centre as Record<string, unknown>).x) ?? 0, y: num((p.centre as Record<string, unknown>).y) ?? 0 }
      : undefined;
    const points = pointsOf(p.points);
    const r = num(p.r);
    const w = num(p.w);
    const h = num(p.h);
    const at = num(p.at);
    if (shape === 'circle' && (!centre || !r)) {
      droppedWhy.push(`the circle ${id} has no centre and radius`);
      continue;
    }
    if (shape === 'rectangle' && (!centre || !w || !h)) {
      droppedWhy.push(`the rectangle ${id} has no centre and size`);
      continue;
    }
    if ((shape === 'polygon' || shape === 'triangle') && !points) {
      droppedWhy.push(`the ${shape} ${id} has fewer than three points`);
      continue;
    }
    profiles.push({
      id,
      shape,
      plane,
      ...(at !== undefined ? { at } : {}),
      ...(centre ? { centre } : {}),
      ...(points ? { points } : {}),
      ...(r !== undefined ? { r } : {}),
      ...(w !== undefined ? { w } : {}),
      ...(h !== undefined ? { h } : {}),
    });
  }

  // ---- the steps -----------------------------------------------------------
  const steps: ProposedStep[] = [];
  const seen = new Set<string>();
  for (const raw of rawSteps) {
    if (steps.length >= MAX_STEPS) {
      droppedWhy.push(`more than ${MAX_STEPS} steps — the rest were dropped`);
      break;
    }
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    const op = str(s.op)?.toLowerCase();
    if (!op || !(PROPOSABLE as readonly string[]).includes(op)) {
      droppedWhy.push(`a step whose op is “${op ?? 'missing'}” — outside the closed vocabulary`);
      continue;
    }
    const id = str(s.id) ?? `s${steps.length + 1}`;
    if (seen.has(id)) {
      droppedWhy.push(`two steps both called ${id}`);
      continue;
    }
    const on = str(s.on);
    if (on && !seen.has(on)) {
      droppedWhy.push(`${id} acts on ${on}, which is not a step above it`);
      continue;
    }
    const profile = str(s.profile);
    if (op !== 'mirror' && !profile) {
      droppedWhy.push(`the ${op} ${id} names no profile`);
      continue;
    }
    // A colour outside the closed list is dropped, and the step stays: a word
    // the shard cannot paint is not a reason to throw away the volume.
    const rawColour = s.material && typeof s.material === 'object'
      ? str((s.material as Record<string, unknown>).colour)?.toLowerCase()
      : undefined;
    const colour = rawColour && rawColour in COLOUR_WORDS ? rawColour : undefined;
    if (rawColour && !colour) droppedWhy.push(`the colour word “${rawColour}” is not one the shard can paint`);

    seen.add(id);
    steps.push({
      id,
      op: op as ProposableOp,
      ...(on ? { on } : {}),
      ...(profile ? { profile } : {}),
      ...(str(s.axis) ? { axis: str(s.axis)! } : {}),
      ...(num(s.depth) !== undefined ? { depth: num(s.depth)! } : {}),
      ...(num(s.sweep) !== undefined ? { sweep: num(s.sweep)! } : {}),
      ...(str(s.plane) ? { plane: str(s.plane)! } : {}),
      ...(str(s.name) ? { name: str(s.name)! } : {}),
      ...(colour ? { material: { colour } } : {}),
      ...(str(s.why) ? { why: str(s.why)! } : {}),
    });
  }

  const dropped = droppedWhy.length;
  return {
    steps,
    profiles,
    ...(reuse ? { reuse } : {}),
    dropped,
    droppedWhy,
    reasoning:
      `${steps.length} step${steps.length === 1 ? '' : 's'} and ${profiles.length} profile${profiles.length === 1 ? '' : 's'} ` +
      `in the closed vocabulary` +
      (dropped ? `; ${dropped} thing${dropped === 1 ? '' : 's'} outside it were dropped: ${droppedWhy.join('; ')}` : ''),
  };
}

export interface ProposeArgs {
  config: ProviderConfig;
  brief: string;
  words: string;
  transport?: SpaceTransport;
  signal?: AbortSignal;
  regen?: boolean;
}

/**
 * Ask. One call, one reply, never a throw — the caller is inside a drawing
 * app, and a model that fails leaves the log exactly as it was.
 */
export async function propose(args: ProposeArgs): Promise<ProposeResult> {
  const send: SpaceTransport = args.transport ?? ((c, m, o) => complete(c, m, o));
  let result: CompletionResult;
  try {
    result = await send(args.config, messagesFor(args.brief, args.words, { regen: args.regen }), {
      ...(args.signal ? { signal: args.signal } : {}),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  if (!result.ok) return { ok: false, error: result.error };
  const proposal = parseProposal(result.text);
  if (!proposal.steps.length && !proposal.reuse) {
    return { ok: false, error: proposal.reasoning, raw: result.text };
  }
  return { ok: true, proposal, raw: result.text };
}

// ---- asking what a phrase means (the verb table's last resort) ---------------

/**
 * A phrasing the verb table could not read, asked of a model ONCE, against the
 * closed list — and the answer is held as a way of saying that verb (§2.6 rule
 * 4, `behave/words.ts`'s `teach` pattern).
 *
 * The model is not asked what to do. It is asked which of the verbs the shard
 * already has the human meant, and about what — so the worst it can be wrong
 * about is a word.
 */
export interface MeaningResult {
  ok: boolean;
  verb?: string;
  target?: string;
  why?: string;
  error?: string;
}

export function meaningMessages(phrase: string, verbs: string[], names: string[]): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        `You are reading one phrase a human typed in a 3D drawing space, and saying which of the space's own ` +
        `verbs they meant. You are NOT doing anything — you are naming a verb.\n\n` +
        `The verbs, and there are no others: ${verbs.join(', ')}.\n` +
        `The names in play, and there are no others: ${names.length ? names.join(', ') : '(none)'}.\n\n` +
        `Reply with ONLY a JSON object, no prose, no code fences:\n` +
        `{"verb":"<one of the verbs>","target":"<one of the names, or omit it>","why":"one short clause"}\n\n` +
        `If the phrase means none of them, reply {"verb":"none","why":"…"}.`,
    },
    { role: 'user', content: `The phrase: “${phrase}”` },
  ];
}

export function parseMeaning(text: string, verbs: string[], names: string[]): MeaningResult {
  const body = outermostObject(stripThink(text).replace(/```(?:json)?/gi, '').trim());
  if (!body) return { ok: false, error: 'there is no JSON object in the reply' };
  const parsed = parseLoose(body);
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'the reply is not JSON, even repaired' };
  const rec = parsed as Record<string, unknown>;
  const verb = str(rec.verb)?.toLowerCase();
  if (!verb || verb === 'none' || !verbs.includes(verb)) {
    return { ok: false, error: `“${verb ?? 'nothing'}” is not one of the verbs this space has`, ...(str(rec.why) ? { why: str(rec.why)! } : {}) };
  }
  const target = str(rec.target)?.toLowerCase();
  const known = target && names.map((n) => n.toLowerCase()).includes(target) ? target : undefined;
  return {
    ok: true,
    verb,
    ...(known ? { target: known } : {}),
    ...(str(rec.why) ? { why: str(rec.why)! } : {}),
  };
}
