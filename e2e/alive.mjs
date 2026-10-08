#!/usr/bin/env node
//
// The pendulum is alive (MATHS-SPEC §8 Lane D, M23; V1-SPEC RN4's first runner).
//
//     node e2e/run.mjs alive          # in the gate
//
// A pendulum drawn with the pointer's own strokes — a ceiling, its hatching, a
// rod, a bob — read, played by the hand's own act, swinging by physics with no
// event in the log but the one that played it, stopped by Esc, and paused when
// the page is opened again. Every stroke is `page.mouse`; nothing is the
// session's own door but the questions the records ask (`__mm.session`,
// `__mmRun`, the handle the surface keeps for this gate).
//
//   AL1   the pendulum, held, is read: *a pendulum 0.8x — a rod from a pivot, a bob, drawn
//         N° from plumb*, and Play the pendulum is offered
//   AL2   an offer at rest never plays: nothing swings, nothing is written, the ink is where it was drawn
//   AL3   taking Play writes ONE clock event, on the rod, stamped with the tool, and the status line says the period
//   AL4   it swings: its drawn position changes from frame to frame with no new event, the rod keeps its
//         length and the pivot never moves
//   AL5   the canvas itself changes between two frames
//   AL6   the swing is the physics: the drawn angle at the run's time is what RK4 gives at that time
//   AL7   T and the live θ stand beside it as chips
//   AL8   Esc stops it: it holds still, the clock says paused, one pause event and no more
//   AL8b  held with the field open, one Esc stops the pendulum the hand is holding
//   AL9   after a reload it is paused: the log says played, the page runs nothing and offers Play again
//   AL10  Reset puts the ink back where it was drawn; Play swings it again
//   AL11  a rod drawn plumb is offered Pull it aside; one act turns it, one undo puts it back
//   AL12  the whole run wrote only what the hand did — strokes, binds, plays, pauses, a reset: no move, turn or scale
//   AL13  a second tab opens the same board: it too runs nothing until played there
//   AL14  a pendulum whose marks were named swings inside its artifact, the pivot never moved

import { waitReady } from './keep.mjs';

// --- the hand: strokes as a person draws them, in screen pixels ---
const lerp = (a, b, n = 24) => Array.from({ length: n }, (_, i) => ({ x: a.x + (b.x - a.x) * i / (n - 1), y: a.y + (b.y - a.y) * i / (n - 1) }));
const ring = (cx, cy, r, n = 90, from = 0.3) => Array.from({ length: n + 1 }, (_, i) => { const a = from + i / n * Math.PI * 2 * 1.03; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });

async function draw(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
  await page.waitForTimeout(120);
}
async function hold(page, x, y) {
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); await page.waitForTimeout(400);
}

/** A pendulum on screen: a ceiling and seven ticks above it, a rod, a ring — the pointer's own strokes. Returns where its parts stand. */
async function drawPendulum(page, { pivot = { x: 760, y: 170 }, theta = 20, length = 230, r = 26 } = {}) {
  const a = theta * Math.PI / 180;
  const u = { x: Math.sin(a), y: Math.cos(a) };
  const bob = { x: pivot.x + u.x * length, y: pivot.y + u.y * length };
  await draw(page, lerp({ x: pivot.x - 100, y: pivot.y }, { x: pivot.x + 100, y: pivot.y }, 30));
  for (let i = 0; i < 7; i++) {
    const x = pivot.x - 88 + i * 29;
    await draw(page, lerp({ x, y: pivot.y - 3 }, { x: x + 14, y: pivot.y - 21 }, 8));
  }
  await draw(page, lerp(pivot, { x: bob.x - u.x * r, y: bob.y - u.y * r }, 36));
  await draw(page, ring(bob.x, bob.y, r));
  return { pivot, bob, r, theta, length };
}

// --- what the hand sees ---
const fieldNow = (page) => page.evaluate(() => {
  const f = document.querySelector('#summon');
  if (!f || f.style.display === 'none') return null;
  const said = (b) => { const n = b.querySelector('.note'); return (b.querySelector('span') || b).textContent.trim() + (n ? ' · ' + n.textContent.trim() : ''); };
  return {
    line: (f.querySelector('.reading') || {}).textContent || '',
    is: [...f.querySelectorAll('.row.certain .pill.item')].map(said),
    affords: [...f.querySelectorAll('.row.afford .pill.item')].map(said),
  };
});
const events = (page) => page.evaluate(() => window.__mm.session.getEvents().length);
const clockEvents = (page) => page.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'clock').map((e) => ({ op: e.op, nodeId: e.nodeId, tool: e.tool, offer: e.offer })));
const status = (page) => page.evaluate(() => (document.getElementById('status') || {}).textContent || '');
/** The first stroke that is a straight line with the board's longest run — the rod is the one the run is keyed by. */
const runKeys = (page) => page.evaluate(() => window.__mmRun.runs().map((r) => ({ key: r.key, running: r.running, t: r.t, summary: r.summary, confidence: r.confidence })));
const dismissAll = async (page) => {
  for (let i = 0; i < 4; i++) {
    const held = await page.evaluate(() => { const s = window.__mm.session.getState(); return !!s.summon || s.selection.length > 0; });
    if (!held) return;
    await page.mouse.click(1000, 650);
    await page.waitForTimeout(250);
  }
};
const pill = (page, text) => page.locator('#summon .pill.item', { hasText: text }).first();

/** Where the bob is drawn now, and the rod's top end, from the same placements the paint applies. */
const drawn = (page, rod, bob) => page.evaluate(([rodId, bobId]) => window.__mmRun.drawn(rodId, bobId), [rod, bob]);

export async function runAlive(browser, servers, { freshContext }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'alive' });
  const origin = servers.staticOrigin;
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const open = async (url = '/app/?nosw=1') => {
    const page = await guards.context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.waitForTimeout(200);
    return page;
  };

  let page = await open();
  let geo = null, rod = null, bob = null;

  await record('AL1', async () => {
    geo = await drawPendulum(page);
    await hold(page, geo.bob.x - geo.r, geo.bob.y);
    const f = await fieldNow(page);
    const found = await page.evaluate(() => {
      const MM = window.DynaInkCore, st = window.__mm.session.getState();
      const r = MM.readPendulum(st);
      return r && r.pendulums[0] ? { rod: r.pendulums[0].rod, bob: r.pendulums[0].bob } : null;
    });
    rod = found && found.rod; bob = found && found.bob;
    check(`AL1. the pendulum, held, is read as one — “${f && f.is.join(' | ')}” — and Play the pendulum is offered (affords: ${f && f.affords.join(' | ')})`,
      f && f.is.some((l) => /^a pendulum 0\.\d\d/.test(l)) && f.affords.includes('Play the pendulum') && rod && bob, { f, found });
  });

  await record('AL2', async () => {
    const before = await events(page);
    await page.waitForTimeout(700);
    const keys = await runKeys(page);
    const at = await drawn(page, rod, bob);
    check(`AL2. an offer at rest never plays: with Play on the pill and nothing taken, nothing runs (${keys.length} run read, running ${keys.some((k) => k.running)}), nothing is written (events ${before} → ${await events(page)}), and the ink is where it was drawn (moved ${at && at.moved})`,
      keys.length === 1 && !keys[0].running && (await events(page)) === before && at && !at.moved, { keys, at });
  });

  await record('AL3', async () => {
    const before = await events(page);
    await pill(page, 'Play the pendulum').click();
    await page.waitForTimeout(500);
    const after = await clockEvents(page);
    const say = await status(page);
    check(`AL3. taking Play writes one clock event — on the rod, stamped with the tool — and the status line says the period (“${say}”)`,
      after.length === 1 && after[0].op === 'play' && after[0].nodeId === rod && after[0].tool === 'run' && after[0].offer === `run:play:${rod}` && /T = 2\.\d\d s/.test(say), { after, say, before });
  });

  await record('AL4', async () => {
    await dismissAll(page);
    const before = await events(page);
    const samples = [];
    for (let i = 0; i < 24; i++) { samples.push(await drawn(page, rod, bob)); await page.waitForTimeout(60); }
    const after = await events(page);
    const keys = await runKeys(page);
    const L = geo.length;
    const xs = new Set(samples.map((s) => Math.round(s.bob.x * 10)));
    const reach = Math.max(...samples.map((s) => Math.hypot(s.bob.x - samples[0].bob.x, s.bob.y - samples[0].bob.y)));
    const rigid = samples.every((s) => Math.abs(Math.hypot(s.bob.x - s.pivot.x, s.bob.y - s.pivot.y) - Math.hypot(samples[0].bob.x - samples[0].pivot.x, samples[0].bob.y - samples[0].pivot.y)) < 0.5);
    const still = samples.every((s) => Math.hypot(s.pivot.x - samples[0].pivot.x, s.pivot.y - samples[0].pivot.y) < 0.01);
    check(`AL4. it swings: the bob is drawn at ${xs.size} different places in ${samples.length} frames (it travels ${Math.round(reach)} px), the rod keeps its length (${rigid ? 'yes' : 'NO'}), the pivot never moves (${still ? 'yes' : 'NO'}), and no event is written while it does (events ${before} → ${after})`,
      keys[0] && keys[0].running && xs.size >= 8 && reach > 25 && rigid && still && after === before, { keys, first: samples[0], last: samples[samples.length - 1] });
    check(`AL4b. the rod’s drawn length is the length it was drawn at (${L} px, to the bob’s centre)`, samples.every((s) => Math.abs(Math.hypot(s.bob.x - s.pivot.x, s.bob.y - s.pivot.y) - L) < 4), { L });
  });

  await record('AL5', async () => {
    // The main canvas, the pendulum's own patch of it, every byte: the picture the paint made.
    const grab = () => page.evaluate(() => { const c = document.getElementById('canvas'); const g = c.getContext('2d'); const d = g.getImageData(560, 140, 420, 330).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; });
    const seen = new Set();
    for (let i = 0; i < 8; i++) { seen.add(await grab()); await page.waitForTimeout(90); }
    check(`AL5. the canvas itself changes between frames (${seen.size} different pictures in 8)`, seen.size >= 4, { seen: [...seen] });
  });

  await record('AL6', async () => {
    const r = await page.evaluate(([rodId, bobId]) => {
      const MM = window.DynaInkCore, h = window.__mmRun;
      let worst = 0, n = 0;
      for (let i = 0; i < 12; i++) {
        const d = h.drawn(rodId, bobId);
        const st = h.runs().find((x) => x.key === rodId);
        const dt = MM.PENDULUM_DT, L = st.inputs.L.value, g = st.inputs.g.value;
        let s = MM.pendulumStart(st.theta0);
        for (let k = 0; k < d.steps; k++) s = MM.pendulumStep(s, dt, g, L);
        const drawnTheta = Math.atan2(d.bob.x - d.pivot.x, d.bob.y - d.pivot.y);
        worst = Math.max(worst, Math.abs(drawnTheta - s.theta) * 180 / Math.PI);
        n++;
      }
      return { worst, n };
    }, [rod, bob]);
    check(`AL6. the swing is the physics: the angle it is drawn at is what RK4 gives at the run’s own step, to ${r.worst.toFixed(3)}° over ${r.n} looks`, r.worst < 0.05, r);
  });

  await record('AL7', async () => {
    const a = await page.evaluate(() => window.__mmRun.chips().map((c) => c.text));
    await page.waitForTimeout(200);
    const b = await page.evaluate(() => window.__mmRun.chips().map((c) => c.text));
    check(`AL7. T and the live θ stand beside it as chips — ${a.join(' · ')} — and θ is live (${a.find((t) => /^θ/.test(t))} then ${b.find((t) => /^θ/.test(t))})`,
      a.some((t) => /^T = 2\.\d\d s/.test(t)) && a.some((t) => /^θ = -?\d+(\.\d)?°/.test(t)) && a.find((t) => /^θ/.test(t)) !== b.find((t) => /^θ/.test(t)), { a, b });
  });

  await record('AL8', async () => {
    await dismissAll(page);
    const before = await clockEvents(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const p1 = await drawn(page, rod, bob);
    await page.waitForTimeout(350);
    const p2 = await drawn(page, rod, bob);
    const after = await clockEvents(page);
    const keys = await runKeys(page);
    const clock = await page.evaluate((id) => window.__mm.session.getState().clocks[id], rod);
    check(`AL8. Esc stops it: it holds still (${Math.hypot(p1.bob.x - p2.bob.x, p1.bob.y - p2.bob.y).toFixed(3)} px in 350 ms), the clock says paused, and exactly one pause was written (${after.slice(before.length).map((e) => e.op).join(', ')})`,
      keys[0] && !keys[0].running && Math.hypot(p1.bob.x - p2.bob.x, p1.bob.y - p2.bob.y) < 0.01 && clock && clock.playing === false && after.length - before.length === 1 && after[after.length - 1].op === 'pause', { keys, clock, after });
  });

  await record('AL8b', async () => {
    // Held, with the field open, one Esc stops the pendulum the hand is holding.
    await hold(page, geo.bob.x - geo.r, geo.bob.y);
    await pill(page, 'Play the pendulum').click();
    await page.waitForTimeout(500);
    const running = (await runKeys(page))[0].running;
    const before = (await clockEvents(page)).length;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const after = await clockEvents(page);
    const keys = await runKeys(page);
    check(`AL8b. holding the pendulum with the field open, one Esc stops it (running ${running} → ${keys[0].running}; ${after.slice(before).map((e) => e.op).join(', ')})`,
      running && !keys[0].running && after.length - before === 1 && after[after.length - 1].op === 'pause', { running, keys, after });
    await dismissAll(page);
  });

  await record('AL9', async () => {
    // Played again, then the page closed with the clock saying played.
    await hold(page, geo.bob.x - geo.r, geo.bob.y);
    await pill(page, 'Play the pendulum').click();
    await page.waitForTimeout(500);
    await dismissAll(page);
    const playing = await page.evaluate((id) => window.__mm.session.getState().clocks[id].playing, rod);
    await page.waitForTimeout(400);
    const eventsBefore = await events(page);
    const clocksBefore = (await clockEvents(page)).length;
    await page.close();
    page = await open();
    const log = await page.evaluate((id) => ({ clock: window.__mm.session.getState().clocks[id], n: window.__mm.session.getEvents().length, clocks: window.__mm.session.getEvents().filter((e) => e.type === 'clock').length }), rod);
    await page.waitForTimeout(700);
    const keys = await runKeys(page);
    const at = await drawn(page, rod, bob);
    await hold(page, geo.bob.x - geo.r, geo.bob.y);
    const f = await fieldNow(page);
    check(`AL9. after a reload it is paused: the log says played (${log.clock && log.clock.playing}) and holds ${log.n} events (was ${eventsBefore}), the page runs nothing (running ${keys.some((k) => k.running)}, moved ${at.moved}), writes nothing, and offers Play again (${f && f.affords.filter((l) => /pendulum/.test(l)).join(' | ')})`,
      playing && log.clock && log.clock.playing === true && log.clocks === clocksBefore && log.n <= eventsBefore && keys.length === 1 && !keys[0].running && !at.moved && (await clockEvents(page)).length === clocksBefore
        && f && f.affords.includes('Play the pendulum') && !f.affords.includes('Pause the pendulum'), { playing, log, keys, at, f });
  });

  await record('AL10', async () => {
    await pill(page, 'Play the pendulum').click();
    await page.waitForTimeout(900);
    await dismissAll(page);
    const moving = await runKeys(page);
    const p1 = await drawn(page, rod, bob);
    await page.waitForTimeout(150);
    const p2 = await drawn(page, rod, bob);
    // Held where it is by Esc, then Reset: the ink back where it was drawn.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await hold(page, geo.bob.x - geo.r, geo.bob.y);
    const f = await fieldNow(page);
    await pill(page, 'Reset the pendulum').click();
    await page.waitForTimeout(500);
    await dismissAll(page);
    const at = await drawn(page, rod, bob);
    const keys = await runKeys(page);
    check(`AL10. played again it swings (${Math.hypot(p1.bob.x - p2.bob.x, p1.bob.y - p2.bob.y).toFixed(1)} px in 150 ms); Reset (offered: ${f && f.affords.filter((l) => /pendulum/.test(l)).join(' | ')}) puts the ink back where it was drawn (t = ${keys[0] && keys[0].t.toFixed(2)}, bob ${Math.hypot(at.bob.x - geo.bob.x, at.bob.y - geo.bob.y).toFixed(1)} px from where it was drawn)`,
      moving[0] && moving[0].running && Math.hypot(p1.bob.x - p2.bob.x, p1.bob.y - p2.bob.y) > 0.5 && keys[0] && keys[0].t === 0 && Math.hypot(at.bob.x - geo.bob.x, at.bob.y - geo.bob.y) < 3, { moving, keys, at });
  });

  await record('AL11', async () => {
    const p = await open('/app/?fresh=1&nosw=1');
    try {
      const g = await drawPendulum(p, { theta: 0, pivot: { x: 560, y: 170 } });
      await hold(p, g.bob.x - g.r, g.bob.y);
      const f = await fieldNow(p);
      const before = await p.evaluate(() => { const r = window.DynaInkCore.readPendulum(window.__mm.session.getState()); return r && r.pendulums[0] ? r.pendulums[0].theta : null; });
      const n0 = await events(p);
      await pill(p, 'Pull it aside').click();
      await p.waitForTimeout(500);
      const aside = await p.evaluate(() => { const r = window.DynaInkCore.readPendulum(window.__mm.session.getState()); return r && r.pendulums[0] ? r.pendulums[0].theta * 180 / Math.PI : null; });
      const acts = await p.evaluate((n) => new Set(window.__mm.session.getEvents().slice(n).filter((e) => e.type !== 'dismiss' && e.type !== 'deselect').map((e) => e.act)).size, n0);
      // The field a tool leaves open is no act of the tool's: one undo, with it still open, takes the turn back.
      await p.keyboard.press('Control+z');
      await p.waitForTimeout(300);
      const back = await p.evaluate(() => { const r = window.DynaInkCore.readPendulum(window.__mm.session.getState()); return r && r.pendulums[0] ? r.pendulums[0].theta * 180 / Math.PI : null; });
      check(`AL11. a rod drawn plumb (θ ${before === null ? '?' : (before * 180 / Math.PI).toFixed(1)}°) is offered Pull it aside (${f && f.affords.join(' | ')}); taking it turns it to ${aside && aside.toFixed(1)}° in ${acts} act, and one undo puts it back (${back && back.toFixed(1)}°)`,
        f && f.affords.includes('Pull it aside') && aside > 15 && aside < 25 && acts === 1 && Math.abs(back) < 2, { f, before, aside, acts, back });
    } finally { await p.close(); }
  });

  await record('AL12', async () => {
    const types = await page.evaluate(() => window.__mm.session.getEvents().map((e) => e.type));
    // A stroke drawn on a magnet is bound there (`bind`); a hold is a `summon`; a tap away is a `dismiss`: what the hand's own pointer writes.
    const odd = types.filter((t) => !['stroke', 'bind', 'clock', 'select', 'deselect', 'dismiss', 'summon', 'hold', 'teach'].includes(t));
    const moves = types.filter((t) => t === 'move' || t === 'rotate' || t === 'scale' || t === 'transform');
    check(`AL12. the whole run wrote only what the hand did — ${types.length} events, ${types.filter((t) => t === 'clock').length} of them clocks, no move, turn or scale (${moves.length}), nothing else odd (${odd.join(', ') || 'none'})`, moves.length === 0 && odd.length === 0, { types });
  });

  await record('AL13', async () => {
    const second = await open();
    try {
      await second.waitForTimeout(600);
      const keys = await runKeys(second);
      check(`AL13. a second tab on the same board runs nothing until played there (running ${keys.some((k) => k.running)})`, !keys.some((k) => k.running), { keys });
    } finally { await second.close(); }
  });

  await record('AL14', async () => {
    // The trap: a pendulum whose marks were named is an artifact's parts — drawn under one artifact, never turned about its centre.
    const p = await open('/app/?fresh=1&nosw=1');
    try {
      const g = await drawPendulum(p, { pivot: { x: 760, y: 170 } });
      await hold(p, g.bob.x - g.r, g.bob.y);
      await p.locator('#summon input.filter').fill('pendulum');
      await p.waitForTimeout(250);
      await p.locator('#summon .pill.item', { hasText: 'Name it' }).first().click();
      await p.waitForTimeout(500);
      await dismissAll(p);
      const made = await p.evaluate(() => { const s = window.__mm.session.getState(); return { artifacts: s.artifacts.length, content: s.contentIds.length }; });
      await hold(p, g.bob.x - g.r, g.bob.y);
      const f = await fieldNow(p);
      const rod = await p.evaluate(() => { const r = window.DynaInkCore.readPendulum(window.__mm.session.getState()); return r && r.pendulums[0] ? { rod: r.pendulums[0].rod, bob: r.pendulums[0].bob } : null; });
      await pill(p, 'Play the pendulum').click();
      await p.waitForTimeout(700);
      const a = await drawn(p, rod.rod, rod.bob);
      await p.waitForTimeout(160);
      const b = await drawn(p, rod.rod, rod.bob);
      const grab = () => p.evaluate(() => { const c = document.getElementById('canvas'); const d = c.getContext('2d').getImageData(560, 140, 420, 330).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; });
      const seen = new Set();
      for (let i = 0; i < 8; i++) { seen.add(await grab()); await p.waitForTimeout(90); }
      check(`AL14. a pendulum whose marks were named (${made.artifacts} artifact, ${made.content} thing on the board) is offered Play the pendulum when the artifact is held (${f && f.affords.join(' | ')}) and swings inside it: the bob moves ${Math.hypot(a.bob.x - b.bob.x, a.bob.y - b.bob.y).toFixed(1)} px in 160 ms, the pivot stays put (${Math.hypot(a.pivot.x - g.pivot.x, a.pivot.y - g.pivot.y).toFixed(3)} px off), the canvas changes (${seen.size} pictures in 8)`,
        made.artifacts === 1 && f && f.affords.includes('Play the pendulum') && Math.hypot(a.bob.x - b.bob.x, a.bob.y - b.bob.y) > 0.5 && Math.hypot(a.pivot.x - g.pivot.x, a.pivot.y - g.pivot.y) < 0.01 && seen.size >= 4, { made, f, a, b, seen: [...seen] });
      await p.keyboard.press('Escape');
    } finally { await p.close(); }
  });

  try { await page.close(); } catch { /* gone */ }
  return { steps, guards: [guards] };
}
