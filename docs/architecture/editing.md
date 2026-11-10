# Magnets, bindings that follow, routing, handles and regions

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Magnets and bindings: the pen feels where a mark offers attachment

> `core/src/session/magnets.ts` (sites, `magnetRadius`, the
> binding queries), `bind.test.ts`; `Demos/surface/05-snap.js`, `07-input.js`.

**Sites are derived, never stored**: a line's ends and middle, a box's
corners, edge-middles and centre, a circle's centre and cardinals, a
triangle's corners and centroid, an arrow's tip and tail — arithmetic on
the clean form a mark carries or would be offered, so replay is
deterministic; unread ink offers its bounds, never a pretended shape — save
a closed outline whose best four corners hold it (`INK_CORNERED`,
`INK_NOT_THREE`, the flowchart's own measure), which a flat diamond is and
the rung reads unsure: its four corners are then the sites, clockwise from
the top (S2; an oval, a pentagon, a flat triangle and writing keep their
bounds), and a mark's own site leads a tie with a notation's port at the same
point. Radii are about the hand (`magnetRadius(sizePx, scale)`). While a
connector is drawn its end shows the nearest site in reach as a ghost
ring; releasing inside lands the endpoint on the site and logs `bind`.
**A magnet is an offer, not a trap**: the hand can push through it, and
drawing past dissolves it. Binding is for connectors (line, arrow, arc); a
stroke matching the active command mark is never pulled, and a
letter-sized stroke is writing.

**One `bound-to` edge per endpoint** (BIND-1): an edge is one claim with
one reason, and two endpoints are two claims — a single edge could only
state one of them, which was the bug. The edge carries `end` and `site`,
the `bound` rep beside it carries the same, removal is keyed by `end`, and
`bindingsOf` / `boundRepsOf` agree. **Erasing a target keeps the claim**:
the edge and rep stay, `active: false`; `activeBindingsOf` never returns a
tombstoned target, and undo of the erase makes it an anchor again, because
state is a pure function of the log. P1-era logs replay into this
representation unchanged. P3, bindings that follow, builds on it.

**Ports by notation, heads, and figures of several strokes** (V1-PLAN E3;
`session/ports.ts`, `diagram/heads.ts`, `diagram/figures.ts`). A notation that
reads a mark as one of its symbols registers (`registerPorts`) and offers that
symbol's ports — a point, or a segment or outline where the nearest point is
the port — after the mark's own sites, through the same `magnetSites` /
`nearestMagnet` / `magnetsNear` the pen asks, so the surface feels them
unchanged. A place along a port binds as `along:<notation>`, its index its
share of the port, and `siteOf` finds any bound site again where it stands
now; with no notation registered every query equals a golden captured before
the hook (`src/test/magnets.golden.ts`). `headsOf` reads what sits at each end
of a line, an arrow or an arc — the arrow's own barb, a small triangle, diamond
or circle touching the end on its axis, a separate chevron, a fill — hollow or
filled, filled measured as ink coverage of the head's own inside, so a fast
hatch and a head three times the size read alike; writing at an end is a
label, not a head; a closed mark that reads as no head — the class's own box
at the end of a long relation — is nobody's head and takes no fill (S2). `figuresOf` reads ruled strokes whose ends meet — tied by a
magnet, or touching within the magnet radius — as one figure: a triangle, a
quadrilateral (a diamond, said as one turned about 45°; a rectangle when its
corners read right), a polygon. Each side keeps the marks it was drawn with,
and each figure is the maths lane's own (`polygonFigure`), so
`solveBoard(state, { figures: figuresOf(state) })` solves a triangle ruled in
three strokes as it solves one drawn in one. All three are derived: nothing
enters the log.

**A held form's sites are its own** (E1): a snapped or reshaped mark's ends,
centre and cardinals are read off its clean form where it stands (a circle's
from its own ellipse, placed), so they follow a reshape as the drawn form
does; an offered form is placed as the ink is, so a moved or tidied mark
offers its sites where it stands — they stood where it was drawn.

**Bindings follow** (V1-PLAN E2, CONTROL-POINTS-PLAN P3 as amended;
`session/follow.ts`, `follow.test.ts`). A connector bound to a site
re-derives its end when the mark it is bound to moves, scales, turns, is
reshaped, tidied or snapped — **derived in the apply path, never logged**:
a move is the one event, and undo of it takes the connectors back by itself.
**The derived form is a `'follow'` rep** (`FollowRep`: `map`, `ends`,
`reasoning`, source `engine`) — an affine `map` in the connector's OWN space
(`session/affine.ts`), applied by `placed` before the hand's transform and
turn (`nodes.ts`; `unplaced` undoes it last, `boundsOf` reads it), so its
ink, its clean form, its reading's tip and tail, its sites and its handles
are all carried and the ink is never touched; held in its own space, a
later move, scale or turn of the connector by the hand acts on the board as
on any mark. A `'transform'` is a frame and a turn about its centre, and
cannot say *turn about this end and stretch*. **The correction** (`followed`)
reads each ACTIVE bound end — `activeBindingsOf`, so an erased target moves
nothing — where it stands (`connectorEnds`: a held clean form's ends, else
the ink's, an arrow's tip being the ink the pen first reached farthest along
its shaft, `inkEndsOf` in `diagram/heads.ts`; the rung's tip is that same
ink since S2) and where its site stands now (`boundSiteOf`), and
composes onto the map it held the similarity that carries one onto the
other: **one bound end** pivots and stretches the connector about its free
end; **two** are carried by the one similarity that takes both; sites that
moved alike (both ends on one moved mark) translate it; two ends on ONE site
take the mean step — **never a collapse** (nor a length under the hand's
floor). Composed onto where it STANDS, a binding let go (an `unbind`, a
target erased) leaves the connector where it stood, and a bind carries its
end onto its site at once, so a move merged before a bind or after it gives
the same board. **Triggers**: the reducer follows after `move`, `scale`,
`rotate` (one pure function of a mark, `session/manipulate.ts`), `tidy`,
`reshape`, `snap`, `propose` (which can never propose a `'follow'`) and
`bind`, carrying the chain on — a connector bound to a connector — round by
round in id order, each at most `FOLLOW_VISITS` times (`followThrough`); a
board with no binding pays nothing. `boundBy` (who follows each mark) is kept
with the index and in checkpoints. Nothing else moves a mark: a text's new
version is code, not ink, and a word has no sites of its own (it has no
ink) — a connector bound to one of its letters follows when the word is
moved, as a move takes a word's letters. **What reads it**: a follower is filed
where it stands (`boundsMoved`), so the reach index, the components and a
scope's relations see it there, and its wire is inferred again from its ends
(`rewire`: `connects`, `points-from`, `points-to`), so a moved box's arrow
still points at it; its heads and maths read it where it stands. Stored
relation edges are not recomputed for a follower, as they never were for a
moved mark. Not followed: a head drawn as a separate mark (it is bound to
nothing — Mermaid in's arcs and `<-->` starts); a notation's reading that
changes with its context (a figure's ports appear with a stroke drawn beside
it) is found again only at the next trigger.

**The hand on a connector's own ends** (the director's decision; the
session's doors, `reshapeDecision` and `releasedBy`). A connector's own tail
or tip dragged by its handle and let go where a magnet holds it binds there —
`reshape`'s `bind`, the site the pen's magnet holds, the old claim for that
end replaced — and let go anywhere else, that end's binding is released: a new
event, **`unbind { strokeId, end }`**, keyed by the end as BIND-1 removes.
Moved whole by the hand — a `move`, `scale` or `rotate` of it, an artifact
it is in, or its middle handle — it lets go of the ends that no longer sit
on their sites (`sitsOn`: within the magnet's reach, `holdReach`, in the
hand's pixels the connector was drawn at); an end on a mark moved with it,
or one a nudge left in reach (the follow puts it back), is kept. The door
writes the unbinds first, then the reshape or the move, then any bind — **in
one act** (L2j), so one undo takes it all back. A free end dragged onto a
magnet binds too. **The surface** (`05-selection.js`): while a hand moves,
scales, turns or reshapes marks, the connectors bound to them are drawn
following as they will stand (`dragFollowers`, by `manipulatedReps`,
`releasedBy`, `reshapeDecision` and `followPreview` — the functions the
replay runs, so the preview is the act); a connector's end handle feels
every other mark's sites as the pen does (`magnetQuery(w, except)`), with the
pen's ring; the status line says a bind, a let-go and what a move walked off.
e2e 53–53d; `mm.followDrawn()` and `mm.dragHold()` for tests.

**Ports follow too.** A notation's ports are read from the clean form a lone
symbol holds (`portOutline` in `notations/flowchart.ts`) — the form is where
it stands — so a binding at a decision's vertex follows the decision
reshaped or moved; what the symbol IS is still read from its ink. And a bound
port is found by the notation the ENGINE knows (`knowPorts`, every
registered notation's; `portSiteOf`, `boundSiteOf`), whether or not the page
offers its ports to the pen — the pen's offer is the page's, the log's claim
is the board's, and state stays a pure function of the log.

## Routing: connectors at right angles between their ports (V1-PLAN §3, D7)

> `core/src/diagram/route.ts` (`routeBetween`, `outwardOf`,
> `deriveRoute`, `tidyPlanOf`), `route.test.ts`; the `route` event and
> `applyRoute` / `reroute` in `session/session.ts`; `tools/route.ts`;
> `Demos/surface/08-render.js`, `05-selection.js`; e2e 66.

A diagram's connectors are drawn by a hand, and a hand draws a diagonal.
**A `route` event** (`session.route({ ids, mode? })`; `mode: 'raw'` takes it
off, as `snap` has its `raw`) marks connectors that have both ends tied as
routed — a **`'route'` rep** on each — and **the polyline is derived, never
logged and never carried**: it is a pure function of the sites the ends are
bound to where they stand now (`boundSiteOf`) and of the boxes standing in
the way, found again in the apply path at the follow's own triggers
(`followFrom` → `reroute`: a move, scale, turn, tidy, reshape, snap or bind
of a mark it is tied to, an `unbind`, a stroke drawn, an erase), and only
when a change can reach it — the connector or its targets changed, a mark it
was routed among changed (`seen`), or one stands in the window it was read in
(`routeAffectedBy`). The follow of a connector is a similarity of the WHOLE
connector, and a route is not a similarity of anything, so it is never
stretched from one place to the next: a box moved is one `move` event, the
ink follows as it always did (E2), the route is found again from the ports,
and undo of the move springs it back. The room oracle runs it (`route` among
its acts, `src/test/room.ts`), and the polyline agrees with a replay from zero
and from a checkpoint after every merge.

**What reads a connector still reads its ink.** The `'route'` rep is a form
drawn in front, as a snapped form is, and `boundsOf`, `standingPointsOf`, the
sites, the wires (`connects`, `points-to`), the heads and the notation's
reading are of the ink the follow carries onto the sites — so a routed
flowchart reads as the same flowchart and says the same Mermaid (both tested).
Not, as a clean rep would be, where the connector "stands": a route stands
over TWO other marks, and reading it as the connector's own would change what
the drawing reads as. While an end is tied to nothing there is nothing to
route between: the rep stays (the log says routed), holds no points, the ink
is drawn, and the route stands again when the end is tied.

**The route** (`routeBetween`, pure and deterministic). Each end leaves along
its port's outward normal (`outwardOf`: a box's edge middle straight out; a
corner along one of the two sides it belongs to, the one that faces the other
end; a decision's vertex outward — the site read against the box of the mark
it belongs to; a site in the middle of a mark, which has no outward, toward the
other end), by a stub of the hand's own size (`STUB_PX`, `STUB_SHARE`); then a
search over the lines the marks in the way leave open (their edges a stub off,
the stubs' ends), with the fewest turns first and the shortest next, never
more than `ROUTE_MAX_TURNS`. The marks in the way are the closed marks in a
window round the two ports that are big enough to go round (`MIN_OBSTACLE_PX`:
a letter is not one), not a mark that holds or sits inside a symbol the
connector joins, at most `MAX_BLOCKS` of them, nearest first. **It never fails
to draw one, and it says when it could not go round**: shorter stubs are
tried, then the two symbols alone, then a direct elbow, and a route through
marks says `avoided: false`, the marks in `blocked` and *could not avoid …*
in its reasoning. An arrow's head is kept at the tip along the last segment
(`head`: the barb as drawn, never more than a share of the segment). A
separate head drawn apart — Mermaid in's arcs — is bound to nothing and
stays where it was (a known gap).

**Tidy the diagram** (`tools/route.ts`, `tidyPlanOf`): the tool offers, at
tier 1 and for a notation reading with connectors tied at both ends — never a
row of boxes, a molecule, a flowchart with its arrows loose, or a sequence
diagram, whose messages are level by definition — *Tidy the diagram*, *Route
the connectors* and, once any is routed, *Show the connectors as drawn*. Tidy
is tidy's alignment plus routing **in one act**: the symbols are ranked by the
longest way from where the flows begin (a flow round to a symbol already on the
way is a loop and left out), each rank of two or more standing within reach
of each other is lined up as a row (flows down) or a column (flows across) by
`session.tidy`, the writing standing on a symbol carried with it by a `move`,
then every tied connector routed. A symbol drawn in several strokes is left
where it stands (tidy places whole marks). The surface draws the route in
front with the hand's ink — and the clean form it held — faint beneath
(`08-render.js`, `mm.routesDrawn()`), files the mark by the box its route runs
in, and draws a routed connector routed from where a drag is taking what it
is tied to (`dragFollowers`): the preview is the act.

## Handles: the one selected mark's own points (V1-PLAN E1)

> `core/src/session/handles.ts` (`handlesOf`, `reshapePreview`,
> `reshapedClean`, `reshapeClean`, `MIN_EXTENT_PX`), `handles.test.ts`; the
> `reshape` event in `session.ts`; `standingPointsOf`, `unplaced` and
> `boundsOf` in `nodes.ts`; `Demos/surface/05-selection.js`, `08-render.js`.

**One mark selected alone, with a clean form, shows its handles** — held,
or the one it would be offered (the magnets' rule). They are its own magnet
sites made draggable, never a notation's port: a box's four corners, four
edge middles and centre; a circle's centre and cardinals; a line's or an
arrow's tail, tip and middle; a triangle's corners and centroid; a dot's
point; and for an arc its two ends and its **bulge**, the third point an arc
is drawn through (the magnet at the middle of its span lies on nothing, so
it is no handle). A mark with no clean form — writing, ink the rung cannot
place — shows none, and nothing is pretended; a loop waiting to be taken up
is a gesture in waiting and is never reshaped, as it is never snapped.

**Dragging one writes one event**, `reshape { id, handle, to, at }` — one
act, one undo (L2j). `handle` is `{ kind, index }`; `to` is where the hand
let go **in the mark's own space** (`unplaced`: the space its ink was drawn
in), so a move, scale or turn merged before or after it carries it as it
carries the ink, and the reducer places nothing. The door takes `to` on the
board and runs the function the replay runs (`reshapePreview` →
`reshapedClean`), so the preview is the act, and it writes nothing when the
drag makes nothing. The `'clean'` rep is replaced (with `reshaped`, the
handle last dragged), never changed in place; **the ink is never touched**;
a mark not yet snapped is snapped by the same act — born reshaped.

**Per shape** (the header of `handles.ts` has it all): a box keeps its own
frame, turned or leaning — a corner is taken in the frame of the two sides
that meet at the corner across, which stays; an edge middle moves its side
across only; the centre moves the form whole; dragged past the side across it
flips, each corner keeping its number. A circle's cardinal sets its radius
(an oval's, the axis it stands on), its centre moves it. A line's end moves
that end. An arrow's too, the head kept at the tip along the new shaft — the
barb as drawn, at most a fifth and at least a fortieth of the shaft, so it
reads back as an arrow. A triangle's corner moves freely. An arc's end turns
and scales it about the other end, keeping its sweep; its bulge bends it
through its ends and the point on the chord's perpendicular. No extent under
`MIN_EXTENT_PX` of the hand.

**Where it stands is read from the form; what it was read as is not.** A
reshaped form is the hand's own geometry, so `boundsOf` and
`standingPointsOf` return it — the relations, the reach index, the scratch,
tidy (which fits the ink's frame so the form lands where it placed it) and
every hit read it — and so do its sites and its maths (`measure`: a held
line's and arrow's ends, a held form's shape). The shape rung's readings are
**not** recomputed: they measure the ink, which is as drawn, so a box
dragged into a thin bar is still a rectangle. A notation's symbols, heads
and figures are readings of the ink too, and still read it. A form only
snapped is the ink's measurements redrawn, and the ink still stands for it.
*Show the ink* (`snap` raw) puts a reshaped form away and files the mark on
its ink again. `placed` carries an axis the ink has no extent on (a ruled
line's height) instead of fitting it by a factor of nothing, so a flat
line's end dragged up survives a move.

**The zone rule** (05-selection.js): every handle — the selection's scale
corners and knob, and the mark's own points — owns the ground nearer to it
than to any other, within a handle's reach; on an exact tie the selection's
own wins; the rest of the outline is the move zone. A box's corner carries
both — its own on the ink, the scale corner on the outline a little way out
— and is split by nearness (e2e 52c). The mark's points are rings, with a
dot in the ones that move the form whole; a mark under `HANDLES_MIN_PX` on
screen shows none until zoomed in, so the move zone keeps room; the dragged
ring grows, the form previews in front with the ink faint beneath, and the
standing line adds *a ring to reshape*. **Whatever may move the selection
may drag a handle** — the mouse, the pen, a finger while fingers draw — and
**a finger that pans while a pen is present never reaches one** (pencil
P11). A handle drag is never a stroke: no ink, no summon.

**What E2 made of it** (*Magnets and bindings*, above): a `reshape` changes
exactly one thing, the mark's `'clean'` rep, and every site is derived from
it, so a connector bound to one follows it there (corner 2 stays corner 2,
even through a flip) — and a follower stands where `standingPointsOf` says,
carried by its `'follow'` map. A notation's ports are read from the clean
form. A connector's own bound end dragged by its handle binds where a magnet
holds it and lets go anywhere else, in the reshape's act.

## Regions: named places on a board (PLAN-IPAD-NOTES I5)

> `core/src/session/board-regions.ts` (the rule, nesting, what a move carries, the sentence, the outline),
> `board-regions.test.ts`; the `region` and `rename` events in `session.ts`; `tools/region.ts`;
> `Demos/surface/12-regions.js`, `05-selection.js`, `08-render.js`, `10-inspector.js`, `21-minimap.js`; e2e 71–71m.
> (Not `session/regions.ts`, which is an artifact's layout — the drawn boxes a page is read from.)

John organises hand notes on an iPad: **a region is a named rectangle that holds whatever stands inside it** — ink, pictures,
texts, figures, other regions — so *Monday* and *Pricing* are places on a board. It is a node of its own with a `region` rep
(its name, and the drawn rectangle it was taken from) and a `bounds` rep: **not ink, not content, not an artifact**, so it joins
no cluster, signature, lasso or scratch, and the marks inside it read exactly as they did without it. It is made by a
`region { name, bounds, from? }` event and renamed by `rename { nodeId, name }`; `SessionState.regions` lists the live ones in the
order made. **What it holds is derived, never copied into the log**: the things on the content plane whose box is mostly inside its
box — `REGION_HOLDS`, the one rule, a share of the thing's area with each axis taken alone so a line is held by where it lies — read
where they stand now (an artifact made of marks stands where its marks do). A mark drawn in is held, one dragged out is let go,
and nothing is written for either. A region is held by a larger one by the same rule (two of a size never hold each other), so
regions nest; `from`, the rectangle the hand drew, is the region's own frame — never counted as held, carried when it moves.

**Moving or scaling a region is ONE `move` / `scale` event naming the region**; the session carries what it holds when it applies
the event (`regionCarries`, the function the surface's drag preview asks too, so the preview is the act), through the same
`manipulate.ts` and follow machinery as any move — one act, one undo. A connector the region holds only by where it stands, tied to
something it does not carry, is **not carried**: it follows what it is tied to (its other end where it was) rather than walking off
its site; a connector tied inside, at both ends, travels with it. A turn leaves a region be (a turned rectangle is not a rectangle):
the marks named turn, the surface shows no knob for a selected region. **Erasing a region keeps everything it held** (the status
line says so); undo brings it back. `manipulableOf` now also moves an artifact made of marks (its frame with its marks) and a file
brought in with no marks (a text, a figure), and `frameOf` follows a `transform`, so a page or a text made from writing no longer
leaves its frame behind when moved.

**The tool** (`tools/region.ts`, registered after *Trace into ink*; I9's *Notes like this* follows it): *Make it a region* is offered when a held rectangle
holds the rest of what is held and at least `REGION_MIN_HELD` things (three notes make a place; a labelled box does not) — a loop
held by press-and-hold arrives with everything inside it — so e2e 49's three golden scopes are untouched; a rectangle with less, and
marks with no rectangle round them, are made a region by typing `region: Monday` (the reader's prefix in `09-field.js`, the line
saying *make a region “Monday” — round what is held* before Enter), the region drawn round them with a margin. One act stamped
`region`: the field closes, then one `region` event. An untyped region is named *Region 1* and renamed in the panel.

**On the surface** (`12-regions.js`): a quiet frame in the board's label colour under the pictures and the ink, its name at the top
left in board units (never under a legible size on screen); a press on the title selects the region and drags it (a selected region
moves by its title and the band along its edge, never its inside — the inside is where the hand writes); the panel's *is* says
*a region “Monday” — holds 12 marks, 2 pictures* with its name to change (a `rename` event); **the board's outline** — the regions as
a tree in reading order with what each holds — stands at the foot of the panel and a tap fits the view to one; Delete erases the
region alone; the minimap outlines regions; a text or figure in a dragged region follows the drag (`dragFrameOffset`). The MCP hand's
`canvas_look` lists regions with what they hold, and `canvas_region` makes one (*The hand organises notes*).
