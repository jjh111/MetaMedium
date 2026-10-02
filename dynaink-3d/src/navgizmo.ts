// ===== navgizmo =====
// The camera's own compass, in the corner (§7: "the three canonical views a
// tap away, the pinned views as chips").
//
// `gizmo.ts` is how a plane is CHOSEN — it stands in the world, at the origin,
// and its tiles are a decision about where ink lands. This is a different
// question wearing the same word: where the EYE is. So it is chrome, not
// world: an SVG overlay in the top-right corner, drawn from the tokens,
// theme-able, tappable at finger size, and cheap enough to redraw on every
// camera change.
//
// It is one widget with one corner: the compass, *home*, the projection, and
// the pinned views. Every way of moving the camera is in one place, which is
// the whole reason the pinned chips moved out of the panel to sit under it.

import type { Colours } from './theme';
import type { PlaneName, Pose } from './plane';
import type { Projection, Space } from './scene';
import {
  axisPlaneFor,
  balls,
  ballScale,
  opposite,
  viewFacingPlane,
  viewForAxis,
  viewOfPose,
  type Axis,
  type AxisView,
  type Bounds3,
} from './view';
import { chip, tile } from './ui';

const SVG = 'http://www.w3.org/2000/svg';
/** The widget's own square, in its viewBox units. */
const R = 33;
const BALL = 11;
/** A press that travels this far is a drag, not a tap. */
const DRAG_PX = 4;
/**
 * How long after an ease's nominal end a snap is still considered in flight.
 * Only the backstop for an ease that is never going to arrive; arrival itself
 * is what normally ends one.
 */
const SNAP_GRACE_MS = 400;

export interface NavOptions {
  host: HTMLElement;
  space: Space;
  colours: Colours;
  /** The plane the picker holds, so its ball can agree with its tile. */
  chosen(): PlaneName | null;
  /** Everything on the board — what *home* frames. Null when it is empty. */
  bounds(): Bounds3 | null;
  /** The pinned views — camera bookmarks, as `panel.pinnedViews` reads them off the log. */
  pinned(): { pose: Pose; label: string; count: number }[];
  say(sentence: string): void;
  /**
   * The camera has come to stand in an axis view, so **that view's plane is
   * chosen** — the same `chosen` decision a tile makes, and the picker's
   * tiles go away behind it (16 September 2026).
   */
  enterAxisView(view: AxisView, plane: PlaneName): void;
  /**
   * …and it has left again: the tiles come back, and the plane is whatever
   * the hand had chosen for itself (`planeAfterLeavingAxisView`).
   */
  leaveAxisView(): void;
}

export interface NavGizmo {
  /** Re-place the compass against the camera as it stands. */
  sync(): void;
  paint(c: Colours): void;
  /**
   * A tap on a ball: snap to that view, or to the other side of the same axis
   * when the camera is already there. Takes the axis letter or the view's own
   * name, and returns where it went.
   */
  tap(which: Axis | AxisView, ms?: number): AxisView;
  /** Frame everything, or the picker itself when the board is empty. */
  home(ms?: number): void;
  /** The projection tile. Pressing it by hand also pins it. */
  setProjection(p: Projection | 'toggle'): Projection;
  /** Which of the six the camera is at, or null when it is anywhere else. */
  facing(): AxisView | null;
  /**
   * The axis view the compass has told the surface it is STANDING in — which
   * lags `facing()` through a snap's ease on purpose, so the plane is chosen
   * once at the tap and not re-chosen a dozen times on the way there.
   */
  standing(): AxisView | null;
}

export function createNav(o: NavOptions): NavGizmo {
  const { host, space } = o;

  // ---- the widget ----------------------------------------------------------
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  svg.setAttribute('class', 'compass');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'compass — tap a ball for that view, drag to orbit');
  host.appendChild(svg);

  const tiles = document.createElement('div');
  tiles.className = 'navTiles';
  const homeTile = document.createElement('button');
  homeTile.type = 'button';
  const projTile = document.createElement('button');
  projTile.type = 'button';
  tiles.append(homeTile, projTile);
  host.appendChild(tiles);

  const pinnedBox = document.createElement('div');
  pinnedBox.className = 'navPinned';
  host.appendChild(pinnedBox);

  // One set of nodes, updated in place: the compass is redrawn on every camera
  // change, and building nine elements a frame during an orbit is a way of
  // making a widget that stutters exactly when it is being used.
  const arms = new Map<AxisView, SVGLineElement>();
  const dots = new Map<AxisView, SVGCircleElement>();
  const letters = new Map<AxisView, SVGTextElement>();
  const groups = new Map<AxisView, SVGGElement>();

  for (const view of ['right', 'top', 'front', 'left', 'bottom', 'back'] as AxisView[]) {
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'ball');
    g.setAttribute('data-view', view);
    const line = document.createElementNS(SVG, 'line');
    line.setAttribute('class', 'arm');
    const c = document.createElementNS(SVG, 'circle');
    const t = document.createElementNS(SVG, 'text');
    t.setAttribute('class', 'letter');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    const title = document.createElementNS(SVG, 'title');
    title.textContent = `${view} · tap again for ${opposite(view)}`;
    g.append(line, c, t, title);
    svg.appendChild(g);
    arms.set(view, line);
    dots.set(view, c);
    letters.set(view, t);
    groups.set(view, g);
  }

  // ---- state ---------------------------------------------------------------
  /**
   * The projection follows the camera until the hand says otherwise.
   *
   * Blender's "auto perspective", and the reason for it: a front / top / side
   * view is what a draftsman wants and perspective is a lie in it — two equal
   * edges at different depths measure differently. So a snap to a ball goes
   * ORTHO, and orbiting off the axis comes back to perspective, where depth is
   * what tells you the thing is solid. Pressing the tile pins the choice until
   * the next tap on a ball, and the tile says which it is either way.
   */
  let autoProjection = true;
  let snapping = false;
  let snapTimer: ReturnType<typeof setTimeout> | null = null;
  /** Where the snap in flight is going, so its arrival can end it. */
  let snapTo: AxisView | null = null;

  /**
   * The axis view the surface has been told about — `null` in an alt view.
   * Not the same question as `facing()`: through a snap's ease the camera is
   * nowhere in particular, and the plane must be chosen once, at the tap.
   */
  let stood: AxisView | null = null;
  /** False until the surface holds the handle this widget calls back through. */
  let wired = false;

  function facing(): AxisView | null {
    return viewOfPose(space.pose());
  }

  // ---- what a tap on a ball does -------------------------------------------
  function tap(which: Axis | AxisView, ms = 420): AxisView {
    const asked: AxisView =
      which === 'x' || which === 'y' || which === 'z' ? viewForAxis(which as Axis) : (which as AxisView);
    const at = facing();
    // A second tap on the same ball flips to the other side, as Blender does.
    const view = at === asked ? opposite(asked) : asked;
    // A snap is in progress from here: the lens is set to ortho a line before
    // the camera is actually on the axis, and auto-perspective would see an
    // orthographic camera in an alt view and undo it on the spot.
    snapping = true;
    snapTo = view;
    if (snapTimer) clearTimeout(snapTimer);
    // `ms <= 0` is "be there now" — `easeTo`'s own words. Only a real ease
    // needs holding open; a window kept for an instantaneous snap is a window
    // in which the very next camera move is not noticed at all.
    //
    // A snap normally ends when the camera ARRIVES (`sync` below). The timer
    // is only the backstop for an ease that never does — one cancelled by
    // another camera move — and it is deliberately generous, because the ease
    // is wall-clock and its last few degrees ride on a single frame: at
    // `ms + 60` a frame that came late put the arrival after the deadline, the
    // lens went back to auto-perspective while the camera was still a degree
    // off the axis, and the ortho a tap promises quietly came undone. Found by
    // hand, watching the *view* tile say persp in a front view.
    if (ms > 0) snapTimer = setTimeout(() => { arrived(); sync(); }, ms + SNAP_GRACE_MS);
    // A tap on a ball hands the lens back to the camera, whatever the tile was
    // pinned to — which is what the tile's own tooltip promises, and it means
    // there is one way out of a pin rather than a mode to remember.
    autoProjection = true;
    space.setProjection('ortho');
    space.snap(view, ms);
    if (ms <= 0) arrived(); // there was never a mid-snap to hold open
    // The choice is made HERE, at the tap, not when the ease lands: the hand
    // asked for that view, and the plane it faces is chosen by the asking.
    enter(view);
    sync();
    announce(view);
    return view;
  }

  /** The snap is over: the camera is where it was sent, or the wait ran out. */
  function arrived() {
    snapping = false;
    snapTo = null;
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = null;
  }

  /** Tell the surface the camera stands in this view, once. */
  function enter(view: AxisView) {
    if (stood === view) return;
    stood = view;
    o.enterAxisView(view, axisPlaneFor(view));
  }

  /**
   * Watch the camera cross the line between an axis view and an alt one. An
   * orbit, a pinned view, anything: the rule is about where the camera STANDS,
   * not about which control moved it, so a hand that orbits onto the front by
   * eye gets the same plane a tap on the ball would have chosen.
   *
   * Never mid-snap: the ease passes through a dozen poses that are not an axis
   * view on its way to one, and each would take the plane away and give it
   * back.
   */
  function settle() {
    // Not while the widget is still being built: the surface's own callbacks
    // reach back through the handle `createNav` has not returned yet, and the
    // first thing they would touch is a `const` in its dead zone. The surface
    // settles the boot pose with its first `sync()`, which is one line later.
    if (!wired || snapping) return;
    const at = facing();
    if (at === stood) return;
    if (at) {
      enter(at);
      announce(at);
      return;
    }
    stood = null;
    const was = o.chosen();
    o.leaveAxisView();
    const held = o.chosen();
    // Quiet when nothing changed. Turning the camera off an axis whose plane
    // the hand had chosen anyway takes nothing away, and a sentence about it
    // would push whatever the board just did out of the one status line —
    // which is what it did to *massing from 3 profiles · tier 1*.
    if (held === was) return;
    o.say(
      held
        ? `free view · ${held} chosen — the tile you held`
        : 'free view · plane read from what you draw'
    );
  }

  /**
   * Say where the camera went, and what that chose. An axis view faces its own
   * plane flat on by construction, so the edge-on warning that used to live
   * here has moved to where it is still live: choosing a tile BY HAND from a
   * view that leaves it edge-on (`choose` in `main.ts`).
   */
  function announce(view: AxisView) {
    o.say(`${view} · ${axisPlaneFor(view)} chosen`);
  }

  function home(ms = 420) {
    const b = o.bounds();
    if (b) {
      space.frame(b, ms);
      o.say('framed everything');
    } else {
      // Nothing drawn: frame the picker itself, so the three tiles are the
      // thing you are looking at — which is the next move on an empty board.
      space.frame({ min: { x: -3.6, y: -0.6, z: -3.6 }, max: { x: 3.6, y: 3.6, z: 3.6 } }, ms);
      o.say('nothing on the board — framed the plane picker');
    }
    sync();
  }

  function setProjection(p: Projection | 'toggle'): Projection {
    const next: Projection = p === 'toggle' ? (space.projection() === 'ortho' ? 'persp' : 'ortho') : p;
    autoProjection = false; // pressed by hand: it stays where it was put
    space.setProjection(next);
    o.say(
      next === 'ortho'
        ? 'ortho · parallel, pinned until you tap a ball'
        : 'persp · pinned until you tap a ball'
    );
    sync();
    return next;
  }

  // ---- the drag: the compass orbits, exactly as a right-drag does ----------
  let press: { x: number; y: number; view: AxisView | null; moved: boolean } | null = null;

  svg.addEventListener('pointerdown', (e) => {
    const target = (e.target as Element | null)?.closest('[data-view]') as HTMLElement | null;
    press = {
      x: e.clientX,
      y: e.clientY,
      view: (target?.getAttribute('data-view') as AxisView | null) ?? null,
      moved: false,
    };
    try { svg.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    e.preventDefault();
    e.stopPropagation();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!press) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < DRAG_PX) return;
    press.moved = true;
    press.x = e.clientX;
    press.y = e.clientY;
    // The same radians-per-pixel the canvas drag turns at, so the hand learns
    // one number rather than two.
    space.turn(-dx * 0.006, dy * 0.006);
    e.preventDefault();
    e.stopPropagation();
  });

  const release = (e: PointerEvent) => {
    if (!press) return;
    const was = press;
    press = null;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
    if (!was.moved && was.view) tap(was.view);
    else if (was.moved) {
      // Turned off an axis by hand: perspective again, unless it was pinned.
      if (autoProjection && space.projection() === 'ortho' && !facing()) space.setProjection('persp');
      sync();
    }
    e.preventDefault();
    e.stopPropagation();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  // The widget is chrome: a wheel over it is not a dolly into the scene.
  svg.addEventListener('wheel', (e) => e.stopPropagation());

  homeTile.onclick = () => home();
  projTile.onclick = () => setProjection('toggle');

  // ---- drawing it ----------------------------------------------------------
  function sync() {
    const pose = space.pose();
    const order = balls(pose);
    const at = facing();

    // The snap has landed: end it here rather than on the clock.
    if (snapping && snapTo && at === snapTo) arrived();

    // Auto-perspective: an orbit that left the axis comes back to a lens where
    // depth reads. Never mid-snap — the ease passes through a dozen poses that
    // are not an axis view on its way to one.
    if (autoProjection && !snapping && space.projection() === 'ortho' && !at) space.setProjection('persp');

    // The axis view is the choice: crossing in or out of one chooses the plane
    // or gives it back, wherever the camera move came from. FIRST, because the
    // ball that lights teal is the chosen plane's and this is what changes it.
    settle();

    const chosen = o.chosen();
    const chosenView = chosen ? viewFacingPlane(chosen) : null;

    // Painter's order: the farthest ball first, so the near ones cover it.
    for (const b of order) {
      const g = groups.get(b.view)!;
      svg.appendChild(g); // re-append is the z-order; the node is not rebuilt
      const cx = b.x * R;
      const cy = b.y * R;
      const r = BALL * ballScale(b.depth);
      const dot = dots.get(b.view)!;
      dot.setAttribute('cx', cx.toFixed(2));
      dot.setAttribute('cy', cy.toFixed(2));
      dot.setAttribute('r', r.toFixed(2));
      const arm = arms.get(b.view)!;
      // Only the positive ends carry an arm, as a compass does; the negatives
      // are hollow and unlabelled, and they are still tappable.
      arm.setAttribute('x1', '0');
      arm.setAttribute('y1', '0');
      arm.setAttribute('x2', cx.toFixed(2));
      arm.setAttribute('y2', cy.toFixed(2));
      arm.style.display = b.negative ? 'none' : '';
      const t = letters.get(b.view)!;
      t.setAttribute('x', cx.toFixed(2));
      t.setAttribute('y', cy.toFixed(2));
      t.setAttribute('font-size', (r * 1.15).toFixed(2));
      t.textContent = b.label;
      // Teal is the signal for *this is the plane the ink lands on*: the
      // picker's tile and the compass's ball say the same thing in the same
      // colour, so the hand can see which view faces what it is drawing on.
      const isChosen = chosenView !== null && (b.view === chosenView || b.view === opposite(chosenView));
      g.setAttribute(
        'class',
        ['ball', b.negative ? 'neg' : 'pos', isChosen ? 'chosen' : '', b.view === at ? 'at' : ''].filter(Boolean).join(' ')
      );
    }

    tile(homeTile, 'home', '', { why: 'frame everything · Home or f' });
    tile(projTile, 'view', space.projection() === 'ortho' ? 'ortho' : 'persp', {
      on: space.projection() === 'ortho',
      why: autoProjection
        ? 'follows the camera: a ball goes ortho, orbiting off the axis returns to persp · press to pin'
        : 'pinned · a ball hands it back to the camera',
    });

    renderPinned();
  }

  function renderPinned() {
    const views = o.pinned();
    pinnedBox.textContent = '';
    if (!views.length) return;
    for (const v of views) {
      pinnedBox.appendChild(
        chip(`${v.label} · ${v.count}`, {
          cls: 'pinChip',
          // A BOOKMARK, not a visibility rule: the ink is world geometry and
          // is drawn the same from every angle. What a tap gives back is the
          // view the stroke was drawn in — where it reads as what it is.
          why: `${v.count} stroke${v.count === 1 ? '' : 's'} drawn from here · tap to look from here again`,
          onclick: () => {
            space.easeTo(v.pose);
            o.say('back to the view that ink was drawn from');
          },
        })
      );
    }
  }

  /**
   * The compass takes every colour from the stylesheet's tokens, so a theme
   * change is a re-stamp of `data-theme` and nothing here has a hex in it —
   * but the widget is redrawn anyway, because the ball that carries the teal
   * is a class and classes are what a repaint re-decides.
   */
  function paint(_c: Colours) {
    sync();
  }

  space.onChange(sync);
  sync();

  return {
    sync: () => {
      wired = true;
      sync();
    },
    paint,
    tap,
    home,
    setProjection,
    facing,
    standing: () => stood,
  };
}
