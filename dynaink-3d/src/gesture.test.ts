import { describe, it, expect } from 'vitest';
import {
  classifyWheel,
  noTouchMemory,
  noWheelMemory,
  readTouch,
  readWheel,
  MOUSE_STEP_PX,
  ORBIT_PER_WIDTH,
  TOUCH_ORBIT_RATE,
  TRACKPAD_MEMORY_MS,
  TWO_FINGER_SETTLE_PX,
  type TouchMemory,
  type TouchPoint,
  type WheelLike,
} from './gesture';

const VIEW = { width: 1200, height: 800 };

const wheel = (over: Partial<WheelLike> = {}): WheelLike => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over,
});

/** One reading, from a fresh device. */
const read = (over: Partial<WheelLike>, now = 1000) =>
  readWheel(wheel(over), noWheelMemory(), VIEW, now);

describe('telling a trackpad from a mouse wheel', () => {
  it('reads a notch as a mouse: one axis, whole, and large', () => {
    const v = classifyWheel(wheel({ deltaY: 120 }), noWheelMemory(), 0);
    expect(v.device).toBe('mouse');
    expect(v.why).toMatch(/notch/);
  });

  it('reads lines and pages as a mouse, whatever their size', () => {
    expect(classifyWheel(wheel({ deltaY: 3, deltaMode: 1 }), noWheelMemory(), 0).device).toBe('mouse');
    expect(classifyWheel(wheel({ deltaY: 1, deltaMode: 2 }), noWheelMemory(), 0).device).toBe('mouse');
  });

  it('reads a delta on both axes as a trackpad — the sign a wheel cannot make', () => {
    const v = classifyWheel(wheel({ deltaX: 3, deltaY: -2 }), noWheelMemory(), 0);
    expect(v.device).toBe('trackpad');
    expect(v.why).toMatch(/both axes/);
  });

  it('reads a fractional delta as a trackpad', () => {
    expect(classifyWheel(wheel({ deltaY: 1.5 }), noWheelMemory(), 0).device).toBe('trackpad');
  });

  it('reads a small whole step as a trackpad, and a large one as a notch', () => {
    expect(classifyWheel(wheel({ deltaY: MOUSE_STEP_PX - 1 }), noWheelMemory(), 0).device).toBe('trackpad');
    expect(classifyWheel(wheel({ deltaY: MOUSE_STEP_PX }), noWheelMemory(), 0).device).toBe('mouse');
  });

  it('reads ctrl + wheel as a pinch — which is how macOS sends one', () => {
    const v = classifyWheel(wheel({ deltaY: -6, ctrlKey: true }), noWheelMemory(), 0);
    expect(v.device).toBe('pinch');
  });

  it('holds the verdict through the straight middle of a swipe', () => {
    // A swipe proves itself on its first event, then runs straight up the
    // screen sending deltas that look exactly like notches. Without the
    // memory the gesture would turn into a zoom halfway through.
    const proved = classifyWheel(wheel({ deltaX: 2, deltaY: -9 }), noWheelMemory(), 500);
    expect(proved.device).toBe('trackpad');
    const straight = classifyWheel(wheel({ deltaY: 120 }), proved.memory, 500 + TRACKPAD_MEMORY_MS - 1);
    expect(straight.device).toBe('trackpad');
    expect(straight.why).toMatch(/just now/);
  });

  it('lets the verdict go when the wheel falls quiet, so a mouse is a mouse again', () => {
    const proved = classifyWheel(wheel({ deltaX: 2, deltaY: -9 }), noWheelMemory(), 500);
    const later = classifyWheel(wheel({ deltaY: 120 }), proved.memory, 500 + TRACKPAD_MEMORY_MS + 1);
    expect(later.device).toBe('mouse');
  });
});

describe("the trackpad map is Blender's", () => {
  it('orbits on a plain swipe', () => {
    const m = read({ deltaX: 20, deltaY: -10 });
    expect(m.device).toBe('trackpad');
    expect(m.act).toBe('orbit');
    expect(m.factor).toBe(1);
  });

  it('pans on shift + swipe, the picture following the fingers', () => {
    const m = read({ deltaX: 20, deltaY: -10, shiftKey: true });
    expect(m.act).toBe('pan');
    // The delta says where the CONTENT should go; the fingers went the other
    // way, and a pan is stated as the drag those fingers would have made.
    expect(m.dxPx).toBe(-20);
    expect(m.dyPx).toBe(10);
  });

  it('dollies on cmd + swipe and on a pinch, and the two agree on direction', () => {
    const cmd = read({ deltaX: 1, deltaY: -12, metaKey: true });
    expect(cmd.act).toBe('dolly');
    expect(cmd.factor).toBeLessThan(1); // upward: nearer

    const pinch = read({ deltaY: -12, ctrlKey: true });
    expect(pinch.device).toBe('pinch');
    expect(pinch.act).toBe('dolly');
    expect(pinch.factor).toBeCloseTo(cmd.factor, 6);
  });

  it('keeps the mouse wheel on the dolly it has always had', () => {
    const out = read({ deltaY: 120 });
    expect(out.device).toBe('mouse');
    expect(out.act).toBe('dolly');
    expect(out.factor).toBeGreaterThan(1); // scrolling down stands back
    const inward = read({ deltaY: -120 });
    expect(inward.factor).toBeLessThan(1);
    // The P0 number, unchanged: a notch is about a fifth either way.
    expect(out.factor).toBeCloseTo(Math.exp(120 * 0.0016), 6);
  });

  it('turns half a turn for a swipe worth the canvas width', () => {
    let memory = noWheelMemory();
    let theta = 0;
    // Sixty events of twenty pixels each — a full 1200px width of delta.
    for (let i = 0; i < 60; i++) {
      const m = readWheel(wheel({ deltaX: 20, deltaY: -0.5 }), memory, VIEW, 1000 + i * 8);
      memory = m.memory;
      expect(m.act).toBe('orbit');
      theta += m.dTheta;
    }
    expect(theta).toBeCloseTo(ORBIT_PER_WIDTH, 6);
    expect(Math.abs(theta)).toBeCloseTo(Math.PI, 6);
  });

  it('turns the way the same travel would turn as a drag', () => {
    // A right-drag to the right turns theta down (`turn(-dx * 0.006, …)`).
    // Fingers swiping right send a NEGATIVE deltaX, so the two must agree.
    const fingersRight = read({ deltaX: -30, deltaY: 1 });
    expect(fingersRight.dTheta).toBeLessThan(0);
    const fingersDown = read({ deltaX: 1, deltaY: -30 });
    expect(fingersDown.dPhi).toBeGreaterThan(0);
  });

  it('never moves the camera two ways at once', () => {
    for (const e of [
      { deltaX: 9, deltaY: 4 },
      { deltaX: 9, deltaY: 4, shiftKey: true },
      { deltaY: -8, ctrlKey: true },
      { deltaY: 120 },
    ]) {
      const m = read(e);
      const moved = [m.act === 'orbit', m.act === 'pan', m.act === 'dolly'].filter(Boolean);
      expect(moved).toHaveLength(1);
      if (m.act !== 'orbit') expect([m.dTheta, m.dPhi]).toEqual([0, 0]);
      if (m.act !== 'pan') expect([m.dxPx, m.dyPx]).toEqual([0, 0]);
      if (m.act !== 'dolly') expect(m.factor).toBe(1);
    }
  });

  it('brings lines and pages to pixels before it measures anything', () => {
    const lines = read({ deltaY: 3, deltaMode: 1 });
    expect(lines.factor).toBeCloseTo(Math.exp(48 * 0.0016), 6);
  });
});

// ---- touch ---------------------------------------------------------------

const at = (...xy: [number, number][]): TouchPoint[] =>
  xy.map(([x, y], i) => ({ id: i, x, y }));

/** Play a sequence of touch frames, returning every reading. */
function play(frames: TouchPoint[][], memory: TouchMemory = noTouchMemory()) {
  const out = [];
  let mem = memory;
  for (const f of frames) {
    const m = readTouch(f, mem);
    mem = m.memory;
    out.push(m);
  }
  return out;
}

describe('one finger draws; two pinch or orbit; three pan', () => {
  it('moves nothing for one finger, however far it travels', () => {
    const reads = play([at([100, 100]), at([200, 180]), at([300, 260])]);
    expect(reads.every((r) => r.act === null)).toBe(true);
    expect(reads[2].memory.mode).toBe('draw');
  });

  it('moves nothing on the frame a finger lands or leaves', () => {
    const reads = play([at([0, 0]), at([0, 0], [100, 0]), at([0, 0], [100, 0], [200, 0]), at([0, 0])]);
    expect(reads.map((r) => r.act)).toEqual([null, null, null, null]);
  });

  it('says nothing until two fingers have travelled far enough to say which', () => {
    const frames = [at([0, 0], [100, 0])];
    // Six pixels of drag — under the settle, so the view must not twitch.
    for (let i = 1; i <= 3; i++) frames.push(at([i * 2, 0], [100 + i * 2, 0]));
    const reads = play(frames);
    expect(reads.every((r) => r.act === null)).toBe(true);
    expect(reads[reads.length - 1].memory.mode).toBe('settling');
    expect(reads[reads.length - 1].memory.travelled).toBeLessThan(TWO_FINGER_SETTLE_PX);
  });

  it('reads two fingers spreading as a pinch, and a pinch dollies in', () => {
    const frames = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 6; i++) frames.push(at([300 - i * 5, 400], [400 + i * 5, 400]));
    const reads = play(frames);
    const acted = reads.filter((r) => r.act);
    expect(acted.length).toBeGreaterThan(0);
    expect(acted.every((r) => r.act === 'dolly')).toBe(true);
    // Spreading brings the camera in: every factor under one.
    expect(acted.every((r) => r.factor < 1)).toBe(true);
    // And it happens at the centre of the fingers, which has not moved.
    expect(acted[0].at).toEqual({ x: 350, y: 400 });
    expect(reads[reads.length - 1].memory.mode).toBe('dolly');
  });

  it('reads two fingers pinching together as a dolly out', () => {
    const frames = [at([200, 400], [600, 400])];
    for (let i = 1; i <= 6; i++) frames.push(at([200 + i * 10, 400], [600 - i * 10, 400]));
    const acted = play(frames).filter((r) => r.act);
    expect(acted.every((r) => r.act === 'dolly' && r.factor > 1)).toBe(true);
  });

  it('reads two fingers dragging together as an orbit, at the drag rate', () => {
    const frames = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 8; i++) frames.push(at([300 + i * 6, 400], [400 + i * 6, 400]));
    const reads = play(frames);
    const acted = reads.filter((r) => r.act);
    expect(acted.length).toBeGreaterThan(0);
    expect(acted.every((r) => r.act === 'orbit')).toBe(true);
    // Travelling right turns theta down — the same sign a right-drag has.
    expect(acted.every((r) => r.dTheta < 0)).toBe(true);
    expect(acted[0].dTheta).toBeCloseTo(-6 * TOUCH_ORBIT_RATE, 9);
    expect(acted.every((r) => r.factor === 1)).toBe(true);
    expect(reads[reads.length - 1].memory.mode).toBe('orbit');
  });

  it('holds an orbit through a wobble in the spread, and a pinch through a slide', () => {
    // Once decided the gesture keeps its mind: a swipe whose fingers splay a
    // little must not flick into a zoom halfway across the screen.
    const frames = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 8; i++) frames.push(at([300 + i * 6, 400], [400 + i * 6, 400]));
    for (let i = 1; i <= 4; i++) frames.push(at([348 + i * 6, 400], [452 + i * 6 + i * 4, 400]));
    const acted = play(frames).filter((r) => r.act);
    expect(acted.every((r) => r.act === 'orbit')).toBe(true);

    const pinch = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 6; i++) pinch.push(at([300 - i * 5 + i * 2, 400], [400 + i * 5 + i * 2, 400]));
    for (let i = 1; i <= 4; i++) pinch.push(at([288 + i * 8, 400], [442 + i * 8, 400]));
    expect(play(pinch).filter((r) => r.act).every((r) => r.act === 'dolly')).toBe(true);
  });

  it('reads three fingers as a pan, by the centre they share', () => {
    const frames = [at([200, 300], [300, 300], [400, 360])];
    for (let i = 1; i <= 3; i++)
      frames.push(at([200 + i * 9, 300 - i * 4], [300 + i * 9, 300 - i * 4], [400 + i * 9, 360 - i * 4]));
    const reads = play(frames);
    const acted = reads.filter((r) => r.act);
    expect(acted.length).toBe(3);
    expect(acted.every((r) => r.act === 'pan')).toBe(true);
    // A pan follows the fingers, exactly as a middle-drag does — and with no
    // settle: three fingers were never ambiguous.
    expect(acted[0].dxPx).toBeCloseTo(9, 9);
    expect(acted[0].dyPx).toBeCloseTo(-4, 9);
    expect(reads[reads.length - 1].memory.mode).toBe('pan');
  });

  it('restarts rather than flings when a third finger joins a pair', () => {
    const frames = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 8; i++) frames.push(at([300 + i * 6, 400], [400 + i * 6, 400]));
    frames.push(at([348, 400], [448, 400], [900, 700])); // a third, far away
    const reads = play(frames);
    const joined = reads[reads.length - 1];
    // The centre of three is nowhere near the centre of two; carrying the
    // delta across that jump would throw the view across the board.
    expect(joined.act).toBeNull();
    expect(joined.memory.mode).toBe('pan');
    expect(joined.memory.travelled).toBe(0);
  });

  it('lets a pair decide again after a finger lifts and lands', () => {
    const swipe = [at([300, 400], [400, 400])];
    for (let i = 1; i <= 8; i++) swipe.push(at([300 + i * 6, 400], [400 + i * 6, 400]));
    const after = play([...swipe, at([348, 400]), at(), at([300, 400], [400, 400])]);
    expect(after[after.length - 1].memory.mode).toBe('settling');
    expect(after[after.length - 1].act).toBeNull();
  });
});
