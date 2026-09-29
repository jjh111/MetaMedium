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

    check(`H1.9. nothing the scenario opened reached for :8020, where a relay on this machine listens by default — ${toJohnsRelay.length} request${toJohnsRelay.length === 1 ? '' : 's'} refused`, toJohnsRelay.length === 0, toJohnsRelay.slice(0, 5));
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
