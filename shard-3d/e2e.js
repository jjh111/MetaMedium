/*
 * shard-3d — the P0 → P4 loop, driven through the real UI.
 *
 * The pattern of Demos/session-engine.e2e.js: a list of steps, each asserting,
 * returning a result object. It drives the SAME pointer path a hand does
 * (`__shard.strokeScreen` dispatches real pointer events on the canvas), so
 * nothing here can pass by calling the engine directly.
 *
 * Run it in the shard's own tab (http://127.0.0.1:5174):
 *
 *     __scenario().then(r => window.__R = r)
 *
 * and read `__R` when it lands. Every shape is stated in the plane's own
 * units and projected to a screen path by `screenFor` — which is exactly what
 * a person aiming at the ground does, and it means the oblique camera has to
 * un-project it correctly for the step to pass.
 */

(function () {
  const S = () => window.__shard;

  const steps = [];
  const step = (name, fn) => steps.push({ name, fn });

  function assert(ok, message) {
    if (!ok) throw new Error(message);
  }

  /** A rectangle in plane units, densified the way a hand leaves a path. */
  function rectPath(x, y, w, h, per = 22) {
    const c = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y },
    ];
    const out = [];
    for (let i = 0; i < c.length - 1; i++) {
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
      }
    }
    out.push(c[0]);
    return out;
  }

  function circlePath(cx, cy, r, n = 72) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      out.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
    }
    return out;
  }

  /** A straight run in plane units, densified the way a hand leaves a path. */
  function linePath(a, b, n = 28) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return out;
  }

  /** Plane points → screen path, under the camera as it stands right now. */
  const onScreen = (uv) => uv.map((p) => S().screenFor(p));

  const stage = () => document.querySelector('canvas.stage');

  /**
   * One wheel event on the canvas, in the shape the DEVICE would send it.
   *
   * A mouse and a trackpad reach the page through the same event and are told
   * apart by its shape, so the only way to test that is to build both shapes —
   * `{ deltaY: 120 }` is a notch, `{ deltaX: 24, deltaY: -1.5 }` is a swipe.
   */
  const spin = (over, at) =>
    stage().dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: 0,
        deltaY: 0,
        deltaMode: 0,
        clientX: at.x,
        clientY: at.y,
        bubbles: true,
        cancelable: true,
        ...over,
      })
    );

  /** One touch frame on the canvas — the real event `scene.ts` listens to. */
  function fingers(type, at) {
    const el = stage();
    const touches = at.map(
      ([x, y], i) => new Touch({ identifier: i, target: el, clientX: x, clientY: y })
    );
    el.dispatchEvent(
      new TouchEvent(type, {
        touches,
        targetTouches: touches,
        changedTouches: touches,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  const apart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  /** Pointer ids for the synthetic fingers, clear of the hook's own. */
  let touchId = 9000;

  const markOf = (id) => S().state().marks.find((m) => m.id === id);

  // ---- UI-2: the panel's summary, read off the panel ------------------------
  // The summary is DOM, not a hook: it is what the hand reads, and asserting on
  // a hook's copy of it would let the two drift. Every row is `k` → `v`.

  function summaryRows() {
    const el = document.querySelector('#panel .summary');
    if (!el) return {};
    const out = {};
    for (const r of el.querySelectorAll('.row')) {
      const k = (r.querySelector('.k') || {}).textContent;
      const v = (r.querySelector('.v') || {}).textContent;
      if (k) out[k.trim()] = (v || '').trim();
    }
    return out;
  }

  /** The whole summary as one string — what stands above the fold. */
  const summaryText = () => {
    const el = document.querySelector('#panel .summary');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  };

  const evidence = () => document.querySelector('#panel details.evidence');

  // ---- UI-3: the panel is hidden by default, and the bar's toggle shows it --
  // Visibility is asserted the way a hand sees it, not off a class: an element
  // whose `offsetParent` is null is not on screen. `panelText()` is deliberately
  // NOT affected — the rows are built and in the DOM either way — which is why
  // every assertion below this line reads the panel without caring.

  const panelToggleEl = () => document.getElementById('panelToggle');
  /**
   * Whether an element actually takes up room on screen. By its own box, NOT
   * by `offsetParent`: the panel, the field and the bar are all `position:
   * fixed`, and a fixed element's `offsetParent` is null by spec whether it is
   * displayed or not — which reads every one of them as hidden.
   */
  const onScreenNow = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const pref = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  };

  /** Wait until a just-said sentence has given the line back to the standing one. */
  function settled(within = 8000) {
    const el = document.getElementById('status');
    const t0 = performance.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (!el.classList.contains('said')) return resolve();
        if (performance.now() - t0 > within) return reject(new Error('the status line never gave the sentence back'));
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  // ---- the steps -----------------------------------------------------------

  let rectId = null;
  let circleId = null;

  step('a clean board', () => {
    S().clear();
    // …and a camera parked where the run assumes it is. Every shape below is
    // stated in a plane's own units and projected through the camera AS IT
    // STANDS, so a run started after somebody had driven the compass by hand
    // would read a circle on an edge-on plane as a dot. The board is not the
    // only state a run begins from.
    S().nav.projection('persp');
    S().view('free');
    assert(S().state().marks.length === 0, 'the board did not clear');
    assert(S().state().camera.projection === 'persp', 'the camera is not in perspective');
    return { marks: 0, camera: S().state().camera.view ?? 'free' };
  });

  // UI-3. This runs on a context nothing has touched, so the preference has
  // never been written — which is exactly the first run the rule is about.
  step('on a fresh board the panel is down and the field is up', () => {
    const panelOn = onScreenNow(document.getElementById('panel'));
    const fieldOn = onScreenNow(document.getElementById('field'));
    assert(!panelOn, 'the panel is on screen on a fresh board');
    assert(fieldOn, 'the field is not on screen — there is no deliberate way to act');
    assert(document.body.classList.contains('panelHidden'), 'the body does not carry the class');
    const t = panelToggleEl();
    assert(t, 'the bar has no *details* toggle');
    assert(/details/.test(t.textContent), `the toggle says "${t.textContent}"`);
    assert(t.getAttribute('aria-expanded') === 'false', 'the toggle does not say it is closed');
    assert(pref('shard.panel') === null, `a preference was written before anyone pressed anything: ${pref('shard.panel')}`);
    // …and the panel still SAYS what it says. Nothing below this line changes.
    assert(typeof S().panelText() === 'string', 'the panel has no text with it hidden');
    return { panelOn, fieldOn, toggle: t.textContent.trim(), pref: pref('shard.panel') };
  });

  step('*details* shows it and hides it again, and remembers each time', () => {
    const t = panelToggleEl();
    t.click();
    const shownNow = onScreenNow(document.getElementById('panel'));
    assert(shownNow, 'the panel did not come up');
    assert(!document.body.classList.contains('panelHidden'), 'the class stayed on the body');
    assert(t.getAttribute('aria-expanded') === 'true', 'the toggle does not say it is open');
    assert(/▾/.test(t.textContent), `the arrow did not turn: "${t.textContent}"`);
    const remembered = pref('shard.panel');
    assert(remembered === 'shown', `the preference says "${remembered}"`);
    // …and the field is still there beside it, which is the whole point of it
    // standing on its own: nothing about it depends on the panel.
    assert(onScreenNow(document.getElementById('field')), 'the field left when the panel arrived');

    t.click();
    assert(!onScreenNow(document.getElementById('panel')), 'the panel did not go back down');
    assert(pref('shard.panel') === 'hidden', `the preference says "${pref('shard.panel')}" after hiding`);
    assert(/▸/.test(t.textContent), `the arrow did not turn back: "${t.textContent}"`);
    return { shownNow, remembered, after: pref('shard.panel') };
  });

  step('choose the foundation', () => {
    S().choose('foundation');
    assert(S().state().chosen === 'foundation', 'the foundation tile did not take');
    return { chosen: S().state().chosen, status: S().state().status };
  });

  step('draw a rectangle on the foundation', () => {
    // Clear of the gizmo, which sits in the +X/+Z corner.
    rectId = S().strokeScreen(onScreen(rectPath(-7, -2, 4, 2.6)));
    assert(rectId, 'no mark was made');
    return { id: rectId };
  });

  step('it reads as a rectangle, as it would on paper', () => {
    const m = markOf(rectId);
    assert(m, 'the mark is not in the state');
    const top = m.readings[0];
    assert(top, 'the shape rung placed nothing');
    assert(top.label === 'rectangle', `top reading was ${top.label}, not rectangle`);
    assert(top.weight >= 0.8, `rectangle ${top.weight.toFixed(2)} — below 0.8`);
    assert(top.reasoning, 'the reading carries no reason');
    return { label: top.label, weight: +top.weight.toFixed(3), reasoning: top.reasoning, readings: m.readings.length };
  });

  step('the panel says the plane, and why', () => {
    const m = markOf(rectId);
    assert(m.plane.name === 'foundation', `the plane was ${m.plane.name}`);
    assert(m.plane.source === 'chosen', `the source was ${m.plane.source}`);
    assert(/tile was held/.test(m.plane.why), `the reason was "${m.plane.why}"`);
    const text = S().panelText();
    assert(/foundation/.test(text), 'the panel does not name the plane');
    assert(/rectangle/.test(text), 'the panel does not carry the reading');
    return { plane: m.plane, scale: +m.scale.toFixed(5), status: S().state().status };
  });

  step('choose the height plane', () => {
    S().choose('height');
    assert(S().state().chosen === 'height', 'the height tile did not take');
    return { chosen: S().state().chosen };
  });

  step('draw a circle on the height plane', () => {
    circleId = S().strokeScreen(onScreen(circlePath(-4, -2.2, 1.4)));
    assert(circleId, 'no mark was made');
    assert(circleId !== rectId, 'the circle came back as the rectangle');
    return { id: circleId };
  });

  step('it reads as a circle, on the height plane', () => {
    const m = markOf(circleId);
    const top = m.readings[0];
    assert(top.label === 'circle', `top reading was ${top.label}, not circle`);
    assert(top.weight >= 0.8, `circle ${top.weight.toFixed(2)} — below 0.8`);
    assert(m.plane.name === 'height', `the plane was ${m.plane.name}`);
    assert(m.plane.source === 'chosen', `the source was ${m.plane.source}`);
    return {
      label: top.label,
      weight: +top.weight.toFixed(3),
      reasoning: top.reasoning,
      plane: m.plane,
      scale: +m.scale.toFixed(5),
    };
  });

  step('the two marks lie on different planes, and each says so', () => {
    const marks = S().state().marks;
    assert(marks.length === 2, `${marks.length} marks, expected 2`);
    const names = marks.map((m) => m.plane.name);
    assert(names.includes('foundation') && names.includes('height'), `planes were ${names.join(', ')}`);
    // Under perspective the two planes are at different depths and angles, so
    // the pen worked at different scales on each. That is the point of logging it.
    return { planes: names, scales: marks.map((m) => +m.scale.toFixed(5)) };
  });

  step('the two of them are a MASSING, and one undo drops it and leaves the ink (P5)', () => {
    // P5, §2.6 rule 1: two profiles on different world planes whose projections
    // overlap ARE a solid, and tier 1 stands it up the moment the second one
    // lands. P0's rectangle on the foundation and circle on the height plane
    // are exactly that, so the board carries a solid before the undo does.
    assert(S().state().solids.length === 1, `${S().state().solids.length} solids, expected the massing`);
    S().undo();
    assert(S().state().solids.length === 0, 'the undo did not take the massing');
    assert(S().state().marks.length === 2, 'the undo took the ink with it — ink is never covered');
    return { left: 2, massing: 'gone' };
  });

  step('undo drops the circle, and the plane held with it', () => {
    S().undo();
    const marks = S().state().marks;
    assert(marks.length === 1, `${marks.length} marks after one undo, expected 1`);
    assert(marks[0].plane.name === 'foundation', 'the wrong mark survived');
    return { left: marks.length, plane: marks[0].plane.name };
  });

  step('undo again and the board is empty', () => {
    S().undo();
    assert(S().state().marks.length === 0, 'the board is not empty');
    return { marks: 0 };
  });

  // ===== P2 — the form rung, and solids ====================================
  // "Rectangle + a line up from its edge → a box, instantly, attributed to the
  // engine; profile + axis → a revolve; undo removes the solid and leaves the
  // ink." Every stroke goes through the same pointer path as above.

  let baseId = null;
  let extentId = null;
  const DEPTH = 2.4; // the extent's world length, in plane units

  step('a clean board for the solids', () => {
    S().clear();
    assert(S().state().solids.length === 0, 'a solid survived the clear');
    return { marks: 0, solids: 0 };
  });

  step('draw a rectangle on the foundation — it PLAYS a profile', () => {
    S().choose('foundation');
    baseId = S().strokeScreen(onScreen(rectPath(-7, -2, 4, 2.6)));
    assert(baseId, 'no mark was made');
    const m = markOf(baseId);
    assert(m.readings[0].label === 'rectangle', `it read as ${m.readings[0].label}`);
    assert(m.plays, 'the form rung placed nothing');
    assert(m.plays.role === 'profile', `it plays ${m.plays.role}, not profile`);
    assert(m.plays.rule === 2, `row ${m.plays.rule} placed it, not row 2`);
    assert(/the face a solid grows from/.test(m.plays.reasoning), `the reason was "${m.plays.reasoning}"`);
    return { id: baseId, plays: m.plays.role, rule: m.plays.rule, reasoning: m.plays.reasoning };
  });

  step('the field will not guess a depth — extrude says what is missing', () => {
    S().select(baseId);
    const r = S().fieldRead('extrude');
    assert(!r.enabled, 'extrude was offered with no extent drawn');
    assert(/draw a line/.test(r.line), `the reading line said "${r.line}"`);
    return { line: r.line, enabled: r.enabled };
  });

  step('draw a line up from its near edge — a box stands, at tier 1', () => {
    S().choose('height');
    // On the height plane +v runs DOWN, so (-7, -2.4) is world (-7, 2.4, 0):
    // straight up from the rectangle's left edge, which lies at world x = -7.
    extentId = S().strokeScreen(onScreen(linePath({ x: -7, y: 0 }, { x: -7, y: -DEPTH })));
    assert(extentId, 'no mark was made');
    const m = markOf(extentId);
    assert(m.plays.role === 'extent', `it plays ${m.plays.role}, not extent`);
    assert(m.plays.rule === 4, `row ${m.plays.rule} placed it, not row 4`);
    assert(m.plays.targets.includes(baseId), 'the extent does not name the profile');

    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    const solid = solids[0];
    assert(solid.steps.length === 1, `${solid.steps.length} steps, expected 1`);
    assert(solid.steps[0].op === 'extrude', `the step is ${solid.steps[0].op}`);
    assert(
      solid.steps[0].from.includes(baseId) && solid.steps[0].from.includes(extentId),
      'the step does not reference both strokes'
    );
    assert(/^participant:tier0$/.test(solid.author), `the tree is attributed to ${solid.author}, not the engine`);
    const err = Math.abs(Math.abs(solid.steps[0].depth) - DEPTH) / DEPTH;
    assert(err < 0.1, `depth ${solid.steps[0].depth} is ${(err * 100).toFixed(1)}% off the line's ${DEPTH}`);
    assert(solid.steps[0].depth > 0, 'the box grew the wrong way down the normal');

    const status = S().state().status;
    assert(/tier 1/.test(status), `the status said "${status}"`);
    assert(/box/.test(status), `the status said "${status}" — it does not name what was made`);
    return {
      solid: solid.id,
      name: solid.name,
      author: solid.author,
      depth: solid.steps[0].depth,
      error: +(err * 100).toFixed(2),
      status,
      plays: m.plays.role,
    };
  });

  step('the box is selected, and the panel says the solid and its step', () => {
    const sel = S().state().selection;
    assert(sel && sel.kind === 'solid', `the selection is ${JSON.stringify(sel)}`);
    const text = S().panelText();
    assert(/solid/.test(text), 'the panel has no solid row');
    assert(/extrude/.test(text), 'the panel does not name the step');
    assert(/tier 1/.test(text), 'the panel does not say which tier made it');
    return { selection: sel, panel: text.replace(/\s+/g, ' ').slice(0, 220) };
  });

  // UI-2: the panel leads with the THING, and the engine-only path never claims
  // a model call. This box was made at tier 1 with nobody seated, so *from*
  // must say the engine made it and must not contain the word *proposed*.
  step('the summary leads: what it is, where it came from, what Enter does — and no model is claimed', () => {
    const rows = summaryRows();
    assert(Object.keys(rows).length, 'there is no summary above the evidence');
    assert(rows.what, 'the summary does not say what is selected');
    assert(/^box|^solid|plinth|extrude/i.test(rows.what) || rows.what.length > 0, `what said "${rows.what}"`);
    assert(rows.from === 'made by the engine at tier 1', `from said "${rows.from}"`);
    assert(/^↵ /.test(rows.next || ''), `next said "${rows.next}"`);
    assert(/→/.test(rows.becomes || ''), `becomes said "${rows.becomes}"`);
    // The bug in one line: *proposed* is a claim about a call that was made.
    // Saying no model was asked is the opposite claim, and it is the true one.
    assert(!/proposed/i.test(summaryText()), `the engine-only path claims a proposal: "${summaryText()}"`);
    assert(/no model was asked/.test(summaryText()), 'it does not say the canvas answered by itself');

    // …and the evidence is all still here, one disclosure down and shut.
    const ev = evidence();
    assert(ev, 'there is no evidence disclosure');
    assert(ev.open === false, 'the evidence is open by default — the first screenful is telemetry again');
    assert(/why \/ measurements/i.test(ev.querySelector('summary').textContent), 'the disclosure is not named');
    const body = ev.querySelector('.evidenceBody').textContent;
    for (const word of ['plane', 'reading', 'measured', 'extent', 'solid']) {
      assert(new RegExp(word, 'i').test(body), `the evidence lost its ${word} row`);
    }
    // The summary comes FIRST in the panel, not after a screenful of numbers.
    const panel = S().panelText();
    assert(panel.indexOf(rows.what) < panel.indexOf('points'), 'the mark telemetry still stands above the summary');
    return { rows, evidenceOpen: ev.open, evidenceChars: body.length };
  });

  // UI-3: and with the panel down, selecting says the two things that matter in
  // the place that is left. Selecting must NOT pop the panel open — that would
  // be the card coming back uninvited, which is the thing being fixed.
  step('with the panel down, the status line carries the selection and its next act', () => {
    assert(!onScreenNow(document.getElementById('panel')), 'the panel is up — this step proves nothing');
    const rows = summaryRows();
    const solid = S().state().solids[0];

    // Re-select through the real door, as a tap does.
    S().select(solid.id);
    assert(!onScreenNow(document.getElementById('panel')), 'selecting popped the panel open');

    // `say` wins the line for a few seconds after an act; the STANDING line is
    // what is being asserted, so wait out the fade rather than race it.
    return settled().then(() => {
      const el = document.getElementById('status');
      const line = el.textContent;
      const name = rows.what.replace(/\s+[\d.]+$/, '');
      assert(line.includes(name), `the status line does not name the selection: "${line}" (want "${name}")`);
      assert(/↵|not yet/.test(line), `the status line does not say what the next act is: "${line}"`);
      // The same act the field is offering — one sentence, two places, and no
      // disagreement between them.
      const offered = S().fieldRead('');
      const verb = (offered.line.match(/↵ ([^—]+)/) || [])[1];
      if (verb) {
        assert(
          line.includes(verb.trim()),
          `the status line says a different act from the field: "${line}" vs "${offered.line}"`
        );
      }
      return { line, name, field: offered.line };
    });
  });

  step('the ink is still on the board, on the face', () => {
    const ids = S().state().marks.map((m) => m.id);
    assert(ids.includes(baseId), 'the profile ink is gone');
    assert(ids.includes(extentId), 'the extent ink is gone');
    return { marks: ids.length };
  });

  step('name it in the field — the name is the hand\'s, over the engine\'s word', () => {
    const before = S().state().solids[0];
    assert(before.named === 'engine', `it was already named by ${before.named}`);
    const r = S().field('name: plinth');
    assert(r.ran, `Enter did nothing: "${r.line}"`);
    const after = S().state().solids[0];
    assert(after.name === 'plinth', `it is called ${after.name}`);
    assert(after.named === 'human', `it is named by ${after.named}`);
    return { line: r.line, name: after.name, named: after.named };
  });

  // ACT-1 (the director review, 15 September 2026): the name is an act of its
  // own, so it takes the first undo and the solid takes the second. This step
  // used to press undo ONCE and find the solid gone — the walk it did then ate
  // the name and the solid's tree together, and left the bless behind them:
  // an artifact standing in the log with no tree, which is not a board anyone
  // asked for. Undo taking MORE than one act is the same defect as taking less.
  step('undo takes the name back; undo again removes the solid and leaves both strokes', () => {
    S().undo();
    const named = S().state().solids;
    assert(named.length === 1, `${named.length} solids after the first undo — it took the solid as well as the name`);
    assert(named[0].named === 'engine', `it is still named by ${named[0].named} — the name did not come off`);

    S().undo();
    assert(S().state().solids.length === 0, 'the solid survived the undo');
    const ids = S().state().marks.map((m) => m.id);
    assert(ids.length === 2, `${ids.length} marks left, expected 2`);
    assert(ids.includes(baseId) && ids.includes(extentId), 'the wrong marks survived');
    const status = S().state().status;
    return { marks: ids.length, solids: 0, name: named[0].name, status };
  });

  step('a closed profile and a line beside it, on one plane → a revolve', () => {
    S().choose('height');
    const discId = S().strokeScreen(onScreen(circlePath(2, -2, 0.8)));
    assert(discId, 'no profile was made');
    const axisId = S().strokeScreen(onScreen(linePath({ x: 4, y: -0.4 }, { x: 4, y: -3.6 })));
    assert(axisId, 'no axis was made');
    const axis = markOf(axisId);
    assert(axis.plays.role === 'axis', `it plays ${axis.plays.role}, not axis`);
    assert(axis.plays.rule === 5, `row ${axis.plays.rule} placed it, not row 5`);
    assert(axis.plays.targets.includes(discId), 'the axis does not name the profile');

    const solid = S().state().solids.find((s) => s.steps[0].op === 'revolve');
    assert(solid, 'no revolve stands');
    assert(solid.steps[0].from.includes(discId) && solid.steps[0].from.includes(axisId), 'the step does not reference both strokes');
    assert(Math.abs(solid.steps[0].sweep - Math.PI * 2) < 1e-3, `it sweeps ${solid.steps[0].sweep}`);
    assert(/^participant:tier0$/.test(solid.author), `attributed to ${solid.author}`);
    const status = S().state().status;
    assert(/tier 1/.test(status), `the status said "${status}"`);
    return {
      solid: solid.id,
      name: solid.name,
      author: solid.author,
      sweep: +solid.steps[0].sweep.toFixed(4),
      status,
      plays: axis.plays.role,
      reasoning: axis.plays.reasoning,
    };
  });

  step('the board holds a revolve, four marks, and the ink of both', () => {
    const s = S().state();
    assert(s.solids.length === 1, `${s.solids.length} solids`);
    assert(s.marks.length === 4, `${s.marks.length} marks, expected 4`);
    return { solids: s.solids.length, marks: s.marks.length };
  });


  // ===== P1 — the planarity read ===========================================
  // "With nothing chosen, a stroke on a box's top reads `face` over `view`
  // with a reason; a stroke beside it reads `view`; a chip flips it and undo
  // drops it." Everything below goes through the same pointer path: the only
  // new hook is `screenForWorld`, because a face the hand did not choose has
  // no plane to state a shape in until the pen is down.

  let p1Box = null;
  let onFaceId = null;
  let besideId = null;
  const BOX = { x0: -7, x1: -3, z0: -2, z1: 0.6, top: 2.4 };

  /** A loop of world points, densified the way a hand leaves a path. */
  function worldLoop(corners, per = 22) {
    const out = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
      }
    }
    out.push(corners[0]);
    return out;
  }

  /** A circle drawn ON SCREEN, around a world point — what a hand beside a thing leaves. */
  function screenRing(world, r, n = 64) {
    const c = S().screenForWorld(world);
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r };
    });
  }

  step('a box to read a plane off', () => {
    S().clear();
    S().view('free');
    S().choose('foundation');
    const base = S().strokeScreen(onScreen(rectPath(BOX.x0, BOX.z0, BOX.x1 - BOX.x0, BOX.z1 - BOX.z0)));
    assert(base, 'no profile was made');
    S().choose('height');
    const ext = S().strokeScreen(onScreen(linePath({ x: BOX.x0, y: 0 }, { x: BOX.x0, y: -BOX.top })));
    assert(ext, 'no extent was made');
    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    p1Box = solids[0].id;
    return { solid: p1Box, depth: solids[0].steps[0].depth };
  });

  step('un-choose — from here the plane is READ', () => {
    S().choose(null);
    assert(S().state().chosen === null, 'the tile did not let go');
    return { chosen: S().state().chosen, status: S().state().status };
  });

  step('a rectangle over the box’s top reads `face`, over `view`, with a reason', () => {
    const y = BOX.top;
    onFaceId = S().strokeScreen(
      worldLoop([
        { x: BOX.x0 + 0.7, y, z: BOX.z0 + 0.6 },
        { x: BOX.x1 - 0.7, y, z: BOX.z0 + 0.6 },
        { x: BOX.x1 - 0.7, y, z: BOX.z1 - 0.6 },
        { x: BOX.x0 + 0.7, y, z: BOX.z1 - 0.6 },
      ]).map((w) => S().screenForWorld(w))
    );
    assert(onFaceId, 'no mark was made');
    const m = markOf(onFaceId);
    assert(m.plane.source === 'face', `the plane was read as ${m.plane.source}, not face`);
    assert(/top of /.test(m.plane.name || ''), `the plane is called "${m.plane.name}"`);
    assert((m.plane.name || '').includes(p1Box), `the face does not name the artifact: "${m.plane.name}"`);
    const cs = m.candidates;
    assert(cs && cs.length >= 2, 'the reading is not plural');
    assert(cs[0].source === 'face', `the winner is ${cs[0].source}`);
    assert(cs[0].confidence > cs[1].confidence, 'the winner does not lead the runner-up');
    assert(/reads rectangle 0\.\d\d there/.test(cs[0].reasoning), `the reason was "${cs[0].reasoning}"`);
    // The runner-up is the VIEW plane: the horizontal plane through the point
    // the pen came down on IS the top face, so it is offered once, as the face
    // — and what is left is the plane facing the eye.
    assert(cs[1].label === 'view', `the runner-up is ${cs[1].label}, not view`);
    assert(cs[1].confidence > 0, 'the view plane was not scored');
    assert(/reads /.test(cs[1].reasoning), `the view candidate carries no reason: "${cs[1].reasoning}"`);
    assert(cs.every((c) => c.confidence <= cs[0].confidence), 'something outranks the winner');
    assert(!cs[0].oblique, 'a candidate too oblique to read won');
    const chip = S().chipFor(onFaceId);
    assert(chip && /·/.test(chip), `no runner-up chip stands beside it: ${chip}`);
    const text = S().panelText();
    assert(/read against/.test(text), 'the panel does not list the candidates');
    assert(/view/.test(text), 'the panel does not carry the runner-up');
    return {
      plane: m.plane.name,
      source: m.plane.source,
      chip,
      candidates: cs.map((c) => ({ label: c.label, n: +c.confidence.toFixed(3), why: c.reasoning })),
    };
  });

  step('a stroke beside the box reads `view`, and is held with a pose', () => {
    besideId = S().strokeScreen(screenRing({ x: 3, y: 1.4, z: 0 }, 70));
    assert(besideId, 'no mark was made');
    const m = markOf(besideId);
    assert(m.plane.source === 'view', `the plane was read as ${m.plane.source}, not view`);
    assert(m.pose, 'the view ink kept no pose');
    assert(m.opacity === 1, `view ink is drawn at ${m.opacity} — it should be opaque like any other mark`);
    // The plane passes through the CURSOR, which has not been moved, so it
    // stands at the world origin — not at the depth of anything under the pen.
    const c = S().cursor();
    assert(c.at.x === 0 && c.at.y === 0 && c.at.z === 0, `the cursor is at ${JSON.stringify(c.at)}`);
    assert(
      m.plane.origin.x === 0 && m.plane.origin.y === 0 && m.plane.origin.z === 0,
      `the view plane passes through ${JSON.stringify(m.plane.origin)}, not the cursor`
    );
    assert(/through the cursor/.test(m.plane.why), `the plane's reason was "${m.plane.why}"`);
    const pinned = S().pinned();
    assert(pinned.length === 1, `${pinned.length} pinned views, expected 1`);
    assert(pinned[0].count === 1, `the pinned view holds ${pinned[0].count} strokes`);
    const status = S().state().status;
    assert(/view · through the cursor/.test(status), `the status said "${status}"`);
    return { source: m.plane.source, why: m.plane.why, cursor: c.at, pinned, status, top: m.readings[0] && m.readings[0].label };
  });

  step('the chip flips the first stroke to its runner-up, and one undo puts it back', () => {
    const before = markOf(onFaceId);
    const runnerUp = before.candidates[1];
    const flipped = S().flipPlane(onFaceId);
    assert(flipped, 'the flip did nothing');
    const m = markOf(flipped);
    assert(m.plane.source !== 'face', 'it flipped to the plane it was already on');
    assert(m.plane.source === runnerUp.source, `it flipped to ${m.plane.source}, not the runner-up's ${runnerUp.source}`);
    assert(m.flippedFrom === onFaceId, `it says it came from ${m.flippedFrom}`);
    assert(S().state().marks.length === 4, `${S().state().marks.length} marks — the first should be gone, not doubled`);
    assert(S().state().solids.length === 1, 'the flip disturbed the solid');
    // The way back is the flipped mark's own first candidate.
    assert(m.candidates[0].label === runnerUp.label, 'the flipped mark does not offer the way back');

    S().undo();
    const back = markOf(onFaceId);
    assert(back, 'the first mark did not come back');
    assert(back.plane.source === 'face', `it came back as ${back.plane.source}`);
    assert(S().state().marks.length === 4, `${S().state().marks.length} marks after the undo, expected 4`);
    assert(S().state().solids.length === 1, 'the undo took the solid too');
    return { from: before.plane.name, to: m.plane.name, runnerUp: runnerUp.label, restored: back.plane.name };
  });

  step('any candidate can be taken — flip it onto the VIEW plane, and back', () => {
    const before = markOf(onFaceId);
    const which = before.candidates.findIndex((c) => c.label === 'view');
    assert(which > 0, 'the view plane is not among the candidates to take');
    const flipped = S().flipPlane(onFaceId, which);
    assert(flipped, 'the flip did nothing');
    const m = markOf(flipped);
    assert(m.plane.source === 'view', `it flipped to ${m.plane.source}, not view`);
    assert(m.pose, 'the ink is on a view plane and kept no pose');
    assert(S().pinned().length >= 1, 'the flipped view ink is not pinned to a view');

    S().undo();
    const back = markOf(onFaceId);
    assert(back && back.plane.source === 'face', `it came back as ${back && back.plane.source}`);
    return { to: m.plane.name, source: m.plane.source, restored: back.plane.source, pinned: S().pinned() };
  });

  step('orbit away and the view ink is UNCHANGED — world geometry, seen edge-on', () => {
    // John, 16 September 2026, with two Blender screenshots of the Annotation
    // tool placed on the 3D cursor: a circle drawn in a free three-quarter
    // view, seen from away, is a thin ellipse — *fully drawn, opaque*. It does
    // not follow the camera and it does not fade. What used to be asserted
    // here is the opposite, and this is what went in its place.
    const before = markOf(besideId);
    const beforeWorld = JSON.stringify(S().worldPointsOf(besideId));
    const beforeCam = S().state().camera.forward;
    // How thin the stroke is ON SCREEN: 1 is a circle, small is edge-on.
    const thinness = () => {
      const pts = S().worldPointsOf(besideId).map((w) => S().screenForWorld(w));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const q of pts) {
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
      }
      const w = maxX - minX, h = maxY - minY;
      return Math.min(w, h) / Math.max(w, h);
    };
    const roundThin = thinness();
    assert(roundThin > 0.9, `it is ${roundThin.toFixed(3)} thin from its own view — it should be a circle`);

    // Go and look at it from the SIDE. An orbit by hand is a poor way to get
    // across this plane — a turn about Y is much less than that much turn of
    // LOOK direction from a camera this high (1.1 rad left the circle 0.88
    // round) and far enough round it comes back to facing you (2.3 rad: 0.97).
    // A canonical view is one deliberate act and lands square across it.
    S().view('side');
    const away = markOf(besideId);
    // 1 · it is not drawn any differently.
    assert(
      away.opacity === before.opacity,
      `the ink changed opacity with the camera: ${before.opacity} → ${away.opacity}`
    );
    assert(away.opacity === 1, `view ink is drawn at ${away.opacity} from another angle, not opaque`);
    // 2 · and it has not moved in the world.
    assert(
      JSON.stringify(S().worldPointsOf(besideId)) === beforeWorld,
      'the stroke moved in the world when the camera did — it is not world geometry'
    );
    // 3 · what DID change is only where you are standing: it is edge-on now.
    const thin = thinness();
    assert(thin < 0.8, `from away it is still ${thin.toFixed(3)} thin — the plane is following the camera`);
    // The face ink is not view ink, and was never touched by the camera either.
    assert(markOf(onFaceId).opacity === 1 || markOf(onFaceId).opacity === 0.3,
      `ink on a face is drawn at ${markOf(onFaceId).opacity}`);

    // The pinned view is a BOOKMARK, not a visibility rule: it brings the
    // CAMERA back, and the ink is exactly what it already was.
    S().goToPinned(0);
    const cam = S().state().camera.forward;
    const dotp = cam.x * beforeCam.x + cam.y * beforeCam.y + cam.z * beforeCam.z;
    const deg = (Math.acos(Math.max(-1, Math.min(1, dotp))) * 180) / Math.PI;
    assert(deg < 2, `the bookmark left the camera ${deg.toFixed(1)}° off the view the ink was drawn in`);
    const home = markOf(besideId);
    assert(home.opacity === before.opacity, `coming back changed the ink to ${home.opacity}`);
    assert(JSON.stringify(S().worldPointsOf(besideId)) === beforeWorld, 'the bookmark moved the ink');
    assert(thinness() > 0.9, 'back at its own view it is not a circle again');
    return { opacity: away.opacity, thinFromItsOwnView: +roundThin.toFixed(3), thinFromAway: +thin.toFixed(3), cameraBackWithin: +deg.toFixed(2) };
  });

  step('the board still holds the box, its ink, and both read marks', () => {
    const s = S().state();
    assert(s.solids.length === 1, `${s.solids.length} solids`);
    assert(s.marks.length === 4, `${s.marks.length} marks, expected 4`);
    const sources = s.marks.map((m) => m.plane.source);
    assert(sources.filter((x) => x === 'chosen').length === 2, `chosen: ${sources.join(', ')}`);
    assert(sources.includes('face') && sources.includes('view'), `sources were ${sources.join(', ')}`);
    return { solids: s.solids.length, marks: s.marks.length, sources };
  });

  step('shift + click puts the cursor on the box’s top; the next view stroke passes through it', () => {
    // Blender's gesture, in the shard's terms. The cursor is the plane
    // picker's own origin, it is runtime (never a log event), and it is the
    // one thing that decides where an unchosen stroke lands.
    const started = S().cursor();
    assert(
      started.at.x === 0 && started.at.y === 0 && started.at.z === 0,
      `the cursor did not start at the world origin: ${JSON.stringify(started.at)}`
    );
    const marksBefore = S().state().marks.length;

    const onTop = S().screenForWorld({ x: (BOX.x0 + BOX.x1) / 2, y: BOX.top, z: (BOX.z0 + BOX.z1) / 2 });
    const got = S().shiftTap(onTop);
    assert(Math.abs(got.at.y - BOX.top) < 0.01, `the cursor landed at y=${got.at.y}, not on the top face at ${BOX.top}`);
    assert(/artifact/.test(got.why), `the cursor does not say what it landed on: "${got.why}"`);
    assert(/cursor placed/.test(S().state().status), `the status said "${S().state().status}"`);
    assert(S().state().marks.length === marksBefore, 'shift + click left a mark — it is a placement, not ink');

    // …and now the view plane stands on that face's depth. Drawn in clear air
    // well away from every other mark — no face under the pen, and far enough
    // from the last stroke that `previous` has no claim on it either (it is
    // near within 1.5 of that stroke's own size, and a circle one world unit
    // above it is well inside that).
    const vp = S().viewport();
    const clear = { x: vp.left + vp.width * 0.86, y: vp.top + vp.height * 0.18 };
    const id = S().strokeScreen(
      Array.from({ length: 49 }, (_, i) => {
        const t = (i / 48) * Math.PI * 2;
        return { x: clear.x + Math.cos(t) * 46, y: clear.y + Math.sin(t) * 46 };
      })
    );
    assert(id, 'no mark was made');
    const m = markOf(id);
    assert(m.plane.source === 'view', `the plane was read as ${m.plane.source}, not view`);
    assert(
      Math.abs(m.plane.origin.y - BOX.top) < 0.01,
      `the view plane passes through y=${m.plane.origin.y}, not the cursor at ${BOX.top}`
    );
    assert(/through the cursor/.test(m.plane.why), `the plane's reason was "${m.plane.why}"`);
    S().undo();
    assert(S().state().marks.length === marksBefore, 'the undo did not take the stroke back');
    return { cursor: got.at, why: got.why, planeOrigin: m.plane.origin };
  });

  step('off the main axis, a circle keeps the shape it was drawn — and the ground says what it would have cost', () => {
    // John, 16 September 2026: *"drawings off the main axis are on the camera
    // plane mapped rather than the way it is stretching the shapes out now;
    // the shapes drawn off main axes should stay conserved size at the angles
    // that make sense."* The circle here is drawn as a SCREEN path, which is
    // what a hand leaves; the question is only what it becomes.
    //
    // Its own board, and a box built the way P2 builds one: the marks before it
    // are on CHOSEN planes, so the read is about where this stroke lands and
    // not about an argument the last stroke left standing.
    const aspect = (b) => (b.maxX - b.minX) / (b.maxY - b.minY);
    S().clear();
    S().view('free');
    S().choose('foundation');
    assert(S().strokeScreen(onScreen(rectPath(BOX.x0, BOX.z0, BOX.x1 - BOX.x0, BOX.z1 - BOX.z0))), 'no profile was made');
    S().choose('height');
    assert(S().strokeScreen(onScreen(linePath({ x: BOX.x0, y: 0 }, { x: BOX.x0, y: -BOX.top }))), 'no extent was made');
    S().choose(null);
    assert(S().state().solids.length === 1, 'the box did not stand');
    const vp = S().viewport();
    const ring = () => {
      const cx = vp.left + vp.width * 0.62;
      const cy = vp.top + vp.height * 0.45;
      return Array.from({ length: 65 }, (_, i) => {
        const t = (i / 64) * Math.PI * 2;
        return { x: cx + Math.cos(t) * 90, y: cy + Math.sin(t) * 90 };
      });
    };

    // 1 · the view the shard opens on. The ground is 0.84 face-on here — inside
    // the gate — so it is a fair candidate and simply loses on the evidence.
    S().view('free');
    const home = S().strokeScreen(ring());
    assert(home, 'no mark was made');
    const hm = markOf(home);
    assert(hm.plane.source === 'view', `the plane was read as ${hm.plane.source}, not view`);
    // …through the CURSOR, which `clear()` put back at the world origin.
    assert(
      hm.plane.origin.x === 0 && hm.plane.origin.y === 0 && hm.plane.origin.z === 0,
      `the view plane passes through ${JSON.stringify(hm.plane.origin)}, not the cursor`
    );
    const homeAspect = aspect(hm.bounds);
    assert(Math.abs(homeAspect - 1) < 0.01, `the circle came back ${homeAspect.toFixed(3)} : 1 in its own plane`);
    const ground = hm.candidates.find((c) => c.label === 'foundation');
    assert(ground, `the ground was not offered: ${hm.candidates.map((c) => c.label).join(', ')}`);
    assert(!ground.gated, `the ground is gated at ${ground.facing.toFixed(2)} face-on from the default view`);
    S().undo();

    // 2 · orbit down to a real three-quarter angle and draw the same circle.
    // The ground is now too oblique to TAKE it: casting the path there would
    // stretch it, so the view plane keeps it at the size it was drawn.
    S().orbit(0, -0.15);
    const id = S().strokeScreen(ring());
    assert(id, 'no mark was made off-axis');
    const m = markOf(id);
    assert(m.plane.source === 'view', `the plane was read as ${m.plane.source}, not view`);
    const planeAspect = aspect(m.bounds);
    assert(
      Math.abs(planeAspect - 1) < 0.01,
      `the circle is ${planeAspect.toFixed(3)} : 1 in its own plane — it was stretched, not conserved`
    );
    assert(/shape conserved/.test(m.candidates[0].reasoning), `the winner's reason was "${m.candidates[0].reasoning}"`);

    // The ground is held, said out loud, and below the view whatever it scored.
    const gated = m.candidates.find((c) => c.label === 'foundation');
    assert(gated, `the ground was not offered: ${m.candidates.map((c) => c.label).join(', ')}`);
    assert(gated.gated === true, `the ground was not gated at ${gated.facing.toFixed(2)} face-on`);
    assert(gated.facing < 0.8, `the ground is ${gated.facing.toFixed(2)} face-on — not off-axis at all`);
    assert(!gated.oblique, 'the ground was called unreadable, not merely too oblique to take the stroke');
    assert(
      /too oblique to take the stroke \(facing 0\.\d\d/.test(gated.reasoning),
      `the ground's reason was "${gated.reasoning}"`
    );
    assert(/stretch it by up to ×1\.\d\d/.test(gated.reasoning), `it does not say what it would cost: "${gated.reasoning}"`);
    assert(m.candidates.indexOf(gated) > 0, 'a gated plane outranked the view');
    assert(
      m.candidates.every((c) => !c.gated || m.candidates.indexOf(c) > 0),
      'a gated candidate is at the top of the reading'
    );

    // …and it is still one act away: the chip offers it, and the panel says why.
    const chip = S().chipFor(id);
    assert(chip && /foundation/.test(chip), `the chip does not offer the ground: "${chip}"`);
    const text = S().panelText();
    assert(/shape conserved/.test(text), 'the panel does not say the view plane conserved the shape');
    assert(/too oblique to take the stroke/.test(text), 'the panel does not say why the ground could not have it');

    // The flip is the hand overruling the gate — one act, and it lands.
    const which = m.candidates.indexOf(gated);
    const flipped = S().flipPlane(id, which);
    assert(flipped, 'the ground could not be taken');
    const after = markOf(flipped);
    assert(after.plane.name === 'foundation', `it flipped to ${after.plane.name}`);
    // …and there, plainly, is what the gate is about: on the ground the same
    // screen path is no longer a circle. (It runs long in v, the direction
    // going away from the camera, so the ratio falls below 1 rather than above.)
    const stretched = aspect(after.bounds);
    assert(
      Math.abs(stretched - 1) > 0.1,
      `taken onto the ground the circle is ${stretched.toFixed(3)} : 1 — no stretch, so there was nothing to gate`
    );
    S().undo();
    S().undo();

    return {
      home: { aspect: +homeAspect.toFixed(4), ground: `${ground.label} f${ground.facing.toFixed(2)}` },
      offAxis: {
        plane: m.plane.source,
        aspect: +planeAspect.toFixed(4),
        chip,
        onTheGround: +stretched.toFixed(3),
        candidates: m.candidates.map((c) => `${c.label} ${c.confidence.toFixed(2)} f${c.facing.toFixed(2)}${c.gated ? ' gated' : ''}`),
      },
    };
  });

  step('an extent drawn with nothing chosen is ambiguous, and the chip settles it', () => {
    // The honest case, and the one §10's first risk is about: a straight screen
    // stroke reads `line 0.9` on EVERY plane, so the shape rung — the strongest
    // term — cannot tell "going away along the ground" from "rising". The
    // ground wins on continuity (the profile was drawn there a moment ago) and
    // on being more face-on, the read says so with its number, and the runner-up
    // chip is what settles it. Taking `height` makes the mark an extent and the
    // box stands at tier 1, which is P2 working on a READ plane.
    S().clear();
    S().view('free');
    S().choose('foundation');
    const prof = S().strokeScreen(onScreen(rectPath(-5, -1.6, 4, 2.8)));
    assert(prof, 'no profile was made');
    S().choose(null);
    const world = (a, b, n = 28) =>
      Array.from({ length: n + 1 }, (_, i) => ({
        x: a.x + ((b.x - a.x) * i) / n,
        y: a.y + ((b.y - a.y) * i) / n,
        z: a.z + ((b.z - a.z) * i) / n,
      }));
    const rise = S().strokeScreen(
      world({ x: -5, y: 0, z: -1.6 }, { x: -5, y: 2.4, z: -1.6 }).map((w) => S().screenForWorld(w))
    );
    assert(rise, 'no mark was made');
    const read = markOf(rise);
    assert(S().state().solids.length === 0, 'a solid stood on a plane nobody settled');
    const which = read.candidates.findIndex((c) => c.label === 'height');
    assert(which > 0, `the height plane is not among the candidates: ${read.candidates.map((c) => c.label).join(', ')}`);

    const flipped = S().flipPlane(rise, which);
    assert(flipped, 'the flip did nothing');
    const after = markOf(flipped);
    assert(after.plane.name === 'height', `it flipped to ${after.plane.name}`);
    assert(after.plays.role === 'extent', `on the height plane it plays ${after.plays.role}, not extent`);
    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids after the flip, expected 1`);
    assert(solids[0].steps[0].op === 'extrude', `the step is ${solids[0].steps[0].op}`);
    assert(Math.abs(solids[0].steps[0].depth - 2.4) < 0.24, `depth ${solids[0].steps[0].depth}`);
    assert(/tier 1/.test(S().state().status), `the status said "${S().state().status}"`);
    return {
      readAs: read.plane.name,
      readSource: read.plane.source,
      why: read.plane.why,
      candidates: read.candidates.map((c) => `${c.label} ${c.confidence.toFixed(2)}`),
      afterFlip: { plane: after.plane.name, plays: after.plays.role, solid: solids[0].name, depth: solids[0].steps[0].depth },
    };
  });

  // ===== P3 — features, cuts and the rest of tier 1 =========================
  // "A circle on the box's top → *Cut a hole* / *Raise a boss*, both tier 1; a
  // scratch across a solid erases it (three crossings of its silhouette)."
  // The box is built exactly as P2 builds it; everything after is drawn with
  // nothing chosen, so the face is READ (P1) and the feature is a feature
  // because of where the pen landed, not because anything was declared.

  let p3Box = null;
  let featureId = null;
  const P3 = { x0: -7, x1: -3, z0: -2, z1: 0.6, top: 2.4 };

  /** The centre of the box's top, in world. */
  const topCentre = () => ({ x: (P3.x0 + P3.x1) / 2, y: P3.top, z: (P3.z0 + P3.z1) / 2 });

  /** A ring of world points on the top face, drawn as a screen path. */
  function faceRing(r, n = 56) {
    const c = topCentre();
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return S().screenForWorld({ x: c.x + Math.cos(t) * r, y: c.y, z: c.z + Math.sin(t) * r * 0.6 });
    });
  }

  step('a box to cut into', () => {
    S().clear();
    S().view('free');
    S().choose('foundation');
    const base = S().strokeScreen(onScreen(rectPath(P3.x0, P3.z0, P3.x1 - P3.x0, P3.z1 - P3.z0)));
    assert(base, 'no profile was made');
    S().choose('height');
    const ext = S().strokeScreen(onScreen(linePath({ x: P3.x0, y: 0 }, { x: P3.x0, y: -P3.top })));
    assert(ext, 'no extent was made');
    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    p3Box = solids[0].id;
    S().choose(null);
    assert(S().state().chosen === null, 'the tile did not let go');
    return { solid: p3Box, depth: solids[0].steps[0].depth, chosen: S().state().chosen };
  });

  step('a circle on the box’s top PLAYS a feature, and names the face', () => {
    featureId = S().strokeScreen(faceRing(1.1));
    assert(featureId, 'no mark was made');
    const m = markOf(featureId);
    assert(m.plane.source === 'face', `the plane was read as ${m.plane.source}, not face`);
    assert(m.plays, 'the form rung placed nothing');
    assert(m.plays.role === 'feature', `it plays ${m.plays.role}, not feature`);
    assert(m.plays.rule === 3, `row ${m.plays.rule} placed it, not row 3`);
    assert(/top of /.test(m.plays.reasoning), `the reason does not name the face: "${m.plays.reasoning}"`);
    assert(m.plays.targets.includes(p3Box), 'the feature does not name the solid it is on');
    // A feature is NOT acted on: two intentions, one drawing.
    assert(S().state().solids.length === 1, 'something was made of a feature by itself');
    return { id: featureId, plays: m.plays.role, rule: m.plays.rule, plane: m.plane.name, reasoning: m.plays.reasoning };
  });

  step('the SOLID stands selected, with no lasso — and both pills are there, tier 1', () => {
    const sel = S().state().selection;
    assert(sel && sel.kind === 'solid' && sel.id === p3Box, `the selection is ${JSON.stringify(sel)}`);
    const cut = S().fieldRead('Cut a hole');
    const boss = S().fieldRead('Raise a boss');
    assert(cut.enabled, `Cut a hole was not offered: "${cut.line}"`);
    assert(boss.enabled, `Raise a boss was not offered: "${boss.line}"`);
    assert(/tier 1/.test(cut.line), `the cut's line does not say tier 1: "${cut.line}"`);
    assert(/tier 1/.test(boss.line), `the boss's line does not say tier 1: "${boss.line}"`);
    assert(/through/.test(cut.line), `the cut does not say how deep it will go: "${cut.line}"`);
    // The alias table, not only the label.
    assert(S().fieldRead('drill').enabled, 'the alias `drill` does not read as the cut');
    const features = S().features();
    assert(features.length === 1 && features[0].featureId === featureId, `features: ${JSON.stringify(features)}`);
    return { selection: sel, cut: cut.line, boss: boss.line, features };
  });

  step('take *Cut a hole* — a `cut` step, and you can see through it', () => {
    const before = S().solids()[0].versions;
    const r = S().field('Cut a hole');
    assert(r.ran, `Enter did nothing: "${r.line}"`);
    const solid = S().solids()[0];
    assert(S().solids().length === 1, 'the cut made a second solid');
    assert(solid.steps.length === 2, `${solid.steps.length} steps, expected 2`);
    assert(solid.steps[1].op === 'cut', `the second step is ${solid.steps[1].op}`);
    assert(solid.steps[1].on === solid.steps[0].id, 'the cut does not nest on the extrude');
    assert(solid.steps[1].through === true, 'the cut with no extent did not go through');
    assert(solid.steps[1].from.includes(featureId), 'the step does not reference the circle');
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    assert(solid.versions === before + 1, `${solid.versions} versions held, expected ${before + 1}`);

    // THE HOLE IS A HOLE: a ray from above through its centre misses the solid.
    const c = topCentre();
    assert(S().rayDown({ x: c.x, z: c.z }) === null, 'the ray down the hole hit the solid');
    // …and beside it the box is exactly as tall as it was.
    const beside = S().rayDown({ x: P3.x0 + 0.3, z: P3.z0 + 0.3 });
    assert(beside && Math.abs(beside.y - P3.top) < 0.05, `beside the hole the top is at ${beside && beside.y}`);

    // The circle's ink is STILL ON THE FACE (invariant 3).
    assert(S().state().marks.some((m) => m.id === featureId), 'the feature ink went with the cut');
    const text = S().panelText();
    assert(/cut/.test(text), 'the panel does not name the cut');
    assert(/through/.test(text), 'the panel does not say the cut goes through');
    assert(/extrude/.test(text), 'the panel lost the step the cut was cut into');
    return {
      steps: solid.steps.map((s) => `${s.op}${s.on ? ` on ${s.on}` : ''}`),
      through: solid.steps[1].through,
      versions: solid.versions,
      status: S().state().status,
      panel: text.replace(/\s+/g, ' ').slice(0, 260),
    };
  });

  step('undo — the hole is gone, the box stands on its first tree, the ink stays', () => {
    S().undo();
    const solid = S().solids()[0];
    assert(solid, 'the undo took the whole solid');
    assert(solid.steps.length === 1, `${solid.steps.length} steps after the undo, expected 1`);
    assert(solid.steps[0].op === 'extrude', `the step left is ${solid.steps[0].op}`);
    const c = topCentre();
    const hit = S().rayDown({ x: c.x, z: c.z });
    assert(hit && Math.abs(hit.y - P3.top) < 0.05, `the hole did not close: ${JSON.stringify(hit)}`);
    assert(S().state().marks.some((m) => m.id === featureId), 'the undo took the circle too');
    return { steps: solid.steps.length, top: hit.y };
  });

  step('take *Raise a boss* instead — the same circle, the other intention', () => {
    const r = S().field('Raise a boss');
    assert(r.ran, `Enter did nothing: "${r.line}"`);
    const solid = S().solids()[0];
    assert(solid.steps.length === 2, `${solid.steps.length} steps, expected 2`);
    assert(solid.steps[1].op === 'boss', `the second step is ${solid.steps[1].op}`);
    assert(solid.steps[1].depth > 0, `the boss sank instead of rising: ${solid.steps[1].depth}`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    const c = topCentre();
    const hit = S().rayDown({ x: c.x, z: c.z });
    assert(hit, 'the boss ate the box');
    assert(hit.y > P3.top + 0.1, `the boss did not rise above the face: ${hit.y} vs ${P3.top}`);
    return { steps: solid.steps.map((s) => s.op), depth: solid.steps[1].depth, top: +hit.y.toFixed(3), status: S().state().status };
  });

  step('undo the boss too — one undo, one version', () => {
    S().undo();
    const solid = S().solids()[0];
    assert(solid.steps.length === 1, `${solid.steps.length} steps after the undo`);
    const c = topCentre();
    const hit = S().rayDown({ x: c.x, z: c.z });
    assert(hit && Math.abs(hit.y - P3.top) < 0.05, `the boss did not come off: ${JSON.stringify(hit)}`);
    return { steps: solid.steps.length, top: +hit.y.toFixed(3) };
  });

  /**
   * A zigzag ACROSS the box on screen: `passes` traversals, each one right
   * across the silhouette and out the far side. One traversal is two
   * crossings — a line drawn through a thing is safe — so an ODD number of
   * traversals ends on the far side, which also keeps the stroke plainly
   * open: a zigzag that comes back to where it started reads CLOSED, and a
   * closed stroke is never a scratch (it is a lasso). Found here.
   */
  function zigzagAcross(passes) {
    const left = S().screenForWorld({ x: P3.x0 - 2.6, y: P3.top * 0.5, z: (P3.z0 + P3.z1) / 2 });
    const right = S().screenForWorld({ x: P3.x1 + 2.6, y: P3.top * 0.5, z: (P3.z0 + P3.z1) / 2 });
    const corner = (i) => ({
      x: i % 2 === 0 ? left.x : right.x,
      y: (i % 2 === 0 ? left.y : right.y) + (i - passes / 2) * 30,
    });
    const out = [corner(0)];
    for (let i = 0; i < passes; i++) {
      const a = corner(i);
      const b = corner(i + 1);
      for (let s = 1; s <= 10; s++) {
        const t = s / 10;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  }

  step('one pass through is not a scratch — the board says one more pass', () => {
    const id = S().strokeScreen(zigzagAcross(1));
    assert(id, 'no mark was made');
    const m = markOf(id);
    assert(m.plays.role !== 'gesture', `one pass read as ${m.plays.role}`);
    assert(S().solids().length === 1, 'one pass erased the box');
    // The evidence itself, before the threshold: in and out is two.
    const near = S().scratchOf(id);
    assert(near && near.crossings === 2, `it crossed ${near && near.crossings} times, expected 2`);
    const sil = S().silhouetteOf(near.solidId, id);
    assert(sil && sil.length > 3, 'the silhouette it was counted against is not there');
    const status = S().state().status;
    assert(/one more pass/.test(status), `the status said "${status}"`);
    S().undo(); // take the near miss back off the board
    return { plays: m.plays.role, crossings: near.crossings, silhouette: sil.length, status };
  });

  step('a scratch across the box erases it — and its ink stays, because ink is provenance', () => {
    const marksBefore = S().state().marks.map((x) => x.id);
    const id = S().strokeScreen(zigzagAcross(3));
    assert(id, 'no mark was made');
    const m = markOf(id);
    assert(m, 'the scratch is not on the board — a gesture is still ink here');
    assert(m.plays.role === 'gesture', `it plays ${m.plays.role}, not gesture`);
    assert(m.plays.rule === 1, `row ${m.plays.rule} placed it, not row 1`);
    assert(/crosses/.test(m.plays.reasoning), `the reason was "${m.plays.reasoning}"`);
    assert(/silhouette/.test(m.plays.reasoning), `the reason does not say what it crossed: "${m.plays.reasoning}"`);
    assert(S().solids().length === 0, `${S().solids().length} solids — the scratch did not erase the box`);
    // The profile, the extent and the circle are all still here.
    for (const was of marksBefore) {
      assert(S().state().marks.some((x) => x.id === was), `${was} went with the solid`);
    }
    const status = S().state().status;
    assert(/scratched out/.test(status), `the status said "${status}"`);
    return { plays: m.plays.role, rule: m.plays.rule, reasoning: m.plays.reasoning, status, marks: S().state().marks.length };
  });

  step('undo the scratch — the box is back', () => {
    S().undo();
    assert(S().solids().length === 1, 'the box did not come back');
    assert(S().solids()[0].id === p3Box, 'a different solid came back');
    const c = topCentre();
    const hit = S().rayDown({ x: c.x, z: c.z });
    assert(hit && Math.abs(hit.y - P3.top) < 0.05, `the box came back wrong: ${JSON.stringify(hit)}`);
    return { solids: S().solids().length, top: +hit.y.toFixed(3) };
  });

  step('mirror says which plane before Enter, and dup stands a copy beside it', () => {
    S().select(p3Box);
    const mirror = S().fieldRead('mirror');
    assert(mirror.enabled, `Mirror was not offered: "${mirror.line}"`);
    assert(/height plane/.test(mirror.line), `the line does not say which plane: "${mirror.line}"`);
    const ran = S().field('mirror');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    let solid = S().solids()[0];
    assert(solid.steps.length === 2 && solid.steps[1].op === 'mirror', `steps: ${solid.steps.map((s) => s.op).join(', ')}`);
    assert(solid.broken === null, `the mirror broke: ${solid.broken}`);
    // The reflection stands on the other side of z = 0.
    const mirrored = S().rayDown({ x: (P3.x0 + P3.x1) / 2, z: -(P3.z0 + P3.z1) / 2 });
    assert(mirrored, 'nothing stands where the reflection should be');
    S().undo();

    const dup = S().field('dup');
    assert(dup.ran, `Enter did nothing: "${dup.line}"`);
    solid = S().solids()[0];
    assert(solid.steps[1].op === 'place', `the dup's step is ${solid.steps[1].op}`);
    const width = P3.x1 - P3.x0;
    const copy = S().rayDown({ x: (P3.x0 + P3.x1) / 2 + width * 1.1, z: (P3.z0 + P3.z1) / 2 });
    assert(copy, 'the copy is not standing beside the original');
    assert(Math.abs(copy.y - P3.top) < 0.05, `the copy is ${copy.y} tall, not ${P3.top}`);
    S().undo();
    assert(S().solids()[0].steps.length === 1, 'the undo did not drop the dup');
    return { mirror: mirror.line, dup: dup.line };
  });

  // ===== P4 — the diff is the brief =========================================
  // "Draw the box's side profile with a bump; the diff names the missing
  // region; *Add it* extrudes it; the diff then reads clean."
  //
  // The box is built exactly as P2 builds it. The profile is drawn on the WIDTH
  // plane, from the side view — which is what a hand does — and it is a profile
  // OF the box because its outline overlaps the box's silhouette on that plane,
  // not because anything was declared. The plane's origin is the world origin
  // and the box is five units away from it: the comparison is orthographic, so
  // that does not enter into it.

  const P4 = { x0: -7, x1: -3, z0: -2, z1: 0.6, top: 2.4 };
  /**
   * The box's own side view is u ∈ [−0.6, 2], v ∈ [−2.4, 0] on the width plane
   * (+u runs along −Z, +v runs down), and the bump stands 0.7 out of its
   * right-hand edge over 0.8 of its height — 0.56 u² the body has not got.
   */
  const BUMP = { u0: 2, u1: 2.7, v0: -1.6, v1: -0.8 };
  const BUMP_AREA = (BUMP.u1 - BUMP.u0) * (BUMP.v1 - BUMP.v0);
  const SIDE_WITH_BUMP = [
    { x: -0.6, y: 0 },
    { x: 2, y: 0 },
    { x: BUMP.u0, y: BUMP.v1 },
    { x: BUMP.u1, y: BUMP.v1 },
    { x: BUMP.u1, y: BUMP.v0 },
    { x: BUMP.u0, y: BUMP.v0 },
    { x: 2, y: -2.4 },
    { x: -0.6, y: -2.4 },
  ];
  /** A closed outline through corners, densified the way a hand leaves a path. */
  function loopPath(corners, per = 14) {
    const out = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    out.push(corners[0]);
    return out;
  }

  let p4Box = null;
  let sideId = null;

  /** A ray straight down through the bump, and one past it. */
  const downTheBump = () => S().rayDown({ x: (P4.x0 + P4.x1) / 2, z: -2.4 });

  function buildP4Box() {
    S().clear();
    S().view('free');
    S().choose('foundation');
    const base = S().strokeScreen(onScreen(rectPath(P4.x0, P4.z0, P4.x1 - P4.x0, P4.z1 - P4.z0)));
    assert(base, 'no profile was made');
    S().choose('height');
    const ext = S().strokeScreen(onScreen(linePath({ x: P4.x0, y: 0 }, { x: P4.x0, y: -P4.top })));
    assert(ext, 'no extent was made');
    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    return solids[0].id;
  }

  step('a box, and the side view to check it from', () => {
    p4Box = buildP4Box();
    // The side view: the width plane is then flat on to the eye, which is what
    // makes drawing a side profile something a hand can actually do.
    S().view('side');
    S().choose('width');
    assert(S().state().chosen === 'width', 'the width tile did not take');
    assert(downTheBump() === null, 'something already stands where the bump is going');
    return { solid: p4Box, chosen: S().state().chosen };
  });

  step('the side profile with a bump is a profile OF the box, not a new one', () => {
    sideId = S().strokeScreen(onScreen(loopPath(SIDE_WITH_BUMP)));
    assert(sideId, 'no mark was made');
    const m = markOf(sideId);
    assert(m.plane.name === 'width', `it landed on ${m.plane.name}`);
    assert(m.plays, 'the form rung placed nothing');
    assert(m.plays.role === 'profile', `it plays ${m.plays.role}, not profile`);
    assert(m.plays.rule === 2, `row ${m.plays.rule} placed it, not row 2`);
    assert(m.plays.against, 'it is not read as a profile OF anything');
    assert(m.plays.against.solidId === p4Box, `it is a profile of ${m.plays.against.solidId}`);
    assert(m.plays.against.view === 'side', `it is called the ${m.plays.against.view} profile`);
    assert(/side profile of/.test(m.plays.reasoning), `the reason was "${m.plays.reasoning}"`);
    // No extent is awaited beside it, and nothing was made of it.
    assert(S().state().solids.length === 1, 'a second solid stood up from the profile');
    assert(!S().fieldRead('extrude').enabled, 'the field offered to grow a profile of a solid into a new one');
    return {
      id: sideId,
      plays: m.plays.role,
      against: m.plays.against,
      reasoning: m.plays.reasoning,
    };
  });

  step('the diff names the missing region, with its area and its side', () => {
    const rows = S().diffs(p4Box);
    assert(rows.length === 1, `${rows.length} diff rows, expected 1`);
    const d = rows[0];
    assert(d.view === 'side', `the view is ${d.view}`);
    assert(d.markId === sideId, `the row is about ${d.markId}`);
    assert(d.extra.length === 0, `${d.extra.length} extra regions, expected none`);
    assert(d.missing.length === 1, `${d.missing.length} missing regions, expected 1`);
    const err = Math.abs(d.missing[0].area - BUMP_AREA) / BUMP_AREA;
    assert(err < 0.3, `the region is ${d.missing[0].area.toFixed(3)} u², ${(err * 100).toFixed(0)}% off the drawn ${BUMP_AREA}`);
    assert(/right/.test(d.missing[0].where), `it says the region is ${d.missing[0].where}`);
    assert(d.coverage > 0.8 && d.coverage < 0.97, `coverage ${d.coverage.toFixed(3)}`);
    assert(d.missing[0].points >= 4, 'the region has no outline to build a prism on');
    const status = S().state().status;
    assert(/missing 1 region/.test(status), `the status said "${status}"`);
    assert(/side profile of/.test(status), `the status does not say what the profile is: "${status}"`);
    const text = S().panelText();
    assert(/matches the drawing/.test(text), 'the panel has no *matches the drawing* row');
    assert(/missing/.test(text), 'the panel does not name the region');
    return { sentence: d.sentence, from: d.from, region: d.missing[0], coverage: +d.coverage.toFixed(3), status, dropped: d.dropped };
  });

  step('*Add it* is offered, tier 1, and says how much and where', () => {
    const sel = S().state().selection;
    assert(sel && sel.kind === 'solid' && sel.id === p4Box, `the selection is ${JSON.stringify(sel)}`);
    const add = S().fieldRead('Add it');
    assert(add.enabled, `Add it was not offered: "${add.line}"`);
    assert(/tier 1/.test(add.line), `it does not say tier 1: "${add.line}"`);
    assert(/1 region/.test(add.line), `it does not say how many: "${add.line}"`);
    assert(/u²/.test(add.line), `it does not say how much: "${add.line}"`);
    assert(S().fieldRead('fill it in').enabled, 'the alias `fill it in` does not read as Add it');
    // Nothing to take off, and it says which of the reasons that is.
    const off = S().fieldRead('Take it off');
    assert(!off.enabled, `Take it off was offered with nothing extra: "${off.line}"`);
    assert(/nothing extra/.test(off.line), `it does not say why: "${off.line}"`);
    return { add: add.line, takeOff: off.line };
  });

  step('take *Add it* — a `match` step, and the bump is really there', () => {
    const before = S().solids()[0].versions;
    const r = S().field('Add it');
    assert(r.ran, `Enter did nothing: "${r.line}"`);
    const solid = S().solids()[0];
    assert(S().solids().length === 1, 'the match made a second solid');
    assert(solid.steps.length === 2, `${solid.steps.length} steps, expected 2`);
    assert(solid.steps[1].op === 'match', `the second step is ${solid.steps[1].op}`);
    assert(solid.steps[1].how === 'add', `it went ${solid.steps[1].how}`);
    assert(solid.steps[1].on === solid.steps[0].id, 'the match does not nest on the extrude');
    assert(solid.steps[1].from.includes(sideId), 'the step does not reference the profile');
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    assert(solid.versions === before + 1, `${solid.versions} versions held, expected ${before + 1}`);
    // THE BUMP IS A BUMP: a ray down through where it was drawn meets the body.
    const hit = downTheBump();
    assert(hit, 'nothing stands where the missing region was');
    assert(hit.solidId === p4Box, `the ray met ${hit.solidId}`);
    assert(Math.abs(hit.y - -BUMP.v0) < 0.15, `the bump's top is at ${hit.y}, not ${-BUMP.v0}`);
    // …and the box beside it is exactly as tall as it was.
    const beside = S().rayDown({ x: P4.x0 + 0.3, z: P4.z0 + 0.3 });
    assert(beside && Math.abs(beside.y - P4.top) < 0.06, `beside the bump the top is at ${beside && beside.y}`);
    // The profile's ink is still on its plane — it is a standing claim.
    assert(S().state().marks.some((m) => m.id === sideId), 'the profile ink went with the match');
    return { steps: solid.steps.map((s) => `${s.op}${s.how ? ` · ${s.how}` : ''}`), versions: solid.versions, top: +hit.y.toFixed(3), status: S().state().status };
  });

  step('the diff re-reads, and now it is clean', () => {
    const d = S().diffs(p4Box)[0];
    assert(d, 'the row went away');
    assert(d.missing.length === 0, `${d.missing.length} regions still missing: ${JSON.stringify(d.missing)}`);
    assert(d.extra.length === 0, `${d.extra.length} extra regions appeared: ${JSON.stringify(d.extra)}`);
    assert(d.coverage > 0.95, `coverage is ${d.coverage.toFixed(3)}, under 0.95`);
    assert(/matches 9\d%|matches 100%/.test(d.sentence), `the sentence said "${d.sentence}"`);
    const add = S().fieldRead('Add it');
    assert(!add.enabled, `Add it is still offered: "${add.line}"`);
    assert(/nothing missing/.test(add.line), `it does not say why: "${add.line}"`);
    const text = S().panelText();
    assert(/nothing missing/.test(text), 'the panel does not say the drawing is honoured');
    return { sentence: d.sentence, coverage: +d.coverage.toFixed(3), add: add.line };
  });

  step('undo — the bump is gone and the diff reports the region again', () => {
    S().undo();
    const solid = S().solids()[0];
    assert(solid, 'the undo took the whole solid');
    assert(solid.steps.length === 1, `${solid.steps.length} steps after the undo, expected 1`);
    assert(downTheBump() === null, 'the bump did not come off');
    assert(S().state().marks.some((m) => m.id === sideId), 'the undo took the profile ink too');
    const d = S().diffs(p4Box)[0];
    assert(d.missing.length === 1, `${d.missing.length} missing regions after the undo, expected 1`);
    assert(d.coverage < 0.97, `coverage ${d.coverage.toFixed(3)} — the body still matches`);
    return { steps: solid.steps.length, sentence: d.sentence };
  });

  step('a profile SMALLER than the box → *Take it off* cuts the extra, and it reads clean', () => {
    p4Box = buildP4Box();
    S().view('side');
    S().choose('width');
    // u ∈ [−0.6, 1.2] is z ∈ [−1.2, 0.6]: the drawing wants the far eighth of
    // the box gone.
    const smallId = S().strokeScreen(
      onScreen(loopPath([
        { x: -0.6, y: 0 },
        { x: 1.2, y: 0 },
        { x: 1.2, y: -2.4 },
        { x: -0.6, y: -2.4 },
      ]))
    );
    assert(smallId, 'no mark was made');
    const m = markOf(smallId);
    assert(m.plays.against && m.plays.against.solidId === p4Box, `it is a profile of ${JSON.stringify(m.plays.against)}`);
    const before = S().diffs(p4Box)[0];
    assert(before.missing.length === 0, `${before.missing.length} missing regions, expected none`);
    assert(before.extra.length === 1, `${before.extra.length} extra regions, expected 1`);
    assert(S().rayDown({ x: (P4.x0 + P4.x1) / 2, z: -1.6 }), 'the material to take off is not there to start with');

    const off = S().fieldRead('Take it off');
    assert(off.enabled, `Take it off was not offered: "${off.line}"`);
    assert(/tier 1/.test(off.line), `it does not say tier 1: "${off.line}"`);
    const ran = S().field('Take it off');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);

    const solid = S().solids()[0];
    assert(solid.steps[1].op === 'match' && solid.steps[1].how === 'remove', `steps: ${solid.steps.map((s) => s.op).join(', ')}`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    assert(S().rayDown({ x: (P4.x0 + P4.x1) / 2, z: -1.6 }) === null, 'the extra material is still standing');
    assert(S().rayDown({ x: (P4.x0 + P4.x1) / 2, z: 0 }), 'the cut took the whole box');

    const after = S().diffs(p4Box)[0];
    assert(after.extra.length === 0, `${after.extra.length} extra regions left: ${JSON.stringify(after.extra)}`);
    assert(after.missing.length === 0, `${after.missing.length} missing regions appeared: ${JSON.stringify(after.missing)}`);
    assert(after.coverage > 0.95, `coverage ${after.coverage.toFixed(3)}`);
    return { before: before.sentence, after: after.sentence, steps: solid.steps.map((s) => s.op) };
  });

  // ---- P5: the generator seat, and names -----------------------------------
  //
  // "draw three unnamed profiles; type *a castle with green turret tops*: the
  // massing stands at once in the engine's name, a stub model's tree fills it
  // with steps named castle / turret / top and green bound to the tops, the
  // diff says it honours the profiles; *make the turrets taller* regens those
  // steps alone; typing *turret* afterwards completes from the library."

  const CASTLE = () => window.__castle;

  let castleId = null;
  /** The stub's castle reply, with the plan's real stroke id in it — kept so it can be re-stubbed. */
  let castleReply = null;

  /**
   * The stub's castle: three named steps, two circles of its own, green on the
   * top. The cap's own profile is laid on the foundation SLID to 3.0 — a named
   * plane passes through the origin, and `at` is the gizmo's handle said as a
   * number, which is the only way a model can put a cap on top of a tower.
   */
  const CASTLE_REPLY = JSON.stringify({
    steps: [
      { id: 's1', op: 'extrude', profile: 'PLAN', depth: 3.6, name: 'castle', why: 'the plan, grown past the height the front says — the clip brings it back' },
      { id: 's2', op: 'boss', on: 's1', profile: 'p1', depth: 3.0, name: 'turret', why: 'the tower the front and the side both show' },
      { id: 's3', op: 'boss', on: 's2', profile: 'p2', depth: 0.6, name: 'top', material: { colour: 'green' }, why: 'its cap' },
    ],
    profiles: [
      { id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.55, y: -0.95 }, r: 0.34 },
      { id: 'p2', shape: 'circle', plane: 'foundation', at: 3.0, centre: { x: 1.55, y: -0.95 }, r: 0.34 },
    ],
  });

  const TALLER_REPLY = JSON.stringify({
    steps: [
      { id: 't1', op: 'boss', profile: 'p1', depth: 4.5, name: 'turret', why: 'taller, as asked' },
    ],
    profiles: [{ id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.55, y: -0.95 }, r: 0.34 }],
  });

  step('three unnamed profiles: the massing stands at once, in the engine’s name', () => {
    S().clear();
    S().view('free');
    const c = CASTLE();
    assert(c, 'window.__castle is not there — the surface did not export the demo shapes');

    S().choose('foundation');
    const planId = S().strokeScreen(onScreen(loopPath(c.plan)));
    assert(planId, 'the plan was not drawn');
    // ONE profile is not a massing: it still waits for an extent, as in P2.
    assert(S().state().solids.length === 0, 'a lone profile stood something up');

    S().view('front');
    S().choose('height');
    const frontId = S().strokeScreen(onScreen(loopPath(c.front)));
    assert(frontId, 'the front was not drawn');
    // The SECOND one is: two views whose projections overlap ARE a solid.
    assert(S().state().solids.length === 1, `${S().state().solids.length} solids after the second profile, expected 1`);

    S().view('side');
    S().choose('width');
    const sideId = S().strokeScreen(onScreen(loopPath(c.side)));
    assert(sideId, 'the side was not drawn');
    S().view('free');

    const solids = S().solids();
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    castleId = solids[0].id;
    const solid = solids[0];
    assert(solid.name === 'massing', `it is called ${solid.name}`);
    assert(solid.named === 'engine', `it was named by ${solid.named}`);
    assert(solid.author === 'participant:tier0', `the author is ${solid.author}`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    const massing = solid.steps.find((st) => st.op === 'massing');
    assert(massing, `the steps are ${solid.steps.map((st) => st.op).join(', ')}`);
    assert(massing.from.length === 3, `the massing references ${massing.from.length} strokes, expected 3`);
    assert(/tier 1/.test(S().state().status), `the status said "${S().state().status}"`);
    assert(/massing from 3 profiles/.test(S().state().status), `the status said "${S().state().status}"`);
    // Every profile is still ink on the board: ink is never covered.
    assert(S().state().marks.length === 3, `${S().state().marks.length} marks left on the board`);
    // And no model was asked, because none has joined and none was going to be.
    assert(S().models().seats.length === 0, 'a model was seated by drawing');
    return { solid: castleId, steps: solid.steps.map((st) => st.op), status: S().state().status };
  });

  step('the massing is the box the three views jointly describe', () => {
    // The keep stands, and so does the tower above it — a ray down through the
    // tower meets the solid higher than a ray down beside it.
    //
    // Beside the summit, not ON it: the tower tapers to a ridge at
    // (1.55, −0.95), and a ray fired exactly down a vertex of a triangulation
    // is a coin toss between the faces that meet there — it came back with the
    // BOTTOM face. A test that asks a question at a knife edge is asking about
    // the triangulation, not about the shape.
    const onTower = S().rayDown({ x: 1.5, z: -0.9 });
    const onKeep = S().rayDown({ x: -1, z: 0 });
    assert(onTower, 'nothing stands where the tower is');
    assert(onKeep, 'nothing stands where the keep is');
    assert(onTower.y > onKeep.y + 0.5, `the tower (${onTower.y.toFixed(2)}) is not above the keep (${onKeep.y.toFixed(2)})`);
    assert(onKeep.y > 1.8 && onKeep.y < 2.2, `the keep is ${onKeep.y.toFixed(2)} tall, expected about 2`);
    assert(S().rayDown({ x: 5, z: 0 }) === null, 'the massing reaches outside the drawing');
    return { tower: +onTower.y.toFixed(2), keep: +onKeep.y.toFixed(2) };
  });

  step('with no model, a brief says so and Enter opens the pane', () => {
    S().select(castleId);
    const read = S().fieldRead('a castle with green turret tops');
    assert(/no model has joined/.test(read.line), `the reading line said "${read.line}"`);
    assert(read.kind === 'brief', `it read as ${read.kind}`);
    return { line: read.line };
  });

  step('a stub model joins, and the reading line says which model Enter asks', () => {
    // The plan's stroke id is what the reply refers to — the region-id rule,
    // in stroke ids. The e2e reads it off the board rather than assuming it.
    const planId = S().state().marks[0].id;
    castleReply = CASTLE_REPLY.replace('"PLAN"', JSON.stringify(planId));
    S().joinStub([castleReply, TALLER_REPLY]);
    const seats = S().models().seats;
    assert(seats.length === 1 && seats[0].name === 'e2e-stub', `seated: ${JSON.stringify(seats)}`);
    S().select(castleId);
    const read = S().fieldRead('a castle with green turret tops');
    assert(/asks e2e-stub/.test(read.line), `the reading line said "${read.line}"`);
    return { line: read.line, seats };
  });

  step('*a castle with green turret tops* → a version named castle / turret / top, green on the tops', async () => {
    S().select(castleId);
    const ran = S().field('a castle with green turret tops');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    // The call is a promise; the stub answers on the next tick.
    await new Promise((r) => setTimeout(r, 120));

    const solid = S().solids().find((x) => x.id === castleId);
    assert(solid, 'the solid went away');
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    // Three: the massing when the second view landed, the massing again when
    // the third went into it, and now the model's. Every version is held.
    assert(solid.versions === 3, `${solid.versions} versions held, expected 3`);

    const names = S().names().filter((n) => n.solidId === castleId);
    const said = names.map((n) => n.name).sort();
    assert(JSON.stringify(said) === JSON.stringify(['castle', 'top', 'turret']), `the names are ${JSON.stringify(said)}`);
    // Every name is in its STEP'S OWN ID — the region-id rule.
    for (const n of names) assert(/^step:/.test(n.stepId), `${n.name} is on ${n.stepId}`);

    const green = S().materials(castleId);
    assert(green.length === 1, `${green.length} materials bound, expected 1`);
    assert(green[0].name === 'top' && green[0].colour === 'green', `the material is ${JSON.stringify(green[0])}`);

    // The version is HELD, and attributed to the model.
    assert(/e2e-stub/.test(S().panelText()), 'the panel does not say who proposed it');
    assert(/tier 2/.test(S().state().status), `the status said "${S().state().status}"`);
    return { steps: solid.steps.map((st) => `${st.op}${st.name ? `:${st.name}` : ''}`), names: said, material: green[0] };
  });

  // ACT-1 (the director review, 15 September 2026). The model's reply is ONE
  // act: two profiles drawn in its name (two events each), the version, and
  // the take-in that makes each profile the tree's provenance — seven events
  // under one timestamp. Undo used to walk back event by event and stop when
  // it saw the tree change, which is the version — so the two circles the
  // model had drawn were left standing on a board whose tree no longer
  // mentioned them. One undo is the whole act now, and nothing else.
  step('one undo takes the model’s whole act — the version AND both profiles it drew', () => {
    const before = S().solids().find((x) => x.id === castleId);
    assert(before.versions === 3, `${before.versions} versions before the undo, expected 3`);
    const ink = S().state().marks.length;

    S().undo();

    const after = S().solids().find((x) => x.id === castleId);
    assert(after, 'the undo took the whole solid — it should have taken one version');
    assert(after.versions === 2, `${after.versions} versions after one undo, expected 2`);
    assert(
      after.steps.length === 1 && after.steps[0].op === 'massing',
      `the tree is ${after.steps.map((st) => st.op).join(', ')}, expected the massing alone`
    );
    assert(after.broken === null, `the derivation broke: ${after.broken}`);
    // The two circles went with the version they were drawn for; the three
    // views the HAND drew are untouched.
    const left = S().state().marks.length;
    assert(left === ink - 2, `${ink - left} marks came off, expected the 2 profiles the model drew`);
    assert(left === 3, `${left} marks left, expected the hand's three views`);
    const names = S().names().filter((n) => n.solidId === castleId);
    assert(names.length === 0, `the model's names are still in play: ${JSON.stringify(names.map((n) => n.name))}`);
    return { versions: after.versions, marks: `${ink} → ${left}`, steps: after.steps.map((st) => st.op) };
  });

  step('the same brief again puts the castle back, whole', async () => {
    // Re-stubbed rather than re-run off the queue: the seat answers the next
    // call with the NEXT reply, and *make the turrets taller* below wants the
    // one after this. Re-seating starts the queue again.
    S().joinStub([castleReply, TALLER_REPLY]);
    S().select(castleId);
    const ran = S().field('a castle with green turret tops');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 140));

    const solid = S().solids().find((x) => x.id === castleId);
    assert(solid.versions === 3, `${solid.versions} versions, expected 3`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    const said = S().names().filter((n) => n.solidId === castleId).map((n) => n.name).sort();
    assert(JSON.stringify(said) === JSON.stringify(['castle', 'top', 'turret']), `the names are ${JSON.stringify(said)}`);
    assert(S().state().marks.length === 5, `${S().state().marks.length} marks, expected the hand's 3 and the model's 2`);
    return { versions: solid.versions, names: said, marks: S().state().marks.length };
  });

  step('the extent invariant: the model’s tree is clipped to the massing, in the engine’s name', () => {
    const solid = S().solids().find((x) => x.id === castleId);
    const last = solid.steps[solid.steps.length - 1];
    assert(last.op === 'massing', `the last step is ${last.op}`);
    assert(last.on, 'the clip acts on nothing');
    assert(/nothing proposed may leave it/.test(last.reasoning), `the clip says "${last.reasoning}"`);
    // The reply asked for 3.6 of castle and 3.2 + 0.6 of tower on top of that;
    // the drawing says 3.6 in total, and the clip is what makes that true.
    const onTower = S().rayDown({ x: 1.5, z: -0.9 });
    assert(onTower, 'the tower went away');
    assert(onTower.y < 3.7, `the tower stands ${onTower.y.toFixed(2)} high — outside the drawing`);
    assert(S().rayDown({ x: 5, z: 0 }) === null, 'the proposal left the drawing');
    return { last: last.op, tower: +onTower.y.toFixed(2) };
  });

  step('the row says how much of the drawing it honours, per plane', () => {
    const h = S().honours(castleId);
    assert(h, 'nothing was measured');
    assert(h.per.length === 3, `${h.per.length} views measured, expected 3`);
    assert(/honours the drawing/.test(h.sentence), `the sentence is "${h.sentence}"`);
    for (const p of h.per) assert(p.coverage > 0.8, `the ${p.view} view is only ${(p.coverage * 100).toFixed(0)}%`);
    assert(/honours/.test(S().panelText()), 'the panel does not carry the row');
    return { sentence: h.sentence, per: h.per.map((p) => `${p.view} ${(p.coverage * 100).toFixed(0)}`) };
  });

  // UI-2: a version a MODEL wrote and the hand has not taken says exactly that
  // — and it is the only state that may say *proposed*.
  step('the summary says the version is a model’s proposal, held', () => {
    S().select(castleId);
    const rows = summaryRows();
    assert(rows.from === 'proposed by e2e-stub, held', `from said "${rows.from}"`);
    assert(/a solid → a definition/.test(rows.becomes || ''), `becomes said "${rows.becomes}"`);
    // The version row in the evidence says the same thing, against the id.
    const body = evidence().querySelector('.evidenceBody').textContent;
    assert(/held · e2e-stub/.test(body.replace(/\s+/g, ' ')), 'the version row does not name the model');
    // …and the honours row is per CLAIM now, each naming the kind it is
    // (GRAPH-1's data, said out loud) rather than one sentence of the panel's.
    assert(/drawn here/.test(body), 'the honours rows do not say which kind of claim each is');
    return { rows, version: body.replace(/\s+/g, ' ').match(/version[^·]*· [^ ]+/)?.[0] ?? '' };
  });

  step('*Take it* names the thing castle, and holds turret and top as definitions', () => {
    const take = S().fieldRead('Take it');
    assert(take.enabled, `Take it was not offered: "${take.line}"`);
    assert(/castle/.test(take.line), `it does not say the name: "${take.line}"`);
    const ran = S().field('Take it');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);

    const solid = S().solids().find((x) => x.id === castleId);
    assert(solid.name === 'castle', `it is called ${solid.name}`);
    assert(solid.named === 'human', `it was named by ${solid.named}`);

    const defs = S().definitions();
    const held = defs.map((d) => d.name).sort();
    // P6: the WHOLE is a definition too, under the root's own name, so that
    // drawing the castle's own profile again offers it.
    assert(JSON.stringify(held) === JSON.stringify(['castle', 'top', 'turret']), `the definitions are ${JSON.stringify(held)}`);
    for (const d of defs) assert(d.basedOn === 'castle', `${d.name} is based on ${d.basedOn}`);
    assert(defs.find((d) => d.name === 'castle').whole === true, 'the whole was not held as the whole');
    assert(defs.find((d) => d.name === 'turret').whole === false, 'a part was held as the whole');
    // …and each of them carries the outlines it would be recognised by.
    for (const d of defs) assert(d.profiles.length > 0, `${d.name} carries no profile to be recognised by`);
    return { name: solid.name, definitions: defs.map((d) => `${d.name} ← ${d.basedOn}`) };
  });

  // UI-2: taken is the hand's own act, and the row says so — while still
  // naming who wrote the version, because that has not stopped being true.
  step('the summary says the hand took it, and still names who wrote it', () => {
    const rows = summaryRows();
    assert(rows.what === 'castle', `what said "${rows.what}"`);
    assert(rows.from === 'taken by you', `from said "${rows.from}"`);
    assert(/a definition → placed again/.test(rows.becomes || ''), `becomes said "${rows.becomes}"`);
    const why = summaryText();
    assert(/e2e-stub wrote the version/.test(why), `the reason does not name the author: "${why}"`);
    return { rows };
  });

  step('*make the turrets taller* regens those steps alone; every other id is unchanged', async () => {
    const before = S().solids().find((x) => x.id === castleId);
    const turretIds = before.steps.filter((st) => st.name === 'turret').map((st) => st.id);
    assert(turretIds.length === 1, `${turretIds.length} steps named turret`);
    const others = before.steps.filter((st) => st.name !== 'turret').map((st) => st.id);

    const read = S().fieldRead('make the turrets taller');
    assert(read.kind === 'phrase', `it read as ${read.kind}: "${read.line}"`);
    assert(/regen turret — taller/.test(read.line), `the reading line said "${read.line}"`);
    const ran = S().field('make the turrets taller');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 140));

    const after = S().solids().find((x) => x.id === castleId);
    assert(after.broken === null, `the derivation broke: ${after.broken}`);
    for (const id of others) assert(after.steps.some((st) => st.id === id), `the step ${id} lost its id in the regen`);
    const newTurret = after.steps.find((st) => st.name === 'turret');
    assert(newTurret, 'the turret went away');
    assert(!turretIds.includes(newTurret.id), 'the turret kept its old id — it was not replaced');
    assert(after.steps.some((st) => st.name === 'castle'), 'the castle went with the turret');
    return { kept: others, was: turretIds, now: newTurret.id };
  });

  step('typing *turret* afterwards completes from the library, before any model is asked', () => {
    const read = S().fieldRead('turret');
    assert(read.kind === 'definition', `it read as ${read.kind}: "${read.line}"`);
    assert(/a definition, based on castle/.test(read.line), `the reading line said "${read.line}"`);
    assert(read.enabled, 'Enter would do nothing');
    // And it is NOT a brief: the library answered, so no model is in the line.
    assert(!/asks e2e-stub/.test(read.line), `it still asks a model: "${read.line}"`);
    return { line: read.line };
  });

  step('*the tops are red* and *remove the turret* are tier 1, with no model in them', () => {
    const paint = S().fieldRead('the tops are red');
    assert(paint.kind === 'phrase', `it read as ${paint.kind}: "${paint.line}"`);
    assert(/paint top red/.test(paint.line), `the reading line said "${paint.line}"`);
    assert(/tier 1/.test(paint.line), `it does not say tier 1: "${paint.line}"`);
    S().field('the tops are red');
    const red = S().materials(castleId);
    assert(red.some((m) => m.name === 'top' && m.colour === 'red'), `the materials are ${JSON.stringify(red)}`);

    const drop = S().fieldRead('remove the turret');
    assert(/remove turret/.test(drop.line), `the reading line said "${drop.line}"`);
    S().field('remove the turret');
    const after = S().solids().find((x) => x.id === castleId);
    assert(!after.steps.some((st) => st.name === 'turret'), 'the turret is still in the tree');
    assert(after.steps.some((st) => st.name === 'castle'), 'the castle went with it');
    assert(after.broken === null, `the derivation broke: ${after.broken}`);
    S().undo();
    S().undo();
    return { painted: red, left: after.steps.map((st) => st.op) };
  });

  step('a phrase the table cannot read is handed back, not guessed at', () => {
    const read = S().fieldRead('the turrets should feel more medieval');
    assert(read.kind === 'phrase', `it read as ${read.kind}: "${read.line}"`);
    assert(/ask e2e-stub what/.test(read.line), `the reading line said "${read.line}"`);
    assert(/is a name this space knows/.test(read.line), `it does not say what it did understand: "${read.line}"`);
    return { line: read.line };
  });

  step('Esc stops a call in flight, and nothing is written', async () => {
    const solid = S().solids().find((x) => x.id === castleId);
    const versions = solid.versions;
    const steps = solid.steps.length;
    // The same seat, re-stubbed with a slow reply: `first()` is who a brief
    // goes to, and a second stub beside it would only raise the question of
    // which one answers.
    S().joinStub([{ text: CASTLE_REPLY, delayMs: 5000 }]);
    S().select(castleId);
    const ran = S().field('a lighthouse on a rock');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 60));
    assert(S().models().working.length >= 1, 'nothing was registered as in flight');

    const stopped = S().cancel();
    assert(stopped >= 1, 'Esc stopped nothing');
    await new Promise((r) => setTimeout(r, 120));
    assert(S().models().working.length === 0, 'something is still in flight');

    const after = S().solids().find((x) => x.id === castleId);
    assert(after.versions === versions, `${after.versions} versions after the stop, expected ${versions}`);
    assert(after.steps.length === steps, `${after.steps.length} steps after the stop, expected ${steps}`);
    return { stopped, versions: after.versions };
  });

  // ===== P6 — names, and the loop in 3D =====================================
  // "Save the mug as *mug*; draw its profile elsewhere; *mug 0.8x* is offered
  // and one tap places it."
  //
  // The box is built exactly as P2 builds it and named by the hand; *Take it*
  // holds it in the library with the outlines it was made from. Everything
  // after is about one question: is this outline one of those?

  const P6 = { x0: -7, x1: -3, z0: -2, z1: 0.6, top: 2.4 };
  /** The same footprint drawn again, three quarters the size and well clear. */
  const AGAIN = { x: -1.6, z: 3.2, w: 3, h: 1.95 };

  let p6Box = null;
  let againId = null;

  step('a box, named by the hand and TAKEN — the library holds it', () => {
    S().clear();
    S().view('free');
    S().choose('foundation');
    const base = S().strokeScreen(onScreen(rectPath(P6.x0, P6.z0, P6.x1 - P6.x0, P6.z1 - P6.z0)));
    assert(base, 'no profile was made');
    S().choose('height');
    const ext = S().strokeScreen(onScreen(linePath({ x: P6.x0, y: 0 }, { x: P6.x0, y: -P6.top })));
    assert(ext, 'no extent was made');
    p6Box = S().solids()[0].id;

    S().select(p6Box);
    const named = S().field('name: box');
    assert(named.ran, `naming did nothing: "${named.line}"`);
    const take = S().fieldRead('Take it');
    assert(take.enabled, `Take it was not offered: "${take.line}"`);
    const took = S().field('Take it');
    assert(took.ran, `Enter did nothing: "${took.line}"`);

    const defs = S().definitions();
    assert(defs.length === 1, `${defs.length} definitions, expected 1`);
    assert(defs[0].name === 'box', `it is called ${defs[0].name}`);
    assert(defs[0].whole === true, 'the WHOLE was not held as a definition');
    // The profile it would be recognised by — and NOT the extent, because a
    // line is not an outline.
    assert(defs[0].profiles.length === 1, `${defs[0].profiles.length} profiles held, expected 1`);
    assert(defs[0].profiles[0].markId === base, `it holds ${defs[0].profiles[0].markId}, not the plan`);
    assert(defs[0].profiles[0].planeKind === 'foundation', `on the ${defs[0].profiles[0].planeKind}`);
    assert(!defs[0].profiles.some((p) => p.markId === ext), 'the EXTENT was held as a profile — a line is not an outline');
    return { solid: p6Box, definitions: defs.map((d) => `${d.name}${d.whole ? ' (whole)' : ''}`), profiles: defs[0].profiles };
  });

  step('the profile drawn again is OFFERED, with a number and a reason', () => {
    S().choose('foundation');
    againId = S().strokeScreen(onScreen(rectPath(AGAIN.x, AGAIN.z, AGAIN.w, AGAIN.h)));
    assert(againId, 'no mark was made');
    const m = markOf(againId);
    assert(m.plays.role === 'profile', `it plays ${m.plays.role}`);
    assert(!m.plays.against, 'it was read as a profile OF the box — it is drawn clear of it');
    assert(S().solids().length === 1, 'drawing it stood something up');

    const matches = S().matches(againId);
    assert(matches.length >= 1, 'the library offered nothing');
    assert(matches[0].name === 'box', `the top match is ${matches[0].name}`);
    assert(matches[0].score > 0.7, `box ${matches[0].score} — under the floor`);
    assert(matches[0].whole === true, 'it is not offered as the whole thing');
    assert(/corners against/.test(matches[0].reasoning), `the reason was "${matches[0].reasoning}"`);
    assert(/the same kind of plane/.test(matches[0].reasoning), `it does not say the plane agreed: "${matches[0].reasoning}"`);
    // The chip stands beside the mark, and the panel carries the row.
    const chip = S().chipFor(`library:${againId}`);
    assert(chip, 'no chip stands beside the mark');
    // The same outline drawn again at three quarters the size is the same
    // outline: the size is what the placement scales by, not what makes it the
    // same shape, so this one reads 1.00. The mug's own plan in the demo is
    // redrawn at another proportion and reads 0.97 — a measurement either way.
    assert(/^box [01]\.\d\d$/.test(chip), `the chip says "${chip}"`);
    const text = S().panelText();
    assert(/could be/.test(text), 'the panel has no *could be* row');
    assert(/box/.test(text), 'the panel does not name the match');
    return { id: againId, chip, matches };
  });

  step('*Place box* and *Not a box* both stand, both tier 1', () => {
    S().select(againId);
    const place = S().fieldRead('Place box');
    assert(place.enabled, `Place was not offered: "${place.line}"`);
    assert(/tier 1/.test(place.line), `it does not say tier 1: "${place.line}"`);
    assert(/scaled so/.test(place.line), `it does not say what it scales by: "${place.line}"`);
    assert(S().fieldRead('place it').enabled, 'the alias `place it` does not read as the placement');
    const not = S().fieldRead('Not a box');
    assert(not.enabled, `Not a box was not offered: "${not.line}"`);
    assert(/rejected example/.test(not.line), `the correction does not say what it holds: "${not.line}"`);
    // Typing the NAME does the same thing, and says where before Enter.
    const named = S().fieldRead('box');
    assert(named.kind === 'definition', `it read as ${named.kind}`);
    assert(new RegExp(`place it at ${againId}`).test(named.line), `the reading line said "${named.line}"`);
    return { place: place.line, not: not.line, name: named.line };
  });

  step('one tap places it: a second solid, from the library, scaled to fit', () => {
    const before = S().solids().length;
    const ran = S().field('Place box');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    const solids = S().solids();
    assert(solids.length === before + 1, `${solids.length} solids, expected ${before + 1}`);
    const placed = solids[solids.length - 1];
    assert(placed.id !== p6Box, 'it went into the first solid instead of standing on its own');
    assert(placed.name === 'box', `it is called ${placed.name}`);
    assert(placed.named === 'human', `it was named by ${placed.named} — the name came out of the library`);
    assert(placed.broken === null, `the derivation broke: ${placed.broken}`);
    assert(placed.steps.length === 1 && placed.steps[0].op === 'place', `steps: ${placed.steps.map((s) => s.op).join(', ')}`);
    assert(placed.steps[0].from.includes(againId), 'the step does not reference the outline it stands at');
    assert(/placed from box/.test(placed.steps[0].reasoning), `the reason was "${placed.steps[0].reasoning}"`);
    assert(/every time the tree is walked/.test(placed.steps[0].reasoning), 'the step does not say it holds no pose');

    // THE BODY IS REALLY THERE, where the outline was drawn and no bigger.
    const cx = AGAIN.x + AGAIN.w / 2;
    const cz = AGAIN.z + AGAIN.h / 2;
    const hit = S().rayDown({ x: cx, z: cz });
    assert(hit, 'nothing stands where the outline was drawn');
    assert(hit.solidId === placed.id, `the ray met ${hit.solidId}`);
    // 3 × 1.95 against 4 × 2.6 is three quarters, so is the height.
    assert(Math.abs(hit.y - P6.top * 0.75) < 0.12, `it stands ${hit.y.toFixed(2)} high, expected ${(P6.top * 0.75).toFixed(2)}`);
    assert(S().rayDown({ x: cx + AGAIN.w, z: cz }) === null, 'it is wider than the outline that was drawn');
    // The original is untouched: one tree each, two things.
    const first = S().solids().find((s) => s.id === p6Box);
    assert(first.steps.length === 1 && first.steps[0].op === 'extrude', 'the original tree changed');
    assert(/placed from box/.test(S().panelText()), 'the panel does not say where it came from');
    return { placed: placed.id, top: +hit.y.toFixed(3), steps: placed.steps.map((s) => s.op), status: S().state().status };
  });

  // UI-2's verified bug, on the path that exposed it: a placement is made by
  // the ENGINE — a `place` step, tier 1 arithmetic on two outlines — and the
  // panel used to print *a model proposed it* over that. It says where the
  // thing came from now, and it separates THIS operation's author from the
  // ancestry of the definition it reused. Here that ancestry is the engine's
  // own: the box was made at tier 1 and the hand took it.
  step('the placed box says it was placed, from a definition the engine made and you took', () => {
    const rows = summaryRows();
    assert(rows.what === 'box', `what said "${rows.what}"`);
    assert(rows.from === 'placed from box, a definition the engine made and you took', `from said "${rows.from}"`);
    assert(/a placement of box → a thing of its own/.test(rows.becomes || ''), `becomes said "${rows.becomes}"`);
    const why = summaryText();
    assert(/tier 1, and no model was asked for it/.test(why), `the reason does not say whose act it is: "${why}"`);
    assert(/the ancestry named is the DEFINITION's/.test(why), 'the two authorships are not told apart');
    assert(!/proposed/.test(why), `an engine-placed body claims a proposal: "${why}"`);
    return { rows };
  });

  step('undo takes the placement off and leaves both inks', () => {
    S().undo();
    assert(S().solids().length === 1, `${S().solids().length} solids after the undo`);
    assert(S().state().marks.some((m) => m.id === againId), 'the undo took the outline with it');
    const cx = AGAIN.x + AGAIN.w / 2;
    assert(S().rayDown({ x: cx, z: AGAIN.z + AGAIN.h / 2 }) === null, 'the placed body is still standing');
    return { solids: S().solids().length, marks: S().state().marks.length };
  });

  step('*Not a box* is held, and the same outline is never offered again', () => {
    S().select(againId);
    const ran = S().field('Not a box');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    assert(S().matches(againId).length === 0, 'it is still offered as a box');
    const defs = S().definitions();
    assert(defs[0].rejected === 1, `${defs[0].rejected} rejected examples held`);
    assert(/not a box/.test(S().state().status), `the status said "${S().state().status}"`);

    // And an outline LIKE it, drawn somewhere else, is refused too — the
    // correction is about the shape that was corrected, not about one stroke.
    const twinId = S().strokeScreen(onScreen(rectPath(AGAIN.x + 5, AGAIN.z, AGAIN.w, AGAIN.h)));
    assert(twinId, 'no mark was made');
    assert(S().matches(twinId).length === 0, 'a second outline like the corrected one is still offered');
    S().undo(); // the twin

    // One undo takes the correction back.
    S().undo();
    assert(S().definitions()[0].rejected === 0, 'the correction did not come off');
    assert(S().matches(againId).some((m) => m.name === 'box'), 'the offer did not come back');
    return { rejected: 1, then: 0 };
  });

  step('a model that answers {"reuse": …} places from the library and writes nothing', async () => {
    // The brief lists what the library holds, so this is the reply a model
    // gives when it is already there (v9 S5's rule).
    S().joinStub([JSON.stringify({ reuse: 'box' })]);
    const brief = S().brief('another one like that');
    assert(/DEFINITIONS THE LIBRARY HOLDS/.test(brief), 'the brief does not list the library');
    assert(/“box” \(the whole of it\) — 1 step, recognised by 1 profile/.test(brief), `the brief says: ${brief.split('\n').find((l) => /“box”/.test(l))}`);

    const solidsBefore = S().solids().length;
    const versionsBefore = S().solids().find((s) => s.id === p6Box).versions;
    S().select(againId);
    const ran = S().field('another one like that');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 140));

    assert(S().solids().length === solidsBefore + 1, 'nothing was placed');
    const placed = S().solids()[S().solids().length - 1];
    assert(placed.steps[0].op === 'place', `the reply wrote a ${placed.steps[0].op} instead of placing`);
    assert(S().solids().find((s) => s.id === p6Box).versions === versionsBefore, 'a version was written into the solid the brief was about');
    assert(/placed from the library, not written/.test(S().state().status), `the status said "${S().state().status}"`);
    S().undo();
    return { placed: placed.id, status: 'placed from the library, not written' };
  });

  // ---- the navigation gizmo (the compass in the corner) ---------------------
  //
  // The plane picker at the world origin says where ink LANDS; the compass in
  // the corner says where the EYE is. These eight drive the second one through
  // the same surface a hand reaches — `__shard.nav.tap` is the tap, `nav.drag`
  // dispatches real pointer events on the widget — and assert the camera, not
  // the widget: what a compass is for is the camera.

  step('the compass turns with the camera, and the chosen plane lights its ball', () => {
    S().clear();
    S().view('free');
    S().choose('foundation');
    const balls = S().nav.balls();
    assert(balls.length === 6, `${balls.length} balls`);
    // Farthest first, so a painter draws the near ones over the far ones.
    for (let i = 1; i < balls.length; i++) assert(balls[i].depth <= balls[i - 1].depth, 'the balls are not depth-sorted');
    assert(balls.filter((b) => b.label).map((b) => b.label).sort().join('') === 'XYZ', 'the positive ends are not labelled X, Y, Z');
    // The foundation is XZ, so the ball that faces it is Y — and its opposite.
    const lit = balls.filter((b) => b.chosen).map((b) => b.view).sort();
    assert(JSON.stringify(lit) === JSON.stringify(['bottom', 'top']), `the lit balls are ${JSON.stringify(lit)}`);
    S().choose('height');
    const lit2 = S().nav.balls().filter((b) => b.chosen).map((b) => b.view).sort();
    assert(JSON.stringify(lit2) === JSON.stringify(['back', 'front']), `the height plane lit ${JSON.stringify(lit2)}`);
    return { lit: lit2, labels: balls.filter((b) => b.label).map((b) => `${b.label}·${b.view}`) };
  });

  step('tap the Z ball — the camera looks along −Z, and again flips it to +Z', () => {
    const went = S().nav.tap('z');
    assert(went === 'front', `it went to ${went}`);
    const f = S().state().camera.forward;
    assert(Math.abs(f.x) < 0.01 && Math.abs(f.y) < 0.01 && Math.abs(f.z + 1) < 0.01, `forward is ${JSON.stringify(f)}`);
    assert(S().state().camera.view === 'front', `the camera says ${S().state().camera.view}`);

    const back = S().nav.tap('z');
    assert(back === 'back', `the second tap went to ${back}`);
    const g = S().state().camera.forward;
    assert(Math.abs(g.z - 1) < 0.01 && Math.abs(g.x) < 0.01 && Math.abs(g.y) < 0.01, `forward is ${JSON.stringify(g)}`);
    return { first: went, second: back, forward: g };
  });

  step('an axis view goes ORTHO by itself, and the matrix really is parallel', () => {
    assert(S().state().camera.projection === 'ortho', 'a snap did not take the ortho lens');
    assert(S().state().camera.parallel === true, 'the flag says ortho and the projection matrix does not');
    return { projection: 'ortho', parallel: true };
  });

  step('a drag ON the compass orbits, and orbiting off the axis comes back to perspective', () => {
    const before = S().state().camera.azimuth;
    const svg = document.querySelector('#nav .compass').getBoundingClientRect();
    const cx = svg.left + svg.width / 2;
    const cy = svg.top + svg.height / 2;
    S().nav.drag([
      { x: cx, y: cy },
      { x: cx + 20, y: cy + 4 },
      { x: cx + 55, y: cy + 12 },
    ]);
    const after = S().state().camera.azimuth;
    assert(Math.abs(after - before) > 5, `the azimuth went ${before} → ${after}`);
    assert(S().state().camera.view === null, 'a drag that big left the camera on an axis');
    // Auto-perspective: off the axis, depth is what says a thing is solid.
    assert(S().state().camera.projection === 'persp', 'it stayed orthographic off the axis');
    return { azimuth: `${before} → ${after}`, projection: 'persp' };
  });

  // The rotation respects the translation of the view (16 Sep 2026). An orbit
  // used to move the target ONTO its pivot and rebuild the camera from where it
  // stood, which re-aimed it: the pivot swung to the middle of the screen the
  // moment a drag began, and a view the hand had panned off-centre snapped back.
  // Now the target IS the pivot unless something is selected, and a selection's
  // pivot turns camera and target rigidly together — so nothing moves at the
  // first pixel either way.

  step('pan the view, then orbit — the centre stays where the hand put it', () => {
    S().clear();
    S().view('free');
    S().choose(null);
    const home = S().state().camera.target;
    S().pan(150, -95);
    const panned = S().state().camera.target;
    const moved = Math.hypot(panned.x - home.x, panned.y - home.y, panned.z - home.z);
    assert(moved > 0.5, `the pan moved the target by ${moved.toFixed(4)} — it did not pan`);

    const before = S().state().camera;
    S().orbit(0.7, 0.18);
    const after = S().state().camera;
    const drift = Math.hypot(
      after.target.x - panned.x,
      after.target.y - panned.y,
      after.target.z - panned.z
    );
    assert(drift < 1e-9, `the orbit dragged the centre ${drift.toFixed(6)} from where the pan left it`);
    assert(Math.abs(after.dist - before.dist) < 1e-9, `the orbit changed the distance ${before.dist} → ${after.dist}`);
    assert(Math.abs(after.azimuth - before.azimuth) > 5, `the azimuth went ${before.azimuth} → ${after.azimuth} — it did not turn`);
    return { panned: +moved.toFixed(3), drift, azimuth: `${before.azimuth} → ${after.azimuth}` };
  });

  step('with a mark selected the orbit is rigid — the first pixel moves nothing', () => {
    S().choose('foundation');
    const id = S().strokeScreen(onScreen(circlePath(0.6, 0.4, 1.2)));
    assert(id, 'no mark was made');
    S().select(id);
    S().pan(-120, 70);
    const before = S().state().camera;
    // A press and a release with no travel between them. The old rule re-aimed
    // the camera on pointerdown alone, so this was the whole of the snap.
    S().orbit(0, 0);
    const still = S().state().camera;
    const jump = Math.hypot(
      still.target.x - before.target.x,
      still.target.y - before.target.y,
      still.target.z - before.target.z
    );
    assert(jump < 1e-9, `starting an orbit moved the view ${jump.toFixed(6)} before the hand travelled a pixel`);
    assert(Math.abs(still.azimuth - before.azimuth) < 1e-9, `it re-aimed the camera: ${before.azimuth} → ${still.azimuth}`);
    // A real turn about the selection then keeps the distance: rigid, not a dolly.
    S().orbit(0.5, 0.1);
    const after = S().state().camera;
    assert(Math.abs(after.dist - before.dist) < 1e-9, `the distance went ${before.dist} → ${after.dist}`);
    assert(Math.abs(after.azimuth - before.azimuth) > 3, `the azimuth went ${before.azimuth} → ${after.azimuth}`);
    S().select(null);
    S().clear();
    return { jump, dist: after.dist, azimuth: `${before.azimuth} → ${after.azimuth}` };
  });

  // Trackpad and touch (16 Sep 2026). John: *"Make the view work with trackpad
  // and touch."* Both reach the page through events the shard was reading as
  // one thing — every wheel was a dolly, and two fingers only ever panned — so
  // what these steps assert is that the same event, in a different SHAPE, now
  // moves the camera a different way.

  step('a notch dollies, a swipe orbits, shift + swipe pans, a pinch dollies', () => {
    S().clear();
    S().view('free');
    S().choose(null);
    const r = S().viewport();
    const mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

    // 1 · A mouse wheel: one axis, whole, large. The dolly it always had.
    const b1 = S().state().camera;
    spin({ deltaY: 120 }, mid);
    const a1 = S().state().camera;
    assert(a1.dist > b1.dist + 0.01, `a notch left the distance at ${b1.dist} → ${a1.dist}`);
    assert(Math.abs(a1.azimuth - b1.azimuth) < 1e-9, `a notch turned the view to ${a1.azimuth}`);

    // 2 · A trackpad swipe: small, fractional, on two axes. It orbits.
    const b2 = S().state().camera;
    for (let i = 0; i < 12; i++) spin({ deltaX: 24, deltaY: -1.5 }, mid);
    const a2 = S().state().camera;
    assert(Math.abs(a2.azimuth - b2.azimuth) > 5, `the swipe went ${b2.azimuth} → ${a2.azimuth}`);
    assert(Math.abs(a2.dist - b2.dist) < 1e-9, `the swipe zoomed: ${b2.dist} → ${a2.dist}`);
    assert(apart(a2.target, b2.target) < 1e-9, 'the swipe dragged the centre of the view');

    // 3 · Shift + swipe pans, and turns nothing.
    const b3 = S().state().camera;
    for (let i = 0; i < 8; i++) spin({ deltaX: 24, deltaY: -12, shiftKey: true }, mid);
    const a3 = S().state().camera;
    const panned = apart(a3.target, b3.target);
    assert(panned > 0.2, `shift + swipe moved the centre by ${panned.toFixed(4)} — it did not pan`);
    assert(Math.abs(a3.azimuth - b3.azimuth) < 1e-9, `shift + swipe turned the view to ${a3.azimuth}`);
    assert(Math.abs(a3.dist - b3.dist) < 1e-9, `shift + swipe zoomed: ${b3.dist} → ${a3.dist}`);

    // 4 · Ctrl + wheel is how macOS sends a pinch. It dollies, and IN.
    const b4 = S().state().camera;
    for (let i = 0; i < 8; i++) spin({ deltaY: -12, ctrlKey: true }, mid);
    const a4 = S().state().camera;
    assert(a4.dist < b4.dist - 0.01, `the pinch left the distance at ${b4.dist} → ${a4.dist}`);
    assert(Math.abs(a4.azimuth - b4.azimuth) < 1e-9, `the pinch turned the view to ${a4.azimuth}`);
    return {
      notch: `${b1.dist} → ${a1.dist}`,
      swipe: `${b2.azimuth}° → ${a2.azimuth}°`,
      pan: +panned.toFixed(3),
      pinch: `${b4.dist} → ${a4.dist}`,
    };
  });

  step('two fingers pinch or orbit; three fingers pan', () => {
    S().clear();
    S().view('free');
    S().choose(null);
    const r = S().viewport();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // 1 · A pinch: the fingers spread, the centre between them does not move.
    const b1 = S().state().camera;
    fingers('touchstart', [[cx - 60, cy], [cx + 60, cy]]);
    for (let i = 1; i <= 10; i++)
      fingers('touchmove', [[cx - 60 - i * 12, cy], [cx + 60 + i * 12, cy]]);
    fingers('touchend', []);
    const a1 = S().state().camera;
    assert(a1.dist < b1.dist - 0.01, `spreading two fingers left the distance at ${b1.dist} → ${a1.dist}`);
    assert(Math.abs(a1.azimuth - b1.azimuth) < 1e-9, `the pinch turned the view to ${a1.azimuth}`);
    assert(apart(a1.target, b1.target) < 1e-9, 'the pinch dragged the centre of the view');

    // 2 · Two fingers dragging together: an orbit, about the view's centre.
    const b2 = S().state().camera;
    fingers('touchstart', [[cx - 50, cy], [cx + 50, cy]]);
    for (let i = 1; i <= 12; i++)
      fingers('touchmove', [[cx - 50 + i * 14, cy - i * 3], [cx + 50 + i * 14, cy - i * 3]]);
    fingers('touchend', []);
    const a2 = S().state().camera;
    assert(Math.abs(a2.azimuth - b2.azimuth) > 5, `the two-finger drag went ${b2.azimuth} → ${a2.azimuth}`);
    assert(Math.abs(a2.dist - b2.dist) < 1e-9, `the two-finger drag zoomed: ${b2.dist} → ${a2.dist}`);
    assert(apart(a2.target, b2.target) < 1e-9, 'the two-finger drag dragged the centre of the view');

    // 3 · Three fingers pan, and turn nothing.
    const b3 = S().state().camera;
    fingers('touchstart', [[cx - 80, cy], [cx, cy], [cx + 80, cy + 40]]);
    for (let i = 1; i <= 8; i++)
      fingers('touchmove', [
        [cx - 80 + i * 14, cy - i * 8],
        [cx + i * 14, cy - i * 8],
        [cx + 80 + i * 14, cy + 40 - i * 8],
      ]);
    fingers('touchend', []);
    const a3 = S().state().camera;
    const moved = apart(a3.target, b3.target);
    assert(moved > 0.2, `three fingers moved the centre by ${moved.toFixed(4)} — they did not pan`);
    assert(Math.abs(a3.azimuth - b3.azimuth) < 1e-9, `three fingers turned the view to ${a3.azimuth}`);
    assert(Math.abs(a3.dist - b3.dist) < 1e-9, `three fingers zoomed: ${b3.dist} → ${a3.dist}`);
    return {
      pinch: `${b1.dist} → ${a1.dist}`,
      orbit: `${b2.azimuth}° → ${a2.azimuth}°`,
      pan: +moved.toFixed(3),
    };
  });

  step('one finger draws; a second finger drops the stroke the first had begun', () => {
    S().clear();
    S().choose('foundation');
    const r = S().viewport();
    // Well clear of the picker standing at the centre: a pointer that lands on
    // it is CLAIMED and never becomes ink, which would let the second half of
    // this step pass for a reason that has nothing to do with the rule.
    const cx = r.left + r.width * 0.25;
    const cy = r.top + r.height * 0.72;
    const finger = (pid, type, x, y, buttons) =>
      stage().dispatchEvent(
        new PointerEvent(type, {
          pointerId: pid,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          buttons,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
      );
    const drag = (pid, n) => {
      finger(pid, 'pointerdown', cx - 40, cy, 1);
      for (let i = 1; i <= n; i++) finger(pid, 'pointermove', cx - 40 + i * 8, cy + i * 3, 1);
    };

    // 1 · One finger, all the way through: a mark, exactly as before.
    const alone = ++touchId;
    drag(alone, 10);
    finger(alone, 'pointerup', cx + 40, cy + 30, 0);
    const drew = S().state().marks.length;
    assert(drew === 1, `one finger left ${drew} marks — drawing is broken`);

    // 2 · The same stroke, interrupted. A screen cannot know the second finger
    //     is coming, so there is already a live stroke when it lands.
    S().clear();
    const first = ++touchId;
    drag(first, 6);
    const second = ++touchId;
    finger(second, 'pointerdown', cx + 60, cy, 1);
    fingers('touchstart', [[cx + 8, cy + 18], [cx + 60, cy]]);
    for (let i = 1; i <= 8; i++)
      fingers('touchmove', [[cx + 8 - i * 10, cy + 18], [cx + 60 + i * 10, cy]]);
    fingers('touchend', []);
    finger(first, 'pointerup', cx + 8, cy + 18, 0);
    finger(second, 'pointerup', cx + 60, cy, 0);
    const left = S().state().marks.length;
    assert(left === 0, `the pinch left ${left} stray mark(s) on the board`);
    S().clear();
    S().choose(null);
    return { oneFinger: drew, afterPinch: left };
  });

  // ---- the axis view IS the choice (16 September 2026) --------------------
  //
  // John: "in explicitly selected gizmo x, y, or z, treat that surface as
  // selected automatically rather than needing the plane click; hide the plane
  // click option when in a gizmo-clicked x, y, or z; only show the planes when
  // in alt views." The camera and the pen were two decisions where a hand
  // makes one: standing square onto the height plane and THEN clicking the
  // height tile is saying it twice.

  step('tapping a ball chooses the plane that view faces, and the tiles go away', () => {
    S().clear();
    S().view('free');
    S().choose(null);
    assert(S().state().tiles === true, 'the tiles were already hidden in a free view');

    const went = S().nav.tap('z');
    assert(went === 'front', `it went to ${went}`);
    assert(S().state().chosen === 'height', `the front view chose ${S().state().chosen}`);
    assert(S().state().viewChose === true, 'the view does not own the choice');
    assert(S().state().tiles === false, 'the picker still shows its tiles in an axis view');
    const said = S().state().status;
    assert(/^front · height chosen/.test(said), `the status line said "${said}"`);
    // The ink says the camera chose it, not a tile nobody held.
    assert(/front view faces it/.test(S().state().chosenWhy), `the reason is "${S().state().chosenWhy}"`);
    // The compass still says WHICH plane: the ball you tapped is the lit one.
    const lit = S().nav.balls().filter((b) => b.chosen).map((b) => b.view).sort();
    assert(JSON.stringify(lit) === JSON.stringify(['back', 'front']), `the lit balls are ${JSON.stringify(lit)}`);
    return { went, chosen: S().state().chosen, tiles: false, status: said };
  });

  step('a rectangle drawn there lands on the height plane, chosen', () => {
    const id = S().strokeScreen(onScreen(rectPath(-2, -1.2, 3.4, 2.2)));
    assert(id, 'no mark was made');
    const m = markOf(id);
    assert(m.plane.name === 'height', `it landed on ${m.plane.name}`);
    assert(m.plane.source === 'chosen', `the source is ${m.plane.source} — the view's choice must be the same decision a tile makes`);
    // …and the ink says who chose it. A tile nobody held is not the reason.
    assert(/front view faces it/.test(m.plane.why), `the ink's reason is "${m.plane.why}"`);
    assert(m.readings[0].label === 'rectangle', `it read as ${m.readings[0].label}`);
    S().undo();
    return { plane: m.plane.name, source: m.plane.source, why: m.plane.why };
  });

  step('the other two axes choose the other two planes, and the flip keeps the plane', () => {
    S().nav.tap('y');
    assert(S().state().chosen === 'foundation', `the top view chose ${S().state().chosen}`);
    assert(/^top · foundation chosen/.test(S().state().status), `the status said "${S().state().status}"`);
    // The second tap flips to the underside — the same plane, seen from below.
    const back = S().nav.tap('y');
    assert(back === 'bottom', `the flip went to ${back}`);
    assert(S().state().chosen === 'foundation', `the bottom view chose ${S().state().chosen}`);
    S().nav.tap('x');
    assert(S().state().chosen === 'width', `the right view chose ${S().state().chosen}`);
    assert(S().state().tiles === false, 'the tiles came back inside an axis view');
    return { top: 'foundation', bottom: 'foundation', right: 'width' };
  });

  step('orbit off the axis — the tiles come back, and the plane was the VIEW’S', () => {
    // Nothing was ever chosen by hand in this run, so nothing comes back: the
    // board is read from what you draw again. `planeAfterLeavingAxisView` is
    // the one line that decides this.
    S().orbit(0.6, 0.22);
    assert(S().state().camera.view === null, 'the orbit stayed on the axis');
    assert(S().state().tiles === true, 'the picker did not put its tiles back in an alt view');
    assert(S().state().chosen === null, `the view's choice outlived the view: ${S().state().chosen}`);
    assert(S().state().viewChose === false, 'the view still claims the choice');
    assert(/plane read from what you draw/.test(S().state().status), `the status said "${S().state().status}"`);
    return { tiles: true, chosen: null, status: S().state().status };
  });

  step('a tile the HAND held outlives the axis view it was carried through', () => {
    S().choose('width'); // the hand's own, in an alt view
    assert(S().state().chosen === 'width', 'the tile did not take');
    S().nav.tap('y'); // the top view takes over: foundation
    assert(S().state().chosen === 'foundation', `the top view chose ${S().state().chosen}`);
    S().orbit(0.6, 0.2); // …and leaves again
    assert(S().state().camera.view === null, 'the orbit stayed on the axis');
    assert(S().state().chosen === 'width', `the hand's own tile did not come back: ${S().state().chosen}`);
    assert(/width chosen — the tile you held/.test(S().state().status), `the status said "${S().state().status}"`);
    return { through: 'foundation', back: 'width' };
  });

  step('0 in an axis view un-chooses, and the tiles come back with it', () => {
    S().nav.tap('z');
    assert(S().state().tiles === false, 'the tiles did not go away');
    assert(S().state().chosen === 'height', `the front view chose ${S().state().chosen}`);
    S().choose(null); // John's `0`, and the centre of the picker
    assert(S().state().chosen === null, 'the un-choose did not take');
    assert(S().state().tiles === true, 'un-choosing in an axis view left the hand with no way to choose');
    assert(S().state().viewChose === false, 'the view still claims the choice');
    // And from there a tile can be held by hand, standing in the same view.
    S().choose('height');
    assert(S().state().chosen === 'height' && S().state().tiles === true, 'the tiles went away again on a hand-held tile');
    return { unchosen: true, tiles: true };
  });

  step('a plane chosen BY HAND that is edge-on from here still says so', () => {
    // The warning a snap used to carry. An axis view now always faces the
    // plane it chose, so the only way left to stand where the ink cannot land
    // is to choose it by hand — and that is where it has to be said, rather
    // than letting the pen find out (§10's last risk).
    S().nav.tap('y'); // the top view: foundation
    S().choose(null); // the tiles back
    S().choose('height'); // XY — edge-on from above
    const said = S().state().status;
    assert(/edge-on/.test(said), `the status line said "${said}"`);
    assert(/height/.test(said), `it does not name the plane: "${said}"`);
    // …and the ball that faces the plane you ARE drawing on is one tap away.
    S().nav.tap('z');
    assert(S().state().chosen === 'height', `the front view chose ${S().state().chosen}`);
    assert(/^front · height chosen/.test(S().state().status), `the status line said "${S().state().status}"`);
    S().view('free');
    S().choose(null);
    return { edgeOn: said, flatOn: S().state().status };
  });

  step('ortho changes the scale, and a stroke drawn in it still reads as it did', () => {
    // The shape rung reads at the plane's own `scaleAt`, measured through
    // whichever lens the camera has. If the toggle broke that, a rectangle
    // drawn under ortho would come back as something else, or at a scale that
    // makes every hand-space threshold wrong.
    S().choose('foundation');
    S().nav.tap('y'); // the top view: the foundation, flat on, orthographic
    assert(S().state().camera.parallel === true, 'the top view is not orthographic');
    const orthoId = S().strokeScreen(onScreen(rectPath(-2, -1.4, 4, 2.6)));
    const inOrtho = markOf(orthoId);
    assert(inOrtho.readings[0].label === 'rectangle', `it read as ${inOrtho.readings[0].label}`);
    assert(inOrtho.readings[0].weight > 0.8, `rectangle ${inOrtho.readings[0].weight}`);
    assert(inOrtho.scale > 0 && Number.isFinite(inOrtho.scale), `the scale is ${inOrtho.scale}`);

    S().nav.projection('persp');
    const perspId = S().strokeScreen(onScreen(rectPath(-2, -1.4, 4, 2.6)));
    const inPersp = markOf(perspId);
    assert(inPersp.readings[0].label === 'rectangle', `under perspective it read as ${inPersp.readings[0].label}`);
    // The same rectangle, drawn the same size in PLANE units: the two scales
    // may differ (that is what the lens does) and both must be measured.
    assert(inPersp.scale > 0 && Number.isFinite(inPersp.scale), `the perspective scale is ${inPersp.scale}`);
    S().undo();
    S().undo();
    return { ortho: +inOrtho.scale.toFixed(4), persp: +inPersp.scale.toFixed(4), reading: 'rectangle both times' };
  });

  step('home frames everything — every corner of the board is on the screen', () => {
    S().clear();
    S().view('free');
    S().choose('foundation');
    S().strokeScreen(onScreen(rectPath(-9, -3, 4, 2.6)));
    S().choose('height');
    S().strokeScreen(onScreen(linePath({ x: -9, y: 0 }, { x: -9, y: -2.4 })));
    assert(S().solids().length === 1, 'the box did not stand');
    // Deliberately off in a corner and far away first, so *home* has work.
    S().nav.tap('x');
    S().nav.projection('persp');
    S().nav.home();
    const b = S().bounds();
    assert(b, 'the board reports no bounds');
    const v = S().viewport();
    const corners = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push({ x, y, z });
    for (const c of corners) {
      const p = S().screenForWorld(c);
      assert(p.x >= v.left - 1 && p.x <= v.left + v.width + 1, `a corner is off the side at x=${Math.round(p.x)}`);
      assert(p.y >= v.top - 1 && p.y <= v.top + v.height + 1, `a corner is off the top or bottom at y=${Math.round(p.y)}`);
    }
    return { corners: corners.length, bounds: { min: b.min, max: b.max } };
  });

  step('home on an EMPTY board frames the plane picker, and says so', () => {
    S().clear();
    S().nav.home();
    assert(S().bounds() === null, 'an empty board reports bounds');
    assert(/nothing on the board/.test(S().state().status), `the status said "${S().state().status}"`);
    // The picker's own tiles are what you are looking at: the next move.
    const p = S().screenForWorld({ x: 2.6, y: 0, z: 2.6 });
    const v = S().viewport();
    assert(p.x > v.left && p.x < v.left + v.width, `the picker is off the side at x=${Math.round(p.x)}`);
    assert(p.y > v.top && p.y < v.top + v.height, `the picker is off the screen at y=${Math.round(p.y)}`);
    S().view('free');
    S().nav.projection('persp');
    return { status: S().state().status };
  });

  // ---- DATA-1: a tree that will not read is isolated, not fatal ------------

  step('a malformed tree loaded onto the board does not take the board with it', () => {
    S().clear();
    S().choose('foundation');

    // A real box, made the way a hand makes one: the rest of the board, which
    // has to go on drawing and selecting whatever arrives beside it.
    const goodProfile = S().strokeScreen(onScreen(rectPath(-7, -2, 4, 2.6)));
    S().choose('height');
    const goodExtent = S().strokeScreen(onScreen(linePath({ x: -7, y: 0 }, { x: -7, y: -DEPTH })));
    assert(S().state().solids.length === 1, 'the box did not stand');
    const goodId = S().state().solids[0].id;

    // …and an artifact whose code says it is one of ours and cannot be read:
    // an extrude with no depth — the tree that used to parse clean and then
    // threw out of `depth.toFixed()` the moment the panel described it.
    S().choose('foundation');
    const loose = S().strokeScreen(onScreen(circlePath(4, 0, 1)));
    const malformed =
      '// mm:op tree v1\n' +
      JSON.stringify({ mm: 'op', version: 1, steps: [{ id: 's1', op: 'extrude', from: [loose], reasoning: 'a box' }] });
    const badId = S().seedCode([loose], malformed, 'thing');
    assert(badId, 'the artifact was not seeded');

    // It STANDS — it did not vanish from the board — and it carries the reason.
    const solids = S().state().solids;
    assert(solids.length === 2, `${solids.length} solids, expected the box and the bad one`);
    const bad = solids.find((s) => s.id === badId);
    assert(bad, 'the malformed artifact is not on the board at all');
    assert(bad.steps.length === 0, `the malformed tree yielded ${bad.steps.length} steps`);
    assert(bad.broken, 'the malformed artifact says nothing about why');
    assert(/profile is missing/.test(bad.broken), `it says "${bad.broken}"`);
    assert(/steps\[0\]/.test(bad.broken), `it does not say where: "${bad.broken}"`);

    // The panel's *broken* row names the reason, in the panel, in words.
    S().select(badId);
    const panel = S().panelText();
    assert(/broken/.test(panel), 'the panel has no broken row');
    assert(/could not be read/.test(panel), `the panel said "${panel.replace(/\s+/g, ' ').slice(0, 200)}"`);
    assert(/profile is missing/.test(panel), 'the panel does not carry the validator\'s reason');
    assert(/still in the log/.test(panel), 'the panel does not say the code is recoverable');

    // UI-2: and the FIELD says the same thing. *Extrude* and *Cut a hole* used
    // to stand enabled over a body with no steps — verbs about a tree, offered
    // over a tree that could not be read. Two pills are afforded here and no
    // others, and every other one carries the reason rather than nothing.
    const brokenRows = summaryRows();
    assert(brokenRows.broken === 'this tree could not be read', `the summary said "${brokenRows.broken}"`);
    for (const verb of ['Extrude', 'Revolve', 'Cut a hole', 'Raise a boss', 'Mirror', 'Dup', 'Take it']) {
      const r = S().fieldRead(verb);
      assert(!r.enabled, `${verb} is still offered on a tree that could not be read`);
      assert(/this tree could not be read/.test(r.line), `${verb} says "${r.line}"`);
    }
    for (const verb of ['Remove', 'Undo']) {
      const r = S().fieldRead(verb);
      assert(r.enabled, `${verb} is not offered on a broken solid: "${r.line}"`);
    }

    // …and the other solid still selects, and still says what it is.
    S().select(goodId);
    const good = S().panelText();
    assert(/extrude/.test(good), 'the good solid lost its step');
    assert(!/could not be read/.test(good), 'the good solid was tarred with the bad one\'s reason');
    const still = S().state().solids.find((s) => s.id === goodId);
    assert(still.steps.length === 1 && still.steps[0].op === 'extrude', 'the good tree did not survive');
    assert(!still.broken, `the good solid says it is broken: ${still.broken}`);

    // …and the board still takes ink, with the bad artifact standing on it.
    const after = S().strokeScreen(onScreen(rectPath(8, -2, 2, 2)));
    assert(after, 'the board stopped taking ink');
    assert(markOf(after).readings.length > 0, 'the new mark was not read');

    S().clear();
    return {
      solids: solids.length,
      broken: bad.broken,
      goodSteps: still.steps.map((s) => s.op),
      panel: panel.replace(/\s+/g, ' ').slice(0, 200),
    };
  });

  // ---- G5: the hand in the room, and the seat ------------------------------
  //
  // The seat is a model to everything upstream of it: the field reads the same
  // brief, `runBrief` asks the same way, and the reply is applied by the same
  // code. What differs is only where the question goes — parked in the room,
  // answered by a hand. So the step drives the REAL path (`room.ts`) with a
  // second hand inside the page; the stdio half is `mcp-smoke.mjs`'s to prove.

  let handRoom = null;
  let seatSolidId = null;

  step('the hand takes the seat, and the field says Enter asks it', () => {
    S().clear();
    // Something to fill: a plan, and a line up from its edge — a box at tier 1.
    S().choose('foundation');
    const plan = S().strokeScreen(onScreen(rectPath(-2, -1.3, 4, 2.6)));
    assert(plan, 'no plan was drawn');
    S().choose('height');
    S().strokeScreen(onScreen(linePath({ x: -2, y: 0 }, { x: -2, y: -3 })));
    const solids = S().state().solids;
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    seatSolidId = solids[0].id;

    handRoom = S().joinHand();
    const seats = S().models().seats;
    // The hand takes the FRONT: `first()` is who a brief goes to, and sitting
    // down in this seat is what says *ask me* — a stub seated earlier in this
    // run would otherwise answer the brief typed at the hand.
    assert(seats[0] && seats[0].name === 'Claude Code (MCP hand)', `seated: ${JSON.stringify(seats)}`);
    // No model was asked to seat it, and nothing is parked before Enter.
    assert(handRoom.pending().length === 0, 'a brief was parked before one was typed');

    S().select(seatSolidId);
    const read = S().fieldRead('a castle with green tops');
    assert(/Claude Code \(MCP hand\)/.test(read.line), `the reading line said "${read.line}"`);
    return { line: read.line, solid: seatSolidId, me: handRoom.me };
  });

  step('Enter PARKS the brief in the room — the words and the contract reach the hand', async () => {
    S().select(seatSolidId);
    const ran = S().field('a castle with green tops');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    // The park crosses a hub, so it lands on a later microtask, not this one.
    for (let i = 0; i < 40 && handRoom.pending().length === 0; i++) await new Promise((r) => setTimeout(r, 25));

    const waiting = handRoom.pending();
    assert(waiting.length === 1, `${waiting.length} briefs parked, expected 1`);
    const brief = waiting[0];
    assert(brief.words === 'a castle with green tops', `the words came through as "${brief.words}"`);
    assert(/foundation|height|plane/i.test(brief.brief), `the brief carries no scene: "${brief.brief.slice(0, 120)}"`);
    assert(/john/.test(brief.from), `it says it came from "${brief.from}"`);
    // It is a question, not a change: nothing was written while it waits.
    const solid = S().solids().find((x) => x.id === seatSolidId);
    assert(solid.versions === 1, `${solid.versions} versions while the brief only waits`);
    // And the human is told a model is at work, in the same words as any model.
    assert(S().models().working.length === 1, `${S().models().working.length} calls in flight, expected 1`);
    return { key: brief.key, words: brief.words, brief: brief.brief.replace(/\s+/g, ' ').slice(0, 160) };
  });

  step('the hand answers, and the version lands named and green — attributed to the seat', async () => {
    const brief = handRoom.pending()[0];
    const reply = JSON.stringify({
      steps: [
        { id: 's1', op: 'extrude', profile: S().state().marks[0].id, depth: 3, name: 'castle', why: 'the plan, grown' },
        { id: 's2', op: 'boss', on: 's1', profile: 'p1', depth: 0.5, name: 'top', material: { colour: 'green' }, why: 'its cap' },
      ],
      profiles: [{ id: 'p1', shape: 'rectangle', plane: 'foundation', at: 3, centre: { x: 0, y: 0 }, w: 1.2, h: 1.2 }],
    });
    assert(handRoom.answer(brief.key, reply), 'the answer was not accepted');
    for (let i = 0; i < 60 && (S().solids().find((x) => x.id === seatSolidId) || {}).versions === 1; i++)
      await new Promise((r) => setTimeout(r, 25));

    const solid = S().solids().find((x) => x.id === seatSolidId);
    assert(solid, 'the solid went away');
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    assert(solid.versions === 2, `${solid.versions} versions held, expected 2`);

    const names = S().names().filter((n) => n.solidId === seatSolidId).map((n) => n.name).sort();
    assert(JSON.stringify(names) === JSON.stringify(['castle', 'top']), `the names are ${JSON.stringify(names)}`);
    const green = S().materials(seatSolidId);
    assert(green.length === 1 && green[0].colour === 'green', `the materials are ${JSON.stringify(green)}`);

    // The version is the SEAT'S — the hand answered it, and the seat is who the
    // shard asked, exactly as with a model.
    assert(/Claude Code \(MCP hand\)/.test(S().panelText()), 'the panel does not say who proposed it');
    assert(/tier 2/.test(S().state().status), `the status said "${S().state().status}"`);
    // Nothing is left waiting, and nothing is left in flight.
    assert(handRoom.pending().length === 0, 'the brief is still parked after it was answered');
    assert(S().models().working.length === 0, `${S().models().working.length} calls still in flight`);
    return { names, colour: green[0].colour, versions: solid.versions };
  });

  step('a refusal writes nothing, and says why in the human’s own line', async () => {
    S().select(seatSolidId);
    const before = S().solids().find((x) => x.id === seatSolidId).versions;
    const ran = S().field('a castle with red tops');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    for (let i = 0; i < 40 && handRoom.pending().length === 0; i++) await new Promise((r) => setTimeout(r, 25));
    const brief = handRoom.pending()[0];
    assert(brief, 'nothing was parked');
    assert(handRoom.refuse(brief.key, 'the drawing does not say how much taller'), 'the refusal was not accepted');
    for (let i = 0; i < 60 && !/does not say how much taller/.test(S().state().status); i++)
      await new Promise((r) => setTimeout(r, 25));

    const after = S().solids().find((x) => x.id === seatSolidId).versions;
    assert(after === before, `${before} → ${after} versions: a refusal wrote something`);
    assert(/does not say how much taller/.test(S().state().status), `the status said "${S().state().status}"`);
    assert(S().models().working.length === 0, 'the call is still in flight after a refusal');
    return { status: S().state().status, versions: after };
  });

  step('what the hand says lands on the board, in its own name', async () => {
    // `space_say`'s path: an explanation from another hand, said in the status
    // line as it arrives, because the shard draws no card for one.
    const marks = S().state().marks;
    assert(marks.length, 'no marks to speak about');
    assert(handRoom.say('the plan is 4 × 2.6 — a courtyard, not a keep', [marks[0].id]), 'it was not placed');
    for (let i = 0; i < 60 && !/courtyard/.test(S().state().status); i++) await new Promise((r) => setTimeout(r, 25));
    assert(/courtyard, not a keep/.test(S().state().status), `the status said "${S().state().status}"`);
    assert(/claude/.test(S().state().status), `it does not say whose: "${S().state().status}"`);
    return { status: S().state().status };
  });

  // ---- the runner ----------------------------------------------------------

  window.__scenario = async function () {
    const out = { ok: true, passed: 0, failed: 0, steps: [] };
    if (!S()) {
      out.ok = false;
      out.error = 'window.__shard is not there — is the page loaded?';
      return out;
    }
    for (const s of steps) {
      try {
        const detail = await s.fn();
        out.passed++;
        out.steps.push({ name: s.name, ok: true, ...(detail ? { detail } : {}) });
      } catch (err) {
        out.ok = false;
        out.failed++;
        out.steps.push({ name: s.name, ok: false, error: String(err && err.message ? err.message : err) });
        break; // a failed step makes every later one a guess
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    return out;
  };

  // ===== the two-minute demo (SHARD-3D-PLAN §9) =============================
  //
  // Steps 1–5 and the naming half of 6, end to end, with the P6 loop after it:
  // a rectangle and a line stand a box; a circle on its top is cut through; a
  // brief fills it with a handle a model names from your words; the side view
  // says what the drawing asks for and the body lacks; a regen resolves it by
  // NAME; the thing is named and taken; and its plan drawn again elsewhere is
  // offered back and placed with one tap.
  //
  // The spiral and the vine are P7–P9 and are deliberately not here.
  //
  //     __demo().then(r => window.__D = r)
  //
  // `?demo=mug` draws the same board at boot from the same numbers
  // (`window.__mug`), so what is asserted and what is shown are one thing.

  const demoSteps = [];
  const demo = (name, fn) => demoSteps.push({ name, fn });
  const MUG = () => window.__mug;

  let mugId = null;
  let mugPlan = null;
  let mugHole = null;
  let mugSide = null;
  let mugAgain = null;

  demo('1 · the foundation tile, and the mug’s plan', () => {
    S().clear();
    S().view('free');
    const m = MUG();
    assert(m, 'window.__mug is not there — the surface did not export the demo’s numbers');
    S().choose('foundation');
    mugPlan = S().strokeScreen(onScreen(rectPath(m.plan.x, m.plan.z, m.plan.w, m.plan.d)));
    assert(mugPlan, 'the plan was not drawn');
    const mark = markOf(mugPlan);
    assert(mark.readings[0].label === 'rectangle', `it read as ${mark.readings[0].label}`);
    assert(mark.readings[0].weight >= 0.8, `rectangle ${mark.readings[0].weight.toFixed(2)}`);
    assert(mark.plane.name === 'foundation' && mark.plane.source === 'chosen', `on the ${mark.plane.name} (${mark.plane.source})`);
    assert(mark.plays.role === 'profile', `it plays ${mark.plays.role}`);
    return { reading: `${mark.readings[0].label} ${mark.readings[0].weight.toFixed(2)}`, plane: `${mark.plane.name} · ${mark.plane.source}`, plays: mark.plays.role };
  });

  demo('2 · the height tile, a line up from a corner — a box stands, tier 1', () => {
    const m = MUG();
    S().choose('height');
    const ext = S().strokeScreen(onScreen(linePath({ x: m.plan.x, y: 0 }, { x: m.plan.x, y: -m.top })));
    assert(ext, 'the extent was not drawn');
    assert(markOf(ext).plays.role === 'extent', `it plays ${markOf(ext).plays.role}`);
    const solids = S().solids();
    assert(solids.length === 1, `${solids.length} solids, expected 1`);
    mugId = solids[0].id;
    assert(solids[0].steps[0].op === 'extrude', `the step is ${solids[0].steps[0].op}`);
    assert(solids[0].author === 'participant:tier0', `attributed to ${solids[0].author}`);
    assert(/tier 1/.test(S().state().status), `the status said "${S().state().status}"`);
    return { solid: mugId, step: solids[0].steps[0].op, status: S().state().status };
  });

  demo('3 · orbit, nothing chosen — a circle on the top face is a FEATURE, and *Cut a hole* takes it', () => {
    const m = MUG();
    S().choose(null);
    // Round and a little up, to the three-quarter angle the demo has always
    // shown: azimuth 77.6°, elevation 59.6°. The numbers changed on 16 Sep
    // 2026 and the PICTURE did not — an orbit used to move the target onto its
    // pivot, so (0.3, 0.3) meant something different in a sentence about the
    // camera; turning about the view's centre, the same pose is (0.664, 0.035).
    //
    // Not an arbitrary re-tune: at elevation 74.8° with azimuth 56.8° — where
    // the old numbers now land — this step used to fail while its neighbours a
    // few degrees either side passed. That was a fragility in the reading, not
    // in the camera: the pen's ray meets the box twice, both faces came back
    // under the top's own name scoring the same to the last bit of a double,
    // and row 3 measured the ink against whichever of them sorted first.
    // Chased and fixed on 16 Sep 2026 (`src/feature.test.ts` sweeps elevation
    // 30°–85° at every 15° of azimuth, and THE TIE in `planarity.ts` says why);
    // the pose here stays as it is, because the demo is not the place to test it.
    S().orbit(0.664, 0.035);
    mugHole = S().strokeScreen(
      Array.from({ length: 57 }, (_, i) => {
        const t = (i / 56) * Math.PI * 2;
        return S().screenForWorld({ x: m.hole.at.x + Math.cos(t) * m.hole.r, y: m.hole.at.y, z: m.hole.at.z + Math.sin(t) * m.hole.r });
      })
    );
    assert(mugHole, 'the circle was not drawn');
    const mark = markOf(mugHole);
    assert(mark.plane.source === 'face', `the plane read as ${mark.plane.source}, not face`);
    assert(mark.candidates[1], 'there is no runner-up to argue with');
    assert(mark.plays.role === 'feature' && mark.plays.rule === 3, `it plays ${mark.plays.role} by row ${mark.plays.rule}`);

    const cut = S().fieldRead('Cut a hole');
    assert(cut.enabled, `Cut a hole was not offered: "${cut.line}"`);
    assert(/tier 1/.test(cut.line) && /through/.test(cut.line), `the line said "${cut.line}"`);
    const ran = S().field('Cut a hole');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    const solid = S().solids()[0];
    assert(solid.steps.length === 2 && solid.steps[1].op === 'cut', `steps: ${solid.steps.map((x) => x.op).join(', ')}`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    // You can see through it.
    assert(S().rayDown({ x: m.hole.at.x, z: m.hole.at.z }) === null, 'the hole does not go through');
    return { plane: mark.plane.source, runnerUp: mark.candidates[1].label, cut: cut.line, steps: solid.steps.map((x) => x.op) };
  });

  demo('4 · *a mug with a wide handle* — a version, attributed, with a step named from your words', async () => {
    const m = MUG();
    S().joinStub([JSON.stringify(m.reply), JSON.stringify(m.wider)]);
    S().select(mugId);
    const read = S().fieldRead('a mug with a wide handle');
    assert(read.kind === 'brief', `it read as ${read.kind}`);
    assert(/asks e2e-stub/.test(read.line), `the reading line said "${read.line}"`);

    const before = S().solids()[0].versions;
    const ran = S().field('a mug with a wide handle');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 160));

    const solid = S().solids().find((x) => x.id === mugId);
    assert(solid.versions === before + 1, `${solid.versions} versions, expected ${before + 1}`);
    assert(solid.broken === null, `the derivation broke: ${solid.broken}`);
    const handle = solid.steps.find((st) => st.name === 'handle');
    assert(handle, `no step is named handle: ${solid.steps.map((st) => `${st.op}${st.name ? ':' + st.name : ''}`).join(', ')}`);
    assert(handle.by === 'e2e-stub', `the step is attributed to ${handle.by}`);
    assert(/tier 2/.test(S().state().status), `the status said "${S().state().status}"`);
    // It is really there: material stands where the handle was proposed.
    assert(S().rayDown({ x: -5.8, z: 1.6 }), 'nothing stands where the handle was proposed');
    // …and the row says how much of the drawing the body honours.
    const h = S().honours(mugId);
    assert(h && h.per.length >= 1, 'nothing was measured against the drawing');
    assert(h.per[0].view === 'top', `it measured the ${h.per[0].view} view`);
    // **Around 56%, and that is the diff being right.** The drawing it is
    // measured against is the PLAN — a plain 2.4 × 2.4 rectangle — and the body
    // now has a hole cut right through it, so seen from above it is an annulus
    // with a handle. The row is saying exactly that: the plan no longer
    // describes the thing, because the hand cut into it. What it must not do is
    // fall to nothing, or claim a match it has not got.
    assert(h.per[0].coverage > 0.5, `the ${h.per[0].view} view is only ${(h.per[0].coverage * 100).toFixed(0)}%`);
    assert(/honours the drawing/.test(h.sentence), `the sentence said "${h.sentence}"`);
    return { steps: solid.steps.map((st) => `${st.op}${st.name ? ':' + st.name : ''}`), honours: h.sentence, status: S().state().status };
  });

  demo('5 · the side view: the drawing asks for a wider handle, and the diff says so', () => {
    const m = MUG();
    S().view('side');
    S().choose('width');
    mugSide = S().strokeScreen(onScreen(loopPath(m.side)));
    assert(mugSide, 'the side profile was not drawn');
    const mark = markOf(mugSide);
    assert(mark.plays.role === 'profile' && mark.plays.rule === 2, `it plays ${mark.plays.role}`);
    assert(mark.plays.against && mark.plays.against.solidId === mugId, 'it is not read as a profile OF the mug');
    assert(mark.plays.against.view === 'side', `it is called the ${mark.plays.against.view} profile`);
    const diff = S().diffs(mugId)[0];
    assert(diff, 'the diff row is not there');
    assert(diff.missing.length >= 1, `${diff.missing.length} missing regions, expected at least 1`);
    assert(diff.missing[0].area > 0.2, `the missing region is only ${diff.missing[0].area} u²`);
    assert(/missing/.test(diff.sentence), `the sentence said "${diff.sentence}"`);
    return { plays: mark.plays.role, of: mark.plays.against.name, sentence: diff.sentence, missing: diff.missing };
  });

  demo('5b · *make the handle wider* regens THAT step alone, and the diff re-reads clean', async () => {
    const before = S().solids().find((x) => x.id === mugId);
    const handleWas = before.steps.filter((st) => st.name === 'handle');
    const others = before.steps.filter((st) => st.name !== 'handle').map((st) => st.id);
    const read = S().fieldRead('make the handle wider');
    assert(read.kind === 'phrase', `it read as ${read.kind}: "${read.line}"`);
    assert(/regen handle — wider/.test(read.line), `the reading line said "${read.line}"`);

    const ran = S().field('make the handle wider');
    assert(ran.ran, `Enter did nothing: "${ran.line}"`);
    await new Promise((r) => setTimeout(r, 180));

    const after = S().solids().find((x) => x.id === mugId);
    assert(after.broken === null, `the derivation broke: ${after.broken}`);
    for (const id of others) assert(after.steps.some((st) => st.id === id), `${id} lost its id in the regen`);
    const now = after.steps.find((st) => st.name === 'handle');
    assert(now, 'the handle went away');
    // REPLACED, not edited: the step that came back is the model's answer to
    // *wider* and stands where the old one did. Its ID may be the same number —
    // `nextStepId` fills the hole the dropped step left — so what is asserted is
    // that the STEP changed and that nothing else in the tree did.
    assert(Math.abs(now.depth) > Math.abs(handleWas[0].depth) + 0.3, `the handle is ${now.depth} deep, was ${handleWas[0].depth}`);
    assert(after.steps.length === before.steps.length, `${after.steps.length} steps, was ${before.steps.length}`);
    const diff = S().diffs(mugId)[0];
    assert(diff.missing.length === 0, `${diff.missing.length} regions still missing: ${JSON.stringify(diff.missing)}`);
    assert(diff.coverage > 0.95, `coverage ${diff.coverage.toFixed(3)}`);
    return { kept: others, was: handleWas[0].depth, now: now.depth, sentence: diff.sentence };
  });

  demo('6 · name it *mug*, take it — and mug and handle are definitions', () => {
    S().view('free');
    S().choose(null);
    S().select(mugId);
    assert(S().field('name: mug').ran, 'naming did nothing');
    const take = S().fieldRead('Take it');
    assert(take.enabled, `Take it was not offered: "${take.line}"`);
    assert(/mug/.test(take.line), `it does not say the name: "${take.line}"`);
    assert(S().field('Take it').ran, 'Take it did nothing');

    const solid = S().solids().find((x) => x.id === mugId);
    assert(solid.name === 'mug' && solid.named === 'human', `it is called ${solid.name} (${solid.named})`);
    const defs = S().definitions();
    const held = defs.map((d) => d.name).sort();
    assert(JSON.stringify(held) === JSON.stringify(['handle', 'mug']), `the definitions are ${JSON.stringify(held)}`);
    const whole = defs.find((d) => d.name === 'mug');
    assert(whole.whole === true, 'the mug was not held as the whole of it');
    assert(whole.profiles.length >= 2, `${whole.profiles.length} profiles held`);
    assert(defs.find((d) => d.name === 'handle').basedOn === 'mug', 'the handle is not based on the mug');
    return { name: solid.name, definitions: defs.map((d) => `${d.name}${d.whole ? ' (whole)' : ` ← ${d.basedOn}`} · ${d.profiles.length} profiles`) };
  });

  demo('6b · the plan drawn again elsewhere is offered back as *mug*, with a reason', () => {
    const m = MUG();
    S().choose('foundation');
    mugAgain = S().strokeScreen(onScreen(rectPath(m.again.x, m.again.z, m.again.w, m.again.d)));
    assert(mugAgain, 'the second plan was not drawn');
    const mark = markOf(mugAgain);
    assert(mark.plays.role === 'profile', `it plays ${mark.plays.role}`);
    assert(!mark.plays.against, 'it was read as a profile OF the mug — it is drawn clear of it');
    assert(S().solids().length === 1, 'drawing it stood something up by itself');

    const matches = S().matches(mugAgain);
    assert(matches.length >= 1, 'the library offered nothing');
    assert(matches[0].name === 'mug', `the top match is ${matches[0].name}`);
    assert(matches[0].score > 0.7, `mug ${matches[0].score} — under the floor`);
    assert(/corners against/.test(matches[0].reasoning), `the reason was "${matches[0].reasoning}"`);
    const chip = S().chipFor(`library:${mugAgain}`);
    assert(chip && /^mug /.test(chip), `the chip says "${chip}"`);
    assert(/could be/.test(S().panelText()), 'the panel has no *could be* row');
    return { chip, matches: matches.map((x) => `${x.name} ${x.score}`), reasoning: matches[0].reasoning };
  });

  demo('6c · one tap places it — a second mug, from the library', () => {
    const m = MUG();
    S().select(mugAgain);
    const place = S().fieldRead('Place mug');
    assert(place.enabled, `Place was not offered: "${place.line}"`);
    assert(/tier 1/.test(place.line), `it does not say tier 1: "${place.line}"`);
    assert(S().field('Place mug').ran, 'Enter did nothing');

    const solids = S().solids();
    assert(solids.length === 2, `${solids.length} solids, expected 2`);
    const placed = solids[1];
    assert(placed.name === 'mug', `it is called ${placed.name}`);
    assert(placed.steps[0].op === 'place' && /placed from mug/.test(placed.steps[0].reasoning), 'it is not a placement of the mug');
    assert(placed.broken === null, `the derivation broke: ${placed.broken}`);

    // A second mug, three quarters the size, with its hole and its handle.
    const cx = m.again.x + m.again.w / 2;
    const cz = m.again.z + m.again.d / 2;
    const scale = Math.hypot(m.again.w, m.again.d) / Math.hypot(m.plan.w, m.plan.d);
    const wall = S().rayDown({ x: cx - m.plan.w * scale * 0.45, z: cz });
    assert(wall && wall.solidId === placed.id, 'nothing stands where the outline was drawn');
    assert(Math.abs(wall.y - m.top * scale) < 0.12, `it stands ${wall.y.toFixed(2)} high, expected ${(m.top * scale).toFixed(2)}`);
    // Its hole is scaled too: a ray down the middle goes through.
    assert(S().rayDown({ x: cx, z: cz }) === null, 'the placed mug has no hole in it');
    // The first one is exactly as it was.
    assert(S().solids()[0].steps.length === 3, 'the original tree changed');
    assert(/placed from mug/.test(S().panelText()), 'the panel does not say where it came from');
    return {
      placed: placed.id,
      scale: +scale.toFixed(3),
      top: +wall.y.toFixed(3),
      panel: S().panelText().replace(/\s+/g, ' ').match(/place[^·]*·[^·]*/)?.[0] ?? '',
      status: S().state().status,
    };
  });

  // UI-2, the case the review reproduced: an engine-placed mug read `held ·
  // the engine` and then claimed *a model proposed it*. The mug's definition
  // DOES have a model in its ancestry — e2e-stub wrote the version with the
  // handle in it, and the hand took that — so the row has to tell the two
  // apart: the engine placed this one, and the definition is the model's work
  // the hand accepted.
  demo('6c2 · the placed mug’s summary: its name and its reuse provenance, above the fold', () => {
    const rows = summaryRows();
    assert(rows.what === 'mug', `what said "${rows.what}"`);
    assert(
      rows.from === 'placed from mug, a definition e2e-stub proposed and you took',
      `from said "${rows.from}"`
    );
    assert(/^↵ /.test(rows.next || ''), `next said "${rows.next}"`);
    assert(/a placement of mug → a thing of its own/.test(rows.becomes || ''), `becomes said "${rows.becomes}"`);

    // Above the fold: the summary stands before the evidence, and the evidence
    // is shut. Nothing was discarded — every row that used to lead is in it.
    const panel = S().panelText();
    assert(panel.indexOf('mug') < panel.indexOf('why / measurements'), 'the summary is not first');
    const ev = evidence();
    assert(ev && ev.open === false, 'the evidence is not behind a shut disclosure');
    const body = ev.querySelector('.evidenceBody').textContent;
    assert(/placed from mug/.test(body), 'the step reasoning left the evidence');
    assert(/honours/.test(body), 'the honours rows left the evidence');

    // The reading line and the panel say the same thing about the same verb —
    // one sentence, one place, read at the same moment. They drifted while the
    // panel was only re-read where an act happened: choosing a plane re-read
    // the field and not the panel, and the two then disagreed about which
    // plane a mirror would use.
    // Only when the panel is naming an OFFER (↵): a blocked leading row is the
    // panel saying what it would take, which the field shows as a dimmed pill.
    const line = S().fieldRead('').line;
    if (/^↵ /.test(rows.next || '')) {
      const verb = rows.next.replace(/^↵ /, '').replace(/ · asks a model$/, '');
      assert(line.indexOf(verb) === 2, `the panel says "${rows.next}" and the field says "${line}"`);
    }
    return { rows, evidenceOpen: ev.open, field: line };
  });

  demo('6d · the placed mug’s row answers about THIS mug, not the first one', () => {
    const placed = S().solids()[1];
    const h = S().honours(placed.id);
    assert(h, 'nothing was measured against the placed mug');
    assert(h.per.length >= 2, `${h.per.length} claim(s), expected the outline drawn here and the one carried`);

    // The defect GRAPH-1 names: the second number used to be the FIRST mug's
    // plan, rasterised where the first mug's plan lies — a 0% view about a body
    // standing somewhere else. Every claim here is measured where THIS body is,
    // so none of them can read zero for that reason.
    for (const p of h.per) {
      assert(
        p.coverage > 0.05,
        `the ${p.view} claim (${p.kind} ${p.markId}) is ${(p.coverage * 100).toFixed(0)}% — measured somewhere else?`
      );
    }

    // …and the row says which claim is which.
    const kinds = h.per.map((p) => p.kind);
    assert(kinds.includes('target'), `no claim is the outline drawn here: ${kinds.join(', ')}`);
    assert(kinds.includes('source'), `nothing was carried from the definition: ${kinds.join(', ')}`);
    const carried = h.per.find((p) => p.kind === 'source');
    assert(carried.of === 'mug', `the carried claim says it came from ${carried.of}`);
    assert(/carried from mug/.test(h.sentence), `the sentence said "${h.sentence}"`);
    // The hole and the handle are kept and said, and deliberately not counted:
    // a feature is a claim about a face, not about the body's extent.
    assert(h.aside && h.aside.length >= 1, 'the features were dropped rather than set aside');
    assert(/not counted/.test(h.sentence), `the sentence does not say what it set aside: "${h.sentence}"`);
    assert(/honours/.test(S().panelText()), 'the panel does not carry the row');
    return {
      sentence: h.sentence,
      per: h.per.map((p) => `${p.view} ${(p.coverage * 100).toFixed(0)} ${p.kind}`),
      aside: h.aside.length,
    };
  });

  window.__demo = async function () {
    const out = { ok: true, passed: 0, failed: 0, totalMs: 0, steps: [] };
    if (!S()) {
      out.ok = false;
      out.error = 'window.__shard is not there — is the page loaded?';
      return out;
    }
    const t0 = performance.now();
    for (const s of demoSteps) {
      const at = performance.now();
      try {
        const detail = await s.fn();
        out.passed++;
        out.steps.push({ name: s.name, ok: true, ms: Math.round(performance.now() - at), ...(detail ? { detail } : {}) });
      } catch (err) {
        out.ok = false;
        out.failed++;
        out.steps.push({ name: s.name, ok: false, ms: Math.round(performance.now() - at), error: String(err && err.message ? err.message : err) });
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    out.totalMs = Math.round(performance.now() - t0);
    return out;
  };

  console.log('shard-3d e2e loaded — run: __scenario().then(r => window.__R = r), or __demo().then(r => window.__D = r)');
})();
