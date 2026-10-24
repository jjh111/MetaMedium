// A room anyone opens and shares (the rooms lane: MU-1 to MU-14, UX-01, UX-05), as a scenario of the gate.
//
//     node e2e/run.mjs room
//
// Two people who are not John draw together through a relay that keeps a key per room — the Worker's own logic
// (cloudflare/relay/dev-server.mjs) on a free port of its own, never :8020 — each in a browser context of their
// own, as two machines are:
//
//   A (ann)   draws a box, taps *Share this board*: the relay opens a room, the board goes in with her, and
//             *Copy invite link* puts the link — the key after `#` — on the clipboard;
//   B         opens the link in a fresh context, is asked "Your name in this room", types fern, and sees ann's box;
//             fern draws, and ann sees it in fern's colour with fern in the bar; fern's undo takes back only hers;
//   A         reloads, and is back in the room with nothing doubled;
//   B         goes offline, draws, is refused Leave in words (it would lose the mark), comes back online — and ann has
//             the mark at once;
//   a stranger with the key forges a whole log in ann's name (the relay refuses it: 409) and an empty copy of her
//             earlier log (fern's board refuses it: a copy may only add) — ann's box stands on fern's board;
//   C (cleo)  pastes the invite into the pane's Join with a board of her own on screen: she is in the room and her
//             board did not come in; she leaves, and her board is back;
//   D         opens the link with a wrong key, and is told so in the words of someone who clicked a link;
//   a guest   with no name who puts the name prompt away and reloads is asked again, and an empty room is said to be;
//   fern      saves a copy of the room to her boards, and it opens as a board of her own; shared again, every mark on it
//             goes in — ann's as ann's — and a guest of the new room sees them all;
//   a board   too big to carry is said before anything is sent, with the way to share an empty one;
//   bob       in eve's room, her program playing and not played by him, opens the film example: her program never runs
//             in his page as it leaves for the example's board, and the example's own film is let run there;
//   and the key is in no storage, no cache, no export, no text on the page and no address a request went to.

import { startDevRelay } from '../cloudflare/relay/dev-server.mjs';
import { sleep, rng, cellBox, boxPath, drawPath, waitReady } from './keep.mjs';

const SECRET = 'the-room-gate-secret';

/** A context's page, with the gate's guards, and every request's address kept. */
async function contextOf(browser, freshContext, servers, relay, label, opts = {}) {
  const guards = await freshContext(browser, { origins: [servers.staticOrigin, relay.url], label });
  const urls = [];
  guards.context.on('request', (r) => urls.push(r.url()));
  if (opts.clipboard) await guards.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: servers.staticOrigin });
  if (opts.name) await guards.context.addInitScript((n) => { try { if (!localStorage.getItem('mm-hand-name')) localStorage.setItem('mm-hand-name', JSON.stringify(n)); } catch (e) { /* nothing */ } }, opts.name);
  return { guards, urls, context: guards.context };
}

/** Wait in the page for `fn(arg)` to be true; false when the time is up. */
const until = (page, fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const strokes = (page) => page.evaluate(() => window.__mm.session.getState().contentIds.map((id) => {
  const n = window.__mm.session.getState().nodes.get(id);
  const by = (n.edges.find((e) => e.rel === 'made-by') || {}).to || '';
  return { id, by, colour: window.__mm.colourOf(id) };
}));
const room = (page) => page.evaluate(() => window.__mm.room());
const statusText = (page) => page.evaluate(() => document.getElementById('status').textContent || '');

/** Every place in the page a key could have been kept, as text (models.mjs's search, and the board's exports). */
async function everywhere(page) {
  return page.evaluate(async () => {
    const out = {};
    out.log = JSON.stringify(window.__mm.session.getEvents());
    try { out.exportLog = window.__mm.exportLog(); } catch (e) { out.exportLog = ''; }
    try { out.exportSvg = String(await window.__mm.exportBoardSVG()); } catch (e) { out.exportSvg = ''; }
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
    const cached = [];
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const q of await c.keys()) { const res = await c.match(q); cached.push(q.url + ' ' + (res ? await res.text() : '')); }
    }
    out.caches = cached.join('\n');
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
    out.localStorage = JSON.stringify(ls);
    out.session = JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])));
    out.domText = document.body.innerText;
    out.dom = document.documentElement.outerHTML;
    out.search = location.search;
    out.title = document.title;
    return out;
  });
}

export async function runRoom(browser, servers, ctx) {
  const { freshContext, screenshot } = ctx;
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name}. the step itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const relay = await startDevRelay({ MM_RELAY_SECRET: SECRET });
  const guardsList = [];
  const rand = rng(4242);
  let cell = 0;
  const draw = (page) => drawPath(page, boxPath(cellBox(cell++, rand)));
  const app = `${servers.staticOrigin}/app/`;
  const openPane = async (page) => {
    if (await page.evaluate(() => !document.getElementById('livePanel').hasAttribute('hidden'))) return;
    await page.click('#ccBtn');
    await page.click('#liveBtn');
    await page.waitForFunction(() => !document.getElementById('livePanel').hasAttribute('hidden'), null, { timeout: 5000 });
  };
  let A = null, B = null, C = null, D = null, E = null, G = null, H = null;
  let invite = '';
  let key = '';
  let roomName = '';
  try {
    // ---- R1. ann draws a box and shares the board; the invite is read from the clipboard -------------------------------
    await record('R1', async () => {
      A = await contextOf(browser, freshContext, servers, relay, 'room-ann', { clipboard: true, name: 'ann' });
      guardsList.push(A.guards);
      A.page = await A.context.newPage();
      await A.page.goto(`${app}?fresh=1&nosw=1&relay=${encodeURIComponent(relay.url)}`, { waitUntil: 'load', timeout: 60000 });
      await waitReady(A.page);
      await draw(A.page);
      await openPane(A.page);
      const away = await A.page.evaluate(() => ({ share: !document.getElementById('liveAway').hidden && /Share this board/.test(document.getElementById('liveShare').textContent), more: !document.getElementById('liveMore').open }));
      await A.page.click('#liveShare');
      const inRoom = await until(A.page, () => window.__mm.room().inRoom && window.__mm.room().keyed);
      const said = await statusText(A.page);
      await A.page.click('#liveInvite');
      await until(A.page, () => /invite link is copied/.test(document.getElementById('liveStatus').textContent || ''), null, 5000);
      invite = await A.page.evaluate(() => navigator.clipboard.readText());
      const u = new URL(invite);
      key = decodeURIComponent((/(?:^|[#&])key=([^&]+)/.exec(u.hash) || [])[1] || '');
      roomName = u.searchParams.get('live') || '';
      const st = await room(A.page);
      const addr = await A.page.evaluate(() => ({ search: location.search, hash: location.hash }));
      check(`R1. ann shares the board: the pane leads with Share (${JSON.stringify(away)}); the relay opens “${roomName.slice(0, 6)}…”, her box goes in with her (“${said.slice(0, 70)}”); the invite on the clipboard is the app's address, ?live= and the relay, the key only after # — and her own address keeps the room with the key only in its fragment`,
        away.share && away.more && inRoom && /^r-[A-Za-z0-9_-]{22}$/.test(roomName) && key.length === 43 && u.pathname.endsWith('/app/') && !u.search.includes(key) && u.searchParams.get('relay') === relay.url
          && addr.search.includes('live=' + roomName) && !addr.search.includes(key) && addr.hash === '#key=' + key && st.room === roomName && /this board is shared — 1 mark went into the room/.test(said),
        { invite: invite.replace(key, '<key>'), st: { ...st, notices: st.notices }, addr: { search: addr.search, hash: addr.hash.replace(key, '<key>') }, said });
      const chip = await A.page.evaluate(() => ({ shown: !document.getElementById('roomChip').hidden, text: document.getElementById('roomChip').textContent, dots: document.querySelectorAll('#roomChip .hueDot').length }));
      check(`R1b. while in the room the bar shows it — “${chip.text}” — with one dot, hers`, chip.shown && chip.text === 'room ' + roomName.slice(2, 6) && chip.dots === 1, chip);
    });

    // ---- R2. fern opens the invite in a browser of her own, is asked a name, and sees the box ---------------------------
    await record('R2', async () => {
      B = await contextOf(browser, freshContext, servers, relay, 'room-fern');
      guardsList.push(B.guards);
      B.page = await B.context.newPage();
      await B.page.goto(invite, { waitUntil: 'load', timeout: 60000 });
      await waitReady(B.page);
      const asked = await until(B.page, () => { const p = document.getElementById('namePanel'); return p && !p.hasAttribute('hidden'); }, null, 10000);
      const prompt = await B.page.evaluate(() => ({ label: (document.querySelector('#namePanel .nmLabel') || {}).textContent || '', inRoom: window.__mm.room().inRoom }));
      const blank = await B.page.evaluate(() => getComputedStyle(document.getElementById('nameSwatch')).backgroundColor);
      await B.page.fill('#nameInput', 'fern');
      const swatch = await B.page.evaluate(() => getComputedStyle(document.getElementById('nameSwatch')).backgroundColor);
      // The colour her marks will be drawn in, as the page draws it (normalised through an element, as the bar's dots are).
      const fernHue = await B.page.evaluate(() => { const d = document.createElement('i'); document.body.appendChild(d); d.style.background = window.__mm.handColour('fern'); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
      await B.page.press('#nameInput', 'Enter');
      const joined = await until(B.page, () => window.__mm.room().inRoom && window.__mm.session.getState().contentIds.length === 1);
      const st = await room(B.page);
      const marks = await strokes(B.page);
      const addr = await B.page.evaluate(() => location.search);
      check(`R2. fern opens the link in a browser of her own: asked “${prompt.label.trim()}” before joining (the colour her name draws in beside it: ${swatch}), joins as fern, and sees ann's box — ann's, not hers`,
        asked && /Your name in this room/.test(prompt.label) && !prompt.inRoom && swatch === fernHue && swatch !== blank && joined && /^fern~/.test(st.me) && marks.length === 1 && /hand:ann[~_]/.test(marks[0].by) && !addr.includes(key),
        { prompt, st, marks, swatch, fernHue, blank, addr: addr.replace(key, '<key>') });
    });

    // ---- R3. fern draws; ann sees it in fern's colour, and fern in the bar ----------------------------------------------
    await record('R3', async () => {
      await waitReady(B.page);
      await draw(B.page);
      const landed = await until(A.page, () => window.__mm.session.getState().contentIds.length === 2);
      const marks = await strokes(A.page);
      const fernColour = await A.page.evaluate(() => window.__mm.handColour('fern'));
      const fernsMark = marks.find((m) => /hand:fern[~_]/.test(m.by));
      const bar = await until(A.page, () => window.__mm.room().here.some((h) => h.label === 'fern'), null, 10000);
      const dots = await A.page.evaluate(() => [...document.querySelectorAll('#roomChip .hueDot')].map((d) => d.style.background));
      const chipColour = await A.page.evaluate((c) => { const d = document.createElement('i'); d.style.background = c; return d.style.background; }, fernColour);
      check(`R3. fern draws, and ann's board has it — fern's, in fern's colour (${fernColour}) — and the bar shows fern beside ann (${dots.length} dots)`,
        landed && !!fernsMark && fernsMark.colour === fernColour && bar && dots.length === 2 && dots.includes(chipColour), { marks, fernColour, dots });
    });

    // ---- R4. fern's undo takes back only hers — ann drew after her, so the board's last act is ann's -----------------
    await record('R4', async () => {
      await waitReady(A.page);
      await draw(A.page);
      const both = await until(B.page, () => window.__mm.session.getState().contentIds.length === 3);
      await B.page.click('#undoBtn');
      const onA = await until(A.page, () => window.__mm.session.getState().contentIds.length === 2);
      await sleep(300);
      const a = await strokes(A.page), b = await strokes(B.page);
      const annsOnB = b.filter((m) => /hand:ann[~_]/.test(m.by)).length;
      check(`R4. ann draws a second box after fern's, so the board's last act is ann's — and fern's undo takes back fern's box and only hers: ann's two boxes stand on both boards`,
        both && onA && a.length === 2 && a.every((m) => !/fern/.test(m.by)) && b.length === 2 && annsOnB === 2, { a, b });
    });

    // ---- R5. ann reloads, and is back in the room with nothing doubled --------------------------------------------------
    let annBefore = '';
    await record('R5', async () => {
      annBefore = (await room(A.page)).me;
      const posted = [];
      const onReq = (r) => { if (r.method() === 'POST' && r.url().includes('/events')) posted.push((r.postData() || '').slice(0, 80)); };
      A.context.on('request', onReq);
      await A.page.reload({ waitUntil: 'load' });
      await waitReady(A.page);
      const back = await until(A.page, () => window.__mm.room().inRoom && window.__mm.session.getState().contentIds.length >= 2);
      await sleep(600);
      const st = await room(A.page);
      const marks = await strokes(A.page);
      const prompted = await A.page.evaluate(() => !document.getElementById('namePanel').hasAttribute('hidden'));
      // Her earlier sitting said goodbye as the page went — a keepalive POST, so it outlives the page. (That it lands is the
      // browser's: here the gate's own request routing, its model guard, cancels a routed request with its page; a page with
      // no routing in front of it delivers it, which was checked by hand against this relay.)
      const bye = posted.some((v) => v.includes('"bye":true') && v.includes(annBefore));
      check(`R5. ann reloads: back in the room at once (no name asked — hers is kept), a new sitting (${annBefore} → ${st.me}), her two boxes once each, not twice — and the sitting that went said goodbye as it went (${bye})`,
        back && !prompted && st.room === roomName && st.keyed && st.me !== annBefore && /^ann~/.test(st.me) && marks.length === 2 && bye, { st, marks, bye, posted });
      A.context.off('request', onReq);
    });

    // ---- R6. fern goes offline, draws, tries to leave, comes back: Leave is refused in words, and ann has the mark ------
    await record('R6', async () => {
      await B.context.setOffline(true);
      await sleep(300);
      await draw(B.page);
      const kept = await until(B.page, () => window.__mm.room().unsent > 0, null, 15000);
      const toldB = await until(B.page, () => /not reaching the room — what you draw is held on this page/.test(document.getElementById('status').textContent || ''), null, 15000);
      const stillTwo = (await strokes(A.page)).length === 2;
      // Leave, offline: refused — what she drew is on this page alone — with the way to leave anyway.
      await openPane(B.page);
      await B.page.click('#liveLeave');
      const refused = await until(B.page, () => /has not reached it — it is on this page alone, and leaving now loses it/.test(document.getElementById('liveStatus').textContent || '')
        && !document.getElementById('liveLeaveRow').hidden, null, 10000);
      const stillIn = (await room(B.page)).inRoom;
      // Back online right after a try of the backoff failed, so its next try is seconds away: it goes at once all the same.
      let failures = 0;
      const onFail = (r) => { if (r.method() === 'POST' && r.url().includes('/events')) failures++; };
      B.context.on('requestfailed', onFail);
      const before = failures;
      const end = Date.now() + 20000;
      while (failures === before && Date.now() < end) await sleep(100);
      const tried = failures > before;
      await sleep(400);
      B.context.off('requestfailed', onFail);
      await B.context.setOffline(false);
      const back = Date.now();
      const landed = await until(A.page, () => window.__mm.session.getState().contentIds.length === 3, null, 30000);
      const took = Date.now() - back;
      const sent = await until(B.page, () => window.__mm.room().unsent === 0 && !window.__mm.room().notices.some((n) => /not reaching/.test(n)), null, 15000);
      await B.page.evaluate(() => { document.getElementById('liveLeaveRow').hidden = true; });
      check(`R6. fern goes offline and draws: her page holds the mark and says so; Leave is refused in words (“…leaving now loses it”) with “Leave anyway” beside it; back online it goes at once (${took} ms, before the backoff's next try), and ann has it — nothing lost on the wire`,
        kept && toldB && stillTwo && refused && stillIn && tried && landed && took < 1500 && sent, { b: await room(B.page), took, tried });
    });

    // ---- R7. a forged line in ann's name is refused, and ann's ink stands ----------------------------------------------
    await record('R7', async () => {
      const annNow = (await room(A.page)).me;
      const base = `${relay.url}/rooms/${encodeURIComponent(roomName)}/events`;
      const forge = (line) => fetch(base, { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json', 'x-dyna-hand': 'eve-forger-secret-000001' }, body: JSON.stringify(line) });
      const own = await forge({ participant: annNow, events: [], at: 9e12, full: true });
      const ownWords = await own.text();
      const copy = await forge({ participant: annBefore, events: [], at: 9e12, full: true, via: 'eve~e1' });
      await sleep(800);
      const b = await strokes(B.page), a = await strokes(A.page);
      const told = (await room(B.page)).notices;
      check(`R7. a stranger with the key forges an empty whole log in ann's name — the relay refuses it (${own.status}: “${ownWords}”) — and an empty copy of her earlier log under its own (${copy.status}): fern's board refuses that, says so, and ann's boxes stand on both boards`,
        own.status === 409 && copy.status === 204 && b.filter((m) => /hand:ann[~_]/.test(m.by)).length === 2 && a.length === 3 && told.some((n) => /a copy of ann’s marks that would have taken some away was refused/.test(n)), { a, b, told });
    });

    // ---- R8. cleo pastes the invite into Join with a board of her own: she is in, her board did not come; she leaves ----
    await record('R8', async () => {
      C = await contextOf(browser, freshContext, servers, relay, 'room-cleo');
      guardsList.push(C.guards);
      C.page = await C.context.newPage();
      await C.page.goto(`${app}?fresh=1&nosw=1`, { waitUntil: 'load', timeout: 60000 });
      await waitReady(C.page);
      await draw(C.page);
      await C.page.evaluate(() => window.__mm.boardIdle && window.__mm.boardIdle());
      await openPane(C.page);
      await C.page.evaluate(() => { document.getElementById('liveMore').open = true; });
      await C.page.fill('#liveRoom', invite);
      await C.page.fill('#liveName', 'cleo');
      await C.page.click('#liveJoin');
      const joined = await until(C.page, () => window.__mm.room().inRoom && window.__mm.session.getState().contentIds.length === 3);
      await sleep(500);
      const onA = (await strokes(A.page)).length;
      const marks = await strokes(C.page);
      check(`R8. cleo, with a box of her own on screen, pastes the invite into the pane's Join: she is in the room as cleo, sees its three marks, and her box did not come in with her (ann still holds ${onA})`,
        joined && marks.length === 3 && marks.every((m) => !/cleo/.test(m.by)) && onA === 3 && /^cleo~/.test((await room(C.page)).me), { marks, onA });
      await C.page.evaluate(() => window.__mm.leaveRoom());
      await C.page.waitForLoadState('load');
      await waitReady(C.page);
      const after = await C.page.evaluate(() => ({ inRoom: window.__mm.room().inRoom, marks: window.__mm.session.getState().contentIds.length, search: location.search, hash: location.hash }));
      check(`R8b. cleo leaves: her own board is back, her box on it, and nothing of the room is in her address`,
        !after.inRoom && after.marks === 1 && !/live=|key=/.test(after.search + after.hash), after);
    });

    // ---- R9. a wrong key is said --------------------------------------------------------------------------------------
    await record('R9', async () => {
      D = await contextOf(browser, freshContext, servers, relay, 'room-dan', { name: 'dan' });
      guardsList.push(D.guards);
      D.page = await D.context.newPage();
      const wrong = invite.replace(/#key=.*$/, '#key=' + 'W'.repeat(43));
      await D.page.goto(wrong, { waitUntil: 'load', timeout: 60000 });
      await waitReady(D.page);
      const said = await until(D.page, () => /this invite link does not open the room — ask whoever sent it for a new link/.test(document.getElementById('status').textContent || ''), null, 15000);
      const text = await statusText(D.page);
      check(`R9. a link with a wrong key is refused, and the page says so in the words of someone who clicked a link: “${text.slice(0, 120)}”`, said && !text.includes('W'.repeat(43)) && !/relay|key/.test(text.replace(/invite link/, '')), { text });
    });

    // ---- R9b. a guest with no name who puts the prompt away and reloads is asked again — never joins as "hand" — and an
    //      empty room a link opens is said to be empty, with why it may be ----------------------------------------------
    await record('R9b', async () => {
      H = await contextOf(browser, freshContext, servers, relay, 'room-anon');
      guardsList.push(H.guards);
      const made = await (await fetch(`${relay.url}/rooms`, { method: 'POST' })).json();
      H.page = await H.context.newPage();
      const link = `${app}?live=${encodeURIComponent(made.room)}&relay=${encodeURIComponent(relay.url)}#key=${encodeURIComponent(made.key)}`;
      await H.page.goto(link, { waitUntil: 'load', timeout: 60000 });
      await waitReady(H.page);
      const shown = () => until(H.page, () => { const p = document.getElementById('namePanel'); return p && !p.hasAttribute('hidden'); }, null, 10000);
      const first = await shown();
      await H.page.click('#namePanel .paneClose');
      const away = await until(H.page, () => document.getElementById('namePanel').hasAttribute('hidden'), null, 5000);
      await H.page.reload({ waitUntil: 'load' });
      await waitReady(H.page);
      const again = await shown();
      const notIn = !(await room(H.page)).inRoom;
      await H.page.fill('#nameInput', 'ida');
      await H.page.press('#nameInput', 'Enter');
      const joined = await until(H.page, () => window.__mm.room().inRoom, null, 15000);
      const me = (await room(H.page)).me;
      const empty = await until(H.page, () => /nothing is in this room yet — a room is forgotten 30 days after it was last used/.test(document.getElementById('status').textContent || ''), null, 15000);
      check(`R9b. a guest with no name puts the prompt away and reloads: asked again (${first}, ${away}, ${again}), not in the room until she gives one, then in as ${me} — and the empty room is said to be empty, with why it may be`,
        first && away && again && notIn && joined && /^ida~/.test(me) && empty, { me, status: await statusText(H.page) });
    });

    // ---- R10. fern saves a copy of the room to her boards, and it opens as a board of her own --------------------------
    await record('R10', async () => {
      await openPane(B.page);
      const pane = await B.page.evaluate(() => ({ who: [...document.querySelectorAll('#liveWho li')].map((l) => l.textContent.trim()), kept: document.getElementById('liveKept').textContent }));
      await B.page.click('#liveSaveCopy');
      const saved = await until(B.page, () => /kept as “Shared board/.test(document.getElementById('liveStatus').textContent || ''), null, 10000);
      const entry = await B.page.evaluate(() => window.__mm.boards().list.find((e) => /^Shared board/.test(e.name)));
      const errorsBefore = B.guards.pageErrors.length;
      const p2 = await B.context.newPage();
      await p2.goto(`${app}?nosw=1&relay=${encodeURIComponent(relay.url)}&board=${encodeURIComponent(entry ? entry.id : 'none')}`, { waitUntil: 'load', timeout: 60000 });
      await waitReady(p2);
      await until(p2, () => window.__mm.session.getState().contentIds.length === 3, null, 10000);
      const opened = await p2.evaluate(() => ({ marks: window.__mm.session.getState().contentIds.length, inRoom: window.__mm.room().inRoom, name: window.__mm.boards().name, byOthers: window.__mm.session.getEvents().filter((e) => e.by).length }));
      await draw(p2);
      const drawn = await p2.evaluate(() => window.__mm.session.getState().contentIds.length);
      check(`R10. the Live pane says who is here (${pane.who.join(', ')}) and how long the room is kept (“${pane.kept}”); fern saves a copy to her boards — “${entry && entry.name}” — and it opens as a board of her own: the room's three marks, ann's still stamped as hers, no error, and a mark drawn on it`,
        pane.who.length >= 2 && pane.who.some((w) => /fern/.test(w)) && /kept 30 days after it was last used/.test(pane.kept) && saved && !!entry && opened.marks === 3 && !opened.inRoom && opened.byOthers > 0
          && drawn === 4 && B.guards.pageErrors.length === errorsBefore, { pane, entry, opened, drawn });
      // ---- R10b. that copy shared again: every mark on it goes into the new room — ann's as ann's — and a guest sees them all
      await p2.evaluate(() => window.__mm.shareBoard());
      const shared = await until(p2, () => window.__mm.room().inRoom, null, 15000);
      const words = await statusText(p2);
      const onFern = (await strokes(p2)).length;
      const link = p2.url();
      G = await contextOf(browser, freshContext, servers, relay, 'room-gia', { name: 'gia' });
      guardsList.push(G.guards);
      G.page = await G.context.newPage();
      await G.page.goto(link, { waitUntil: 'load', timeout: 60000 });
      await waitReady(G.page);
      const all = await until(G.page, () => window.__mm.room().inRoom && window.__mm.session.getState().contentIds.length === 4, null, 15000);
      const seen = await strokes(G.page);
      await p2.close();
      check(`R10b. fern shares that copy: “${words.slice(0, 70)}” — the four marks stay on her screen, and a guest of the new room sees all four, ann's still ann's`,
        shared && /this board is shared — 4 marks went into the room/.test(words) && onFern === 4 && all && seen.length === 4 && seen.filter((m) => /hand:ann[~_]/.test(m.by)).length === 2, { words, onFern, seen });
    });

    // ---- R11. a board too big to carry is said before anything is sent ---------------------------------------------------
    await record('R11', async () => {
      E = await contextOf(browser, freshContext, servers, relay, 'room-big');
      guardsList.push(E.guards);
      E.page = await E.context.newPage();
      await E.page.goto(`${app}?fresh=1&nosw=1&relay=${encodeURIComponent(relay.url)}`, { waitUntil: 'load', timeout: 60000 });
      await waitReady(E.page);
      await E.page.evaluate(() => window.__mm.session.import({ kind: 'md', path: 'notes.md', code: 'x'.repeat(13_000_000), bounds: { minX: 500, minY: 200, maxX: 900, maxY: 500 }, at: Date.now() }));
      const asked = [];
      E.context.on('request', (r) => { if (r.url().endsWith('/rooms') && r.method() === 'POST') asked.push(r.url()); });
      await openPane(E.page);
      await E.page.click('#liveShare');
      const said = await until(E.page, () => /a shared room carries boards up to 12 MB/.test(document.getElementById('liveStatus').textContent || ''), null, 10000);
      const st = await E.page.evaluate(() => ({ text: document.getElementById('liveStatus').textContent, empty: !document.getElementById('liveEmptyRow').hidden, inRoom: window.__mm.room().inRoom }));
      check(`R11. a board too big to carry is said before anything is sent — “${st.text}” — with the way to share an empty board instead`,
        said && st.empty && !st.inRoom && asked.length === 0, { st, asked });
      // The way out: an empty board shared — and a person with no name kept is asked one first, as a guest is.
      await E.page.click('#liveShareEmpty');
      const named = await until(E.page, () => { const p = document.getElementById('namePanel'); return p && !p.hasAttribute('hidden') && /share this board/i.test(p.querySelector('.paneTitle').textContent); }, null, 5000);
      await E.page.fill('#nameInput', 'bea');
      await E.page.press('#nameInput', 'Enter');
      const shared = await until(E.page, () => window.__mm.room().inRoom && window.__mm.session.getState().contentIds.length === 0, null, 15000);
      const words = await statusText(E.page);
      const me = (await room(E.page)).me;
      check(`R11b. “Share an empty board instead”: asked her name first (she had none), then a room with nothing carried in — “${words.slice(0, 60)}” — as ${me}`,
        named && shared && /^an empty board is shared/.test(words) && /^bea~/.test(me) && asked.length === 1, { words, me, asked });
    });

    // ---- R13. an example opened from a room runs nobody's program but its own: another hand's, playing in the room,
    // never runs in the page that leaves for the example, and the example's own film is let run on the board made ------
    await record('R13', async () => {
      const ev = await contextOf(browser, freshContext, servers, relay, 'room-eve', { name: 'eve' });
      guardsList.push(ev.guards);
      ev.page = await ev.context.newPage();
      await ev.page.goto(`${app}?fresh=1&nosw=1&relay=${encodeURIComponent(relay.url)}`, { waitUntil: 'load', timeout: 60000 });
      await waitReady(ev.page);
      await ev.page.evaluate(() => {
        const s = window.__mm.session; let at = Date.now();
        const id = s.import({ kind: 'run', path: 'eve.run.js', name: 'eve', bounds: { minX: 700, minY: 300, maxX: 900, maxY: 460 }, code: "mm.report('eve-code-ran', 0, 0, 40, 40);", at: at++ });
        s.clock({ nodeId: id, op: 'play', at: at++ });
      });
      await ev.page.evaluate(() => window.__mm.shareBoard());
      await until(ev.page, () => window.__mm.room().inRoom);
      const link = await ev.page.evaluate(() => location.href);
      const bo = await contextOf(browser, freshContext, servers, relay, 'room-bob', { name: 'bob' });
      guardsList.push(bo.guards);
      bo.page = await bo.context.newPage();
      const reports = [];
      await bo.page.exposeFunction('__roomReport', (r) => reports.push(r));
      // The room's own address, as eve's page keeps it — the key in its fragment, as an invite carries it.
      await bo.page.goto(link, { waitUntil: 'load', timeout: 60000 });
      await waitReady(bo.page);
      await until(bo.page, () => window.__mm.room().inRoom && window.__mm.session.getState().live.length >= 1);
      const runId = await bo.page.evaluate(() => { const s = window.__mm.session.getState(); return s.live.find((id) => s.clocks[id] && s.clocks[id].playing) || null; });
      await bo.page.waitForTimeout(800);
      const before = await bo.page.evaluate((id) => ({ here: window.__mm.playedHere(id), parts: window.__mm.reportedRegions(id).length, author: window.__mm.clockAuthor(id) }), runId);
      await bo.page.evaluate((id) => { setInterval(() => { const p = window.__mm.reportedRegions(id); if (p.length) window.__roomReport(p.length); }, 20); }, runId);
      // A slow network: the board's own page takes a while to come, and the room's page is still here meanwhile.
      await bo.page.route((u) => /\/app\/\?.*board=/.test(String(u)), async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.continue(); });
      await bo.page.click('#ccBtn'); await bo.page.click('#boardsBtn');
      await bo.page.waitForSelector('#boardsPanel:not([hidden]) [data-example-open="story"]', { timeout: 10000 });
      await bo.page.click('[data-example-open="story"]');
      await bo.page.waitForURL(/board=/, { timeout: 20000 });
      await waitReady(bo.page);
      const film = await until(bo.page, () => { const s = window.__mm.session.getState(); return s.live.some((id) => s.clocks[id] && s.clocks[id].playing && window.__mm.playedHere(id)); }, null, 15000);
      const after = await bo.page.evaluate(() => ({ inRoom: window.__mm.room().inRoom, search: location.search }));
      check(`R13. bob, in eve's room with her program playing and not played here (${JSON.stringify(before)}), opens the film example: her program never ran in his page as it left (${reports.length} reports), and on the board made the example's own film is let run (${film}) — out of the room (${after.search})`,
        !!runId && !before.here && before.parts === 0 && before.author === 'eve' && reports.length === 0 && film && !after.inRoom, { before, reports: reports.length, film, after });
    });

    // ---- R12. the key is nowhere it should not be ----------------------------------------------------------------------
    await record('R12', async () => {
      const places = [];
      for (const [who, c] of [['ann', A], ['fern', B], ['cleo', C]]) {
        if (!c || !c.page) continue;
        const e = await everywhere(c.page);
        for (const [k, v] of Object.entries(e)) if (String(v).includes(key)) places.push(who + ':' + k);
        for (const u of c.urls) if (u.includes(key)) { places.push(who + ':request ' + u.split('#')[0].replace(key, '<key>')); break; }
      }
      check(`R12. the room's key is in no storage, cache, export, text on the page, query, title or address a request went to — ${places.length ? places.join(', ') : 'nowhere'}`,
        places.length === 0 && key.length === 43, { places });
    });
  } catch (err) {
    check(`the scenario itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
  } finally {
    if (steps.some((s) => !s.ok)) for (const [n, c] of [['ann', A], ['fern', B], ['cleo', C], ['dan', D], ['big', E], ['gia', G], ['ida', H]]) if (c && c.page && !c.page.isClosed()) await screenshot(c.page, 'room-' + n).catch(() => {});
    await relay.close().catch(() => {});
  }
  return { steps, guards: guardsList };
}
