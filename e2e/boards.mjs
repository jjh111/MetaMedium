// Several named boards (V1-PLAN.md §7 and §9 R1; acceptance scenario A8), as a scenario of the gate.
//
//     node e2e/run.mjs boards
//     node e2e/run.mjs --browser webkit boards
//
// The boards this browser keeps, driven from outside with the real pointer
// the way a hand drives them: the control centre's *boards* tile opens a pane
// under the bar, and everything below is a tap in that pane — new, open,
// rename, duplicate, delete, restore, empty the trash, a board from a file.
// Pages are opened and closed by the test, because a board's claims are about
// what comes back when a page does.
//
// What must hold (R1's done-means, and its trap):
//   - the board R3 kept is the first entry, unchanged, "My board";
//   - each board is its own journal keyed by its id — the name is shown,
//     never used as the key, so a rename orphans nothing and two boards may
//     share a name;
//   - delete moves a board to a trash it can be restored from, and emptying
//     the trash is its own deliberate act, said plainly before it happens —
//     deleting is never one tap from losing work (Reset included);
//   - ?board=<id> opens a board, the title carries its name, the view comes
//     back per board; folders, repositories and sites are recent entries of
//     their kind; switching flushes the board being left; one tab writes a
//     board (R3's rule, per board);
//   - kept on an iPad (PLAN-IPAD-NOTES I3): the app asks the browser to keep the device's
//     storage once a board holds something — once per device, never on ?fresh=1 — and the
//     pane says at its foot how much this browser holds and whether it may clear it;
//   - and a library pack the board uses is kept with it: the `use` and the
//     `unuse` are its log's, so its journal carries them through a reload
//     (V1-PLAN §2.3, B3).
//
// The kill test across switches is keep.mjs's (`node e2e/run.mjs keep`).

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import {
  rng, sleep, cellBox, boxPath, sig, sameSig, drawPath, waitReady, strokesOnBoard, statusText,
  boardsNow, openBoardsPane, closeBoardsPane, waitOnBoard, switchTo, newBoardVia,
} from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/**
 * A board as R3 kept it, made by the engine the MCP hand runs (the committed
 * Node bundle): boxes, a circle round two of them, a check across it and the
 * group named — so the log carries more than strokes.
 */
async function r3Events() {
  const MM = await import(pathToFileURL(join(root, 'Demos', 'metamedium-core.node.mjs')).href);
  const s = MM.createSession();
  const line = (a, b, n) => { const p = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); p.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } return p; };
  const rect = (x, y, w, h) => { const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]; let p = []; for (let i = 0; i < 4; i++) p = p.concat(line(v[i], v[i + 1], 20).slice(i ? 1 : 0)); return p; };
  const circle = (cx, cy, r) => { const p = []; for (let i = 0; i <= 90; i++) { const a = (i / 90) * Math.PI * 2; p.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); } return p; };
  let at = Date.now() - 3 * 86400000;
  for (let i = 0; i < 6; i++) s.addStroke(rect(500 + (i % 3) * 110, 200 + Math.floor(i / 3) * 90, 60, 40), at += 900);
  s.addStroke(circle(560, 220, 80), at += 900);
  s.addStroke(line({ x: 630, y: 210 }, { x: 650, y: 240 }, 20).concat(line({ x: 650, y: 240 }, { x: 700, y: 180 }, 20).slice(1)), at += 400);
  const sum = s.getState().summon;
  if (sum) s.bless({ summonId: sum.id, name: 'pair', at: at += 700 });
  return s.getEvents();
}

/** Written in the page, the way R3's surface wrote it: database version 1, one whole record under "default", and its meta. */
function writeR3Store({ events, created }) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mm-boards', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('records', { keyPath: ['board', 'seq'] });
      db.createObjectStore('meta', { keyPath: 'board' });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['records', 'meta'], 'readwrite');
      const text = events.map((e) => JSON.stringify(e) + '\n').join('');
      tx.objectStore('records').add({ board: 'default', seq: 1, on: 1, base: 0, n: events.length, text });
      tx.objectStore('meta').put({ board: 'default', v: 1, created, imported: 0 });
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onabort = () => reject(tx.error);
    };
  });
}

/** The page's own view of one board's store: its list entry, its meta and its log, folded from the records. */
const storeOf = (page, id) => page.evaluate((b) => (typeof window.__mm.boardsStore === 'function' ? window.__mm.boardsStore(b) : null), id);
const strokesIn = (log) => (log || []).filter((e) => e.type === 'stroke').length;
const entryOf = (b, id) => (b && b.list ? b.list.find((e) => e.id === id) : null) || null;
const viewNow = (page) => page.evaluate(() => ({ zoom: +window.__mm.view.zoom.toFixed(4), panX: +window.__mm.view.panX.toFixed(2), panY: +window.__mm.view.panY.toFixed(2) }));
const faces = (page) => page.evaluate(() => ({
  title: document.title,
  tile: (document.querySelector('#boardsBtn .v') || {}).textContent || '',
  search: location.search,
}));
/** A row of the pane, as the hand reads it. */
const rowText = (page, id) => page.evaluate((b) => { const r = document.querySelector('#boardsPanel .bdItem[data-id="' + b + '"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; }, id);
const paneText = (page) => page.evaluate(() => { const p = document.getElementById('boardsPanel'); return p ? p.textContent.replace(/\s+/g, ' ').trim() : ''; });
/** Wait on a condition the page answers, polling. */
const until = (page, fn, arg, timeout = 10000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);

async function rename(page, id, name) {
  await openBoardsPane(page);
  await page.click(`#boardsPanel button[data-rename="${id}"]`);
  const input = `#boardsPanel input[data-name-input="${id}"]`;
  await page.fill(input, name);
  await page.press(input, 'Enter');
  return until(page, ([b, n]) => { const e = window.__mm.boards().list.find((x) => x.id === b); return !!e && e.name === n && !window.__mm.boards().busy; }, [id, name]);
}

/**
 * The scenario: one context — one browser's storage — that starts with R3's
 * board, and a second and third tab where one board must not be written twice.
 */
export async function boardsTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const origin = servers.staticOrigin;
  const url = `${origin}/Demos/session-engine.html?nosw=1`;
  const guards = await freshContext(browser, { origins: [origin], label: 'boards' });
  // A published canvas this test serves itself: a site is a place, not a board.
  await guards.context.route('**/__boards/site/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/.metamedium/manifest.json')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: ['notes.md'] }) });
    if (u.pathname.endsWith('/notes.md')) return route.fulfill({ status: 200, contentType: 'text/markdown', body: '# notes\n\na site opened as a canvas\n' });
    return route.fulfill({ status: 404, body: '' });
  });
  const rand = rng(41);
  let cell = 0;
  const draw = async (p) => { const pts = boxPath(cellBox(cell++, rand)); await drawPath(p, pts); return sig(pts); };
  const page = await guards.context.newPage();
  let second = null, third = null;
  const R3 = await r3Events();
  const raw = JSON.stringify(R3);
  const r3Strokes = strokesIn(R3);
  let b2 = null, b3 = null, b4 = null;
  try {
    // ---- N1. R3's board is the first entry, unchanged ----------------------------------
    await page.goto(`${origin}/404.html`, { waitUntil: 'load' });
    await page.evaluate(writeR3Store, { events: R3, created: Date.now() - 5 * 86400000 });
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const n1 = await page.evaluate(() => ({ log: JSON.stringify(window.__mm.session.getEvents()), b: typeof window.__mm.boards === 'function' ? window.__mm.boards() : null }));
    const f1 = await faces(page);
    const kept1 = n1.b ? n1.b.list.filter((e) => e.kind === 'board') : [];
    check(`N1. the board R3 kept (IndexedDB version 1, one whole record under "default") comes back unchanged — byte for byte, ${R3.length} events — as the first entry, "My board"; the tile and the page's title carry its name`,
      n1.log === raw && !!n1.b && n1.b.current === 'default' && kept1.length === 1 && kept1[0].id === 'default' && kept1[0].name === 'My board' && f1.tile === 'My board' && /^My board\b/.test(f1.title),
      { same: n1.log === raw, current: n1.b && n1.b.current, kept: kept1.map((e) => [e.id, e.name]), faces: f1 });
    await openBoardsPane(page);
    const row1 = await rowText(page, 'default');
    check('N1b. its row in the pane says it is the board here, when it last changed, and roughly how big it is',
      !!row1 && /My board/.test(row1) && /\bhere\b/.test(row1) && /changed (just now|\d+ (min|h|days) ago|yesterday|\d+ \w{3})/.test(row1) && new RegExp('\\b' + r3Strokes + ' marks · (under 1 KB|\\d+ KB)').test(row1),
      { row: row1 });
    await closeBoardsPane(page);

    // ---- N2. a new board -----------------------------------------------------------------
    b2 = await newBoardVia(page).catch(() => null);
    const n2 = { b: await boardsNow(page), n: await page.evaluate(() => window.__mm.session.getEvents().length), faces: await faces(page) };
    check('N2. "New board" in the pane makes a second board — "Board 2", under an id of its own — and opens it, empty; the list holds both, and the tile and title say where the hand is',
      !!b2 && b2 !== 'default' && n2.b.current === b2 && n2.n === 0 && (entryOf(n2.b, b2) || {}).name === 'Board 2' && n2.b.list.filter((e) => e.kind === 'board').length === 2 && n2.faces.tile === 'Board 2' && /^Board 2\b/.test(n2.faces.title),
      { b2, current: n2.b && n2.b.current, events: n2.n, faces: n2.faces });

    // ---- N3. switching: each board its own; the one left is flushed ----------------------
    const onB2 = [];
    for (let i = 0; i < 3; i++) onB2.push(await draw(page));
    onB2.push(await draw(page)); // … and at once, the switch
    await switchTo(page, 'default');
    const a3 = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
    const s3 = await storeOf(page, b2);
    check(`N3. switching through the pane: "My board" shows its own ${R3.length} events, unchanged, and "Board 2" — the stroke drawn just before the switch included — is whole in the store the moment the switch completes (${s3 ? strokesIn(s3.log) : '?'} of 4)`,
      a3 === raw && !!s3 && strokesIn(s3.log) === 4, { same: a3 === raw, stored: s3 && strokesIn(s3.log) });
    await switchTo(page, b2);
    const back3 = await strokesOnBoard(page);
    check('N3b. and back: "Board 2" shows its four strokes, in order', back3.length === 4 && back3.every((s, i) => sameSig(s, onB2[i])), { got: back3.length });

    // ---- N4. reload, and ?board= ---------------------------------------------------------
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    const r4 = { b: await boardsNow(page), strokes: (await strokesOnBoard(page)).length, faces: await faces(page) };
    await page.goto(url + '&board=default', { waitUntil: 'load' });
    await waitReady(page);
    const d4 = { b: await boardsNow(page), log: await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents())) };
    await page.goto(url + '&board=no-such-board', { waitUntil: 'load' });
    await waitReady(page);
    const m4 = { b: await boardsNow(page), status: await statusText(page), faces: await faces(page) };
    check('N4. a reload brings back the board opened last; ?board=<id> opens one directly; an id this browser does not hold opens the last one and says so; the address carries the board on screen',
      r4.b.current === b2 && r4.strokes === 4 && new RegExp('[?&]board=' + b2 + '\\b').test(r4.faces.search) &&
        d4.b.current === 'default' && d4.log === raw &&
        m4.b.current === 'default' && /no board/.test(m4.status) && /no-such-board/.test(m4.status) && /[?&]board=default\b/.test(m4.faces.search),
      { reload: { current: r4.b.current, strokes: r4.strokes, search: r4.faces.search }, direct: d4.b.current, missing: { current: m4.b.current, status: m4.status, search: m4.faces.search } });

    // ---- N5. rename ----------------------------------------------------------------------
    await switchTo(page, b2);
    const renamedOk = await rename(page, b2, 'Garden');
    const f5 = await faces(page);
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    const after5 = { b: await boardsNow(page), strokes: (await strokesOnBoard(page)).length };
    const sameName = await rename(page, 'default', 'Garden');
    await closeBoardsPane(page);
    await page.goto(url + '&board=default', { waitUntil: 'load' });
    await waitReady(page);
    const twinA = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
    await page.goto(url + '&board=' + b2, { waitUntil: 'load' });
    await waitReady(page);
    const twinB = (await strokesOnBoard(page)).length;
    const both5 = (await boardsNow(page)).list.filter((e) => e.kind === 'board' && e.name === 'Garden').map((e) => e.id).sort();
    check('N5. rename in the pane: the list, the tile and the title say the new name at once; after a reload the board has every stroke under the same id — the name is not the key — and two boards may share a name, each opening its own',
      renamedOk && f5.tile === 'Garden' && /^Garden\b/.test(f5.title) && after5.b.current === b2 && after5.strokes === 4 && (entryOf(after5.b, b2) || {}).name === 'Garden' &&
        sameName && twinA === raw && twinB === 4 && both5.length === 2,
      { renamedOk, faces: f5, after: { current: after5.b.current, strokes: after5.strokes }, sameName, twins: both5, twinA: twinA === raw, twinB });

    // ---- N6. duplicate -------------------------------------------------------------------
    await openBoardsPane(page);
    const before6 = (await boardsNow(page)).list.map((e) => e.id);
    await page.click(`#boardsPanel button[data-dup="${b2}"]`);
    await until(page, (b4) => window.__mm.boards().list.some((e) => e.kind === 'board' && !b4.includes(e.id)) && !window.__mm.boards().busy, before6);
    const list6 = await boardsNow(page);
    const copy = list6.list.find((e) => e.kind === 'board' && !before6.includes(e.id));
    b3 = copy ? copy.id : null;
    const orig6 = await storeOf(page, b2);
    const copy6 = b3 ? await storeOf(page, b3) : null;
    let copyAfter = null, origAfter = null;
    if (b3) {
      await switchTo(page, b3);
      await draw(page);
      await page.evaluate(() => window.__mm.boardIdle());
      copyAfter = await storeOf(page, b3);
      origAfter = await storeOf(page, b2);
    }
    check('N6. duplicate: a copy — "Garden copy", under its own id — holding every event of the original byte for byte; drawing on the copy leaves the original as it was',
      !!copy && copy.name === 'Garden copy' && list6.current === b2 && !!copy6 && JSON.stringify(copy6.log) === JSON.stringify(orig6.log) &&
        !!copyAfter && strokesIn(copyAfter.log) === 5 && strokesIn(origAfter.log) === 4,
      { copy: copy && [copy.id, copy.name], current: list6.current, same: !!copy6 && JSON.stringify(copy6.log) === JSON.stringify(orig6.log), copyAfter: copyAfter && strokesIn(copyAfter.log), origAfter: origAfter && strokesIn(origAfter.log) });

    // ---- N7. delete: to the trash --------------------------------------------------------
    // Opened last among the rest: Garden (b2) — so deleting the copy on screen opens it.
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-trash="${b3}"]`);
    const moved = await until(page, (b) => { const x = window.__mm.boards(); const e = x.list.find((y) => y.id === b); return !!e && e.trashed > 0 && x.current !== b && !x.switching && !x.busy; }, b3);
    const n7 = { b: await boardsNow(page), strokes: (await strokesOnBoard(page)).length, store: await storeOf(page, b3) };
    await openBoardsPane(page);
    const inTrash = await page.evaluate((b) => !!document.querySelector('#boardsPanel .bdTrash .bdItem[data-id="' + b + '"]') && !document.querySelector('#boardsPanel .bdBoards .bdItem[data-id="' + b + '"]'), b3);
    check('N7. delete in the pane moves the board to the trash with one tap — off the list, into the trash, every record still kept — and the board on screen being the one deleted, the page opens the one opened most recently among the rest',
      moved && n7.b.current === b2 && n7.strokes === 4 && inTrash && !!n7.store && strokesIn(n7.store.log) === 5,
      { moved, current: n7.b.current, strokes: n7.strokes, inTrash, kept: n7.store && strokesIn(n7.store.log) });

    // ---- N8. restore ---------------------------------------------------------------------
    await page.click(`#boardsPanel button[data-restore="${b3}"]`);
    const restored = await until(page, (b) => { const e = window.__mm.boards().list.find((y) => y.id === b); return !!e && !e.trashed && !window.__mm.boards().busy; }, b3);
    await switchTo(page, b3);
    const n8 = (await strokesOnBoard(page)).length;
    check(`N8. restore brings it back onto the list, and opened it has every stroke (${n8} of 5)`, restored && n8 === 5, { restored, strokes: n8 });

    // ---- N9. emptying the trash: said, then done -----------------------------------------
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-trash="${b3}"]`); // the board on screen, again
    await until(page, (b) => { const x = window.__mm.boards(); const e = x.list.find((y) => y.id === b); return !!e && e.trashed > 0 && x.current !== b && !x.switching && !x.busy; }, b3);
    await openBoardsPane(page);
    await page.click('#boardsPanel button[data-empty-trash]');
    await page.waitForSelector('#boardsPanel .bdConfirm', { timeout: 10000 }).catch(() => {});
    const said = await page.evaluate(() => { const c = document.querySelector('#boardsPanel .bdConfirm'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : ''; });
    const stillThere = await storeOf(page, b3);
    await page.click('#boardsPanel button[data-empty-cancel]');
    const kept9 = await storeOf(page, b3);
    await page.click('#boardsPanel button[data-empty-trash]');
    await page.click('#boardsPanel button[data-empty-confirm]');
    const gone = await until(page, (b) => !window.__mm.boards().list.some((e) => e.id === b) && !window.__mm.boards().busy, b3);
    const after9 = await storeOf(page, b3);
    const others9 = { a: await storeOf(page, 'default'), g: await storeOf(page, b2) };
    check('N9. emptying the trash: the first tap says plainly what will go — the board by name, its marks, for good, that it cannot be undone — and deletes nothing; "keep them" keeps them; the second, deliberate tap deletes the board\'s entry and every record it had, and nothing else',
      /Garden copy/.test(said) && /5 marks/.test(said) && /for good/.test(said) && /cannot be undone/.test(said) &&
        !!stillThere && strokesIn(stillThere.log) === 5 && !!kept9 && strokesIn(kept9.log) === 5 &&
        gone && !!after9 && !after9.entry && !after9.meta && after9.records === 0 &&
        JSON.stringify(others9.a.log) === raw && strokesIn(others9.g.log) === 4,
      { said, before: stillThere && strokesIn(stillThere.log), afterKeep: kept9 && strokesIn(kept9.log), gone, after: after9, othersWhole: { first: JSON.stringify(others9.a.log) === raw, garden: strokesIn(others9.g.log) } });

    // ---- N10. a board open in another tab is never emptied out from under it --------------
    b4 = await newBoardVia(page).catch(() => null);
    await draw(page);
    await switchTo(page, b2);
    second = await guards.context.newPage();
    await second.goto(url + '&board=' + b4, { waitUntil: 'load' });
    await waitReady(second);
    const heldThere = await second.evaluate(() => window.__mm.board());
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-trash="${b4}"]`);
    await until(page, (b) => { const e = window.__mm.boards().list.find((y) => y.id === b); return !!e && e.trashed > 0 && !window.__mm.boards().busy; }, b4);
    await page.click('#boardsPanel button[data-empty-trash]');
    await page.waitForSelector('#boardsPanel .bdConfirm', { timeout: 10000 }).catch(() => {});
    const said10 = await page.evaluate(() => { const c = document.querySelector('#boardsPanel .bdConfirm'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : ''; });
    const confirm10 = await page.$('#boardsPanel button[data-empty-confirm]');
    if (confirm10) await confirm10.click();
    await sleep(400);
    const held10 = await storeOf(page, b4);
    await second.close();
    second = null;
    await sleep(300);
    await page.click('#boardsPanel button[data-empty-trash]');
    await page.click('#boardsPanel button[data-empty-confirm]');
    const gone10 = await until(page, (b) => !window.__mm.boards().list.some((e) => e.id === b) && !window.__mm.boards().busy, b4);
    check('N10. a board open in another tab is never emptied out from under it — it stays in the trash with every record, and the pane says why; once that tab lets it go, emptying takes it',
      heldThere.lock === 'held' && /open in another tab/.test(said10) && !!held10 && !!held10.entry && strokesIn(held10.log) === 1 && gone10,
      { lockThere: heldThere.lock, said: said10, keptWhileOpen: held10 && strokesIn(held10.log), gone: gone10 });

    // ---- N11. one tab writes a board — per board -----------------------------------------
    await closeBoardsPane(page);
    await switchTo(page, 'default');
    second = await guards.context.newPage();
    await second.goto(url + '&board=' + b2, { waitUntil: 'load' });
    await waitReady(second);
    await draw(page);
    await draw(second);
    await page.evaluate(() => window.__mm.boardIdle());
    await second.evaluate(() => window.__mm.boardIdle());
    const one = { st: await page.evaluate(() => window.__mm.board()), log: (await storeOf(page, 'default')).log };
    const two = { st: await second.evaluate(() => window.__mm.board()), n: strokesIn((await storeOf(page, b2)).log) };
    third = await guards.context.newPage();
    await third.goto(url + '&board=' + b2, { waitUntil: 'load' });
    await waitReady(third);
    const three = { st: await third.evaluate(() => window.__mm.board()), said: await statusText(third) };
    await draw(third);
    await sleep(300);
    const stillFive = strokesIn((await storeOf(page, b2)).log);
    check('N11. two tabs on two boards each hold their own and write it; a third tab on a board another holds shows it, writes nothing, and says so — R3\'s rule, per board',
      one.st.state === 'armed' && one.st.lock === 'held' && strokesIn(one.log) === r3Strokes + 1 && two.st.state === 'armed' && two.st.lock === 'held' && two.n === 5 &&
        three.st.state === 'readonly' && /another tab/.test(three.said) && stillFive === 5,
      { one: [one.st.state, one.st.lock, strokesIn(one.log)], two: [two.st.state, two.st.lock, two.n], three: [three.st.state, three.said], stillFive });
    await third.close(); third = null;
    await second.close(); second = null;

    // ---- N12. each board opens where it was left -----------------------------------------
    // (the first board now holds R3's events and one more stroke; the view is pinned at 1, 0, 0 after every switch here, so it is set by hand)
    await page.evaluate(() => window.__mm.setView(0.5, 130, 60));
    await switchTo(page, b2);
    await page.evaluate(() => window.__mm.setView(2, -300, -210));
    await openBoardsPane(page);
    await page.click('#boardsPanel button[data-open="default"]');
    await waitOnBoard(page, 'default');
    const v12a = await viewNow(page);
    await page.reload({ waitUntil: 'load' });
    await waitReady(page, 60000, { pin: false });
    const v12b = await viewNow(page);
    const mini = await page.evaluate(() => ({ shown: !document.getElementById('minimap').hidden, map: window.__mm.minimap() }));
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-open="${b2}"]`);
    await waitOnBoard(page, b2);
    const v12c = await viewNow(page);
    check('N12. each board opens where it was left: its view — zoom and pan — comes back on a switch and after a reload, and the minimap shows that board',
      v12a.zoom === 0.5 && v12a.panX === 130 && v12a.panY === 60 && v12b.zoom === 0.5 && v12b.panX === 130 && v12b.panY === 60 &&
        v12c.zoom === 2 && v12c.panX === -300 && v12c.panY === -210 && mini.shown && !!mini.map,
      { afterSwitch: v12a, afterReload: v12b, other: v12c, minimap: mini.shown });
    await closeBoardsPane(page);
    await page.evaluate(() => window.__mm.setView(1, 0, 0));
    // A board that opened fitted and was never moved comes back where it was left — not fitted again
    // to what it holds by then (a box drawn far off would pull a refit away from where the hand was).
    const b12 = await newBoardVia(page);
    const left12 = await viewNow(page);
    await drawPath(page, boxPath({ x: 1000, y: 600, w: 70, h: 44 }));
    await switchTo(page, b2);
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-open="${b12}"]`);
    await waitOnBoard(page, b12);
    const back12 = await viewNow(page);
    check('N12b. a board that opened fitted and was never moved comes back where it was left, not fitted again to what it holds by then',
      !!b12 && back12.zoom === left12.zoom && back12.panX === left12.panX && back12.panY === left12.panY,
      { left: left12, back: back12 });
    await closeBoardsPane(page);
    await switchTo(page, b2);

    // ---- N13. places: folders, repositories and sites are recent entries of their kind -------
    const g13 = strokesIn((await storeOf(page, b2)).log);
    await page.evaluate(async () => { const mm = window.__mm; await mm.openStore(new mm.MM.MemoryStore(), 'folder', 'scratch-folder'); });
    const folderIn = await until(page, () => window.__mm.boards().list.some((e) => e.kind === 'folder' && e.name === 'scratch-folder'), null);
    const leftWhole = strokesIn((await storeOf(page, b2)).log);
    await page.goto(`${origin}/Demos/session-engine.html?nosw=1&folder=${encodeURIComponent('/__boards/site/')}`, { waitUntil: 'load' });
    await until(page, () => window.__mm.folder().how === 'static' && window.__mm.boards && window.__mm.boards().list.some((e) => e.kind === 'static'), null, 20000);
    await page.evaluate(async () => { const mm = window.__mm; await mm.openStore(new mm.MM.MemoryStore(), 'folder', 'another-folder'); });
    await openBoardsPane(page);
    const siteId = await page.evaluate(() => (window.__mm.boards().list.find((e) => e.kind === 'static') || {}).id || null);
    const siteRow = siteId ? await rowText(page, siteId) : null;
    const folderRow = await page.evaluate(() => { const e = window.__mm.boards().list.find((x) => x.kind === 'folder' && x.name === 'scratch-folder'); const r = e && document.querySelector('#boardsPanel .bdItem[data-id="' + e.id + '"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
    if (siteId) await page.click(`#boardsPanel button[data-open="${siteId}"]`);
    const reopened = await until(page, () => window.__mm.folder().how === 'static' && /__boards\/site/.test(window.__mm.folder().name) && !window.__mm.boards().switching, null, 15000);
    await openBoardsPane(page);
    await page.click(`#boardsPanel button[data-open="${b2}"]`);
    await page.waitForURL(new RegExp('[?&]board=' + b2), { timeout: 20000 }).catch(() => {});
    await waitReady(page);
    const n13 = { b: await boardsNow(page), strokes: (await strokesOnBoard(page)).length, how: await page.evaluate(() => window.__mm.folder().how) };
    check('N13. a folder and a site opened on the page are in the list as recent places, each saying its kind; opening the site from the list reopens it; a board opened from a page showing a folder comes back whole in a page of its own — and the board left for the folder was whole in the store',
      folderIn && leftWhole === g13 && !!siteRow && /\bsite\b/.test(siteRow) && !!folderRow && /\bfolder\b/.test(folderRow) && reopened &&
        n13.b.current === b2 && n13.strokes === g13 && n13.how === 'none',
      { folderIn, leftWhole, g13, siteRow, folderRow, reopened, after: { current: n13.b.current, strokes: n13.strokes, how: n13.how } });

    // ---- N14. Reset is not one tap from losing the board ----------------------------------
    await page.click('#ccBtn');
    await page.click('#resetBtn');
    const reset = await until(page, (b) => { const x = window.__mm.boards(); return x.ready && !x.switching && !x.busy && x.current !== b && window.__mm.session.getEvents().length === 0; }, b2, 15000);
    const n14 = await boardsNow(page);
    const was = entryOf(n14, b2);
    const wasStore = await storeOf(page, b2);
    check('N14. Reset no longer empties the board in one tap: a fresh, empty board opens under the same name, and the one it replaced is in the trash with every stroke, to be restored',
      reset && (entryOf(n14, n14.current) || {}).name === 'Garden' && !!was && was.trashed > 0 && !!wasStore && strokesIn(wasStore.log) === g13,
      { reset, current: n14.current, name: (entryOf(n14, n14.current) || {}).name, old: was && { trashed: was.trashed > 0 }, kept: wasStore && strokesIn(wasStore.log) });

    // ---- N15. a board out as a file, and back in as a board --------------------------------
    await switchTo(page, 'default');
    const want15 = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
    await page.click('#ccBtn');
    await page.click('#exportBtn');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#exportPanel button[data-export="log"]')]);
    const file = readFileSync(await download.path(), 'utf8');
    await openBoardsPane(page);
    const before15 = (await boardsNow(page)).list.map((e) => e.id);
    await page.setInputFiles('#boardsFile', { name: 'canvas.jsonl', mimeType: 'application/json', buffer: Buffer.from(file, 'utf8') });
    const in15 = await until(page, (b4) => { const x = window.__mm.boards(); const e = x.list.find((y) => y.kind === 'board' && !b4.includes(y.id)); return !!e && x.current === e.id && !x.switching && !x.busy && window.__mm.board().ready; }, before15, 15000);
    const n15 = { b: await boardsNow(page), log: await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents())) };
    const made15 = n15.b.list.find((e) => e.kind === 'board' && !before15.includes(e.id));
    check('N15. a board out and back in: its log from the export pane, brought back from the boards pane\'s "from a file…" as a new board named for the file — every event equal',
      in15 && !!made15 && made15.name === 'canvas' && n15.log === want15,
      { in15, made: made15 && [made15.id, made15.name], same: n15.log === want15, lines: file.split('\n').filter(Boolean).length });

    // ---- N16. a board that is not saved is never left without a word -----------------------
    // The store refuses every record (IDBObjectStore.add throws a real QuotaExceededError in the
    // page — both engines), while the list's own writes still land: the board on screen cannot be kept.
    const here16 = (await boardsNow(page)).current;
    const before16 = strokesIn((await storeOf(page, here16)).log);
    await page.evaluate(() => window.__mm.setView(1, 0, 0)); // the board from a file opened fitted: world = screen again
    await page.evaluate(() => {
      window.__addBefore = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
    });
    const drawn16 = await draw(page);
    await until(page, () => /not saved/.test(document.getElementById('status').textContent), null, 5000);
    await openBoardsPane(page);
    await page.click('#boardsPanel button[data-open="default"]');
    await until(page, () => /is not saved/.test((document.getElementById('boardsStatus') || {}).textContent || ''), null, 10000);
    const refused16 = await page.evaluate(() => ({
      said: document.getElementById('boardsStatus').textContent.replace(/\s+/g, ' ').trim(),
      ways: [...document.querySelectorAll('#boardsStatus button[data-leave-way]')].map((b) => b.dataset.leaveWay),
      current: window.__mm.boards().current,
    }));
    const onScreen16 = await strokesOnBoard(page);
    // By now the leave has flushed: a whole log was tried (its delete issued, its add refused) — and
    // the transaction abandoned, so what the store already held is all still there.
    const during16 = strokesIn((await storeOf(page, here16)).log);
    // Room again: the next change writes the whole log, and then the switch goes.
    await page.evaluate(() => { IDBObjectStore.prototype.add = window.__addBefore; });
    await sleep(1700);
    await closeBoardsPane(page);
    const drawn16b = await draw(page);
    await until(page, () => !/not saved/.test(document.getElementById('status').textContent) && !window.__mm.board().inFlight, null, 10000);
    await switchTo(page, 'default');
    const kept16 = strokesIn((await storeOf(page, here16)).log);
    check('N16. a board that is not saved is never left without a word: the switch is refused in the pane — the board stays on screen with its stroke, the ways out offered (export the log, leave it anyway), nothing the store held lost while writes fail — and once a save lands the switch goes, every stroke in the store',
      /is not saved/.test(refused16.said) && refused16.ways.includes('export') && refused16.ways.includes('leave') && refused16.current === here16 &&
        onScreen16.some((x) => sameSig(x, drawn16)) && during16 === before16 && kept16 === before16 + 2,
      { refused: refused16, onScreen: onScreen16.length, stored: { before: before16, whileFailing: during16, after: kept16 }, second: !!drawn16b });

    // --- N17. A library pack is part of the board's log (V1-PLAN §2.3, B3): used from the packs pane with
    //     the pointer, the use event is written with the board in its journal — reloaded, the board uses it;
    //     stopped and reloaded, it does not, and the unuse is in the journal too. ---
    const packsTap17 = async (act) => {
      const open = await page.evaluate(() => { const p = document.getElementById('packsPanel'); return !!p && !p.hasAttribute('hidden'); });
      if (!open) { await page.click('#ccBtn'); await page.click('#packsBtn', { timeout: 5000 }); await page.waitForSelector('#packsPanel:not([hidden])', { timeout: 5000 }); }
      await page.click(`#packsPanel .pkItem[data-pack="basics@1"] button[data-${act}]`, { timeout: 5000 });
      await page.click('#packsPanel .paneClose');
      await page.evaluate(() => window.__mm.boardIdle());
    };
    const here17 = await page.evaluate(() => window.__mm.boards().current);
    await packsTap17('use');
    const used17 = (await storeOf(page, here17)).log || [];
    await page.reload();
    await waitReady(page);
    const reopened17 = await page.evaluate(() => ({ board: window.__mm.boards().current, packs: window.__mm.session.getState().packs, notices: window.__mm.session.getState().packNotices.length }));
    await packsTap17('unuse');
    const unused17 = (await storeOf(page, here17)).log || [];
    await page.reload();
    await waitReady(page);
    const again17 = await page.evaluate(() => ({ board: window.__mm.boards().current, packs: window.__mm.session.getState().packs }));
    check('N17. a pack used from the packs pane is kept with the board: its use event is in the journal, and the board reopened after a reload uses it; stopped, the unuse is kept too, and reopened it uses none',
      used17.some((e) => e.type === 'use' && e.pack === 'basics@1') && reopened17.board === here17 && JSON.stringify(reopened17.packs) === '["basics@1"]' && reopened17.notices === 0 &&
        unused17.some((e) => e.type === 'unuse' && e.pack === 'basics@1') && again17.board === here17 && again17.packs.length === 0,
      { board: here17, journal: { use: used17.filter((e) => e.type === 'use').length, unuse: unused17.filter((e) => e.type === 'unuse').length }, reopened: reopened17, again: again17 });
  } catch (err) {
    check('N. the boards scenario ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'boards');
  }
  for (const p of [third, second]) if (p) await p.close().catch(() => {});
  await page.close().catch(() => {});
  return guards;
}

/**
 * The first run (V1-PLAN R5): a browser that has never opened the app. The board it opens is EMPTY —
 * a returning hand is never surprised, and nothing is written for a hand that only looked — and its
 * panel says the loop and offers one tap, *start from an example*, which makes a board of its own
 * (a copy) from the starter: the molecule, using the Basics pack. The boards pane lists every example.
 * `?fresh=1`, the harness's start, stays an empty board; a board with marks is what comes back.
 */
export async function firstRunTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const origin = servers.staticOrigin;
  const url = `${origin}/Demos/session-engine.html?nosw=1`;
  const guards = await freshContext(browser, { origins: [origin], label: 'first-run' });
  const page = await guards.context.newPage();
  const state = (pg) => pg.evaluate(() => {
    const s = window.__mm.session.getState();
    return {
      events: window.__mm.session.getEvents().length,
      strokes: window.__mm.session.getEvents().filter((e) => e.type === 'stroke').length,
      packs: s.packs,
      matches: s.clusterCandidates.flatMap((c) => c.matches.map((m) => m.name + '·' + m.pack)),
      panel: (document.getElementById('inspector') || {}).textContent || '',
      start: !!document.querySelector('#inspector button[data-example-start]'),
      more: !!document.querySelector('#inspector button[data-example-more]'),
      b: window.__mm.boards(),
    };
  });
  try {
    // ---- N18. the first open: an empty board, the loop, one tap ------------------------
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await sleep(300);
    const a = await state(page);
    const kept = a.b.list.filter((e) => e.kind === 'board');
    const store0 = await page.evaluate((id) => window.__mm.boardsStore(id), a.b.current);
    check('N18. a browser that has never opened the app opens ONE empty board, "My board" — nothing is drawn or written for it — whose panel says draw, hold, choose and offers to start from an example',
      kept.length === 1 && kept[0].name === 'My board' && a.events === 0 && (store0.log || []).length === 0 && /draw a few marks/.test(a.panel) && /press and hold/.test(a.panel) && a.start && a.more,
      { boards: kept.map((e) => e.name), events: a.events, stored: (store0.log || []).length, start: a.start, more: a.more, panel: a.panel.slice(0, 120) });
    // The pane lists the examples.
    await openBoardsPane(page);
    await page.waitForSelector('#boardsPanel .bdExamples .bdItem', { timeout: 10000 }).catch(() => {});
    const listed = await page.evaluate(() => [...document.querySelectorAll('#boardsPanel .bdExamples .bdItem')].map((r) => ({ id: r.dataset.example, text: r.textContent.replace(/\s+/g, ' ').trim() })));
    await closeBoardsPane(page);
    check('N18b. the boards pane lists the examples — flowchart, class diagram, molecule, pattern page — each with what it shows and how many marks it holds',
      listed.map((r) => r.id).join() === 'flowchart,class-diagram,molecule,pattern-page' && listed.every((r) => /\d+ marks/.test(r.text)),
      listed);
    // One tap on the panel's start.
    const first = a.b.current;
    await page.click('#inspector button[data-example-start]');
    await page.waitForFunction((was) => { const b = window.__mm.boards(); return b.ready && !b.switching && !b.busy && b.current && b.current !== was && window.__mm.board().ready; }, first, { timeout: 20000, polling: 50 });
    await sleep(200);
    const b = await state(page);
    const made = b.b.list.find((e) => e.id === b.b.current);
    const homeStore = await page.evaluate((id) => window.__mm.boardsStore(id), first);
    check('N18c. one tap on the panel makes a board of its own from the starter — "Molecule example", using the Basics pack, its molecules matched by the pack with nothing taught — and "My board" stays on the list, as empty as it was',
      !!made && made.name === 'Molecule example' && JSON.stringify(b.packs) === '["basics@1"]' && b.strokes >= 10 && b.matches.length >= 2 && b.matches.every((m) => m === 'molecule·basics@1')
        && b.b.list.some((e) => e.id === first && !e.trashed) && (homeStore.log || []).length === 0,
      { made: made && made.name, packs: b.packs, strokes: b.strokes, matches: b.matches, home: (homeStore.log || []).length });
    // It is the hand's own board now: kept, and what comes back on a reload.
    await page.evaluate(() => window.__mm.boardIdle());
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    await sleep(300);
    const c = await state(page);
    check('N18d. it is kept like any board: a reload opens it again, whole — the marks, the pack — and the panel no longer offers a start, there being marks',
      c.b.current === b.b.current && c.strokes === b.strokes && JSON.stringify(c.packs) === '["basics@1"]' && !c.start,
      { current: c.b.current === b.b.current, strokes: [b.strokes, c.strokes], packs: c.packs, start: c.start });
  } catch (err) {
    check('N18. the first run ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'boards-first-run');
  }
  await page.close().catch(() => {});
  // A returning hand: a board with marks is what opens — never replaced, never offered an example over it — and `?fresh=1` is still empty.
  const back = await freshContext(browser, { origins: [origin], label: 'first-run-returning' });
  const p2 = await back.context.newPage();
  try {
    await p2.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(p2);
    const rand = rng(18);
    for (let i = 0; i < 2; i++) await drawPath(p2, boxPath(cellBox(i, rand)));
    await p2.evaluate(() => window.__mm.boardIdle());
    await p2.reload({ waitUntil: 'load' });
    await waitReady(p2);
    await sleep(300);
    const r = await state(p2);
    await p2.goto(url + '&fresh=1', { waitUntil: 'load' });
    await waitReady(p2);
    await sleep(300);
    const f = await state(p2);
    check('N18e. a returning hand is not surprised: a board with two boxes comes back with two boxes and no example on the list but the pane’s; and ?fresh=1 — the harness’s start — is an empty board using no pack',
      r.strokes === 2 && !r.start && r.b.list.filter((e) => e.kind === 'board').length === 1 && f.events === 0 && f.packs.length === 0,
      { back: { strokes: r.strokes, start: r.start, boards: r.b.list.filter((e) => e.kind === 'board').length }, fresh: { events: f.events, packs: f.packs } });
  } catch (err) {
    check('N18e. the returning hand ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(p2, 'boards-first-run-returning');
  }
  await p2.close().catch(() => {});
  return [guards, back];
}

/**
 * The log format (V1-PLAN R2). A log written by the page is version 1 — a header line, then the
 * events — and says so in the status line, with the decision that a week-old MetaMedium still opens it
 * (core's `format.test.ts` proves that against master's bundle from the day before); every reader
 * takes version 0, today's bare events, as well; a version this build does not know is refused in a
 * sentence naming both versions, whether it comes as a board's file or as a folder's log, and nothing
 * of it is read or written over. A folder whose log is version 0 is written back as version 1.
 */
export async function logFormatTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'log-format' });
  const page = await guards.context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const rand = rng(19);
    for (let i = 0; i < 2; i++) await drawPath(page, boxPath(cellBox(i, rand)));
    await page.evaluate(() => window.__mm.boardIdle());
    const want = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
    const version = await page.evaluate(() => (document.querySelector('meta[name="metamedium-version"]') || {}).content || '');

    // ---- N19. a log out is version 1, and says so ---------------------------------------
    await page.click('#ccBtn');
    await page.click('#exportBtn');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#exportPanel button[data-export="log"]')]);
    const file = readFileSync(await download.path(), 'utf8');
    const lines = file.split('\n').filter(Boolean);
    const head = JSON.parse(lines[0]);
    const said = await statusText(page);
    check('N19. the log the export pane writes is version 1: a header line naming the format, the version and the app that wrote it, then every event; and the status line says the version and that an older MetaMedium opens it too',
      head.format === 'metamedium-log' && head.version === 1 && head.app === version && JSON.stringify(lines.slice(1).map((l) => JSON.parse(l))) === want &&
        /log version 1/.test(said) && /older MetaMedium opens it too/.test(said),
      { head, events: lines.length - 1, app: version, said });

    // ---- N19b. version 1 back, and version 0 too --------------------------------------
    const fromFile = async (name, text) => {
      await openBoardsPane(page);
      const before = (await boardsNow(page)).list.map((e) => e.id);
      await page.setInputFiles('#boardsFile', { name, mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') });
      const got = await page.waitForFunction((b4) => {
        const x = window.__mm.boards();
        const e = x.list.find((y) => y.kind === 'board' && !b4.includes(y.id));
        return e && x.current === e.id && !x.switching && !x.busy && window.__mm.board().ready ? { id: e.id, name: e.name } : false;
      }, before, { timeout: 15000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
      return { before, got, log: got ? await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents())) : null };
    };
    const v1 = await fromFile('v1.jsonl', file);
    check('N19b. a version 1 file is a board from "from a file…" — every event equal, the header nowhere among them',
      !!v1.got && v1.got.name === 'v1' && v1.log === want && !/"format":"metamedium-log"/.test(v1.log), { got: v1.got, same: v1.log === want });
    const v0 = await fromFile('v0.jsonl', lines.slice(1).join('\n') + '\n');
    check('N19c. and a version 0 file — bare events, as every log kept before the header is — is a board too, every event equal',
      !!v0.got && v0.got.name === 'v0' && v0.log === want, { got: v0.got, same: v0.log === want });

    // ---- N19d. a version this build does not know is refused, in a sentence ---------------
    const future = JSON.stringify({ type: 'format', format: 'metamedium-log', version: 2, app: '9.9.9' }) + '\n' + lines.slice(1).join('\n') + '\n';
    await openBoardsPane(page);
    const boards19 = (await boardsNow(page)).list.filter((e) => e.kind === 'board').map((e) => e.id);
    await page.setInputFiles('#boardsFile', { name: 'future.jsonl', mimeType: 'application/json', buffer: Buffer.from(future, 'utf8') });
    await page.waitForFunction(() => /version 2/.test((document.getElementById('boardsStatus') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
    const refused = await page.evaluate(() => ({
      said: ((document.getElementById('boardsStatus') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      list: window.__mm.boards().list.filter((e) => e.kind === 'board').map((e) => e.id),
      current: window.__mm.boards().current,
    }));
    check('N19d. a file of version 2 is refused in the boards pane with a sentence naming both versions and what wrote it — no board is made, and the one on screen is as it was',
      /future\.jsonl/.test(refused.said) && /version 2/.test(refused.said) && /versions 0 and 1/.test(refused.said) && /9\.9\.9/.test(refused.said) &&
        JSON.stringify(refused.list) === JSON.stringify(boards19.filter((id) => refused.list.includes(id))) && refused.list.length === boards19.length && refused.current === (await boardsNow(page)).current,
      refused);

    // ---- N19e. a folder whose log is of a newer version is refused whole; a version 0 one is written back as 1 -----
    const folderOut = await page.evaluate(async (futureText) => {
      const mm = window.__mm;
      const store = new mm.MM.MemoryStore({ [mm.MM.logPathFor(mm.folder().me)]: futureText });
      const path = store.paths().find((p) => p.endsWith('.jsonl'));
      const before = mm.session.getEvents().length;
      const opened = await mm.openStore(store, 'store', 'newer');
      return {
        opened: !!opened, before, after: mm.session.getEvents().length,
        untouched: (await store.read(path)) === futureText,
        status: document.getElementById('status').textContent,
        onFolder: !!mm.folder().store,
      };
    }, future);
    check('N19e. a folder holding a log of version 2 is not opened — its sentence in the status line, the board on screen kept, the file never written over',
      !folderOut.opened && !folderOut.onFolder && folderOut.after === folderOut.before && folderOut.untouched && /version 2/.test(folderOut.status) && /versions 0 and 1/.test(folderOut.status), folderOut);
    // A folder this hand wrote as version 0: it opens as it always did, and its next save is version 1 with every old event kept.
    const legacy = lines.slice(1).join('\n') + '\n';
    const upgraded = await page.evaluate(async (legacyText) => {
      const mm = window.__mm;
      const path = mm.MM.logPathFor(mm.folder().me);
      const store = new mm.MM.MemoryStore({ [path]: legacyText });
      const opened = await mm.openStore(store, 'store', 'older');
      const marks = mm.session.getEvents().filter((e) => e.type === 'stroke').length;
      const asOpened = (await store.read(path)) === legacyText;
      mm.session.addStroke([{ x: 10, y: 10, t: 0 }, { x: 110, y: 12, t: 30 }, { x: 210, y: 10, t: 60 }], 1);
      await mm.saveNow();
      const text = String(await store.read(path));
      return { opened: !!opened, marks, asOpened, first: text.split('\n')[0], lines: text.split('\n').filter(Boolean).length, old: legacyText.split('\n').filter(Boolean).length };
    }, legacy);
    check('N19f. a folder whose log is version 0 opens as it always did, its file as written until its hand writes; the save after is version 1 — the header, every old event, the new one',
      upgraded.opened && upgraded.marks === 2 && upgraded.asOpened && /"format":"metamedium-log"/.test(upgraded.first) && /"version":1/.test(upgraded.first) && upgraded.lines === upgraded.old + 2, upgraded);
  } catch (err) {
    check('N19. the log format test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'boards-log-format');
  }
  await page.close().catch(() => {});
  return guards;
}

/**
 * Kept on the iPad (PLAN-IPAD-NOTES I3). Safari clears a site's storage after seven days without a visit unless
 * the site is installed or the browser has agreed to keep it, so the app asks `navigator.storage.persist()` once
 * a board holds something — once per device, remembered, never for `?fresh=1` — and the boards pane says, at its
 * foot, how much the browser holds and how much room it has, and whether it may clear it. The browser's storage API
 * is stood in for (an init script, its asks counted in localStorage so they outlive a reload): this build's own
 * Chromium would answer with a figure of its own, and says nothing of what Safari does.
 */
export async function storageTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const origin = servers.staticOrigin;
  const url = `${origin}/Demos/session-engine.html?nosw=1`;
  const standIn = () => {
    const K = 'e2e-persist';
    const get = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (err) { return {}; } };
    const put = (v) => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (err) { /* nothing */ } };
    const st = {
      persist: async () => { const v = get(); v.calls = (v.calls || 0) + 1; if (v.grant !== false) v.persisted = true; put(v); return v.grant !== false; },
      persisted: async () => !!get().persisted,
      estimate: async () => ({ usage: 12.4 * 1048576, quota: 40 * 1073741824 }),
    };
    try { Object.defineProperty(navigator, 'storage', { configurable: true, get: () => st }); } catch (err) { /* nothing */ }
    if (get().standalone) { try { Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true }); } catch (err) { /* nothing */ } }
  };
  const calls = (pg) => pg.evaluate(() => (JSON.parse(localStorage.getItem('e2e-persist') || '{}').calls) || 0);
  const setIn = (pg, o) => pg.evaluate((v) => localStorage.setItem('e2e-persist', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('e2e-persist') || '{}'), v))), o);
  const footOf = async (pg) => {
    await openBoardsPane(pg);
    await pg.waitForFunction(() => { const e = document.querySelector('#boardsPanel .bdStorage'); return !!e && e.textContent.trim() && !/reading/.test(e.textContent); }, null, { timeout: 10000, polling: 50 }).catch(() => {});
    const t = await pg.evaluate(() => { const e = document.querySelector('#boardsPanel .bdStorage'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    await closeBoardsPane(pg);
    return t;
  };
  const guards = await freshContext(browser, { origins: [origin], label: 'storage' });
  await guards.context.addInitScript(standIn);
  const page = await guards.context.newPage();
  const rand = rng(20);
  try {
    // ---- N20. Asked once a board holds something -------------------------------------------------------
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await sleep(400);
    const empty = await calls(page);
    await drawPath(page, boxPath(cellBox(0, rand)));
    await page.evaluate(() => window.__mm.boardIdle());
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('e2e-persist') || '{}').calls || 0) >= 1, null, { timeout: 5000, polling: 50 }).catch(() => {});
    const once = await calls(page);
    check(`N20. the app asks the browser to keep the device's storage when a board first holds something — ${empty} asks while the board was empty, ${once} once a box was drawn`,
      empty === 0 && once === 1, { empty, once });

    // ---- N20b. …once per device: a reload and another box do not ask again ------------------------------
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    await drawPath(page, boxPath(cellBox(1, rand)));
    await page.evaluate(() => window.__mm.boardIdle());
    await sleep(500);
    const again = await calls(page);
    check(`N20b. it is asked once per device — after a reload and a second box, still ${again} ask`, again === 1, { again });

    // ---- N20c. The pane's foot says how much is kept, in words ------------------------------------------
    const kept = await footOf(page);
    check(`N20c. the boards pane says at its foot that this browser keeps it, and how much room — “${kept}”`,
      kept === 'kept on this device — 12 MB of about 40 GB', { kept });

    // ---- N20d. A browser that did not agree says it may clear it, and the way out ---------------------
    await setIn(page, { persisted: false, grant: false });
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    const may = await footOf(page);
    check(`N20d. a browser that has not agreed to keep it says so — “${may}”`,
      /^this browser may clear it after a week unused — add to Home Screen/.test(may || '') && /12 MB of about 40 GB/.test(may || ''), { may });

    // ---- N20e. Installed to the Home Screen, the warning goes ------------------------------------------
    await setIn(page, { standalone: true });
    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    const app = await footOf(page);
    check(`N20e. installed to the Home Screen, the pane says the app keeps it, with no warning — “${app}”`,
      /^kept with the app on this device — 12 MB of about 40 GB/.test(app || '') && !/clear/.test(app || ''), { app });
  } catch (err) {
    check('N20. the storage records ran to their end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'boards-storage');
  }
  await page.close().catch(() => {});

  // ---- N20f. Never for ?fresh=1: a test's page is not the device's board ---------------------------------
  const other = await freshContext(browser, { origins: [origin], label: 'storage-fresh' });
  await other.context.addInitScript(standIn);
  const p2 = await other.context.newPage();
  try {
    await p2.goto(url + '&fresh=1', { waitUntil: 'load', timeout: 60000 });
    await waitReady(p2);
    await drawPath(p2, boxPath(cellBox(0, rng(21))));
    await p2.evaluate(() => window.__mm.boardIdle());
    await sleep(600);
    const n = await calls(p2);
    check(`N20f. ?fresh=1 never asks — a box drawn on a fresh page: ${n} asks`, n === 0, { n });
  } catch (err) {
    check('N20f. the fresh page ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(p2, 'boards-storage-fresh');
  }
  await p2.close().catch(() => {});
  return [guards, other];
}

/** The scenario the gate runs. */
export async function runBoards(browser, servers, ctx) {
  const steps = [];
  const measured = {};
  const t = Date.now();
  const guards = await boardsTest(browser, servers, { ...ctx, steps });
  measured['boards s'] = +((Date.now() - t) / 1000).toFixed(1);
  const t2 = Date.now();
  const first = await firstRunTest(browser, servers, { ...ctx, steps });
  measured['first run s'] = +((Date.now() - t2) / 1000).toFixed(1);
  const t3 = Date.now();
  const format = await logFormatTest(browser, servers, { ...ctx, steps });
  measured['log format s'] = +((Date.now() - t3) / 1000).toFixed(1);
  const t4 = Date.now();
  const storage = await storageTest(browser, servers, { ...ctx, steps });
  measured['storage s'] = +((Date.now() - t4) / 1000).toFixed(1);
  return { steps, guards: [guards, ...first, format, ...storage], measured };
}
