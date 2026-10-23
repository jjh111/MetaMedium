// `/decide` and `/extract` on the relay Worker (src/ai.mjs, Demos/decide-protocol.mjs): a decision model asked
// through the Workers AI binding, with no key anywhere a page can see — who may ask, how often, what shape, and
// what comes back. Bodies are built by the committed Node bundle's own wire (core's `buildSystemOne`), so the page's
// request and the relay's checks cannot drift apart without this failing; the answers are read back with core's
// reader. The model is a fake (`fakeAI`): nothing is reached.
//
//   node --test cloudflare/relay/relay.decide.test.mjs

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import worker from './src/worker.mjs';
import { keyForRoom } from './src/auth.mjs';
import { fakeEnv, fakeAI, systemOneAnswers } from './test/fake.mjs';
import { callerKey } from './src/ai.mjs';
import { decideCheck, extractCheck, DECIDE_LIMITS, DECIDE_PER_MINUTE, DECIDE_PER_DAY, DECIDE_WORDS, DECIDE_MODELS } from '../../Demos/decide-protocol.mjs';
import { AI_WORDS } from '../../Demos/ai-protocol.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, '../../Demos/dynaink-core.node.mjs')).href);

const SECRET = 'decide-secret';
const APP = 'https://dyna.ink';
const which = MM.choice('which:stroke:ada:7', 'which of these is the group of marks?', [{ id: 'molecule', text: 'molecule — the first of two' }, { id: 'compound', text: 'compound — the second of two' }], ['stroke:ada:7']);
const finish = MM.score('finish:stroke:ada:7', 'how finished is it?', ['rough', 'neat', 'clean']);
const isBox = MM.noul('box:stroke:ada:9', 'it is a box', ['stroke:ada:9']);
/** A body as the page builds it: core's wire, never a hand-made copy. */
const wire = (questions = [which], state = { text: 'five marks — three circles, two lines; “water” written beside them' }, model = 'clef-flash', sees = false) =>
  MM.buildSystemOne(questions, state, { model, sees });

function envWith(vars = {}, book) {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET, ...vars });
  env.AI = fakeAI(book);
  return env;
}
const post = (env, body, headers = {}, url = 'http://relay/decide') =>
  worker.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: APP, 'cf-connecting-ip': '203.0.113.7', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const said = async (res) => (await res.json()).error;

test('the wire core builds is a body the relay takes — a choice, a score and a noul; pictures for the model that sees', () => {
  assert.equal(decideCheck(wire([which, finish, isBox]).body), null);
  const pics = Array.from({ length: 4 }, () => ({ mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }));
  assert.equal(decideCheck(wire([which], { text: 'a page', images: pics }, 'clef-omni', true).body), null);
  // No node id, no question id, no key reaches the relay.
  const sent = JSON.stringify(wire([which, finish, isBox]).body);
  assert.doesNotMatch(sent, /stroke:|which:|finish:|box:/);
});

test('what core sends is held to what the relay takes: one number for each limit, in both', () => {
  assert.equal(MM.SYSTEMONE_WORDS_MAX, DECIDE_LIMITS.criterion);
  assert.equal(MM.SYSTEMONE_WORDS_MAX, DECIDE_LIMITS.instructions);
  assert.equal(MM.SYSTEMONE_STATE_MAX, DECIDE_LIMITS.state);
  assert.equal(MM.SYSTEMONE_MAX_IMAGES, DECIDE_LIMITS.images);
  assert.ok(MM.DECIDE_STATE_MAX <= DECIDE_LIMITS.state);
});

test('Which is it? on a board with a long typed note beside a definition: the page’s own offer builds a body the relay takes', async () => {
  // The board as a hand leaves it: a molecule named, a paragraph of notes typed beside it, a second named, a third held.
  const line = (a, b, n = 40) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
  const circle = (cx, cy, r, n = 110) => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
  let clock = 1000;
  const s = MM.createSession();
  const draw = (pts) => s.addStroke(pts, (clock += 100), undefined, 1);
  const molecule = (ox) => [...[[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(circle(ox + x, y, 40))), draw(line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)), draw(line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30))];
  const nameIt = (ids, name) => { s.summonMarks(ids, (clock += 100)); return s.bless({ summonId: s.getState().summon.id, name, at: (clock += 100) }); };
  nameIt(molecule(0), 'molecule');
  s.import({ kind: 'text', path: 'note.txt', name: 'note', bounds: { minX: 560, minY: 280, maxX: 900, maxY: 480 }, code: 'Water is two hydrogens bonded to one oxygen. '.repeat(40), at: (clock += 100) });
  nameIt(molecule(1200), 'compound');
  const held = molecule(2400);
  s.summonMarks(held, (clock += 100));
  const offer = MM.offersFor(MM.toolScope(s, { host: { decider: { name: 'Clef-flash' } } })).find((o) => o.tool === 'which');
  assert.ok(offer, 'Which is it? is offered on the tie');
  const req = MM.buildSystemOne([MM.whichQuestion(held, offer.data.candidates)], MM.decisionStateOf(s.getState(), held, { candidates: offer.data.definitions, reading: s.read(held) }), { model: 'clef-flash' });
  assert.equal(decideCheck(req.body), null);
  assert.match(JSON.stringify(req.body), /Water is two hydrogens/);
  const res = await post(envWith(), req.body);
  assert.equal(res.status, 200);
});

test('GET /decide lists the models and the limits, and asks no model', async () => {
  const env = envWith();
  const res = await worker.fetch(new Request('http://relay/decide', { headers: { origin: APP } }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.models.map((m) => m.model), Object.keys(DECIDE_MODELS));
  assert.equal(body.models.find((m) => m.model === 'clef-omni').sees, true);
  assert.equal(body.limits.questions, DECIDE_LIMITS.questions);
  assert.equal(JSON.stringify(body).includes('@cf/'), false, 'the page never sees an @cf id');
  assert.equal(env.AI.calls.length, 0);
});

test('a decision from the app goes to Workers AI by binding, its @cf id in code, and its answers come back untouched — read by core', async () => {
  const env = envWith();
  const req = wire([which, finish, isBox]);
  const res = await post(env, req.body);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), APP);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.model, 'clef-flash');
  assert.ok(body.ms >= 0);
  assert.equal(env.AI.calls.length, 1);
  assert.equal(env.AI.calls[0].model, '@cf/cloudflare/clef-flash');
  assert.deepEqual(env.AI.calls[0].input, { state: req.body.state, questions: req.body.questions });
  assert.deepEqual(body.answers, systemOneAnswers(env.AI.calls[0].input).answers);
  const read = MM.readSystemOne(body, req, [which, finish, isBox]);
  assert.equal(read.ok, true);
  assert.equal(read.answers.length, 3);
  assert.equal(read.answers[0].pick, 'compound');
});

test('pictures go to the model that sees, in their own list — and are refused to one that does not', async () => {
  const env = envWith();
  const pics = [{ mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }];
  const omni = await post(env, wire([which], { text: 'a page', images: pics }, 'clef-omni', true).body);
  assert.equal(omni.status, 200);
  assert.deepEqual(env.AI.calls[0].input.images, [pics[0].dataUrl]);
  const flash = await post(env, { ...wire([which]).body, images: [pics[0].dataUrl] });
  assert.equal(flash.status, 400);
  assert.match(await said(flash), /clef-flash reads no pictures — ask clef-omni/);
  const five = await post(env, { ...wire([which], { text: 'p' }, 'clef-omni').body, images: Array(5).fill(pics[0].dataUrl) });
  assert.match(await said(five), /at most 4 pictures/);
  const gif = await post(env, { ...wire([which], { text: 'p' }, 'clef-omni').body, images: ['data:image/gif;base64,R0lGOD=='] });
  assert.match(await said(gif), /PNG, JPEG or WebP/);
});

test('a shape the relay does not ask with is refused in words, before any model is asked', async () => {
  const env = envWith();
  const base = wire().body;
  const cases = [
    [{ ...base, model: 'gpt-4o' }, /no decision model “gpt-4o” here/],
    [{ ...base, model: '@cf/cloudflare/clef-flash' }, /no decision model/],
    [{ ...base, questions: {} }, /1–16 questions/],
    [{ ...base, questions: { 'which:stroke:7': base.questions.q1 } }, /a question’s name is lower case/],
    [{ ...base, questions: { q1: { ...base.questions.q1, criteria: { only: 'one' } } } }, /2–64 options/],
    [{ ...base, questions: { q1: { ...base.questions.q1, criteria: Object.fromEntries(Array.from({ length: 65 }, (_, i) => ['o' + i, 'x'])) } } }, /2–64 options/],
    [{ ...base, questions: { q1: { type: 'score', instructions: 'how?', criteria: Array.from({ length: 11 }, (_, i) => 'l' + i) } } }, /2–10 levels/],
    [{ ...base, questions: { q1: { type: 'score', instructions: 'how?', criteria: { a: 'x', b: 'y' } } } }, /a score’s levels are a list/],
    [{ ...base, questions: { q1: { type: 'noul', instructions: 'is it?', criteria: { yes: 'y', no: 'n' } } } }, /a noul is its statement alone/],
    [{ ...base, questions: { q1: { ...base.questions.q1, instructions: 'x'.repeat(1001) } } }, /at most 1,000 characters/],
    [{ ...base, questions: { q1: { ...base.questions.q1, type: 'guess' } } }, /a choice, a score or a noul/],
    [{ ...base, state: 'x'.repeat(16001) }, /state is at most 16,000 characters/],
    [{ ...base, apiKey: 'sk-something' }, /does not ask with \(apiKey\)/],
    [{ ...base, questions: { q1: { ...base.questions.q1, model: 'x' } } }, /does not ask with \(model\)/],
  ];
  for (const [body, re] of cases) {
    const res = await post(envWith(), body, { 'cf-connecting-ip': '198.51.100.' + Math.floor(Math.random() * 250) });
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 120));
    assert.match(await said(res), re);
  }
  const notJson = await post(env, '{ not json');
  assert.equal(notJson.status, 400);
  assert.equal(await said(notJson), DECIDE_WORDS.notJson);
  assert.equal(env.AI.calls.length, 0);
});

test('413: a body declared past 6 MiB, and words past 64 KiB — with no picture, and with one tiny picture beside them', async () => {
  const env = envWith();
  const declared = await worker.fetch(new Request('http://relay/decide', { method: 'POST', headers: { origin: APP, 'content-length': String(7 * 1024 * 1024) }, body: '{}' }), env);
  assert.equal(declared.status, 413);
  const big = await post(env, { ...wire().body, state: 'x'.repeat(70 * 1024) });
  assert.equal(big.status, 413);
  assert.match(await said(big), /at most 64 KB/);
  // Sixteen questions of sixty-four long options each, every field within its own cap: a megabyte of words. A picture
  // of one pixel beside them does not let them through — the 6 MiB is the pictures' alone.
  const criteria = Object.fromEntries(Array.from({ length: DECIDE_LIMITS.options }, (_, i) => ['o' + i, 'x'.repeat(DECIDE_LIMITS.criterion)]));
  const questions = Object.fromEntries(Array.from({ length: DECIDE_LIMITS.questions }, (_, i) => ['q' + (i + 1), { type: 'choice', instructions: 'y'.repeat(DECIDE_LIMITS.instructions), criteria }]));
  const wordy = { model: 'clef-omni', state: 'z'.repeat(DECIDE_LIMITS.state), questions };
  assert.equal(decideCheck(wordy), null, 'each field is within its own cap');
  const tiny = await post(env, { ...wordy, images: ['data:image/png;base64,iVBORw0KGgo='] }, { 'cf-connecting-ip': '203.0.113.30' });
  assert.equal(tiny.status, 413);
  assert.match(await said(tiny), /at most 64 KB/);
  // Pictures up to 6 MiB still go, with words under 64 KiB.
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024);
  const ok = await post(env, { ...wire([which], { text: 'a page' }, 'clef-omni', false).body, images: [photo] }, { 'cf-connecting-ip': '203.0.113.31' });
  assert.equal(ok.status, 200);
  assert.equal(env.AI.calls.length, 1);
});

test('who may ask: another origin no; no Origin and no key no; a room’s key yes, with or without an Origin', async () => {
  const env = envWith();
  const body = wire().body;
  const foreign = await post(env, body, { origin: 'https://evil.example' });
  assert.equal(foreign.status, 403);
  const bare = await worker.fetch(new Request('http://relay/decide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
  assert.equal(bare.status, 403);
  assert.equal(await said(bare), DECIDE_WORDS.noOrigin);
  const key = await keyForRoom(SECRET, 'claude');
  const keyed = await worker.fetch(new Request('http://relay/decide', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key, 'x-dyna-room': 'claude' }, body: JSON.stringify(body) }), env);
  assert.equal(keyed.status, 200);
  const wrong = await worker.fetch(new Request('http://relay/decide', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer nope', 'x-dyna-room': 'claude' }, body: JSON.stringify(body) }), env);
  assert.equal(wrong.status, 403);
  assert.match(await said(wrong), /not the key for room “claude”/);
  const roomless = await post(env, body, { authorization: 'Bearer ' + key });
  assert.equal(roomless.status, 401);
  // The preflight lets the room's header through.
  const pre = await worker.fetch(new Request('http://relay/decide', { method: 'OPTIONS', headers: { origin: APP } }), env);
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-headers'), /x-dyna-room/);
  assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
});

test('MM_DECIDE: off says so; keyed admits only a room’s key; a word it does not know asks nothing', async () => {
  const off = await post(envWith({ MM_DECIDE: 'off' }), wire().body);
  assert.equal(off.status, 503);
  assert.equal(await said(off), DECIDE_WORDS.off);
  const keyedEnv = envWith({ MM_DECIDE: 'keyed' });
  const anon = await post(keyedEnv, wire().body);
  assert.equal(anon.status, 401);
  const key = await keyForRoom(SECRET, 'r');
  const ok = await post(keyedEnv, wire().body, { authorization: 'Bearer ' + key, 'x-dyna-room': 'r' });
  assert.equal(ok.status, 200);
  const odd = await post(envWith({ MM_DECIDE: 'sometimes' }), wire().body);
  assert.equal(odd.status, 503);
  assert.equal(keyedEnv.AI.calls.length, 1);
});

test(`429: past ${DECIDE_PER_MINUTE.caller} a minute from one address, past ${DECIDE_PER_MINUTE.room} a minute for one room — and past the day’s budget, the engine’s ranking stands`, async () => {
  const env = envWith();
  for (let i = 0; i < DECIDE_PER_MINUTE.caller; i++) assert.equal((await post(env, wire().body)).status, 200, `call ${i + 1}`);
  const over = await post(env, wire().body);
  assert.equal(over.status, 429);
  assert.equal(await said(over), DECIDE_WORDS.rate);
  assert.ok(Number(over.headers.get('retry-after')) >= 1);
  // Another address is counted apart.
  assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '203.0.113.8' })).status, 200);
  // An IPv6 address is counted by its /64: one machine holds a whole /64, and is one caller, not 2^64.
  for (let i = 0; i < DECIDE_PER_MINUTE.caller; i++) assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '2001:db8:1:2::' + (i + 1).toString(16) })).status, 200);
  assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '2001:db8:1:2:ffff::9' })).status, 429);
  assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '2001:db8:1:3::1' })).status, 200, 'the next /64 is another caller');
  // A room is counted per room, more generously.
  const key = await keyForRoom(SECRET, 'busy');
  for (let i = 0; i < DECIDE_PER_MINUTE.room; i++) assert.equal((await post(env, wire().body, { authorization: 'Bearer ' + key, 'x-dyna-room': 'busy' })).status, 200);
  assert.equal((await post(env, wire().body, { authorization: 'Bearer ' + key, 'x-dyna-room': 'busy' })).status, 429);
  // The day's budget, across everyone.
  const tight = envWith({ MM_AI_DAILY: '2' });
  assert.equal((await post(tight, wire().body)).status, 200);
  assert.equal((await post(tight, wire().body, { 'cf-connecting-ip': '203.0.113.9' })).status, 200);
  const spent = await post(tight, wire().body, { 'cf-connecting-ip': '203.0.113.10' });
  assert.equal(spent.status, 429);
  assert.equal(await said(spent), DECIDE_WORDS.spent);
  // And core says it in its own sentence.
  const fetch = async () => new Response(JSON.stringify({ ok: false, error: DECIDE_WORDS.spent }), { status: 429 });
  const r = await MM.createSystemOneDecideTransport({ endpoint: 'https://relay.dyna.ink/decide', model: 'clef-flash', fetch })([which], {});
  assert.equal(r.ok, false);
  assert.match(r.error, /^HTTP 429 — rate limited: “today’s decisions on dyna\.ink are spent — the engine’s ranking stands”/);
});

test('callerKey: an IPv4 address as it is, an IPv6 address by its /64, IPv4 written as IPv6 as IPv4', () => {
  assert.equal(callerKey('203.0.113.7'), '203.0.113.7');
  assert.equal(callerKey('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(callerKey('2001:0DB8:0000:0000:ffff:1:2:3'), '2001:db8:0:0::/64');
  assert.equal(callerKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(callerKey('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(callerKey('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.equal(callerKey(undefined), 'local');
  assert.equal(callerKey('2001:db8::1::2'), '2001:db8::1::2', 'what is not an address is counted as it came');
});

test(`a caller’s share of the day: past ${DECIDE_PER_DAY.caller} from one address the answer is 429 — and the budget stands for everyone else`, async () => {
  const env = envWith({ MM_AI_DAILY: String(DECIDE_PER_DAY.caller * 3) });
  let now = Date.UTC(2026, 9, 23, 0, 0, 30);
  mock.method(Date, 'now', () => now);
  mock.method(console, 'log', () => {}); // a line a call: a thousand of them say nothing here
  try {
    for (let i = 0; i < DECIDE_PER_DAY.caller; i++) {
      if (i && i % DECIDE_PER_MINUTE.caller === 0) now += 61_000;
      assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '2001:db8:9::1' })).status, 200, `call ${i + 1}`);
    }
    now += 61_000;
    const over = await post(env, wire().body, { 'cf-connecting-ip': '2001:db8:9::77' });
    assert.equal(over.status, 429);
    assert.equal(await said(over), DECIDE_WORDS.share);
    assert.equal((await post(env, wire().body, { 'cf-connecting-ip': '198.51.100.9' })).status, 200, 'another caller is still answered');
    assert.equal(env.AI.calls.length, DECIDE_PER_DAY.caller + 1);
  } finally { mock.restoreAll(); }
});

test('a room’s key is no way past an address’s share of the decisions: counted by the address whatever key it holds', async () => {
  const env = envWith({ MM_AI_DAILY: String(DECIDE_PER_DAY.caller * 3) });
  let now = Date.UTC(2026, 9, 23, 0, 0, 30);
  mock.method(Date, 'now', () => now);
  mock.method(console, 'log', () => {});
  try {
    const key = await keyForRoom(SECRET, 'claude');
    for (let i = 0; i < DECIDE_PER_DAY.caller; i++) {
      if (i && i % DECIDE_PER_MINUTE.room === 0) now += 61_000;
      assert.equal((await post(env, wire().body, { authorization: 'Bearer ' + key, 'x-dyna-room': 'claude', 'cf-connecting-ip': '2001:db8:7::1' })).status, 200, `call ${i + 1}`);
    }
    now += 61_000;
    const over = await post(env, wire().body, { authorization: 'Bearer ' + key, 'x-dyna-room': 'claude', 'cf-connecting-ip': '2001:db8:7::2' });
    assert.equal(over.status, 429);
    assert.equal(await said(over), DECIDE_WORDS.share);
  } finally { mock.restoreAll(); }
});

test('with no LIMITS binding the route fails closed, and with no AI binding it says so — no model asked', async () => {
  const env = envWith();
  delete env.LIMITS;
  const closed = await post(env, wire().body);
  assert.equal(closed.status, 503);
  assert.equal(await said(closed), DECIDE_WORDS.uncounted);
  assert.equal(env.AI.calls.length, 0);
  const none = envWith();
  delete none.AI;
  const res = await post(none, wire().body);
  assert.equal(res.status, 501);
  assert.equal(await said(res), DECIDE_WORDS.noBinding);
});

test('a model that throws is a 502 with its first 160 characters; one that answers with no answers is a 502 too', async () => {
  const env = envWith({}, () => { throw new Error('InferenceUpstreamError: ' + 'x'.repeat(400)); });
  const res = await post(env, wire().body);
  assert.equal(res.status, 502);
  const words = await said(res);
  assert.match(words, /^clef-flash failed — InferenceUpstreamError: x+$/);
  assert.ok(words.length <= 'clef-flash failed — '.length + 160);
  const empty = await post(envWith({}, () => ({ result: 'molecule' })), wire().body);
  assert.equal(empty.status, 502);
  assert.equal(await said(empty), DECIDE_WORDS.empty('clef-flash'));
});

test('a model that does not answer in 10 s is a 504, in words', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const env = envWith({}, () => new Promise(() => {}));
    const pending = post(env, wire().body);
    for (let i = 0; i < 200 && !env.AI.calls.length; i++) await new Promise((r) => setImmediate(r));
    assert.equal(env.AI.calls.length, 1);
    mock.timers.tick(10_000);
    const res = await pending;
    assert.equal(res.status, 504);
    assert.equal(await said(res), 'clef-flash did not answer in 10 s');
  } finally { mock.timers.reset(); }
});

test('what is logged is the route, the model, the status, the time and the size — never the state or a criterion', async () => {
  const lines = [];
  const was = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    await post(envWith(), wire([which], { text: 'SECRET BOARD WORDS' }).body);
  } finally { console.log = was; }
  assert.equal(lines.length, 1);
  const line = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(line), ['route', 'model', 'status', 'ms', 'bytes']);
  assert.doesNotMatch(lines[0], /SECRET|molecule|compound|first of two/);
});

test('/extract: Clairic, text and list fields only, the same doors and limits', async () => {
  const env = envWith();
  const list = await worker.fetch(new Request('http://relay/extract', { headers: { origin: APP } }), env);
  assert.deepEqual((await list.json()).models.map((m) => m.model), ['clairic']);
  const body = { model: 'clairic', state: 'Waist 28 in, hip 38 in — add ½ in seam allowance', fields: { measurement_names: { type: 'list', instructions: 'the names of the measurements', items: { type: 'text' } }, unit: { type: 'text' } } };
  assert.equal(extractCheck(body), null);
  const res = await post(env, body, {}, 'http://relay/extract');
  assert.equal(res.status, 200);
  assert.equal(env.AI.calls[0].model, '@cf/cloudflare/clairic');
  assert.deepEqual(env.AI.calls[0].input, { state: body.state, fields: body.fields });
  const number = await post(env, { ...body, fields: { waist: { type: 'number' } } }, {}, 'http://relay/extract');
  assert.equal(number.status, 400);
  assert.match(await said(number), /text or a list — a number, a date or an estimate is the engine’s to compute/);
  const asDecide = await post(env, { ...body, model: 'clef-flash' }, {}, 'http://relay/extract');
  assert.match(await said(asDecide), /no extraction model “clef-flash”/);
});

test('the rooms are where they were, and what /ai/… does not hold answers 501 in words', async () => {
  const env = envWith();
  assert.equal((await worker.fetch(new Request('http://relay/'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('http://relay/rooms/claude/events', { headers: { origin: APP } }), env)).status, 401);
  // Under /ai/, what is not dyna.ink's own writer and reader (relay.chat.test.mjs) is not here, said in OpenAI's error shape.
  const ai = await worker.fetch(new Request('http://relay/ai/chat', { method: 'POST', headers: { origin: APP }, body: '{}' }), env);
  assert.equal(ai.status, 501);
  assert.equal((await ai.json()).error.message, AI_WORDS.elsewhere);
});
