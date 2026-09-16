// ===== gesture =====
// **Pure.** What a wheel event or a set of touch points MEANS for the camera,
// as arithmetic — so `scene.ts` is left holding only the listeners, and every
// rule below is a test rather than a thing you find out by putting a finger on
// a screen.
//
// John: *"Make the view work with trackpad and touch."* Two devices the shard
// had no answer for. A trackpad sends `wheel` for everything it does, so the
// old handler — which dollied on any wheel at all — turned a two-finger swipe
// meant as a look-around into a zoom, and there was no way to orbit at all
// without a right button the machine does not have. A touch screen had two
// fingers panning and pinching and nothing that turned the view but a drag on
// the compass, which is a corner of chrome the size of a thumbnail.
//
// **Blender is the reference**, by John's own repeated citation: on a trackpad
// it orbits with a two-finger swipe, pans with `Shift` + swipe, and zooms with
// `Ctrl` + swipe or a pinch. The shard takes that map exactly, because a hand
// that has one of these in its fingers should not have to learn a second.
//
// The one thing that cannot be taken from Blender is how to tell the two
// devices apart, because the browser will not say: a mouse wheel and a
// trackpad swipe arrive through the same event with the same fields. So they
// are told apart by their SHAPE (`classifyWheel`), and the shape is what the
// constants below name.

/** A wheel event, in the fields this module reads — so a test needs no DOM. */
export interface WheelLike {
  deltaX: number;
  deltaY: number;
  /** 0 = pixels, 1 = lines, 2 = pages. */
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** The viewport a gesture is measured against — an orbit's rate comes off it. */
export interface Viewport {
  width: number;
  height: number;
}

/** What sent this wheel event. */
export type WheelDevice =
  /** A wheel with notches: discrete steps down one axis. */
  | 'mouse'
  /** Two fingers on a trackpad, swiping. */
  | 'trackpad'
  /** Two fingers on a trackpad, pinching — macOS sends it as `ctrl` + wheel. */
  | 'pinch';

/** What a camera move is. Every gesture in the shard reduces to one of three. */
export type CameraAct = 'orbit' | 'pan' | 'dolly';

// ---- the thresholds ------------------------------------------------------
// Every one of these is about the DEVICE, not about the world: they are read
// off what the hardware puts in the event, so none of them is scaled by zoom
// or by anything the board holds.

/** A line of scroll, in pixels — what `deltaMode: 1` has to be multiplied by. */
export const LINE_HEIGHT_PX = 16;
/** A page of scroll, as a fraction of the viewport — `deltaMode: 2`. */
export const PAGE_FRACTION = 0.9;

/**
 * A pixel-mode step at or above this, on one axis alone and whole, is a mouse
 * wheel's notch. Chrome sends 100 or 120 per notch and Firefox three lines;
 * a trackpad swiped at an ordinary pace sends single digits per event.
 */
export const MOUSE_STEP_PX = 40;

/**
 * How long a trackpad stays a trackpad after it has proved itself.
 *
 * The proof is a **two-axis delta** — a mouse wheel has one axis and sends
 * `deltaX: 0` forever, so a non-zero `deltaX` is the one sign that cannot be
 * faked by a wheel. A real swipe is never perfectly straight, so it proves
 * itself within the first few events; the middle of that same swipe may then
 * run straight up for a while and send large whole deltas that look exactly
 * like notches. The memory is what stops the gesture changing its mind
 * halfway through, and it expires so that unplugging the trackpad and picking
 * up a mouse does not inherit the verdict.
 */
export const TRACKPAD_MEMORY_MS = 800;

/**
 * How far a trackpad swipe turns the view: a swipe worth a canvas width of
 * delta is **half a turn**. On a 1200px-wide canvas that is π/1200 ≈ 0.0026
 * radians a unit — deliberately gentler than the 0.006 a mouse DRAG turns at,
 * because a trackpad's deltas are accelerated and a swipe spends more of them
 * than a finger travels.
 */
export const ORBIT_PER_WIDTH = Math.PI;

/** A mouse notch's bite on the distance. Unchanged from P0: 120 → about 1.2×. */
export const WHEEL_DOLLY_GAIN = 0.0016;
/**
 * A trackpad's. Larger, because a pinch reports single digits where a notch
 * reports a hundred, and at the wheel's gain a pinch does nothing at all.
 */
export const TRACKPAD_DOLLY_GAIN = 0.006;
/** The most one event may do to the distance, either way. */
export const DOLLY_CLAMP = 0.5;

/**
 * How far two fingers must travel before the shard decides what they are.
 *
 * Deferred commitment, the way the plane is picked: the first few pixels of a
 * two-finger gesture are the same for a pinch and for a swipe, so nothing
 * moves until there is enough evidence to tell them apart. Twelve pixels is
 * under a finger's width and over the jitter of two fingers landing.
 */
export const TWO_FINGER_SETTLE_PX = 12;

/**
 * How much the pinch must dominate the drag to be read as a pinch. Under 1,
 * so that a pinch which also slides — which is every real pinch — is still a
 * pinch, and over 0 so a swipe whose fingers splay slightly still orbits.
 */
export const PINCH_DOMINANCE = 0.8;

/**
 * Radians per pixel a two-finger swipe turns at. The same rate a mouse drag
 * and a drag on the compass turn at, because the midpoint of two fingers
 * travels the distance the fingers do — unlike a trackpad's accelerated
 * deltas, which is why that rate is measured differently above.
 */
export const TOUCH_ORBIT_RATE = 0.006;

// ---- the wheel -----------------------------------------------------------

/** What a device has proved about itself lately. Held by the caller, not here. */
export interface WheelMemory {
  /** When a two-axis delta was last seen. `-Infinity` until one is. */
  twoAxisAt: number;
}

export const noWheelMemory = (): WheelMemory => ({ twoAxisAt: -Infinity });

export interface WheelVerdict {
  device: WheelDevice;
  /** The memory as it stands after this event — the caller keeps it. */
  memory: WheelMemory;
  /** Which rule decided, in the words the panel could say. */
  why: string;
}

/**
 * Mouse, trackpad or pinch — read off one event and a short memory.
 *
 * The rules are read top to bottom, first match wins, the way every table in
 * this codebase is read.
 */
export function classifyWheel(e: WheelLike, memory: WheelMemory, now: number): WheelVerdict {
  const twoAxis = e.deltaX !== 0;
  const mem: WheelMemory = twoAxis ? { twoAxisAt: now } : memory;
  const fresh = now - mem.twoAxisAt < TRACKPAD_MEMORY_MS;

  // 1 · macOS turns a pinch into `ctrl` + wheel, and nothing else does. A real
  //     ctrl + mouse wheel means zoom too, so the act is the same either way.
  if (e.ctrlKey) return { device: 'pinch', memory: mem, why: 'ctrl + wheel — a pinch' };
  // 2 · Lines and pages are a wheel's units. A trackpad reports pixels.
  if (e.deltaMode !== 0)
    return { device: 'mouse', memory: mem, why: `deltaMode ${e.deltaMode} — a wheel's units` };
  // 3 · Two axes at once is the sign a wheel cannot make.
  if (twoAxis) return { device: 'trackpad', memory: mem, why: 'a delta on both axes' };
  // 4 · …and it holds for a moment, so the straight middle of a swipe keeps it.
  if (fresh) return { device: 'trackpad', memory: mem, why: 'a two-axis delta just now' };
  // 5 · A fraction of a pixel is a trackpad measuring a finger, not a notch.
  if (!Number.isInteger(e.deltaY))
    return { device: 'trackpad', memory: mem, why: 'a fractional delta' };
  // 6 · Small whole steps are a trackpad nudged; large ones are notches.
  if (Math.abs(e.deltaY) < MOUSE_STEP_PX)
    return { device: 'trackpad', memory: mem, why: `a step under ${MOUSE_STEP_PX}px` };
  return { device: 'mouse', memory: mem, why: `a step of ${Math.abs(e.deltaY)}px — a notch` };
}

/** What a wheel event does to the camera. Exactly one act; the rest are zero. */
export interface WheelMove extends WheelVerdict {
  act: CameraAct;
  /** Radians, for `orbit`. */
  dTheta: number;
  dPhi: number;
  /** Screen pixels, for `pan` — the sign the same travel would have as a DRAG. */
  dxPx: number;
  dyPx: number;
  /** Multiply the camera's distance by this, for `dolly`. */
  factor: number;
}

/** A delta in the event's own units, brought to pixels. */
function pixels(d: number, mode: number, span: number): number {
  if (mode === 1) return d * LINE_HEIGHT_PX;
  if (mode === 2) return d * span * PAGE_FRACTION;
  return d;
}

/**
 * The whole trackpad map, in one function: swipe orbits, `Shift` + swipe pans,
 * `Ctrl`/`Cmd` + swipe and a pinch dolly — and a mouse wheel keeps the dolly
 * it has always had.
 *
 * **Finger travel is the negative of the delta.** A scroll delta says which
 * way the CONTENT should go, and every one of these acts is stated as what a
 * drag with the same finger travel would do, so the picture follows the hand
 * under all three.
 */
export function readWheel(
  e: WheelLike,
  memory: WheelMemory,
  view: Viewport,
  now: number
): WheelMove {
  const seen = classifyWheel(e, memory, now);
  const width = Math.max(1, view.width);
  const height = Math.max(1, view.height);
  const dx = pixels(e.deltaX, e.deltaMode, width);
  const dy = pixels(e.deltaY, e.deltaMode, height);
  const still = { dTheta: 0, dPhi: 0, dxPx: 0, dyPx: 0, factor: 1 };

  const dolly = (gain: number): WheelMove => ({
    ...seen,
    ...still,
    act: 'dolly',
    factor: Math.exp(Math.max(-DOLLY_CLAMP, Math.min(DOLLY_CLAMP, dy * gain))),
  });

  if (seen.device === 'pinch') return dolly(TRACKPAD_DOLLY_GAIN);
  if (seen.device === 'mouse') return dolly(WHEEL_DOLLY_GAIN);
  // A trackpad, then. `Cmd` is `Ctrl`'s twin on a Mac, and `ctrl` never
  // reaches here — the classifier took it as a pinch one rule earlier.
  if (e.metaKey) return dolly(TRACKPAD_DOLLY_GAIN);
  if (e.shiftKey) return { ...seen, ...still, act: 'pan', dxPx: -dx, dyPx: -dy };
  const rate = ORBIT_PER_WIDTH / width;
  // The drag's own sign: travelling right turns theta down.
  return { ...seen, ...still, act: 'orbit', dTheta: dx * rate, dPhi: -dy * rate };
}

// ---- touch ---------------------------------------------------------------
// **One finger draws** — the rule nothing may break — so every camera move on
// a touch screen starts at two. Which leaves one question: what do two fingers
// dragging mean, when they already mean pinch?
//
// The answer here: **two fingers pinch or orbit, three fingers pan.** A pinch
// and a swipe are told apart once, at the start of the gesture, by which of
// the two grew faster; three fingers are their own gesture and never
// ambiguous. (They pinched and panned until now — P0's rule, and the canvas's.
// But a shard for making 3D things is a place where turning the view is the
// commonest thing a hand does, and asking for it from a thumbnail-sized
// compass is asking too much of a thumb.)

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

/** What two or three fingers have been doing since they landed. */
export interface TouchMemory {
  /** How many fingers were down at the last reading. */
  count: number;
  /**
   * What this gesture is. `settling` is two fingers down that have not yet
   * travelled far enough to say which — nothing moves while it stands.
   */
  mode: 'none' | 'draw' | 'settling' | 'orbit' | 'dolly' | 'pan';
  /** The centre of the fingers at the last reading. */
  at: { x: number; y: number } | null;
  /** How far apart the first two are — meaningless under two fingers. */
  spread: number;
  /** How far the centre has travelled since the fingers landed. */
  travelled: number;
  /** How much the spread has changed since the fingers landed. */
  splayed: number;
}

export const noTouchMemory = (): TouchMemory => ({
  count: 0,
  mode: 'none',
  at: null,
  spread: 0,
  travelled: 0,
  splayed: 0,
});

export interface TouchMove {
  memory: TouchMemory;
  /** Null while one finger draws, while two fingers settle, and at a landing. */
  act: CameraAct | null;
  dTheta: number;
  dPhi: number;
  dxPx: number;
  dyPx: number;
  factor: number;
  /** Where the act happens — the centre of the fingers. */
  at: { x: number; y: number };
  why: string;
}

const centre = (ps: TouchPoint[]) => ({
  x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
  y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
});

const spreadOf = (ps: TouchPoint[]) =>
  ps.length < 2 ? 0 : Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);

/**
 * Two or three fingers, over time → a camera move.
 *
 * Called with every set of touch points, landings and liftings included. A
 * change in how many fingers are down **restarts** the gesture and moves
 * nothing: the centre of two fingers is nowhere near the centre of three, and
 * carrying a delta across that jump would fling the view the moment a third
 * finger arrived.
 */
export function readTouch(points: TouchPoint[], memory: TouchMemory): TouchMove {
  const at = points.length ? centre(points) : memory.at ?? { x: 0, y: 0 };
  const spread = spreadOf(points);
  const still = { act: null, dTheta: 0, dPhi: 0, dxPx: 0, dyPx: 0, factor: 1, at } as const;

  if (points.length !== memory.count) {
    const mode =
      points.length >= 3 ? 'pan' : points.length === 2 ? 'settling' : points.length === 1 ? 'draw' : 'none';
    return {
      ...still,
      memory: { count: points.length, mode, at, spread, travelled: 0, splayed: 0 },
      why: `${points.length} down — ${mode}`,
    };
  }

  const from = memory.at ?? at;
  const dx = at.x - from.x;
  const dy = at.y - from.y;
  const mem: TouchMemory = { ...memory, at, spread };

  if (points.length <= 1) return { ...still, memory: mem, why: 'one finger draws' };

  if (points.length >= 3) {
    // Three fingers pan, by the centre they share. A drag, so the picture
    // follows the fingers exactly as a middle-drag does.
    return { ...still, act: 'pan', dxPx: dx, dyPx: dy, memory: mem, why: 'three fingers pan' };
  }

  // Two. Decide once, then hold the decision until a finger lands or leaves.
  const travelled = memory.travelled + Math.hypot(dx, dy);
  const splayed = memory.splayed + Math.abs(spread - memory.spread);
  let mode = memory.mode;
  let why = '';
  if (mode === 'settling') {
    if (Math.max(travelled, splayed) < TWO_FINGER_SETTLE_PX)
      return {
        ...still,
        memory: { ...mem, travelled, splayed },
        why: 'two fingers, not yet far enough to say which',
      };
    mode = splayed > travelled * PINCH_DOMINANCE ? 'dolly' : 'orbit';
    why = `${splayed.toFixed(1)}px of pinch against ${travelled.toFixed(1)}px of drag — ${mode}`;
  }
  const settled: TouchMemory = { ...mem, mode, travelled, splayed };

  if (mode === 'dolly') {
    // Spreading brings the camera in; the ratio is the same one a pinch has
    // always meant, so nothing about the feel of a pinch changes.
    const factor = memory.spread > 0 && spread > 0 ? memory.spread / spread : 1;
    return { ...still, act: 'dolly', factor, memory: settled, why: why || 'two fingers pinch' };
  }
  const rate = TOUCH_ORBIT_RATE;
  return {
    ...still,
    act: 'orbit',
    dTheta: -dx * rate,
    dPhi: dy * rate,
    memory: settled,
    why: why || 'two fingers orbit',
  };
}
