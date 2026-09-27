// ===== room =====
// The shard in a live room (SHARD-3D-PUSH-2 G5), and the brief parked in it.
//
// **Nothing in the engine changes, and nothing here is engine work.** The
// shard's log IS a core session (`log.ts`, invariant 4), so a second hand on
// this board is a second log arriving live instead of after a pull — exactly
// what `Demos/surface/17-folder.js` does for the canvas, ported to TypeScript
// and to one session instead of a folder. `LiveStore` carries the lines,
// `mergeLogs(logs, { me })` stamps every event from another log `by`, and the
// session attributes such an event to a participant of that name. Another
// hand's ink is its own.
//
// ## How a brief travels, and why it is a log event
//
// The plan leaves this open: a log event, or a side channel over the relay.
// **It is a log event — an answer on the explanation plane** — for three
// reasons, and the first is the deciding one:
//
//   1. **The canvas already parks questions there.** `session.answer()` is the
//      third plane beside content and gesture: visible and erasable, never ink,
//      never joining a lasso or a signature (CLAUDE.md, "Answers are nodes, not
//      chat"). A brief changes no mark, stands no solid and writes no version —
//      it is a question — and the explanation plane is where this engine has
//      always put questions and the answers to them.
//   2. **The log is the source.** A side channel would be a second truth that
//      does not replay, does not undo and is not exported; the transcript (G0)
//      would have to be told about it separately. Parked in the log, the brief
//      and its answer ARE the transcript's record, and an export carries them.
//   3. **It costs no protocol.** `LiveStore` already carries log lines between
//      the tab and the hand; the relay keeps no truth of its own and needs to
//      learn nothing. A side channel would mean a second endpoint on a relay
//      whose whole virtue is that it only forwards.
//
// ## The pairing is the brief's own node id (DIRECTOR-PLAN-W2 L2a)
//
// It used to be a key the asking hand minted — `brief:<key>` out,
// `answer:<key>` back — because node ids were a counter over the merged
// replay, so two hands merging the same lines in a different order numbered
// the same node differently (SURFACE-v10-PLAN D8) and nothing could be named
// across the room. That key was a second naming system running beside the
// engine's, and a second naming system is exactly the thing that quietly
// disagrees with the first.
//
// An id is now a function of the event that minted it — the log that wrote it
// and that event's number in that log (ids per hand, L1) — so the id the
// asking hand gets back from `session.answer()` is the id every other hand
// derives for that same brief. **So the brief needs no key: it IS one.** A
// brief is an answer whose `question` is the word `brief`; its reply is an
// answer whose `question` is the brief node's id, `about` the marks the brief
// node's own `about` edges name. Nothing is minted and nothing is matched by
// hand.
//
// The one thing this asks of a hand is that it SAY WHAT ITS LOG IS CALLED,
// which `joinRoom` and `otherHand` do below, under the name the log is sent
// under (one sitting, `sittingName`). Unsaid, the core keeps its counter and the
// ids would be this tab's private numbering again. What was drawn before the
// join keeps the ids it was drawn with: the name applies to what is written
// next. Those older ids are the counter's, and the counter moves only for
// unnamed events, so every reader holding the same unnamed lines numbers them
// alike — which, with every hand naming its log as it joins, is only ever what
// a hand drew before it joined.

import {
  createSession,
  DEFAULT_SESSION_CONFIG,
  ENGINE_PARTICIPANT,
  handLabel as labelOf,
  LiveStore,
  LOCAL_PARTICIPANT,
  mergeLogs,
  sittingName,
  sittingToken,
  wordOf,
  type LiveTransport,
  type Session,
  type SessionEvent,
} from 'metamedium-core';

/**
 * A brief parked for the seat is an answer carrying this word as its question.
 * It says *this is a question for a hand*, and nothing else: what the reply
 * refers back to is the brief node's own id.
 */
export const BRIEF_QUESTION = 'brief';

/**
 * The pairing as it was written before ids were per hand: `brief:<key>` and
 * `answer:<key>`, a key minted by the asking hand. **Read only** — nothing
 * writes these any more. A log recorded before L2a replays here like any other
 * (`fixtures/seat-before-ids.mm.log` is one), and its briefs and answers must
 * not be read out as sentences somebody said in the room: they are the seat's
 * own traffic, whatever spelling they were written in. An old brief is never
 * offered to be answered — the tab that could settle it ran code that no
 * longer exists.
 */
const LEGACY_BRIEF = 'brief:';
const LEGACY_ANSWER = 'answer:';

/** True for a brief or an answer written before L2a. Nothing writes these. */
export function legacySeatTraffic(question: string): boolean {
  return question.startsWith(LEGACY_BRIEF) || question.startsWith(LEGACY_ANSWER);
}

/**
 * How long a parked brief waits before it reports failure rather than hanging.
 * A hand in a conversation is slower than any model — it is reading the board,
 * arguing about it, and typing — so this is the bridge's own ten minutes
 * (`participants/bridge.ts`), not a model's sixty seconds.
 */
export const PARK_TIMEOUT_MS = 600_000;

/** Presence: a hand heard from inside this window is in the room. */
const PRESENT_MS = 60_000;

export interface ParkedBrief {
  /**
   * **The brief's own node id**, which is the pairing: the reply's `question`
   * is this string. Every hand in the room derives the same one, because an id
   * is a function of the event that minted it. Opaque — passed back and
   * compared, never parsed or built.
   */
  key: string;
  /** Everything the seat was told — the system message and the user message, as a model gets them. */
  prompt: string;
  /** Just the brief: the scene as `describeSpace` wrote it. */
  brief: string;
  /** What the human typed. */
  words: string;
  /** The marks or solids the brief is about, in THIS hand's ids. */
  about: string[];
  at: number;
}

export interface RoomAnswer {
  key: string;
  text: string;
  /** The hand that answered, without its tab suffix. */
  by: string;
  at: number;
}

export interface Room {
  /** This hand's log name, suffix and all. */
  me: string;
  /** Where the room is carried — the seat's own base URL, so its locality is true. */
  relay: string;
  /** This hand as a person sees it. */
  label: string;
  room: string;
  /** Every hand heard from lately, this one excluded, as people not logs. */
  presence(): string[];
  /**
   * What the room has said about itself, one sentence each: a name two hands
   * share (this hand's own included — both hands that share it are told) and a
   * history older than the relay remembers. The status line says them.
   */
  notices(): string[];
  /** Send this hand's log as it stands: the new tail, or the whole of it when it shrank. Idempotent. */
  flush(): Promise<void>;
  /**
   * Park a question in the room and settle when its answer lands — the
   * `bridge.ts` pattern with the room as the transport. The promise is the
   * only thing the caller sees, so a seat built on it looks exactly like a
   * model to `propose()`.
   */
  ask(q: {
    prompt: string;
    brief: string;
    words: string;
    about: string[];
    signal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<{ ok: true; text: string; by: string } | { ok: false; error: string }>;
  /** The briefs waiting for an answer right now — what the surface shows. */
  waiting(): ParkedBrief[];
  close(): void;
}

export interface RoomOptions {
  session: Session;
  room: string;
  /** The relay's base URL. Without one, `transport` must be given. */
  relay?: string;
  /** The person's name; the tab's suffix is added to it. */
  name?: string;
  /** Injected for the tests — a `LocalHub` transport. Beats `relay` when given. */
  transport?: LiveTransport;
  /** Fires after every merge, so the surface re-derives what it draws. */
  onMerge?: () => void;
  /** Fires when a brief is parked or answered, so the surface can say so. */
  onWaiting?: (waiting: ParkedBrief[]) => void;
}

/** A hand's name as a person sees it: without the sitting's suffix (core's one rule). */
export function handLabel(name: string): string {
  return labelOf(name);
}

/**
 * The relay as a transport, in the browser — `17-folder.js`'s own, which is
 * `EventSource` in and POST out. The relay is `Demos/relay.mjs`.
 */
export function relayTransport(url: string, room: string): LiveTransport {
  const base = `${url.replace(/\/+$/, '')}/rooms/${encodeURIComponent(room)}/events`;
  const es = new EventSource(base);
  let cbs: ((line: never) => void)[] = [];
  const handler = (e: MessageEvent) => {
    let line: unknown;
    try {
      line = JSON.parse(e.data);
    } catch {
      return; // not a line
    }
    for (const cb of cbs.slice()) (cb as (l: unknown) => void)(line);
  };
  es.addEventListener('message', handler);
  return {
    // The POST's promise goes back to the store, which sends the next line only
    // when this one has gone: two POSTs in flight can land the wrong way round.
    send: (line) =>
      fetch(base, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(line),
      }).then(
        () => undefined,
        () => undefined
      ),
    onMessage: (cb) => {
      cbs.push(cb as (line: never) => void);
      return () => {
        cbs = cbs.filter((c) => c !== (cb as unknown));
      };
    },
    close: () => {
      es.removeEventListener('message', handler);
      es.close();
    },
  };
}

/**
 * A hand in a room is ONE SITTING — this page load (DIRECTOR-PLAN-W2 L1). The
 * name is the person's and the suffix is this page load's, because a second
 * tab of the same person is a second log — under one name its lines would be
 * taken for its own (CLAUDE.md, "Live logs"). The suffix is minted once, here,
 * and kept nowhere a reload would find it: a tab never hears its own lines
 * back, so a reload that took its old name again would number from one under
 * a name the room already holds. Joining again in this page load is the same
 * sitting, so the store is told the same sitting id.
 */
const PAGE_SUFFIX = sittingToken();
const PAGE_SITTING = sittingToken(8);
function handName(name: string): string {
  return sittingName(name || 'hand', PAGE_SUFFIX);
}

/** The explanation reps on the board, newest last, with who said each one. */
function explanationsOf(
  session: Session
): { id: string; question: string; text: string; by: string; engine: boolean; at: number }[] {
  const s = session.getState();
  const out: { id: string; question: string; text: string; by: string; engine: boolean; at: number }[] = [];
  for (const id of s.explanations) {
    const node = s.nodes.get(id);
    if (!node || node.reps.some((r) => r.modality === 'erased')) continue;
    const rep = node.reps.find((r) => r.modality === 'explanation');
    if (!rep) continue;
    const data = rep.data as { question?: string; text?: string };
    const made = node.edges.find((e) => e.rel === 'made-by');
    const participant = made ? s.nodes.get(made.to) : undefined;
    const by =
      made && made.to !== LOCAL_PARTICIPANT
        ? wordOf(participant!) || handLabel(made.to.replace(/^participant:hand:/, ''))
        : 'me';
    out.push({
      id,
      question: String(data.question ?? ''),
      text: String(data.text ?? ''),
      by,
      engine: made?.to === ENGINE_PARTICIPANT,
      at: node.createdAt,
    });
  }
  return out;
}

/**
 * The prompt a seat was handed, split back into the brief and the words.
 *
 * The split is on the literal `generator.ts`'s `messagesFor` writes between
 * them, so it is exact rather than a guess at prose — and when it is not there
 * (a prompt that file has since re-worded), the whole thing is the brief and
 * the words are empty. The hand still has everything; it is only told less
 * about which part is which.
 *
 * **Both asks, because there are two** (G4). `messagesFor` writes *Propose the
 * tree.* for the steps-and-profiles contract and *Name the parts.* for G3's
 * parts contract, and this knew only the first — so on a standing hull, which
 * is the board the whole of push 2 is about, the hand was handed the brief with
 * the human's own words stripped out of it. Found by the demo's ninth beat;
 * the marker a contract uses is the one thing that must not be guessed, so
 * they are listed rather than matched loosely.
 */
const ASK_MARKS = ['\n\nPropose the tree.', '\n\nName the parts.'];

export function splitPrompt(user: string): { brief: string; words: string } {
  for (const mark of ASK_MARKS) {
    const i = user.indexOf(mark);
    if (i < 0) continue;
    const tail = user.slice(i + mark.length);
    const said = /The human asked for: [“"](.*)[”"]\s*$/.exec(tail);
    return { brief: user.slice(0, i), words: said ? said[1] : '' };
  }
  return { brief: user, words: '' };
}

/**
 * Sentences another hand has placed in the space — never the briefs or their
 * answers, which are the seat's own traffic and not something to read out.
 *
 * The shard has no card for an explanation yet (the canvas draws them beside
 * their marks; here the panel is about marks and solids), so the surface says
 * the newest one in the status line as it lands. That is the smallest honest
 * place: it is in the log, attributed and erasable, and the human is told.
 */
export function saidInRoom(session: Session): { text: string; by: string; at: number }[] {
  const said = explanationsOf(session);
  // The seat's traffic, by id: the briefs, and whatever answers one. A reply's
  // question IS its brief's id, so this is the whole test — no prefix, no
  // guess about what a question string means — plus the old spelling, read.
  const briefs = new Set(said.filter((x) => x.question === BRIEF_QUESTION).map((x) => x.id));
  // And never the engine's own asking — *how deep?* (L2c) is the board's
  // question, said where it stood, not a sentence another hand placed.
  return said.filter(
    (x) =>
      x.by !== 'me' &&
      !x.engine &&
      x.question !== BRIEF_QUESTION &&
      !briefs.has(x.question) &&
      !legacySeatTraffic(x.question)
  );
}

/** A refusal the hand sent back instead of a proposal. */
export function refusalOf(text: string): string | null {
  const t = text.trim();
  if (!t.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(t) as { refuse?: unknown };
    return typeof parsed.refuse === 'string' && parsed.refuse.trim() ? parsed.refuse.trim() : null;
  } catch {
    return null;
  }
}

export function joinRoom(o: RoomOptions): Room {
  const { session } = o;
  const me = handName(o.name ?? 'hand');
  // Say what this tab's log is called, BEFORE anything is written into the
  // room — the name its lines are sent under and `mergeLogs` is given as `me`.
  // From here every id this session mints is derived from the event that
  // minted it, so it is the same id in every hand that merges the line: the id
  // a brief is answered by, and every id `space_look` hands out (L2a). What is
  // already drawn keeps the ids it was drawn with — nothing is renumbered.
  session.setLogName(me);
  const transport = o.transport ?? relayTransport(o.relay ?? '', o.room);
  const store = new LiveStore(transport, me, o.room, { sitting: PAGE_SITTING });

  // My log is the session's own UNSTAMPED events — sent or not — never the
  // room's copy of it. A line landing between a send and the next merge would
  // otherwise count every sent mark twice, and every mark of mine would stand
  // doubled (the canvas found this with its MCP smoke test).
  const myLog = (): SessionEvent[] => session.getEvents().filter((e) => !e.by);
  let merging = false;
  let mergePending = false;
  let closed = false;

  const waiting = new Map<
    string,
    { parked: ParkedBrief; settle: (r: { ok: true; text: string; by: string } | { ok: false; error: string }) => void; timer: ReturnType<typeof setTimeout> }
  >();
  const told = () => o.onWaiting?.([...waiting.values()].map((w) => w.parked));

  async function flush(): Promise<void> {
    if (closed || merging) return;
    // My log as it stands (`publish`): the new tail when it only grew, the
    // whole of it when it did not — an undo, a `clear()` — so every hand in the
    // room holds what this one holds. Counting what was sent could not say an
    // undo: the log came back to the same length and the next mark was never
    // sent at all.
    await store.publish(myLog());
  }

  async function merge(): Promise<void> {
    if (closed) return;
    const logs = await store.readLogs();
    const mine = myLog();
    merging = true;
    try {
      session.load(mergeLogs(Object.assign({}, logs, { [me]: mine }), { me }));
    } finally {
      merging = false;
    }
    settleAnswers();
    o.onMerge?.();
  }

  /** Every parked brief whose answer has landed, settled once. */
  function settleAnswers(): void {
    if (!waiting.size) return;
    let changed = false;
    for (const said of explanationsOf(session)) {
      // A reply says which brief it answers by NAMING it: its question is the
      // brief node's id, which is the same id here as where it was written.
      const held = waiting.get(said.question);
      if (!held) continue;
      clearTimeout(held.timer);
      waiting.delete(said.question);
      changed = true;
      const refused = refusalOf(said.text);
      held.settle(
        refused ? { ok: false, error: `${said.by} would not: ${refused}` } : { ok: true, text: said.text, by: said.by }
      );
    }
    if (changed) told();
  }

  store.subscribe(() => {
    if (mergePending) return;
    mergePending = true;
    // A microtask, not a timer: a hidden tab throttles timers to once a
    // second, and another hand's line should land at once. Lines arriving in
    // one tick coalesce into one merge.
    void Promise.resolve().then(() => {
      mergePending = false;
      return merge();
    });
  });

  // What this hand has already drawn is its opening log in the room, and the
  // hello asks for everyone else's.
  void flush().then(() => store.hello());

  // Every act of this hand's is a line. The merge sets `merging`, so loading
  // another hand's events never echoes them back as mine.
  session.subscribe(() => {
    if (merging) return;
    void flush();
  });

  return {
    me,
    relay: o.relay ?? '',
    label: handLabel(me),
    room: o.room,
    presence: () => {
      const now = Date.now();
      return store
        .presence()
        .filter((p) => now - p.at < PRESENT_MS && p.participant !== me)
        .map((p) => handLabel(p.participant));
    },
    notices: () => store.notices(),
    flush,
    waiting: () => [...waiting.values()].map((w) => w.parked),
    ask: (q) =>
      new Promise((resolve) => {
        if (!q.about.length) {
          resolve({ ok: false, error: 'a brief is parked beside what it is about, and nothing is selected' });
          return;
        }
        const at = Date.now();
        // The question goes in as this hand's own, on the explanation plane.
        // `answer()` refuses outright when nothing it is about is still on the
        // board, so a brief about erased marks never enters the log — and the
        // caller is told rather than left waiting.
        //
        // What comes back is the brief's node id, and THAT is the pairing:
        // nothing is minted here.
        const key = session.answer({
          participantId: LOCAL_PARTICIPANT,
          question: BRIEF_QUESTION,
          text: q.prompt,
          aboutIds: q.about,
          at,
        });
        if (!key) {
          resolve({ ok: false, error: 'the marks the brief was about are gone — nothing was parked' });
          return;
        }
        const parked: ParkedBrief = {
          key,
          prompt: q.prompt,
          brief: q.brief,
          words: q.words,
          about: q.about.slice(),
          at,
        };
        let done = false;
        const settle = (r: { ok: true; text: string; by: string } | { ok: false; error: string }) => {
          if (done) return;
          done = true;
          resolve(r);
        };
        const timer = setTimeout(() => {
          waiting.delete(key);
          told();
          settle({ ok: false, error: `no hand in room “${o.room}” answered in ${Math.round((q.timeoutMs ?? PARK_TIMEOUT_MS) / 1000)}s` });
        }, q.timeoutMs ?? PARK_TIMEOUT_MS);
        // Esc, and the work panel's cancel, reach this exactly as they reach a
        // model's call — the seat is a model to everything upstream of it.
        q.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          waiting.delete(key);
          told();
          settle({ ok: false, error: 'stopped' });
        });
        waiting.set(key, { parked, settle, timer });
        told();
        void flush();
      }),
    close: () => {
      closed = true;
      for (const held of waiting.values()) {
        clearTimeout(held.timer);
        held.settle({ ok: false, error: 'the room was left' });
      }
      waiting.clear();
      store.close();
    },
  };
}

// ---- the other hand ---------------------------------------------------------

export interface OtherHand {
  me: string;
  /** Briefs parked in the room that nobody has answered yet, oldest first. */
  pending(): (ParkedBrief & { from: string })[];
  /** Answer one in the proposal contract. False when that brief is not waiting. */
  answer(key: string, text: string): boolean;
  /** Refuse one, with a reason the human will read. */
  refuse(key: string, why: string): boolean;
  /** Whatever it has merged, for a test to look at. */
  session: Session;
  close(): void;
}

/**
 * A hand in the room that is NOT this page: the second hand in `room.test.ts`,
 * and the e2e's stand-in for `shard-3d/mcp.mjs`.
 *
 * It is the same loop the MCP server runs — keep a session from the merged
 * logs, read the parked briefs off the explanation plane, append the answer as
 * this hand's own — written once here in TypeScript so the e2e can drive it
 * inside the page, and once in `mcp.mjs` in JavaScript over the Node bundle,
 * because the two run in different worlds. The protocol they share is two
 * lines wide: a brief is an answer whose question is `brief`, and its reply is
 * an answer whose question is **the brief's own node id** — which this hand
 * reads off its own board, having derived it from the same event.
 */
export function otherHand(transport: LiveTransport, name: string, roomName: string): OtherHand {
  const me = name.includes('~') ? name : `${name}~1`;
  // This hand says what its log is called too, for the same reason the tab
  // does: what it writes must be named the same here and everywhere else.
  const session = createSession({ ...DEFAULT_SESSION_CONFIG, logName: me });
  const store = new LiveStore(transport, me, roomName);
  let merging = false;

  const myLog = (): SessionEvent[] => session.getEvents().filter((e) => !e.by);
  const merge = async () => {
    const logs = await store.readLogs();
    merging = true;
    try {
      session.load(mergeLogs(Object.assign({}, logs, { [me]: myLog() }), { me }));
    } finally {
      merging = false;
    }
  };
  const flush = async () => {
    if (merging) return;
    await store.publish(myLog());
  };
  store.subscribe(() => void merge());
  session.subscribe(() => {
    if (merging) return;
    void flush();
  });
  store.hello();

  /** The briefs still waiting, with the ids they are about IN THIS session. */
  const briefs = (): (ParkedBrief & { from: string })[] => {
    const s = session.getState();
    const out: (ParkedBrief & { from: string })[] = [];
    // A brief is answered when some explanation's question is its id — every
    // question on the board is enough to ask that with, since an id names one
    // node and a word like `note` or `brief` names none.
    const answered = new Set<string>(explanationsOf(session).map((x) => x.question));
    for (const id of s.explanations) {
      const node = s.nodes.get(id);
      if (!node || node.reps.some((r) => r.modality === 'erased')) continue;
      const rep = node.reps.find((r) => r.modality === 'explanation');
      if (!rep) continue;
      const data = rep.data as { question?: string; text?: string };
      // Only a brief in today's spelling: an old `brief:<key>` is read (it is
      // never said aloud) but never offered, because nobody waits on it.
      if (String(data.question ?? '') !== BRIEF_QUESTION) continue;
      // The brief's own id IS the key: this hand derived it from the same event
      // the asking hand did, so no key has to be carried or matched.
      const key = id;
      if (answered.has(key)) continue;
      const made = node.edges.find((e) => e.rel === 'made-by');
      const participant = made ? s.nodes.get(made.to) : undefined;
      const prompt = String(data.text ?? '');
      // The prompt is the system message, a rule of dashes, then the user message.
      const cut = prompt.indexOf('\n\n----\n\n');
      const { brief, words } = splitPrompt(cut >= 0 ? prompt.slice(cut + 8) : prompt);
      out.push({
        key,
        prompt,
        brief,
        words,
        // Read off the brief node's own edges in THIS session — which, now that
        // ids are per hand, is the same set of ids the asking hand named.
        about: node.edges.filter((e) => e.rel === 'about').map((e) => e.to),
        at: node.createdAt,
        from: made && participant ? wordOf(participant) || handLabel(made.to.replace(/^participant:hand:/, '')) : 'someone',
      });
    }
    return out.sort((a, b) => a.at - b.at);
  };

  const reply = (key: string, text: string): boolean => {
    const held = briefs().find((b) => b.key === key);
    if (!held) return false;
    const id = session.answer({
      participantId: LOCAL_PARTICIPANT,
      // The reply names the brief it answers, by the brief's own id.
      question: key,
      text,
      aboutIds: held.about,
      at: Date.now(),
    });
    if (!id) return false;
    void flush();
    return true;
  };

  return {
    me,
    session,
    pending: briefs,
    answer: reply,
    refuse: (key, why) => reply(key, JSON.stringify({ refuse: why })),
    close: () => store.close(),
  };
}
