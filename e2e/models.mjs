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
// answering with OpenRouter's shapes, recorded in metamedium-core's
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

import { startModelStub, STUB_KEY, REASONING_ONLY } from './servers.mjs';
import { isModelRequest } from './guards.mjs';
import { sleep, waitReady } from './keep.mjs';

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
async function joinCustom(page, base, model, key, remember) {
  await openModels(page);
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
      const pick = JSON.parse(e.localStorage['mm-model-pick'] || 'null');
      check(`M12. the key is nowhere it was not asked to be — not in the log (${e.log.length} characters), the board's journal (${e.idbStores} stores), a cache (${e.cacheEntries} entries), the DOM or the address; in this browser's storage only under ${lsHolding.join(', ') || 'nothing'}, where "remember" put it; the wrong key nowhere at all`,
        !has(e.log) && !has(e.idb) && !has(e.caches) && !has(e.dom) && !has(e.address) && e.idbStores > 0 &&
          JSON.stringify(lsHolding) === '["mm-model-key"]' && e.localStorage['mm-model-key'] === JSON.stringify(STUB_KEY) && !!pick && !('apiKey' in pick) && pick.model === 'z-ai/glm-5.3-flash',
        { lsHolding, pick, idbStores: e.idbStores, cacheEntries: e.cacheEntries });
    });
  } catch (err) {
    check(`the scenario threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    await screenshot(page, 'models');
  } finally {
    await stub.stop();
  }
  if (steps.some((s) => !s.ok)) await screenshot(page, 'models');
  return { steps, guards: [guards], measured: { stubCalls: stub.calls().length } };
}
