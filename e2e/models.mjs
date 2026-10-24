// A hosted model is asked, and says why when it cannot be (V1-PLAN J5), as a
// scenario of the gate.
//
//     node e2e/run.mjs models
//
// John joined GLM Flash from OpenRouter with a saved key and could not get the
// canvas to send it anything: whether a model could see was guessed from its
// id (and "glm" was not in the guess), a reasoning model's answer could arrive
// outside `content` and read as none, and every failure was one fleeting
// sentence. This drives the real transport against a provider that is not one
// — `startModelStub` (servers.mjs), an OpenAI-compatible endpoint on 127.0.0.1
// answering with OpenRouter's shapes, recorded in core's
// `llm/fixtures` — through the models pane and the field, with the real
// pointer. No real vendor is asked: the gate's guard still fails a run that
// reaches one (M0), and nothing on this machine is probed — the page's own
// stand-in answers Ollama's list and LM Studio does not answer (M1).
//
// The records:
//   M0   the guard still stops a real model host, and lets the stub's own origin by
//   M1   the models pane: nothing on this machine reached; one model suggested a job —
//        the smallest that sees for reading, a mid-size one for What is this? — and
//        the rest behind "all 13 models"
//   M2   What is this? with no model joined opens no pane: the field says what it needs,
//        the status line says it once, the ask is kept; "choose one" opens the pane
//   M3   an id the endpoint does not list is refused, with the nearest ids
//   M4   GLM 4.7 Flash joins as a custom endpoint with the test key: the provider's
//        list says it reads text only — and the kept What is this? runs at once: its
//        readings land, in words and with no "llm:", and its row says so
//   M5   Read the writing with no model that can see: which joined model cannot, and
//        why — in the status line and the field; kept; no call, no pane
//   M6   a 401: a model joined with a wrong key, tried — the row keeps the reason
//   M7   a reasoning-only reply, tried — the row keeps the reason
//   M8   GLM 5.3 Flash joins, its key remembered: the list says it sees, and the kept
//        read runs at once — one image, to it alone; the word holds “hello”
//   M9   try it: one tiny prompt, the reply in the row, the budget sent
//   M10  What is this? again: every joined model asked once, each row its outcome
//   M11  a reload: the remembered pick rejoins, sees again, and answers
//   M12  the key is nowhere it was not asked to be: not the log, the board's journal,
//        a cache, the DOM or the address — only where "remember" put it
//
// Seats per job (V1-PLAN I7, PLAN-IPAD-NOTES §3), in a context of its own (a clean device):
//   M13  one key, entered once, serves the writer, the reader and the decider: three joins, the key typed
//        for the first only, every call the stub saw carried it; each seat says its model and its last call
//   M14  Read the writing asks the reader seat alone; What is this? the writer alone; a model joined with
//        no seat is asked by neither once seats are chosen; the decider is never asked by either
//   M15  Which is it? is offered when two definitions tie and a decider is seated — and only then; taking
//        it asks the decider once, and its answer stands beside the engine's, attributed, at 0.99 and over;
//        an answer under the floor is said and holds nothing
//   M16  a reload keeps the seats (the key from this device, because "remember" put it there)
//   M17  the key is nowhere it was not asked to be, across every seat — only under mm-model-keys
//   M18  a device where the key was not remembered: the seats come back, no key in any store; the key
//        entered once again serves every seat that waits for it
//   M19  an old remembered pick and key become the writer seat (and the reader, for a model that sees)
//
// A model joined stays joined across boards (V1-PLAN I7's finding, 1 Oct 2026), in a context of its own:
//   M20  a board loaded in place takes every join with it — and the model joined before is asked on the
//        next: What is this? on a new board made through the boards pane answers (the stub asked once),
//        joins there once and nowhere it was not asked
//   M21  back on the first board, whose log already holds the join, it answers too — no second join —
//        and again on the second, which now holds its own
//   M22  a board only looked at is never written: switching through boards and back leaves a board with
//        no event, and not one join is added to a board that was not asked on
//   M23  Reset and an example opened are loads in place too: the model answers on each
//   M24  (V1-PLAN / PLAN-IPAD-NOTES I8, read my notes) Read these with no model that sees is kept — no pane, no call;
//        the reader joins and it runs: ONE call, to the reader alone, one image, the sheet of three lines, and
//        each line's reading lands where it was written (a line of two words one word on each)
//   M24b the batch is shown while it runs, on the marks, and said when it lands; drawing the lines asked nothing
//   M24c the reader's row says what the call cost: the lines, the payload in KB, the seconds a line; the payload is small
//   M25  a line the reply leaves out fails by itself, and says why, in the status line and for the line; the others hold
//   M26  lines already read are skipped (one line asked); Read these again, typed, asks for all of them — in calls of
//        at most a sheet's lines
//   M26b "read the board", typed with one word held, reads every line of the board: a sheet of eight and a sheet of one
//   M27  Esc in the middle of a batch stops the rest: the second call is never made, and nothing lands
//   M28  Read the picture: the picture, downscaled, goes to the reader alone; its text lands as a text artifact BESIDE it,
//        held as the reader's, named for its source, editable; the picture stays as it was
//
// dyna.ink's own decider (the audit's S1, S3, D2) — Clef-flash through dyna.ink's relay, no key — pointed at the stub's
// System One route by `?decide=`, which only a page on this machine honours; a clean device of its own:
//   M37  the decider row says "dyna.ink · Clef-flash — no key needed · used only when 99% sure"; nothing is asked at boot,
//        on a hold or on a model's join, and nothing is written to the board for it
//   M38  Which is it? asks it once: a System One body (q1, none_of_these last) whose state holds the group's words and no
//        node id, with no authorization header and its credentials omitted; held at 0.995 as one more reading, attributed
//   M39  an answer at 0.97 is said and holds nothing — the engine's ranking stands
//   M40  a refusal from the relay (429, today's decisions spent) is said in the status line and kept in the seat's row
//   M41  Which diagram is this? on two boxes and a line no notation reads surely: offered, asked once, held as a decision
//        (no reading claimed) — and then Make it Mermaid is offered
//   M42  seated silently, it is never asked on a brief's Enter: the page's boxes stand at once and the writer is asked, no
//        call to the decider; chosen by a tap but with no model to write, still none — and the line never names it
//   M43  chosen, with a writer: a brief's page stands at once while a slow decider thinks, and a stroke drawn meanwhile
//        keeps it — sure of a program, it says the hand drew since and the page stands, the writer asked for the page;
//        with nothing drawn since, sure of a program, the page is taken back and the writer is asked for a program, which
//        lands — one body each, the brief's words in its state, options page, program, answer and none of these
//   M44  under the floor the drawing decides: the page stands and the writer is asked for its words; `run:` asks no decider
//   M45  Make it Mermaid beside a flowchart, then a brief on it: the decider's body carries no id in any spelling, not the
//        hand's own name, and no Mermaid text
//
// dyna.ink's own writer and reader (the audit's UX-04) — a Workers AI model behind dyna.ink's relay, no key — pointed at
// the stub's copy of the relay's chat route (`/ai/v1`, answered with the relay's own checks and shapes) by `?ai=`, which
// only a page on this machine honours; a clean device of its own:
//   M46  once the relay's list answers (one GET, which calls no model), the writer and reader are seated silently: their
//        rows say "dyna.ink’s writer — no key needed" and "dyna.ink’s reader — no key needed", the pane leads with
//        "Using dyna.ink’s own models" and what is sent where, the rest under *more*, and the pane fits and scrolls to
//        Join; nothing is called at boot, on a hold or on opening the field, and nothing is written to the board; try it
//        on the writer’s row asks it one tiny prompt and keeps its reply in the row
//   M47  What is this? asks the house writer once — no key, no cookie, the reply's budget the list's — and its readings
//        land in its name; it joins the board at that first ask, once
//   M48  Read the writing sends the house reader one picture of the ink, and the words land on the mark
//   M49  a brief on Enter: the page's boxes stand at once, and the house writer writes the page's words into them
//   M50  the day's budget spent: the 429 is said in the relay's words — in the status line and in the field, never "needs
//        a model" — and the ask is not lost: kept, it runs when a model of the person's joins, and the house is not asked
//        again; M50d an ask kept so and asked again once the house answers is let go — the field stops saying it waits;
//        M50e a program's brief (run:) and M50f a draw: the house could not answer are kept too, nothing left half made
//   M51  the key is nowhere: no request to the house carried one, and the stub's key is in no store, cache, DOM or address
//   M52  "none" lets the house writer go, remembered: a reload seats the reader alone, What is this? is kept for a model
//        as before; "dyna.ink’s own" takes it back
//   M54  auto-read on, with only dyna.ink's own reader to read: nothing is sent — a stroke of writing, and the board's
//        unread words, go nowhere; dyna.ink's own is asked only when the person asks
//   M55  "none" on the reader: Read the writing sends no picture to dyna.ink — not to its writer either, which sees — and
//        is kept for a model; "dyna.ink’s own" takes it back and the kept read runs on the reader
//   M53  the house not answering (its list refused): nothing is seated, there is no lead, and What is this? is kept for a
//        model as it always was — the one GET, and no chat; M53b the house decider waits for its list too: refused, it is
//        not seated and nothing is asked of it; answered on a reload, it is

import { startModelStub, STUB_KEY, REASONING_ONLY, JEV } from './servers.mjs';
import { isModelRequest } from './guards.mjs';
import { sleep, waitReady, newBoardVia, switchTo } from './keep.mjs';

const WRONG_KEY = 'e2e-wrong-key-not-a-real-key';

/**
 * Nothing on this machine is asked. The pane probes Ollama and LM Studio when
 * it opens; the gate's guard would (rightly) fail any request that reached
 * either, and a run must not depend on what John has running. So, before the
 * page's scripts, `fetch` to those two ports is answered in the page: Ollama's
 * list with a stand-in of thirteen chat models and one embedding model (in
 * Ollama's own /api/tags shape), and LM Studio not at all — as if nothing
 * listened there. Every other request goes out as it would.
 */
function localStandIn() {
  const real = window.fetch.bind(window);
  const m = (name, size, caps) => ({
    name, model: name, modified_at: '2026-09-20T10:00:00Z', size: 1e9, digest: name,
    details: { parent_model: '', format: 'gguf', family: name.split(':')[0], families: [name.split(':')[0]], parameter_size: size, quantization_level: 'Q4_K_M' },
    capabilities: caps,
  });
  const TAGS = { models: [
    m('qwen3.5:27b', '27.8B', ['completion', 'vision', 'tools', 'thinking']),
    m('qwen3.5:9b', '9.7B', ['completion', 'vision', 'tools', 'thinking']),
    m('qwen3.5:0.8b', '0.8B', ['completion', 'vision']),
    m('qwen3:8b', '8.2B', ['completion', 'tools', 'thinking']),
    m('qwen3:30b-a3b', '30.5B', ['completion', 'tools', 'thinking']),
    m('gemma3:4b', '4.3B', ['completion', 'vision']),
    m('gemma3:12b', '12.2B', ['completion', 'vision']),
    m('llama3.2:3b', '3.2B', ['completion', 'tools']),
    m('mistral-small3.2:24b', '24.0B', ['completion', 'vision', 'tools']),
    m('devstral:24b', '23.6B', ['completion', 'tools']),
    m('granite3.3:2b', '2.5B', ['completion', 'tools']),
    m('phi4-mini:3.8b', '3.8B', ['completion', 'tools']),
    m('deepseek-r1:14b', '14.8B', ['completion', 'thinking']),
    m('nomic-embed-text:latest', '137M', ['embedding']),
  ] };
  window.__localAsked = [];
  window.fetch = function (input, init) {
    let u = null;
    try { u = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href); } catch (e) { return real(input, init); }
    const here = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && (u.port === '11434' || u.port === '1234');
    if (!here) return real(input, init);
    window.__localAsked.push(u.port + u.pathname);
    if (u.port === '11434' && u.pathname === '/api/tags') {
      return Promise.resolve(new Response(JSON.stringify(TAGS), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    return Promise.reject(new TypeError('Failed to fetch'));
  };
}


/** One cursive word as points: low, wide, open, turning many times — what the shape rung reads as `text`. */
function wordPoints(x, y, w, h, humps) {
  const p = []; const n = humps * 14;
  for (let i = 0; i <= n; i++) { const t = i / n; const a = t * humps * Math.PI; p.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }); }
  return p;
}

/**
 * Write a page of notes straight into the log — each word one stroke, seconds apart so no two are ever gathered as
 * letters — and return its marks' ids by line. `lines`: one array of [x, y, w, h, humps] words a line.
 */
function writePage(arg) {
  const mm = window.__mm, s = mm.session;
  const word = (x, y, w, h, humps) => { const pts = []; const n = humps * 14; for (let i = 0; i <= n; i++) { const t = i / n; const a = t * humps * Math.PI; pts.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }); } return pts; };
  let t = arg.t0;
  return arg.lines.map((line) => line.map(([x, y, w, h, humps]) => {
    t += 12000;
    s.addStroke(word(x, y, w, h, humps), t, undefined, 1);
    const st = s.getState();
    return st.contentIds[st.contentIds.length - 1];
  }));
}

/** Hold marks the way a tap on a chip does, and wait for the field's pills. */
async function holdIds(page, ids) {
  await page.evaluate((list) => window.__mm.session.summonMarks(list, Date.now()), ids);
  await page.waitForSelector('#summon .pill.item', { timeout: 6000 });
  await sleep(120);
}

/**
 * Take what reads the lines held. Held writing nobody has read is ONE option, its reading (W2, "writing 0.75" —
 * Enter's "read these" too); where the marks held are not all writing, the offer stands as its own pill.
 */
async function takeReadThese(page) {
  return (await takePill(page, 'Read these')) || (await takePill(page, 'writing'));
}

/** The first transcript a mark holds, or null. */
const saidOn = (page, id) => page.evaluate((nid) => { const mm = window.__mm, n = mm.session.getState().nodes.get(nid); const t = n && mm.MM.transcriptsOf(n)[0]; return t ? t.text : null; }, id);

/** Before the page's scripts: every request the page makes to a decider's `/decide` is noted with how it was made — its credentials and its headers' names. */
function recordDecideFetches() {
  const real = window.fetch.bind(window);
  window.__decideFetches = [];
  window.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (/\/decide$/.test(u)) {
      const h = (init && init.headers) || {};
      window.__decideFetches.push({ url: u, method: (init && init.method) || 'GET', credentials: init && init.credentials, headers: Object.keys(h instanceof Headers ? Object.fromEntries(h) : h).map((k) => k.toLowerCase()) });
    }
    return real(input, init);
  };
}

/** Before the page's scripts: every request the page makes to dyna.ink's own writer and reader (`/ai/v1/…`), with how it was made — its method, its credentials and its headers' names. */
function recordHouseFetches() {
  const real = window.fetch.bind(window);
  window.__houseFetches = [];
  window.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (/\/ai\/v1\//.test(u)) {
      const h = (init && init.headers) || {};
      window.__houseFetches.push({ url: u, method: (init && init.method) || 'GET', credentials: init && init.credentials, headers: Object.keys(h instanceof Headers ? Object.fromEntries(h) : h).map((k) => k.toLowerCase()) });
    }
    return real(input, init);
  };
}

/** The page's hand, as the canvas harness has it: strokes dispatched at the canvas. */
function installDraw() {
  const c = document.getElementById('canvas');
  const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
  const stroke = (pts) => { ev('pointerdown', pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ev('pointermove', pts[i].x, pts[i].y); ev('pointerup', pts[pts.length - 1].x, pts[pts.length - 1].y); };
  const line = (a, b, n) => { n = n || 40; const p = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); p.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } return p; };
  const circle = (cx, cy, r, n) => { n = n || 110; const p = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; p.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); } return p; };
  // A word, as one cursive stroke: low, wide, open, turning many times — what the shape rung reads as `text`.
  const word = (x, y, w, h, humps) => { humps = humps || 7; const p = []; const n = humps * 14; for (let i = 0; i <= n; i++) { const t = i / n; const a = t * humps * Math.PI; p.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }); } return p; };
  window.__draw = { stroke, line, circle, word };
}

/**
 * The molecule (three circles, two lines) and a word well below it, clear of the panel on the left
 * (at 1440 × 900 the inspector covers the canvas up to x ≈ 330, and a real pointer lands on it); their ids.
 */
const MOLECULE_AT = { x: 700, y: 300 };
function drawBoard(o) {
  const d = window.__draw, mm = window.__mm, x = o.x, y = o.y;
  d.stroke(d.circle(x, y, 40)); d.stroke(d.circle(x + 200, y, 40)); d.stroke(d.circle(x + 100, y + 160, 40));
  d.stroke(d.line({ x: x + 40, y: y }, { x: x + 160, y: y }, 30)); d.stroke(d.line({ x: x + 28, y: y + 28 }, { x: x + 72, y: y + 132 }, 30));
  const s = mm.session.getState();
  const molecule = s.contentIds.slice(-5);
  d.stroke(d.word(x, y + 360, 220, 44, 7));
  const s2 = mm.session.getState();
  return { molecule, word: s2.contentIds[s2.contentIds.length - 1] };
}

/** Press and hold at a point with the real pointer, until the field opens; true when it did. */
async function holdAt(page, x, y) {
  const under = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? e.id : null; }, [x, y]);
  if (under !== 'canvas') throw new Error(`the pointer at ${x}, ${y} would land on #${under}, not the canvas`);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const opened = await page.waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 6000 }).then(() => true).catch(() => false);
  await page.mouse.up();
  await sleep(80);
  return opened;
}

/**
 * Let go of whatever is held: a tap on empty ground (above the minimap, clear of the marks) takes
 * the field down, and another the selection it leaves — or Esc in the field, if the ground is covered.
 */
async function letGo(page) {
  const holding = () => page.evaluate(() => { const s = window.__mm.session.getState(); return !!s.summon || s.selection.length > 0; });
  for (let i = 0; i < 3 && await holding(); i++) {
    const under = await page.evaluate(() => { const e = document.elementFromPoint(1150, 180); return e ? e.id : null; });
    if (under === 'canvas') await page.mouse.click(1150, 180);
    else await page.evaluate(() => { const f = document.querySelector('#summon input.filter'); if (f) f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    await sleep(120);
  }
}

/** Take a pill of the open field by its words, with the real pointer. */
async function takePill(page, words) {
  const pill = page.locator('#summon .pill.item', { hasText: words }).first();
  if (!(await pill.count())) return false;
  await pill.click({ timeout: 5000 });
  return true;
}

const statusLine = (page) => page.evaluate(() => (document.getElementById('status').textContent || '').trim());
/** What the open field says of an ask it kept (the `.need` line), or null when nothing waits there. */
const needLine = (page) => page.evaluate(() => { const el = document.querySelector('#summon .need'); return el && !el.hidden && el.textContent.trim() ? el.textContent.replace(/\s+/g, ' ').trim() : null; });
const paneOpen = (page) => page.evaluate(() => !document.getElementById('modelPanel').hasAttribute('hidden'));
const paneStatus = (page) => page.evaluate(() => (document.getElementById('mpStatus').textContent || '').trim());

async function openModels(page) {
  if (await paneOpen(page)) return;
  await page.click('#ccBtn');
  await page.click('#modelBtn', { timeout: 5000 });
  await page.waitForSelector('#modelPanel:not([hidden])', { timeout: 5000 });
}

async function closeModels(page) {
  if (!(await paneOpen(page))) return;
  await page.click('#modelPanel .paneClose').catch(() => {});
  await sleep(50);
}

/** Join a custom OpenAI-compatible endpoint through the pane, as a hand would; the pane's sentence when it settles. */
async function joinCustom(page, base, model, key, remember, seat) {
  await openModels(page);
  await page.selectOption('#mpFor', seat || 'any');
  await page.selectOption('#mpProvider', 'custom');
  await page.fill('#mpEndpoint', base);
  await page.fill('#mpModel', model);
  await page.fill('#mpKey', key || '');
  await page.setChecked('#mpRememberKey', !!remember);
  const before = await paneStatus(page);
  await page.click('#mpAdd');
  await page.waitForFunction((was) => {
    const t = (document.getElementById('mpStatus').textContent || '').trim();
    return t !== was && !/^asking /.test(t) && t !== '';
  }, before, { timeout: 12000 }).catch(() => {});
  return paneStatus(page);
}

/** The seats as the page holds them (V1-PLAN I7): what each is held by, the providers a key is held for — never a key. */
const seatsOf = (page) => page.evaluate(() => window.__mm.seats());

/** A seat's row in the pane: who holds it, in words, and what its last call came to. */
const seatRow = (page, seat) => page.evaluate((k) => {
  const r = document.querySelector('.seatRow[data-seat="' + k + '"]');
  if (!r) return null;
  const t = (sel) => ((r.querySelector(sel) || {}).textContent || '').trim();
  return { who: t('.seatWho'), call: t('.seatCall'), fallback: t('.seatFallback'), tryable: !!r.querySelector('[data-seat-try]'), picks: [...r.querySelectorAll('.seatPick option')].map((o) => o.textContent.trim()) };
}, seat);

/** Press a seat's try it and wait for its row to say what the call came to. */
async function trySeat(page, seat) {
  await page.locator('.seatRow[data-seat="' + seat + '"] [data-seat-try]').click({ timeout: 5000 });
  await page.waitForFunction((k) => /^(ok|failed)\b/.test((((document.querySelector('.seatRow[data-seat="' + k + '"] .seatCall') || {}).textContent) || '').trim()), seat, { timeout: 12000 }).catch(() => {});
  return seatRow(page, seat);
}

/** Three molecules' worth of the same drawing at a point: its ink's ids (the last five marks). */
function drawMolecule(o) {
  const d = window.__draw, mm = window.__mm, x = o.x, y = o.y;
  d.stroke(d.circle(x, y, 40)); d.stroke(d.circle(x + 200, y, 40)); d.stroke(d.circle(x + 100, y + 160, 40));
  d.stroke(d.line({ x: x + 40, y: y }, { x: x + 160, y: y }, 30)); d.stroke(d.line({ x: x + 28, y: y + 28 }, { x: x + 72, y: y + 132 }, 30));
  return mm.session.getState().contentIds.slice(-5);
}

/** A joined model's row in the pane, by its name in words. */
const rowOf = (page, name) => page.evaluate((n) => {
  const it = [...document.querySelectorAll('#mpList .mpItem')].find((x) => ((x.querySelector('.n') || {}).textContent || '').trim() === n);
  if (!it) return null;
  const t = it.querySelector('.t');
  return {
    name: n,
    tags: t ? t.textContent.trim() : '',
    because: t ? t.title : '',
    call: ((it.querySelector('.mpCall') || {}).textContent || '').trim(),
    tryable: !!it.querySelector('[data-try]'),
  };
}, name);

/** Every joined model's name in words, as the pane lists them. */
const rowNames = (page) => page.evaluate(() => [...document.querySelectorAll('#mpList .mpItem .n')].map((x) => x.textContent.trim()));

/** Press a row's button (try it, leave) and wait for the row's call line to settle. */
async function pressRow(page, name, which) {
  const row = page.locator('#mpList .mpItem', { has: page.locator('.n', { hasText: name }) }).first();
  await row.locator(`[data-${which}]`).click({ timeout: 5000 });
  if (which !== 'try') { await sleep(60); return null; }
  await page.waitForFunction((n) => {
    const it = [...document.querySelectorAll('#mpList .mpItem')].find((x) => ((x.querySelector('.n') || {}).textContent || '').trim() === n);
    const line = it && it.querySelector('.mpCall');
    return !!line && /^(ok|failed)\b/.test(line.textContent.trim());
  }, name, { timeout: 12000 }).catch(() => {});
  return rowOf(page, name);
}

/** Wait until `fn` (in the page) is truthy, or the time is up; its last value. */
async function until(page, fn, arg, ms = 8000) {
  const end = Date.now() + ms;
  let v = null;
  while (Date.now() < end) {
    v = await page.evaluate(fn, arg);
    if (v) return v;
    await sleep(60);
  }
  return v;
}

/** What the models read a group as — held on one of its members: every tier-2 reading on any of them, label and source. */
const readingsOf = (page, ids) => page.evaluate((list) => {
  const mm = window.__mm, s = mm.session.getState();
  return list.flatMap((nid) => {
    const n = s.nodes.get(nid);
    return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 2).map((r) => ({ on: nid, label: r.label, weight: +r.weight.toFixed(2), source: r.sourceName })) : [];
  });
}, ids);

/** Wait, in Node, until the stub has had `n` more chat calls than `since` — or the time is up. */
async function stubbed(chats, since, n, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end && chats(since).length < n) await sleep(50);
  return chats(since);
}

/** Every place in the page a key could have been kept, as text: the log, IndexedDB, caches, storage, the DOM, the address. */
async function everywhere(page) {
  return page.evaluate(async () => {
    const out = {};
    out.log = JSON.stringify(window.__mm.session.getEvents());
    const idb = [];
    try {
      const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'mm-boards' }];
      for (const d of dbs) {
        const db = await new Promise((ok, fail) => { const r = indexedDB.open(d.name); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
        for (const name of db.objectStoreNames) {
          const all = await new Promise((ok, fail) => { const tx = db.transaction(name, 'readonly'); const q = tx.objectStore(name).getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => fail(q.error); });
          idb.push(d.name + '/' + name + ':' + JSON.stringify(all));
        }
        db.close();
      }
    } catch (e) { idb.push('unreadable: ' + e); }
    out.idb = idb.join('\n');
    out.idbStores = idb.length;
    const cached = [];
    let cacheEntries = 0;
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const q of await c.keys()) {
        cacheEntries++;
        const res = await c.match(q);
        cached.push(q.url + ' ' + (q.headers.get('authorization') || '') + ' ' + (res ? await res.text() : ''));
      }
    }
    out.caches = cached.join('\n');
    out.cacheEntries = cacheEntries;
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
    out.localStorage = ls;
    out.dom = document.documentElement.outerHTML;
    out.address = location.href + ' ' + document.title;
    return out;
  });
}

export async function runModels(browser, servers, { freshContext, screenshot }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const stub = await startModelStub();
  const guards = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models' });
  await guards.context.addInitScript(localStandIn);
  const page = await guards.context.newPage();
  const url = `${servers.staticOrigin}/app/`;
  const host = stub.origin.replace(/^https?:\/\//, '');
  const chats = (since = 0) => stub.calls().filter((c) => c.path === '/v1/chat/completions').slice(since);
  let board = null;
  const guardsAll = [guards];
  try {
    // ---- M0. The gate's guard, unchanged ----
    await record('M0', async () => {
      const own = [servers.staticOrigin, stub.origin];
      const real = isModelRequest('https://openrouter.ai/api/v1/chat/completions', own);
      const list = isModelRequest('https://openrouter.ai/api/v1/models', own);
      const ollama = isModelRequest('http://127.0.0.1:11434/api/tags', own);
      const mine = isModelRequest(`${stub.baseUrl}/chat/completions`, own);
      check('M0. the gate\'s guard still stops a real model host — OpenRouter\'s completions and its list, Ollama — and lets the stub\'s own origin by',
        !!real && !!list && !!ollama && mine === null, { real, list, ollama, mine });
    });

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.evaluate(installDraw);

    // ---- M1. The pane: nothing on this machine reached, one model a job ----
    await record('M1', async () => {
      await openModels(page);
      await until(page, () => document.querySelectorAll('#mpLocal .model').length > 0 || /nothing answered/.test(document.getElementById('mpLocal').textContent), null, 6000);
      const seen = await page.evaluate(() => ({
        asked: window.__localAsked.slice(),
        suggested: [...document.querySelectorAll('#mpLocal .model.suggested')].map((b) => ({ model: b.dataset.model, why: (b.querySelector('.why') || {}).textContent || '' })),
        listed: document.querySelectorAll('#mpLocal .model:not(.suggested)').length,
        all: ((document.querySelector('#mpLocal .mpAll') || {}).textContent || '').trim(),
      }));
      const read = seen.suggested.find((s) => /reads writing/.test(s.why));
      const what = seen.suggested.find((s) => /what is this/i.test(s.why));
      check(`M1. the models pane opens by its tile; nothing on this machine is reached (the page's stand-in answered Ollama's list, LM Studio did not answer); of 13 chat models one is suggested a job — ${read ? read.model : 'none'} for reading (the smallest that sees), ${what ? what.model : 'none'} for What is this? (a mid-size one) — and the rest wait behind "${seen.all}"`,
        seen.asked.some((a) => a === '11434/api/tags') && seen.suggested.length === 2 && read && read.model === 'qwen3.5:0.8b' && /sees/.test(read.why) && what && what.model === 'qwen3:8b' && seen.listed === 0 && /all 13 models/.test(seen.all),
        seen);
      if (seen.all) {
        await page.click('#mpLocal .mpAll');
        const shown = await page.evaluate(() => ({
          listed: document.querySelectorAll('#mpLocal .model:not(.suggested)').length,
          note: document.getElementById('mpLocal').textContent,
        }));
        check(`M1b. "all 13 models" shows them, each with what it can do; the embedding model is hidden and said to be (${shown.listed} listed)`,
          shown.listed === 13 && /1 embedding model hidden/.test(shown.note), shown);
      }
      await closeModels(page);
    });

    board = await page.evaluate(drawBoard, MOLECULE_AT);
    await sleep(200);

    // ---- M2. What is this? with no model: kept, said, no pane ----
    await record('M2', async () => {
      const calls = stub.calls().length;
      const held = await holdAt(page, MOLECULE_AT.x, MOLECULE_AT.y);
      const took = held && await takePill(page, 'What is this?');
      await sleep(200);
      const after = await page.evaluate(() => ({
        pane: !document.getElementById('modelPanel').hasAttribute('hidden'),
        need: ((document.querySelector('#summon .need') || {}).textContent || '').trim(),
        choose: !!document.querySelector('#summon .need button.choose'),
        kept: typeof window.__mm.keptAsk === 'function' ? window.__mm.keptAsk() : null,
      }));
      const said = await statusLine(page);
      check(`M2. What is this? with no model joined opens no pane and drops nothing: the field says "${after.need}", the status line "${said.slice(0, 110)}", and the ask is kept`,
        held && took && !after.pane && /needs a model/.test(after.need) && after.choose && /What is this\?/.test(said) && /kept/.test(said) && !!after.kept && after.kept.what === 'What is this?' && stub.calls().length === calls,
        { held, took, after, said });
      if (after.choose) {
        await page.click('#summon .need button.choose');
        await sleep(100);
        check('M2b. "choose one" — and only that — opens the models pane', await paneOpen(page), { pane: await paneOpen(page), status: await paneStatus(page) });
      }
    });

    // ---- M3. An id the endpoint does not list ----
    await record('M3', async () => {
      const calls = chats().length;
      const said = await joinCustom(page, stub.baseUrl, 'z-ai/glm-flash', STUB_KEY, false);
      const names = await rowNames(page);
      check(`M3. an id the endpoint does not list is refused, with the nearest ids: "${said}"`,
        said === `no model called z-ai/glm-flash at ${host} — did you mean ~z-ai/glm-flash-latest, z-ai/glm-5.3-flash or z-ai/glm-4.7-flash?` && names.length === 0 && chats().length === calls,
        { said, names });
    });

    // ---- M4. GLM 4.7 Flash joins: text only, from the list — and the kept What is this? runs ----
    await record('M4', async () => {
      const calls = chats().length;
      const said = await joinCustom(page, stub.baseUrl, 'z-ai/glm-4.7-flash', STUB_KEY, false);
      const got = await until(page, (ids) => {
        const s = window.__mm.session.getState();
        return ids.some((id) => { const n = s.nodes.get(id); return n && window.__mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 2); }) ? true : null;
      }, board.molecule, 8000);
      await sleep(150);
      const row = await rowOf(page, 'GLM 4.7 Flash');
      const asked = chats(calls);
      const reads = await readingsOf(page, board.molecule);
      const chip = await page.evaluate(() => (window.__mm.chips() || []).map((c) => c.text).find((t) => /transformation/.test(t)) || '');
      const standing = await page.evaluate(() => document.getElementById('status').dataset.standing || '');
      check(`M4. GLM 4.7 Flash joins as a custom endpoint with the test key — "${said.slice(0, 140)}" — and its row says "${row && row.tags}"`,
        /^GLM 4\.7 Flash joined — /.test(said) && /says GLM 4\.7 Flash takes text — it reads text only/.test(said) && !!row && /text only/.test(row.tags) && !/sees/.test(row.tags) && row.tryable,
        { said, row });
      check(`M4b. the What is this? kept before any model was here runs the moment one joins — one call, to it, and its reading lands: ${JSON.stringify(reads)}`,
        !!got && asked.length === 1 && asked[0].model === 'z-ai/glm-4.7-flash' && asked[0].job === 'what' && asked[0].key === 'the stub\'s' && reads.some((r) => r.label === 'state-transformation'),
        { asked, reads });
      check(`M4c. the board says it in words, with no "llm:": the chip "${chip}", the row "${row && row.call}", the standing line "${standing.slice(0, 120)}"`,
        /^state transformation 0\.82\s+·\s+GLM 4\.7 Flash$/.test(chip) && !!row && /^ok · \d+(\.\d)? s · reads it as state transformation$/.test(row.call) && /GLM 4\.7 Flash · local/.test(standing) && !/llm:/.test(chip + standing + (row ? row.call : '')),
        { chip, row, standing });
    });

    // ---- M5. Read the writing, with no model that can see ----
    await record('M5', async () => {
      await closeModels(page);
      await letGo(page);
      const calls = chats().length;
      const wordAt = await page.evaluate((id) => { const b = window.__mm.MM.boundsOf(window.__mm.session.getState().nodes.get(id)); return window.__mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2); }, board.word);
      const held = await holdAt(page, wordAt.x, wordAt.y);
      // A word held alone: its one option is the writing reading, which reads it (W2).
      const took = held && (await takePill(page, /^writing( \d\.\d\d)?$/) || await takePill(page, 'Read the writing') || await takePill(page, 'Read as writing'));
      await sleep(200);
      const said = await statusLine(page);
      const after = await page.evaluate(() => ({
        pane: !document.getElementById('modelPanel').hasAttribute('hidden'),
        need: ((document.querySelector('#summon .need') || {}).textContent || '').trim(),
        kept: typeof window.__mm.keptAsk === 'function' ? window.__mm.keptAsk() : null,
      }));
      check(`M5. Read the writing with no model that can see says which joined model cannot, and why — "${said.slice(0, 160)}" — keeps the ask, and calls nothing`,
        held && took && /GLM 4\.7 Flash reads text only/.test(said) && /says it takes text/.test(said) && /kept/.test(said) && !after.pane && /needs a model that can see/.test(after.need) && !!after.kept && after.kept.needs === 'sees' && chats().length === calls,
        { held, took, said, after });
      await letGo(page);
    });

    // ---- M6. A 401, kept in the row ----
    await record('M6', async () => {
      const said = await joinCustom(page, stub.baseUrl, 'z-ai/glm-4.5', WRONG_KEY, false);
      const row = await pressRow(page, 'GLM 4.5', 'try');
      check(`M6. a model joined with a wrong key, tried: its row keeps the reason in full — "${row && row.call}"`,
        /^GLM 4\.5 joined/.test(said) && !!row && /^failed · \d+(\.\d)? s · HTTP 401 — bad key: “User not found\.”$/.test(row.call),
        { said, row });
    });

    // ---- M7. A reasoning-only reply, kept in the row ----
    await record('M7', async () => {
      const said = await joinCustom(page, stub.baseUrl, REASONING_ONLY, STUB_KEY, false);
      const row = await pressRow(page, 'Reasoning Only', 'try');
      check(`M7. a model that spent its whole budget thinking, tried: its row says so — "${row && row.call}"`,
        /^Reasoning Only joined/.test(said) && !!row && /^failed · \d+(\.\d)? s · Reasoning Only spent its whole budget thinking — no answer came back/.test(row.call),
        { said, row });
      await pressRow(page, 'GLM 4.5', 'leave');
      await pressRow(page, 'Reasoning Only', 'leave');
      check('M7b. both leave by their rows\' own button', JSON.stringify(await rowNames(page)) === '["GLM 4.7 Flash"]', await rowNames(page));
    });

    // ---- M8. GLM 5.3 Flash joins, remembered: it sees — and the kept read runs ----
    await record('M8', async () => {
      const calls = chats().length;
      const said = await joinCustom(page, stub.baseUrl, 'z-ai/glm-5.3-flash', STUB_KEY, true);
      const read = await until(page, (id) => { const n = window.__mm.session.getState().nodes.get(id); const t = n && window.__mm.MM.transcriptOf(n); return t ? t.text || t : null; }, board.word, 8000);
      await sleep(150);
      const row = await rowOf(page, 'GLM 5.3 Flash');
      const asked = chats(calls);
      check(`M8. GLM 5.3 Flash joins with its key remembered — "${said.slice(0, 150)}" — and its row says "${row && row.tags}"`,
        /^GLM 5\.3 Flash joined — /.test(said) && /takes text, image and video — it sees/.test(said) && !!row && /sees/.test(row.tags),
        { said, row });
      check(`M8b. the Read the writing kept for a model that can see runs when one joins: one image, to GLM 5.3 Flash alone, and the word holds “${read}”; its row "${row && row.call}"`,
        read === 'hello' && asked.length === 1 && asked[0].model === 'z-ai/glm-5.3-flash' && asked[0].job === 'read' && asked[0].image === true && !!row && /^ok · \d+(\.\d)? s · read “hello”$/.test(row.call),
        { asked, read, row });
    });

    // ---- M9. Try it ----
    await record('M9', async () => {
      const calls = chats().length;
      const row = await pressRow(page, 'GLM 5.3 Flash', 'try');
      const asked = chats(calls);
      check(`M9. try it sends one tiny prompt and shows the reply — "${row && row.call}" — with a budget for the reply sent (max_tokens ${asked[0] && asked[0].max_tokens})`,
        !!row && /^ok · \d+(\.\d)? s · replied “ok”$/.test(row.call) && asked.length === 1 && asked[0].job === 'try' && asked[0].model === 'z-ai/glm-5.3-flash' && asked[0].max_tokens === 8192 && asked[0].key === 'the stub\'s',
        { row, asked });
    });

    // ---- M10. What is this? again: every joined model, each row its outcome ----
    await record('M10', async () => {
      await closeModels(page);
      await letGo(page);
      const calls = chats().length;
      const held = await holdAt(page, MOLECULE_AT.x, MOLECULE_AT.y);
      const took = held && await takePill(page, 'What is this?');
      const asked = await stubbed(chats, calls, 2);
      await sleep(300);
      await openModels(page);
      const rows = [await rowOf(page, 'GLM 4.7 Flash'), await rowOf(page, 'GLM 5.3 Flash')];
      check(`M10. What is this?, taken again, asks every joined model once — ${asked.map((a) => a.model).join(', ')} — and each row says what it read: ${rows.map((r) => r && r.call).join(' / ')}`,
        held && took && asked.length === 2 && new Set(asked.map((a) => a.model)).size === 2 && asked.every((a) => a.job === 'what') && rows.every((r) => r && /^ok · \d+(\.\d)? s · reads it as state transformation$/.test(r.call)),
        { held, took, asked, rows });
      await letGo(page);
    });

    // ---- M11. A reload: the remembered pick rejoins ----
    await record('M11', async () => {
      const lists = stub.calls().filter((c) => c.path === '/v1/models').length;
      await page.reload({ waitUntil: 'load' });
      await waitReady(page);
      await openModels(page);
      const row = await until(page, () => {
        const it = [...document.querySelectorAll('#mpList .mpItem')].find((x) => ((x.querySelector('.n') || {}).textContent || '').trim() === 'GLM 5.3 Flash');
        return it ? { tags: it.querySelector('.t').textContent.trim() } : null;
      }, null, 8000);
      const agents = await page.evaluate(() => window.__mm.agents.map((a) => ({ model: a.config.model, vision: !!a.config.vision, keyed: !!a.config.apiKey })));
      const tried = await pressRow(page, 'GLM 5.3 Flash', 'try');
      check(`M11. after a reload the remembered pick rejoins on its own — GLM 5.3 Flash, "${row && row.tags}", its key from this device — the provider asked again what it can do, and try it answers: "${tried && tried.call}"`,
        !!row && /sees/.test(row.tags) && agents.length === 1 && agents[0].model === 'z-ai/glm-5.3-flash' && agents[0].vision && agents[0].keyed &&
          stub.calls().filter((c) => c.path === '/v1/models').length > lists && !!tried && /^ok · /.test(tried.call),
        { row, agents, tried });
    });

    // ---- M12. The key is nowhere it was not asked to be ----
    await record('M12', async () => {
      const e = await everywhere(page);
      const has = (text) => typeof text === 'string' && (text.includes(STUB_KEY) || text.includes(WRONG_KEY));
      const lsHolding = Object.entries(e.localStorage).filter(([, v]) => has(v)).map(([k]) => k);
      // Since I7 the pick is kept under the seats it holds (`mm-seats`) and the key under its provider (`mm-model-keys`), never together.
      const seatsKept = JSON.parse(e.localStorage['mm-seats'] || 'null');
      const pick = seatsKept && seatsKept.any;
      const keysKept = JSON.parse(e.localStorage['mm-model-keys'] || 'null');
      check(`M12. the key is nowhere it was not asked to be — not in the log (${e.log.length} characters), the board's journal (${e.idbStores} stores), a cache (${e.cacheEntries} entries), the DOM or the address; in this browser's storage only under ${lsHolding.join(', ') || 'nothing'}, where "remember" put it; the wrong key nowhere at all`,
        !has(e.log) && !has(e.idb) && !has(e.caches) && !has(e.dom) && !has(e.address) && e.idbStores > 0 &&
          JSON.stringify(lsHolding) === '["mm-model-keys"]' && !!keysKept && JSON.stringify(Object.values(keysKept)) === JSON.stringify([STUB_KEY]) && !!pick && !JSON.stringify(seatsKept).includes('apiKey') && pick.model === 'z-ai/glm-5.3-flash',
        { lsHolding, pick, idbStores: e.idbStores, cacheEntries: e.cacheEntries });
    });

    // =====================================================================================================
    // Seats per job (V1-PLAN I7). A clean device: its own context, so nothing above has kept a key here.
    // =====================================================================================================
    const guards2 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-seats' });
    guardsAll.push(guards2);
    await guards2.context.addInitScript(localStandIn);
    const p2 = await guards2.context.newPage();
    await p2.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(p2);
    await p2.evaluate(installDraw);
    const KEYS_AT = (base) => base.replace(/\/+$/, '').toLowerCase();

    // ---- M13. One key, three seats ----
    await record('M13', async () => {
      const base = stub.baseUrl;
      const before = chats().length;
      const w = await joinCustom(p2, base, 'z-ai/glm-5.3-flash', STUB_KEY, true, 'writer');
      const r = await joinCustom(p2, base, 'z-ai/glm-4.5v', '', false, 'reader');
      const d = await joinCustom(p2, base, JEV, '', false, 'decider');
      const a = await joinCustom(p2, base, 'openai/gpt-4o-mini', '', false, 'any');
      const seats = await seatsOf(p2);
      const keyField = await p2.inputValue('#mpKey');
      const rows = { reader: await seatRow(p2, 'reader'), writer: await seatRow(p2, 'writer'), decider: await seatRow(p2, 'decider'), semantic: await seatRow(p2, 'semantic') };
      check(`M13. four joins, the key typed once — for the writer ("${w.slice(0, 70)}") — and the reader, the decider and a model with no seat joined with the key field empty ("${r.slice(0, 60)}")`,
        /^GLM 5\.3 Flash joined/.test(w) && /^GLM 4\.5V joined/.test(r) && /Jev/.test(d) && /joined as the decider/.test(d) && /^GPT-4o-mini joined/i.test(a) && keyField === '' &&
          seats.writer && seats.writer.model === 'z-ai/glm-5.3-flash' && seats.reader && seats.reader.model === 'z-ai/glm-4.5v' && seats.decider && seats.decider.model === JEV &&
          seats.any.length === 1 && seats.any[0].model === 'openai/gpt-4o-mini' && seats.keys.length === 1 && seats.keys[0] === KEYS_AT(base) && chats().length === before,
        { w, r, d, a, seats, keyField });
      check(`M13b. each seat says who holds it — ${['reader', 'writer', 'decider'].map((k) => k + ': ' + (rows[k] && rows[k].who)).join(' / ')} — and the semantic seat (I9) says nobody holds it, that what would is on this device and no key, and offers to load it — no longer that it is coming`,
        !!rows.reader && /GLM 4\.5V/.test(rows.reader.who) && /sees/.test(rows.reader.who) && /GLM 5\.3 Flash/.test(rows.writer.who) && /Jev/.test(rows.decider.who) && /local/.test(rows.decider.who) && /0\.99/.test(rows.decider.who) &&
          !!rows.semantic && /nothing chosen/.test(rows.semantic.who) && /on this device/.test(rows.semantic.who + rows.semantic.fallback) && !/coming/.test(rows.semantic.who + rows.semantic.fallback) && !rows.semantic.tryable,
        rows);
      const seen = [];
      for (const k of ['writer', 'reader', 'decider']) seen.push(await trySeat(p2, k));
      const asked = chats(before);
      check(`M13c. try it on each seat reaches its own model with the one key — ${asked.map((c) => c.model + ' (' + c.key + ')').join(', ')} — and each row keeps what the call came to`,
        asked.length === 3 && asked.every((c) => c.key === 'the stub\'s') && new Set(asked.map((c) => c.model)).size === 3 && seen.every((x) => x && /^ok · \d+(\.\d)? s · /.test(x.call)),
        { asked, seen });
    });

    // ---- M14. Routing: the reader reads, the writer writes ----
    let seatBoard = null;
    await record('M14', async () => {
      const m14 = chats().length;
      await closeModels(p2);
      seatBoard = await p2.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const calls = chats().length;
      const wordAt = await p2.evaluate((id) => { const b = window.__mm.MM.boundsOf(window.__mm.session.getState().nodes.get(id)); return window.__mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2); }, seatBoard.word);
      const held = await holdAt(p2, wordAt.x, wordAt.y);
      const took = held && (await takePill(p2, /^writing( \d\.\d\d)?$/) || await takePill(p2, 'Read the writing'));
      const read = await until(p2, (id) => { const n = window.__mm.session.getState().nodes.get(id); const t = n && window.__mm.MM.transcriptOf(n); return t ? t.text || t : null; }, seatBoard.word, 8000);
      await sleep(250);
      const readCalls = chats(calls);
      check(`M14. Read the writing asks the reader seat alone — ${readCalls.map((c) => c.model + ' ' + c.job).join(', ')} — one image, though GPT-4o-mini and the writer see too; the word holds “${read}”`,
        held && took && readCalls.length === 1 && readCalls[0].model === 'z-ai/glm-4.5v' && readCalls[0].job === 'read' && readCalls[0].image === true && read === 'hello',
        { held, took, readCalls, read });
      await letGo(p2);
      await closeModels(p2);
      const before = chats().length;
      const held2 = await holdAt(p2, MOLECULE_AT.x, MOLECULE_AT.y);
      const took2 = held2 && await takePill(p2, 'What is this?');
      const whatCalls = await stubbed(chats, before, 1);
      await sleep(400);
      const after = chats(before);
      check(`M14b. What is this? asks the writer seat alone — ${after.map((c) => c.model + ' ' + c.job).join(', ')} — and the model with no seat, the reader and the decider are not asked`,
        held2 && took2 && whatCalls.length >= 1 && after.length === 1 && after[0].model === 'z-ai/glm-5.3-flash' && after[0].job === 'what',
        { held2, took2, after });
      const decides = chats(m14).filter((c) => c.job === 'decide');
      const mini = chats().filter((c) => c.model === 'openai/gpt-4o-mini');
      check('M14c. neither act asked the decider, and the model with no seat was never asked at all (the seats narrow who is asked; asking nothing is the default)',
        decides.length === 0 && mini.length === 0, { decides: decides.length, mini: mini.length });
      await letGo(p2);
    });

    // ---- M15. The decider, on a tie ----
    await record('M15', async () => {
      await closeModels(p2);
      await p2.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const A = { x: 420, y: 130 }, B = { x: 860, y: 130 }, C = { x: 420, y: 500 };
      const nameThrough = async (at, text) => {
        const ok = await holdAt(p2, at.x, at.y);
        if (!ok) return false;
        // `name:` says what the word is for: a lone word waits for a pick (PLAN-FIELD-PAR FP4) — it used to
        // be a brief, which blessed the group under that word on its way to a page.
        await p2.fill('#summon input.filter', 'name: ' + text);
        await p2.press('#summon input.filter', 'Enter');
        await sleep(200);
        await letGo(p2);
        return true;
      };
      await p2.evaluate(drawMolecule, A);
      const nA = await nameThrough(A, 'molecule');
      await p2.evaluate(drawMolecule, B);
      const nB = await nameThrough(B, 'compound');
      const third = await p2.evaluate(drawMolecule, C);
      await sleep(200);
      const arts = await p2.evaluate(() => window.__mm.session.getState().artifacts.length);
      const before = chats().length;
      const held = await holdAt(p2, C.x, C.y);
      const offered = held ? await p2.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
      const has = offered.some((t) => /Which is it\?/.test(t));
      check(`M15. two definitions named from the same drawing, and a third drawing held: both match — and Which is it? is offered (${offered.length} pills), the decider's name on its reason`,
        nA && nB && arts === 2 && held && has && chats(before).length === 0,
        { nA, nB, arts, held, offered });
      const took = has && await takePill(p2, 'Which is it?');
      const calls = await stubbed(chats, before, 1);
      await until(p2, (ids) => { const mm = window.__mm, s = mm.session.getState(); return ids.some((id) => { const n = s.nodes.get(id); return n && mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 1.5); }) ? true : null; }, third, 8000);
      await sleep(250);
      const decisions = stub.decisions();
      const rows = await p2.evaluate((ids) => {
        const mm = window.__mm, s = mm.session.getState();
        return ids.flatMap((id) => { const n = s.nodes.get(id); return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 1.5).map((r) => ({ label: r.label, weight: +r.weight.toFixed(3), source: r.sourceName })) : []; });
      }, third);
      const chips = await p2.evaluate(() => (window.__mm.chips() || []).map((c) => c.text));
      const pills = await p2.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim()));
      const lead = decisions.length ? decisions[decisions.length - 1].lead : null;
      check(`M15b. taking it asks the decider once — ${calls.map((c) => c.model + ' ' + c.job).join(', ')} — and its answer stands as one more reading beside the engine's: ${JSON.stringify(rows)}, and the field says it: ${pills.filter((t) => /jev|Jev/.test(t)).join(' | ')}`,
        took && calls.length === 1 && calls[0].model === JEV && calls[0].job === 'decide' && calls[0].key === 'the stub\'s' && !!lead && rows.length >= 1 && rows.every((r) => r.weight >= 0.99 && r.label === lead) &&
          pills.some((t) => new RegExp('^' + lead + ' 0\\.99\\d? · Jev').test(t)) && pills.some((t) => /^molecule 1\.00|^compound 1\.00|^(molecule|compound) 0\.\d\d$/.test(t)),
        { took, calls, decisions, rows, pills, chips });
      await letGo(p2);
      // Not a tie: one definition named, a drawing that matches only it — nothing to decide.
      await p2.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(120);
      await p2.evaluate(drawMolecule, A);
      await nameThrough(A, 'molecule');
      await p2.evaluate(drawMolecule, C);
      await sleep(150);
      const held2 = await holdAt(p2, C.x, C.y);
      const offered2 = held2 ? await p2.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
      check('M15c. with one definition and a drawing like it there is nothing to tie, and the field does not offer to ask the decider',
        held2 && !offered2.some((t) => /Which is it\?/.test(t)) && offered2.some((t) => /^molecule/.test(t)), { held2, offered2 });
      await letGo(p2);
      // Under the floor: the decider leads at 0.97 — said, and nothing held.
      stub.decideAt(0.97);
      await p2.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(120);
      await p2.evaluate(drawMolecule, A); await nameThrough(A, 'molecule');
      await p2.evaluate(drawMolecule, B); await nameThrough(B, 'compound');
      const third2 = await p2.evaluate(drawMolecule, C);
      await sleep(150);
      const before2 = chats().length;
      const held3 = await holdAt(p2, C.x, C.y);
      const took3 = held3 && await takePill(p2, 'Which is it?');
      await stubbed(chats, before2, 1);
      await sleep(500);
      const said = await statusLine(p2);
      const rows2 = await p2.evaluate((ids) => {
        const mm = window.__mm, s = mm.session.getState();
        return ids.flatMap((id) => { const n = s.nodes.get(id); return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 1.5).map((r) => r.label) : []; });
      }, third2);
      check(`M15d. an answer under the floor is said — "${said.slice(0, 150)}" — and holds nothing: the engine's ranking stands`,
        held3 && took3 && chats(before2).length === 1 && rows2.length === 0 && /Jev/.test(said) && /0\.97/.test(said) && /engine/.test(said), { held3, took3, said, rows2 });
      stub.decideAt(0.995);
      await letGo(p2);
    });

    // ---- M16. A reload keeps the seats ----
    await record('M16', async () => {
      const lists = stub.calls().filter((c) => c.path === '/v1/models').length;
      await p2.reload({ waitUntil: 'load' });
      await waitReady(p2);
      await openModels(p2);
      const seats = await until(p2, () => { const s = window.__mm.seats(); return s.reader && s.writer && s.decider && s.any.length === 1 ? s : null; }, null, 10000);
      const agents = await p2.evaluate(() => window.__mm.agents.map((a) => ({ model: a.config.model, vision: !!a.config.vision, keyed: !!a.config.apiKey })));
      const before = chats().length;
      const tried = [];
      for (const k of ['writer', 'reader', 'decider']) tried.push(await trySeat(p2, k));
      const asked = chats(before);
      check(`M16. after a reload the seats are as they were — reader ${seats && seats.reader && seats.reader.model}, writer ${seats && seats.writer && seats.writer.model}, decider ${seats && seats.decider && seats.decider.model} — each asked again what it can do, keyed from this device, and each try answers`,
        !!seats && seats.reader.model === 'z-ai/glm-4.5v' && seats.writer.model === 'z-ai/glm-5.3-flash' && seats.decider.model === JEV && agents.length === 3 && agents.every((a) => a.keyed) &&
          agents.find((a) => a.model === 'z-ai/glm-4.5v').vision && stub.calls().filter((c) => c.path === '/v1/models').length > lists &&
          asked.length === 3 && asked.every((c) => c.key === 'the stub\'s') && tried.every((x) => x && /^ok · /.test(x.call)),
        { seats, agents, asked, tried });
    });

    // ---- M17. The key, across every seat ----
    await record('M17', async () => {
      const e = await everywhere(p2);
      const has = (text) => typeof text === 'string' && text.includes(STUB_KEY);
      const lsHolding = Object.entries(e.localStorage).filter(([, v]) => has(v)).map(([k]) => k);
      const keys = JSON.parse(e.localStorage['mm-model-keys'] || 'null');
      const seatsStored = JSON.parse(e.localStorage['mm-seats'] || 'null');
      check(`M17. across the reader, the writer and the decider the key is nowhere it was not asked to be — not the log (${e.log.length} characters), the journal (${e.idbStores} stores), a cache (${e.cacheEntries}), the DOM, the address, nor any seat's kept pick; in storage only under ${lsHolding.join(', ') || 'nothing'}, once, for the one provider`,
        !has(e.log) && !has(e.idb) && !has(e.caches) && !has(e.dom) && !has(e.address) && e.idbStores > 0 && JSON.stringify(lsHolding) === '["mm-model-keys"]' &&
          !!keys && Object.keys(keys).length === 1 && keys[KEYS_AT(stub.baseUrl)] === STUB_KEY && !!seatsStored && !JSON.stringify(seatsStored).includes('apiKey') &&
          !!seatsStored.reader && !!seatsStored.writer && !!seatsStored.decider,
        { lsHolding, keys: keys && Object.keys(keys), seatsStored });
    });

    // ---- M18. A device that did not remember the key ----
    const guards3 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-seats-forgetful' });
    guardsAll.push(guards3);
    await guards3.context.addInitScript(localStandIn);
    const p3 = await guards3.context.newPage();
    await record('M18', async () => {
      await p3.goto(url, { waitUntil: 'load', timeout: 60000 });
      await waitReady(p3);
      const base = stub.baseUrl;
      await joinCustom(p3, base, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'writer');
      await joinCustom(p3, base, 'z-ai/glm-4.5v', '', false, 'reader');
      await joinCustom(p3, base, JEV, '', false, 'decider');
      await p3.reload({ waitUntil: 'load' });
      await waitReady(p3);
      await openModels(p3);
      const seats = await until(p3, () => { const s = window.__mm.seats(); return s.reader && s.writer && s.decider ? s : null; }, null, 10000);
      const e = await everywhere(p3);
      const has = (text) => typeof text === 'string' && text.includes(STUB_KEY);
      const lsHolding = Object.entries(e.localStorage).filter(([, v]) => has(v)).map(([k]) => k);
      const tried = await trySeat(p3, 'writer');
      check(`M18. where "remember" was not ticked the seats come back (${seats ? ['reader', 'writer', 'decider'].map((k) => seats[k] && seats[k].model).join(', ') : 'none'}) and no key is in any store (${lsHolding.join(', ') || 'none'}; the log, journal, caches, DOM and address clean); a seat tried says why it cannot — "${tried && tried.call}"`,
        !!seats && !has(e.log) && !has(e.idb) && !has(e.caches) && !has(e.dom) && !has(e.address) && lsHolding.length === 0 && !!tried && /^failed · \d+(\.\d)? s · HTTP 401/.test(tried.call),
        { seats, lsHolding, tried });
      // The key entered once more — on the writer — serves every seat that waits for one.
      await joinCustom(p3, base, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'writer');
      const before = chats().length;
      const after = [await trySeat(p3, 'writer'), await trySeat(p3, 'reader'), await trySeat(p3, 'decider')];
      const asked = chats(before);
      check(`M18b. the key typed once, for one seat, serves the reader and the decider that waited for it — ${asked.map((c) => c.model + ' ' + c.key).join(', ')}`,
        asked.length === 3 && asked.every((c) => c.key === 'the stub\'s') && after.every((x) => x && /^ok · /.test(x.call)), { asked, after });
    });

    // ---- M19. An old pick and key become the writer seat ----
    const guards4 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-seats-migrated' });
    guardsAll.push(guards4);
    await guards4.context.addInitScript(localStandIn);
    await guards4.context.addInitScript(([base, key]) => {
      try {
        if (localStorage.getItem('__seeded')) return;
        localStorage.setItem('__seeded', '1');
        localStorage.setItem('mm-model-pick', JSON.stringify({ provider: 'custom', baseUrl: base, model: 'z-ai/glm-5.3-flash', kind: 'openai-compatible', vision: true, title: 'Z.AI: GLM 5.3 Flash' }));
        localStorage.setItem('mm-model-key', JSON.stringify(key));
      } catch (e) { /* none */ }
    }, [stub.baseUrl, STUB_KEY]);
    const p4 = await guards4.context.newPage();
    await record('M19', async () => {
      await p4.goto(url, { waitUntil: 'load', timeout: 60000 });
      await waitReady(p4);
      await openModels(p4);
      const seats = await until(p4, () => { const s = window.__mm.seats(); return s.writer && s.reader ? s : null; }, null, 10000);
      const ls = await p4.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
      const before = chats().length;
      const tried = seats ? await trySeat(p4, 'writer') : null;
      const asked = chats(before);
      check(`M19. an old remembered pick and key become the writer seat, and the reader because it sees — ${seats ? seats.writer.model + ' / ' + seats.reader.model : 'none'} — the key kept for its provider, the old entries let go, and the seat answers with it`,
        !!seats && seats.writer.model === 'z-ai/glm-5.3-flash' && seats.reader.model === 'z-ai/glm-5.3-flash' && !('mm-model-pick' in ls) && !('mm-model-key' in ls) &&
          JSON.parse(ls['mm-model-keys'] || '{}')[KEYS_AT(stub.baseUrl)] === STUB_KEY && !!tried && /^ok · /.test(tried.call) && asked.length === 1 && asked[0].key === 'the stub\'s',
        { seats, keys: Object.keys(ls), tried, asked });
    });

    // =====================================================================================================
    // A model joined stays joined across boards (V1-PLAN I7's finding). A clean device, one writer.
    // =====================================================================================================
    const guards5 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-boards' });
    guardsAll.push(guards5);
    await guards5.context.addInitScript(localStandIn);
    const p5 = await guards5.context.newPage();
    await p5.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(p5);
    await p5.evaluate(installDraw);
    const A5 = { x: 560, y: 130 };
    const joinsHere = () => p5.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'join').length);
    const eventsHere = () => p5.evaluate(() => window.__mm.session.getEvents().length);
    /** What is this? on the molecule drawn at A5 with the real pointer; the stub's calls it made and the readings that landed. */
    const askWhat = async (ids) => {
      const before = chats().length;
      await letGo(p5);
      const held = await holdAt(p5, A5.x, A5.y);
      const took = held && await takePill(p5, 'What is this?');
      const calls = await stubbed(chats, before, 1);
      const got = await until(p5, (list) => {
        const s = window.__mm.session.getState();
        return list.some((id) => { const n = s.nodes.get(id); return n && window.__mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 2); }) ? true : null;
      }, ids, 8000);
      await sleep(200);
      const said = await statusLine(p5);
      await letGo(p5);
      return { held, took, calls: chats(before), got: !!got, said, asked: calls.length };
    };
    let board5a = null, board5b = null, ink5a = null, ink5b = null;

    await record('M20', async () => {
      const joined = await joinCustom(p5, stub.baseUrl, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'writer');
      await closeModels(p5);
      board5a = (await p5.evaluate(() => window.__mm.boards())).current;
      ink5a = await p5.evaluate(drawMolecule, A5);
      const joinsA = await joinsHere();
      board5b = await newBoardVia(p5);
      await sleep(300);
      const empty = await eventsHere();
      ink5b = await p5.evaluate(drawMolecule, A5);
      const r = await askWhat(ink5b);
      const joinsB = await joinsHere();
      const names = await p5.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'join').map((e) => e.name));
      check(`M20. the model joined on the first board is asked on a new one made through the boards pane (${joined.slice(0, 40)}): a new board holds ${empty} events, What is this? answers there — ${r.calls.map((c) => c.model + ' ' + c.job).join(', ')}, its reading lands ("${r.said.slice(0, 80)}") — and the new board holds one join, for it (${names.join(', ')}), where the first held ${joinsA}`,
        /^GLM 5\.3 Flash joined/.test(joined) && joinsA === 1 && !!board5b && board5b !== board5a && empty === 0 && r.held && r.took && r.calls.length === 1 && r.calls[0].model === 'z-ai/glm-5.3-flash' && r.calls[0].job === 'what' && r.got && !/not in this session/.test(r.said) && joinsB === 1,
        { joined, joinsA, empty, r, joinsB, names });
    });

    // ---- M21. Back where it joined, and on again ----
    await record('M21', async () => {
      await switchTo(p5, board5a);
      const joinsA = await joinsHere();
      const r = await askWhat(ink5a);
      const joinsA2 = await joinsHere();
      await switchTo(p5, board5b);
      const joinsB = await joinsHere();
      const r2 = await askWhat(ink5b);
      const joinsB2 = await joinsHere();
      check(`M21. back on the first board (its log already holds the join) it answers — ${r.calls.map((c) => c.model).join(', ')} — and takes no second; on the second, which now holds its own, again: joins ${joinsA}→${joinsA2} and ${joinsB}→${joinsB2}`,
        joinsA === 1 && r.held && r.took && r.calls.length === 1 && r.got && joinsA2 === 1 && joinsB === 1 && r2.held && r2.took && r2.calls.length === 1 && r2.got && joinsB2 === 1 && !/not in this session/.test(r.said + r2.said),
        { joinsA, r, joinsA2, joinsB, r2, joinsB2 });
    });

    // ---- M22. A board only looked at is never written ----
    await record('M22', async () => {
      const calls = chats().length;
      const looked = await newBoardVia(p5);
      await sleep(200);
      await switchTo(p5, board5a);
      await switchTo(p5, looked);
      await sleep(300);
      const events = await eventsHere();
      // What the browser's store holds of it, not only what the page shows: nothing was kept for a board nobody drew on.
      const entry = await p5.evaluate(async (id) => { const st = await window.__mm.boardsStore(id); return { events: st.log.length, records: st.records }; }, looked);
      await switchTo(p5, board5b);
      const joinsB = await joinsHere();
      check(`M22. a board only looked at — made, left, come back to, with the model joined throughout — holds ${events} events and its store ${entry ? entry.events : '?'} events; the model asked nothing (${chats().length - calls} calls) and the board it was asked on still holds ${joinsB} join`,
        events === 0 && !!entry && entry.events === 0 && entry.records === 0 && chats().length === calls && joinsB === 1,
        { events, entry, joinsB, calls: chats().length - calls });
    });

    // ---- M23. Reset and an example are loads in place too ----
    await record('M23', async () => {
      await p5.click('#ccBtn');
      await p5.click('#resetBtn');
      const fresh = await until(p5, (b) => { const x = window.__mm.boards(); return x.ready && !x.switching && !x.busy && x.current !== b && window.__mm.session.getEvents().length === 0 ? x.current : null; }, board5b, 15000);
      await p5.evaluate(() => window.__mm.setView(1, 0, 0));
      const ink = await p5.evaluate(drawMolecule, A5);
      const r = await askWhat(ink);
      const joins = await joinsHere();
      // An example: one tap on the empty panel's "start from an example", a board of its own.
      await newBoardVia(p5);
      await sleep(200);
      await p5.waitForSelector('#inspector button[data-example-start]', { timeout: 8000 }).catch(() => {});
      const startedFrom = (await p5.evaluate(() => window.__mm.boards())).current;
      await p5.click('#inspector button[data-example-start]');
      const example = await until(p5, (b) => { const x = window.__mm.boards(); return x.ready && !x.switching && x.current !== b && window.__mm.session.getState().contentIds.length > 0 ? x.current : null; }, startedFrom, 20000);
      await p5.evaluate(() => window.__mm.setView(1, 0, 0));
      const ids = await p5.evaluate(() => window.__mm.session.getState().contentIds.slice());
      const before = chats().length;
      const asked = await p5.evaluate(async (list) => {
        const mm = window.__mm, a = mm.agents[0];
        const res = await a.ask('what is on this board?', list.slice(0, 3), Date.now());
        return { ok: !!res.ok, error: res.error || null };
      }, ids);
      const joinsEx = await joinsHere();
      check(`M23. Reset (a fresh board, ${fresh ? 'opened' : 'not opened'}) and an example opened (${example ? 'opened' : 'not opened'}) are loads in place: the model answers on each — What is this? on the fresh board (${r.calls.length} call, ${joins} join), a question on the example (${asked.ok ? 'answered' : asked.error}, ${chats().length - before} call, ${joinsEx} join in its log)`,
        !!fresh && r.held && r.took && r.calls.length === 1 && r.got && joins === 1 && !!example && asked.ok && chats().length - before === 1 && joinsEx === 1,
        { fresh, r, joins, example, asked, joinsEx });
    });

    // =====================================================================================================
    // Read my notes (PLAN-IPAD-NOTES I8). A clean device, no model at first.
    // =====================================================================================================
    const guards6 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-notes' });
    guardsAll.push(guards6);
    await guards6.context.addInitScript(localStandIn);
    const p6 = await guards6.context.newPage();
    await p6.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(p6);
    await p6.evaluate(installDraw);
    const FIX = JSON.parse((await import('node:fs')).readFileSync(new URL('../core/src/llm/fixtures/read-lines.json', import.meta.url), 'utf8'));
    const PAGE_A = { t0: 100000, lines: [[[560, 140, 200, 44, 7], [800, 140, 170, 44, 6]], [[560, 260, 260, 48, 8]], [[560, 380, 180, 44, 5]]] };
    let A = null;
    const readerJoined = () => p6.evaluate(() => window.__mm.agents.length);
    const lastReader = () => p6.evaluate(() => (window.__mm.lastCalls().find((c) => /glm-4\.5v/.test(c.model)) || {}).line || '');

    await record('M24', async () => {
      const before = chats().length;
      A = await p6.evaluate(writePage, PAGE_A);
      await sleep(200);
      const drawn = chats().length - before;
      await holdIds(p6, A.flat());
      const took = await takeReadThese(p6);
      await sleep(300);
      const said = await statusLine(p6);
      const kept = await p6.evaluate(() => { const k = window.__mm.keptAsk && window.__mm.keptAsk(); return k ? { needs: k.needs, what: k.what } : null; });
      const pane = await paneOpen(p6);
      const calls0 = chats().length - before;
      const joined = await joinCustom(p6, stub.baseUrl, 'z-ai/glm-4.5v', STUB_KEY, false, 'reader');
      await closeModels(p6);
      const got = await stubbed(chats, before, 1, 10000);
      const texts = await until(p6, (ids) => { const mm = window.__mm, s = mm.session.getState(); const one = (id) => { const n = s.nodes.get(id), t = n && mm.MM.transcriptsOf(n)[0]; return t ? t.text : null; }; const out = ids.map(one); return out.every((x) => x) ? out : null; }, [A[0][0], A[0][1], A[1][0], A[2][0]], 10000);
      check(`M24. Read these with no model that sees is kept — "${said.slice(0, 90)}" — no pane, no call (${calls0}); drawing the lines asked nothing (${drawn} calls); the reader joins (${joined.slice(0, 40)}) and it runs: ONE call, to it alone, one image, a sheet of 3 lines — each line's reading lands where it was written: ${JSON.stringify(texts)}`,
        drawn === 0 && took && /needs a model that can see/.test(said) && /kept/.test(said) && !!kept && kept.needs === 'sees' && !pane && calls0 === 0 &&
          got.length === 1 && got[0].model === 'z-ai/glm-4.5v' && got[0].job === 'read-lines' && got[0].image === true && got[0].lines === 3 &&
          !!texts && texts[0] === 'hello' && texts[1] === 'world' && texts[2] === 'pricing' && texts[3] === 'buy oat milk today',
        { drawn, took, said, kept, pane, calls0, got, texts });
      await letGo(p6);
    });

    await record('M24b', async () => {
      stub.readDelay(900);
      const B = await p6.evaluate(writePage, { t0: 400000, lines: [[[560, 480, 200, 44, 7]], [[560, 560, 220, 44, 6]], [[560, 640, 160, 44, 5]]] });
      await holdIds(p6, B.flat());
      const before = chats().length;
      const took = await takeReadThese(p6);
      await sleep(350);
      const mid = await p6.evaluate(() => ({ working: window.__mm.working().length, status: (document.getElementById('status').textContent || '').trim() }));
      const got = await stubbed(chats, before, 1, 8000);
      const landed = await until(p6, (ids) => { const mm = window.__mm, s = mm.session.getState(); return ids.every((id) => { const n = s.nodes.get(id); return n && mm.MM.transcriptsOf(n).length; }) ? true : null; }, B.flat(), 10000);
      await sleep(150);
      const after = await p6.evaluate(() => ({ working: window.__mm.working().length, status: (document.getElementById('status').textContent || '').trim() }));
      stub.readDelay(0);
      check(`M24b. while the batch runs it is shown on the marks (${mid.working} working) and said — "${mid.status}" — and when it lands, said again: "${after.status}"; one call (${got.length})`,
        took && mid.working >= 1 && /reading 3 lines/.test(mid.status) && !!landed && after.working === 0 && /read 3 lines/.test(after.status) && got.length === 1,
        { took, mid, after, got });
      check('M24b2. its marks hold the lines B1 B2 B3 at the fixture’s words, in the reader’s name',
        !!landed && (await saidOn(p6, B[0][0])) === 'hello world', { first: await saidOn(p6, B[0][0]) });
      await letGo(p6);
    });

    await record('M24c', async () => {
      const row = await lastReader();
      const stats = await p6.evaluate(() => window.__mm.lastReads());
      const last = stats[stats.length - 1] || {};
      check(`M24c. the reader's row says what the call cost — "${row}" — and its payload is small: ${last.lines} lines, ${last.bytes} bytes, ${last.ms} ms (${last.perLine} ms a line)`,
        /^ok · \d+(\.\d)? s · read 3 lines · \d+(\.\d)? KB · \d+(\.\d)? s a line$/.test(row) && last.lines === 3 && last.bytes > 200 && last.bytes < 120000 && last.perLine > 0,
        { row, last });
    });

    await record('M25', async () => {
      stub.readSkip(2);
      const C = await p6.evaluate(writePage, { t0: 700000, lines: [[[1180, 140, 200, 44, 7]], [[1180, 220, 200, 44, 6]], [[1180, 300, 160, 44, 5]]] });
      await holdIds(p6, C.flat());
      const before = chats().length;
      const took = await takeReadThese(p6);
      await stubbed(chats, before, 1, 8000);
      await until(p6, (id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); return n && mm.MM.transcriptsOf(n).length ? true : null; }, C[2][0], 8000);
      await sleep(250);
      const said = await statusLine(p6);
      const per = await p6.evaluate(() => window.__mm.lastReads().slice(-1)[0].said);
      const have = [await saidOn(p6, C[0][0]), await saidOn(p6, C[1][0]), await saidOn(p6, C[2][0])];
      stub.readSkip(0);
      check(`M25. a line the reply left out fails by itself and says why — "${said.slice(0, 140)}" — and the others are held: ${JSON.stringify(have)}`,
        took && have[0] === 'hello world' && have[1] === null && have[2] !== null && /read 2 of 3 lines/.test(said) && /line 2/.test(said) && /no reading came back/.test(said) &&
          Array.isArray(per) && per.length === 3 && per[1].ok === false && /no reading came back/.test(per[1].error),
        { took, said, per, have });
      globalThis.__C = C;
      await letGo(p6);
    });

    await record('M26', async () => {
      const C = globalThis.__C;
      const every = A.concat(C).flat();
      await holdIds(p6, every.concat([]));
      const before = chats().length;
      const took = await takeReadThese(p6);
      const got = await stubbed(chats, before, 1, 8000);
      await sleep(300);
      const second = await saidOn(p6, C[1][0]);
      await letGo(p6);
      // Every line read now: typed, "read these again" asks for all of them — a sheet's lines a call.
      await holdIds(p6, every);
      const input = p6.locator('#summon input.filter');
      await input.fill('read these again');
      await sleep(150);
      const line = await p6.evaluate(() => (document.querySelector('#summon .readingLine, #summon .reading') || {}).textContent || '');
      const b2 = chats().length;
      await input.press('Enter');
      const again = await stubbed(chats, b2, 1, 8000);
      await sleep(900);
      const calls = chats(b2);
      check(`M26. with 6 lines held and one unread, Read these asks for ONE line (${got.map((c) => c.lines).join(',')}) and it lands (${second}); typed, "read these again" asks for all 6 lines — ${calls.map((c) => c.lines).join(' + ')} lines in ${calls.length} call(s)`,
        took && got.length === 1 && got[0].lines === 1 && second === 'hello world' && again.length >= 1 && calls.reduce((n, c) => n + c.lines, 0) === 6 && calls.every((c) => c.lines <= 8),
        { took, got, second, line, calls });
      await letGo(p6);
    });

    await record('M26b', async () => {
      // Read the board: typed at one word held, it reads every line of the board — nine here, in a sheet of eight and a sheet of one.
      await holdIds(p6, [A[1][0]]);
      const input = p6.locator('#summon input.filter');
      await input.fill('read the board');
      await sleep(150);
      const b = chats().length;
      await input.press('Enter');
      const got = await stubbed(chats, b, 1, 8000);
      await sleep(900);
      const calls = chats(b);
      check(`M26b. "read the board" typed with one word held reads the board's every line — ${calls.map((c) => c.lines).join(' + ')} lines in ${calls.length} calls, to the reader alone`,
        got.length >= 1 && calls.length === 2 && calls[0].lines === 8 && calls[1].lines === 1 && calls.every((c) => c.model === 'z-ai/glm-4.5v' && c.job === 'read-lines'),
        { calls });
      await letGo(p6);
    });

    await record('M27', async () => {
      await newBoardVia(p6);
      await sleep(200);
      const rows = [];
      for (let i = 0; i < 10; i++) rows.push([[560, 100 + i * 62, 200, 40, 6]]);
      const D = await p6.evaluate(writePage, { t0: 1000000, lines: rows });
      await holdIds(p6, D.flat());
      stub.readDelay(1200);
      const before = chats().length;
      const took = await takeReadThese(p6);
      await stubbed(chats, before, 1, 8000);
      await sleep(150);
      await letGo(p6);
      await p6.keyboard.press('Escape');
      await sleep(2200);
      const calls = chats(before);
      const landed = (await Promise.all(D.flat().map((id) => saidOn(p6, id)))).filter(Boolean).length;
      const said = await statusLine(p6);
      const idle = await p6.evaluate(() => window.__mm.working().length);
      stub.readDelay(0);
      check(`M27. 10 lines are two calls; Esc in the middle of the first stops it and the rest — ${calls.length} call made, ${landed} readings landed, nothing working (${idle}) — and the status says so: "${said.slice(0, 100)}"`,
        took && calls.length === 1 && calls[0].lines === 8 && landed === 0 && idle === 0 && /stopped/.test(said),
        { took, calls, landed, said, idle });
    });

    await record('M28', async () => {
      await newBoardVia(p6);
      await sleep(200);
      await p6.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
        const g = c.getContext('2d'); g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 3000, 2000); g.fillStyle = '#222';
        for (let i = 0; i < 12; i++) g.fillRect(200, 200 + i * 130, 1200 + (i % 3) * 400, 14);
        const file = new File([await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8))], 'notes-page.jpg', { type: 'image/jpeg' });
        await window.__mm.importPictures([file], { view: { minX: 480, minY: 140, maxX: 1380, maxY: 740 } });
        await window.__mm.boardIdle();
      });
      const pic = await p6.evaluate(() => { const mm = window.__mm, st = mm.session.getState(); const id = st.artifacts.find((a) => mm.MM.pictureOf(st.nodes.get(a))); const b = mm.MM.boundsOf(st.nodes.get(id)); return { id, box: b, asset: mm.MM.pictureOf(st.nodes.get(id)).asset }; });
      await holdIds(p6, [pic.id]);
      const before = chats().length;
      const took = await takePill(p6, 'Read the picture');
      const got = await stubbed(chats, before, 1, 10000);
      const text = await until(p6, (pid) => {
        const mm = window.__mm, st = mm.session.getState();
        const codeOf = (n) => n.reps.filter((r) => r.modality === 'code').pop();
        const id = st.artifacts.find((a) => { const n = st.nodes.get(a); const c = n && codeOf(n); return c && c.data.kind === 'text'; });
        if (!id) return null;
        const n = st.nodes.get(id), c = codeOf(n), b = mm.MM.boundsOf(n);
        return { id, code: c.data.code, box: b, name: (mm.MM.wordOf(n) || ''), by: (n.edges.find((e) => e.rel === 'made-by') || {}).to, agent: mm.agents[0].id, codeBy: c.source };
      }, pic.id, 10000);
      const after = await p6.evaluate((id) => { const mm = window.__mm, b = mm.MM.boundsOf(mm.session.getState().nodes.get(id)); return b; }, pic.id);
      const stats = await p6.evaluate(() => window.__mm.lastReads().slice(-1)[0]);
      check(`M28. Read the picture: one call to the reader alone with one image, downscaled to ${stats && stats.w}×${stats && stats.h} (${stats && stats.bytes} bytes); its text lands as a text artifact beside the picture — right of it, ${text && Math.round(text.box.minX)} ≥ ${Math.round(pic.box.maxX)} — held as the reader's, named "${text && text.name}", the picture untouched`,
        took && got.length === 1 && got[0].job === 'read-picture' && got[0].model === 'z-ai/glm-4.5v' && got[0].image === true &&
          !!stats && Math.max(stats.w, stats.h) <= 1568 && stats.bytes < 700000 &&
          !!text && text.code === FIX.picture.join('\n') && text.box.minX >= pic.box.maxX && text.by === text.agent && text.codeBy === text.agent && /notes-page/.test(text.name) &&
          JSON.stringify(after) === JSON.stringify(pic.box),
        { took, got, text, stats, pic, after });
    });

    // =====================================================================================================
    // dyna.ink's own decider (the audit's S1, S3, D2): Clef-flash through dyna.ink's relay with no key, here pointed at
    // the stub's System One route by `?decide=` — honoured only on a page on this machine. A clean device of its own.
    // =====================================================================================================
    const guards7 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-house' });
    guardsAll.push(guards7);
    await guards7.context.addInitScript(localStandIn);
    await guards7.context.addInitScript(recordDecideFetches);
    const p7 = await guards7.context.newPage();
    const houseUrl = `${url}?decide=${encodeURIComponent(stub.origin)}`;
    const house = (since = 0) => stub.systemOne().slice(since);
    const HOUSE_WORDS = 'dyna.ink · Clef-flash — no key needed · used only when 99% sure';
    /** Every node id the board holds — none may reach a decider. */
    const nodeIds = (page) => page.evaluate(() => [...window.__mm.session.getState().nodes.keys()].filter((id) => /:/.test(id)));
    const nameThrough7 = async (at, text) => {
      if (!(await holdAt(p7, at.x, at.y))) return false;
      await p7.fill('#summon input.filter', 'name: ' + text);
      await p7.press('#summon input.filter', 'Enter');
      await sleep(200);
      await letGo(p7);
      return true;
    };
    const tieBoard = async () => {
      await p7.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const A = { x: 420, y: 130 }, B = { x: 860, y: 130 }, C = { x: 420, y: 500 };
      await p7.evaluate(drawMolecule, A); const nA = await nameThrough7(A, 'molecule');
      await p7.evaluate(drawMolecule, B); const nB = await nameThrough7(B, 'compound');
      const third = await p7.evaluate(drawMolecule, C);
      // A word written on the group held: the decider is shown it (the state), and never the mark's id.
      await p7.evaluate((id) => window.__mm.session.label({ nodeId: id, text: 'oxygen', at: Date.now() }), third[0]);
      await sleep(200);
      return { nA, nB, third, C };
    };

    await record('M37', async () => {
      await p7.goto(houseUrl, { waitUntil: 'load', timeout: 60000 });
      await waitReady(p7);
      await p7.evaluate(installDraw);
      await sleep(400);
      const seats = await seatsOf(p7);
      await openModels(p7);
      const row = await seatRow(p7, 'decider');
      await closeModels(p7);
      const ids = await p7.evaluate(drawMolecule, MOLECULE_AT);
      await sleep(200);
      const held = await holdAt(p7, MOLECULE_AT.x, MOLECULE_AT.y);
      const pills = held ? await p7.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
      await letGo(p7);
      const joined = await joinCustom(p7, stub.baseUrl, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'writer');
      await closeModels(p7);
      await sleep(300);
      const joins = await p7.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'join').map((e) => e.name || e.participantName || e.kind));
      // The page's one look at the decider's list, at boot (a GET, which calls no model) — and nothing asked of it.
      const fetched = await p7.evaluate(() => window.__decideFetches.filter((f) => f.method !== 'GET').length);
      const looked = await p7.evaluate(() => window.__decideFetches.filter((f) => f.method === 'GET').map((f) => f.credentials));
      check(`M37. on a page that may use it, dyna.ink's own decider is seated with no key and no word said — its row: "${row && row.who}" · "${row && row.fallback.slice(0, 80)}…" — and nothing is asked at boot, on a hold (${pills.length} pills) or on a model's join ("${joined.slice(0, 40)}"); no join of it on the board`,
        !!seats.decider && seats.decider.house === true && seats.decider.chosen === false && seats.decider.name === 'Clef-flash' && seats.decider.model === 'clef-flash' && !!row && row.who === HOUSE_WORDS && row.tryable &&
          /^asked only when you tap Which is it\? or Which diagram is this\?/.test(row.fallback) && !/nothing is kept/.test(row.fallback) &&
          held && ids.length === 5 && /^GLM 5\.3 Flash joined/.test(joined) && house().length === 0 && fetched === 0 && !joins.some((j) => /Clef/.test(String(j))) &&
          JSON.stringify(looked) === '["omit"]',
        { seats: seats.decider, row, held, pills, joined, joins, bodies: house().length, fetched, looked });
      const kept = await p7.evaluate(() => JSON.parse(localStorage.getItem('mm-seats') || 'null'));
      check('M37b. seated silently, it is not kept as a choice — a reload asks the page again — and no key is kept for it',
        !(kept && kept.decider) && !(await p7.evaluate(() => localStorage.getItem('mm-model-keys'))), { kept });
    });

    await record('M38', async () => {
      const before = house().length;
      const t = await tieBoard();
      const held = await holdAt(p7, t.C.x, t.C.y);
      const offered = held ? await p7.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
      const took = offered.some((x) => /Which is it\?/.test(x)) && await takePill(p7, 'Which is it?');
      const landed = await until(p7, (ids) => { const mm = window.__mm, s = mm.session.getState(); return ids.some((id) => { const n = s.nodes.get(id); return n && mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 1.5); }) ? true : null; }, t.third, 8000);
      await sleep(250);
      const calls = house(before);
      const body = calls[0] && calls[0].body;
      const ids = await nodeIds(p7);
      const raw = calls[0] ? calls[0].raw : '';
      // Every id the board holds, as it is and as Mermaid writes it (`stroke_hand_a1b2_7`).
      const leaked = ids.flatMap((id) => [id, id.replace(/[^A-Za-z0-9]+/g, '_')]).filter((id) => raw.includes(id));
      // What was asked of it: the POSTs (the page's one look at its list, at boot, is a GET — M37).
      const fetches = await p7.evaluate(() => window.__decideFetches.filter((f) => f.method === 'POST'));
      const rows = await p7.evaluate((list) => {
        const mm = window.__mm, s = mm.session.getState();
        return list.flatMap((id) => { const n = s.nodes.get(id); return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 1.5).map((r) => ({ label: r.label, weight: +r.weight.toFixed(3), source: r.sourceName })) : []; });
      }, t.third);
      const pills = await p7.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim()));
      const q1 = body && body.questions && body.questions.q1;
      const lead = q1 ? Object.keys(q1.criteria).filter((k) => k !== 'none_of_these').pop() : null;
      check(`M38. Which is it? asks dyna.ink's decider once — a System One body for clef-flash, q1 a choice of ${q1 ? Object.keys(q1.criteria).join(', ') : '?'} — its state holding the group's words ("${body ? String(body.state).slice(0, 90) : ''}…") and no node id`,
        t.nA && t.nB && held && took && calls.length === 1 && !!body && body.model === 'clef-flash' && Object.keys(body.questions).join() === 'q1' && q1.type === 'choice' &&
          Object.keys(q1.criteria).slice(-1)[0] === 'none_of_these' && /oxygen/.test(body.state) && /three circles, two lines/.test(body.state) && /first of two/.test(JSON.stringify(q1.criteria)) &&
          leaked.length === 0 && !/stroke:|which:/.test(raw),
        { took, calls: calls.length, body, leaked });
      check(`M38b. sent with no key and no cookie: no authorization header (${calls[0] && calls[0].authorization}), credentials ${fetches[0] && fetches[0].credentials}, headers ${fetches[0] && fetches[0].headers.join(', ')}`,
        calls.length === 1 && calls[0].authorization === null && calls[0].cookie === null && fetches.length === 1 && fetches[0].credentials === 'omit' && JSON.stringify(fetches[0].headers) === '["content-type"]',
        { call: calls[0] && { authorization: calls[0].authorization, cookie: calls[0].cookie, origin: calls[0].origin }, fetches });
      check(`M38c. held at 0.995 as one more reading beside the engine's, in the decider's name — ${JSON.stringify(rows)} — and the field says it: ${pills.filter((x) => /Clef-flash/.test(x)).join(' | ')}`,
        !!landed && rows.length >= 1 && rows.every((r) => r.weight >= 0.99 && r.label === lead && r.source === 'Clef-flash') && pills.some((x) => new RegExp('^' + lead + ' 0\\.99\\d? · Clef-flash').test(x)),
        { rows, pills, lead });
      await letGo(p7);
    });

    await record('M39', async () => {
      stub.decideAt(0.97);
      try {
        const t = await tieBoard();
        const before = house().length;
        const held = await holdAt(p7, t.C.x, t.C.y);
        const took = held && await takePill(p7, 'Which is it?');
        const end = Date.now() + 8000;
        while (Date.now() < end && house(before).length < 1) await sleep(50);
        await sleep(500);
        const said = await statusLine(p7);
        const rows = await p7.evaluate((list) => { const mm = window.__mm, s = mm.session.getState(); return list.flatMap((id) => { const n = s.nodes.get(id); return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 1.5).map((r) => r.label) : []; }); }, t.third);
        check(`M39. an answer at 0.97 is said — "${said.slice(0, 140)}" — and holds nothing: the engine's ranking stands`,
          held && took && house(before).length === 1 && rows.length === 0 && /Clef-flash/.test(said) && /0\.97/.test(said) && /engine/.test(said), { said, rows });
        await letGo(p7);
      } finally { stub.decideAt(0.995); }
    });

    await record('M40', async () => {
      stub.systemOneRefuse({ status: 429, error: 'today’s decisions on dyna.ink are spent — the engine’s ranking stands' });
      try {
        const t = await tieBoard();
        const before = house().length;
        const held = await holdAt(p7, t.C.x, t.C.y);
        const took = held && await takePill(p7, 'Which is it?');
        const end = Date.now() + 8000;
        while (Date.now() < end && house(before).length < 1) await sleep(50);
        await sleep(500);
        const said = await statusLine(p7);
        await letGo(p7);
        await openModels(p7);
        const row = await seatRow(p7, 'decider');
        await closeModels(p7);
        check(`M40. a refusal from the relay is said in words — "${said.slice(0, 150)}" — and kept in the seat's row: "${row && row.call.slice(0, 120)}"`,
          held && took && house(before).length === 1 && /could not decide/.test(said) && /429/.test(said) && /spent/.test(said) && !!row && /^failed/.test(row.call) && /429/.test(row.call),
          { said, row });
      } finally { stub.systemOneRefuse(null); }
    });

    await record('M41', async () => {
      await p7.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      // John's two boxes and a line between them, not tied to either (drawn straight into the log: no magnet on the pen).
      const ids = await p7.evaluate(() => {
        const s = window.__mm.session;
        const line = (a, b, n = 40) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
        const box = (x, y) => [...line({ x, y }, { x: x + 160, y }), ...line({ x: x + 160, y }, { x: x + 160, y: y + 100 }), ...line({ x: x + 160, y: y + 100 }, { x, y: y + 100 }), ...line({ x, y: y + 100 }, { x, y })];
        let t = Date.now();
        const add = (pts) => { s.addStroke(pts, (t += 40), undefined, 1); const st = s.getState(); return st.contentIds[st.contentIds.length - 1]; };
        return [add(box(500, 200)), add(box(900, 200)), add(line({ x: 662, y: 250 }, { x: 898, y: 250 }))];
      });
      await sleep(200);
      await holdIds(p7, ids);
      const offered = await p7.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim()));
      const before = house().length;
      const took = offered.some((x) => /Which diagram is this\?/.test(x)) && await takePill(p7, 'Which diagram is this?');
      const end = Date.now() + 8000;
      while (Date.now() < end && house(before).length < 1) await sleep(50);
      const decided = await until(p7, (list) => window.__mm.MM.decidedNotationOf(window.__mm.session.getState(), list), ids, 8000);
      await sleep(300);
      await letGo(p7);
      await holdIds(p7, ids);
      const after = await p7.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim()));
      const body = house(before)[0] && house(before)[0].body;
      const st = await p7.evaluate((list) => { const mm = window.__mm, s = mm.session.getState(); return list.flatMap((id) => { const n = s.nodes.get(id); return n ? mm.MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 1.5).map((r) => r.label) : []; }); }, ids);
      const said = await statusLine(p7);
      check(`M41. Which diagram is this? on two boxes and a line no notation reads surely: offered without Make it Mermaid (${offered.filter((x) => /Mermaid|diagram/.test(x)).join(' | ')}), asked once with ${body ? Object.keys(body.questions.q1.criteria).join(', ') : '?'}, held as a decision (${decided && decided.notation} ${decided && decided.lead}), no reading claimed — "${said.slice(0, 110)}" — and then Make it Mermaid is offered: ${after.filter((x) => /Mermaid/.test(x)).join(' | ')}`,
        !offered.some((x) => /Make it Mermaid/.test(x)) && took && house(before).length === 1 && !!body && JSON.stringify(Object.keys(body.questions.q1.criteria)) === '["flowchart","er","diagram","none_of_these"]' &&
          !!decided && decided.notation === 'diagram' && decided.lead >= 0.99 && st.length === 0 && after.some((x) => /Make it Mermaid/.test(x)) && !after.some((x) => /Which diagram is this\?/.test(x)),
        { offered, after, decided, st, said, body: body && body.questions });
      await letGo(p7);
    });

    /** The status line's sentences from now on, in order — a brief says several, and the last is not the only one worth reading. */
    const watchStatus = (page) => page.evaluate(() => {
      window.__statusSaid = [];
      const el = document.getElementById('status');
      if (window.__statusWatch) window.__statusWatch.disconnect();
      window.__statusWatch = new MutationObserver(() => { const t = (el.textContent || '').trim(); if (t && window.__statusSaid[window.__statusSaid.length - 1] !== t) window.__statusSaid.push(t); });
      window.__statusWatch.observe(el, { childList: true, characterData: true, subtree: true });
    });
    const statusSaid = (page) => page.evaluate(() => (window.__statusSaid || []).slice());
    /** Two boxes side by side, straight into the log: a layout the drawing alone makes a page. */
    const twoBoxes = (page) => page.evaluate(() => {
      const s = window.__mm.session;
      const line = (a, b, n = 40) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
      const box = (x, y) => [...line({ x, y }, { x: x + 220, y }), ...line({ x: x + 220, y }, { x: x + 220, y: y + 140 }), ...line({ x: x + 220, y: y + 140 }, { x, y: y + 140 }), ...line({ x, y: y + 140 }, { x, y })];
      let t = Date.now();
      const add = (pts) => { s.addStroke(pts, (t += 40), undefined, 1); const st = s.getState(); return st.contentIds[st.contentIds.length - 1]; };
      return [add(box(500, 200)), add(box(760, 200))];
    });
    const sendBrief = async (page, ids, text) => {
      await holdIds(page, ids);
      await page.fill('#summon input.filter', text);
      await sleep(150);
      await page.press('#summon input.filter', 'Enter');
    };

    /** When the newest thing made holds code: the page's own clock, for "at once". */
    const codeStoodAt = (page, since) => until(page, (n) => {
      const st = window.__mm.session.getState();
      return st.artifacts.slice(n).some((id) => (st.nodes.get(id).reps || []).some((r) => r.modality === 'code')) ? Date.now() : null;
    }, since, 4000);
    const artifactCount = (page) => page.evaluate(() => window.__mm.session.getState().artifacts.length);
    const freshBoard = async () => { await p7.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); }); await sleep(150); };
    const fieldLine = (page) => page.evaluate(() => ((document.querySelector('#summon .reading') || {}).textContent || '').trim());
    const typeBrief = async (ids, text) => { await holdIds(p7, ids); await p7.fill('#summon input.filter', text); await sleep(200); return fieldLine(p7); };
    const waitChats = async (since, n = 1, ms = 10000) => { const end = Date.now() + ms; while (Date.now() < end && chats(since).length < n) await sleep(60); };

    await record('M42', async () => {
      // dyna.ink's own, seated silently at boot (M37), and a writer joined: a brief's Enter is the writer's, and the decider hears nothing of it.
      await freshBoard();
      let ids = await twoBoxes(p7);
      await sleep(150);
      const before = house().length, chatsBefore = chats().length, artsBefore = await artifactCount(p7);
      const line = await typeBrief(ids, 'my notes on the bakery’s new page');
      const t0 = await p7.evaluate(() => Date.now());
      await p7.press('#summon input.filter', 'Enter');
      const stood = await codeStoodAt(p7, artsBefore);
      await waitChats(chatsBefore);
      await sleep(300);
      const asked = chats(chatsBefore).map((c) => c.job);
      check(`M42. seated silently, dyna.ink's decider is never asked on a brief's Enter — no call (${house(before).length}); the page's boxes stood ${stood ? stood - t0 : '?'} ms after Enter; the writer asked: ${asked.join(', ')}; the line: "${line}"`,
        house(before).length === 0 && !!stood && stood - t0 < 1500 && asked.includes('page') && !/Clef-flash/.test(line),
        { calls: house(before).length, stood: stood && stood - t0, asked, line });
      await letGo(p7);
      // Chosen by a tap, but with no model here to write what it decides: still nothing is sent, and the boxes stand at once.
      await openModels(p7);
      await pressRow(p7, 'GLM 5.3 Flash', 'leave');
      await p7.locator('.seatRow[data-seat="decider"] [data-seat-house]').click({ timeout: 5000 });
      await sleep(150);
      const row = await seatRow(p7, 'decider');
      const seats = await seatsOf(p7);
      await closeModels(p7);
      await freshBoard();
      ids = await twoBoxes(p7);
      await sleep(150);
      const before2 = house().length, arts2 = await artifactCount(p7);
      const line2 = await typeBrief(ids, 'my notes on the bakery’s new page');
      const t1 = await p7.evaluate(() => Date.now());
      await p7.press('#summon input.filter', 'Enter');
      const stood2 = await codeStoodAt(p7, arts2);
      await sleep(400);
      check(`M42b. chosen by a tap (its row: "${row && row.fallback.slice(0, 120)}…"), but with no model to write: a brief's Enter still sends nothing (${house(before2).length}), the boxes stand ${stood2 ? stood2 - t1 : '?'} ms after Enter, and the line says nothing of the decider: "${line2}"`,
        !!seats.decider && seats.decider.chosen === true && !!row && /on a brief’s Enter/.test(row.fallback) && /the brief you typed/.test(row.fallback) &&
          house(before2).length === 0 && !!stood2 && stood2 - t1 < 1500 && line2 === '↵ the page’s boxes at once — a model writes the words when one joins',
        { seats: seats.decider, row, calls: house(before2).length, stood: stood2 && stood2 - t1, line: line2 });
      await letGo(p7);
      // The writer back, for what follows.
      const joined = await joinCustom(p7, stub.baseUrl, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'writer');
      await closeModels(p7);
      check(`M42c. the writer joins again: "${joined.slice(0, 60)}"`, /^GLM 5\.3 Flash joined/.test(joined), { joined });
    });

    await record('M43', async () => {
      // Chosen, with a writer, and a decider that takes a second and a half: the page stands the moment Enter is pressed,
      // and a stroke drawn while the decider thinks keeps it.
      await freshBoard();
      let ids = await twoBoxes(p7);
      await sleep(150);
      await watchStatus(p7);
      const before = house().length, chatsBefore = chats().length, arts = await artifactCount(p7);
      stub.systemOneLead('program');
      stub.systemOneDelay(1500);
      let stood = null, t0 = 0, line = '', marksBefore = 0, drew = false;
      try {
        line = await typeBrief(ids, 'a timer that counts down from ten');
        t0 = await p7.evaluate(() => Date.now());
        await p7.press('#summon input.filter', 'Enter');
        stood = await codeStoodAt(p7, arts);
        await sleep(300);
        marksBefore = await p7.evaluate(() => window.__mm.session.getState().contentIds.length);
        await p7.evaluate(() => { const d = window.__draw; d.stroke(d.line({ x: 520, y: 520 }, { x: 760, y: 560 }, 30)); });
        drew = (await p7.evaluate(() => window.__mm.session.getState().contentIds.length)) > marksBefore;
        await waitChats(chatsBefore, 1, 8000);
        await sleep(500);
      } finally { stub.systemOneDelay(0); }
      const calls = house(before);
      const body = calls[0] && calls[0].body;
      const q1 = body && body.questions.q1;
      const said = await statusSaid(p7);
      const asked = chats(chatsBefore).map((c) => c.job);
      const page = await p7.evaluate((n) => { const st = window.__mm.session.getState(); return st.artifacts.slice(n).map((id) => (st.nodes.get(id).reps.filter((r) => r.modality === 'code').pop() || { data: {} }).data.kind); }, arts);
      check(`M43. chosen, with a writer: the line says it may be overruled ("${line}"); the page's boxes stood ${stood ? stood - t0 : '?'} ms after Enter, before the decider answered; a stroke drawn while it thought keeps them — "${said.filter((x) => /drawn since/.test(x)).join(' | ').slice(0, 150)}" — and the writer is asked for the page (${asked.join(', ')})`,
        /unless Clef-flash is sure it should be something else$/.test(line) && !!stood && stood - t0 < 1200 && drew && calls.length === 1 && !!q1 &&
          JSON.stringify(Object.keys(q1.criteria)) === '["page","program","answer","none_of_these"]' && /a timer that counts down from ten/.test(body.state) &&
          said.some((x) => /^Clef-flash is sure it should be a program, but you have drawn since — the page the drawing made stands/.test(x)) &&
          asked.includes('page') && !asked.includes('program') && page.includes('html'),
        { stood: stood && stood - t0, drew, calls: calls.length, criteria: q1 && Object.keys(q1.criteria), said, asked, page });
      await letGo(p7);
      // With nothing drawn since, a sure "program" takes the page back and the writer writes a program — which lands.
      await freshBoard();
      ids = await twoBoxes(p7);
      await sleep(150);
      await watchStatus(p7);
      const before2 = house().length, chats2 = chats().length, arts2 = await artifactCount(p7);
      try {
        await typeBrief(ids, 'a timer that counts down from ten');
        await p7.press('#summon input.filter', 'Enter');
        await waitChats(chats2, 1, 8000);
        await sleep(800);
      } finally { stub.systemOneLead(null); }
      const said2 = await statusSaid(p7);
      const asked2 = chats(chats2).map((c) => c.job);
      const made = await p7.evaluate((n) => { const st = window.__mm.session.getState(); return st.artifacts.slice(n).map((id) => { const c = st.nodes.get(id).reps.filter((r) => r.modality === 'code').pop(); return c ? { kind: c.data.kind, code: c.data.code } : null; }); }, arts2);
      check(`M43b. sure of a program with nothing drawn since: the page is taken back and a program is written and lands — ${said2.filter((x) => /Clef-flash|wrote/.test(x)).join(' | ').slice(0, 170)} — the writer asked: ${asked2.join(', ')}; made: ${JSON.stringify(made.map((m) => m && m.kind))}`,
        house(before2).length === 1 && said2.some((x) => /^Clef-flash says a program \(0\.99\) — so it makes that/.test(x)) && said2.some((x) => /^GLM 5\.3 Flash wrote countdown/.test(x)) &&
          asked2.includes('program') && !asked2.includes('page') && made.length === 1 && !!made[0] && made[0].kind === 'run' && /mm\.report\("face"/.test(made[0].code),
        { said: said2, asked: asked2, made });
      await letGo(p7);
    });

    await record('M44', async () => {
      await freshBoard();
      let ids = await twoBoxes(p7);
      await sleep(150);
      await watchStatus(p7);
      stub.decideAt(0.97);
      stub.systemOneLead('program');
      const before = house().length, chatsBefore = chats().length, arts = await artifactCount(p7);
      try {
        await typeBrief(ids, 'an invoice for the corner shop');
        await p7.press('#summon input.filter', 'Enter');
        await waitChats(chatsBefore, 1, 8000);
        await sleep(500);
      } finally { stub.decideAt(0.995); stub.systemOneLead(null); }
      const said = await statusSaid(p7);
      const asked = chats(chatsBefore).map((c) => c.job);
      const kinds = await p7.evaluate((n) => { const st = window.__mm.session.getState(); return st.artifacts.slice(n).map((id) => (st.nodes.get(id).reps.filter((r) => r.modality === 'code').pop() || { data: {} }).data.kind); }, arts);
      check(`M44. under the floor the drawing decides — ${said.filter((x) => /Clef-flash/.test(x)).join(' | ').slice(0, 160)} — the page's boxes stand (${kinds.join(', ')}) and the writer is asked for its words (${asked.join(', ')})`,
        house(before).length === 1 && said.some((x) => /^Clef-flash is only 0\.97 sure of a program — under 0\.99, so the drawing decides: a page/.test(x)) &&
          kinds.includes('html') && asked.includes('page') && !asked.includes('program'),
        { said, asked, kinds });
      await letGo(p7);
      await freshBoard();
      ids = await twoBoxes(p7);
      const before2 = house().length;
      await sendBrief(p7, ids, 'run: a spinner that turns');
      await sleep(800);
      check('M44b. a prefix says what a brief makes: `run:` asks no decider', house(before2).length === 0, { calls: house(before2).length });
      await letGo(p7);
    });

    await record('M45', async () => {
      // A flowchart, its Mermaid made beside it — whose text names every mark by its own id, made safe — then a brief on it.
      await freshBoard();
      const ids = await p7.evaluate(() => {
        const s = window.__mm.session;
        const line = (a, b, n = 40) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
        const box = (x, y) => [...line({ x, y }, { x: x + 160, y }), ...line({ x: x + 160, y }, { x: x + 160, y: y + 100 }), ...line({ x: x + 160, y: y + 100 }, { x, y: y + 100 }), ...line({ x, y: y + 100 }, { x, y })];
        const arrow = (a, b) => { const pts = line(a, b); const t = pts[pts.length - 1]; return [...pts, { x: t.x - 14, y: t.y - 10 }, t, { x: t.x - 14, y: t.y + 10 }]; };
        let t = Date.now();
        const add = (pts) => { s.addStroke(pts, (t += 40), undefined, 1); const st = s.getState(); return st.contentIds[st.contentIds.length - 1]; };
        return [add(box(300, 200)), add(box(600, 200)), add(box(900, 200)), add(arrow({ x: 462, y: 250 }, { x: 598, y: 250 })), add(arrow({ x: 762, y: 250 }, { x: 898, y: 250 }))];
      });
      await sleep(200);
      await holdIds(p7, ids);
      const tookMermaid = await takePill(p7, 'Make it Mermaid');
      await sleep(400);
      const mermaid = await p7.evaluate(() => { const st = window.__mm.session.getState(); return st.artifacts.map((id) => (st.nodes.get(id).reps.filter((r) => r.modality === 'code').pop() || { data: {} }).data).find((d) => d.kind === 'mermaid'); });
      await letGo(p7);
      const before = house().length, chatsBefore = chats().length;
      stub.systemOneLead('page');
      try {
        await sendBrief(p7, ids, 'a page about the orders');
        const end = Date.now() + 8000;
        while (Date.now() < end && house(before).length < 1) await sleep(60);
        await waitChats(chatsBefore, 1, 8000);
        await sleep(300);
      } finally { stub.systemOneLead(null); }
      const raw = (house(before)[0] || {}).raw || '';
      const all = await nodeIds(p7);
      const forms = all.flatMap((id) => [id, id.replace(/[^A-Za-z0-9]+/g, '_')]);
      const leaked = forms.filter((f) => raw.includes(f));
      const me = await p7.evaluate(() => window.__mm.session.logName() || '');
      const meForms = me ? [me, me.replace(/[^A-Za-z0-9]+/g, '_')] : [];
      check(`M45. Make it Mermaid beside a flowchart (${tookMermaid ? 'taken' : 'not taken'}; its text names ${mermaid ? (mermaid.code.match(/stroke_/g) || []).length : 0} marks by id), then a brief on it: one body, carrying no id in any spelling (${leaked.length} found), not the hand's own name, and no Mermaid text`,
        tookMermaid && !!mermaid && /stroke_/.test(mermaid.code) && house(before).length === 1 && raw.length > 0 && leaked.length === 0 &&
          !meForms.some((f) => raw.includes(f)) && !/flowchart (TD|LR)|-->/.test(raw),
        { leaked, me, mermaid: mermaid && mermaid.code.slice(0, 200), state: (house(before)[0] || { body: {} }).body.state });
      await letGo(p7);
    });

    // =====================================================================================================
    // dyna.ink's own writer and reader (the audit's UX-04): a Workers AI model behind dyna.ink's relay, no key, here pointed
    // at the stub's copy of the relay's chat route by `?ai=` — honoured only on a page on this machine. A clean device.
    // =====================================================================================================
    const guards8 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-house-ai' });
    guardsAll.push(guards8);
    await guards8.context.addInitScript(localStandIn);
    await guards8.context.addInitScript(recordHouseFetches);
    const p8 = await guards8.context.newPage();
    const aiUrl = `${url}?ai=${encodeURIComponent(stub.origin)}`;
    /** What the page asked of the house: its list's GETs, and its chats. */
    const houseLooks = (since = 0) => stub.house().slice(since).filter((c) => c.path === '/ai/v1/models');
    const houseChats = (since = 0) => stub.house().slice(since).filter((c) => c.path === '/ai/v1/chat/completions');
    const joinsOn = (page) => page.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'join').map((e) => e.name));
    const WRITER_WORDS = 'dyna.ink’s writer — no key needed';
    const READER_WORDS = 'dyna.ink’s reader — no key needed';
    let board8 = null;

    await record('M46', async () => {
      await p8.goto(aiUrl, { waitUntil: 'load', timeout: 60000 });
      await waitReady(p8);
      await p8.evaluate(installDraw);
      const seated = await until(p8, () => { const h = window.__mm.seats().house; return h && h.writer && h.reader ? true : null; }, null, 8000);
      const seats = await seatsOf(p8);
      await openModels(p8);
      await sleep(150);
      const pane = await p8.evaluate(() => {
        const panel = document.getElementById('modelPanel');
        const lead = document.getElementById('mpHouse');
        const shown = (el) => !!el && el.getClientRects().length > 0;
        const r = panel.getBoundingClientRect();
        return {
          led: panel.classList.contains('houseLed'),
          lead: lead && !lead.hidden ? lead.textContent.replace(/\s+/g, ' ').trim() : null,
          keyShown: shown(document.getElementById('mpKey')),
          seatsShown: shown(document.getElementById('mpSeats')),
          fits: r.bottom <= window.innerHeight + 1 && r.top >= 0,
        };
      });
      await p8.click('#mpHouse .mpMore');
      await sleep(100);
      const more = await p8.evaluate(() => {
        const panel = document.getElementById('modelPanel');
        panel.scrollTop = panel.scrollHeight;
        const add = document.getElementById('mpAdd').getBoundingClientRect();
        return { keyShown: document.getElementById('mpKey').getClientRects().length > 0, scrolls: panel.scrollHeight > panel.clientHeight, addInView: add.top >= 0 && add.bottom <= window.innerHeight, none: !!document.querySelector('.seatRow[data-seat="writer"] [data-seat-none="writer"]') };
      });
      const writer = await seatRow(p8, 'writer');
      const reader = await seatRow(p8, 'reader');
      await closeModels(p8);
      board8 = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const held = await holdAt(p8, MOLECULE_AT.x, MOLECULE_AT.y);
      const pills = held ? await p8.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
      await letGo(p8);
      await sleep(200);
      const fetches = await p8.evaluate(() => window.__houseFetches.slice());
      const joins = await joinsOn(p8);
      check(`M46. once the relay's list answered (${houseLooks().length} GET, which calls no model) dyna.ink's own writer and reader are seated with no key and no word said — its rows: "${writer && writer.who}" · "${reader && reader.who}" — the pane leads with "${pane.lead && pane.lead.slice(0, 70)}…"`,
        !!seated && !!seats.house && seats.house.ai === true && !!seats.house.writer && seats.house.writer.name === 'dyna.ink’s writer' && seats.house.writer.sees === true &&
          !!seats.house.reader && seats.house.reader.name === 'dyna.ink’s reader' && seats.decider === null &&
          JSON.stringify(seats.writers) === '["writer"]' && JSON.stringify(seats.readers) === '["reader"]' && !!writer && writer.who === WRITER_WORDS && !!reader && reader.who === READER_WORDS &&
          writer.tryable && reader.tryable && more.none && /dyna\.ink’s relay, which asks Cloudflare’s models; dyna\.ink keeps none of it/.test(writer.fallback) && /a picture of the ink/.test(reader.fallback),
        { seats: seats.house, writers: seats.writers, readers: seats.readers, writer, reader });
      check(`M46b. the pane leads with what the person has and what is sent where, the rest under more — and it fits the screen and scrolls to Join (${JSON.stringify(more)})`,
        pane.led && !!pane.lead && /^Using dyna\.ink’s own models — no key needed/.test(pane.lead) && /goes to dyna\.ink’s relay, which asks Cloudflare’s models; dyna\.ink keeps none of it/.test(pane.lead) && /more — bring your own model/.test(pane.lead) &&
          !pane.keyShown && !pane.seatsShown && pane.fits && more.keyShown && more.addInView,
        { pane, more });
      check(`M46c. nothing is called at boot, on a hold (${pills.length} pills) or on opening the field — only the one GET of the list (${fetches.map((f) => f.method + ' ' + f.url.replace(/^.*\/ai\/v1/, '')).join(', ')}) — and nothing is written to the board for them (joins: ${JSON.stringify(joins)})`,
        held && pills.length > 0 && houseChats().length === 0 && houseLooks().length === 1 && fetches.length === 1 && fetches[0].method === 'GET' && /\/ai\/v1\/models$/.test(fetches[0].url) && joins.length === 0 &&
          houseLooks()[0].authorization === null && houseLooks()[0].cookie === null,
        { pills, fetches, joins, looks: houseLooks() });
      // Try it: one tiny prompt to the house writer, a deliberate tap — its reply in the row, and nothing on the board.
      const since = stub.house().length;
      await openModels(p8);
      if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore');
      const tried = await trySeat(p8, 'writer');
      await closeModels(p8);
      check(`M46d. try it on the writer's row: one call to dyna.ink's own writer (${houseChats(since).map((c) => c.job + ' of ' + c.model).join(', ')}), its reply kept in the row — "${tried && tried.call}" — and nothing written to the board`,
        houseChats(since).length === 1 && houseChats(since)[0].job === 'try' && houseChats(since)[0].model === 'writer' && !!tried && /^ok · \d+(\.\d)? s · replied “ok”/.test(tried.call) && (await joinsOn(p8)).length === 0,
        { tried, calls: houseChats(since).map((c) => c.job) });
    });

    await record('M47', async () => {
      const since = stub.house().length;
      const held = await holdAt(p8, MOLECULE_AT.x, MOLECULE_AT.y);
      const took = held && await takePill(p8, 'What is this?');
      const got = await until(p8, (ids) => { const s = window.__mm.session.getState(); return ids.some((id) => { const n = s.nodes.get(id); return n && window.__mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 2); }) ? true : null; }, board8.molecule, 8000);
      await sleep(200);
      const asked = houseChats(since);
      const reads = await readingsOf(p8, board8.molecule);
      const joins = await joinsOn(p8);
      const said = await statusLine(p8);
      check(`M47. What is this? asks dyna.ink's own writer once — ${asked.map((c) => c.job + ' of ' + c.model + ', ' + c.images + ' pictures, a budget of ' + c.max_tokens).join('; ')} — with no key and no cookie, and its reading lands in its name: ${JSON.stringify(reads)} — "${said.slice(0, 90)}"`,
        held && took && !!got && asked.length === 1 && asked[0].job === 'what' && asked[0].model === 'writer' && asked[0].images === 0 && asked[0].authorization === null && asked[0].cookie === null &&
          asked[0].max_tokens > 0 && asked[0].max_tokens <= 4096 && !asked[0].refused && reads.some((r) => r.label === 'state-transformation' && r.source === 'dyna.ink writer') && /dyna\.ink’s writer reads it as state transformation/.test(said),
        { asked: asked.map((c) => ({ job: c.job, model: c.model, images: c.images, max: c.max_tokens, auth: c.authorization })), reads, said });
      check(`M47b. it joined the board at that first ask, once: ${JSON.stringify(joins)}`, JSON.stringify(joins) === '["dyna.ink writer"]', { joins });
      await letGo(p8);
    });

    await record('M48', async () => {
      const since = stub.house().length;
      const wordAt = await p8.evaluate((id) => { const b = window.__mm.MM.boundsOf(window.__mm.session.getState().nodes.get(id)); return window.__mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2); }, board8.word);
      const held = await holdAt(p8, wordAt.x, wordAt.y);
      const took = held && (await takePill(p8, /^writing( \d\.\d\d)?$/) || await takePill(p8, 'Read the writing') || await takePill(p8, 'Read as writing'));
      const word = await until(p8, (id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); const t = n && mm.MM.transcriptsOf(n)[0]; return t ? t.text : null; }, board8.word, 8000);
      await sleep(200);
      const asked = houseChats(since);
      const text = await saidOn(p8, board8.word);
      check(`M48. Read the writing sends dyna.ink's own reader one picture of the ink — ${asked.map((c) => c.job + ' of ' + c.model + ', ' + c.images + ' picture').join('; ')} — and the words land on the mark: “${text}”`,
        held && took && asked.length === 1 && asked[0].job === 'read' && asked[0].model === 'reader' && asked[0].images === 1 && asked[0].authorization === null && !asked[0].refused && text === 'hello',
        { asked: asked.map((c) => ({ job: c.job, model: c.model, images: c.images })), text, word });
      await letGo(p8);
    });

    await record('M49', async () => {
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const ids = await twoBoxes(p8);
      await sleep(150);
      const since = stub.house().length, arts = await artifactCount(p8);
      await holdIds(p8, ids);
      await p8.fill('#summon input.filter', 'page about dogs');
      await sleep(200);
      const line = await fieldLine(p8);
      const t0 = await p8.evaluate(() => Date.now());
      await p8.press('#summon input.filter', 'Enter');
      const stood = await codeStoodAt(p8, arts);
      const end = Date.now() + 10000;
      while (Date.now() < end && houseChats(since).length < 1) await sleep(60);
      const filled = await until(p8, (n) => { const st = window.__mm.session.getState(); return st.artifacts.slice(n).map((id) => (st.nodes.get(id).reps.filter((r) => r.modality === 'code').pop() || { data: {} }).data).find((d) => /Good dogs/.test(JSON.stringify(d))) ? true : null; }, arts, 8000);
      await sleep(200);
      const asked = houseChats(since);
      const said = await statusLine(p8);
      check(`M49. a brief on Enter — the line: "${line}" — the page's boxes stand at once (${stood ? stood - t0 : '?'} ms), and dyna.ink's own writer writes its words into them — asked ${asked.map((c) => c.job + ' of ' + c.model).join(', ')}; "${said.slice(0, 90)}"`,
        line === '↵ the page’s boxes at once, then dyna.ink’s writer writes the words' && !!stood && stood - t0 < 1500 && asked.length === 1 && asked[0].job === 'page' && asked[0].model === 'writer' && !asked[0].refused && !!filled && /dyna\.ink’s writer built/.test(said),
        { line, stood: stood && stood - t0, asked: asked.map((c) => ({ job: c.job, model: c.model, refused: c.refused })), filled, said });
      await letGo(p8);
    });

    await record('M50', async () => {
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      board8 = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      stub.houseRefuse({ status: 429, error: 'today’s writing and reading on dyna.ink are spent — try again tomorrow, or bring your own model under models' });
      let said = '', kept = null, refusedCalls = 0;
      try {
        const since = stub.house().length;
        const held = await holdAt(p8, MOLECULE_AT.x, MOLECULE_AT.y);
        const took = held && await takePill(p8, 'What is this?');
        const end = Date.now() + 8000;
        while (Date.now() < end && houseChats(since).length < 1) await sleep(50);
        await sleep(400);
        said = await statusLine(p8);
        kept = await p8.evaluate(() => window.__mm.keptAsk());
        refusedCalls = houseChats(since).length;
        const need = await needLine(p8);
        check(`M50. the day's budget spent: the 429 is said in the relay's own words — "${said.slice(0, 170)}" — in the field too, never "needs a model" ("${need}"), and the ask is kept, not lost (${JSON.stringify(kept)})`,
          held && took && refusedCalls === 1 && /^dyna\.ink’s writer could not answer just now — today’s writing and reading on dyna\.ink are spent/.test(said) && !/HTTP|429/.test(said) && /kept: it runs when a model of yours joins/.test(said) && !!kept && kept.what === 'What is this?' &&
            !!need && /^What is this\? — today’s writing and reading on dyna\.ink are spent/.test(need) && /kept for a model of yours/.test(need) && !/needs a model/.test(need),
          { said, kept, refusedCalls, need });
        await letGo(p8);
      } finally { stub.houseRefuse(null); }
      // A model of the person's joins: the kept ask runs on it, and the house is not asked again.
      const before = chats().length, houseBefore = houseChats().length;
      const joined = await joinCustom(p8, stub.baseUrl, 'z-ai/glm-4.7-flash', STUB_KEY, false);
      await closeModels(p8);
      const got = await until(p8, (ids) => { const s = window.__mm.session.getState(); return ids.some((id) => { const n = s.nodes.get(id); return n && window.__mm.MM.interpretationsOf(n, s.nodes).some((r) => r.tier === 2 && r.sourceName !== 'dyna.ink writer'); }) ? true : null; }, board8.molecule, 8000);
      await sleep(200);
      const asked = chats(before);
      check(`M50b. a model of the person's joins ("${joined.slice(0, 50)}") and the ask kept runs on it — ${asked.map((c) => c.job + ' of ' + c.model).join(', ')} — while dyna.ink's own is not asked again (${houseChats().length - houseBefore})`,
        /^GLM 4\.7 Flash joined/.test(joined) && !!got && asked.length === 1 && asked[0].job === 'what' && asked[0].model === 'z-ai/glm-4.7-flash' && houseChats().length === houseBefore,
        { joined, asked, house: houseChats().length - houseBefore });
      // Their own model, joined for any job, is the writer now — and the house only the reader's last resort.
      const seats = await seatsOf(p8);
      check(`M50c. with a model of the person's here, it writes and dyna.ink's own does not (writers: ${JSON.stringify(seats.writers)}; readers: ${JSON.stringify(seats.readers)})`,
        JSON.stringify(seats.writers) === '["z-ai/glm-4.7-flash"]' && JSON.stringify(seats.readers) === '["reader"]', { writers: seats.writers, readers: seats.readers });
      await openModels(p8);
      await pressRow(p8, 'GLM 4.7 Flash', 'leave');
      await closeModels(p8);
    });

    await record('M50d', async () => {
      // Too many asks just now: kept — then, the minute past, asked again on the same marks and answered by the house:
      // the ask kept is let go, the field no longer says it waits, and a model joining later would not ask it again.
      const since = stub.house().length;
      const held = await holdAt(p8, MOLECULE_AT.x, MOLECULE_AT.y);
      stub.houseRefuse({ status: 429, error: 'too many asks of dyna.ink’s writer and reader from here — try again in a minute' });
      let first = null, need = null;
      try {
        const took = held && await takePill(p8, 'What is this?');
        const end = Date.now() + 8000;
        while (Date.now() < end && houseChats(since).length < 1) await sleep(50);
        await sleep(300);
        first = { took, kept: await p8.evaluate(() => window.__mm.keptAsk()) };
        need = await needLine(p8);
      } finally { stub.houseRefuse(null); }
      const again = await takePill(p8, 'What is this?');
      const end = Date.now() + 8000;
      while (Date.now() < end && houseChats(since).length < 2) await sleep(50);
      await sleep(400);
      const after = { kept: await p8.evaluate(() => window.__mm.keptAsk()), need: await needLine(p8), said: await statusLine(p8) };
      await letGo(p8);
      check(`M50d. asked again once the house answers, the ask kept is let go — first "${need}", then the field says nothing waits (${JSON.stringify(after.need)}) and nothing is kept (${JSON.stringify(after.kept)}); "${after.said.slice(0, 80)}"`,
        held && first.took && !!first.kept && first.kept.what === 'What is this?' && !!need && /too many asks of dyna\.ink’s writer and reader from here — try again in a minute/.test(need) &&
          again && houseChats(since).length === 2 && after.kept === null && after.need === null && /dyna\.ink’s writer reads it as/.test(after.said),
        { first, need, after, chats: houseChats(since).map((c) => c.job + (c.refused ? ' refused' : '')) });
    });

    await record('M50e', async () => {
      // A program's brief the house could not write: its bless taken back, the brief kept — never lost, nothing half made.
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const ids = await p8.evaluate(() => { const d = window.__draw; d.stroke(d.circle(500, 300, 60)); return window.__mm.session.getState().contentIds.slice(-1); });
      await sleep(150);
      const since = stub.house().length, arts = await artifactCount(p8);
      stub.houseRefuse({ status: 429, error: 'today’s writing and reading on dyna.ink are spent — try again tomorrow, or bring your own model under models' });
      let kept = null, said = '', after = 0;
      try {
        await holdIds(p8, ids);
        await p8.fill('#summon input.filter', 'run: a bouncing ball');
        await sleep(150);
        await p8.press('#summon input.filter', 'Enter');
        const end = Date.now() + 8000;
        while (Date.now() < end && houseChats(since).length < 1) await sleep(50);
        await sleep(400);
        kept = await p8.evaluate(() => window.__mm.keptAsk());
        said = await statusLine(p8);
        after = await artifactCount(p8);
      } finally { stub.houseRefuse(null); }
      await letGo(p8);
      const asked = houseChats(since);
      check(`M50e. a program's brief (run:) the house could not write is kept, not lost (${JSON.stringify(kept)}), and nothing is left half made (${after - arts} things made): "${said.slice(0, 160)}"`,
        asked.length === 1 && asked[0].job === 'program' && !!kept && kept.what === 'the program' && after === arts &&
          /^dyna\.ink’s writer could not answer just now — today’s writing and reading on dyna\.ink are spent/.test(said) && /nothing was made meanwhile/.test(said) && /kept: it runs when a model of yours joins/.test(said),
        { kept, said, made: after - arts, asked: asked.map((c) => c.job) });
    });

    await record('M50f', async () => {
      // A draw: the house could not answer: kept as well.
      const ids = await p8.evaluate(() => window.__mm.session.getState().contentIds.slice(-1));
      const since = stub.house().length;
      stub.houseRefuse({ status: 503, error: 'dyna.ink’s writer failed — overloaded' });
      let kept = null, said = '';
      try {
        await holdIds(p8, ids);
        await p8.fill('#summon input.filter', 'draw: a sun beside it');
        await sleep(150);
        await p8.press('#summon input.filter', 'Enter');
        const end = Date.now() + 8000;
        while (Date.now() < end && houseChats(since).length < 1) await sleep(50);
        await sleep(400);
        kept = await p8.evaluate(() => window.__mm.keptAsk());
        said = await statusLine(p8);
      } finally { stub.houseRefuse(null); }
      await letGo(p8);
      check(`M50f. a draw: the house could not answer is kept, not lost (${JSON.stringify(kept)}): "${said.slice(0, 140)}"`,
        houseChats(since).length === 1 && !!kept && kept.what === 'Drawing' && /^dyna\.ink’s writer could not answer just now — dyna\.ink’s writer failed — overloaded/.test(said) && /kept: it runs when a model of yours joins/.test(said),
        { kept, said });
    });

    await record('M51', async () => {
      const places = await everywhere(p8);
      const leaks = Object.entries(places).filter(([k, v]) => typeof v === 'string' && v.includes(STUB_KEY)).map(([k]) => k).concat(Object.entries(places.localStorage).filter(([, v]) => String(v).includes(STUB_KEY)).map(([k]) => 'localStorage:' + k));
      const carried = stub.house().filter((c) => c.authorization || c.cookie);
      const fetches = await p8.evaluate(() => window.__houseFetches.slice());
      check(`M51. the key is nowhere: no request to dyna.ink's own carried a key or a cookie (${carried.length} of ${stub.house().length}; headers sent: ${[...new Set(fetches.flatMap((f) => f.headers))].join(', ') || 'none'}), and the stub's key, typed without remember, is in no store, cache, DOM or address (${leaks.join(', ') || 'none'})`,
        carried.length === 0 && leaks.length === 0 && fetches.every((f) => !f.headers.includes('authorization')),
        { leaks, carried: carried.length, headers: [...new Set(fetches.flatMap((f) => f.headers))] });
    });

    await record('M52', async () => {
      await openModels(p8);
      if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore');
      await p8.locator('.seatRow[data-seat="writer"] [data-seat-none="writer"]').click({ timeout: 5000 });
      await sleep(150);
      const now = await seatsOf(p8);
      const kept = await p8.evaluate(() => JSON.parse(localStorage.getItem('mm-seats') || 'null'));
      await closeModels(p8);
      const looks = houseLooks().length;
      await p8.reload({ waitUntil: 'load' });
      await waitReady(p8);
      await p8.evaluate(installDraw);
      await until(p8, () => (window.__mm.seats().house || {}).reader ? true : null, null, 8000);
      const after = await seatsOf(p8);
      board8 = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const since = stub.house().length;
      const held = await holdAt(p8, MOLECULE_AT.x, MOLECULE_AT.y);
      const took = held && await takePill(p8, 'What is this?');
      await sleep(300);
      const keptAsk = await p8.evaluate(() => window.__mm.keptAsk());
      const said = await statusLine(p8);
      await letGo(p8);
      check(`M52. "none" lets dyna.ink's own writer go, remembered (${JSON.stringify(kept && kept.writer)}): a reload looks again (${houseLooks().length - looks} GET) and seats the reader alone; What is this? is kept for a model as before — "${said.slice(0, 90)}"`,
        !now.house.writer && !!now.house.reader && !!kept && JSON.stringify(kept.writer) === '{"none":true}' && houseLooks().length - looks === 1 &&
          !after.house.writer && !!after.house.reader && held && took && !!keptAsk && keptAsk.what === 'What is this?' && houseChats(since).length === 0,
        { now: now.house, kept, after: after.house, keptAsk, said });
      await openModels(p8);
      if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore');
      await p8.locator('.seatRow[data-seat="writer"] [data-seat-house="writer"]').click({ timeout: 5000 });
      await sleep(300);
      const back = await seatsOf(p8);
      const keptBack = await p8.evaluate(() => JSON.parse(localStorage.getItem('mm-seats') || 'null'));
      await closeModels(p8);
      check(`M52b. "dyna.ink’s own" takes it back — the writer seated (${back.house.writer && back.house.writer.name}), nothing kept for it, and the What is this? kept runs on it (${houseChats(since).length} call)`,
        !!back.house.writer && !(keptBack && keptBack.writer) && houseChats(since).length === 1 && houseChats(since)[0].job === 'what',
        { back: back.house, keptBack, calls: houseChats(since).map((c) => c.job) });
    });

    await record('M54', async () => {
      // Auto-read is the hand's tile, and it asks a model of theirs: never dyna.ink's own, seated with no act.
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const board = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const since = stub.house().length;
      const seats = await seatsOf(p8);
      await p8.evaluate(() => window.__mm.setAutoRead(true));
      try {
        await p8.evaluate(() => { const d = window.__draw; d.stroke(d.word(700, 600, 200, 44, 6)); });
        await sleep(1500);
      } finally { await p8.evaluate(() => window.__mm.setAutoRead(false)); }
      const sent = houseChats(since);
      const read = await p8.evaluate((id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); return !!(n && mm.MM.transcriptsOf(n)[0]); }, board.word);
      check(`M54. auto-read on with only dyna.ink's own reader seated (${JSON.stringify(seats.readers)}): a word written and the board's unread words send nothing (${sent.length} asks), and nothing is read (${read})`,
        JSON.stringify(seats.readers) === '["reader"]' && sent.length === 0 && !read, { readers: seats.readers, sent: sent.map((c) => c.job + '/' + c.model) });
    });

    await record('M55', async () => {
      // "none" on the reader: no picture of the ink goes to dyna.ink, not even to its writer, which sees.
      await openModels(p8);
      if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore');
      await p8.locator('.seatRow[data-seat="reader"] [data-seat-none="reader"]').click({ timeout: 5000 });
      await sleep(150);
      const now = await seatsOf(p8);
      await closeModels(p8);
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const board = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const since = stub.house().length;
      const wordAt = await p8.evaluate((id) => { const b = window.__mm.MM.boundsOf(window.__mm.session.getState().nodes.get(id)); return window.__mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2); }, board.word);
      const held = await holdAt(p8, wordAt.x, wordAt.y);
      const took = held && (await takePill(p8, /^writing( \d\.\d\d)?$/) || await takePill(p8, 'Read the writing') || await takePill(p8, 'Read as writing'));
      await sleep(600);
      const kept = await p8.evaluate(() => window.__mm.keptAsk());
      const sent = houseChats(since);
      check(`M55. "none" on the reader (writer ${now.house.writer && now.house.writer.sees ? 'sees' : 'does not see'}; readers ${JSON.stringify(now.readers)}): Read the writing sends nothing to dyna.ink (${sent.map((c) => c.model + ' ' + c.images + ' picture').join(', ') || 'none'}) and is kept for a model (${JSON.stringify(kept)})`,
        !now.house.reader && !!now.house.writer && JSON.stringify(now.readers) === '[]' && held && took && sent.length === 0 && !!kept && kept.what === 'Read the writing',
        { now: now.house, readers: now.readers, sent, kept });
      await openModels(p8);
      if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore');
      await p8.locator('.seatRow[data-seat="reader"] [data-seat-house="reader"]').click({ timeout: 5000 });
      const word = await until(p8, (id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id); const t = n && mm.MM.transcriptsOf(n)[0]; return t ? t.text : null; }, board.word, 8000);
      await sleep(200);
      await closeModels(p8);
      await letGo(p8);
      const back = houseChats(since);
      check(`M55b. "dyna.ink’s own" takes the reader back, and the read kept runs on it — ${back.map((c) => c.job + ' of ' + c.model + ', ' + c.images + ' picture').join('; ')} — “${word}”`,
        back.length === 1 && back[0].model === 'reader' && back[0].images === 1 && word === 'hello', { back: back.map((c) => ({ job: c.job, model: c.model, images: c.images })), word });
    });

    await record('M55c', async () => {
      // "none" outlives a model of the person's own: let go, joined for the seat and gone again, dyna.ink's reader is not
      // seated by itself — nothing of the ink goes to dyna.ink — and a reload keeps it so. Only "dyna.ink’s own" takes it back.
      const more = async () => { if (!(await p8.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p8.click('#mpHouse .mpMore').catch(() => {}); };
      await openModels(p8); await more();
      await p8.locator('.seatRow[data-seat="reader"] [data-seat-none="reader"]').click({ timeout: 5000 });
      await sleep(150);
      const joined = await joinCustom(p8, stub.baseUrl, 'z-ai/glm-5.3-flash', STUB_KEY, false, 'reader');
      await sleep(200);
      const mid = await seatsOf(p8);
      await openModels(p8);
      await p8.locator('#mpList [data-leave]').first().click({ timeout: 5000 });
      await sleep(400);
      const left = await seatsOf(p8);
      const status = await p8.evaluate(() => document.getElementById('mpStatus').textContent || '');
      const kept = await p8.evaluate(() => JSON.parse(localStorage.getItem('mm-seats') || 'null'));
      await closeModels(p8);
      await p8.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
      await sleep(150);
      const board = await p8.evaluate(drawBoard, MOLECULE_AT);
      await sleep(200);
      const since = stub.house().length;
      const wordAt = await p8.evaluate((id) => { const b = window.__mm.MM.boundsOf(window.__mm.session.getState().nodes.get(id)); return window.__mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2); }, board.word);
      const held = await holdAt(p8, wordAt.x, wordAt.y);
      const took = held && (await takePill(p8, /^writing( \d\.\d\d)?$/) || await takePill(p8, 'Read the writing') || await takePill(p8, 'Read as writing'));
      await sleep(600);
      await letGo(p8);
      const sent = houseChats(since);
      check(`M55c. "none" on the reader, then a reader of the person's own joined (${JSON.stringify(mid.readers)}) and gone ("${status.slice(0, 60)}"): dyna.ink's reader is not seated again (${JSON.stringify(left.house.reader)}), the choice kept (${JSON.stringify(kept && kept.off)}), and Read the writing sends nothing to dyna.ink (${sent.length})`,
        /joined|reader/.test(joined) && mid.readers.length === 1 && mid.readers[0] !== 'reader' && !left.house.reader && JSON.stringify(left.readers) === '[]' && !!kept && !!kept.off && kept.off.reader === true && held && took && sent.length === 0,
        { joined, mid: mid.readers, left: left.house, kept, sent: sent.map((c) => c.model) });
      // A reload keeps it so: the writer is seated once the relay answers, the reader is not.
      await p8.reload({ waitUntil: 'load' });
      await waitReady(p8);
      await until(p8, () => { const h = window.__mm.seats().house; return h && h.writer ? true : null; }, null, 8000);
      await sleep(300);
      const after = await seatsOf(p8);
      check(`M55c2. after a reload dyna.ink's reader is still let go (${JSON.stringify(after.house.reader)}) while its writer is seated (${after.house.writer && after.house.writer.name})`,
        !!after.house.writer && !after.house.reader, { house: after.house });
      await openModels(p8); await more();
      await p8.locator('.seatRow[data-seat="reader"] [data-seat-house="reader"]').click({ timeout: 5000 });
      await sleep(200);
      const back = await seatsOf(p8);
      await closeModels(p8);
      check(`M55c3. "dyna.ink’s own" takes it back (${back.house.reader && back.house.reader.name})`, !!back.house.reader, { house: back.house });
    });

    // The house not answering — its list refused, as a relay with no Workers AI binding refuses it — in a device of its own.
    const guards9 = await freshContext(browser, { origins: [servers.staticOrigin, stub.origin], label: 'models-house-down' });
    guardsAll.push(guards9);
    await guards9.context.addInitScript(localStandIn);
    const p9 = await guards9.context.newPage();
    await record('M53', async () => {
      stub.houseDown(501);
      const looks = houseLooks().length, chatsBefore = houseChats().length;
      try {
        await p9.goto(aiUrl, { waitUntil: 'load', timeout: 60000 });
        await waitReady(p9);
        await p9.evaluate(installDraw);
        // The page's one look at the list, refused: nothing is seated, and nothing more is asked.
        const end = Date.now() + 5000;
        while (Date.now() < end && houseLooks().length - looks < 1) await sleep(50);
        await sleep(300);
        const seats = await seatsOf(p9);
        await openModels(p9);
        const pane = await p9.evaluate(() => ({ led: document.getElementById('modelPanel').classList.contains('houseLed'), lead: !document.getElementById('mpHouse').hidden, key: document.getElementById('mpKey').getClientRects().length > 0 }));
        const writer = await seatRow(p9, 'writer');
        await closeModels(p9);
        const ids = await p9.evaluate(drawMolecule, MOLECULE_AT);
        await sleep(200);
        const held = await holdAt(p9, MOLECULE_AT.x, MOLECULE_AT.y);
        const took = held && await takePill(p9, 'What is this?');
        await sleep(300);
        const kept = await p9.evaluate(() => window.__mm.keptAsk());
        const said = await statusLine(p9);
        await letGo(p9);
        check(`M53. the house not answering: one GET of its list (${houseLooks().length - looks}), nothing seated, no lead (${JSON.stringify(pane)}), the writer's row "${writer && writer.who}" — and What is this? is kept for a model as it always was: "${said.slice(0, 90)}"`,
          houseLooks().length - looks === 1 && !!seats.house && seats.house.ai === false && !seats.house.writer && !seats.house.reader && seats.writers.length === 0 &&
            !pane.led && !pane.lead && pane.key && !!writer && writer.who === 'nothing chosen' && ids.length === 5 && held && took && !!kept && kept.what === 'What is this?' && /needs a model/.test(said) && houseChats().length === chatsBefore,
          { seats: seats.house, pane, writer, kept, said });
      } finally { stub.houseDown(0); }
    });

    await record('M53b', async () => {
      // The house decider waits for its list as the writer and reader do: refused (the relay not there yet), it is not
      // seated and nothing is asked of it — and on a reload that finds it answering, it is.
      const both = `${url}?ai=${encodeURIComponent(stub.origin)}&decide=${encodeURIComponent(stub.origin)}`;
      stub.houseDown(501);
      stub.decideDown(503);
      const looks = stub.decideLooks().length, posts = stub.systemOne().length;
      let seats = null, row = null, pills = [], kept = null;
      try {
        await p9.goto(both, { waitUntil: 'load', timeout: 60000 });
        await waitReady(p9);
        await p9.evaluate(installDraw);
        const end = Date.now() + 5000;
        while (Date.now() < end && stub.decideLooks().length - looks < 1) await sleep(50);
        await sleep(400);
        seats = await seatsOf(p9);
        await openModels(p9);
        if (!(await p9.evaluate(() => document.getElementById('modelPanel').classList.contains('moreOpen')))) await p9.click('#mpHouse .mpMore').catch(() => {});
        row = await seatRow(p9, 'decider');
        await closeModels(p9);
        await p9.evaluate(() => { const mm = window.__mm; mm.session.load([]); mm.setView(1, 0, 0); });
        await sleep(150);
        await p9.evaluate(drawMolecule, MOLECULE_AT);
        await sleep(200);
        const held = await holdAt(p9, MOLECULE_AT.x, MOLECULE_AT.y);
        pills = held ? await p9.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((x) => x.textContent.trim())) : [];
        if (held) await takePill(p9, 'What is this?');
        await sleep(400);
        kept = await p9.evaluate(() => window.__mm.keptAsk());
        await letGo(p9);
      } finally { stub.decideDown(0); stub.houseDown(0); }
      check(`M53b. the house decider's list refused: one look (${stub.decideLooks().length - looks}), no decider seated (${JSON.stringify(seats && seats.decider)}), its row "${row && row.who}", no Which is it? among ${pills.length} pills, and nothing asked of it (${stub.systemOne().length - posts} posts)`,
        stub.decideLooks().length - looks === 1 && !!seats && seats.decider === null && seats.house.decide === false && !!row && !/Clef/.test(row.who) &&
          !pills.some((t) => /Which is it|Which diagram/.test(t)) && stub.systemOne().length === posts && !!kept && kept.what === 'What is this?',
        { decider: seats && seats.decider, house: seats && seats.house, row, pills, posts: stub.systemOne().length - posts });
      // The control: answered on a reload, the house decider is seated — so the refusal above is what kept it out.
      await p9.reload({ waitUntil: 'load' });
      await waitReady(p9);
      const up = await until(p9, () => (window.__mm.seats().decider ? true : null), null, 8000);
      const seatsUp = await seatsOf(p9);
      check(`M53b2. answered on a reload, the house decider is seated (${JSON.stringify(seatsUp.decider)})`,
        !!up && !!seatsUp.decider && seatsUp.decider.house === true && seatsUp.house.decide === true, { decider: seatsUp.decider });
    });
  } catch (err) {
    check(`the scenario threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    await screenshot(page, 'models');
  } finally {
    await stub.stop();
  }
  if (steps.some((s) => !s.ok)) await screenshot(page, 'models');
  return { steps, guards: guardsAll, measured: { stubCalls: stub.calls().length } };
}
