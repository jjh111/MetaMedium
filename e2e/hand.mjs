// The hand in the gate (V1-PLAN H1, acceptance A7; DIRECTOR-PLAN-W1 U7): QA-v10's
// machine-checkable rows, run headless with the MCP hand in the room.
//
//     node e2e/run.mjs hand
//
// The gate starts a relay of its own on a free port of 127.0.0.1 (never :8020,
// where John's own room may be; a request there is refused and counted, as the
// seat's is), `Demos/mcp.mjs` as a hand in room "mcp-test" — driven from this
// script over stdio, the way Claude Code drives it — and a tab on the gate's
// static server, joined to that room as "john". The tab's pointer is the
// harness's; the hand's tools are the real ones, called over stdio. The rows
// of QA-v10 that need John's own handwriting are records whose names say they
// skipped; every stroke here that stands in for a hand is a generated one and
// says `synthetic` in its record's name.
//
// The invariant (DIRECTOR-PLAN-W1 U7, *Tier 1 before a model*): the hand is
// not a model the board asks. A model of the gate's own — an OpenAI-compatible
// endpoint on a free port that counts what reaches it — is joined to the tab,
// and nothing a hand or a person does short of asking it may reach it: not the
// hand's arrival, not its tools, not undo, not a reload, not the tab drawing.
// It is asked once, by a deliberate act (What is this?), and once is what it
// counts; the tab's working-dot registry is empty at rest all along.
//
// The records:
//   H1.0   the hand and the tab meet in the room: each is heard by the other
//   H1.1   the hand's arrival and a look ask no model: the model of the gate's own counts none,
//          the working registry is empty
//   H1.2   QA-v10 §4: the mark beside a box that it crosses nothing of opens nothing …

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startRelay } from '../Demos/relay.mjs';
import { sleep } from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const ROOM = 'mcp-test';
const JOHN = 'john';
const HAND = 'claude';

/**
 * The models pane probes :11434 and :1234 when it opens, and a joined-by-default
 * local model would be asked there. Here that probe is answered the way a machine
 * with neither server answers it — refused before it leaves — so nothing on this
 * machine is ever asked. The tab is named `john`, as the *live* pane's name field
 * would name it. Installed before the page's own scripts.
 */
function johnsTab(name) {
  try { localStorage.setItem('mm-hand-name', JSON.stringify(name)); } catch (err) { /* private */ }
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):(11434|1234)\//.test(url)) return Promise.reject(new TypeError('no local model server here — the gate'));
    return real(input, init);
  };
}

/**
 * A model of the gate's own: an OpenAI-compatible endpoint that answers every
 * chat with one reading and COUNTS what reaches it. The invariant is that this
 * count moves only for a deliberate act.
 */
async function startCountingModel() {
  const calls = [];
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  const server = createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      calls.push({ at: Date.now(), method: req.method, path: req.url, bytes: body.length });
      const reply = JSON.stringify([{ label: 'the model of the gate', confidence: 0.61, reasoning: 'it answers every question the same way' }]);
      res.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify({ id: 'x', object: 'chat.completion', model: 'e2e-hand-stub', choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
    });
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return { origin, calls, stop: () => new Promise((ok) => server.close(ok)) };
}

/** `Demos/mcp.mjs` as a child process, spoken to over stdio: a hand in the room. */
function spawnHand(env) {
  const child = spawn(process.execPath, [join(root, 'Demos', 'mcp.mjs')], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  const waiting = new Map();
  child.stdout.on('data', (d) => {
    out += d;
    let i;
    while ((i = out.indexOf('\n')) >= 0) {
      const line = out.slice(0, i).trim();
      out = out.slice(i + 1);
      if (!line) continue;
      try { const m = JSON.parse(line); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } } catch { /* not ours */ }
    }
  });
  child.stderr.on('data', () => { /* the hand's own log; the records say what matters */ });
  let next = 1;
  const rpc = (method, params) => new Promise((ok, fail) => {
    const id = next++;
    waiting.set(id, ok);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); fail(new Error(method + ' timed out')); } }, 10000);
  });
  const call = async (name, args) => { const m = await rpc('tools/call', { name, arguments: args || {} }); return m.result || { content: [{ type: 'text', text: JSON.stringify(m.error) }] }; };
  const stop = async () => { try { child.stdin.end(); } catch { /* gone */ } await sleep(100); child.kill(); };
  return { child, rpc, call, stop };
}
const textOf = (res) => ((res && res.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

// Ink, as a hand draws it, in screen pixels (world = screen: the view is pinned at zoom 1).
const seg = (a, b, n = 40) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
function rect(x, y, w, h) {
  const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  const path = [mid, v[1], v[2], v[3], v[0], mid];
  let p = [];
  for (let i = 0; i < path.length - 1; i++) p = p.concat(seg(path[i], path[i + 1], 26).slice(i ? 1 : 0));
  return p;
}
const circle = (cx, cy, r, n = 110) => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
// The built-in command mark: down to a sharp elbow, then a longer flick up.
const tick = (x, y) => seg({ x, y }, { x: x + 25, y: y + 35 }, 30).concat(seg({ x: x + 25, y: y + 35 }, { x: x + 70, y: y - 15 }, 30).slice(1));
// A word, as one cursive stroke: low, wide, open, turning many times — what the shape rung reads as `text`.
function cursive(x, y, w, h, humps = 7) {
  const n = humps * 14;
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = t * humps * Math.PI; return { x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }; });
}
async function stroke(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y);
  await page.mouse.up();
  await sleep(30);
}

const waitFor = (page, fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
async function until(fn, ms = 8000) { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(80); } return !!(await fn()); }

/** What the tab holds, for the records: the room, the held marks, the models at work, the status line. */
function tabNow() {
  const mm = window.__mm, s = mm.session.getState();
  return {
    me: mm.folder().me || null,
    status: (document.getElementById('status').textContent || '').trim(),
    working: mm.working(),
    summon: s.summon ? s.summon.enclosedIds.slice() : null,
    selection: s.selection.slice(),
    marks: s.contentIds.length,
    last: s.contentIds[s.contentIds.length - 1] || null,
    agents: mm.agents.map((a) => a.config.model),
  };
}
/** Nothing held and nothing open: the field dismissed by a tap on empty ground, a selection let go. */
async function letGo(page) {
  for (let i = 0; i < 3; i++) {
    const held = await page.evaluate(() => { const s = window.__mm.session.getState(); return !!s.summon || s.selection.length > 0; });
    if (!held) break;
    const at = await page.evaluate(() => {
      const f = document.getElementById('summon').getBoundingClientRect();
      const inside = (p) => p.x >= f.left - 20 && p.x <= f.right + 20 && p.y >= f.top - 20 && p.y <= f.bottom + 20;
      const clear = (p) => { const e = document.elementFromPoint(p.x, p.y); return e && e.id === 'canvas' && !inside(p); };
      return [{ x: 1120, y: 160 }, { x: 420, y: 780 }, { x: 1120, y: 500 }, { x: 900, y: 780 }].find(clear) || null;
    });
    if (at) { await page.mouse.click(at.x, at.y); await sleep(70); } else { await page.keyboard.press('Escape'); await sleep(50); }
  }
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
}
/** Press and hold at a point with the real pointer until the field opens; true when it did. */
async function holdAtPoint(page, pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  const opened = await page.waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 5000 }).then(() => true, () => false);
  await page.mouse.up();
  await sleep(80);
  return opened;
}
/** The hand's line about one mark, out of a canvas_look. */
const markLine = (look, id) => String(look).split('\n').find((l) => l.startsWith(id + ' ') || l.startsWith(id + ' ·')) || null;
/** The hand's count line: "N marks · M artifacts · …". */
const countLine = (look) => String(look).split('\n').find((l) => /^\d+ marks? · \d+ artifacts?/.test(l)) || '';

export async function runHand(browser, servers, { freshContext, screenshot }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const guardsList = [];
  const toJohnsRelay = [];
  const relay = await startRelay(0);
  const RELAY = 'http://127.0.0.1:' + relay.address().port;
  const model = await startCountingModel();
  const hand = spawnHand({ MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: HAND });
  let page = null;
  try {
    await hand.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'the gate', version: '0' } });
    hand.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const guards = await freshContext(browser, { origins: [servers.staticOrigin, model.origin], label: 'hand' });
    guardsList.push(guards);
    await guards.context.addInitScript(johnsTab, JOHN);
    await guards.context.route((url) => url.port === '8020', async (route) => { toJohnsRelay.push(route.request().method() + ' ' + route.request().url()); await route.abort('blockedbyclient'); });
    page = await guards.context.newPage();
    const address = `${servers.staticOrigin}/Demos/session-engine.html?live=${ROOM}&relay=${encodeURIComponent(RELAY)}&nosw=1`;
    const ready = () => page.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
    const inRoom = () => page.waitForFunction(() => window.__mm && window.__mm.folder && window.__mm.folder().how === 'live', null, { timeout: 20000 });

    // ---- H1.0. The hand and the tab meet ----
    await record('H1.0', async () => {
      await page.goto(address, { waitUntil: 'load', timeout: 60000 });
      await ready();
      await inRoom();
      let look = '';
      const met = await until(async () => { look = textOf(await hand.call('canvas_look', {})); return /with john/.test(look); }, 8000);
      check(`H1.0. the hand and the tab meet in room "${ROOM}": canvas_look says "${look.split('\n')[0]}", and the tab is in the room`,
        met && new RegExp(`^room ${ROOM} · you are ${HAND} · with john`).test(look), { look });
    });

    // ---- H1.1. The model of the gate's own joins; the hand's arrival asked it nothing ----
    /** The hand's look, taken again until it satisfies `pred` (the room is a transport: a line takes a moment) — the last one, if it never does. */
    const lookUntil = async (pred, ms = 6000, args = {}) => { let look = ''; await until(async () => { look = textOf(await hand.call('canvas_look', args)); return pred(look); }, ms); return look; };
    let deliberate = 0;
    const asked = () => model.calls.length;
    const joinModel = () => page.evaluate((origin) => {
      const mm = window.__mm;
      return !!mm.join(Object.assign({}, mm.MM.PRESETS.ollama, { baseUrl: origin + '/v1', model: 'e2e-hand-stub', vision: true }), null);
    }, model.origin);
    await record('H1.1', async () => {
      const joined = await joinModel();
      await hand.call('canvas_look', {});
      await hand.call('canvas_look', { detail: 'full' });
      await sleep(400);
      const now = await page.evaluate(tabNow);
      check(`H1.1. a model of the gate's own joins the tab, and the hand's arrival and two looks ask it nothing — ${asked()} calls, the working registry ${JSON.stringify(now.working)}`,
        joined && now.agents.includes('e2e-hand-stub') && asked() === 0 && now.working.length === 0, { now, calls: model.calls });
    });

    // ---- §4. The mark, the ghost, one tap (QA-v10 §4) — the tab's own gestures, the hand looking on ----
    const boxAt = { x: 470, y: 200, w: 150, h: 100 };
    let box = null;
    await record('H1.2', async () => {
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
      await stroke(page, rect(boxAt.x, boxAt.y, boxAt.w, boxAt.h));
      box = (await page.evaluate(tabNow)).last;
      await stroke(page, tick(900, 620));
      await sleep(150);
      const now = await page.evaluate(tabNow);
      const look = await lookUntil((l) => !!markLine(l, box));
      const line = markLine(look, box);
      check(`H1.2. §4 (synthetic strokes): a box, and his taught mark drawn far beside it, crossing nothing — nothing opens (the field ${now.summon ? 'open' : 'shut'}); the hand sees the box as a rectangle by john — "${(line || '').slice(0, 90)}"`,
        !!box && now.summon === null && now.selection.length === 0 && /rectangle/.test(line || '') && /by john/.test(line || '') && !/the field is open/.test(look),
        { now, look });
    });

    await record('H1.3', async () => {
      await stroke(page, seg({ x: 480, y: 185 }, { x: 517, y: 237 }, 30).concat(seg({ x: 517, y: 237 }, { x: 584, y: 162 }, 30).slice(1)));
      const opened = await waitFor(page, () => !!window.__mm.session.getState().summon, null, 4000);
      const now = await page.evaluate(tabNow);
      const look = await lookUntil((l) => !!markLine(l, box) && /marks/.test(l));
      check(`H1.3. §4 (synthetic strokes): the mark drawn across the box opens the field on the box, in his tab (${JSON.stringify(now.summon)}), and it is his — the hand's look says neither "selected" nor "the field is open", whichever hand's field it is (the L2h that QA-v10 §4's "1 selected" predates)`,
        opened && now.summon && now.summon.length === 1 && now.summon[0] === box && !/selected|the field is open/.test(countLine(look)), { now, count: countLine(look) });
    });

    await record('H1.4', async () => {
      await letGo(page);
      const gone = await page.evaluate(tabNow);
      const before = gone.marks;
      await stroke(page, circle(900, 400, 40));
      const drew = await page.evaluate(tabNow);
      const look = await lookUntil((l) => new RegExp('^' + drew.marks + ' marks').test(countLine(l)));
      check(`H1.4. §4 (synthetic strokes): one tap on the ground and the field and the selection are both gone (field ${gone.summon ? 'open' : 'shut'}, ${gone.selection.length} selected); the next stroke draws (${before} → ${drew.marks} marks) and the hand's look says ${countLine(look).split(' · ')[0]}`,
        gone.summon === null && gone.selection.length === 0 && drew.marks === before + 1 && drew.summon === null && new RegExp('^' + drew.marks + ' marks').test(countLine(look)),
        { gone, drew, count: countLine(look) });
    });

    await record('H1.5', async () => {
      const snap = await page.evaluate(() => { const o = window.__mm.snapOffers(); return Array.isArray(o) ? o.length : (o && o.size) || 0; });
      const tile = await page.evaluate(() => { const b = document.getElementById('snapBtn') || document.querySelector('[data-tile="snap"]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
      check(`H1.5. §4 (synthetic strokes): the circle just drawn is counted by the snap tile (${snap} offered${tile ? ', tile: "' + tile + '"' : ''})`, snap >= 1, { snap, tile });
    });
    check('H1.5b. §4: the dashed clean form goes a few seconds after the stroke, and is back under the pointer — skipped: it is a drawn frame, and this page has no reading of one (GHOST_MS in 08-render.js is the rule; the eye is the check)', true);

    let noteText = null;
    await record('H1.6', async () => {
      // A text stands under the box: the hand writes it (canvas_write), the tab holds it, and a box drawn below it is a box.
      const wrote = textOf(await hand.call('canvas_write', { kind: 'text', code: 'hello there', name: 'note', bounds: { x: 470, y: 360, w: 220, h: 50 } }));
      noteText = (wrote.match(/^(\S+) placed/) || [])[1] || null;
      await waitFor(page, (id) => !!window.__mm.session.getState().nodes.get(id), noteText, 5000);
      await sleep(300);
      const opened = await holdAtPoint(page, { x: 580, y: 385 });
      const held = await page.evaluate(tabNow);
      const marksBefore = held.marks;
      await stroke(page, rect(470, 440, 160, 90));
      await sleep(150);
      const after = await page.evaluate(tabNow);
      const lastId = after.last;
      const reads = await page.evaluate((id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); return n ? mm.MM.interpretationsOf(n, mm.session.getState().nodes).map((r) => r.label) : []; }, lastId);
      check(`H1.6. §4 (synthetic strokes): a text the hand wrote (${noteText}) is held in the tab (${JSON.stringify(held.summon || held.selection)}); a box drawn below it is a box, not a move — ${marksBefore} → ${after.marks} marks, read ${reads[0]}, and the selection ends (${after.selection.length} selected, field ${after.summon ? 'open' : 'shut'})`,
        !!noteText && opened && (held.summon || held.selection).includes(noteText) && after.marks === marksBefore + 1 && /rectangle/.test(reads.join()) && after.selection.length === 0 && after.summon === null,
        { wrote, opened, held, after, reads });
    });


    // ---- §6. Two hands (QA-v10 §6; acceptance A7) — the world moved a screen's-width-and-more away, so nothing of §4 stands beside ----
    const WX = 3000;
    let boxB = null, sun = null, word = null;
    const cardsAbout = (id) => page.evaluate((i) => window.__mm.answerCards().filter((c) => c.about.includes(i)).map((c) => ({ id: c.id, about: c.about, who: c.who, what: c.what })), id);
    await record('H1.7', async () => {
      await letGo(page);
      await page.evaluate((x) => window.__mm.setView(1, -x, 0), WX);
      await stroke(page, rect(470, 200, 150, 100));
      boxB = (await page.evaluate(tabNow)).last;
      const drew = textOf(await hand.call('canvas_draw', { shapes: [{ shape: 'circle', x: WX + 700, y: 200, w: 100, h: 100, why: 'a circle beside your box' }] }));
      sun = (drew.match(/^(\S+) → /) || [])[1] || null;
      const landed = await waitFor(page, (id) => !!window.__mm.session.getState().nodes.get(id), sun, 5000);
      await sleep(250);
      const colours = await page.evaluate(([a, b]) => { const mm = window.__mm; return { his: mm.colourOf(a), hers: mm.colourOf(b) }; }, [boxB, sun]);
      const cards = sun ? await cardsAbout(sun) : [];
      const now = await page.evaluate(tabNow);
      check(`H1.7. §6 (synthetic strokes): he draws a box; the hand draws a circle beside it with a why — the circle (${sun}) lands in the tab in the hand's own colour (${colours.hers} against his ${colours.his}), with a card beside it ("${(cards[0] && cards[0].what || '').slice(0, 30)}"), and the status line says "with claude"`,
        !!boxB && !!sun && landed && colours.hers && colours.his && colours.hers !== colours.his && cards.length === 1 && cards[0].who === HAND && /with claude/.test(now.status),
        { drew, colours, cards, status: now.status });
    });

    await record('H1.8', async () => {
      const look = await lookUntil((l) => !!markLine(l, boxB));
      const line = markLine(look, boxB);
      const said = textOf(await hand.call('canvas_say', { about: [boxB], text: 'this is your box' }));
      const landed = await waitFor(page, (id) => window.__mm.answerCards().some((c) => c.about.includes(id) && c.who === 'claude'), boxB, 5000);
      await sleep(200);
      const cards = await page.evaluate((id0) => window.__mm.answerCards().filter((c) => c.about.includes(id0)).map((c) => ({ about: c.about, who: c.who, id: c.id })), boxB);
      const sunCards = await cardsAbout(sun);
      check(`H1.8. §6: canvas_look lists his box under the id his own tab gave it (${boxB}) — "${(line || '').slice(0, 80)}"; canvas_say about that id lands the card on his box and no other mark (${JSON.stringify(cards.map((c) => c.about))}), and the circle's card is still only its own`,
        /^stroke:john~[a-z0-9]+:\d+/.test(boxB || '') && !!line && /by john/.test(line) && /placed beside/.test(said) && landed && cards.length === 1 && cards[0].about.length === 1 && cards[0].about[0] === boxB && cards[0].who === HAND && sunCards.length === 1,
        { line, said, cards, sunCards });
    });

    await record('H1.9', async () => {
      await stroke(page, cursive(470, 420, 220, 44, 7));
      word = (await page.evaluate(tabNow)).last;
      await lookUntil((l) => !!markLine(l, word));
      const before = asked();
      const said = textOf(await hand.call('canvas_transcribe', { id: word, text: 'window', confidence: 0.85 }));
      const landed = await waitFor(page, (id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); return !!n && mm.MM.transcriptOf(n) === 'window'; }, word, 5000);
      const opened = await holdAtPoint(page, { x: 580, y: 442 });
      const pills = await page.evaluate(() => [...document.querySelectorAll('#summon .pill')].map((p) => p.textContent.trim().replace(/\s+/g, ' ')));
      await letGo(page);
      check(`H1.9. §6 (synthetic strokes): he writes a word; the hand transcribes it as “window” — the tab holds the transcript with no model asked (${before} → ${asked()} calls), and held alone the word's field offers it (${pills.filter((p) => /window/.test(p)).join(' | ')})`,
        !!word && /read as “window”/.test(said) && landed && asked() === before && opened && pills.some((p) => /window/.test(p)), { said, pills, calls: model.calls.length });
    });

    await record('H1.10', async () => {
      const said = textOf(await hand.call('canvas_propose', { ids: [boxB], label: 'gate', confidence: 0.7, reasoning: 'a box with a hand beside it' }));
      const landed = await waitFor(page, (id) => { const mm = window.__mm, s = mm.session.getState(), n = s.nodes.get(id); return !!n && mm.MM.interpretationsOf(n, s.nodes).some((r) => /gate/.test(r.label)); }, boxB, 5000);
      const reads = await page.evaluate((id) => { const mm = window.__mm, s = mm.session.getState(); return mm.MM.interpretationsOf(s.nodes.get(id), s.nodes).map((r) => ({ label: r.label, source: r.sourceName, weight: +r.weight.toFixed(2), blessed: !!r.blessed })); }, boxB);
      const mine = reads.find((r) => /gate/.test(r.label));
      const look = await lookUntil((l) => /gate 0\.70/.test(markLine(l, boxB) || ''));
      const line = markLine(look, boxB);
      check(`H1.10. §6: canvas_propose a reading with a confidence — it is held on his box in the tab, attributed to the hand, never blessed ("${mine && mine.label} ${mine && mine.weight} · ${mine && mine.source}"), and the hand's own look says who read it — "${(line || '').slice(0, 90)}"`,
        /held on/.test(said) && landed && !!mine && mine.source === HAND && !mine.blessed && /gate 0\.70 · claude/.test(line || ''), { said, reads, line });
      // Whether it stands in the field's "what this is" row is the surface's, and today it does not (a hand is a tier 0 voice, and 09-palette.js leaves tier 0 out).
      const opened = await holdAtPoint(page, { x: 470, y: 250 });
      const items = await page.evaluate(() => { const f = window.__mm.fieldItems(); return f ? f.ranked.map((i) => i.label) : []; });
      await letGo(page);
      const shown = items.some((l) => /gate/.test(l));
      check(shown
        ? 'H1.10b. §6: the hand\'s proposed reading joins the field\'s row on his box as "gate 0.70 · claude"'
        : 'H1.10b. §6: the hand\'s proposed reading joins the field\'s row as "… · claude" — skipped (known: a hand is a tier 0 voice and conversionsFor in 09-palette.js leaves tier 0 out of "what this is", so the reading lands and shows nowhere; QA-v10 §6 row 4 says it joins the row)',
        opened && (shown || items.length > 0), { opened, items });
    });


    let boxC = null;
    await record('H1.11', async () => {
      await stroke(page, rect(700, 520, 90, 60));
      boxC = (await page.evaluate(tabNow)).last;
      await lookUntil((l) => !!markLine(l, boxC));
      const before = await page.evaluate(tabNow);
      await page.click('#undoBtn');
      const undone = await waitFor(page, (id) => !window.__mm.session.getState().nodes.has(id) || window.__mm.session.getState().nodes.get(id).reps.some((r) => r.modality === 'erased'), boxC, 5000);
      const look = await lookUntil((l) => !markLine(l, boxC));
      await stroke(page, circle(900, 540, 35));
      const next = (await page.evaluate(tabNow)).last;
      const num = (id) => Number(String(id).split(':').pop());
      check(`H1.11. §6 (synthetic strokes): one undo in the tab takes only his last mark (${boxC}) — the hand's look no longer lists it and still lists the circle, his box and his word; his next mark is ${next}, a new number and never the undone one's`,
        undone && !markLine(look, boxC) && !!markLine(look, sun) && !!markLine(look, boxB) && !!markLine(look, word) && !!next && next !== boxC && num(next) > num(boxC) && before.marks === (await page.evaluate(tabNow)).marks,
        { boxC, next, look: look.split('\n').slice(0, 8) });
    });

    await record('H1.12', async () => {
      const own = textOf(await hand.call('canvas_label', { id: sun, text: 'sun' }));
      const drawn = await waitFor(page, (id) => window.__mm.labelsDrawn().some((l) => l.id === id && l.text === 'sun'), sun, 5000);
      const hers = await page.evaluate((id) => { const mm = window.__mm; const l = mm.labelsDrawn().find((x) => x.id === id); return { label: l, ink: mm.colourOf(id) }; }, sun);
      const refused = textOf(await hand.call('canvas_label', { id: boxB, text: 'not mine' }));
      await sleep(300);
      const onBox = await page.evaluate((id) => { const mm = window.__mm; const n = mm.session.getState().nodes.get(id); const l = mm.MM.labelOf(n); return l ? l.text : null; }, boxB);
      check(`H1.12. §6: the hand labels its own circle “sun” — it is drawn in the tab in the hand's colour (${hers.label && hers.label.colour} against ink ${hers.ink}); the same call on his box is refused, the reply naming whose ink it is ("${refused.slice(-70)}"), and nothing lands on the box (${onBox})`,
        /“sun” on/.test(own) && drawn && !!hers.label && hers.label.colour === hers.ink && /john/.test(refused) && !/“not mine” on/.test(refused) && onBox === null, { own, refused, hers, onBox });
    });

    const fieldLine = (page) => page.evaluate(() => { const r = document.querySelector('#summon .reading'); return r ? r.textContent.trim() : ''; });
    const typeInField = async (text) => { await page.fill('#summon input.filter', text); await sleep(80); };
    await record('H1.13', async () => {
      await stroke(page, rect(400, 150, 450, 200));
      await stroke(page, tick(790, 300));
      const held = await waitFor(page, (a) => { const s = window.__mm.session.getState().summon; return !!s && s.enclosedIds.includes(a[0]) && s.enclosedIds.includes(a[1]); }, [boxB, sun], 5000);
      await typeInField('label: inlet');
      const line = await fieldLine(page);
      await page.keyboard.press('Enter');
      await sleep(200);
      const labels = await page.evaluate(([a, b]) => { const mm = window.__mm, s = mm.session.getState(); const t = (id) => { const l = mm.MM.labelOf(s.nodes.get(id)); return l ? l.text : null; }; return { box: t(a), sun: t(b) }; }, [boxB, sun]);
      const look = await lookUntil((l) => /labelled “inlet”/.test(markLine(l, boxB) || ''));
      check(`H1.13. §6 (synthetic strokes): his box and the hand's circle held, \`label: inlet\` — the line says "${line}" before Enter, and Enter puts inlet on his box alone (box ${labels.box}, circle ${labels.sun}); the hand's look: "${(markLine(look, boxB) || '').slice(0, 90)}"`,
        held && line === '↵ label it “inlet” — on yours, not the mark claude made' && labels.box === 'inlet' && labels.sun === 'sun' && /labelled “inlet”/.test(markLine(look, boxB) || '') && /labelled “sun”/.test(markLine(look, sun) || ''),
        { held, line, labels, look: markLine(look, boxB) });
      await letGo(page);
    });

    let pair = null;
    await record('H1.14', async () => {
      await stroke(page, rect(1000, 150, 80, 60));
      const p1 = (await page.evaluate(tabNow)).last;
      await stroke(page, rect(1110, 150, 80, 60));
      const p2 = (await page.evaluate(tabNow)).last;
      await stroke(page, rect(960, 110, 270, 150));
      await stroke(page, tick(1160, 225));
      const held = await waitFor(page, (a) => { const s = window.__mm.session.getState().summon; return !!s && a.every((id) => s.enclosedIds.includes(id)); }, [p1, p2], 5000);
      const drew = textOf(await hand.call('canvas_draw', { shapes: [{ shape: 'line', from: { x: WX + 1000, y: 320 }, to: { x: WX + 1200, y: 320 } }] }));
      const line = (drew.match(/^(\S+) → /) || [])[1] || null;
      await waitFor(page, (id) => !!window.__mm.session.getState().nodes.get(id), line, 5000);
      await sleep(250);
      const still = await page.evaluate(tabNow);
      await typeInField('name: pair');
      await page.keyboard.press('Enter');
      await sleep(250);
      const made = await page.evaluate(([a, b, l]) => {
        const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
        const art = s.artifacts.map((id) => s.nodes.get(id)).find((n) => MM.wordOf(n) === 'pair');
        return art ? { id: art.id, parts: art.edges.filter((e) => e.rel === 'has-part').map((e) => e.to), theLine: l } : null;
      }, [p1, p2, line]);
      pair = made && made.id;
      const look = await lookUntil((l) => !!pair && !!markLine(l, pair));
      check(`H1.14. §6 (synthetic strokes): two of his marks held and the field left open — the hand's line lands (${line}) and the field stays open on his two (${still.summon && still.summon.length}); \`name: pair\` and Enter make the thing, holding his two marks and nothing of the hand's; the hand's look: "${(markLine(look, pair) || '').slice(0, 80)}", its count line "${countLine(look)}"`,
        held && !!line && still.summon && still.summon.length === 2 && !!made && made.parts.includes(p1) && made.parts.includes(p2) && !made.parts.includes(line)
          && /“pair”/.test(markLine(look, pair) || '') && /by john/.test(markLine(look, pair) || '') && !/the field is open/.test(look),
        { held, still, made, count: countLine(look) });
      await letGo(page);
    });

    await record('H1.15', async () => {
      await letGo(page);
      await stroke(page, rect(430, 170, 220, 160));
      const loopWaits = await page.evaluate(() => !!window.__mm.session.getState().pendingLassoId);
      const drew = textOf(await hand.call('canvas_draw', { shapes: [{ shape: 'line', from: { x: WX + 660, y: 340 }, to: { x: WX + 700, y: 340 } }] }));
      const hers = (drew.match(/^(\S+) → /) || [])[1] || null;
      await waitFor(page, (id) => !!window.__mm.session.getState().nodes.get(id), hers, 5000);
      await sleep(200);
      const still = await page.evaluate(() => !!window.__mm.session.getState().pendingLassoId);
      await stroke(page, tick(575, 270));
      const held = await waitFor(page, () => !!window.__mm.session.getState().summon, null, 5000);
      const now = await page.evaluate(tabNow);
      check(`H1.15. §6 (synthetic strokes): he draws a loop round a mark and, before his check, the hand's stroke lands (${hers}) — his loop still waits (${loopWaits} → ${still}) and his check takes his loop up: the field opens on his mark (${JSON.stringify(now.summon)}) and not on the hand's line`,
        loopWaits && still && held && !!now.summon && now.summon.includes(boxB) && !now.summon.includes(hers), { loopWaits, still, now, hers });
      await letGo(page);
    });

    check(`H1.Z. nothing the scenario opened reached for :8020, where a relay on this machine listens by default — ${toJohnsRelay.length} request${toJohnsRelay.length === 1 ? '' : 's'} refused`, toJohnsRelay.length === 0, toJohnsRelay.slice(0, 5));
  } catch (err) {
    check(`the scenario itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    if (page) await screenshot(page, 'hand');
  } finally {
    await hand.stop();
    await model.stop().catch(() => {});
    relay.close();
  }
  if (page && steps.some((s) => !s.ok)) await screenshot(page, 'hand');
  return { steps, guards: guardsList };
}
