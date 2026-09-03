// Wall physics — the rules the personal site's fish engine got right, ported
// as PHYSICS: no size class, no species, no name (BUILD-PLAN-v8 I11).
//
//   1. Look-ahead sliding. When the point ahead of the nose enters a wall's
//      standoff zone, steer along the wall's tangent nearest the heading,
//      biased slightly away — a glide around, not a push back.
//   2. Containment that redirects. Resolve overlap along the shallowest
//      axis, then project the velocity along the wall face at FULL magnitude
//      rather than zeroing the component into it. Zeroing parks a body nose-
//      first: every behaviour rewrites the heading back into the wall, and it
//      can never climb out. Sliding is the floor state; a body in contact
//      with a wall is never stationary.
//   3. Sustained contact disengages. A body pressed against a wall for long
//      gets a push away, so a corner is not a trap.
//
// Walls are axis-aligned boxes here (a wall's bounds); v1 of the plan.

import type { Body, Wall } from './verbs';
import { sizeOf } from './verbs';

export interface WallBox { minX: number; maxX: number; minY: number; maxY: number }

export function wallBoxes(walls: Wall[]): WallBox[] {
  return walls.map((w) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of w.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    return { minX, maxX, minY, maxY };
  });
}

export interface WallState { contactSteps: number }

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Apply the walls to a body about to move: returns the velocity to use and
 * the position after any containment, plus why. Call after steering, before
 * integrating.
 */
export function applyWalls(body: Body, boxes: WallBox[], dt: number, state: WallState = { contactSteps: 0 }): { vx: number; vy: number; x: number; y: number; reasoning: string; state: WallState } {
  let { x, y, vx, vy } = body;
  let reasoning = '';
  if (!boxes.length) return { vx, vy, x, y, reasoning, state };
  const size = sizeOf(body);
  const standoff = Math.max(9, size * 0.45);
  const half = Math.max(6, Math.min(body.w, body.h) * 0.5);
  const speed = Math.hypot(vx, vy);
  const heading = speed > 1e-6 ? Math.atan2(vy, vx) : body.heading;
  let contact = false;

  for (const r of boxes) {
    // 1. Look-ahead: slide along the tangent nearest the heading.
    const look = 24 + size * 1.2;
    const px = x + Math.cos(heading) * look, py = y + Math.sin(heading) * look;
    const s = standoff + half;
    if (px > r.minX - s && px < r.maxX + s && py > r.minY - s && py < r.maxY + s) {
      const away = Math.atan2(y - (r.minY + r.maxY) / 2, x - (r.minX + r.maxX) / 2);
      const t1 = away + Math.PI / 2, t2 = away - Math.PI / 2;
      const slide = Math.abs(angleDiff(t1, heading)) <= Math.abs(angleDiff(t2, heading)) ? t1 : t2;
      const target = slide + angleDiff(away, slide) * 0.3;
      const turned = heading + angleDiff(target, heading) * 0.35;
      const sp = Math.max(speed, 1e-6);
      vx = Math.cos(turned) * sp; vy = Math.sin(turned) * sp;
      reasoning = 'sliding along a wall ahead';
    }
    // 2. Containment: out along the shallowest axis, velocity along the face at full magnitude.
    const m = half + 2;
    if (x > r.minX - m && x < r.maxX + m && y > r.minY - m && y < r.maxY + m) {
      contact = true;
      const pushLeft = x - (r.minX - m), pushRight = (r.maxX + m) - x, pushUp = y - (r.minY - m), pushDown = (r.maxY + m) - y;
      const least = Math.min(pushLeft, pushRight, pushUp, pushDown);
      // Sliding is the floor state: along the face at full magnitude, and
      // never below a body-length a second, whatever the behaviours want.
      const sp = Math.max(Math.hypot(vx, vy), size * 0.8);
      if (least === pushLeft || least === pushRight) {
        x = least === pushLeft ? r.minX - m : r.maxX + m;
        const sign = vy >= 0 ? 1 : -1;
        vx = 0; vy = sign * sp; // along the vertical face
      } else {
        y = least === pushUp ? r.minY - m : r.maxY + m;
        const sign = vx >= 0 ? 1 : -1;
        vy = 0; vx = sign * sp; // along the horizontal face
      }
      reasoning = 'redirected along a wall face';
    }
  }
  // 3. Sustained contact disengages.
  const contactSteps = contact ? state.contactSteps + 1 : 0;
  if (contactSteps > Math.round(1.5 / Math.max(dt, 1e-3))) {
    // Push away from the nearest wall centre.
    let best: WallBox | null = null, bd = Infinity;
    for (const r of boxes) { const d = Math.hypot(x - (r.minX + r.maxX) / 2, y - (r.minY + r.maxY) / 2); if (d < bd) { bd = d; best = r; } }
    if (best) {
      const away = Math.atan2(y - (best.minY + best.maxY) / 2, x - (best.minX + best.maxX) / 2);
      const sp = Math.max(Math.hypot(vx, vy), size * 0.6);
      vx = Math.cos(away) * sp; vy = Math.sin(away) * sp;
      reasoning = 'pressed against a wall too long — disengaging';
    }
    return { vx, vy, x, y, reasoning, state: { contactSteps: 0 } };
  }
  return { vx, vy, x, y, reasoning, state: { contactSteps } };
}
