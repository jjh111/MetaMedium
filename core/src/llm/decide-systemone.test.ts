// The decision seat's System One transport (the audit's S2, S7): what is sent to a decision model of the System One
// class through dyna.ink's relay — names q1…qn, safe keys with none of these last, a score's levels as a list, the
// state in words, pictures only for a model that sees, no node id, no question id, no credentials — and how its reply
// is read: tolerantly, never guessed at. No model is asked: `fetch` is injected, the replies are hand-written
// (fixtures/systemone-replies.json, whose `_about` says so).

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { circleStroke } from '../test/strokes';
import { choice, score, noul, createDecideParticipant, NO_MATCH, DECIDER_TAKE_AT } from '../participants/decide';
import { buildSystemOne, readSystemOne, createSystemOneDecideTransport, SYSTEMONE_NONE, SYSTEMONE_KEY } from './decide-systemone';
import REPLIES from './fixtures/systemone-replies.json';

const R = REPLIES as unknown as Record<string, { status?: number; body: unknown }>;

const q1 = choice('which:stroke:ada:7', 'which of these is the group of marks?', [{ id: 'molecule', text: 'molecule — this board’s definition, the first of two' }, { id: 'compound', text: 'compound — the second of two' }], ['stroke:ada:7', 'stroke:ada:8']);
const q2 = score('finish:stroke:ada:7', 'how finished is it?', ['rough', 'neat', 'clean']);
const q3 = noul('box:stroke:ada:9', 'it is a box', ['stroke:ada:9']);
const ASKED = [q1, q2, q3];
const REQ = buildSystemOne(ASKED, { text: 'three circles joined by two lines; “water” written beside them' }, { model: 'clef-flash' });

interface Seen { url: string; init: RequestInit & { credentials?: RequestCredentials } }
/** A fetch that answers with a fixture (or a status and body) and keeps what it was sent. */
function answers(name: string | { status: number; body: unknown }) {
  const seen: Seen[] = [];
  const fx = typeof name === 'string' ? R[name] : name;
  const fetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return new Response(JSON.stringify(fx.body), { status: fx.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, seen };
}

const read = (name: string) => {
  const r = readSystemOne(R[name].body, REQ, ASKED);
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('what is sent', () => {
  it('names the questions q1…qn and keeps the seat’s own ids (with a node id in them) in code', () => {
    const body = JSON.parse(JSON.stringify(REQ.body));
    expect(Object.keys(body.questions)).toEqual(['q1', 'q2', 'q3']);
    expect(REQ.names.get('q1')).toBe('which:stroke:ada:7');
    const wire = JSON.stringify(body);
    expect(wire).not.toMatch(/stroke:/);
    expect(wire).not.toMatch(/which:|finish:|box:/);
  });

  it('a choice: safe keys, the candidate’s words as the description, none of these always last', () => {
    const c = (REQ.body.questions.q1.criteria as Record<string, string>);
    expect(Object.keys(c)).toEqual(['molecule', 'compound', SYSTEMONE_NONE]);
    expect(c.molecule).toMatch(/first of two/);
    expect(c[SYSTEMONE_NONE]).toMatch(/none of these/);
    expect(REQ.body.questions.q1).toMatchObject({ type: 'choice', instructions: 'which of these is the group of marks?' });
  });

  it('a key is the id in lower snake case when it makes one, else option_<n> — unique, never integer-like, never none_of_these', () => {
    const q = choice('x', 'which?', [{ id: 'uml-class', text: 'a' }, { id: 'Molécule!', text: 'b' }, { id: 'molecule', text: 'c' }, { id: '42', text: 'd' }, { id: SYSTEMONE_NONE, text: 'e' }, { id: 'ER diagram', text: 'f' }]);
    const keys = Object.keys(buildSystemOne([q]).body.questions.q1.criteria as Record<string, string>);
    expect(keys).toEqual(['uml_class', 'molecule', 'molecule_2', 'option_4', 'option_5', 'er_diagram', SYSTEMONE_NONE]);
    expect(keys.every((k) => SYSTEMONE_KEY.test(k))).toBe(true);
    // JSON keeps the order sent: no key is integer-like, so nothing is hoisted ahead of the rest.
    expect(Object.keys(JSON.parse(JSON.stringify(buildSystemOne([q]).body)).questions.q1.criteria)).toEqual(keys);
  });

  it('a score: its levels as a LIST, lowest first — a level is never a key, so an integer-like level cannot reorder the scale', () => {
    expect(REQ.body.questions.q2).toEqual({ type: 'score', instructions: 'how finished is it?', criteria: ['rough', 'neat', 'clean'] });
    const odd = buildSystemOne([score('s', 'how many?', ['low', '3', '1', 'high'])]);
    expect(JSON.parse(JSON.stringify(odd.body)).questions.q1.criteria).toEqual(['low', '3', '1', 'high']);
  });

  it('a noul: its statement, and no criteria', () => {
    expect(REQ.body.questions.q3).toEqual({ type: 'noul', instructions: 'it is a box' });
  });

  it('the state is the words given; pictures go only to a model that sees, at most four, in a list of their own', () => {
    expect(REQ.body.state).toMatch(/water/);
    expect(REQ.body).not.toHaveProperty('images');
    const pics = Array.from({ length: 6 }, (_, i) => ({ mime: 'image/png', dataUrl: `data:image/png;base64,AAA${i}` }));
    expect(buildSystemOne([q1], { text: 't', images: pics }, { model: 'clef-flash' }).body).not.toHaveProperty('images');
    expect(buildSystemOne([q1], { text: 't', images: pics }, { model: 'clef-omni', sees: true }).body.images).toHaveLength(4);
    expect(buildSystemOne([q1]).body.state).toBe('');
  });

  it('POSTs the body, with no credentials and no key of anyone’s', async () => {
    const { fetch, seen } = answers('spelling-a');
    const t = createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch });
    const r = await t(ASKED, { state: { text: 'held: three circles' } });
    expect(r.ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('https://relay.dyna.ink/decide');
    expect(seen[0].init.method).toBe('POST');
    expect(seen[0].init.credentials).toBe('omit');
    const headers = seen[0].init.headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).toEqual(['content-type']);
    const body = JSON.parse(String(seen[0].init.body));
    expect(body.model).toBe('clef-flash');
    expect(body.state).toBe('held: three circles');
  });
});

describe('what is read', () => {
  it('spelling A: a map, the vendor’s pick and confidence; a score with its legend; a noul’s value', () => {
    const r = read('spelling-a');
    expect(r.answers).toHaveLength(3);
    const [a, s, n] = r.answers;
    expect(a).toMatchObject({ kind: 'choice', questionId: 'which:stroke:ada:7', pick: 'molecule', confidence: 0.97 });
    if (a.kind !== 'choice') throw new Error('choice');
    expect(a.distribution.map((d) => d.of)).toEqual(['molecule', 'compound', NO_MATCH]);
    expect(s).toMatchObject({ kind: 'score', levels: ['rough', 'neat', 'clean'] });
    if (s.kind !== 'score') throw new Error('score');
    expect(s.expectation).toBeCloseTo(1.6, 9);
    expect(n).toEqual({ kind: 'noul', questionId: 'box:stroke:ada:9', yes: 0.93 });
    expect(r.notes).toEqual([]);
  });

  it('spelling B: a list of { option, p } (none_of_these is no-match), a score by places, a noul as a bare number', () => {
    const r = read('spelling-b');
    const [a, s, n] = r.answers;
    expect(a).toMatchObject({ kind: 'choice', pick: NO_MATCH });
    if (s.kind !== 'score') throw new Error('score');
    expect(s.distribution.map((d) => d.of)).toEqual(['rough', 'neat', 'clean']);
    expect(s.distribution.map((d) => d.p)).toEqual([0.6, 0.3, 0.1].map((p) => expect.closeTo(p, 9)));
    expect(n).toMatchObject({ kind: 'noul', yes: 0.4 });
  });

  it('spelling C: a score’s list of numbers with a legend that agrees; a noul’s p_yes beside a distribution that agrees', () => {
    const r = read('spelling-c');
    expect(r.answers.map((a) => a.kind)).toEqual(['score', 'noul']);
    expect(r.answers[1]).toMatchObject({ yes: 0.25 });
  });

  it('two spellings that disagree leave the question unanswered — said, never read one way', () => {
    const r = read('disagree');
    expect(r.answers).toEqual([]);
    expect(r.notes.join(' | ')).toMatch(/q1: two spellings of its distribution disagree/);
    expect(r.notes.join(' | ')).toMatch(/q3: two spellings of its probability of yes disagree/);
  });

  it('an option nobody offered — a vendor’s own none — leaves it unanswered', () => {
    const r = read('vendor-none');
    expect(r.answers).toEqual([]);
    expect(r.notes[0]).toMatch(/an option nobody offered \(none\)/);
  });

  it('a pick alone, and a score as a number alone, are unanswered: a distribution made out of a pick is a guess', () => {
    const r = read('pick-only');
    expect(r.answers).toEqual([]);
    expect(r.notes).toHaveLength(2);
    expect(r.notes.every((n) => /only a pick/.test(n))).toBe(true);
  });

  it('the pick is read off the distribution; the vendor’s disagreeing pick is said, never used', () => {
    const r = read('pick-disagrees');
    expect(r.answers[0]).toMatchObject({ pick: 'molecule' });
    expect(r.notes[0]).toMatch(/said “compound”/);
  });

  it('a sum off 1 is normalised and said', () => {
    const r = read('off-sum');
    const a = r.answers[0];
    if (a.kind !== 'choice') throw new Error('choice');
    expect(a.distribution.reduce((n, d) => n + d.p, 0)).toBeCloseTo(1, 9);
    expect(r.notes[0]).toMatch(/summed to 2\.000 — normalised/);
  });

  it('a part of a distribution — the pick’s probability alone, or the top few — is no answer: never stretched to a certainty', () => {
    const one = (answer: unknown) => readSystemOne({ ok: true, answers: { q1: answer } }, REQ, ASKED);
    for (const answer of [
      { choice: 'molecule', probabilities: { molecule: 0.6 } },
      { probabilities: { molecule: 0.55, compound: 0 } },
      { distribution: [{ option: 'molecule', p: 0.7 }, { option: 'compound', p: 0.2 }] },
    ]) {
      const r = one(answer);
      if (!r.ok) throw new Error(r.error);
      expect(r.answers, JSON.stringify(answer)).toEqual([]);
      expect(r.notes.join(' '), JSON.stringify(answer)).toMatch(/q1: its probabilities account for only 0\.\d{3} of the whole — a part of a distribution is no answer/);
    }
    // A whole a little under 1, rounded, is the whole: read as it is.
    const r = one({ probabilities: { molecule: 0.6, compound: 0.3, none_of_these: 0.09 } });
    if (!r.ok) throw new Error(r.error);
    expect(r.answers).toHaveLength(1);
  });

  it('with the seat’s floor, a reply of 0.6 for one option alone holds nothing — it is never a 1.00 past DECIDER_TAKE_AT', async () => {
    const s = createSession();
    const mark = s.addStroke(circleStroke(100, 100, 30), 1000);
    const { fetch } = answers({ status: 200, body: { ok: true, answers: { q1: { choice: 'molecule', probabilities: { molecule: 0.6 } } } } });
    const seat = createDecideParticipant(s, createSystemOneDecideTransport({ endpoint: 'x', model: 'clef-flash', fetch }), 1100, { takeAt: DECIDER_TAKE_AT });
    const run = await seat.ask([choice('w', 'which?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }], [mark])], 1200);
    expect(run.rows).toEqual([]);
    expect(run.unanswered).toEqual(['w']);
    expect(run.notes?.[0]).toMatch(/a part of a distribution is no answer/);
  });

  it('an answer to a question nobody asked is left out and said; the rest is read', () => {
    const r = read('not-asked');
    expect(r.answers).toEqual([{ kind: 'noul', questionId: 'box:stroke:ada:9', yes: 0.8 }]);
    expect(r.notes[0]).toMatch(/q9: not a question that was asked/);
  });

  it('a score whose level words are numbers, keyed so its keys could be words or places, is unanswered — not guessed', () => {
    const q = score('n', 'how many?', ['1', '2', '3']);
    const req = buildSystemOne([q]);
    const r = readSystemOne({ answers: { q1: { probabilities: { 1: 0.3, 2: 0.7 } } } }, req, [q]);
    if (!r.ok) throw new Error(r.error);
    expect(r.answers).toEqual([]);
    expect(r.notes[0]).toMatch(/places in the list of levels/);
    // Keyed by its words alone, where none could be a place, it reads.
    const words = readSystemOne({ answers: { q1: { probabilities: { 3: 0.2, 1: 0.8 } } } }, req, [q]);
    // "3" is a word AND not a place (there are three levels, places 0–2): read as words.
    if (!words.ok) throw new Error(words.error);
    expect(words.answers[0]).toMatchObject({ kind: 'score' });
  });

  it('a legend that says the levels otherwise than they were sent leaves the score unanswered', () => {
    const r = readSystemOne({ answers: { q2: { probabilities: [0.2, 0.3, 0.5], legend: ['clean', 'neat', 'rough'] } } }, REQ, ASKED);
    if (!r.ok) throw new Error(r.error);
    expect(r.answers).toEqual([]);
    expect(r.notes[0]).toMatch(/legend/);
  });

  it('a reply with no answers is a failure in words', () => {
    expect(readSystemOne(R['no-answers'].body, REQ, ASKED)).toEqual({ ok: false, error: 'the decision model’s reply has no answers to read' });
  });
});

describe('a failure is the relay’s own sentence', () => {
  for (const [name, re] of [
    ['relay-429-limit', /^HTTP 429 — rate limited: “too many decisions from here/],
    ['relay-429-budget', /^HTTP 429 — rate limited: “today’s decisions on dyna\.ink are spent — the engine’s ranking stands”/],
    ['relay-502', /^HTTP 502 — .*“clef-flash failed — InferenceUpstreamError/],
    ['relay-504', /^HTTP 504 — the provider timed out: “clef-flash did not answer in 10 s”/],
  ] as const) {
    it(name, async () => {
      const { fetch } = answers(name);
      const r = await createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch })([q1], {});
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toMatch(re);
    });
  }

  it('a cancel is the one word', async () => {
    const ctl = new AbortController();
    const fetch = ((_u: string, init: RequestInit) => new Promise((_ok, fail) => init.signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError'))))) as unknown as typeof globalThis.fetch;
    const p = createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch })([q1], { signal: ctl.signal });
    ctl.abort();
    expect(await p).toEqual({ ok: false, error: 'cancelled' });
  });

  it('a host that cannot be reached is said as one, naming the host', async () => {
    const fetch = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof globalThis.fetch;
    const r = await createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch })([q1], {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/could not reach relay\.dyna\.ink/);
  });
});

describe('through the seat', () => {
  it('held at 0.995 with the floor at DECIDER_TAKE_AT; the state reaches the wire and is never written to the log', async () => {
    const s = createSession();
    const mark = s.addStroke(circleStroke(200, 200, 60), 1000);
    const { fetch, seen } = answers({ status: 200, body: { ok: true, answers: { q1: { probabilities: { molecule: 0.995, compound: 0.004, none_of_these: 0.001 } } } } });
    const t = createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch });
    const seat = createDecideParticipant(s, t, 1100, { name: 'Clef-flash', locality: 'hosted', takeAt: DECIDER_TAKE_AT });
    const q = choice('which:' + mark, 'which?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }], [mark]);
    const run = await seat.ask([q], 1200, undefined, { text: 'SECRET-WORDS-OF-THE-BOARD' });
    expect(run.ok).toBe(true);
    expect(run.rows[0].held).toBe(true);
    expect(JSON.parse(String(seen[0].init.body)).state).toBe('SECRET-WORDS-OF-THE-BOARD');
    expect(JSON.stringify(s.getEvents())).not.toMatch(/SECRET-WORDS/);
  });

  it('an unanswered question comes back as unanswered, with its note on the run', async () => {
    const s = createSession();
    const mark = s.addStroke(circleStroke(200, 200, 60), 1000);
    const { fetch } = answers('vendor-none');
    const seat = createDecideParticipant(s, createSystemOneDecideTransport({ endpoint: 'x', model: 'clef-flash', fetch }), 1100, { takeAt: DECIDER_TAKE_AT });
    const run = await seat.ask([choice('w', 'which?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }], [mark])], 1200);
    expect(run.rows).toEqual([]);
    expect(run.unanswered).toEqual(['w']);
    expect(run.notes?.[0]).toMatch(/an option nobody offered/);
  });
});
