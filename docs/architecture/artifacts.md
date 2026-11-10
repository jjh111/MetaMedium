# Living artifacts: layout, code that runs, frames, text, programs

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Parsing: the drawing as a layout

> `core/src/parse/` — `layout.ts` reads it, `scaffold.ts` builds from it.

Regions alone are a bag of rects, and a model handed pixel rects writes
absolutely-positioned divs: a faithful tracing of the ink that is not real code.
`parseLayout` runs a **recursive XY-cut** (the document-layout algorithm) over
the regions — find a gap that runs clean across the group, split there, recurse
with the axis flipped — turning four boxes into
`column(header, row(left, right), footer)` with the proportions that were drawn.
Containment the human drew is honoured first; marks that overlap in both
directions fall back to `stack`.

`buildScaffold` renders that tree as **flexbox with proportional growth**: exact
at the size it was drawn, and still code that reflows. Two rules earned the hard
way, both by running a real model:

- **The element carrying `data-region` is pure geometry.** Everything the model
  styles lives one level inside it. With `box-sizing: border-box` a
  `flex-basis: 0` item cannot be smaller than its own padding and border, so a
  padded region starts ahead of its siblings and the whole column shifts.
- **`min-width`/`min-height` are zeroed on every flex ITEM**, not just
  containers — their default is `auto`, so a region with a long list in it
  refuses to shrink and pushes everything else out of place.

`validateRegions` checks the result still matches the drawing. A promise nobody
checks is one you find out about from a screenshot.

**A figure wears its chrome only while you point at it.** The gold brackets
and the filename say *a thing with an identity you can grab*, which is what you
want over a page or a program; over a title, a label inside a drawn box, or a
note, they are a second drawing on top of the first, and a figure made of eight
of them is unreadable. Same rule the reading under a mark already follows —
shown for the one the hand is on, not for every mark on the board. A page keeps
its brackets, because it has a plate under it anyway.

**A figure follows the theme.** Its document carries the board's own ink colour
baked in (an iframe inherits no token), so the theme is part of what the
document is *made of* and belongs in the frame's stamp. Without it, switching to
paper left every label in the dark theme's near-white ink on a light ground — a
figure that vanished when the light came on.

**A few words are a caption and fill their frame** (`TEXT_FITS_LINES` in
`13-kinds.js`); a file of text flows at a size the screen holds. Writing turned
to text was the first caption and the rule was written as *did it come from
ink* — but a label written onto a drawing is a caption however it arrived, and
held at screen size it floated free of the drawing it labels the moment the
board zoomed.

**A figure is not a page** (`FIGURE_KINDS` in `Demos/surface/02-artifacts.js`,
`figureCSS` in `13-kinds.js`). A page, a script, a table or a tree is something
you read *on a page*, and the white plate under it is that page. A program, a
drawing and a line of words are marks among the ink, and a plate behind them
fights what they stand in. `run` had the rule alone; `svg` and `text` have it
now — clear ground, no plate, no shadow, type in the board's own ink token, so
a figure written onto the canvas reads in either theme. And **a text sets its
words once**: a text run's addressable label *is* its own first forty
characters, so printing every region's label over it, which is right for a
function or a key, set every line of a text twice. Found by writing a label
with the MCP hand and getting a white card with the words on it twice.

## Living artifacts

An artifact may carry a `'code'` rep, which puts it on `SessionState.live` and
makes it render as real DOM in the canvas. The rules:

- **The engine owns structure; the model owns content.** Generation asks for
  per-region `html`/`tag`/`style` plus a theme, and says the layout is already
  decided. Asked instead for a positioned page, a real local model returned good
  copy and *no positioning at all* — so the geometry is an invariant now, not a
  request (MVP.md §6.2).
- **The drawing is the brief.** Beside the layout tree the model gets
  `describeReading()` (`participants/serialize.ts`) — genre, what each region
  *plays*, the engaging relations between regions, the concepts they read as,
  and any names the human gave — **in region ids**, the same names the layout,
  the reply and the DOM use. Concepts are matched per scope and a container is
  not a peer of its contents, so each container's contents are read on their
  own too (`WITHIN CONTAINERS:`), or the row inside a frame is invisible. A
  label is handed over as handwriting the model cannot read and must title;
  "a page" is told to infer a subject from the structure rather than write
  placeholders. `ask` and `interpret` get the same brief for a group.
- `regionsOf(artifact, nodes)` returns member marks in **reading order**
  (top-to-bottom, left-to-right, containers before contents), because region ids
  are how the human, the model and the DOM refer to the same thing.
- A closed stroke drawn **on** a live artifact is lasso-like even enclosing no
  mark — it encloses a *region*. `Summon.onArtifact` reports which artifact and
  which regions, so ink over a running page addresses real elements.
- `agent.generate()` is **one method for build and revise**, because it is one
  gesture; whether the artifact already carries code decides which.
- Every version is held and attributed. Rendering the newest is a display
  choice, not a commitment.
- **A frame whose document changes gets a new iframe element**
  (`syncStage`). Assigning `srcdoc` twice in one tick — the source card at
  import, the harness at play — lost the second navigation on a board with
  a dozen frames loading: the program never started and nothing said so.
  A fresh element always navigates, and the message listener ignores the
  old window by identity.
- A **broken** artifact leaves the live plane: code is a contract with the marks
  that framed it, and a page rendering over erased ink is the silent phantom
  degradation exists to prevent.
- **A late result never resurrects a deleted target** (STATE-1,
  `src/session/stale.ts`). A model thinks for minutes while the hand keeps
  drawing, so every deferred result says which board it was asked about, and
  `attachCode` / `propose` / `answer` refuse it at the session's own door when
  that board is gone: the target `erased` or `missing`, the board `replaced`
  (a `load`, which bumps `state.generation`), or the version `superseded`.
  Three rules, each a failure that was live: **never a throw** — the hand knows
  nothing about the call; **never a silent drop** — the refusal lands on
  `state.staleResult` (`MarkMiss`'s sibling: nonfatal, transient, cleared by
  the next event) and the agent returns its sentence, so the surface says *the
  target was erased before qwen3's code arrived*; and **never into the log** —
  a refused event is rejected *before* it is appended, because an event in the
  log is replayed, and one parked there came back to life the moment the human
  undid the erase that discarded it. The pin is scoped by generation and
  target/version, never a global busy flag: a second model must still answer
  about unrelated marks while the first one thinks. A **build** is unpinned, so
  several participants may each offer code (no tier commits); only a
  **revision** pins `codeVersion`, and the conflict policy is that **the
  standing newer version wins** — a revision written from a version the
  artifact has moved past is refused, not silently overwritten. The erased
  check also lives in the apply path, so a merged log that arrives
  erase-before-code reads the same way: state stays a pure function of the log.
- **A playing program takes the pointer; ink begun outside goes over it**
  (v10 D2, `pointerFrameAt` / `postPointer`). The canvas keeps every
  pointer — the stage stays under the ink — and a pointer-down inside a
  *playing* `run` frame is forwarded to it: the harness dispatches it inside
  as real pointer and mouse events (a click after a still release) and
  hands it to `mm.onPointer`; every move and the release follow, nothing
  drawn. A stroke begun anywhere else is ink across any frame it crosses,
  which is how the 3D thing is doodled on. A page and a still program take
  ink from anywhere (nothing in them to press); a loop that waits is the
  hand's wherever it lies, so the tap or mark that takes it up lands in
  the loop, not the frame. The cursor changes over a playing frame.
- **Code from another hand plays only after *Play it here*** (the multiuser milestone, 23 Oct 2026; `grantedHere`,
  `trackConsent`, `codeVersionOf`, `ownPlayStands`, `playHere`, `frameLoaded` and `WORKER_HOST_CSP` in
  `13-kinds.js`, `pinBase` in `00-core.js`, `session.clockAuthor`; e2e `security`). A `js` behaviour and a `run`
  program run arbitrary code, so they run in a tab only when THIS hand played them here, live. A play that arrives
  in a log brought in any other way — a room's line, a file, a folder, a carry, a reload — is said once, in the
  person's words (`noteStandingPrograms`, `tellPlayingPrograms` in `17-folder.js`; a dashed edge on the frame), and
  waits for the person's tap, which writes this hand's own `clock` play and undoes per hand. **A grant is for the
  code it was given to** (`codeVersionOf`: the newest code rep's time and a hash of its code): it holds the
  versions this hand played, or wrote itself while playing (its own model's revision is its own), so another hand's
  new version of a program played here — a revision of theirs, the MCP hand's `canvas_write` — stands by, dashed,
  offering *Play it here*, and the status line says who wrote it (*bob wrote a new version of …*). **A frame another
  hand made that wires a program this hand plays is a version too** (`wiringOf` in `16-frames.js`, `wiredBy` in
  `13-kinds.js`; e2e `security` C1.6): what a playing `js` runs is its code as a frame wires it, so a foreign frame
  that retunes it stands by the same way (*eve wired “…” to a frame of theirs*), while a frame this hand made is its
  own act and makes no new version. Values that flow through a wiring this hand consented to may still come from
  another hand — its own frame wiring eve's slider lets her knob retune its program; that is what wiring is for, and
  a foreign frame let in by *Play it here* may retune it through its own values the same way. **A grant holds while this
  hand's own play stands** (`ownPlayStands`: the last of this hand's own clock events for it, the ones no merge
  stamped `by`, is a play) — never "while the last clock event is mine" — so another hand pressing *Play it here*
  too, an undo of an unrelated stroke and a late line that cuts the board leave it running, while this hand's own
  pause, reset or undo of its play lets the grant go (another hand's pause stops the clock in the log itself); a
  tank held still under reduced motion follows the same rule (`tankStartedHere`, `14-clocks.js`). The consent is
  runtime, like paint, so `SessionState.clocks` stays a pure function of the log; a shipped example's program is
  granted as it opens (`grantPlayingPrograms`, its code being the site's own), except under reduced motion — and
  only on the board the example made: opened from a room (or a folder), which leaves for a page of its own, the new
  board's id goes ahead in `sessionStorage` (`mm-example-grant`) and the page that opens grants that board alone as
  it opens (`exampleGrantAtOpen` in `22-boards.js`), so nothing playing on the room's board runs as the page leaves
  (e2e `room` R13). **Played here, a behaviour is still sealed**: its worker is made inside an opaque-origin
  sandboxed iframe whose CSP has `connect-src 'none'` and a `script-src` naming no host — no fetch, XHR, socket or
  beacon, no `import()` of any address — and whose null origin makes `indexedDB` throw, so the person's boards are
  out of reach; inside, `WORKER_HARDEN` also takes the network, storage, channel and nested-worker globals away. A
  `run` or `mermaid` frame carries a CSP of its own (`frameCSP`): `connect-src 'none'`, scripts only from the
  pinned library's host, pictures and media only from the page's origin, `data:` and `blob:` — so it cannot fetch,
  open a socket or beacon. **It can still navigate its own frame**, which no CSP governs (a navigation is not a
  connection), and a GET leaves with whatever the program puts in the address, so **what a frame can read holds
  nothing of the page**: its origin is opaque, and its base URL is the page's `<base>`, the page's address less the
  fragment and less an old link's `?key=` (`pinBase` in `00-core.js`, first in the head before any frame is made
  and kept in step after every `replaceState`), so no frame's base holds a room's key, even after the program takes
  its own `<base>` away. And a frame that loads another page is stopped: its document is set before the frame is
  inserted and says it is here as it begins (`frameHello`), so a later load that no such word came before is the
  frame navigating, and the program is marked broken with the reason (*tried to load another page in its frame*,
  `frameLoaded`); a mermaid frame is put back. A destination that answers 204 leaves the frame where it was and is
  not detected. A kind another hand names is escaped wherever the panel says it. Unverified on WebKit: reasoned,
  not run (the navigation check was made so that an engine loading an empty page first is not counted).

## Time: clocks, tanks, and code that runs (v8)

> `session.clock()`, `state.clocks`; `Demos/surface/13-kinds.js` (the worker),
> `14-clocks.js` (the tank).

**Nothing runs unblessed.** An artifact's clock is log state — playing, seed,
why it last stopped — and *play* is the human's event; time itself is
runtime, derived by the surface and never in the log. Two things run:

- **A `js` artifact's code**, in a worker built from a string inside a sealed,
  opaque-origin frame, loaded and stepped only while its clock plays and this
  hand played it here (*Living artifacts*, its last rule). A throw pauses the clock with the
  reason; a step past its budget terminates the worker and pauses with the
  budget named; the frame is marked broken and the board goes on drawing.
  Every textual kind renders into the same script-less iframe carrying
  `data-region` — a script's functions, data's keys, prose's headings — so
  ink over a script lands on a function the way it lands on a div.
- **A definition's tank.** A blessed artifact's own ink is its first body;
  blessed matches and the held candidates the engine recognises are the
  rest. Bodies step by the verb basis (`behave/`) — `wander` plus a little
  `hold` until words or a hand say otherwise — at a fixed step, one seeded
  stream per definition, in creation order, and are **re-derived from
  t = 0 whenever the log changes**, so undo re-derives the tank. The
  drawing is what moves; render translates and turns the ink.

**Words into verbs** (`behave/words.ts`): a table of the ways each verb is
said reads the common phrasing with no model ("flees anything bigger" →
`flee *`, only bigger); what it cannot read is returned, not dropped, and
`agent.behave` asks a model only for that, against the closed verb list. A
**`behave` event** from a human is blessed by the act; from a model or the
fit it is held until a human gives it in their name. **Acting it out**: drag
a body while its clock runs and the path is a demonstration, fitted onto
the basis at the pace it was shown, with the residual named. The fit takes
the body's own size — modelled at thumbnail size, every range-relative verb
saw nothing in reach. The panel's ladder is words → sliders → what each
verb is doing now → source.

## Text as an element (v8, WP-13)

> `Demos/surface/19-text.js`.

A `text` artifact is a file of words: rendered as prose ink can address, its
words offered to any slot a frame wires it to. Double-click on empty ground
opens an editor on the canvas where the text will stand; Enter keeps it,
Shift+Enter is a new line, Esc drops it; editing an existing text is a new
version of its code with every version held. Handwriting stays handwriting
until asked: *Make it text “…”* turns a read word into a text artifact where
the writing is, the ink staying.

## Frames: artifacts wired by reference, and the drawn slider (v8, WP-10)

> `core/src/frames/frame.ts`; `Demos/surface/16-frames.js`.

A **frame** is an artifact that *refers* to other artifacts and carries the
**connections** between their ports; nothing is copied or moved. Interfaces
are read, not declared: a script's tunables are its top-level numeric
constants, a page's slots its regions, a control's port its value, a word's
its text, a behaviour's its speed and weights. Connections are offered by
type and ranked by name, each with its reasoning; resolving a frame
substitutes the wired values wherever a member renders, runs or steps. The
**drawn slider** is the first drawn control: a line with a dot on it reads
as the `slider` concept, and the control's value is where the knob sits
along the track, read from the ink where it stands — dragging the knob is
setting the value, and the `move` that records the drag is the only event.
A frame built once is offered again by the name written beside a loop or by
resemblance, and export writes it as a folder of wired files.

## Programs, and the library first (v9 S5)

> `kind: 'run'` in `src/kinds/kinds.ts`; `agent.program` in
> `participants/agent.ts`; the harness in `Demos/surface/13-kinds.js`;
> `targetOf` / `runProgram` / `libraryEntries` in `09-palette.js`.

A brief at a loop is a **page** when the reading is a layout of boxes and
a **program** otherwise (`page:` / `run:` / `new:` override). A program is
`run` code: it renders itself in the other sandbox — `allow-scripts`
without `allow-same-origin`, an opaque origin that can draw and cannot
reach the page or its keys — on a **clear background**, sized to the ink's
frame, with three.js when it loads and a 2D context always, and it
**reports its parts** (named rectangles) back over `postMessage`, so ink
over a running torus lands on `torus`. An error thrown at any time — while
the code loads, in a frame, later in a timer or a promise — is posted back
and pauses the clock with the reason, the frame marked broken. **The library first:** before any
model is asked, a brief the library already answers reuses that entry
(typing an entry's name completes to it; a drawing that matches a coded
definition carries its program), and the model's brief lists what the
library holds so it may answer `{"reuse": name}` instead of writing.
Reused code says where it came from (`from`). A program the human asked
for runs on arrival; one that arrived any other way waits for play.

## The model holds a pen (the conversation benchmark's other half)

> `agent.draw()` in `participants/agent.ts`; `strokeFor` / `parseShapes` in
> `session/synthesize.ts`; *Ask it to draw…* in the palette.

A model contributes **marks**, not only words. It says what it would add in
the shape rung's closed vocabulary — rectangle, circle, triangle, line, arrow,
with coordinates in canvas units — and the engine draws each one through
`addStroke` **attributed to the model**, so the mark gets the same fingerprint,
readings, snap offer and eraser as a human's, and the surface colours it as the
model's. Its `why` for each mark is placed beside it with `session.answer()`,
so the reason is visible and erasable too. **A drawn shape is declared
content** (`addStroke(…, { content: true })`): it is never read as a lasso, a
command mark or a scratch, because those are commitments and no tier commits —
the first real run had a model's arrow cross a box three times and erase it.
The rule is about what was declared, not who drew it; an agent driving
`addStroke` without the flag can still gesture (v6 same-class citizenship).
`strokeFor` sizes an arrow's barb from its shaft (S2): about 40 units to a
shaft of 1,200, then a thirtieth of it — inside the fortieth to a fifth a
clean arrow keeps — so a long arrow is not a sliver of a head. The vocabulary
is closed on purpose:
a model that can only draw what the canvas can read makes marks the human can
argue with on the same terms as their own. `parseShapes` drops anything outside
it and caps the count (`MAX_DRAWN`). The brief it draws from is the same one
generation gets, plus the measured span of what the human pointed at.

**The rules that make tiers safe:** LLMs receive structured geometric data
(fingerprints, spatial graph, library context) — **not screenshots**. Every
tier *proposes*; no tier commits — a model's output is an unblessed, attributed
edge that the human blesses or ignores. LLM calls must never block drawing;
degrade to Tier 0, never gate on a tier.
