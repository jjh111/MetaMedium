// Carry your boards (RENAME-PLAN N1), as a scenario of the gate.
//
//     node e2e/run.mjs carry
//
// What a browser keeps belongs to the address: boards in IndexedDB, pictures beside them, the
// taught mark and every preference in `mm-*` keys. dyna.ink cannot read what jjh111.github.io kept,
// so the old address carries it across: one tap in its boards pane opens the new home in a window
// of its own, the new page says it is ready, and the old one sends every board as I4's bundle (the
// log and its pictures, every hash checked on the way in), each board's name, the taught mark's five
// samples and the preferences — gathered by an allowlist of names, never a key.
//
// The gate's static server on two ports is two origins, so this scenario starts two more of its own:
//   A — the gate's server, playing the old address (its page names B with `?carryTo=`, which only a
//       page on this machine may do — on the old address the target is dyna.ink, whatever the address says);
//   B — playing dyna.ink (it takes boards from the old address, and from a local origin only when it is
//       itself local and its own address names that origin: `?carry=<A>`, which the old page writes);
//   C — a third origin, whose boards are refused.
// One browser context, so one browser; its storage is per origin, as a person's is.
//
// What must hold (RENAME-PLAN §5 N1):
//   - on B both boards are there, whole — each log exactly as A's journal held it — with their names
//     and the picture, and the mark is taught; a name B already has takes a suffix, and the empty
//     board B opened with gives its name up to the trash;
//   - carrying again brings nothing in twice: a log already held is said to be held and skipped;
//   - a key planted on A — the remembered model keys, a token, a room's key — is in none of the
//     messages, in nothing B keeps, and not in the fallback file;
//   - a carry message from a third origin is refused, and the third origin is never told B is ready;
//   - the fallback — *Every board out*, one file — round-trips through *From a file…* on a browser
//     that has never seen the boards, and on B, which has them, doubles nothing.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { startStatic } from './servers.mjs';
import { rng, sleep, cellBox, boxPath, drawPath, waitReady, openBoardsPane, closeBoardsPane, boardsNow, switchTo, newBoardVia } from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** Planted on the old address after it opens: every name a key has had in this browser, and a room's key in its address. */
const PLANTED = {
  'mm-model-key': JSON.stringify('sk-or-v1-PLANTEDcarrykey' + 'q'.repeat(30)),
  'mm-model-keys': JSON.stringify({ 'https://openrouter.ai/api/v1': 'sk-ant-PLANTEDcarrykey' + 'r'.repeat(24) }),
  'mm-git-token': JSON.stringify('ghp_PLANTEDcarrytoken' + 's'.repeat(24)),
};
const ROOM_KEY = 'PLANTEDroomkey' + 't'.repeat(20);
const SECRET = /PLANTED/;
const RED = [210, 40, 40];

/** Every message a page of the context hears, as text (bytes read as latin1: the zips are stored, so a key in them would read). */
function recordMessages() {
  window.__carrySeen = [];
  const latin = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
  const text = (v, d) => {
    if (v == null || d > 5) return '';
    if (v instanceof ArrayBuffer) return latin(new Uint8Array(v));
    if (ArrayBuffer.isView(v)) return latin(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
    if (typeof v === 'object') return Object.keys(v).map((k) => k + ':' + text(v[k], d + 1)).join('|');
    return String(v);
  };
  addEventListener('message', (e) => {
    try { window.__carrySeen.push({ origin: e.origin, type: e.data && typeof e.data === 'object' ? String(e.data.type || '') : '', text: text(e.data, 0) }); } catch (err) { /* nothing */ }
  }, true);
}

const until = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
const kept = (b) => (b ? b.list.filter((e) => e.kind === 'board') : []);
const live = (b) => kept(b).filter((e) => !e.trashed);
const storeOf = (page, id) => page.evaluate((b) => window.__mm.boardsStore(b), id);
const statusOf = (page) => page.evaluate(() => (document.getElementById('status').textContent || '').replace(/\s+/g, ' ').trim());
const paneSaid = (page) => page.evaluate(() => ((document.getElementById('boardsStatus') || {}).textContent || '').replace(/\s+/g, ' ').trim());
const carryNow = (page) => page.evaluate(() => (typeof window.__mm.carryState === 'function' ? window.__mm.carryState() : null));

async function rename(page, id, name) {
  await openBoardsPane(page);
  await page.click(`#boardsPanel button[data-rename="${id}"]`);
  const input = `#boardsPanel input[data-name-input="${id}"]`;
  await page.fill(input, name);
  await page.press(input, 'Enter');
  return until(page, ([b, n]) => { const e = window.__mm.boards().list.find((x) => x.id === b); return !!e && e.name === n && !window.__mm.boards().busy; }, [id, name]);
}

/** Five carets on the teach pad, with the real pointer, then *Use it* — the mark is taught on this device. */
async function teach(page) {
  await page.click('#ccBtn');
  await page.click('#teachBtn', { timeout: 5000 });
  await page.waitForSelector('#teachPanel:not([hidden])', { timeout: 5000 });
  await page.click('#teachClear');
  const r = await page.evaluate(() => { const b = document.getElementById('teachPad').getBoundingClientRect(); return { x: b.left, y: b.top }; });
  const sizes = [[60, 40], [66, 44], [54, 38], [62, 46], [58, 36]];
  for (const [i, [w, h]] of sizes.entries()) {
    const x = r.x + 40 + i * 3, y = r.y + 35;
    const pts = [];
    for (let k = 0; k <= 12; k++) pts.push({ x: x + (w / 2) * (k / 12), y: y + h - h * (k / 12) });
    for (let k = 1; k <= 12; k++) pts.push({ x: x + w / 2 + (w / 2) * (k / 12), y: y + h * (k / 12) });
    await drawPath(page, pts);
  }
  await page.click('#teachUse');
  await page.click('#teachPanel .paneClose');
  return page.evaluate(() => { const m = window.__mm.session.getState().commandMark; const s = window.__mm.savedMark(); return { mark: m ? m.name : null, samples: s && s.samples ? s.samples.length : 0 }; });
}

/** A picture in, as a pick would bring one: a red PNG, kept in the asset store and named by its event. */
async function importRed(page) {
  return page.evaluate(async (rgb) => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const g = c.getContext('2d'); g.fillStyle = 'rgb(' + rgb.join(',') + ')'; g.fillRect(0, 0, 400, 300);
    const f = new File([await new Promise((r) => c.toBlob(r, 'image/png'))], 'red.png', { type: 'image/png' });
    await window.__mm.importPictures([f], { view: { minX: 900, minY: 520, maxX: 1300, maxY: 820 } });
    for (let i = 0; i < 100 && window.__mm.pictureState().loading; i++) await new Promise((r) => setTimeout(r, 50));
    await window.__mm.boardIdle();
    return (await window.__mm.assets()).map((a) => a.hash);
  }, RED);
}

/** The colour the board paints at the middle of its pictures, and whether any picture stands as its name. */
async function pictureLook(page) {
  return page.evaluate(async () => {
    const mm = window.__mm, MM = mm.MM;
    mm.setView(1, 0, 0);
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frames();
    for (let i = 0; i < 100 && mm.pictureState().loading; i++) await new Promise((r) => setTimeout(r, 50));
    await frames();
    const st = mm.session.getState();
    const cv = document.getElementById('canvas'), dpr = window.devicePixelRatio || 1;
    const colours = st.artifacts.filter((id) => MM.pictureOf(st.nodes.get(id))).map((id) => {
      const b = MM.boundsOf(st.nodes.get(id)), p = mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2);
      const d = cv.getContext('2d').getImageData(Math.round(p.x * dpr) - 2, Math.round(p.y * dpr) - 2, 5, 5).data;
      let r = 0, g = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; }
      const n = d.length / 4; return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
    });
    return { colours, missing: mm.pictureState().missing.length, assets: (await mm.assets()).map((a) => a.hash) };
  });
}
const isRed = (c) => !!c && Math.abs(c[0] - RED[0]) <= 26 && Math.abs(c[1] - RED[1]) <= 26 && Math.abs(c[2] - RED[2]) <= 26;

/** Every board this page keeps, by name, with its log as its store holds it. */
async function logsByName(page) {
  const b = await boardsNow(page);
  const out = {};
  for (const e of kept(b)) {
    const s = await storeOf(page, e.id);
    out[e.name + (e.trashed ? ' (trash)' : '')] = { id: e.id, log: s.log, carried: e.carried || null, trashed: !!e.trashed };
  }
  return out;
}
/** Whether `got` holds `want` exactly, and after it nothing but the device's mark taught again (what opening a board on a device with a mark does). */
function sameLog(got, want) {
  if (!got || !want || got.length < want.length) return false;
  if (JSON.stringify(got.slice(0, want.length)) !== JSON.stringify(want)) return false;
  return got.slice(want.length).every((e) => e.type === 'teach');
}

/** A page on B, ready, its board list read. */
async function openB(context, url) {
  const p = await context.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await waitReady(p);
  return p;
}
/** Tap the carry offer on A's boards pane; the window it opens, once it has taken (or refused) what was sent. */
async function carryVia(pa) {
  await openBoardsPane(pa);
  const before = (await carryNow(pa)) || {};
  const [pop] = await Promise.all([pa.context().waitForEvent('page', { timeout: 15000 }), pa.click('#boardsPanel button[data-carry]', { timeout: 5000 })]);
  await pop.waitForLoadState('load');
  const doneHere = await until(pop, () => { const c = window.__mm && typeof window.__mm.carryState === 'function' ? window.__mm.carryState() : null; return !!c && c.carried > 0 && !c.busy; }, null, 45000);
  const doneThere = await until(pa, (n) => { const c = window.__mm.carryState(); return !!c && c.sent > n && !c.sending; }, before.sent || 0, 20000);
  await until(pop, () => { const b = window.__mm.boards(); return b.ready && !b.switching && !b.busy && window.__mm.board().ready; }, null, 15000);
  return { pop, doneHere, doneThere };
}

export async function runCarry(browser, servers, ctx) {
  const { freshContext, screenshot } = ctx;
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const A = servers.staticOrigin;
  const extra = [await startStatic(root), await startStatic(root)];
  const B = extra[0].origin, C = extra[1].origin;
  const guardsList = [];
  const guards = await freshContext(browser, { origins: [A, B, C], label: 'carry' });
  guardsList.push(guards);
  await guards.context.addInitScript(recordMessages);
  const context = guards.context;
  const rand = rng(77);
  let cell = 0;
  const draw = async (p) => drawPath(p, boxPath(cellBox(cell++, rand)));
  const pages = [];
  let pa = null;
  let fileBytes = null, fileName = '';
  try {
    // ---- C0. B already keeps a board of its own called “Garden”, and its first board, empty ----------------
    const pb = await openB(context, `${B}/app/?nosw=1`);
    const gardenB = await newBoardVia(pb);
    await draw(pb);
    await rename(pb, gardenB, 'Garden');
    await pb.evaluate(() => window.__mm.boardIdle());
    await switchTo(pb, 'default');
    const b0 = await boardsNow(pb);
    check('C0. B (dyna.ink’s stand-in) keeps “Garden”, a board with a mark on it, and the empty “My board” it opened with, on screen',
      live(b0).length === 2 && !!kept(b0).find((e) => e.name === 'Garden') && b0.current === 'default' && (await storeOf(pb, 'default')).log.length === 0,
      { list: kept(b0).map((e) => [e.id, e.name]) });
    await pb.close();

    // ---- C1. A: two boards, one with a picture; a mark taught; preferences; keys planted ----------------------
    pa = await context.newPage();
    pages.push(pa);
    await pa.goto(`${A}/app/?nosw=1&carryTo=${encodeURIComponent(B)}&key=${ROOM_KEY}`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(pa);
    await pa.evaluate((planted) => { for (const k of Object.keys(planted)) localStorage.setItem(k, planted[k]); }, PLANTED);
    for (let i = 0; i < 3; i++) await draw(pa);
    const assetsA = await importRed(pa);
    const gardenA = await newBoardVia(pa);
    for (let i = 0; i < 2; i++) await draw(pa);
    await rename(pa, gardenA, 'Garden');
    const taught = await teach(pa);
    await pa.evaluate(() => { window.__mm.setThemeMode('dark'); window.__mm.setHand('left'); });
    await pa.evaluate(() => window.__mm.boardIdle());
    const logsA = await logsByName(pa);
    const markA = await pa.evaluate(() => window.__mm.savedMark());
    check('C1. A (the old address’s stand-in) keeps “My board” — three boxes and a picture — and “Garden”, two boxes; a mark is taught (five samples), the theme is dark and the hand left',
      Object.keys(logsA).sort().join('|') === 'Garden|My board' && logsA['My board'].log.filter((e) => e.type === 'stroke').length === 3 && logsA['My board'].log.some((e) => e.type === 'import' && e.asset)
        && logsA.Garden.log.filter((e) => e.type === 'stroke').length === 2 && assetsA.length === 1 && taught.mark === 'your mark' && taught.samples === 5,
      { boards: Object.keys(logsA), assetsA, taught });
    const offered = await (async () => { await openBoardsPane(pa); return pa.evaluate(() => { const b = document.querySelector('#boardsPanel button[data-carry]'); return b ? b.textContent.trim() : null; }); })();
    check('C1b. A’s boards pane offers “Carry my boards to dyna.ink” (named by its address on this machine; on the old address only once N4 turns the notice on) and “Every board out” beside it, and says no notice while the notice is off',
      offered === 'Carry my boards to dyna.ink' && await pa.evaluate(() => !!document.querySelector('#boardsPanel button[data-every-out]') && !document.querySelector('#boardsPanel .bdHome')),
      { offered });
    await closeBoardsPane(pa);

    // ---- C2. Carried: one tap, a window on B, the boards land ---------------------------------------------------
    const first = await carryVia(pa);
    const pop = first.pop;
    pages.push(pop);
    const bList = await boardsNow(pop);
    const logsB = await logsByName(pop);
    const names = live(bList).map((e) => e.name).sort();
    check('C2. one tap on A opens B in a window of its own; B says it is ready and takes the boards; A’s pane says they were carried',
      first.doneHere && first.doneThere && /2 boards carried to 127\.0\.0\.1:\d+/.test(await paneSaid(pa)), { paneA: await paneSaid(pa), carryB: await carryNow(pop) });
    check('C2a. on B: the carried “My board”, its own “Garden” untouched, the carried “Garden 2” — and the empty “My board” it opened with in the trash; the page on the carried “My board”',
      names.join('|') === 'Garden|Garden 2|My board' && !!logsB['My board (trash)'] && logsB['My board (trash)'].log.length === 0 && logsB['My board'].id === bList.current
        && logsB.Garden.log.filter((e) => e.type === 'stroke').length === 1,
      { names, trash: kept(bList).filter((e) => e.trashed).map((e) => e.name), current: bList.current });
    check('C2b. each log is carried exactly as A’s journal holds it — “Garden 2” event for event, “My board” too, then only the mark taught again on opening it — and each entry remembers what it was carried as',
      sameLog(logsB['Garden 2'].log, logsA.Garden.log) && logsB['Garden 2'].log.length === logsA.Garden.log.length && sameLog(logsB['My board'].log, logsA['My board'].log)
        && !!logsB['My board'].carried && !!logsB['Garden 2'].carried,
      { garden: [logsA.Garden.log.length, logsB['Garden 2'].log.length], board: [logsA['My board'].log.length, logsB['My board'].log.length] });
    const lookB = await pictureLook(pop);
    check('C2c. the picture came with its board: B keeps its bytes under the same hash, and paints it, red', lookB.assets.join() === assetsA.join() && lookB.missing === 0 && lookB.colours.length === 1 && isRed(lookB.colours[0]), lookB);
    const markB = await pop.evaluate(() => ({ saved: window.__mm.savedMark(), now: (window.__mm.session.getState().commandMark || {}).name || null, chip: (document.getElementById('markName') || {}).textContent || '' }));
    check('C2d. the mark is taught on B: its five samples kept on the device, learned again there, and the mark the board on screen answers to',
      !!markB.saved && JSON.stringify(markB.saved.samples) === JSON.stringify(markA.samples) && markB.now === 'your mark' && /your mark/.test(markB.chip),
      { now: markB.now, chip: markB.chip, samples: markB.saved && markB.saved.samples ? markB.saved.samples.length : 0 });
    const prefsB = await pop.evaluate(() => ({ theme: localStorage.getItem('mm-theme'), hand: localStorage.getItem('mm-hand'), shown: document.documentElement.getAttribute('data-theme') }));
    check('C2e. the preferences came: the theme is dark on B (and shows it), the hand left', prefsB.theme === '"dark"' && prefsB.hand === '"left"' && prefsB.shown === 'dark', prefsB);
    const saidB = (await carryNow(pop)).words || '';
    check('C2f. B says what came, in one sentence: two boards from 127.0.0.1, by name, “Garden 2” under its suffix, the mark and the preferences, the empty board in the trash',
      /2 boards came from 127\.0\.0\.1:\d+/.test(saidB) && /“My board”/.test(saidB) && /“Garden 2”/.test(saidB) && /your mark came too/.test(saidB) && /preferences came too/.test(saidB) && /trash/.test(saidB) && (await statusOf(pop)).includes(saidB.slice(0, 30)),
      { said: saidB, status: await statusOf(pop) });
    const leakB = await pop.evaluate((ks) => {
      const all = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); all[k] = localStorage.getItem(k); }
      return { names: ks.filter((k) => localStorage.getItem(k) !== null), text: JSON.stringify(all), address: location.href };
    }, Object.keys(PLANTED));
    const seenA = await pa.evaluate(() => window.__carrySeen);
    const seenB = await pop.evaluate(() => window.__carrySeen);
    const leaked = [...seenA, ...seenB].filter((m) => SECRET.test(m.text));
    check('C2g. never a key: no message either page heard holds a planted key or the room’s key, B keeps none of them, and no carried log or address names one',
      seenB.some((m) => m.type === 'mm-carry') && !leaked.length && !leakB.names.length && !SECRET.test(leakB.text) && !SECRET.test(leakB.address) && !SECRET.test(JSON.stringify(logsB)),
      { heardB: seenB.map((m) => m.type + ' ' + m.origin + ' ' + m.text.length), leaked: leaked.map((m) => m.type), keptB: leakB.names });
    check('C2h. what B heard came from A alone, and what A heard came from B alone', seenB.filter((m) => /^mm-carry/.test(m.type)).every((m) => m.origin === A) && seenA.filter((m) => /^mm-carry/.test(m.type)).every((m) => m.origin === B),
      { b: seenB.map((m) => m.origin), a: seenA.map((m) => m.origin) });

    // ---- C3. Carried again: nothing doubles ------------------------------------------------------------------------
    await pop.close();
    const second = await carryVia(pa);
    pages.push(second.pop);
    const bList2 = await boardsNow(second.pop);
    const saidB2 = ((await carryNow(second.pop)) || {}).words || '';
    check('C3. carried again: nothing comes twice — B keeps the same boards, says both are here already, and A’s pane says nothing new was carried',
      second.doneHere && kept(bList2).length === kept(bList).length && live(bList2).map((e) => e.name).sort().join('|') === names.join('|')
        && /both boards are here already/.test(saidB2) && /nothing new to carry/.test(await paneSaid(pa)),
      { names: live(bList2).map((e) => e.name), said: saidB2, paneA: await paneSaid(pa) });
    await second.pop.close();

    // ---- C5 (before C4: its file is what the third origin sends). The fallback: every board out, one file ----------
    await openBoardsPane(pa);
    const [download] = await Promise.all([pa.waitForEvent('download', { timeout: 20000 }), pa.click('#boardsPanel button[data-every-out]', { timeout: 5000 })]);
    fileName = download.suggestedFilename();
    fileBytes = Buffer.from(await readFile(await download.path()));
    const probe = await pa.evaluate((arr) => window.__mm.everyProbe(new Uint8Array(arr)), [...fileBytes]);
    const allow = await pa.evaluate(() => window.__mm.carryPrefsAllowed());
    check('C5. “Every board out” writes one zip holding each board’s .dyna.zip, its name, the mark’s five samples and the preferences by name — and no key in it',
      /^every-board-\d{4}-\d\d-\d\d\.zip$/.test(fileName) && fileBytes.slice(0, 4).toString('latin1') === 'PK\x03\x04' && !SECRET.test(fileBytes.toString('latin1'))
        && probe.ok && probe.boards.map((b) => b.name).sort().join('|') === 'Garden|My board' && probe.mark === 5 && probe.prefs.includes('mm-theme') && probe.prefs.every((k) => allow.includes(k)),
      { fileName, size: fileBytes.length, probe });
    await closeBoardsPane(pa);

    // ---- C4. A third origin is refused --------------------------------------------------------------------------
    const pc = await context.newPage();
    pages.push(pc);
    await pc.goto(`${C}/VERSION`, { waitUntil: 'load', timeout: 30000 });
    await pc.evaluate(([b, a]) => {
      const btn = document.createElement('button');
      btn.id = 'go'; btn.textContent = 'open';
      btn.onclick = () => { window.__w = window.open(b + '/app/?carry=' + encodeURIComponent(a), '_blank'); };
      document.body.appendChild(btn);
    }, [B, A]);
    const [pop3] = await Promise.all([context.waitForEvent('page', { timeout: 15000 }), pc.click('#go')]);
    pages.push(pop3);
    await pop3.waitForLoadState('load');
    await waitReady(pop3);
    const before3 = kept(await boardsNow(pop3)).length;
    await pc.evaluate(async ([b, arr]) => {
      const file = new Uint8Array(arr).buffer;
      for (let i = 0; i < 4; i++) {
        window.__w.postMessage({ type: 'mm-carry-ping', v: 1 }, b);
        window.__w.postMessage({ type: 'mm-carry', v: 1, file: file.slice(0) }, b);
        await new Promise((r) => setTimeout(r, 300));
      }
    }, [B, [...fileBytes]]);
    await sleep(1200);
    const c3 = await carryNow(pop3);
    const heardC = await pc.evaluate(() => window.__carrySeen.filter((m) => /^mm-carry/.test(m.type)));
    check('C4. a carry from a third origin is refused: B takes nothing, says so once, and the third origin is never told B is ready',
      !!c3 && c3.refused.includes(C) && c3.carried === 0 && kept(await boardsNow(pop3)).length === before3 && !heardC.length && /refused/.test(await statusOf(pop3)),
      { refused: c3 && c3.refused, heardC, status: await statusOf(pop3) });
    await pop3.close();
    await pc.close();

    // ---- C5b. The fallback file round-trips: From a file… on a browser that never saw the boards ------------------
    const guards2 = await freshContext(browser, { origins: [B], label: 'carry-file' });
    guardsList.push(guards2);
    const pf = await openB(guards2.context, `${B}/app/?nosw=1`);
    pages.push(pf);
    await openBoardsPane(pf);
    await pf.setInputFiles('#boardsFile', { name: fileName, mimeType: 'application/zip', buffer: fileBytes });
    await until(pf, () => { const c = window.__mm.carryState(); return !!c && c.carried > 0 && !c.busy; }, null, 30000);
    await until(pf, () => { const b = window.__mm.boards(); return b.ready && !b.switching && !b.busy && window.__mm.board().ready; }, null, 15000);
    const logsF = await logsByName(pf);
    const lookF = await pictureLook(pf);
    const markF = await pf.evaluate(() => ({ saved: window.__mm.savedMark(), now: (window.__mm.session.getState().commandMark || {}).name || null, theme: localStorage.getItem('mm-theme') }));
    check('C5b. the file opens on a browser that never saw the boards: both boards, by name, each log as A held it, the picture painted, the mark taught, the preferences set — the empty board it opened with in the trash',
      !!logsF['My board'] && !!logsF.Garden && sameLog(logsF.Garden.log, logsA.Garden.log) && sameLog(logsF['My board'].log, logsA['My board'].log) && !!logsF['My board (trash)']
        && lookF.missing === 0 && lookF.colours.length === 1 && isRed(lookF.colours[0]) && !!markF.saved && markF.now === 'your mark' && markF.theme === '"dark"',
      { boards: Object.keys(logsF), look: lookF, mark: markF.now, said: await paneSaid(pf) });
    await pf.close();

    // ---- C5c. …and on B, which has them all, it doubles nothing ---------------------------------------------------
    const pb2 = await openB(context, `${B}/app/?nosw=1`);
    pages.push(pb2);
    const beforeF = kept(await boardsNow(pb2)).length;
    await openBoardsPane(pb2);
    await pb2.setInputFiles('#boardsFile', { name: fileName, mimeType: 'application/zip', buffer: fileBytes });
    await until(pb2, () => { const c = window.__mm.carryState(); return !!c && c.carried > 0 && !c.busy; }, null, 30000);
    const saidF = await paneSaid(pb2);
    check('C5c. the same file on B, which has every board in it already, brings nothing in twice and says so in the boards pane',
      kept(await boardsNow(pb2)).length === beforeF && /both boards are here already/.test(saidF), { saidF, beforeF });
    await pb2.close();
  } catch (err) {
    check('C. the carry scenario ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    if (pa) await screenshot(pa, 'carry');
  }
  for (const p of pages) await p.close().catch(() => {});
  for (const s of extra) await s.stop().catch(() => {});
  return { steps, guards: guardsList };
}
