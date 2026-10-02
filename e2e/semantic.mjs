// The semantic seat (PLAN-IPAD-NOTES I9), as records of the `boards` scenario — Find lives there.
//
//     node e2e/run.mjs boards
//
// A small model that runs on THIS device turns words into numbers, so Find lets in what no word typed matched and
// *Notes like this* lists the others nearest in meaning. The gate has no model to download (the container's proxy
// answers 403 for the real host, and the gate's guard stops it too), so:
//   - the seat is first filled with a STAND-IN TRANSPORT made in the page (`createStubEmbedTransport`: related words
//     score higher, nothing else is true of it) — N24b–N24h drive Find, the field's offer, the region's button and the
//     seat's row through the real pointer and keys; and
//   - then the page's own LOADER is run against a model BUILT for the gate by core's writer and served from an origin of
//     its own (`startEmbedStub`, servers.mjs) — N24i–N24l: the files fetched once with no key and no cookie, kept in the
//     browser's cache, nothing loaded at boot, and what goes wrong said in words.
// What no record here says is anything about the real `potion-base-8M`: its files have never been read by this code.
//
// The records:
//   N24   nobody seated: Find is as it was — "budget" finds nothing — and nothing embeds; the seat's row says it holds
//         nobody (and no longer that it is "coming"); a held mark with a word on it is offered no *Notes like this*
//   N24b  a stand-in seated: the row says who, where it runs, how many numbers a text and no key; joining and drawing and
//         holding embed nothing
//   N24c  Find by meaning: "budget" lets in "Pricing" and "Fee schedule" (no word in common), each said *by meaning*, and
//         not "Garden hose"; a second query embeds only itself (each text once); a word typed still finds what it did
//   N24d  Notes like this: not in the row; typed, it lists the near notes across boards, each with its number and reason, the
//         thing itself left out, nothing written to the log; a tap opens the board where the note is; typing leaves it
//   N24e  a region: its panel has the button only with the seat held, and it lists notes like the region's words
//   N24f  the seat let go: Find is by the words typed again, no offer, nothing embedded since
//   N24g  an address typed with a user, a query or the wrong scheme is refused in words, and nothing is fetched
//   N24i  the loader: *load it here* fetches the model's two files once, with no key or cookie, seats it (name, 64 numbers,
//         its size) and Find by meaning works on the real reader; the address is kept, a key never
//   N24j  a reload loads nothing; the seat loads again from the browser's cache with no request to the host
//   N24k  what goes wrong, in words: a refusal (403), a missing file (404), a page of HTML where the weights should be, a
//         file that declares itself too big — each said in the row and the status line, the seat empty, no page error
//   N24l  no key anywhere: nothing the seat stores or sends carries one, and the real host is on the gate's guard

import { sleep, waitReady, boardsNow, openBoardsPane, closeBoardsPane, switchTo, newBoardVia } from './keep.mjs';
import { startEmbedStub, EMBED_GROUPS } from './servers.mjs';
import { isModelRequest } from './guards.mjs';

const until = (page, fn, arg, timeout = 10000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);

async function nameBoard(page, id, name) {
  await openBoardsPane(page);
  await page.click(`#boardsPanel button[data-rename="${id}"]`);
  const input = `#boardsPanel input[data-name-input="${id}"]`;
  await page.fill(input, name);
  await page.press(input, 'Enter');
  return until(page, ([b, n]) => { const e = window.__mm.boards().list.find((x) => x.id === b); return !!e && e.name === n && !window.__mm.boards().busy; }, [id, name]);
}

/** A box drawn as one stroke of the board's own, content, labelled. */
function boxLabelled(arg) {
  const s = window.__mm.session, b = arg.box, pts = [];
  for (let i = 0; i <= 20; i++) pts.push({ x: b.minX + ((b.maxX - b.minX) * i) / 20, y: b.minY });
  for (let i = 0; i <= 20; i++) pts.push({ x: b.maxX, y: b.minY + ((b.maxY - b.minY) * i) / 20 });
  for (let i = 0; i <= 20; i++) pts.push({ x: b.maxX - ((b.maxX - b.minX) * i) / 20, y: b.maxY });
  for (let i = 0; i <= 20; i++) pts.push({ x: b.minX, y: b.maxY - ((b.maxY - b.minY) * i) / 20 });
  const id = s.addStroke(pts, Date.now(), undefined, 1, { content: true });
  s.label({ nodeId: id, text: arg.word, at: Date.now() + 1 });
  return id;
}
const textOn = (arg) => { window.__mm.session.import({ kind: 'text', path: 'text/' + arg.n + '.txt', name: 'text ' + arg.n, bounds: arg.box, code: arg.code, at: Date.now() + arg.n }); };

export async function semanticTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const embed = await startEmbedStub();
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const guards = await freshContext(browser, { origins: [servers.staticOrigin, embed.origin], label: 'boards-semantic' });
  // Nothing on this machine is probed: the models pane asks Ollama's and LM Studio's ports when it opens, and a run must not depend on
  // what John has running (models.mjs's stand-in, smaller): those two ports answer as if nothing listened.
  await guards.context.addInitScript(() => {
    const real = window.fetch.bind(window);
    window.fetch = (input, init) => {
      let u = null;
      try { u = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href); } catch (e) { return real(input, init); }
      if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && (u.port === '11434' || u.port === '1234')) return Promise.reject(new TypeError('Failed to fetch'));
      return real(input, init);
    };
  });
  const page = await guards.context.newPage();
  const hits = () => page.evaluate(() => [...document.querySelectorAll('#findPanel .fdHit')].map((h) => ({ board: h.dataset.board, id: h.dataset.id || null, name: (h.closest('.fdGroup').querySelector('.fdBoardName') || {}).textContent || '', text: h.textContent.replace(/\s+/g, ' ').trim(), title: h.title || '', why: (h.querySelector('.fdWhy') || {}).textContent || '' })));
  const findStatus = () => page.evaluate(() => (document.getElementById('findStatus').textContent || '').trim());
  const openFind = async () => {
    const open = await page.evaluate(() => { const p = document.getElementById('findPanel'); return !!p && !p.hasAttribute('hidden'); });
    if (!open) { await page.click('#findBtn'); await page.waitForSelector('#findPanel:not([hidden])', { timeout: 5000 }); }
  };
  const find = async (q, want, settle = 700) => {
    await openFind();
    await page.fill('#findInput', '');
    await page.fill('#findInput', q);
    let got = [];
    for (let i = 0; i < 160; i++) {
      got = await hits();
      if (want && want(got)) break;
      await sleep(50);
    }
    await sleep(want ? 0 : settle);
    return want ? got : hits();
  };
  const sem = () => page.evaluate(() => window.__mm.semantic());
  const events = () => page.evaluate(() => window.__mm.session.getEvents().length);
  const statusLine = () => page.evaluate(() => (document.getElementById('status').textContent || '').trim());
  const seatRow = () => page.evaluate(() => { const r = document.querySelector('#mpSeats .seatRow[data-seat="semantic"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const openModels = async () => {
    if (await page.evaluate(() => !document.getElementById('modelPanel').hasAttribute('hidden'))) return;
    await page.click('#ccBtn');
    await page.click('#modelBtn', { timeout: 5000 });
    await page.waitForSelector('#modelPanel:not([hidden])', { timeout: 5000 });
  };
  const closeModels = async () => { if (await page.evaluate(() => !document.getElementById('modelPanel').hasAttribute('hidden'))) { await page.click('#modelPanel .paneClose').catch(() => {}); await sleep(60); } };
  const hold = async (ids) => {
    await page.evaluate((list) => window.__mm.session.summonMarks(list, Date.now()), ids);
    await page.waitForSelector('#summon .pill.item', { timeout: 6000 });
    await sleep(150);
  };
  const letGo = async () => { await page.keyboard.press('Escape'); await sleep(120); await page.evaluate(() => { const s = window.__mm.session, st = s.getState(); if (st.summon) s.dismiss(st.summon.id, Date.now()); if (s.getState().selection.length) s.select([], Date.now() + 1); }); await sleep(80); };
  const pills = () => page.evaluate(() => [...document.querySelectorAll('#summon .pill.item')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()));
  const readingLine = () => page.evaluate(() => ((document.querySelector('#summon .readingLine, #summon .reading') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const GROUPS = EMBED_GROUPS;
  let alpha = null, notes = null, weekly = null, box = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    alpha = (await boardsNow(page)).current;
    await nameBoard(page, alpha, 'Alpha');
    box = await page.evaluate(boxLabelled, { box: { minX: 3000, minY: 2000, maxX: 3160, maxY: 2100 }, word: 'Pricing' });
    await page.evaluate(() => window.__mm.boardIdle());
    notes = await newBoardVia(page);
    await nameBoard(page, notes, 'Notes');
    await page.evaluate(textOn, { n: 1, box: { minX: -2500, minY: 1800, maxX: -2140, maxY: 2038 }, code: 'Fee schedule' });
    await page.evaluate(textOn, { n: 2, box: { minX: -2500, minY: 2200, maxX: -2140, maxY: 2438 }, code: 'Garden hose and lawn' });
    await page.evaluate(() => window.__mm.boardIdle());
    weekly = await newBoardVia(page);
    await nameBoard(page, weekly, 'Weekly');
    await page.evaluate(textOn, { n: 1, box: { minX: 100, minY: 100, maxX: 460, maxY: 338 }, code: 'Standup call' });
    await page.evaluate(() => window.__mm.boardIdle());
    await switchTo(page, alpha);

    // ---- N24. nobody seated: Find as it was, nothing embedded, the row says nobody ------------------------------
    const none = await find('budget', null, 900);
    const status0 = await findStatus();
    await closeModels();
    await openModels();
    const row0 = await seatRow();
    await closeModels();
    await hold([box]);
    const pills0 = await pills();
    await page.locator('#summon input.filter').fill('notes like this');
    await sleep(200);
    const line0 = await readingLine();
    await letGo();
    const s0 = await sem();
    check('N24. nobody in the semantic seat: typing "budget" in Find finds nothing — the word is on no board — and its status says so with no mention of meaning; the seat\'s row says it holds nobody and offers "load it here" (not "coming"); a held box with the word “Pricing” on it is offered no Notes like this, in the row or typed; nothing was embedded',
      none.length === 0 && /nothing on 3 boards says “budget”/.test(status0) && !/meaning/.test(status0) &&
        /nothing chosen/.test(row0) && /load it here/.test(row0) && !/coming/.test(row0) &&
        pills0.length > 0 && !pills0.some((p) => /like this/i.test(p)) && !/like this/i.test(line0) &&
        s0.held === null && s0.asked === 0 && s0.held_vectors === 0,
      { none, status0, row0, pills0, line0, s0 });

    // ---- N24b. a stand-in seated: the row says who; joining, drawing and holding embed nothing --------------------
    await page.evaluate((groups) => window.__mm.joinSemanticTransport(window.__mm.MM.createStubEmbedTransport({ groups, dimension: 256 })), GROUPS);
    await sleep(200);
    await openModels();
    const row1 = await seatRow();
    await closeModels();
    const held = await sem();
    await page.evaluate(() => { const s = window.__mm.session; const pts = []; for (let i = 0; i <= 30; i++) pts.push({ x: 3300 + i * 6, y: 2300 + Math.sin(i / 3) * 4 }); s.addStroke(pts, Date.now(), undefined, 1); });
    await hold([box]);
    await letGo();
    const after = await sem();
    check('N24b. a stand-in transport seated: the seat\'s row says who holds it, that it is on this device, 256 numbers a text and no key; joining, drawing a stroke and holding a mark with a word on it embedded nothing',
      !!held.held && held.held.name === 'stub-embed' && held.held.dimension === 256 && /stub-embed/.test(row1) && /on this device/.test(row1) && /256 numbers a text/.test(row1) && /no key/.test(row1) &&
        held.asked === 0 && after.asked === 0 && after.held_vectors === 0,
      { row1, held, after });

    // ---- N24c. Find by meaning ------------------------------------------------------------------------------------
    const byMeaning = await find('budget', (h) => h.some((x) => /Pricing/.test(x.text)) && h.some((x) => /Fee schedule/.test(x.text)));
    const status1 = await findStatus();
    const asked1 = (await sem()).asked;
    const hose = byMeaning.some((x) => /Garden hose/.test(x.text));
    const pricing = byMeaning.find((x) => /“Pricing”/.test(x.text));
    const fee = byMeaning.find((x) => /Fee schedule/.test(x.text));
    const meeting = await find('meeting', (h) => h.some((x) => /Standup call/.test(x.text)));
    const asked2 = (await sem()).asked;
    const word = await find('pric', (h) => h.some((x) => /Pricing/.test(x.text)));
    const wordPricing = word.find((x) => /“Pricing”/.test(x.text));
    check('N24c. with the seat held, Find by meaning: "budget" lets in the label “Pricing” (Alpha) and the text “Fee schedule” (Notes), neither with a word in common, each said "by meaning" with its number, and not “Garden hose”; the status says "by meaning too"; asking "meeting" afterwards embeds only the query (' + (asked2 - asked1) + ' text) and lets in “Standup call”; a word typed, "pric", still finds the label by its letters, not said by meaning',
      !!pricing && /by meaning 1\.00/.test(pricing.text) && pricing.name === 'Alpha' && !!fee && /by meaning 0\.7/.test(fee.text) && fee.name === 'Notes' && !hose &&
        /by meaning too/.test(status1) && asked1 > 0 && asked2 - asked1 === 1 && meeting.some((x) => /Standup call/.test(x.text) && x.name === 'Weekly') &&
        !!wordPricing && !/by meaning/.test(wordPricing.text),
      { byMeaning, status1, asked1, asked2, meeting, word });

    // ---- N24d. Notes like this ---------------------------------------------------------------------------------------
    await page.fill('#findInput', '');
    await page.keyboard.press('Escape');
    await sleep(100);
    await switchTo(page, alpha);
    await hold([box]);
    const pills1 = await pills();
    await page.locator('#summon input.filter').fill('notes like this');
    await sleep(250);
    const line1 = await readingLine();
    const n0 = await events();
    const askedBefore = (await sem()).asked;
    await page.locator('#summon input.filter').press('Enter');
    await page.waitForSelector('#findPanel:not([hidden]) .fdLikeHead', { timeout: 8000 }).catch(() => {});
    const got = await (async () => { for (let i = 0; i < 100; i++) { const h = await hits(); if (h.length) return h; await sleep(50); } return []; })();
    const head = await page.evaluate(() => (document.querySelector('#findPanel .fdLikeHead') || {}).textContent || '');
    const status2 = await findStatus();
    const n1 = await events();
    const feeLike = got.find((x) => /Fee schedule/.test(x.text));
    check('N24d. Notes like this on the held box “Pricing”: not among the pills with nothing typed; typed ("notes like this") the reading line says it; Enter opens Find\'s pane on “notes like “Pricing””, listing “Fee schedule” (Notes) with its number and reason (0.71, by stub-embed, no word in common) — and not the box itself, not “Garden hose” — embedding nothing new (every text was already held: ' + askedBefore + ' → ' + ((await sem()).asked) + ') and writing nothing to the log (' + n0 + ' → ' + n1 + ' events)',
      !pills1.some((p) => /like this/i.test(p)) && /notes like this/i.test(line1) && /notes like “Pricing”/.test(head) && /near it/.test(status2) && /stub-embed/.test(status2) &&
        !!feeLike && feeLike.name === 'Notes' && /0\.71/.test(feeLike.why) && /stub-embed/.test(feeLike.why) && /no word in common/.test(feeLike.why) &&
        !got.some((x) => x.name === 'Alpha') && !got.some((x) => /Garden/.test(x.text)) && n1 === n0 && (await sem()).asked === askedBefore,
      { pills1, line1, head, status2, got, n0, n1 });

    // A tap on the note opens its board where it stands.
    await page.waitForSelector('#findPanel:not([hidden]) .fdHit', { timeout: 3000 }).catch(() => {});
    const hitEl = page.locator('#findPanel .fdHit', { hasText: 'Fee schedule' }).first();
    if (await hitEl.count()) await hitEl.click();
    const onNotes = await until(page, (id) => window.__mm.board().id === id && window.__mm.board().ready, notes, 15000);
    const ring = await page.evaluate(() => window.__mm.findFlashState());
    check('N24d2. a tap on that note opens the Notes board in place, the view on the text, ringed for a moment — the same tap a found word takes',
      onNotes && ring.active && !!ring.box, { onNotes, ring });

    // Typing leaves it.
    await switchTo(page, alpha);
    await hold([box]);
    await page.locator('#summon input.filter').fill('like');
    await sleep(150);
    await page.locator('#summon input.filter').press('Enter');
    await page.waitForSelector('#findPanel:not([hidden]) .fdLikeHead', { timeout: 8000 }).catch(() => {});
    await sleep(400);
    const inLike = await page.evaluate(() => !!document.querySelector('#findPanel .fdLikeHead'));
    await page.fill('#findInput', 'hose');
    await sleep(500);
    const outOfLike = await page.evaluate(() => ({ head: !!document.querySelector('#findPanel .fdLikeHead'), status: document.getElementById('findStatus').textContent }));
    await letGo();
    check('N24d3. "like" typed at the field also offers it (a verb of its own); a word typed in the pane afterwards leaves notes-like-this and searches again',
      inLike && !outOfLike.head && /say it|says|nothing on/.test(outOfLike.status), { inLike, outOfLike });

    // ---- N24e. a region: the button is in its panel, only with the seat held ----------------------------------------
    await page.keyboard.press('Escape');
    await switchTo(page, alpha);
    const summonBefore = await page.evaluate(() => { const st = window.__mm.session.getState(); return st.summon ? { ids: st.summon.enclosedIds, src: st.summon.scopeSource } : null; });
    const region = await page.evaluate(() => { const s = window.__mm.session; const id = s.region({ name: 'Cost', bounds: { minX: 2900, minY: 2400, maxX: 3400, maxY: 2700 }, at: Date.now() }); s.select([id], Date.now() + 1); return id; });
    await sleep(300);
    const btn = page.locator('[data-region-like]');
    const panel = await page.evaluate(() => { const s = window.__mm.session.getState(); return { summon: !!s.summon, selection: s.selection, html: (document.getElementById('inspector') || {}).innerHTML ? document.getElementById('inspector').innerHTML.slice(0, 300) : '' }; });
    const askedRegion = (await sem()).asked;
    const withSeat = await btn.count();
    if (withSeat) await btn.first().click();
    await page.waitForSelector('#findPanel:not([hidden]) .fdLikeHead', { timeout: 8000 }).catch(() => {});
    const gotRegion = await (async () => { for (let i = 0; i < 100; i++) { const h = await hits(); if (h.length) return h; await sleep(50); } return []; })();
    const headRegion = await page.evaluate(() => (document.querySelector('#findPanel .fdLikeHead') || {}).textContent || '');
    check('N24e. a region “Cost” selected shows "notes like this" in its panel with the seat held, and the tap lists “Fee schedule” beside “notes like “Cost””',
      withSeat === 1 && /notes like “Cost”/.test(headRegion) && gotRegion.some((x) => /Fee schedule/.test(x.text) && x.name === 'Notes') && (await sem()).asked === askedRegion + 1, { withSeat, summonBefore, panel, headRegion, gotRegion, askedRegion });
    await page.keyboard.press('Escape');

    // ---- N24f. the seat let go ------------------------------------------------------------------------------------------
    await openModels();
    await page.click('#mpSeats [data-semantic-leave]');
    await sleep(200);
    const row2 = await seatRow();
    await closeModels();
    const askedLeft = (await sem()).asked;
    await page.evaluate((id) => window.__mm.session.select([id], Date.now()), region);
    await sleep(250);
    const btnGone = await page.locator('[data-region-like]').count();
    const again = await find('budget', null, 800);
    await hold([box]);
    await page.locator('#summon input.filter').fill('notes like this');
    await sleep(200);
    const line2 = await readingLine();
    await letGo();
    const s2 = await sem();
    check('N24f. the seat let go: its row says nobody again; Find "budget" finds nothing, as before; the region has no button and the held box no Notes like this; nothing more was embedded',
      /nothing chosen/.test(row2) && again.length === 0 && btnGone === 0 && !/like this/i.test(line2) && s2.held === null && s2.asked === askedLeft, { row2, again, btnGone, line2, s2, askedLeft });

    // ---- N24g. an address with a user, a query or the wrong scheme is refused, nothing fetched -------------------------
    const before = embed.calls().length;
    const refusals = [];
    for (const bad of ['http://example.org/model', 'https://user:pw@example.org/model', 'https://example.org/model?token=abc', 'file:///etc/passwd']) {
      await openModels();
      await page.fill('#mpSeats [data-semantic-source]', bad);
      await page.click('#mpSeats [data-semantic-load]');
      await sleep(200);
      refusals.push({ bad, said: (await sem()).said, row: await seatRow() });
    }
    check('N24g. an address with plain http off this machine, a user and password, a query or another scheme is refused in words — in the row and the status line — and nothing is fetched from anywhere',
      refusals.every((r) => r.said && r.said.failed && r.said.failed.length > 25) && refusals.every((r) => /refused|fetched over https|not an address|neither/.test(r.said.failed)) &&
        embed.calls().length === before && (await sem()).held === null,
      { refusals, before, after: embed.calls().length });
    await page.fill('#mpSeats [data-semantic-source]', '');

    // ---- N24i. the loader: the page's own, against a model built for the gate ------------------------------------------
    await page.fill('#mpSeats [data-semantic-source]', embed.base);
    await page.click('#mpSeats [data-semantic-load]');
    const loaded = await until(page, () => !!window.__mm.semantic().held, null, 15000);
    const model = await sem();
    const row3 = await seatRow();
    await closeModels();
    const wire = embed.calls().filter((c) => c.path.startsWith('/model/'));
    const viaReader = await find('budget', (h) => h.some((x) => /“Pricing”/.test(x.text) && /by meaning/.test(x.text)), 900);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mm-semantic') || 'null'));
    check('N24i. "load it here" with the address of the gate\'s model: its two files fetched once each — ' + wire.map((c) => c.path).join(', ') + ' — with no key and no cookie, the seat named for its folder ("model"), ' + embed.model.dimension + ' numbers a text, the size said; Find by meaning works on the REAL reader (“Pricing” by meaning for "budget"); what is kept of the address is the address and no key',
      loaded && !!model.held && model.held.name === 'model' && model.held.dimension === embed.model.dimension && model.held.kept === false && model.held.bytes === embed.model.bytes &&
        /model · on this device · 64 numbers a text · \d+ KB · no key/.test(row3) &&
        wire.length === 2 && wire.some((c) => c.path === '/model/tokenizer.json') && wire.some((c) => c.path === '/model/model.safetensors') && wire.every((c) => !c.authorization && !c.cookie) &&
        viaReader.some((x) => /“Pricing”/.test(x.text) && /by meaning/.test(x.text)) && !viaReader.some((x) => /Garden hose/.test(x.text)) &&
        !!stored && stored.source === embed.base && Object.keys(stored).join() === 'source',
      { loaded, model, row3, wire, viaReader, stored });

    // ---- N24j. a reload loads nothing; the seat loads again from the cache ----------------------------------------------
    const callsBefore = embed.calls().length;
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    await sleep(1200);
    const boot = await sem();
    const callsBoot = embed.calls().length;
    await openModels();
    const srcValue = await page.inputValue('#mpSeats [data-semantic-source]');
    await page.click('#mpSeats [data-semantic-load]');
    const again2 = await until(page, () => !!window.__mm.semantic().held, null, 15000);
    const model2 = await sem();
    const row4 = await seatRow();
    await closeModels();
    check('N24j. after a reload nothing was loaded — the seat is empty and the host was not asked (' + callsBefore + ' → ' + callsBoot + ' requests); the address typed last time is in the field; "load it here" again seats it from the browser\'s cache with no request at all (' + embed.calls().length + '), and the row says so',
      boot.held === null && boot.asked === 0 && callsBoot === callsBefore && srcValue === embed.base && again2 && !!model2.held && model2.held.kept === true && embed.calls().length === callsBefore && /cache/.test(row4),
      { boot, callsBefore, callsBoot, srcValue, model2, row4, calls: embed.calls().length });

    // ---- N24k. what goes wrong, in words ---------------------------------------------------------------------------------
    await openModels();
    await page.click('#mpSeats [data-semantic-leave]');
    await sleep(150);
    const failures = {};
    for (const folder of ['refused', 'junk', 'missing', 'huge']) {
      await page.fill('#mpSeats [data-semantic-source]', embed.folder(folder));
      await page.click('#mpSeats [data-semantic-load]');
      await until(page, () => { const s = window.__mm.semantic(); return !!(s.said && s.said.failed) || !!s.held; }, null, 15000);
      failures[folder] = { said: (await sem()).said, held: (await sem()).held, status: await statusLine(), row: await seatRow() };
      await sleep(120);
    }
    check('N24k. what goes wrong is said in words, and the seat stays empty: a host that refuses (403, naming the file), a file that is not there (404), a page of HTML where the weights should be (not a model this device can read), and a weights file that declares itself 200 MB (too big, before it is downloaded) — each in the row and in the status line',
      /403/.test(failures.refused.said.failed) && /tokenizer\.json/.test(failures.refused.said.failed) &&
        /404/.test(failures.missing.said.failed) &&
        /not a model this device can read/.test(failures.junk.said.failed) && /safetensors/.test(failures.junk.said.failed) &&
        /too big/.test(failures.huge.said.failed) && /200 MB/.test(failures.huge.said.failed) &&
        Object.values(failures).every((f) => f.held === null && f.status.includes(f.said.failed.slice(0, 30)) && f.row.includes(f.said.failed.slice(0, 30))),
      failures);

    // ---- N24l. no key anywhere; the real host is on the guard -------------------------------------------------------------
    const dump = await page.evaluate(() => { const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k); } return out; });
    const everything = JSON.stringify(dump);
    const all = embed.calls();
    const guard = isModelRequest('https://huggingface.co/minishlab/potion-base-8M/resolve/main/model.safetensors', [servers.staticOrigin]);
    check('N24l. the seat holds no key: what it keeps is one entry, mm-semantic, holding an address; no request it made carried an Authorization or a cookie (' + all.length + ' requests); and the real model host is on the gate\'s guard (the gate serves its own model, never fetches that one)',
      !!dump['mm-semantic'] && !/Bearer|apiKey|api_key/i.test(everything) && all.every((c) => !c.authorization && !c.cookie) && !!guard && guard.what === 'huggingface.co' && guards.modelAttempts.length === 0,
      { keys: Object.keys(dump), guard, attempts: guards.modelAttempts });
  } catch (err) {
    check('N24. the semantic test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'boards-semantic');
  }
  await page.close().catch(() => {});
  await embed.stop().catch(() => {});
  return guards;
}
