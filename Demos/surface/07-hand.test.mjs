// The hand's rules — pen, finger and palm — on their own (V1-PLAN R6).
//
//   node --test Demos/surface/07-hand.test.mjs
//
// 07-hand.js is a fragment of the surface's one closure that names nothing
// outside itself, so it is loaded here exactly as the browser loads it (as
// source, inside a function body) and asked questions directly, the way
// 09-field.test.mjs asks the field's reader. What the adapter does with the
// answers — the canvas's pointer handlers in 07-input.js — is the browser
// gate's `pencil` scenario (e2e/pencil.mjs).
//
// This file is NOT part of the built surface: Demos/build-surface.mjs
// concatenates `/^\d\d-.*\.js$/`, which `.test.mjs` does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '07-hand.js'), 'utf8');
const { PALM_MS, PAN_SLOP_PX, TAP_SLOP_PX, handOfPointer, palmNow, fingerRole, whenPenLands, handFace, nextHand, releaseIs } = new Function(
  src + '\n  return { PALM_MS, PAN_SLOP_PX, TAP_SLOP_PX, handOfPointer, palmNow, fingerRole, whenPenLands, handFace, nextHand, releaseIs };'
)();

const FAR = Infinity; // no pen, ever
const finger = (over = {}) => ({ draws: null, penDown: false, sincePen: FAR, fingers: 0, ...over });

test('the hand is read from pointerType alone: a pencil is pen, a finger is touch, anything else is the mouse', () => {
  assert.equal(handOfPointer('pen'), 'pen');
  assert.equal(handOfPointer('touch'), 'finger');
  assert.equal(handOfPointer('mouse'), 'mouse');
  // A synthesised PointerEvent with no type says '' — the canvas harness's events: the mouse, as before.
  assert.equal(handOfPointer(''), 'mouse');
  assert.equal(handOfPointer(undefined), 'mouse');
});

test('before any pen is seen, today\'s rule stands: one finger draws, a second pinches, a third is nothing', () => {
  assert.equal(fingerRole(finger()).role, 'draw');
  assert.match(fingerRole(finger()).why, /no pen seen/);
  assert.equal(fingerRole(finger({ fingers: 1 })).role, 'pinch');
  assert.equal(fingerRole(finger({ fingers: 2 })).role, 'extra');
});

test('once a pen is seen, a finger pans; two still pinch', () => {
  assert.equal(fingerRole(finger({ draws: 'pen' })).role, 'pan');
  assert.equal(fingerRole(finger({ draws: 'pen', fingers: 1 })).role, 'pinch');
});

test('the tile can give the finger its ink back', () => {
  assert.equal(fingerRole(finger({ draws: 'finger' })).role, 'draw');
  assert.match(fingerRole(finger({ draws: 'finger' })).why, /hand tile/);
});

test('a touch while the pen is on the glass is a palm, whatever the preference', () => {
  for (const draws of [null, 'pen', 'finger']) {
    assert.equal(fingerRole(finger({ draws, penDown: true })).role, 'palm', String(draws));
    assert.equal(fingerRole(finger({ draws, penDown: true, fingers: 1 })).role, 'palm', 'not a pinch either');
  }
});

test('a touch within the palm window of the pen\'s last event is a palm; past it, a finger', () => {
  assert.equal(fingerRole(finger({ draws: 'pen', sincePen: 0 })).role, 'palm');
  assert.equal(fingerRole(finger({ draws: 'pen', sincePen: PALM_MS - 1 })).role, 'palm');
  assert.match(fingerRole(finger({ draws: 'pen', sincePen: 120 })).why, /120 ms ago/);
  assert.equal(fingerRole(finger({ draws: 'pen', sincePen: PALM_MS })).role, 'pan');
  assert.equal(fingerRole(finger({ draws: 'finger', sincePen: 200 })).role, 'palm', 'a finger that draws is still not a palm\'s ink');
  assert.equal(palmNow({ penDown: false, sincePen: 10 }), true);
  assert.equal(palmNow({ penDown: true, sincePen: FAR }), true);
  assert.equal(palmNow({ penDown: false, sincePen: FAR }), false);
});

test('the numbers are the hand\'s: a palm window under a second, a slop of a few pixels', () => {
  assert.ok(PALM_MS >= 300 && PALM_MS <= 1000, String(PALM_MS));
  assert.ok(PAN_SLOP_PX >= 3 && PAN_SLOP_PX <= 12, String(PAN_SLOP_PX));
});

test('a pen landing makes every finger down a palm, and puts back the pan of the one that landed a moment before', () => {
  const now = 10000;
  const r = whenPenLands([
    { id: 'heel', role: 'pan', at: now - 150, moved: true },
    { id: 'thumb', role: 'palm', at: now - 900, moved: false },
  ], now);
  assert.deepEqual(r, { palms: ['heel'], putBack: 'heel' });
});

test('…but a pan that has been going on for a while is the hand\'s own, and stays', () => {
  const now = 10000;
  assert.deepEqual(whenPenLands([{ id: 'f', role: 'pan', at: now - PALM_MS - 1, moved: true }], now), { palms: ['f'], putBack: null });
});

test('…and a finger that has not moved has nothing to put back; a finger drawing is a palm too', () => {
  const now = 10000;
  assert.deepEqual(whenPenLands([{ id: 'f', role: 'pan', at: now - 50, moved: false }], now), { palms: ['f'], putBack: null });
  assert.deepEqual(whenPenLands([{ id: 'd', role: 'draw', at: now - 50, moved: true }], now), { palms: ['d'], putBack: null });
});

test('…and of two fingers pinching when the pen lands, the earlier one\'s view is the one put back', () => {
  const now = 10000;
  const r = whenPenLands([
    { id: 'a', role: 'pinch', at: now - 300, moved: true },
    { id: 'b', role: 'pinch', at: now - 200, moved: true },
  ], now);
  assert.deepEqual(r, { palms: ['a', 'b'], putBack: 'a' });
});

test('the hand tile says the side until a pen is seen, and the side and what draws after', () => {
  assert.equal(handFace('right', null), 'right');
  assert.equal(handFace('left', null), 'left');
  assert.equal(handFace('right', 'pen'), 'right · pen');
  assert.equal(handFace('left', 'finger'), 'left · finger');
});

test('the tile flips the side until a pen is seen, as it always did', () => {
  assert.deepEqual(nextHand('right', null), { side: 'left', draws: null });
  assert.deepEqual(nextHand('left', null), { side: 'right', draws: null });
});

test('after, one word of the face changes a tap, and four taps come back', () => {
  let h = { side: 'right', draws: 'pen' };
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const n = nextHand(h.side, h.draws);
    const changed = (n.side !== h.side ? 1 : 0) + (n.draws !== h.draws ? 1 : 0);
    assert.equal(changed, 1, JSON.stringify([h, n]));
    seen.push(handFace(n.side, n.draws));
    h = n;
  }
  assert.deepEqual(seen, ['right · finger', 'left · finger', 'left · pen', 'right · pen']);
});

// ---- W3: a tap never leaves a dot (PLAN-USER-SURFACE §4, audit row 15) ----

const release = (over = {}) => ({ points: 4, travelPx: 0, dismissable: false, ...over });

test('a press too short to be a mark is a tap, whatever is open', () => {
  for (const dismissable of [false, true]) {
    assert.equal(releaseIs(release({ points: 1, dismissable })), 'tap');
    assert.equal(releaseIs(release({ points: 2, travelPx: 40, dismissable })), 'tap');
  }
});

test('while something is dismissable, a press that stays inside the tap slop on screen is the dismissal, however many points it reported', () => {
  for (const travelPx of [0, 1, 3, 6, TAP_SLOP_PX]) {
    assert.equal(releaseIs(release({ points: 5, travelPx, dismissable: true })), 'tap', String(travelPx));
  }
});

test('…and past the slop it is a stroke, field or no field', () => {
  assert.equal(releaseIs(release({ points: 12, travelPx: TAP_SLOP_PX + 1, dismissable: true })), 'stroke');
});

test('with nothing to dismiss, a dot deliberately drawn is still a dot', () => {
  for (const travelPx of [1, 3, 6]) assert.equal(releaseIs(release({ points: 4, travelPx })), 'stroke', String(travelPx));
});

test('the dot on an i while the field is open dismisses first: the dead state\'s rule', () => {
  assert.equal(releaseIs(release({ points: 6, travelPx: 4, dismissable: true })), 'tap');
});

test('the tap slop is a click\'s wobble: at least the pan slop, and a few pixels', () => {
  assert.ok(TAP_SLOP_PX >= PAN_SLOP_PX && TAP_SLOP_PX <= 12, String(TAP_SLOP_PX));
});
