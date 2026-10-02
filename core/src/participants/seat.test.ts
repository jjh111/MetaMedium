// The seat (V1-PLAN J4): Claude Code, over MCP, as a model the field asks.
// Every question parked in the room as a brief; every answer paired by the
// brief node's own id; the page takes it exactly as it takes a model's.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { LOCAL_PARTICIPANT, explanationOf, getRep, transcriptOf } from '../session/nodes';
import { interpretationsOf } from '../session/interpretations';
import { LiveStore, LocalHub } from '../store/live';
import { LiveMerge } from '../store/livemerge';
import { mergeLogs } from '../store/merge';
import { handRect, handText } from '../test/strokes';
import {
  createSeatParticipant,
  seatBriefs,
  pendingBriefs,
  isSeatTraffic,
  refusalOf,
  seatReplyText,
  briefText,
  readBriefText,
  askedLine,
  askOf,
  SEAT_NAME,
  SEAT_QUESTION,
  SEAT_PICTURE,
  type SeatChange,
} from './seat';

const tick = () => new Promise((r) => setTimeout(r, 0));
const last = <T,>(xs: readonly T[]): T => xs[xs.length - 1];
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const READINGS = '[{"label":"pair of cards","confidence":0.82,"reasoning":"two boxes of one size side by side"},{"label":"two windows","confidence":0.4,"reasoning":"a facade"}]';

/** A board with two boxes on it, and the seat in it. */
function board(options: Parameters<typeof createSeatParticipant>[2] = {}) {
  const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'john~j1' });
  const a = s.addStroke(handRect(100, 100, 150, 110, { seed: 1 }), 1000);
  const b = s.addStroke(handRect(300, 100, 150, 110, { seed: 2 }), 1100);
  const changes: SeatChange[] = [];
  const seat = createSeatParticipant(s, 1200, { baseUrl: 'http://127.0.0.1:8020', onChange: (c) => changes.push(c), ...options });
  return { s, a, b, seat, changes };
}

/** Another hand's answer, as it lands on this board after a merge: an explanation whose question is the brief's id. */
function answerAs(s: Session, key: string, text: string, who = 'claude~c1'): string | null {
  const hand = s.join('human', who, Date.now());
  const brief = s.getState().nodes.get(key)!;
  const about = brief.edges.filter((e) => e.rel === 'about').map((e) => e.to);
  return s.answer({ participantId: hand, question: key, text, aboutIds: about, at: Date.now() });
}

describe('the brief, as text', () => {
  it('says what was asked on its first line, then the contract, then the question — and reads back', () => {
    expect(askedLine('what')).toBe('what is this');
    expect(askedLine('read')).toBe('read the writing');
    expect(askedLine('ask', 'why are  these\none thing?')).toBe('ask: why are these one thing?');
    expect(askedLine('build', 'a pricing page')).toBe('build: a pricing page');
    for (const a of ['what', 'read', 'ask', 'build', 'program', 'draw', 'behave'] as const) expect(askOf(askedLine(a, 'x y'))).toBe(a);
    expect(askOf('sing')).toBeNull();
    const text = briefText({ asked: 'what is this', system: 'You are…\nRules', user: 'geometry: …\n\n----\n\nstill the question' });
    expect(readBriefText(text)).toEqual({ asked: 'what is this', contract: 'You are…\nRules', brief: 'geometry: …\n\n----\n\nstill the question' });
    // The shard's: a contract and a question, no first line.
    expect(readBriefText('You are…\nRules\n\n----\n\nthe scene')).toEqual({ asked: '', contract: 'You are…\nRules', brief: 'the scene' });
  });

  it('a refusal is its own object, and one function makes the wire form', () => {
    expect(refusalOf('{"refuse":"not enough to go on"}')).toBe('not enough to go on');
    expect(refusalOf('[{"label":"x"}]')).toBeNull();
    expect(refusalOf('{"refuse":"  "}')).toBeNull();
    expect(refusalOf('refuse')).toBeNull();
    expect(seatReplyText({ refuse: ' no ' })).toEqual({ text: '{"refuse":"no"}' });
    expect(seatReplyText({ reply: [{ label: 'x', confidence: 0.5 }] })).toEqual({ text: '[{"label":"x","confidence":0.5}]' });
    expect(seatReplyText({ reply: 'Because they touch.' })).toEqual({ text: 'Because they touch.' });
    expect('error' in seatReplyText({})).toBe(true);
    expect('error' in seatReplyText({ reply: '   ' })).toBe(true);
  });
});

describe('the seat', () => {
  it('joins as a model that sees, on this machine — named, at tier 2', () => {
    const { s, seat } = board();
    expect(s.getState().participants).toContain(seat.id);
    expect(seat.name).toBe(SEAT_NAME);
    expect(seat.config.vision).toBe(true);
    expect(seat.config.baseUrl).toBe('http://127.0.0.1:8020');
  });

  it('parks What is this? in the log with the model\'s own prompt, about the marks — nothing is posted anywhere', async () => {
    const { s, a, b, seat, changes } = board();
    const asking = seat.interpret([a, b], 2000);
    // Parked synchronously, as the call is made: the brief is this hand's own answer event.
    const waiting = seat.waiting();
    expect(waiting).toHaveLength(1);
    expect(waiting[0]).toMatchObject({ ask: 'what', asked: 'what is this', about: [a, b] });
    const evs = s.getEvents();
    const ev = evs[evs.length - 1];
    expect(ev).toMatchObject({ type: 'answer', question: SEAT_QUESTION, participantId: LOCAL_PARTICIPANT });
    const [brief] = pendingBriefs(s.getState());
    expect(brief.key).toBe(waiting[0].key);
    expect(brief.about).toEqual([a, b]);
    expect(brief.contract).toMatch(/INTERPRETATIONS, not answers/);
    expect(brief.contract).toMatch(/Reply with ONLY a JSON array/);
    expect(brief.brief).toMatch(/These 2 marks were grouped together/);
    expect(changes.map((c) => c.kind)).toEqual(['parked']);
    answerAs(s, brief.key, READINGS);
    const r = await asking;
    expect(r.ok).toBe(true);
    expect(r.readings.map((x) => x.label)).toEqual(['pair of cards', 'two windows']);
    // The same propose channel a model uses: held on the group, attributed to the seat, never blessed.
    const reads = interpretationsOf(s.getState().nodes.get(a)!, s.getState().nodes).filter((x) => x.sourceName === SEAT_NAME);
    expect(reads.map((x) => x.weight)).toEqual([0.82, 0.4]);
    expect(reads.every((x) => !x.blessed)).toBe(true);
    expect(changes.map((c) => c.kind)).toEqual(['parked', 'answered']);
    expect(seat.waiting()).toEqual([]);
    const [done] = seatBriefs(s.getState());
    expect(done.reply).toMatchObject({ who: 'claude', refused: null });
    expect(pendingBriefs(s.getState())).toEqual([]);
  });

  it('reads the writing: the picture is said to be there, never put in the log, and every mark it shows is named', async () => {
    const { s, seat } = board();
    const w1 = s.addStroke(handText(100, 400, 120, 30, { seed: 3 }), 1300);
    const w2 = s.addStroke(handText(240, 400, 120, 30, { seed: 4 }), 1400);
    const reading = seat.read({ nodeId: w1, image: PNG, at: 2000, hold: false, about: [w1, w2] });
    const [brief] = pendingBriefs(s.getState());
    expect(brief).toMatchObject({ ask: 'read', asked: 'read the writing', about: [w1, w2] });
    expect(brief.contract).toMatch(/reading handwriting/);
    expect(brief.brief).toContain(SEAT_PICTURE);
    expect(JSON.stringify(s.getEvents())).not.toContain('base64');
    answerAs(s, brief.key, '[{"text":"hello world","confidence":0.9}]');
    const r = await reading;
    expect(r.ok).toBe(true);
    expect(r.transcripts[0].text).toBe('hello world');

    // One mark, held: the transcript lands on it, attributed to the seat.
    const one = seat.read({ nodeId: w2, image: PNG, at: 2100 });
    const [second] = pendingBriefs(s.getState());
    expect(second.about).toEqual([w2]);
    answerAs(s, second.key, '[{"text":"world","confidence":0.8}]');
    expect((await one).ok).toBe(true);
    expect(transcriptOf(s.getState().nodes.get(w2)!)).toBe('world');
  });

  it('answers a question into the canvas as its own card, beside the marks', async () => {
    const { s, a, b, seat } = board();
    const asking = seat.ask('why are these one thing?', [a, b], 2000);
    const [brief] = pendingBriefs(s.getState());
    expect(brief.asked).toBe('ask: why are these one thing?');
    expect(brief.brief).toMatch(/Question: why are these one thing\?/);
    answerAs(s, brief.key, 'They are one size and share a band.');
    const r = await asking;
    expect(r.ok).toBe(true);
    const card = s.getState().nodes.get(r.explanationId!)!;
    expect(explanationOf(card)).toMatchObject({ question: 'why are these one thing?', text: 'They are one size and share a band.' });
    expect(isSeatTraffic(card, s.getState().nodes)).toBe(false);
  });

  it('a refusal is said: who would not, and why — and nothing lands', async () => {
    const { s, a, b, seat, changes } = board();
    const asking = seat.interpret([a, b], 2000);
    const [brief] = pendingBriefs(s.getState());
    const edges = s.getState().nodes.get(a)!.edges.length;
    answerAs(s, brief.key, '{"refuse":"two boxes are not enough to say"}');
    const r = await asking;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('claude would not: two boxes are not enough to say');
    expect(s.getState().nodes.get(a)!.edges.length).toBe(edges);
    expect(last(changes)).toMatchObject({ kind: 'refused', detail: 'claude would not: two boxes are not enough to say' });
    expect(seatBriefs(s.getState())[0].reply!.refused).toBe('two boxes are not enough to say');
  });

  it('a brief given up on is taken back: undone while it is this hand\'s last act, erased after', async () => {
    const { s, a, b, seat } = board();
    const first = seat.interpret([a, b], 2000);
    const k1 = seat.waiting()[0].key;
    expect(seat.cancel(k1, 'stopped')).toBe(true);
    expect(await first).toMatchObject({ ok: false, error: 'stopped' });
    // The last act was the brief: it leaves the log, as if never asked.
    expect(s.getState().nodes.has(k1)).toBe(false);
    expect(s.getEvents().some((e) => e.type === 'answer')).toBe(false);

    const second = seat.interpret([a, b], 2100);
    const k2 = seat.waiting()[0].key;
    s.addStroke(handRect(100, 300, 80, 60, { seed: 9 }), 2200); // the hand drew since
    expect(seat.cancel(k2)).toBe(true);
    expect((await second).ok).toBe(false);
    const withdrawn = seatBriefs(s.getState()).find((x) => x.key === k2)!;
    expect(withdrawn.withdrawn).toBe(true);
    expect(getRep(s.getState().nodes.get(k2)!, 'erased')).toBeTruthy();
    expect(pendingBriefs(s.getState())).toEqual([]);
    expect(seat.cancel(k2)).toBe(false);
  });

  it('Esc reaches it: a signal that stops the call withdraws the brief', async () => {
    const { s, a, seat, changes } = board();
    const ctl = new AbortController();
    const asking = seat.interpret([a], 2000, ctl.signal);
    expect(changes[0].signalled).toBe(true);
    ctl.abort();
    expect(await asking).toMatchObject({ ok: false, error: 'stopped' });
    expect(pendingBriefs(s.getState())).toEqual([]);
    expect(last(changes)!.kind).toBe('stopped');
  });

  it('a brief nobody answers says so after a while, and is withdrawn', async () => {
    const { s, a, seat, changes } = board({ timeoutMs: 20 });
    const r = await seat.interpret([a], 2000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no hand in the room answered in 0 s — the brief was withdrawn/);
    expect(pendingBriefs(s.getState())).toEqual([]);
    expect(last(changes)!.kind).toBe('timeout');
  });

  it('a brief undone by the hand, or its board left, settles its caller with the reason', async () => {
    const { s, a, seat } = board();
    const asking = seat.interpret([a], 2000);
    s.undo();
    const r = await asking;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no longer on the board/);
  });

  it('where it cannot park, nothing enters the log and the caller is told why', async () => {
    const { s, a, seat } = board({ canPark: () => 'the seat needs a room' });
    const n = s.getEvents().length;
    expect(await seat.interpret([a], 2000)).toMatchObject({ ok: false, error: 'the seat needs a room' });
    expect(s.getEvents().length).toBe(n);
  });

  it('several briefs wait at once, each settled by its own reply', async () => {
    const { s, a, b, seat } = board();
    const one = seat.interpret([a], 2000);
    const two = seat.interpret([b], 2100);
    const [k1, k2] = seat.waiting().map((w) => w.key);
    answerAs(s, k2, '[{"label":"card","confidence":0.7,"reasoning":"a box"}]');
    expect((await two).readings[0].label).toBe('card');
    expect(seat.waiting().map((w) => w.key)).toEqual([k1]);
    answerAs(s, k1, '[{"label":"tile","confidence":0.6,"reasoning":"a box"}]');
    expect((await one).readings[0].label).toBe('tile');
  });
});

describe('the seat\'s traffic on the explanation plane', () => {
  it('is a brief or a reply to one — never a sentence a person asked — even once the brief was undone', async () => {
    const { s, a, b, seat } = board();
    const asking = seat.interpret([a, b], 2000);
    const [brief] = pendingBriefs(s.getState());
    const reply = answerAs(s, brief.key, READINGS)!;
    await asking;
    const nodes = s.getState().nodes;
    expect(isSeatTraffic(nodes.get(brief.key)!, nodes)).toBe(true);
    expect(isSeatTraffic(nodes.get(reply)!, nodes)).toBe(true);
    const hand = s.join('human', 'fern~f1', 3000);
    const why = s.answer({ participantId: hand, question: 'why', text: 'because', aboutIds: [a], at: 3000 })!;
    expect(isSeatTraffic(s.getState().nodes.get(why)!, s.getState().nodes)).toBe(false);
    // A reply whose brief has left the log is still the seat's.
    const orphan = s.answer({ participantId: hand, question: 'explanation:john~j1:99', text: '[]', aboutIds: [a], at: 3100 })!;
    expect(isSeatTraffic(s.getState().nodes.get(orphan)!, s.getState().nodes)).toBe(true);
  });
});

describe('the seat across a room: another sitting answers, by the brief\'s own id', () => {
  /** A hand in the room, the way a page and the MCP hand are one: its log named, lines merged as they land, its own sent as it changes. */
  function hand(hub: LocalHub, name: string, opts: { seat?: boolean } = {}) {
    const store = new LiveStore(hub.connect(), name, 'claude', { seat: opts.seat });
    const session = createSession({ ...DEFAULT_SESSION_CONFIG, logName: name });
    const merger = new LiveMerge(session, name);
    let merging = false;
    store.subscribe(() => {
      merging = true;
      try { merger.sync(store.heldLogs()); } finally { merging = false; }
    });
    session.subscribe(() => { if (!merging) void store.publish(store.ownLog(session.getEvents())); });
    store.hello();
    return { store, session };
  }

  it('the page parks, the hand lists it under the same id and answers about the same marks, and the page takes it', async () => {
    const hub = new LocalHub();
    const page = hand(hub, 'john~j1');
    const claude = hand(hub, 'claude~c1', { seat: true });
    await tick();
    const a = page.session.addStroke(handRect(100, 100, 150, 110, { seed: 1 }), 1000);
    const b = page.session.addStroke(handRect(300, 100, 150, 110, { seed: 2 }), 1100);
    const seat = createSeatParticipant(page.session, 1200, { baseUrl: 'http://127.0.0.1:8020' });
    const asking = seat.interpret([a, b], 2000);
    const key = seat.waiting()[0].key;
    for (let i = 0; i < 10 && !pendingBriefs(claude.session.getState()).length; i++) await tick();
    // The other sitting derives the same id for the brief and reads the marks off its edges.
    const [there] = pendingBriefs(claude.session.getState());
    expect(there.key).toBe(key);
    expect(there.about).toEqual([a, b]);
    expect(there.who).toBe('john');
    expect(page.store.presence().find((p) => p.participant === 'claude~c1')?.seat).toBe(true);
    const text = seatReplyText({ reply: JSON.parse(READINGS) });
    claude.session.answer({ participantId: LOCAL_PARTICIPANT, question: there.key, text: 'text' in text ? text.text : '', aboutIds: there.about, at: 3000 });
    const r = await asking;
    expect(r.ok).toBe(true);
    const st = page.session.getState();
    expect(interpretationsOf(st.nodes.get(a)!, st.nodes).some((x) => x.sourceName === SEAT_NAME && x.label === 'pair-of-cards')).toBe(true);

    // A reload is a new sitting: the room's logs replayed into a fresh board pair the brief with its reply by id, and the readings stand.
    const logs = await page.store.readLogs();
    logs['john~j1'] = page.store.ownLog(page.session.getEvents());
    const fresh = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'john~j2' });
    fresh.load(mergeLogs(logs, { me: 'john~j2' }));
    const back = seatBriefs(fresh.getState()).find((x) => x.key === key)!;
    expect(back.reply).not.toBeNull();
    expect(explanationOf(fresh.getState().nodes.get(back.reply!.id)!)!.question).toBe(key);
    expect(pendingBriefs(fresh.getState())).toEqual([]);
    expect(interpretationsOf(fresh.getState().nodes.get(a)!, fresh.getState().nodes).some((x) => x.sourceName === SEAT_NAME)).toBe(true);
    page.store.close();
    claude.store.close();
  });
});
