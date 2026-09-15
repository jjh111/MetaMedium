# CONTROL-POINTS-PLAN.md — magnets and handles

**Proposed 15 Sep 2026, branch `control-points`.** John, on parsed diagrams:
*on things like lines and shapes for diagrams can we get parsed in to have
control points, and snap points for diagramming.*

A traced flowchart is ink the engine has already read — boxes, arrows, the
relations between them — but the pen cannot yet *work* it like a diagram: an
arrow drawn to a box floats near it, and a shape's geometry can only be taken
whole (the snap ghost) or left alone. Two affordances close that, and they are
the same affordance seen from two ends:

- **Magnets (snap points)** — the places a mark offers attachment: a line's
  ends, a box's corners and edge-middles, a circle's centre and cardinals,
  an arrow's tip and tail. Derived, never stored: they are arithmetic on the
  clean form the mark carries or would be offered, exactly like `measure.ts`.
- **Handles (control points)** — the same geometry made draggable. Selecting
  a mark shows its form's parameters as points; dragging one reshapes the
  form. Ink is never destroyed: a reshape is a rep, and undo drops it.

A bind is an edge in the log — `bound-to` between the new stroke and the
mark, carrying the site — so it replays, merges live, and is queryable
("what hangs off this box?"). P3 makes those edges *follow*.

## Invariants no package may break

1. **Ink is never destroyed.** Magnets and handles act on the clean form; the
   stroke underneath is untouched, and dropping the rep is the undo. (clean.ts
   rule 1 holds.)
2. **Sites are derived, never stored.** A magnet is computed from the clean
   form on demand — the log stays the only source, replay stays deterministic.
3. **Fixed pixel thresholds are about the HAND, not the world.** Attraction
   radii take world-units-per-screen-pixel, like `getFingerprint(points,
   scale)`; the same gesture binds at any zoom.
4. **A magnet is an offer, not a trap.** The hold shows (a ghost dot), the
   hand can push through it, and drawing past dissolves it — ignoring is a
   valid answer (session.ts line 10).
5. **Ambiguous marks offer bounds, not lies.** A mark with no confident
   reading still offers its corners and centre from its own ink; it does not
   pretend to a shape.

## Packages

### P0 — magnets in core · **this branch, first commit**

`metamedium-core/src/session/magnets.ts`: `magnetSites(node, nodes)` per
shape — line/arrow: tail, tip, middle (tip and tail from the `reading:arrow`
rep where held, as `measure` does); rectangle: 4 corners, 4 edge-middles,
centre; circle: centre + 4 cardinals; triangle: 3 corners + centroid; arc:
ends + centre; dot: its point; anything else with ink: bounds corners +
centre (invariant 5). `nearestMagnet(at, sites, radius)` and
`magnetRadius(sizePx, scale)` (invariant 3). Exported from `index.ts`.

**Done when:** vitest covers every shape's sites, the ink fallback, and the
nearest-site query's radius and tie behaviour; `npm test` in metamedium-core
is green with the suite's existing 574.

### P1 — the pen feels them (surface)

While a stroke is being drawn, its moving end attracts to the nearest magnet
within radius; the hold draws as a ghost dot with the site's name on hover;
releasing inside the hold lands the endpoint exactly on the site and logs
`bind { strokeId, nodeId, site }` — an edge `bound-to`. Drawing past the hold
dissolves it (invariant 4). The e2e gains steps: a line drawn near a box's
corner binds to it; a line drawn past does not.

**Done when:** the felt thing is true in the hand — draw an arrow roughly at
a traced box and it *clicks* — and the e2e passes at its full length.

**← the MVP line: everything above it is the felt feature.**

### P2 — handles

A selected mark with a clean form shows its handles (the same sites, kind
permitting: corners, middles, tip, tail, centre). Dragging one dispatches
`reshape { id, handle, to }`; the clean form updates, the ink stays beneath,
undo drops the reshape. Engine: the event, its replay, its tests. Surface:
the drag, in `07-input` / `05-selection`.

**Done when:** a traced rectangle's corner drags to true it against the
raster parked beside it, and undo restores both.

### P3 — bindings follow

Moving or reshaping a mark re-anchors the endpoints bound to its sites: no
solver — on a `move`/`reshape`, each inbound `bound-to` re-derives its point
from the site's new position. A moved box carries its arrows.

**Done when:** drag a traced box and its bound arrows follow; the log shows
the re-anchoring as events; undo of the move restores the arrows.

### P4 — the diagram-repair demo

Photograph a flowchart (the tracer's honest gap — its fixture is painted,
not photographed — gets its first real fixture), trace it, repair it with
magnets and handles, extend it with the pen. The figure Whitepaper v5.1 has
been waiting for: *pixels in, a working diagram out.*

**Done when:** the demo runs start to finish from a phone camera, and the
tracer's ROADMAP entry can drop its "painted, not photographed" caveat.

## Debts, said plainly

- Junctions (where two strokes cross) are not sites in P0; the spatial graph
  knows the crossings, and P1's pen will want them. Added to P1 if the felt
  gap shows, P3 at the latest.
- A bound endpoint that its site *leaves* (the target is erased) must fall
  back to plain ink gracefully — the edge dies with the mark, the stroke
  stays. Covered by engine erase semantics; a test in P1.
