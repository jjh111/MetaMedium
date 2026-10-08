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
//   H1.1   a model of the gate's own joins the tab; the hand's arrival and two looks ask it nothing
//   H1.2-6 QA-v10 §4 — the mark beside a box that crosses nothing opens nothing; across it, the field
//          opens on the box and stays his (the hand's look never says "selected" or "the field is open");
//          one tap lets go and the next stroke draws; the snap tile counts the circle (H1.5b, the
//          ghost's timing, is a skip); a box drawn below a held text is a box (the hand wrote the text)
//   H1.7-18 QA-v10 §6, acceptance A7 — the hand's circle lands in its own colour with its card; a
//          sentence lands on his box alone, under the id his tab gave it; a transcript lands on his
//          word with no model asked; a proposed reading is held and attributed (H1.10b: it joins the
//          field's row with its author); one undo takes only his last mark and the next
//          number is new; the hand's label lands on its own ink and is refused on his; his `label:`
//          says who it is not on before Enter; a field left open stays open under the hand's line,
//          `name: pair` makes the thing his; a loop that waits waits under the hand's stroke; a reload
//          is a new sitting and the same person (the board back, old ids, a label on a mark drawn
//          before it, the hand's own refused); after undo and reload a sentence and a reading land
//          on the marks they were about
//   H1.19  QA-v10 §5, the one deliberate act: What is this? asks the gate's model once, the working dot
//          up while the call is out; the reading lands held and the hand's look says who read it
//   H1.20-21 QA-v10 §7 — the minimap and a tap on it; three circles and two lines, Show it in 3D,
//          the hand's look says one run artifact, playing
//   H1.22-24 A1, pictures in a room (PLAN-IPAD-NOTES): the hand imports a PNG (canvas_import — its bytes
//          put on the relay by their hash, then the event) and the tab, which holds none of it, fetches the
//          bytes into its own asset store and DRAWS it — the red of the bytes at the picture's centre; a
//          picture the tab imports is put on the relay and fetched, stored and drawn by a SECOND tab (a
//          context of its own: its own IndexedDB) and seen by the hand — canvas_see returns its pixels;
//          a picture whose bytes the room never got stays a named plate, and says so
//   H1.25  the same on the Worker's logic (cloudflare/relay, in Node) with a room key: a tab joins with ?key=,
//          its picture goes by Authorization: Bearer after a CORS preflight, and another tab, a context of
//          its own, fetches and draws it — the path relay.dyna.ink takes, in the gate
//   H1.26-28 A2, the hand organises notes (PLAN-IPAD-NOTES): a region the hand makes round his box and his word
//          (canvas_region) is in the tab's board outline with what it holds, made by the hand, and moved nothing of
//          his; the hand finds his words (canvas_find: the label, the transcript, the region's name) and the tab's
//          own Find on the same board finds the region; H1.28 (A2b, John's ruling of 2 Oct 2026): the hand moves
//          his box, his word and the region that carries them, says whose it moved, the tab says it in the status line
//          attributed, his undo does not reach the hand's move, and the hand moves them back
//   H1.29  CG7a (V1-SPEC §3.13), the formats as they flow between the page and the hand: the page writes its board as a
//          bundle with its own code and the hand reads it into a scratch session (the same events, the same board by readings;
//          who made a thing read from the writer's side); the hand writes its bundle (canvas_export) and the page reads it with
//          its own reader; the hand's SVG draws the page's own ink, path for path — and nothing was written to the room
//   H1.S1-4 the rows only John's own hand can walk: skips, by name
//   H1.Y   the invariant: Tier 1 before a model — the model was asked once, by H1.19, and no brief,
//          no seat, no real model
//   H1.Z   nothing reached for :8020

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startRelay } from '../Demos/relay.mjs';
import { startDevRelay } from '../cloudflare/relay/dev-server.mjs';
import { keyForRoom } from '../cloudflare/relay/src/auth.mjs';
import { encodePNG, decodePNG } from '../Demos/ink-png.mjs';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
      // A moment, so the page's working dot can be seen while the call is out.
      setTimeout(() => res.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify({ id: 'x', object: 'chat.completion', model: 'e2e-hand-stub', choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })), 600);
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
async function takePill(page, label) {
  const pill = page.locator('#summon .pill.item', { hasText: label });
  if (await pill.count() !== 1) return false;
  await pill.click({ timeout: 5000 });
  return true;
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
      // The field's "what this is" row: another hand's proposed reading stands there with its author, ranked with the rest (F1).
      const opened = await holdAtPoint(page, { x: 470, y: 250 });
      const items = await page.evaluate(() => { const f = window.__mm.fieldItems(); return f ? f.ranked.map((i) => i.label) : []; });
      await letGo(page);
      const shown = items.find((l) => /gate/.test(l));
      check(`H1.10b. §6: the hand's proposed reading joins the field's row on his box as "gate 0.70 · claude" ("${shown}")`,
        opened && /^gate 0\.70 · claude$/.test(shown || ''), { opened, items });
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
        held && line === '↵ write “inlet” on it — on yours, not the mark claude made' && labels.box === 'inlet' && labels.sun === 'sun' && /labelled “inlet”/.test(markLine(look, boxB) || '') && /labelled “sun”/.test(markLine(look, sun) || ''),
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
          && /“pair”/.test(markLine(look, pair) || '') && /by john/.test(markLine(look, pair) || '') && !/the field is open/.test(look)
          && !/ · claude/.test(markLine(look, pair) || '') /* a name he gave is never said to be the hand's reading */,
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


    // ---- A reload: a new sitting and the same person ----
    let sittingBefore = null, idsBefore = [];
    await record('H1.16', async () => {
      await letGo(page);
      const before = await page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); return { me: mm.folder().me, ids: s.contentIds.slice(), marks: s.contentIds.length }; });
      sittingBefore = before.me; idsBefore = before.ids;
      await page.reload({ waitUntil: 'load', timeout: 60000 });
      await ready();
      await inRoom();
      await page.evaluate((x) => window.__mm.setView(1, -x, 0), WX);
      const back = await waitFor(page, (n) => window.__mm.session.getState().contentIds.length >= n, before.marks, 10000);
      await joinModel();
      const now = await page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); return { me: mm.folder().me, ids: s.contentIds.slice(), marks: s.contentIds.length, colour: mm.colourOf(s.contentIds[0]) }; });
      const look = await lookUntil((l) => idsBefore.filter((id) => !!markLine(l, id)).length >= 3);
      const listed = idsBefore.filter((id) => !!markLine(look, id));
      await stroke(page, rect(700, 660, 90, 60));
      const fresh = (await page.evaluate(tabNow)).last;
      check(`H1.16. §6 (synthetic strokes): the tab reloaded by its address — a new sitting (${sittingBefore} → ${now.me}), the same person; the board comes back from the room (${before.marks} → ${now.marks} marks), the hand's look lists his earlier marks under their old ids (${listed.length} of ${idsBefore.length}); his next mark is ${fresh}, an id no sitting has held`,
        back && now.me !== sittingBefore && String(now.me).startsWith('john~') && now.marks >= before.marks && listed.length === idsBefore.length && !!fresh && !idsBefore.includes(fresh) && !String(fresh).includes(String(sittingBefore)),
        { before, now, listed, fresh });
    });

    await record('H1.17', async () => {
      // A mark drawn before the reload is still his to label: a reload is a new sitting and the same person.
      const opened = await holdAtPoint(page, { x: 470, y: 250 });
      await typeInField('label: gate');
      const line1 = await fieldLine(page);
      await page.keyboard.press('Enter');
      await sleep(200);
      const first = await page.evaluate((id) => { const mm = window.__mm; const l = mm.MM.labelOf(mm.session.getState().nodes.get(id)); return l ? l.text : null; }, boxB);
      await letGo(page);
      await stroke(page, rect(400, 150, 450, 200));
      await stroke(page, tick(790, 300));
      const held = await waitFor(page, (a) => { const s = window.__mm.session.getState().summon; return !!s && s.enclosedIds.includes(a[0]) && s.enclosedIds.includes(a[1]); }, [boxB, sun], 5000);
      await typeInField('label: outlet');
      const line2 = await fieldLine(page);
      await page.keyboard.press('Enter');
      await sleep(200);
      const labels = await page.evaluate(([a, b]) => { const mm = window.__mm, s = mm.session.getState(); const t = (id) => { const l = mm.MM.labelOf(s.nodes.get(id)); return l ? l.text : null; }; return { box: t(a), sun: t(b) }; }, [boxB, sun]);
      const look = await lookUntil((l) => /labelled “outlet”/.test(markLine(l, boxB) || ''));
      const refused = textOf(await hand.call('canvas_label', { id: boxB, text: 'mine now' }));
      check(`H1.17. §6 (synthetic strokes): after the reload, a mark drawn before it labels — "${line1}" before Enter, and it says ${first}; held with the hand's circle, "${line2}"; the hand's look: "${(markLine(look, boxB) || '').slice(0, 100)}", the circle still “${labels.sun}”; the hand's own label on his mark is refused (${refused.slice(-60)})`,
        opened && /^↵ write “gate” on (it|them) — on (yours|your \d+)/.test(line1) && first === 'gate' && held && /^↵ write “outlet” on (it|them) — on (yours|your \d+), not the (mark|\d+ marks) claude made$/.test(line2) && labels.box === 'outlet' && labels.sun === 'sun'
          && /labelled “outlet”/.test(markLine(look, boxB) || '') && /by john/.test(markLine(look, boxB) || '') && !/“mine now” on/.test(refused) && /john/.test(refused),
        { line1, first, line2, labels, look: markLine(look, boxB), refused });
      await letGo(page);
    });

    await record('H1.18', async () => {
      // A7: after an undo and a reload, a sentence and a reading land on the marks they were about.
      const say = textOf(await hand.call('canvas_say', { about: [boxB], text: 'still your box, after the reload' }));
      const prop = textOf(await hand.call('canvas_propose', { ids: [word], label: 'window-frame', confidence: 0.6, reasoning: 'after the reload, on the word' }));
      const landed = await waitFor(page, ([b, w]) => {
        const mm = window.__mm, s = mm.session.getState();
        return mm.answerCards().some((c) => c.about.length === 1 && c.about[0] === b && c.who === 'claude' && c.id !== undefined) && mm.MM.interpretationsOf(s.nodes.get(w), s.nodes).some((r) => r.label === 'window-frame');
      }, [boxB, word], 6000);
      const where = await page.evaluate(([b, w]) => {
        const mm = window.__mm, s = mm.session.getState();
        const withReading = s.contentIds.filter((id) => mm.MM.interpretationsOf(s.nodes.get(id), s.nodes).some((r) => r.label === 'window-frame'));
        const sayCards = mm.answerCards().filter((c) => c.who === 'claude' && c.about.includes(b)).length;
        return { withReading, sayCards, undone: !s.nodes.has('x') };
      }, [boxB, word]);
      check(`H1.18. A7 (synthetic strokes): after an undo and a reload the hand's sentence lands on his box alone and its reading on his word alone — the reading is on ${JSON.stringify(where.withReading)} (${where.withReading.length} mark)`,
        /placed beside/.test(say) && /held on/.test(prop) && landed && where.withReading.length === 1 && where.withReading[0] === word, { say, prop, where });
    });


    // ---- §5. The one deliberate ask: What is this? — a model is asked when a person asks, and once ----
    await record('H1.19', async () => {
      await letGo(page);
      const idle = await page.evaluate(tabNow);
      const callsBefore = asked();
      const opened = await holdAtPoint(page, { x: 470, y: 250 });
      const took = opened && await takePill(page, 'What is this?');
      const working = await waitFor(page, () => window.__mm.working().length > 0, null, 3000);
      const during = await page.evaluate(tabNow);
      const read = await waitFor(page, () => { const mm = window.__mm, s = mm.session.getState(); return s.contentIds.some((id) => mm.MM.interpretationsOf(s.nodes.get(id), s.nodes).some((r) => /the.model.of.the.gate/.test(r.label))); }, null, 8000);
      if (took) deliberate++;
      const on = await page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); return s.contentIds.filter((id) => mm.MM.interpretationsOf(s.nodes.get(id), s.nodes).some((r) => /the.model.of.the.gate/.test(r.label))); });
      await sleep(300);
      const after = await page.evaluate(tabNow);
      const look = await lookUntil((l) => on.length > 0 && /the.model.of.the.gate 0\.61 · /.test(markLine(l, on[0]) || ''));
      check(`H1.19. §5, the deliberate act: What is this? on his box asks the gate's model — ${callsBefore} → ${asked()} calls (one), the working dot up while it was out (${JSON.stringify(during.working)}) and gone after (${JSON.stringify(after.working)}); the reading lands on ${on.length} mark, held, and the hand's look attributes it — "${(markLine(look, on[0]) || '').slice(0, 120)}"`,
        idle.working.length === 0 && callsBefore === 0 && opened && took && working && during.working.length >= 1 && read && asked() === 1 && after.working.length === 0 && on.length === 1 && /the.model.of.the.gate 0\.61 · /.test(markLine(look, on[0]) || ''),
        { idle, opened, took, during, after, on, calls: model.calls, line: markLine(look, on[0]) });
      await letGo(page);
    });

    // ---- §7. The minimap and the frame ----
    await record('H1.20', async () => {
      await letGo(page);
      // Zoom in far on his box, then pan away from the board: the map still shows the board and the viewport.
      await page.evaluate((x) => window.__mm.setView(4, -4 * (x + 3700), -4 * 230), WX);
      await page.evaluate(() => window.__mm.setView(4, 2000, 0));
      await sleep(200);
      const map = await page.evaluate(() => { const m = window.__mm.minimap(), el = document.getElementById('minimap'); const r = el.getBoundingClientRect(); return m ? { scale: m.scale, ox: m.ox, oy: m.oy, hidden: el.hidden, rect: { l: r.left, t: r.top, w: r.width, h: r.height } } : null; });
      const target = { x: WX + 545, y: 250 }; // the middle of his box, in the world
      const at = map && { x: map.rect.l + (map.ox + target.x * map.scale) * (map.rect.w / 176), y: map.rect.t + (map.oy + target.y * map.scale) * (map.rect.h / 108) };
      if (at) await page.mouse.click(at.x, at.y);
      await sleep(250);
      const centre = await page.evaluate(() => { const v = window.__mm.view; return { x: (innerWidth / 2 - v.panX) / v.zoom, y: (innerHeight / 2 - v.panY) / v.zoom, zoom: v.zoom }; });
      check(`H1.20. §7: zoomed in far and panned away, the minimap shows the board with the viewport on it (${map ? 'shown' : 'hidden'}); a tap on it goes there — the centre of the screen is now at ${Math.round(centre.x)},${Math.round(centre.y)} of ${target.x},${target.y}`,
        !!map && !map.hidden && !!at && Math.abs(centre.x - target.x) < 12 && Math.abs(centre.y - target.y) < 12 && centre.zoom === 4, { map, at, centre });
      await page.evaluate((x) => window.__mm.setView(1, -x, 0), WX);
    });

    let three = null;
    await record('H1.21', async () => {
      await page.evaluate(() => window.__mm.setView(1, -6000, 0));
      const cs = [{ x: 520, y: 230 }, { x: 720, y: 230 }, { x: 620, y: 400 }];
      for (const c of cs) await stroke(page, circle(c.x, c.y, 38));
      const ids3 = (await page.evaluate(() => { const s = window.__mm.session.getState(); return s.contentIds.slice(-3); }));
      await stroke(page, seg({ x: 558, y: 230 }, { x: 682, y: 230 }, 30));
      await stroke(page, seg({ x: 540, y: 264 }, { x: 600, y: 366 }, 30));
      await stroke(page, rect(440, 160, 380, 300));
      await stroke(page, tick(760, 415));
      const held = await waitFor(page, () => !!window.__mm.session.getState().summon, null, 5000);
      const took = held && await takePill(page, 'Show it in 3D');
      const made = await waitFor(page, () => window.__mm.session.getState().live.length > 0, null, 8000);
      three = await page.evaluate(() => { const s = window.__mm.session.getState(); return s.live.slice(-1)[0] || null; });
      const look = await lookUntil((l) => !!three && !!markLine(l, three), 8000, { detail: 'full' });
      const line = markLine(look, three);
      const shortLook = await lookUntil((l) => !!three && !!markLine(l, three));
      check(`H1.21. §7 (synthetic strokes): three circles and two lines, circled, Show it in 3D — the hand's look: one artifact "${(markLine(shortLook, three) || '').slice(0, 100)}"`,
        held && took && made && !!three && /\brun\b/.test(markLine(shortLook, three) || '') && /playing|live/.test(markLine(shortLook, three) || ''), { held, took, made, three, line: markLine(shortLook, three), full: look.slice(0, 1500) });
    });


    // ---- A1. Pictures in a room (PLAN-IPAD-NOTES): the bytes go by their hash, and every hand draws what it is shown ----
    const sha = (b) => createHash('sha256').update(b).digest('hex');
    const solidPng = (n, rgba) => { const px = new Uint8Array(n * n * 4); for (let i = 0; i < n * n; i++) px.set(rgba, i * 4); return new Uint8Array(encodePNG(n, n, px)); };
    const RED = [200, 40, 40], BLUE = [50, 70, 210];
    const close3 = (got, want, tol = 30) => !!got && want.every((v, i) => Math.abs(got[i] - v) <= tol);
    /** What a tab's canvas shows at a world point (a 5×5 average), once the tab's view is set so the point is on screen. */
    const pixelOf = (pg, wx, wy) => pg.evaluate(([x, y]) => {
      const mm = window.__mm, p = mm.worldToScreen(x, y), cv = document.getElementById('canvas');
      const d = cv.getContext('2d').getImageData(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5).data;
      let r = 0, g = 0, b = 0; const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    }, [wx, wy]);
    const showsColour = async (pg, wx, wy, want, ms = 9000) => { let got = null; const ok = await until(async () => { got = await pixelOf(pg, wx, wy); return close3(got, want); }, ms); return { ok, got }; };
    const boundsOfIn = (pg, id) => pg.evaluate((i) => { const mm = window.__mm, n = mm.session.getState().nodes.get(i); const b = n && mm.MM.boundsOf(n); return b ? { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY } : null; }, id);
    let handPic = null, handHash = null;
    await record('H1.22', async () => {
      const png = solidPng(16, [...RED, 255]);
      handHash = sha(png);
      // What the first tab asks of the relay's assets, counted: it must GET the hand's picture, and put nothing it was only shown.
      const asked1 = [];
      await guards.context.route((url) => url.pathname.includes('/assets/'), async (route) => { asked1.push(route.request().method() + ' ' + route.request().url().split('/assets/')[1]); await route.continue(); });
      const out = textOf(await hand.call('canvas_import', { base64: Buffer.from(png).toString('base64'), name: 'swatch.png', at: { x: 3000, y: 3000, w: 200 } }));
      handPic = (out.match(/^(\S+) placed/) || [])[1] || null;
      const onRelay = await fetch(`${RELAY}/rooms/${ROOM}/assets/${handHash}`);
      await page.evaluate(() => window.__mm.setView(1, -2900, -2900));
      const arrived = handPic && await waitFor(page, (id) => !!window.__mm.session.getState().nodes.get(id), handPic, 8000);
      const shows = await showsColour(page, 3100, 3100, RED);
      const held1 = await page.evaluate((h) => window.__mm.assets().then((l) => l.some((a) => a.hash === 'sha256:' + h)), handHash);
      const st = await page.evaluate(tabNow);
      const gets1 = asked1.filter((a) => a === 'GET ' + handHash).length, puts1 = asked1.filter((a) => a.startsWith('PUT')).length;
      check(`H1.22. A1: the hand imports a PNG (${(out || '').slice(0, 70)}) — the relay holds its bytes by their hash (${onRelay.status}), and the tab, which had none of them, asks the relay for them by that hash (${gets1} GET), keeps them in its own asset store (${held1 ? 'held now' : 'not held'}) and DRAWS it: the canvas at its centre is ${JSON.stringify(shows.got)}, the red of the bytes — it put nothing on the relay (${puts1} PUT) and the model was not asked (${asked()} calls)`,
        !!handPic && onRelay.status === 200 && arrived && gets1 >= 1 && puts1 === 0 && held1 && shows.ok && asked() === 1 && st.working.length === 0, { out, onRelay: onRelay.status, arrived, held1, gets1, puts1, asked1, shows, calls: model.calls.length });
    });

    let tabPicId = null, tabPicHash = null;
    let page2 = null;
    await record('H1.23', async () => {
      // The tab imports a picture of its own, in its view, by the surface's own door.
      await page.evaluate(() => window.__mm.setView(1, -5000, -5000));
      const imported = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const g = c.getContext('2d'); g.fillStyle = 'rgb(50,70,210)'; g.fillRect(0, 0, 64, 64);
        const file = await new Promise((ok) => c.toBlob((b) => ok(new File([b], 'sky.png', { type: 'image/png' })), 'image/png'));
        const r = await window.__mm.importPictures([file], { view: { minX: 5000, minY: 5000, maxX: 5400, maxY: 5300 } });
        const ev = window.__mm.session.getEvents().filter((e) => e.type === 'import' && e.asset).pop();
        return { ids: r.ids, asset: ev && ev.asset };
      });
      tabPicId = imported.ids[0] || null;
      tabPicHash = imported.asset ? imported.asset.replace(/^sha256:/, '') : null;
      const putOnRelay = await until(async () => tabPicHash && (await fetch(`${RELAY}/rooms/${ROOM}/assets/${tabPicHash}`, { method: 'HEAD' })).status === 200, 8000);
      // A second tab: its own context, so its own IndexedDB and nothing of the first's asset store.
      const guards2 = await freshContext(browser, { origins: [servers.staticOrigin, model.origin], label: 'hand-2' });
      guardsList.push(guards2);
      await guards2.context.addInitScript(johnsTab, 'maria');
      await guards2.context.route((url) => url.port === '8020', async (route) => { toJohnsRelay.push(route.request().method() + ' ' + route.request().url()); await route.abort('blockedbyclient'); });
      // What the second tab asks of the relay's assets, counted: it must GET what it draws and never PUT what it was only shown.
      const asked2 = [];
      await guards2.context.route((url) => url.pathname.includes('/assets/'), async (route) => { asked2.push(route.request().method() + ' ' + route.request().url().split('/assets/')[1]); await route.continue(); });
      page2 = await guards2.context.newPage();
      await page2.goto(address, { waitUntil: 'load', timeout: 60000 });
      await page2.waitForFunction(() => window.__mm && window.__mm.folder && window.__mm.folder().how === 'live', null, { timeout: 20000 });
      const has = await waitFor(page2, (id) => !!window.__mm.session.getState().nodes.get(id), tabPicId, 12000);
      const b = await boundsOfIn(page, tabPicId);
      await page2.evaluate(([x, y]) => window.__mm.setView(1, -(x - 100), -(y - 100)), [b.minX, b.minY]);
      const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const shows = await showsColour(page2, centre.x, centre.y, BLUE);
      const after = await page2.evaluate((h) => window.__mm.assets().then((l) => l.some((a) => a.hash === 'sha256:' + h)), tabPicHash);
      // …and the hand's swatch, which the second tab never saw imported either.
      const hb = await boundsOfIn(page2, handPic);
      await page2.evaluate(([x, y]) => window.__mm.setView(1, -(x - 100), -(y - 100)), [hb.minX, hb.minY]);
      const hs = await showsColour(page2, (hb.minX + hb.maxX) / 2, (hb.minY + hb.maxY) / 2, RED);
      const gets = (h) => asked2.filter((a) => a === 'GET ' + h).length;
      const puts = asked2.filter((a) => a.startsWith('PUT')).length;
      check(`H1.23. A1: a picture the first tab imports (${tabPicId}) is put on the relay by its hash (${putOnRelay}), and a SECOND tab — a context of its own, so none of its bytes — asks the relay for it by that hash (${gets(tabPicHash)} GET), keeps it in its own asset store (${after ? 'held now' : 'not held'}) and draws it — ${JSON.stringify(shows.got)}, the blue of the bytes — and the hand's swatch the same way (${gets(handHash)} GET, ${JSON.stringify(hs.got)}); it put nothing on the relay itself (${puts} PUT)`,
        !!tabPicId && putOnRelay && has && gets(tabPicHash) >= 1 && gets(handHash) >= 1 && puts === 0 && after && shows.ok && hs.ok, { tabPicId, tabPicHash, putOnRelay, has, after, shows, hs, asked2 });
    });

    await record('H1.24', async () => {
      // The hand's look says the room holds the pictures; canvas_see draws the hand's PNG in, and gives the tab's photo — a WebP,
      // which the hand has no decoder for — as its own image, the very bytes the tab kept, after a frame in the composite.
      const look = await lookUntil((l) => /in the room/.test(markLine(l, tabPicId) || ''), 8000);
      const seenTab = await hand.call('canvas_see', { ids: [tabPicId], size: 220 });
      const imgs = (seenTab.content || []).filter((c) => c.type === 'image');
      const own = imgs.find((c) => c.mimeType !== 'image/png');
      const ownHash = own && sha(Buffer.from(own.data, 'base64'));
      const seenHand = await hand.call('canvas_see', { ids: [handPic], size: 200 });
      const handImg = (seenHand.content || []).find((c) => c.type === 'image');
      const dec = handImg && decodePNG(Buffer.from(handImg.data, 'base64'));
      const mid = dec && [...dec.rgba.slice(((dec.height >> 1) * dec.width + (dec.width >> 1)) * 4, ((dec.height >> 1) * dec.width + (dec.width >> 1)) * 4 + 3)];
      check(`H1.24. A1: the hand's look says the first tab's picture is one the room holds ("${(markLine(look, tabPicId) || '').slice(0, 130)}"); canvas_see of it hands back the bytes the tab kept as an image of their own (${own ? own.mimeType : 'none'}, hash ${ownHash === tabPicHash ? 'the asset\'s' : ownHash}); and canvas_see of the hand's own PNG draws its pixels where it stands (${JSON.stringify(mid)})`,
        /a picture sky\.png/.test(markLine(look, tabPicId) || '') && /in the room/.test(markLine(look, tabPicId) || '') && !!own && ownHash === tabPicHash && !!mid && close3(mid, RED, 6), { line: markLine(look, tabPicId), mimes: imgs.map((c) => c.mimeType), ownHash, tabPicHash, mid, text: textOf(seenTab) });
      if (page2) await page2.close().catch(() => {});
    });

    await record('H1.25', async () => {
      // The Worker's logic in Node with a key per room: what relay.dyna.ink does, in the gate.
      const SECRET = 'the-gate-secret';
      const worker = await startDevRelay({ MM_RELAY_SECRET: SECRET });
      const room = 'keyed-room';
      const roomKey = await keyForRoom(SECRET, room);
      const asked3 = [];
      const addr = `${servers.staticOrigin}/Demos/session-engine.html?live=${room}&relay=${encodeURIComponent(worker.url)}&key=${encodeURIComponent(roomKey)}&nosw=1`;
      let page3 = null, page4 = null;
      try {
        const g3 = await freshContext(browser, { origins: [servers.staticOrigin, model.origin], label: 'hand-3' });
        guardsList.push(g3);
        await g3.context.addInitScript(johnsTab, 'nell');
        await g3.context.route((url) => url.pathname.includes('/assets/'), async (route) => { const r = route.request(); asked3.push(r.method() + ' ' + (r.headers().authorization ? 'bearer' : 'open') + (r.url().includes('key=') ? '+query' : '')); await route.continue(); });
        page3 = await g3.context.newPage();
        await page3.goto(addr, { waitUntil: 'load', timeout: 60000 });
        await page3.waitForFunction(() => window.__mm && window.__mm.folder && window.__mm.folder().how === 'live', null, { timeout: 20000 });
        await page3.evaluate(() => window.__mm.setView(1, -7000, -7000));
        const done = await page3.evaluate(async () => {
          const c = document.createElement('canvas'); c.width = 48; c.height = 48;
          const g = c.getContext('2d'); g.fillStyle = 'rgb(200,150,20)'; g.fillRect(0, 0, 48, 48);
          const file = await new Promise((ok) => c.toBlob((b) => ok(new File([b], 'gold.png', { type: 'image/png' })), 'image/png'));
          const r = await window.__mm.importPictures([file], { view: { minX: 7000, minY: 7000, maxX: 7400, maxY: 7300 } });
          const ev = window.__mm.session.getEvents().filter((e) => e.type === 'import' && e.asset).pop();
          return { id: r.ids[0], asset: ev && ev.asset };
        });
        const hash = done.asset && done.asset.replace(/^sha256:/, '');
        const held = await until(async () => hash && (await fetch(`${worker.url}/rooms/${room}/assets/${hash}`, { method: 'HEAD', headers: { authorization: 'Bearer ' + roomKey } })).status === 200, 8000);
        const refused = hash ? (await fetch(`${worker.url}/rooms/${room}/assets/${hash}`, { method: 'HEAD' })).status : 0;
        // Another tab, a context of its own, with the same key.
        const g4 = await freshContext(browser, { origins: [servers.staticOrigin, model.origin], label: 'hand-4' });
        guardsList.push(g4);
        await g4.context.addInitScript(johnsTab, 'omar');
        page4 = await g4.context.newPage();
        await page4.goto(addr, { waitUntil: 'load', timeout: 60000 });
        await page4.waitForFunction(() => window.__mm && window.__mm.folder && window.__mm.folder().how === 'live', null, { timeout: 20000 });
        const has = await waitFor(page4, (id) => !!window.__mm.session.getState().nodes.get(id), done.id, 12000);
        const b = await boundsOfIn(page3, done.id);
        await page4.evaluate(([x, y]) => window.__mm.setView(1, -(x - 100), -(y - 100)), [b.minX, b.minY]);
        const shows = await showsColour(page4, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, [200, 150, 20], 12000);
        const bearer = asked3.filter((a) => a.startsWith('PUT bearer')).length;
        check(`H1.25. A1, a keyed Worker relay: a tab joined with ?key= puts its picture by Authorization: Bearer (${JSON.stringify(asked3)}) and the key is in no asset address; the Worker holds it for that key (${held}) and refuses it without one (${refused}); a second tab, a context of its own, with the same key, draws it — ${JSON.stringify(shows.got)}`,
          !!hash && held && refused === 401 && bearer === 1 && !asked3.some((a) => a.includes('+query')) && has && shows.ok, { done, held, refused, asked3, has, shows });
      } finally {
        if (page3) await page3.close().catch(() => {});
        if (page4) await page4.close().catch(() => {});
        await worker.close().catch(() => {});
      }
    });

    // ---- A2. The hand organises notes (PLAN-IPAD-NOTES): a region round his marks, a find, a move it may not make ----
    // The hand makes a region round his box and his word — a region holds by where things stand and moves nothing — and the
    // tab shows it in the board's outline with what it holds; the hand finds his words; and it is refused when it asks to
    // move what is his, while what it made itself moves and is seen to.
    const eventsOf = (pg, type) => pg.evaluate((t) => window.__mm.session.getEvents().filter((e) => e.type === t).length, type);
    let notesRegion = null, boxBefore = null, wordBefore = null;
    await record('H1.26', async () => {
      await page.evaluate((x) => window.__mm.setView(1, -x, 0), WX);
      boxBefore = await boundsOfIn(page, boxB);
      wordBefore = await boundsOfIn(page, word);
      const movesBefore = await eventsOf(page, 'move');
      const out = textOf(await hand.call('canvas_region', { name: 'Windows', around: [boxB, word] }));
      notesRegion = (out.match(/^(\S+) · a region “Windows”/) || [])[1] || null;
      const there = notesRegion && await waitFor(page, (id) => window.__mm.session.getState().regions.includes(id), notesRegion, 8000);
      // The tab's panel lists it in the board's outline, with what it holds — nothing is held, so the panel is the board's.
      await letGo(page);
      await page.evaluate(() => { const s = window.__mm.session; s.deselect(Date.now()); });
      const row = await waitFor(page, () => !![...document.querySelectorAll('#inspector .outlineRow')].find((r) => /Windows/.test(r.textContent)), null, 6000);
      const rowText = await page.evaluate(() => { const r = [...document.querySelectorAll('#inspector .outlineRow')].find((x) => /Windows/.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
      const info = await page.evaluate((id) => { const mm = window.__mm, s = mm.session.getState(), n = s.nodes.get(id); if (!n) return null; const a = mm.MM.authorOf(n); const d = mm.MM.describeRegion(s, id); return { by: mm.MM.wordOf(s.nodes.get(a)), holds: d.holds, things: d.things }; }, notesRegion);
      const now = await Promise.all([boundsOfIn(page, boxB), boundsOfIn(page, word)]);
      const movesAfter = await eventsOf(page, 'move');
      check(`H1.26. A2: the hand makes a region “Windows” round his box and his word (${(out || '').slice(0, 70)}) — the tab has it, made by ${info && info.by}, in the board's outline ("${rowText}"), holding ${info && info.things.length} (his box and his word among them: ${!!info && info.things.includes(boxB) && info.things.includes(word)}); making it moved nothing of his (${JSON.stringify(now[0]) === JSON.stringify(boxBefore) && JSON.stringify(now[1]) === JSON.stringify(wordBefore) ? 'both marks where they were' : 'MOVED'}, ${movesAfter - movesBefore} move events)`,
        !!notesRegion && there && row && /Windows \d+ marks/.test(rowText) && !!info && info.by === HAND && info.things.includes(boxB) && info.things.includes(word) && /holds .*stroke:john/.test(out)
          && JSON.stringify(now[0]) === JSON.stringify(boxBefore) && JSON.stringify(now[1]) === JSON.stringify(wordBefore) && movesAfter === movesBefore, { out, there, rowText, info, now, boxBefore, wordBefore });
    });

    await record('H1.27', async () => {
      // A find, answered: his words — the label he typed, what the hand read from his writing, the region's own name — each with the id and the place.
      const byLabel = textOf(await hand.call('canvas_find', { query: 'outlet' }));
      const byRead = textOf(await hand.call('canvas_find', { query: 'window' }));
      const byRegion = textOf(await hand.call('canvas_find', { query: 'windows' }));
      const none = textOf(await hand.call('canvas_find', { query: 'zzyzx' }));
      // The tab asks core the same question of the same board, and finds the hand's region by its name.
      const tabFinds = await page.evaluate(() => {
        const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
        const groups = MM.searchBoards([{ id: 'room', name: 'room', recency: 1, entries: MM.searchEntriesOf(s) }], 'windows');
        return (groups[0] ? groups[0].hits : []).map((h) => ({ id: h.id, kind: h.kind, what: h.what }));
      });
      check(`H1.27. A2: the hand finds his words — “outlet” is the label on his box (${(byLabel.split('\n').find((l) => l.includes(boxB)) || '').slice(0, 90)}), “window” the transcript on his word and the region's name (${(byRead.split('\n').find((l) => l.includes(word)) || '').slice(0, 60)}), “windows” the region it made (${(byRegion.split('\n').find((l) => l.includes(notesRegion)) || '').slice(0, 60)}) — and nothing says “zzyzx”; the tab's own Find on the same board finds that region too (${JSON.stringify(tabFinds.map((h) => h.kind))})`,
        byLabel.includes(boxB) && /label on a box/.test(byLabel) && byRead.includes(word) && /read writing/.test(byRead) && byRegion.includes(notesRegion) && /a region/.test(byRegion) && /nothing says “zzyzx”/.test(none)
          && tabFinds.some((h) => h.id === notesRegion && h.kind === 'region'), { byLabel, byRead, byRegion, none, tabFinds });
    });

    await record('H1.28', async () => {
      // John's ruling (2 Oct 2026, A2b: "ya claude can move marks"): the hand moves what is his — his box, his word, and the
      // region that carries them — says whose it moved, and the tab SAYS it too, attributed. His undo is his own (L2j) and
      // does not reach the hand's move; his way back is to move it himself or to ask the hand, which moves it back.
      const movesBefore = await eventsOf(page, 'move');
      const asBox = textOf(await hand.call('canvas_move', { ids: [boxB], dx: 40, dy: 30 }));
      const boxMoved = await waitFor(page, ([id, x]) => { const n = window.__mm.session.getState().nodes.get(id), b = n && window.__mm.MM.boundsOf(n); return !!b && Math.abs(b.minX - x) < 1; }, [boxB, boxBefore.minX + 40], 8000);
      // The tab says it in words: who, how many of his, that his undo does not reach it, and the way back.
      const told = await waitFor(page, () => /claude moved 1 of your marks/.test(document.getElementById('status').textContent), null, 6000);
      const status = await page.evaluate(() => (document.getElementById('status').textContent || '').replace(/\s+/g, ' ').trim());
      const asWord = textOf(await hand.call('canvas_move', { ids: [word], dx: 40, dy: 30 }));
      const asRegion = textOf(await hand.call('canvas_move', { ids: [notesRegion], dx: 10, dy: 10 }));
      await sleep(500);
      const afterRegion = await Promise.all([boundsOfIn(page, boxB), boundsOfIn(page, word)]);
      const movesAfter = await eventsOf(page, 'move');
      // His undo takes back HIS last act, not the hand's move (per-hand undo, L2j).
      await letGo(page);
      await page.click('#undoBtn');
      await sleep(300);
      const afterUndo = await boundsOfIn(page, boxB);
      // The way back: the hand moves them back.
      const back1 = textOf(await hand.call('canvas_move', { ids: [notesRegion], dx: -10, dy: -10 }));
      const back2 = textOf(await hand.call('canvas_move', { ids: [boxB, word], dx: -40, dy: -30 }));
      const home = await waitFor(page, ([a, b]) => { const mm = window.__mm, s = mm.session.getState(), q = (id) => mm.MM.boundsOf(s.nodes.get(id)); return Math.abs(q(a).minX - b[0]) < 1 && Math.abs(q(a).minY - b[1]) < 1; }, [boxB, [boxBefore.minX, boxBefore.minY]], 8000);
      const sunBefore = await boundsOfIn(page, sun);
      const own = textOf(await hand.call('canvas_move', { ids: [sun], dx: 0, dy: 120 }));
      const moved = await waitFor(page, ([id, y]) => { const n = window.__mm.session.getState().nodes.get(id), b = n && window.__mm.MM.boundsOf(n); return !!b && Math.abs(b.minY - y) < 1; }, [sun, sunBefore.minY + 120], 8000);
      check(`H1.28. A2b: the hand moves his box ("${asBox.split('\n')[0].slice(0, 70)}") — the tab shows it moved by 40,30 and says so in the status line, attributed ("${status.slice(0, 120)}"); his word and the region round them ("${asRegion.split('\n')[0].slice(0, 80)}") move too (${movesAfter - movesBefore} move events); his undo does not take the hand's move back (his box still ${Math.round(afterUndo.minX - boxBefore.minX)} right of where it stood); the hand moves them back and the tab sees it home; its own circle moves by 120 and says no one else's ("${own.split('\n')[0].slice(0, 40)}")`,
        /^moved 1 mark — 1 of john’s/m.test(asBox) && /^moved 1 mark — 1 of john’s/m.test(asWord) && /^moved \d+ marks — \d+ of john’s[^\n]*with what the region holds/m.test(asRegion) && boxMoved && told && /claude moved 1 of your marks/.test(status) && /your undo does not reach/.test(status) && /ask Claude/.test(status)
          && movesAfter - movesBefore === 3 && Math.abs(afterRegion[0].minX - (boxBefore.minX + 50)) < 1 && Math.abs(afterUndo.minX - (boxBefore.minX + 50)) < 1
          && /^moved/m.test(back1) && /^moved 2 marks — 2 of john’s/m.test(back2) && home && /^moved 1 mark\b/m.test(own) && !/ of john/.test(own.split('\n')[0]) && moved,
        { asBox, asWord, asRegion, status, own, afterRegion, afterUndo, boxBefore, back1, back2, movesBefore, movesAfter, boxMoved, told, home, moved });
    });

    // ---- CG7a. The formats as they flow between the page and the hand (V1-SPEC §3.13) ----
    // The page writes its board as a bundle with its own code (18-out.js over 17-bundle.js) and the hand reads it into a scratch
    // session; the hand writes its bundle and its SVG (canvas_export, with the page's own functions taken out of those fragments)
    // and the page reads the bundle with its own reader. Reading never writes to the room: the hand's own log is the same after.
    await record('H1.29', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'mm-hand-formats-'));
      try {
        await letGo(page);
        const handLog = () => hand.call('canvas_look', {}).then((r) => textOf(r).split('\n').slice(1).join('\n'));
        const lookBefore = await handLog();
        const file = join(dir, 'page.dyna.zip');
        let made = null, said = '';
        const agreed = await until(async () => {
          made = await page.evaluate(async () => { const r = await window.__mm.exportBundle(); return { events: r.events, assets: r.assets, missing: r.missing, bytes: Array.from(new Uint8Array(await r.blob.arrayBuffer())) }; });
          writeFileSync(file, Buffer.from(made.bytes));
          said = textOf(await hand.call('canvas_import', { path: file }));
          return /all read the same · 0 only in this file · 0 only in the room/.test(said);
        }, 12000);
        const compared = (said.match(/^compared with the board in the room: (.+)$/m) || [])[1] || '';
        const writer = (said.match(/who made them reads from the writer's side: (\d+) things?/) || [])[1];
        // The hand's bundle, read by the page's own reader.
        const out = textOf(await hand.call('canvas_export', { format: 'bundle' }));
        const path = (out.match(/^path: (.+)$/m) || [])[1];
        const handEvents = Number((out.match(/\b(\d+) events\b/) || [])[1]);
        const probe = path ? await page.evaluate((b) => window.__mm.bundleProbe(new Uint8Array(b)), Array.from(readFileSync(path))) : null;
        const format = await page.evaluate(() => window.__mm.MM.LOG_FORMAT);
        // The hand's SVG, and the page's own, of the same board: the ink is the same paths, in the same order.
        const handSvg = (await hand.call('canvas_export', { format: 'svg' })).content.filter((c) => c.type === 'text').pop().text;
        const pageSvg = await page.evaluate(async () => (await window.__mm.exportSvg()).text);
        const pathsOf = (svg) => (svg.match(/<path [^>]*>/g) || []);
        const handPaths = pathsOf(handSvg), pagePaths = pathsOf(pageSvg);
        const lookAfter = await handLog();
        check(`H1.29. CG7a: the page's own bundle (${made && made.events} events, ${made && made.assets} pictures) imported by the hand into a scratch session says "${compared.slice(0, 90)}"${writer ? ' and that who made ' + writer + ' of them reads from the writer\'s side' : ''}; the hand's bundle (${handEvents} events) is read by the page's own reader (${probe && probe.ok ? probe.names.length + ' files, ' + probe.events + ' events, header ' + probe.header.format : 'NOT READ'}); the hand's SVG draws ${handPaths.length} paths and the page's ${pagePaths.length}, ${JSON.stringify(handPaths) === JSON.stringify(pagePaths) ? 'the same' : 'DIFFERENT'}; the room is as it was`,
          agreed && !!made && made.events > 20 && /scratch session/.test(said) && /nothing was written to the room/.test(said) && new RegExp('\\b' + made.events + ' events\\b').test(said)
            && !!probe && probe.ok && probe.header.format === format && probe.events === handEvents && probe.names.includes('board.jsonl') && probe.names.some((n) => /^assets\//.test(n))
            && handPaths.length > 5 && JSON.stringify(handPaths) === JSON.stringify(pagePaths) && lookAfter === lookBefore,
          { compared, said: said.slice(0, 900), out, probe: probe && { ok: probe.ok, names: probe.names, events: probe.events }, handPaths: handPaths.length, pagePaths: pagePaths.length, firstDifferent: handPaths.findIndex((p, i) => p !== pagePaths[i]) });
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });

    // ---- The rows of QA-v10 that only John's own hand can walk ----
    check('H1.S1. QA-v10 §1 — letters at any size, words, a line: hello and world written big in his own hand, a tall l with a flick apart, three bubbles and two lines quickly; the panel says a word of 5 strokes, no arrow above 0.3, five marks and not a word — skipped: needs John\'s hand (his x-height 31–40 px, ascenders 72–88 px)', true);
    check('H1.S2. QA-v10 §2 — reading, and the transcript as text: circle hello world and take Read the writing, take “hello world” as text, Show the ink, double-click to edit — skipped: needs John\'s hand (the writing to be read; H1.9 is the hand transcribing a synthetic word, with no model asked)', true);
    check('H1.S3. QA-v10 §3 — text folds back from ink: three passes across world in the text, write there above the gap, Fold “there” into the text, undo twice — skipped: needs John\'s hand (the scratch and the writing beside the gap)', true);
    check('H1.S4. QA-v10 §5 row 2 — a brief that fails leaves nothing behind: type draw a svg of a flower at a circled shape to a small model, thirty seconds, Esc — skipped: needs a small model that fails on its own terms (the models scenario stops a failing model with a stub; QA-v1 walks this row by hand)', true);

    // ---- The invariant: Tier 1 before a model ----
    await record('H1.Y', async () => {
      await letGo(page);
      await sleep(500);
      const now = await page.evaluate(() => { const mm = window.__mm, MM = mm.MM, s = mm.session.getState(); const seat = typeof mm.seat === 'function' ? mm.seat() : null; return { working: mm.working(), pending: MM.pendingBriefs(s).length, seated: !!(seat && seat.seated), agents: mm.agents.map((a) => a.config.model), lastCalls: mm.lastCalls().map((c) => c.line) }; });
      check(`H1.Y. Tier 1 before a model: across the hand's arrival and its looking, drawing, saying, proposing, labelling, transcribing and writing, an undo, a reload and all of §4, §6 and §7, the gate's own model was asked ${asked()} time${asked() === 1 ? '' : 's'} — once, by the one deliberate act (What is this?, H1.19) — the working registry is empty, no brief was parked (${now.pending}), the hand did not take the seat (${now.seated}), and no request to a real model was attempted (${guards.modelAttempts.length})`,
        asked() === deliberate && deliberate === 1 && now.working.length === 0 && now.pending === 0 && !now.seated && guards.modelAttempts.length === 0, { calls: model.calls, now, attempts: guards.modelAttempts });
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
