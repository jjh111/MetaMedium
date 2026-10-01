// The seat: a model answered by a hand in the room (V1-PLAN J4).
//
// John asked whether *Read the writing* and *What is this?* could come straight
// back to the Claude Code session he is talking to, over MCP, instead of going
// out to an HTTP endpoint. The shard already does it (SHARD-3D-PUSH-2 G5), and
// this is the same move for the canvas, in core so that the page, the MCP hand,
// the watcher and the tests all read one definition of it:
//
//   - **The seat is a model, and that is the whole of it.** It is an ordinary
//     agent participant (`createAgentParticipant`) with an injected transport —
//     the `bridge.ts` pattern — so it is asked with the same prompts, its reply
//     is read by the same parsers, and what it says goes in through the same
//     `propose` channel, held and attributed, never blessed. Only *where the
//     question goes* differs.
//   - **Where it goes is the room, as a log event.** The question is parked as
//     an answer on the explanation plane whose question is the word `brief`
//     (the shard's word): it replays, undoes and exports, and `LiveStore`
//     already carries log lines, so the relay learns nothing and no host but
//     the room's is ever asked anything.
//   - **The pairing is the brief node's own id** (DIRECTOR-PLAN-W2 L2a). A
//     reply is an answer whose question IS that id, about the ids the brief's
//     own `about` edges name. Every hand derives the same id from the same
//     event, so nothing is minted and nothing is matched by hand — and the
//     hand that answers, a different sitting from the page, names nothing it
//     did not read off the brief.
//
// What a brief says: what was asked (one line: *what is this*, *read the
// writing*, *ask: …*), the contract the model would have been given (the
// system message, verbatim), and the question itself (the user message); a
// picture the page would have sent is not put in the log — the hand renders
// the ink of the marks the brief is about, as it does for `canvas_see`.

import type { Session, SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { LOCAL_PARTICIPANT, aboutIdsOf, explanationOf, getRep, wordOf } from '../session/nodes';
import { handLabel } from '../session/hands';
import type { ChatMessage, CompletionResult, ProviderConfig } from '../llm/provider';
import { providerLocality, textOf } from '../llm/provider';
import { createAgentParticipant, type AgentParticipant, type Transport } from './agent';

/** A brief parked for the seat is an answer carrying this word as its question — the shard's word too. */
export const SEAT_QUESTION = 'brief';
/** The seat's name, one string, so the page, the hand and the gate agree. */
export const SEAT_NAME = 'Claude Code (MCP hand)';
/**
 * How long a parked brief waits before it is withdrawn and its caller told
 * nobody answered. A hand in a conversation is slower than any model — it
 * reads the board, looks at the ink, argues, types — so this is the bridge's
 * ten minutes, not a model's minute.
 */
export const SEAT_WAIT_MS = 600_000;
/** What stands between the parts of a parked brief. */
export const SEAT_RULE = '\n\n----\n\n';
/** Where a picture the page would have sent stands in a parked brief: the hand renders the ink itself. */
export const SEAT_PICTURE = '[the ink of the marks this brief is about, as one picture — the hand that answers renders it from the board]';

/** What a brief asks, by the method of the model it stands in for. */
export type SeatAsk = 'what' | 'read' | 'ask' | 'build' | 'program' | 'draw' | 'behave';

const ASKED: Record<SeatAsk, string> = {
  what: 'what is this',
  read: 'read the writing',
  ask: 'ask',
  build: 'build',
  program: 'program',
  draw: 'draw',
  behave: 'behave',
};

/** The first line of a parked brief: what was asked, in the field's own words. */
export function askedLine(ask: SeatAsk, words?: string): string {
  const w = String(words ?? '').replace(/\s+/g, ' ').trim();
  if (ask === 'what' || ask === 'read' || !w) return ASKED[ask];
  return `${ASKED[ask]}: ${w}`;
}

/** Which ask a first line says, or null for one this core does not write. */
export function askOf(asked: string): SeatAsk | null {
  const a = String(asked ?? '').trim();
  if (a === ASKED.what) return 'what';
  if (a === ASKED.read) return 'read';
  const m = /^(ask|build|program|draw|behave)(?::|$)/.exec(a);
  return m ? (m[1] as SeatAsk) : null;
}

/** The text a brief is parked as: what was asked, the contract, the question. */
export function briefText(p: { asked: string; system: string; user: string }): string {
  return `${p.asked}${SEAT_RULE}${p.system}${SEAT_RULE}${p.user}`;
}

/**
 * A parked text read back. The first part is what was asked, the second the
 * contract, the rest the question — so a rule inside the question itself is
 * harmless. A text with fewer parts (the shard's, which has no first line)
 * reads as the contract and the question.
 */
export function readBriefText(text: string): { asked: string; contract: string; brief: string } {
  const parts = String(text ?? '').split(SEAT_RULE);
  if (parts.length >= 3 && !parts[0].includes('\n')) return { asked: parts[0], contract: parts[1], brief: parts.slice(2).join(SEAT_RULE) };
  if (parts.length >= 2) return { asked: '', contract: parts[0], brief: parts.slice(1).join(SEAT_RULE) };
  return { asked: '', contract: '', brief: parts[0] };
}

/** A refusal the hand sent back instead of an answer: `{"refuse": "why"}`, or null. */
export function refusalOf(text: string): string | null {
  const t = String(text ?? '').trim();
  if (!t.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(t) as { refuse?: unknown };
    return typeof parsed.refuse === 'string' && parsed.refuse.trim() ? parsed.refuse.trim() : null;
  } catch {
    return null;
  }
}

/**
 * What a hand's answer is sent as: the reply — the contract's JSON (an object
 * or an array, stringified here) or prose, as a string — or a refusal, one
 * clause saying why, as `{"refuse": …}`. The one place the wire form is made,
 * so the page's `refusalOf` and the hand cannot spell it differently.
 */
export function seatReplyText(p: { reply?: unknown; refuse?: unknown }): { text: string } | { error: string } {
  const refuse = p.refuse === undefined || p.refuse === null ? '' : String(p.refuse).trim();
  if (refuse) return { text: JSON.stringify({ refuse }) };
  if (typeof p.reply === 'string') return p.reply.trim() ? { text: p.reply } : { error: 'an empty reply' };
  if (p.reply !== undefined && p.reply !== null && typeof p.reply === 'object') return { text: JSON.stringify(p.reply) };
  return { error: 'an answer is "reply" (what the contract asks for) or "refuse" (one clause saying why)' };
}

export interface SeatReply {
  /** The reply's own node id. */
  id: string;
  text: string;
  /** Who answered: the participant its made-by edge names. */
  from: string;
  /** Who answered, as a person sees it: the hand's name without its sitting. */
  who: string;
  at: number;
  /** Why the hand would not, when the reply is a refusal; null otherwise. */
  refused: string | null;
}

export interface SeatBrief {
  /**
   * **The brief node's own id**, which is the pairing: a reply's question is
   * this string. Every hand derives the same one. Opaque — passed back and
   * compared, never parsed or built.
   */
  key: string;
  /** What was asked, in one line. */
  asked: string;
  ask: SeatAsk | null;
  /** Everything the model would have been told first: the contract to answer in. */
  contract: string;
  /** The question itself, as the model would have been handed it. */
  brief: string;
  /** The marks it is about — read off the brief node's own `about` edges. */
  about: string[];
  /** Who parked it: the participant its made-by edge names. */
  from: string;
  /** Who parked it, as a person sees it. */
  who: string;
  at: number;
  /** Taken back by whoever parked it (erased): no hand should answer it. */
  withdrawn: boolean;
  /** The first reply to it, when one has landed. */
  reply: SeatReply | null;
}

type Plane = Pick<SessionState, 'explanations' | 'nodes'>;

/** Who a node's made-by edge names, as an id and as a person sees it. */
function makerOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { from: string; who: string } {
  const e = node.edges.find((x) => x.rel === 'made-by');
  if (!e) return { from: '', who: 'someone' };
  if (e.to === LOCAL_PARTICIPANT) return { from: e.to, who: 'me' };
  const p = nodes.get(e.to);
  const word = p ? wordOf(p) : undefined;
  return { from: e.to, who: handLabel(word || e.to.replace(/^participant:hand:/, '')) || 'someone' };
}

/**
 * Every brief on the board, in the order they were parked, each with its
 * first reply. A brief is an explanation whose question is `brief`; its reply
 * is the first explanation whose question is the brief's own id.
 */
export function seatBriefs(state: Plane): SeatBrief[] {
  const briefs: SeatBrief[] = [];
  const replies = new Map<string, SeatReply>();
  for (const id of state.explanations) {
    const node = state.nodes.get(id);
    if (!node) continue;
    const data = explanationOf(node);
    if (!data) continue;
    const erased = !!getRep(node, 'erased');
    const question = String(data.question ?? '');
    const text = String(data.text ?? '');
    const maker = makerOf(node, state.nodes);
    if (question === SEAT_QUESTION) {
      const read = readBriefText(text);
      briefs.push({
        key: id,
        asked: read.asked,
        ask: askOf(read.asked),
        contract: read.contract,
        brief: read.brief,
        about: aboutIdsOf(node),
        from: maker.from,
        who: maker.who,
        at: node.createdAt,
        withdrawn: erased,
        reply: null,
      });
      continue;
    }
    if (erased || replies.has(question)) continue;
    replies.set(question, { id, text, from: maker.from, who: maker.who, at: node.createdAt, refused: refusalOf(text) });
  }
  for (const b of briefs) b.reply = replies.get(b.key) ?? null;
  return briefs;
}

/** The briefs a hand may answer now: parked, not withdrawn, not yet answered. */
export function pendingBriefs(state: Plane): SeatBrief[] {
  return seatBriefs(state).filter((b) => !b.withdrawn && !b.reply);
}

/**
 * The seat's own traffic on the explanation plane — a brief, or a reply to
 * one — which a surface does not draw as a card: the brief is a model being
 * asked (the work indicator says it), and the reply is what the page turns
 * into readings, a transcript or an answer of its own. A reply to a brief
 * that has since left the log (taken back by undo) is still traffic: its
 * question is an explanation's id, which no sentence a person asks ever is —
 * the one place this core reads the shape of an id it mints.
 */
export function isSeatTraffic(node: MMNode, nodes: ReadonlyMap<string, MMNode>): boolean {
  const data = explanationOf(node);
  if (!data) return false;
  const question = String(data.question ?? '');
  if (question === SEAT_QUESTION) return true;
  const asked = nodes.get(question);
  if (asked) {
    const d = explanationOf(asked);
    return !!d && d.question === SEAT_QUESTION;
  }
  return question.startsWith('explanation:');
}

/** A brief this seat parked and is waiting on. */
export interface ParkedSeatBrief {
  key: string;
  asked: string;
  ask: SeatAsk;
  about: string[];
  at: number;
}

/** What happened to a brief this seat parked — for a surface to send the log, repaint and say so. */
export interface SeatChange {
  kind: 'parked' | 'answered' | 'refused' | 'withdrawn' | 'gone' | 'timeout' | 'stopped';
  brief: ParkedSeatBrief;
  /** Whether the call that parked it carried a signal of its own — a surface that stops calls gives the rest one. */
  signalled: boolean;
  /** The sentence, when there is one: who would not and why, why it was withdrawn. */
  detail?: string;
}

export interface SeatOptions {
  /** Defaults to `SEAT_NAME`. */
  name?: string;
  /** Where the room is carried — the relay — so the seat's locality is true. */
  baseUrl?: string;
  /** How long a brief waits before it is withdrawn. Defaults to `SEAT_WAIT_MS`. */
  timeoutMs?: number;
  /** Who parks a brief: this board's own hand by default — the person asked. */
  participantId?: string;
  /**
   * Asked before anything is parked: a reason the seat cannot take a question
   * here (no room, a room nobody can reach), or null. The caller is told the
   * reason and nothing enters the log.
   */
  canPark?: () => string | null;
  now?: () => number;
  onChange?: (change: SeatChange) => void;
}

export interface SeatParticipant extends AgentParticipant {
  /**
   * Read writing from the ink, as every model that sees does — and name every
   * mark the picture shows (`about`) when it shows more than `nodeId`: a line
   * read as one image. The hand renders the ink of those marks to read it.
   */
  read(args: Parameters<AgentParticipant['read']>[0] & { about?: string[] }): ReturnType<AgentParticipant['read']>;
  /** The briefs this seat is waiting on, oldest first. */
  waiting(): ParkedSeatBrief[];
  /**
   * Give up on one: its caller is told `why`, and the brief is taken back —
   * undone when it is still this hand's last act, else erased — so no hand
   * answers a question nobody waits on. False when that brief is not waiting.
   */
  cancel(key: string, why?: string): boolean;
  /** Stop listening for replies once nothing waits: the seat was left. What is waiting still settles. */
  leave(): void;
}

/** One call's subject: what it asks and which marks it is about. */
interface Call {
  ask: SeatAsk;
  about: string[];
  words?: string;
}

interface Waiting extends ParkedSeatBrief {
  text: string;
  signalled: boolean;
  resolve: (r: CompletionResult) => void;
  cancelTimer: () => void;
  offSignal: () => void;
}

/** A picture in the question is said to be there rather than put in the log. */
function forTheHand(content: ChatMessage['content']): string {
  return typeof content === 'string' ? content : content.map((p) => (p.type === 'text' ? p.text : SEAT_PICTURE)).join('\n');
}

/**
 * Seat Claude Code in a session: a model that parks every question in the
 * room and takes the answer that comes back to it.
 *
 * Every method a model has is here, each through the one transport, with the
 * marks it is about named on the brief: `interpret` (what is this), `read`
 * (the writing — it SEES, because the hand looks at the ink), `ask`, and
 * `generate`, `program`, `draw` and `behave` for a brief at a loop. A reply is
 * settled the moment the session holds it — however it arrived, a merge of
 * another hand's line included — and a brief that leaves the board before it
 * is answered (undone, erased, the board left) settles its caller with the
 * reason.
 */
export function createSeatParticipant(session: Session, at: number = 0, options: SeatOptions = {}): SeatParticipant {
  const name = options.name ?? SEAT_NAME;
  const timeoutMs = options.timeoutMs ?? SEAT_WAIT_MS;
  const parker = options.participantId ?? LOCAL_PARTICIPANT;
  const now = options.now ?? (() => Date.now());
  const config: ProviderConfig = {
    kind: 'openai-compatible',
    // The relay IS where the question goes, so it is the seat's base URL — and
    // a relay on this machine reads as local, which is true.
    baseUrl: options.baseUrl ?? 'http://127.0.0.1:8020',
    model: name,
    label: name,
    vision: true,
  };

  const waiting = new Map<string, Waiting>();
  let asking: Call | null = null;
  let left = false;
  let off: (() => void) | null = null;

  const changed = (kind: SeatChange['kind'], w: Waiting, detail?: string) => {
    const brief: ParkedSeatBrief = { key: w.key, asked: w.asked, ask: w.ask, about: w.about.slice(), at: w.at };
    options.onChange?.(detail === undefined ? { kind, brief, signalled: w.signalled } : { kind, brief, signalled: w.signalled, detail });
  };

  const done = (w: Waiting): boolean => {
    if (waiting.get(w.key) !== w) return false;
    waiting.delete(w.key);
    w.cancelTimer();
    w.offSignal();
    if (left && !waiting.size && off) { off(); off = null; }
    return true;
  };

  /** Take a brief back: undone when it is still this hand's last act, else erased. */
  const takeBack = (w: Waiting) => {
    const node = session.getState().nodes.get(w.key);
    if (!node || getRep(node, 'erased')) return;
    const act = session.lastAct();
    const last = act.length === 1 ? act[0] : null;
    if (last && last.type === 'answer' && last.question === SEAT_QUESTION && last.at === w.at && last.text === w.text) session.undo();
    else session.erase(w.key, now());
  };

  const giveUp = (w: Waiting, kind: 'withdrawn' | 'timeout' | 'stopped', why: string) => {
    if (!done(w)) return;
    takeBack(w);
    changed(kind, w, why);
    w.resolve({ ok: false, error: why });
  };

  /** Settle every waiting brief the session now answers, or no longer holds. */
  const check = () => {
    if (!waiting.size) return;
    const s = session.getState();
    let briefs: Map<string, SeatBrief> | null = null;
    for (const w of [...waiting.values()]) {
      const node = s.nodes.get(w.key);
      if (!node) {
        if (!done(w)) continue;
        const why = 'the brief is no longer on the board — taken back, or the board was left — before a hand answered it';
        changed('gone', w, why);
        w.resolve({ ok: false, error: why });
        continue;
      }
      if (getRep(node, 'erased')) {
        if (!done(w)) continue;
        const why = 'the brief was withdrawn before a hand answered it';
        changed('withdrawn', w, why);
        w.resolve({ ok: false, error: why });
        continue;
      }
      briefs ??= new Map(seatBriefs(s).map((b) => [b.key, b]));
      const reply = briefs.get(w.key)?.reply;
      if (!reply || !done(w)) continue;
      if (reply.refused !== null) {
        const why = `${reply.who} would not: ${reply.refused}`;
        changed('refused', w, why);
        w.resolve({ ok: false, error: why });
      } else {
        changed('answered', w);
        w.resolve({ ok: true, text: reply.text, model: name });
      }
    }
  };
  off = session.subscribe(check);

  // The transport the model's prompts go through: park the question, wait for
  // its reply. `asking` says what this call is about; the wrapper sets it and
  // the agent calls the transport before its first await, so it is this call's.
  const transport: Transport = (_config, messages, opts) => {
    const call = asking;
    asking = null;
    if (!call) return Promise.resolve({ ok: false, error: `${name} was asked by a call that did not say what it is about` });
    const refused = options.canPark?.() ?? null;
    if (refused) return Promise.resolve({ ok: false, error: refused });
    if (opts.signal?.aborted) return Promise.resolve({ ok: false, error: 'stopped' });
    const asked = askedLine(call.ask, call.words);
    const text = briefText({
      asked,
      system: textOf(messages.find((m) => m.role === 'system')?.content ?? ''),
      user: forTheHand(messages.find((m) => m.role === 'user')?.content ?? ''),
    });
    const t = now();
    // The question goes in as this hand's own, on the explanation plane, beside
    // what it is about. `answer()` refuses outright when nothing it is about is
    // still on the board — then nothing enters the log and the caller is told.
    const key = session.answer({ participantId: parker, question: SEAT_QUESTION, text, aboutIds: call.about, at: t });
    if (!key) return Promise.resolve({ ok: false, error: 'nothing the brief was about is on the board — nothing was parked' });
    const node = session.getState().nodes.get(key);
    return new Promise<CompletionResult>((resolve) => {
      const w: Waiting = {
        key,
        asked,
        ask: call.ask,
        about: node ? aboutIdsOf(node) : call.about.slice(),
        at: t,
        text,
        signalled: !!opts.signal,
        resolve,
        cancelTimer: () => {},
        offSignal: () => {},
      };
      waiting.set(key, w);
      const timer = setTimeout(
        () => giveUp(w, 'timeout', `no hand in the room answered in ${Math.round(timeoutMs / 1000)} s — the brief was withdrawn`),
        timeoutMs
      );
      (timer as unknown as { unref?: () => void }).unref?.();
      w.cancelTimer = () => clearTimeout(timer);
      if (opts.signal) {
        const stop = () => giveUp(w, 'stopped', 'stopped');
        opts.signal.addEventListener('abort', stop, { once: true });
        w.offSignal = () => opts.signal!.removeEventListener('abort', stop);
      }
      changed('parked', w);
    });
  };

  const agent = createAgentParticipant(session, config, at, { transport, name, tier: 2, locality: providerLocality(config) });

  /** Run one of the agent's methods with what it is about named for the transport. */
  function via<T>(call: Call, run: () => Promise<T>): Promise<T> {
    asking = call;
    try {
      return run();
    } finally {
      asking = null;
    }
  }
  const alive = (ids: readonly string[]) => {
    const s = session.getState();
    return ids.filter((id) => s.nodes.has(id));
  };
  const everything = () => {
    const s = session.getState();
    return s.contentIds.filter((id) => !s.artifacts.includes(id));
  };

  return {
    ...agent,
    // The spread copies a value; the agent's id moves when a board is loaded in place and it is seated again.
    get id() { return agent.id; },
    interpret: (nodeIds, t, signal) => via({ ask: 'what', about: alive(nodeIds) }, () => agent.interpret(nodeIds, t, signal)),
    ask: (question, nodeIds, t, signal) => via({ ask: 'ask', about: alive(nodeIds), words: question }, () => agent.ask(question, nodeIds, t, signal)),
    // A line read as one image names every mark in the picture (`about`); one mark names itself.
    read: (args: Parameters<AgentParticipant['read']>[0] & { about?: string[] }) =>
      via({ ask: 'read', about: alive(args.about && args.about.length ? args.about : [args.nodeId]) }, () => agent.read(args)),
    // A batch of lines read as one sheet names every mark on it, so the hand that answers draws the page's ink.
    readLines: (args) => via({ ask: 'read', about: alive(args.lines.flatMap((l) => l.ids)) }, () => agent.readLines(args)),
    generate: (args) => via({ ask: 'build', about: alive([args.artifactId]), words: args.prompt }, () => agent.generate(args)),
    program: (args) => via({ ask: 'program', about: alive([args.artifactId]), words: args.prompt }, () => agent.program(args)),
    draw: (args) => via({ ask: 'draw', about: alive(args.nodeIds && args.nodeIds.length ? args.nodeIds : everything()), words: args.prompt }, () => agent.draw(args)),
    behave: (args) => via({ ask: 'behave', about: alive([args.nodeId]), words: args.words }, () => agent.behave(args)),
    waiting: () => [...waiting.values()].sort((a, b) => a.at - b.at).map((w) => ({ key: w.key, asked: w.asked, ask: w.ask, about: w.about.slice(), at: w.at })),
    cancel: (key, why) => {
      const w = waiting.get(key);
      if (!w) return false;
      giveUp(w, 'withdrawn', why ?? 'withdrawn');
      return true;
    },
    leave: () => {
      left = true;
      if (!waiting.size && off) { off(); off = null; }
    },
  };
}
