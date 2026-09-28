// The canvas's seat (V1-PLAN J4): Claude Code, over MCP, as a model the field
// can ask — as a scenario of the gate.
//
//     node e2e/run.mjs seat
//
// The gate starts a relay of its own on a free port of 127.0.0.1 (never :8020,
// where John's own room may be), and on it `Demos/mcp.mjs` as the seat's
// answerer — driven from this script over stdio, the way Claude Code drives it
// — and `Demos/seat-watch.mjs` beside it, the way a Claude Code session is woken.
// The page joins room "claude" there, takes the seat, and asks through the
// field. Every question is parked in the room as a brief, listed by
// `canvas_pending` and answered by `canvas_answer`, and the page takes each
// answer exactly as it takes a model's. No model is asked: the pane's probe for
// local servers is answered "none here" before it leaves (`noLocalServers`), as
// a machine with no Ollama and no LM Studio answers it, and the gate's guard
// still stands behind that for everything else.
//
// The records:
//   J4.0  no room: the seat's entry leads the models pane and says how to reach Claude, in one
//         sentence, with nothing to join; the key form no longer offers the door, which stands
//         under "advanced"
//   J4.1  in the room with Claude's hand present: "Claude Code — in this room" leads the pane,
//         and one tap takes the seat — a model that sees, on this machine, at the front
//   J4.2  What is this? on two boxes parks a brief (the watcher prints one line); canvas_pending
//         lists it with its key, what was asked, the marks and the contract; canvas_answer lands
//         the readings, attributed to the seat; no card is drawn for the brief or its reply
//   J4.3  Read the writing on a word parks a read, and the hand is handed the ink as a PNG; the
//         transcript lands on the word
//   J4.4  a refusal is said, and nothing lands
//   J4.5  a brief nobody answers: Esc withdraws it, and the hand no longer lists it; the watcher
//         printed one line per brief, four, and nothing else
//   J4.6  a reload finds the answered brief still paired, by the brief's own id
//   J4.7  "with Claude" in the Live pane joins the room and takes the seat in one act, and the
//         status line says Claude is here and will read for you
//   J4.8  nothing reached for :8020 — a request there is refused before it leaves, and counted

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startRelay } from '../Demos/relay.mjs';
import { sleep } from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SEAT = 'Claude Code (MCP hand)';

/**
 * The models pane probes :11434 and :1234 when it opens. Here that probe is
 * answered the way a machine with neither server answers it — refused before
 * it leaves — so opening the pane is not a request to a model. Installed
 * before the page's own scripts; every other request goes out as it would.
 */
function noLocalServers() {
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):(11434|1234)\//.test(url)) return Promise.reject(new TypeError('no local model server here — the gate'));
    return real(input, init);
  };
}

/** `Demos/mcp.mjs` as a child process, spoken to over stdio: the seat's answerer. */
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

/** `Demos/seat-watch.mjs`, its stdout collected line by line: what would wake a Claude Code session. */
function spawnWatch(env) {
  const lines = [];
  const child = spawn(process.execPath, [join(root, 'Demos', 'seat-watch.mjs')], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) lines.push(l); } });
  child.on('error', (err) => lines.push('(the watcher did not start: ' + err.message + ')'));
  return { lines, stop: () => child.kill() };
}

const textOf = (res) => ((res && res.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const keysIn = (text) => [...String(text).matchAll(/^brief (\S+) · /gm)].map((m) => m[1]);

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

/** What the page holds of the seat and the room. */
function seatNow() {
  const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
  const f = mm.folder();
  const seat = typeof mm.seat === 'function' ? mm.seat() : null;
  return {
    room: f.how === 'live' ? f.name : null,
    seat,
    front: mm.agents[0] ? { id: mm.agents[0].id, name: mm.agents[0].name, vision: !!mm.agents[0].config.vision, locality: MM.providerLocality(mm.agents[0].config) } : null,
    pending: typeof MM.pendingBriefs === 'function' ? MM.pendingBriefs(s).map((b) => ({ key: b.key, ask: b.ask, about: b.about })) : null,
    status: (document.getElementById('status').textContent || '').trim(),
    working: mm.working(),
    summon: s.summon ? s.summon.enclosedIds.slice() : null,
    selection: s.selection.length,
  };
}

/** The seat's readings on a mark: every interpretation the seat is the source of. */
function seatReadings(id) {
  const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
  const n = s.nodes.get(id);
  return n ? MM.interpretationsOf(n, s.nodes).filter((r) => r.sourceName === 'Claude Code (MCP hand)').map((r) => ({ label: r.label, weight: +r.weight.toFixed(2), blessed: !!r.blessed })) : null;
}

async function openModels(page) {
  const open = await page.evaluate(() => !document.getElementById('modelPanel').hasAttribute('hidden'));
  if (open) return;
  await page.click('#ccBtn');
  await page.click('#modelBtn');
  await page.waitForFunction(() => !document.getElementById('modelPanel').hasAttribute('hidden'), null, { timeout: 5000 });
}
async function closeModels(page) {
  const open = await page.evaluate(() => !document.getElementById('modelPanel').hasAttribute('hidden'));
  if (open) await page.click('#modelPanel .paneClose');
}
/** Nothing held and nothing open: the field dismissed by a tap on empty ground, a selection let go. */
async function letGo(page) {
  if (await page.evaluate(() => !!window.__mm.session.getState().summon)) {
    await page.mouse.click(1100, 760);
    await sleep(60);
  }
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  if (await page.evaluate(() => window.__mm.session.getState().selection.length > 0)) {
    await page.keyboard.press('Escape');
    await sleep(40);
  }
}
async function holdOn(page, pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  const opened = await page.waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 5000 }).then(() => true, () => false);
  await page.mouse.up();
  await sleep(60);
  return opened;
}
async function takePill(page, label) {
  const pill = page.locator('#summon .pill.item', { hasText: label });
  if (await pill.count() !== 1) return false;
  await pill.click({ timeout: 5000 });
  return true;
}
const waitFor = (page, fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
async function until(fn, ms = 8000) { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(80); } return !!(await fn()); }

export async function runSeat(browser, servers, { freshContext, screenshot }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const guardsList = [];
  const toJohnsRelay = [];
  const relay = await startRelay(0);
  const RELAY = 'http://127.0.0.1:' + relay.address().port;
  const ROOM = 'claude';
  const hand = spawnHand({ MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'claude' });
  const watch = spawnWatch({ MM_ROOM: ROOM, MM_RELAY: RELAY });
  let page = null;
  try {
    await hand.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'the gate', version: '0' } });
    hand.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'seat' });
    guardsList.push(guards);
    await guards.context.addInitScript(noLocalServers);
    // :8020 is where a relay on this machine listens by default — John's own room
    // "claude" may be there. Nothing this scenario opens may reach it: the route is
    // registered after the gate's own, so it is asked first, and whatever reaches
    // for it is refused and recorded (the last record).
    await guards.context.route((url) => url.port === '8020', async (route) => { toJohnsRelay.push(route.request().method() + ' ' + route.request().url()); await route.abort('blockedbyclient'); });
    page = await guards.context.newPage();
    const ready = () => page.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
    const inRoom = () => page.waitForFunction(() => window.__mm && window.__mm.folder && window.__mm.folder().how === 'live', null, { timeout: 20000 });

    // ---- J4.0. No room: the entry says how ----
    await record('J4.0', async () => {
      await page.goto(`${servers.staticOrigin}/Demos/session-engine.html?nosw=1`, { waitUntil: 'load', timeout: 60000 });
      await ready();
      await openModels(page);
      const pane = await page.evaluate(() => {
        const seat = document.getElementById('mpSeat');
        const first = document.querySelector('#modelPanel > .mpSection');
        const adv = document.getElementById('mpAdvanced');
        return {
          text: seat ? seat.textContent.replace(/\s+/g, ' ').trim() : null,
          first: first ? first.id : null,
          join: !!document.getElementById('mpSeatJoin'),
          door: document.querySelectorAll('#mpProvider option[value="mcp"]').length,
          advanced: adv ? { tag: adv.tagName, open: !!adv.open, text: adv.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) } : null,
        };
      });
      check(`J4.0. no room: the seat's entry leads the models pane and says how to reach Claude in one sentence — "${pane.text}" — with nothing to join; the key form no longer offers the door, which stands under "advanced", closed`,
        pane.first === 'mpSeat' && /with Claude/.test(pane.text || '') && /\?live=claude/.test(pane.text || '') && !pane.join && pane.door === 0
          && !!pane.advanced && pane.advanced.tag === 'DETAILS' && !pane.advanced.open && /MCP server/.test(pane.advanced.text),
        pane);
    });

    // ---- J4.1. In the room, Claude's hand present: one tap takes the seat ----
    let seatId = null;
    await record('J4.1', async () => {
      await page.goto(`${servers.staticOrigin}/Demos/session-engine.html?live=${ROOM}&relay=${encodeURIComponent(RELAY)}&nosw=1`, { waitUntil: 'load', timeout: 60000 });
      await ready();
      await inRoom();
      await openModels(page);
      const offered = await waitFor(page, () => !!document.getElementById('mpSeatJoin'));
      const entry = await page.evaluate(() => {
        const seat = document.getElementById('mpSeat');
        const first = document.querySelector('#modelPanel > .mpSection');
        return { text: seat ? seat.textContent.replace(/\s+/g, ' ').trim() : null, first: first ? first.id : null, button: (document.getElementById('mpSeatJoin') || {}).textContent || null };
      });
      if (offered) await page.click('#mpSeatJoin');
      const seated = await waitFor(page, () => { const s = window.__mm.seat && window.__mm.seat(); return !!(s && s.seated); });
      const now = await page.evaluate(seatNow);
      seatId = now.seat && now.seat.id;
      check(`J4.1. in room "${ROOM}" with Claude's hand present, the pane leads with "${entry.button}" and one tap takes the seat: ${now.front && now.front.name} at the front of the models, seeing, ${now.front && now.front.locality}`,
        offered && entry.first === 'mpSeat' && /Claude Code — in this room/.test(entry.button || '') && seated && !!now.front && now.front.name === SEAT && now.front.vision && now.front.locality === 'local' && now.front.id === seatId,
        { entry, now });
      await closeModels(page);
    });

    // ---- J4.2. What is this? on two boxes ----
    let boxA = null, boxB = null, k1 = null;
    await record('J4.2', async () => {
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
      await stroke(page, rect(520, 300, 160, 110));
      await stroke(page, rect(740, 300, 160, 110));
      await stroke(page, circle(720, 355, 260));
      await stroke(page, tick(945, 347));
      const held = await waitFor(page, () => { const s = window.__mm.session.getState(); return !!s.summon && s.summon.enclosedIds.length === 2; }, null, 5000);
      const ids = await page.evaluate(() => (window.__mm.session.getState().summon || { enclosedIds: [] }).enclosedIds.slice());
      [boxA, boxB] = ids;
      const took = held && await takePill(page, 'What is this?');
      const parked = await waitFor(page, () => { const MM = window.__mm.MM; return typeof MM.pendingBriefs === 'function' && MM.pendingBriefs(window.__mm.session.getState()).length === 1; }, null, 5000);
      const now = await page.evaluate(seatNow);
      k1 = now.pending && now.pending[0] ? now.pending[0].key : null;
      const heard = await until(() => watch.lines.length >= 1, 5000);
      let listed = '';
      await until(async () => { listed = textOf(await hand.call('canvas_pending', {})); return !!k1 && listed.includes(k1); }, 5000);
      check(`J4.2. What is this? on two boxes parks one brief about them — "${(now.status || '').slice(0, 90)}" — shown working beside them; the watcher prints one line; canvas_pending lists it by the brief's own id, with what was asked, the two marks and the contract`,
        took && parked && !!k1 && now.pending[0].ask === 'what' && now.pending[0].about.join() === ids.join() && now.working.some((w) => w.startsWith('read:' + seatId))
          && heard && watch.lines.length === 1 && watch.lines[0].includes(k1) && /what is this/.test(watch.lines[0])
          && keysIn(listed)[0] === k1 && /what is this/.test(listed) && listed.includes(boxA) && listed.includes(boxB) && /Reply with ONLY a JSON array/.test(listed),
        { took, parked, now, watch: watch.lines, listed: listed.slice(0, 700) });
      const ans = await hand.call('canvas_answer', { key: k1, reply: [{ label: 'pair of cards', confidence: 0.82, reasoning: 'two boxes of one size, side by side on one band' }, { label: 'two windows', confidence: 0.41, reasoning: 'the same two boxes, read as a facade' }] });
      const landed = await waitFor(page, (id) => {
        const mm = window.__mm, MM = mm.MM, s = mm.session.getState(), n = s.nodes.get(id);
        return !!n && MM.interpretationsOf(n, s.nodes).some((r) => r.sourceName === 'Claude Code (MCP hand)');
      }, boxA);
      const reads = await page.evaluate(seatReadings, boxA);
      const after = await page.evaluate(seatNow);
      const cards = await page.evaluate(() => window.__mm.answerCards().map((c) => c.id));
      const reply = await page.evaluate((key) => { const MM = window.__mm.MM; const b = MM.seatBriefs(window.__mm.session.getState()).find((x) => x.key === key); return b && b.reply ? b.reply.id : null; }, k1);
      check(`J4.2b. canvas_answer lands the readings exactly as a model's — held on the group, attributed to the seat, never blessed (${(reads || []).map((r) => r.label + ' ' + r.weight).join(', ')}); the status line says so, and no card is drawn for the brief or its reply`,
        /answered/.test(textOf(ans)) && landed && (reads || []).length >= 1 && reads.every((r) => !r.blessed) && /reads it as pair of cards/.test(after.status) && after.pending.length === 0
          && !!reply && !cards.includes(k1) && !cards.includes(reply),
        { hand: textOf(ans), reads, status: after.status, cards, reply });
    });

    // ---- J4.3. Read the writing on a word ----
    let word = null;
    await record('J4.3', async () => {
      await letGo(page);
      const pts = cursive(560, 640, 240, 40);
      await stroke(page, pts);
      word = await page.evaluate(() => { const s = window.__mm.session.getState(); return s.contentIds[s.contentIds.length - 1]; });
      const opened = await holdOn(page, pts[Math.floor(pts.length / 2)]);
      const took = opened && await takePill(page, 'Read the writing');
      const parked = await waitFor(page, () => window.__mm.MM.pendingBriefs(window.__mm.session.getState()).length === 1, null, 5000);
      const now = await page.evaluate(seatNow);
      const k2 = now.pending && now.pending[0] ? now.pending[0].key : null;
      let res = null;
      await until(async () => { res = await hand.call('canvas_pending', {}); return !!k2 && textOf(res).includes(k2); }, 5000);
      const pic = ((res && res.content) || []).find((c) => c.type === 'image');
      const png = pic ? Buffer.from(pic.data, 'base64') : null;
      check(`J4.3. Read the writing on a word parks a read about it, and canvas_pending hands the hand the word's ink as a PNG (${png ? png.length + ' bytes' : 'none'})`,
        took && parked && !!k2 && now.pending[0].ask === 'read' && now.pending[0].about.includes(word) && /read the writing/.test(textOf(res)) && !!png && png[0] === 0x89 && png.toString('ascii', 1, 4) === 'PNG',
        { opened, took, now, text: textOf(res).slice(0, 300) });
      await hand.call('canvas_answer', { key: k2, reply: [{ text: 'hello', confidence: 0.9 }, { text: 'hallo', confidence: 0.3 }] });
      const read = await waitFor(page, (id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); return !!n && mm.MM.transcriptOf(n) === 'hello'; }, word);
      const status = await page.evaluate(() => (document.getElementById('status').textContent || '').trim());
      check(`J4.3b. the transcript lands on the word — "${status.slice(0, 80)}"`, read && /read “hello”/.test(status), { status });
    });

    // ---- J4.4. A refusal is said ----
    await record('J4.4', async () => {
      await letGo(page);
      const before = await page.evaluate(seatReadings, boxA);
      const opened = await holdOn(page, { x: 520, y: 355 });
      const took = opened && await takePill(page, 'What is this?');
      await waitFor(page, () => window.__mm.MM.pendingBriefs(window.__mm.session.getState()).length === 1, null, 5000);
      const k3 = (await page.evaluate(seatNow)).pending[0]?.key || null;
      await until(async () => !!k3 && textOf(await hand.call('canvas_pending', {})).includes(k3), 5000);
      const ref = await hand.call('canvas_answer', { key: k3, refuse: 'two boxes are not enough to say what they are' });
      const said = await waitFor(page, () => /would not: two boxes are not enough to say what they are/.test(document.getElementById('status').textContent || ''));
      const after = await page.evaluate(seatReadings, boxA);
      const now = await page.evaluate(seatNow);
      check(`J4.4. a refusal is said in the status line — "${now.status.slice(0, 110)}" — and nothing lands`,
        took && !!k3 && /refused/.test(textOf(ref)) && said && /claude would not/.test(now.status) && JSON.stringify(after) === JSON.stringify(before) && now.pending.length === 0,
        { hand: textOf(ref), before, after, now });
    });

    // ---- J4.5. A brief nobody answers: Esc withdraws it ----
    await record('J4.5', async () => {
      await letGo(page);
      const opened = await holdOn(page, { x: 900, y: 355 });
      const took = opened && await takePill(page, 'What is this?');
      await waitFor(page, () => window.__mm.MM.pendingBriefs(window.__mm.session.getState()).length === 1, null, 5000);
      const k4 = (await page.evaluate(seatNow)).pending[0]?.key || null;
      await until(async () => !!k4 && textOf(await hand.call('canvas_pending', {})).includes(k4), 5000);
      await until(() => watch.lines.length >= 4, 5000);
      await letGo(page);
      await page.keyboard.press('Escape');
      const gone = await waitFor(page, () => window.__mm.MM.pendingBriefs(window.__mm.session.getState()).length === 0, null, 5000);
      let listed = '';
      await until(async () => { listed = textOf(await hand.call('canvas_pending', {})); return !!k4 && !listed.includes(k4); }, 5000);
      const now = await page.evaluate(seatNow);
      check(`J4.5. a brief nobody answers: Esc with nothing held withdraws it — "${now.status.slice(0, 60)}" — and canvas_pending no longer lists it`,
        took && !!k4 && gone && !listed.includes(k4) && /stopped 1 model call/.test(now.status) && now.working.length === 0,
        { k4, listed: listed.slice(0, 200), now });
      await sleep(300);
      check(`J4.5b. the watcher printed one line per brief parked — ${watch.lines.length} — and nothing else`,
        watch.lines.length === 4 && watch.lines.every((l) => /^brief \S+ · /.test(l)) && new Set(watch.lines.map((l) => l.split(' ')[1])).size === 4, watch.lines);
    });

    // ---- J4.6. A reload finds the answered brief still paired ----
    await record('J4.6', async () => {
      await page.reload({ waitUntil: 'load', timeout: 60000 });
      await ready();
      await inRoom();
      const back = await waitFor(page, (key) => {
        const MM = window.__mm.MM;
        if (typeof MM.seatBriefs !== 'function') return false;
        const b = MM.seatBriefs(window.__mm.session.getState()).find((x) => x.key === key);
        return !!(b && b.reply);
      }, k1, 10000);
      const paired = await page.evaluate(({ key, a, b }) => {
        const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
        const brief = MM.seatBriefs(s).find((x) => x.key === key);
        const replyNode = brief && brief.reply ? s.nodes.get(brief.reply.id) : null;
        const question = replyNode ? (MM.explanationOf(replyNode) || {}).question : null;
        return { key, about: brief ? brief.about : null, question, pending: MM.pendingBriefs(s).length, want: [a, b] };
      }, { key: k1, a: boxA, b: boxB });
      const reads = await page.evaluate(seatReadings, boxA);
      check(`J4.6. a reload — a new sitting — finds the answered brief still paired by its own id, about the two boxes, the seat's readings still on them, and nothing left waiting`,
        back && paired.question === k1 && JSON.stringify(paired.about) === JSON.stringify(paired.want) && (reads || []).length >= 1 && paired.pending === 0,
        { paired, reads });
    });

    // ---- J4.7. "with Claude": the room and the seat in one act ----
    await record('J4.7', async () => {
      const p2 = await guards.context.newPage();
      try {
        await p2.goto(`${servers.staticOrigin}/Demos/session-engine.html?nosw=1`, { waitUntil: 'load', timeout: 60000 });
        await p2.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
        await p2.click('#ccBtn');
        await p2.click('#liveBtn');
        await p2.waitForFunction(() => !document.getElementById('livePanel').hasAttribute('hidden'), null, { timeout: 5000 });
        // The gate's own relay, never :8020 — "with Claude" keeps a relay that is typed.
        await p2.fill('#liveRelay', RELAY);
        await p2.click('#liveClaude');
        const both = await waitFor(p2, () => { const mm = window.__mm; const s = mm.seat && mm.seat(); return mm.folder().how === 'live' && !!(s && s.seated); }, null, 10000);
        const said = await waitFor(p2, () => /Claude is here and will read for you/.test(document.getElementById('status').textContent || ''), null, 5000);
        const now = await p2.evaluate(seatNow);
        check(`J4.7. "with Claude" in the Live pane joins room "${now.room}" and takes the seat in one act — "${now.status.slice(0, 80)}"`,
          both && said && now.room === ROOM && !!now.front && now.front.name === SEAT, { now });
      } finally {
        await p2.close().catch(() => {});
      }
    });

    check(`J4.8. nothing the scenario opened reached for :8020, where a relay on this machine listens by default — ${toJohnsRelay.length} request${toJohnsRelay.length === 1 ? '' : 's'} refused`, toJohnsRelay.length === 0, toJohnsRelay.slice(0, 5));
  } catch (err) {
    check(`the scenario itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    if (page) await screenshot(page, 'seat');
  } finally {
    await hand.stop();
    watch.stop();
    relay.close();
  }
  if (page && steps.some((s) => !s.ok)) await screenshot(page, 'seat');
  return { steps, guards: guardsList };
}
