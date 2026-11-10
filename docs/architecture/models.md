# Models: tiers, seats, the house models, handwriting

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Tiered LLM Interpretation

> **Status (redressed 6 Sep 2026): three tiers, and a tier is a kind of
> knowing, not a place.** **Tier 0** is the shape rung — a stroke read as one
> of eight shapes. **Tier 1** is the engine's instant library
> (`src/tier1/library.ts`, a registry of fourteen modules: relations, the
> diagram rung, concepts, tidy, clean forms, the structure, signatures, words
> into verbs, the program library, tracing, the maths, acting out, wiring,
> words from letters) — everything that answers with no model and no wait.
> **Tier 2** is a model, local or hosted alike; *locality* is a cost the
> router pays attention to (local before hosted), never a tier. Before this
> a local model was "tier 1" and every instant conversion said "tier 0",
> which made a tier a place rather than a kind of knowing. A model joins via
> `createAgentParticipant()` and proposes through the same channel a human
> uses. Design: `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`.
>
> **Multi-interpretation is a hard rule, not a nicety.** Models are asked for
> *several* readings, several models can answer in the same tier, and **all
> tiers show at once** — a confident Tier 2 reading never evicts Tier 0's. The
> old "escalate only on low confidence" policy is withdrawn: escalation means
> suppression, and disagreement between sources is exactly what the human wants
> to see. Read with `interpretationsOf()` / `byTier()` / `bySource()` /
> `disagreement()`; `topInterpretation()` is a headline helper, not the truth.

- **Tier 0:** the shape rung (`recognition.ts`) — always available, offline — **built**
- **Tier 1:** the instant library (`tier1/library.ts`): relations, roles,
  concepts, tidy, clean forms, **the structure** (`buildStructure`: a page or
  a diagram from the drawing with every region in place and no words —
  what the canvas knows and nothing it does not), signatures, verbs, the
  program library, tracing, the maths, acting out, wiring, words, and **a
  graph in 3D** (`buildGraph3D`, v10 D7: circles joined by lines stand as
  spheres and bonds in a `run` program built from the drawing, each sphere
  named for its region so ink over it lands on that mark, turning on its
  own and by a hand pressed inside; the field's *Show it in 3D*, and a
  definition that holds one is rebuilt for the next drawing, never copied
  — `GRAPH3D_MARK`) — **built**. What a module lets the hand DO is a
  **tool** (see *Tools*): the field's affordances are the tools registry's
  offers, not this list; a module that acts names its tool
  (`InstantModule.tool`), and a route names the tool that takes its
  ability's act (`Route.tool`: arrange → tidy, build → the structure)
- **Tier 1½:** the decision seat (`participants/decide.ts`; `1.5` in
  `Capability`, `session/nodes.ts`, so every ordering over tiers keeps
  working) — **built in core, and on the surface since I7 as the *decider* seat**
  (below). Typed questions in — a
  *choice* among candidates the engine already holds, `no-match` always
  among them; a *score* on levels the engine named; the probability of *yes*
  for one statement — and a typed value with its whole distribution out,
  held as one attributed row beside the engine's readings, never evicting
  them, with the question and the distribution as its reason. A flat answer
  is not held (`isFlat`). A batch is asked over one snapshot: what it says
  about a board since replaced, or a mark since erased, is refused the
  STATE-1 way, never written into the log. It sits
  **behind an injectable transport** (`DecideTransport`;
  `createStubDecideTransport` in its tests) — a seat, never a dependency:
  nothing in `decide.ts` names a vendor or opens a socket, and with nobody in
  the seat the engine answers from tiers 0 and 1. **I7 (1 Oct 2026) put a
  transport in the seat and a job on the surface**: `llm/decide-openrouter.ts`
  (`createChatDecideTransport`) is a `DecideTransport` over `provider.ts`'s
  `complete` — the questions as one JSON user message of options (*none of
  these* always among them, never a node id), each named `q1…qn` on the wire
  and read back by that name (`wireName`), never by its own id, which names a
  mark and the hand that drew it — the answer asked for as typed JSON and read
  as a distribution over **exactly the options offered**: an option nobody
  offered, a negative or non-finite probability, nothing that sums to anything,
  or **a part of a distribution** — a sum more than `SUM_SLACK` (0.02) under 1,
  the pick's probability alone or the top few, which divided by its sum would
  be held as a certainty — leaves that question unanswered, never guessed
  (`partialSum` in `participants/decide.ts`, the one rule both decision
  transports read; a sum short of 1 by no more than the slack is the whole,
  rounded, and beyond it only a sum over 1 is normalised), and the pick is read
  back off the distribution. How Jev answers on OpenRouter
  (`typesafe/jev-1.13`, as John was told, `DEFAULT_DECIDER_MODEL`) is
  **unverified**, so everything a vendor's shape decides is a `DecideWire`
  (`build` the messages, `parse` the reply), the seam where the native
  `/v1/systemone` shape — which refuses browser origins, behind a proxy of our
  own — swaps in as another transport, not another seat. `DECIDER_TAKE_AT`
  (0.99) with `DecideOptions.takeAt`: an answer that leads by less is
  returned (`row.below`) and never held, and the engine's ranking stands; a
  seat made without it is as it was. **The first job is *Which is it?***
  (`tools/which.ts`, a tool with the dot): when a decider is seated
  (`ToolHost.decider`) and the field's top two definition matches are within
  `TIE_MARGIN`, the field offers to ask it between exactly those (by name),
  and **only that tap asks** — not a hold, not the field opening: CLAUDE.md's
  rule is that a model is asked only by a deliberate act, and opening the
  field is not one — so the tie is offered and the hand decides. The answer
  is one more held reading in its own name (*molecule 0.99 · Jev*, never
  evicting the engine's), and under the floor the status line says what it
  said and that the engine's ranking stands (`askDecider`,
  `Demos/surface/04-seatpane.js`; e2e M15). Since the multiuser milestone it has
  a second transport, Cloudflare's System One models through dyna.ink's relay,
  and two more jobs (*dyna.ink's own models*, below).
- **Tier 2:** a model — local via Ollama (`localhost:11434/v1`) or LM Studio
  (`localhost:1234/v1`), hosted via OpenRouter or Anthropic with your own key
  — **built**. `providerLocality()` says which; the router asks local first
  because it is cheaper, not higher
- **Tier 3:** structural proposals (growing what the board can know) — reserved

Every model joins at tier 2 (`providerTier()`), with its locality carried on
the `join` event and the participant node (`localityOf`). The engine is one
participant, named `engine`, whose readings are tier 0 and whose library is
tier 1. **A brief builds the structure first**: `runPrompt` attaches the tier
1 structure in the engine's name the moment Enter is pressed, so the page
stands at once; a joined model's words then land as the next version. With
no model, that structure *is* the page, and the status says so. Nothing
fakes words.

**A model's reading of a group is an offer to name it.** When a circled group
is summoned, every joined model is asked for readings (`interpret`); each
lands as a held `resembles` edge, and the palette lists the top ones as *Name
it "…"*, attributed, repainting when they arrive. **The reading stays on the
canvas** (v10 F6): a chip beside the group — *greeting 0.80 · qwen* — drawn
the moment it lands whether or not the field is still open (a slow model
answers minutes later), said once in the status line, and a tap on the chip
opens the field on those marks again (`readGroups` remembers which marks a
reading was asked about; the reading itself is held on the group's first
member). Blessing one holds an
artifact with the group's signature, so the next group like it is matched —
the model proposed, the human decided, the engine remembers. This closed the
conversation benchmark's last clause.

**Answers are nodes, not chat.** `session.answer()` places an explanation in the
canvas, anchored to the marks it is about and attributed to whoever said it.
Explanations are a **third plane** (`SessionState.explanations`) beside content
and gesture: visible and erasable, but not ink — they never join a lasso, a
cluster, or a signature. Several participants may answer the same question and
every answer is held.

**A card says what it is about, and how long ago** (`subjectOf` / `agoOf` in
`08-render.js`). The header carries the speaker, the subject — the names its
marks hold, else the one mark's reading, else how many there are — and the age.
The plane is the *live* layer, what someone is saying now; a card that never
says its age reads as permanent, and a card that never says its subject makes
the writer put the label in the prose. Both were true, and answer cards were
being used as the caption layer of drawings. The permanent words of a drawing
are a `text` or `svg` artifact, which is a figure on the board.

**The explanation plane has a layout, and it is the surface's**
(`renderExplanations` in `Demos/surface/08-render.js`). Core anchors an answer
beside the marks it is about; six marks stacked in a column each given a
sentence — what the MCP hand does with `canvas_say` — anchor six cards to the
same edge, and they land on each other and on the ink they are about. So each
card keeps its anchor (a dashed leader to its marks, by the nearest edges) and
the cards are pushed apart by a greedy search: right of the anchor, then left,
then below, then above, shifted along the free side until nothing is hit,
scored so a card would rather sit off screen than over the marks it speaks for.
The placing is **runtime, never in the log** — a card's place follows the view,
so it is found again on every zoom and pan: positions in canvas units, every
size in screen ones. The search is bounded (four sides, eight half-card shifts
either way, the ink near the viewport capped), for a few dozen cards at most.

**The weights are an order of what may be given up.** A card *under another
card* is lost — nobody can read either — so it outweighs everything else put
together; then covering the very marks the card speaks for; then standing off
screen, which costs the reader only a pan; and cheapest, lying over other ink.
Found on a board of two dozen answers: with card-on-card merely dear, a hair of
overlap kept beating a whole card's worth of off-screen and three pairs stacked.
**And staying on screen is a preference among the places beside a mark, never a
reason to leave it**: the term is dropped when the marks themselves are off
screen, or a card anchored a screenful away walks its shifts back toward the
viewport and crowds the cards that live there. Among places that all cost
something, the nearest the anchor wins.
Found with it: **the readable viewport was a sliver.** The panel stands on the
LEFT and `viewportWorld` read its left edge as the right margin, so in a
1400px window the world an answer could occupy was 112px wide and every card
was clamped into it, on top of the last.

**`fitAll` fits the content, and the cards place themselves in it** (V1-PLAN
L2d, `01-view.js`). It used to union the content with the explanation nodes'
*logged* bounds — which, since the placing became runtime, are not where any
card is drawn. A card logged beside a mark that has since moved twenty
thousand units away made the old union fit that much nothing and slammed the
zoom to `MIN_ZOOM` with every mark off the free ground (e2e 41d — one way to
the slam once seen on a live board). Now the content is fitted, the render
places the cards, and only when a card landed outside the free ground is the
fit widened **once** to the rects the cards were drawn at (`cardRects`). One
correction pass, never a chase: fitting again settles.

**Routing** (`src/participants/router.ts`): the canvas answers first — tiers
0 and 1 — and a model is asked only for what they cannot do.
`route(ability, state, {concepts})` reports `settledLocally` when the engine
already has the answer, names the tier-1 module that answers at once
(`instant`: concepts for *read*, tidy for *arrange*, the structure for
*build*, signatures for *name*), and ranks every candidate cheapest-first
(local before hosted) — "the canvas has this" beats a spinner, and "nobody
here can do that" beats silence. It is not a fallback chain: every candidate
is returned, because several participants answering at once is the point.

**A participant can be answered by hand** (`src/participants/bridge.ts`). The
transport is injectable, so a bridge is not a new kind of participant — same
prompts, same parsing, same `propose()` channel, with the question parked
instead of posted. Any model can take part, including one with no HTTP API. It
is also the honest test of the serializer: if a capable reader cannot make sense
of `describeSession`, that is worth knowing before blaming a small local model.

**One transport covers every model:** Ollama, LM Studio, and
OpenRouter all speak the OpenAI-compatible `/v1/chat/completions` shape and
differ only by base URL and key. Anthropic needs its own client.

**Running against a real local model taught four things** (all in the transport):

- **Local gets a 300s timeout, hosted 60s.** A cold 14GB model takes past 30s to
  answer at all; abandoning it wastes the load and reports failure to a user
  whose machine is fine.
- **Calls are cancellable, and the human's request outranks a speculative one.**
  A local server answers one at a time, so an automatic reading sat in front of
  whatever the user typed next.
- **Model replies need repair before parsing.** Strict JSON first, always — but
  devstral writes JavaScript template literals when the values are HTML full of
  quotes. `parseFill`/`parseReadings` repair, never guess.
- **`listModels` reports whether it could ask**, separately from what came back.
  Ollama serves the browser directly; no CORS configuration is needed.
- **Reasoning is stripped in the transport** (`stripThink`): qwen3 and its
  relatives think inside `<think>…</think>`, and a brace in there is exactly what
  the tolerant JSON readers downstream would latch onto.

**A hosted model is asked, and says why when it cannot be** (V1-PLAN J5,
`llm/provider.ts`, its recorded shapes in `llm/fixtures/`, shared with the
e2e stub). What John's GLM Flash on OpenRouter taught:

- **A reply is read the way the provider sends it.** The answer is
  `content` only — a string, or the text parts of a list (a thinking part
  is left out) — with `<think>` dropped. A reasoning model's `reasoning`
  (OpenRouter), `reasoning_content` (Z.AI's own API, vLLM, DeepSeek, LM
  Studio) or reasoning details are never read as its answer; with no answer
  the failure says exactly why — *GLM 5.3 Flash spent its whole budget
  thinking — no answer came back (it stopped at the token limit, 8,192
  tokens)*, it thought and stopped, it hit the limit before writing, a
  filter withheld it, it declined, it said nothing. An answer cut off at the
  limit is kept and marked `truncated`; an error OpenRouter puts inside a
  200 is a failure, with the upstream provider's own words.
- **A failure is said in full**: `HTTP 401 — bad key: “User not found.”`,
  `402 — no credit`, `404 — no such model, or no such endpoint`, `429 — rate
  limited`, each with the provider's message, and `status` and a `reason`
  beside the sentence for a surface to act on. A network or CORS failure is
  said as one — the browser does not say which; a timeout says the host and
  the wait; a key a provider echoes back is never repeated; `'cancelled'`
  stays the one word callers test for.
- **Every call is budgeted**: `max_tokens` 8,192 (`DEFAULT_MAX_TOKENS`),
  under what the provider said the model may write and read
  (`maxTokensFor`). Unsent, the budget was the provider's default, and a
  model that thinks first could spend a small one thinking. **A call to
  OpenRouter adds `reasoning: { effort: 'low' }`** (`OPENROUTER_REASONING`):
  every ask the canvas makes is a reading or a fill whose structure the
  engine decided, so deep thinking buys little and costs a wait; low, not
  off, because some models cannot turn it off; OpenRouter maps an effort
  onto whatever the model takes and leaves a model that does not reason
  alone. It also gets OpenRouter's optional `HTTP-Referer` and `X-Title`
  (`OPENROUTER_APP`); no other endpoint is sent either, since its CORS may
  not allow a header it does not know.
- **A provider's list says what a model can do** (`readModels`,
  `parseModelList`, `modelFacts`): OpenRouter's rows (inputs, context,
  output limit, parameters — read without the key, the list is public), LM
  Studio's `vlm`/`llm`, a capabilities list, a plain OpenAI list that names
  ids only (`describes: false`). A join is given what the list says — an id
  it does not hold is refused with the nearest ids (`nearestModelIds`) — and,
  when it cannot be read, what it said when the model last joined, else the
  id's guess (`guessVision`), and the sentence says which. `listModels` is
  its ids, sorted, as before. `whereOf` and `modelWords` say where and who in
  words (*on OpenRouter*, *GLM 5.3 Flash*, *qwen3.5 9b*).

**The surface's chrome** (`Demos/session-engine.html`, v9 S1): **one bar**
— the wordmark and the panel toggle on the left, the mark chip, undo and the
**control centre** on the right — and nothing in it explains the system
(D3). The centre is tiles in fixed slots in **three labelled groups**
(PLAN-USER-SURFACE U1f; the markup is `Demos/session-engine.html`'s):
**Board** (boards · folder · import · export · reset), **View** (zoom · layout
· theme · hand · snap · snap now) and **Helpers** (models · share · auto-read
· packs · mark · help) — *Reset* with the board, far from *Help* — each tile
saying its state on its face, closing on the next
stroke, Esc, or a tap outside. The panes (models, your mark, boards) open under
the bar, one at a time, each held to the window and scrolling within itself. **Esc is one ladder**
(`escapeStep` in `20-controls.js`, one thing a press): the control centre, the field, the open pane (the one
holding the focus, else the last opened), the cards, the selection, then the model calls in flight; an input
that handles Esc itself gets it first. The chrome is built from six components in `surface/00-ui.js` — pill,
chip, tile, row, pane — one stylesheet section each. **Light and dark are
the same tokens inverted**: the stylesheet defines the light set on `:root`
and the dark set on `[data-theme="dark"]`, the page stamps one of the two
(*system* follows the OS until the tile says otherwise), and the canvas reads
its colours from the same tokens (`readColours`), so ink and chrome never
disagree. The panel that reports on the last or hovered mark tucks under the
bar, scrolls, and collapses as a whole (*panel ▾*, remembered per device;
closed by default on narrow screens). **It speaks to the person first**
(PLAN-USER-SURFACE U1a; `markSummary` in `10-inspector.js`): what the mark,
the thing or the selection *is* and what it *becomes*, in two or three plain
lines — no id, no tier, no coordinate — with the act at hand (*draw it
clean*, *read it*, a clock's *play*). **A selection that reads as a diagram says *is* and *becomes*** (N1; `becomesOf` in
`10-inspector.js`): *is — a flowchart: three processes, one decision, three flows · or a class diagram 0.35*,
*becomes — Make it Mermaid · draw them clean · a name*, the acts named only when the field offers them. The inspector — ids, tiers, the
ladder, *read as*, relations, *maths*, *measured*, roles — is behind
**details**, closed by default and remembered on this device
(`mm-inspect`). Its room is its own however little it says: the free ground
measures the panel at the height it may grow to (`chromeRects` in
`01-view.js`), or a short panel floated and the fit put marks under it. **On an empty board it shows the loop instead of "nothing here
yet"** (UI-2): *draw a few marks → press and hold one → choose what it
becomes*, three lines in the panel's own plain voice, replaced by the first
mark's reading the moment one is drawn — the actionable start used to live
only in the status line, where a first-time hand was not looking. No modal, no
tour, no fixed palette: the standing line's ladder is unchanged. **It also holds
the first run's one tap** (V1-PLAN R5): *start from an example* opens the
starter example — the molecule, the Basics pack in use — as a board of your own,
and *more examples* opens the boards pane (*Examples*, under *Several boards*,
below); both are buttons of their own (`data-example-start`, `data-example-more`,
never a `data-act`, which is a mark's) taken in `22-boards.js`. **The first run on every screen** (`27-first.js`): where the panel is closed —
a phone, or a hand that closed it — the same steps and *start from an example* stand as a sheet at the foot of
the screen until the first stroke (`syncFirstRun`); the standing line says *double-tap* or *double-click* by the
pointer last used, else whether the screen's main pointer is coarse (`tapWords`); an example opens fitted with
nothing inspected (`restAfterOpen`), and **under reduced motion** (`motionReduced`) the working dot and the find
ring hold still, and an example's film or a tank started elsewhere waits for *play it here*. Scrolling
**pans**; a pinch or ctrl/cmd + wheel **zooms**; the
zoom tile and keyboard still zoom for a mouse. Touch: until a pen has been
seen, one finger draws and two fingers pinch and pan; after, the pen draws
and a finger pans (*Pen, finger and palm*, below). **The page never scrolls, and the canvas is always the window** (5 Oct 2026, `settleViewport` in `01-view.js`; the body pinned in `surface.css`): on an iPad a focused input, the keyboard going away or a file picker returning could leave the page scrolled or the canvas sized for a smaller window — the board in a smaller box with dead edges round it — so any scroll is put back (never while a field is typed in) and the canvas is sized again whenever it is not the window's size. **A file input is out of sight, never `display:none`** (`input.fileIn`): iOS does not open a picker for a `display:none` input's `click()`, and *from a file…* takes any file, since iOS greys out what it cannot match to an accept list (it knows no `.jsonl`) and a board is known by its bytes. **The grid is under the same bar**: the view's own
controls (the count and sort; focus's ← →) join the bar rather than a second
bar over the cards.

**Pen, finger and palm** (V1-PLAN R6, acceptance A10; `Demos/surface/07-hand.js`
holds the rules, pure — `node --test Demos/surface/07-hand.test.mjs` — and
`07-input.js` is the adapter). **Decided by `pointerType`, never by the user
agent**: iPadOS reports a pencil as `pen` and a finger as `touch`, a desktop
test synthesises both, and anything else — `mouse`, or the empty type a
synthesised event carries — is the mouse, which nothing here changes.
**Before a pen has been seen on this device, today's rule stands**: one
finger draws, two pinch and pan. **The first pen switches it**, said once in
the status line and kept as a device preference (`draws`, beside `hand` in
`00-core.js`) that the *hand* tile shows on its face — `right · pen` — and
changes: once a pen has been seen the tile steps one word a tap (right · pen
→ right · finger → left · finger → left · pen), so a finger can have its ink
back; with no pen ever seen it flips the side, as it always did. With the
pen, **one finger pans** (past `PAN_SLOP_PX`; short of it the lift is a tap,
the dead state's tap, never a dot), two pinch, a third is nothing; a finger
does not draw, hold, drag a handle or reach a playing program — the pen does
all four. **A palm is a touch that lands while a
pen is on the glass, or within `PALM_MS` (500 ms) of the pen's last event
anywhere on the page** — down, moving, hovering, lifted — and it does
nothing for its whole life, whichever the preference; the minimap, the teach
pad and the control centre's close-on-outside ignore palms too. **A pen
landing makes every finger down a palm**: a finger's stroke is dropped, a
pinch stops, and a pan a heel began within `PALM_MS` before the pen is put
back. Contact size is not read (Safari's width and height for a touch are
unverified). **The board follows one pointer** (`owner`: the pointer whose
press began what is under way — a stroke, a drag, a knob, a demonstration, a
program's pointer, a pan): another pointer's moves and release are not its
own — a palm's points used to land in the pen's stroke, and its release ended
it — and **a release the board began nothing for ends nothing**: a pinch's
last finger, a palm lifting, and a mouse pressed on the chrome and let go
over the board each used to commit a stroke with no points, which threw after
the event was already in the log (and the board then failed to save). A page
hidden with a hand on the glass forgets the pens and the palms it never heard
lift. **Pressure is recorded, not drawn**: every point a pen draws carries
`p` (0–1, three places) in the log — kept through a magnet's snap and through
copy and paste; core's `Point.p`, which no reading uses — and the drawn width
is one width for all ink, the mouse's and the finger's too; ink is never
covered. **And so is time** (PLAN-IPAD-NOTES I3; `samplePoint`, `samplesOf`,
`pushSample` in `07-input.js`): every point of a stroke — mouse, finger, pen —
carries `t`, whole milliseconds since the press (core's `Point.t`, which no
reading uses; never before the point it follows), and a pencil's moves are read
through `getCoalescedEvents()`, so the 240 Hz samples the browser folds into one
move are all points, in order, the event itself added only when a browser leaves
it out of its own list, a sample no different from the one before it not twice.
`point-time.test.ts` (core) holds that the same marks read the same with and
without `t` and `p` on every point; e2e pencil P13–P13b. **A pencil's hover is a hover**: the reading of the mark under it,
as a mouse's gives, and the magnet in reach drawn on the pen's own layer —
the site a stroke begun there would start on (`penHover`, `magnetRing` in
`drawLive`); a mouse's hover draws no ghost, as it never did. Safari's
gesture events are left to the touch pointers while fingers are down (both
zoomed one view about two points); the canvas refuses a moving stylus's
`touchmove` default (Scribble, a scroll) and text selection or a callout
under a held pencil. The keyboard is in the next paragraph. The gate's
`pencil` scenario drives all of it on Chromium and WebKit with a pen and
fingers synthesised in the page; `QA-v1.md` §A10 is what only an iPad can
say.

**Every sentence has one place** (§6.2 of the v9 plan): the field (while a
selection stands), the canvas beside a mark (a name, a match chip with its
number, a working model, an answer card — and the reading of the mark the
hand just made, under that mark only), the panel (rows), and the status line
(one sentence: what just happened, via `say`/`flash`, else the standing state
in a few words). **The status line speaks the person's words**
(PLAN-USER-SURFACE U1b): counts as *3 marks* and *2 things made*, never
*loose* or *artifact*; a bind as *the line is tied to the circle*
(`tiedSentence` in `05-selection.js`), never a site's coordinates; and work
in flight as one phrase — one call its label, several *qwen is working on 3
things · Esc stops it* (`workingSummary` in `04-models.js`) — the detail on
the marks' own dots. The model pane's status stays in the pane. **A match chip
is a button** (D8): a tap on it summons the group it stands beside —
`session.summonMarks(ids, at)`, the same summon a loop and a mark reach,
with `scopeSource: 'pointed'` — so the second molecule is one tap from being
held. Export is a pane of five files — the bundle (*board + pictures*, a `.dyna.zip`), SVG, PNG, PDF
and the log (*Out and back whole*, below) — and a row for a figure at its real size (M5: the maths); help is
**`HELP.md`**, one page for a person — draw, hold, choose; the four round
buttons; what a model adds and how to ask one, Claude too; boards; rooms;
your mark; undo; the shortcuts (PLAN-USER-SURFACE U1g) — read into a pane,
and kept by the service worker for offline. It used to be the hand QA plan,
`QA-v8.md`, a developer's test plan; that stays in the repository, named at
the help's foot. *Your mark*'s pane and the bar's chip say what a mark is for
before asking for five. On a touch screen — or wherever a finger opened it,
read from its `pointerType` and never the user agent — the field does not
take the focus until the input is tapped, or the keyboard would cover the
pills. **With the keyboard up the field stays in the visible viewport**
(V1-PLAN R6; `fitFieldHeight` in `09-palette.js`): the keyboard shrinks the
*visual* viewport and leaves the layout one as it was, so the room is read
from `visualViewport`, and a field taller than that room has its pills' list
held to what fits, scrolling, the input, its reading line and the four core
buttons in view — measured from the list's own scroll height, so a list
scrolled keeps its place — and let go on the next keystroke or layout change
once the pills fit. When the field fits, nothing is set.

**Read as writing** (v10 F5): the field offers to read ink as one image —
not only what the shape rung called `text` — because the rung called John's
*h* an arc and his *o* a triangle, and the offer to read them was missing.
**Only when some of the held ink the rung could not place for sure**
(PLAN-USER-SURFACE U1d, `tools/read.ts`: the clean form's own rule,
`snapReading` — confident and unambiguous — or a word; nor on a connector whose wires join two held
marks, neither of them writing); offered on a box, a line and a circle it was noise. Likewise *Show it in 3D* is offered only for
what it builds, every node a circle and every edge a line or an arc
(`tools/graph3d.ts`). **The minimap** (v10 F7, `21-minimap.js`): the whole board in the
bottom-right corner with the viewport drawn on it, hidden while the board is
empty; a tap or a drag there pans.

**Affordances at rest** (v10 D5): **press and hold a mark** and it is held
with everything it hangs together with — the cluster over the relations
the canvas sees (`holdAround` in `07-input.js`, `MM.relate` +
`MM.clusters`) — and the field opens with no loop drawn; a tap stays a tap
and a stroke a stroke. The **standing line is a ladder**: the next move in
a few words, keyed to the board (empty → *draw anything*; marks → *press
and hold a mark, or circle marks and double-tap inside*; a loop → *or
double-tap inside the loop*; a selection → the handles; the field →
*type, or tap a pill*). **The map of becoming** (v10 D6, the plan's §4):
the panel's *becomes* row says the selection's rung — shapes, writing, a
concept, a structure (a layout or a graph), a definition, an artifact —
and the rung after it, in one line; a pill whose verb leads somewhere says
so in its tooltip (*→ then: What is this? asks which molecule*).

**A model is asked only by a deliberate act** (v9 S7, §6.3 of the plan):
Enter on a brief, `ask:`, `draw:`, *Read the writing* (or the panel's *read
it*), *What is this?* (every joined model reads the group and its readings
join the certainty row), and a behaviour the verb table could not read.
Nothing on draw, nothing on summon, nothing on join — `render()` never calls
a model. The *auto-read* tile restores reading handwriting as it is written,
off by default. Found the hard way: every stroke the shape rung could not
place read as `text` and was handed to every model that can see, and every
check asked every model to interpret the group before a word was typed — a
doodle session was a stream of calls nobody made. **An ask with no model
here that can answer it is kept, not dropped, and never opens the pane**
(J5, `keepAsk` in `04-models.js`): *What is this?*, *Read the writing* or a
typed brief with no model (or none that sees) is said once in the status
line and in the field where it was asked — *Read the writing needs a model
that can see — kept, it runs when one joins* and **choose one**, the one way
the models pane opens for it — and the moment a model that can answer it
joins, it runs. The ask was the deliberate act; the join is the second.
*Read the writing* says which joined models cannot, and why (*GLM 4.7 Flash
reads text only (OpenRouter says it takes text)*, `whyNoReader`). A pill
that asks a model none here can answer says so on the reading line while it
is pointed at.

**Every making prompt says what can be made here** (v10 F13, `HERE` in
`participants/agent.ts`): one paragraph on the interpret, ask, make,
program and draw prompts naming ink and its readings, names, pages,
programs (the `mm` contract, with `onPointer`), text, SVG and answers, and
nothing else. A model with no ground spins off into files, servers and
frameworks; a small one most of all.

**A model at work is shown where it works.** Every call to a model is
registered while it runs (`withWork` in `04-models.js`) and drawn as a
breathing gold dot with the model's name and its task **above the marks it
is about**, and in the status line; it leaves when the call ends, however it
ends. After a few seconds the label carries the elapsed time, after thirty
it says *Esc stops it*, and **Esc with nothing held stops every call in
flight** (`cancelWork`; builds and programs carry a signal from
`workSignal`). **A brief that fails leaves nothing behind** (v10 F10,
`dropFailedBless`): the loop is blessed before the model is asked so the
code has somewhere to live, and when the model fails and this hand has done
nothing since — the bless is still its last act (`session.lastAct`, L2j),
whatever another hand drew — that bless is undone and the status says so. **Typed text at a loop is a brief unless it names a verb**: the reading
line says which before Enter is pressed; "website about dolphins" goes to
the model as the prompt. With no model joined, the reading line says so and
Enter keeps the brief for a model (J5): it runs when one joins.

**Keys never leave the device.** A hosted provider's key lives in
`agents[].config` in memory and, only when *remember* is ticked, in
`localStorage`; the `join` event in the log carries a kind and a name and
nothing else, so the log, the folder, autosave and export are clean of it.
**Since I7 a key is the provider's, not a model's**: entered once (`holdKey`,
`04-seatpane.js`), it is every joined model's on that provider that waits for
one and every seat joined after with the field empty, and kept on the device
only for a provider whose key the hand asked to remember (`mm-model-keys`,
`{ <address>: key }`; `keysToKeep` in `03-seats.js`) — a key typed without
the tick forgets the one kept. The remembered picks (`mm-seats`) keep what
the provider said (whether it sees, what it is called), never the key; OpenRouter's public list of models is read without
it; and a key a provider echoes in an error is never repeated (J5). The gate's
`models` scenario looks for the key in the log, the board's journal, every
cache, the DOM and the address, and finds it only where *remember* put it.

**The model pane** (`Demos/session-engine.html`) follows what the personal
site's search bar learned (`johnhanacek/scripts/search-core.js`): it probes
**both** local servers in parallel (returning on the first that answered hid a
running Ollama behind LM Studio), lists models per server, **hides
embedding-only models and says so** (an Ollama holding only `nomic-embed-text`
used to show nothing and explain nothing), and **remembers the pick as a
preference** — honoured when that server still offers that model, quietly
ignored otherwise. Hosted providers and a custom OpenAI-compatible endpoint
join by key; the key is remembered only when asked. **A join asks the
provider what the model can do** (J5, `joinHosted`): its list, read once a
page and waited on at most three seconds — a list that lands later still
corrects the join — refuses an id it does not hold (*no model called
z-ai/glm-flash on OpenRouter — did you mean ~z-ai/glm-flash-latest,
z-ai/glm-5.3-flash or z-ai/glm-4.7-flash?*) and says whether the model sees
and how much it reads; the id's guess stands only when the list cannot be
read, and says so. A remembered pick rejoins after a reload the same way
(and a remembered Ollama or LM Studio pick is asked for where it runs, as it
was before the 6 Sep tier redress made it ask for a key). **Each joined
model's row** says its name in words, where it runs, *sees* or *text only*,
its context (the tooltip: what its provider said, or why that is a guess),
**its last call, kept until the next** — *ok · 1.8 s · read “hello”*, or the
failure in full — recorded by the transport every call goes through, and
**try it**, one tiny prompt. With a long list on this machine the pane
**suggests one model a job** — the smallest that sees for reading writing,
the one nearest 8B for *What is this?* — and the rest wait behind *all N
models*. On the board a model is named in words, with no `llm:` (chips,
working dots, the status line, the tile), and a reading is words, not a
slug (*state transformation*; taking it still names by the label). **Where dyna.ink's own writer or reader is seated it leads with them**
(*dyna.ink's own models*, below), the rest under *more — bring your own model*; there, and everywhere else, **Claude Code comes first** — the seat, one tap while Claude's hand is in the
room (*The canvas's seat*, below) — and an MCP server of your own through the door
(`Demos/mcp-client.mjs`) waits under *advanced*, out of the key form.
Model participants are surface-side (`agents[]`); the session keeps every
`join` in its history, so leaving only stops a model being asked.

**Seats: a model per job** (V1-PLAN I7; PLAN-IPAD-NOTES §3; the rules are
`Demos/surface/03-seats.js` — pure, `node --test Demos/surface/03-seats.test.mjs` —
and the adapter `04-seatpane.js`). The pane's *seats* section is four rows, each
saying who holds it, what its last call came to (J5's rows, kept) and what it
falls back to: **reader** (handwriting to text — a model that can see; the
quickest you have), **writer** (briefs, pages, programs, *What is this?*),
**decider** (a decision model, above) and **semantic** (on this device, no key — *Semantic seat*,
below). The form's *for* field says which seat a model joins for, so every seat
has its own provider and model, the key the provider's (above); a joined model's seat
is also a select in its row, **local before hosted, then the quickest last call**
(`orderChoices`). **A seat chosen NARROWS who is asked; one left alone changes
nothing** — a model that holds no seat is *any job*, asked as every model was
before seats. `resolveWriters`: the writer seat when chosen, else every model with
no seat, **Claude Code first while it is seated (J4)**; a model that holds only the
reader or decider seat is not asked a brief. `resolveReaders` (`readers()` in
`06-handwriting.js`): the reader seat, else Claude Code while it is seated, else the
writer if it sees, else the smallest model that sees — and the fallback is said in
the row (`fallbackWords`). The decider is not in `agents[]` at all (it has its own
participant). **A model stays joined across boards** (the I7 finding, 1 Oct 2026;
`participants/seated.ts`, e2e M20–M23): a board loaded in place — a switch through the
boards pane, *from a file…*, an example, Reset — takes every `join` with it, because
joins are events in the old board's log, so every seat's model (the agent, the decider,
the MCP door's, Claude Code) is **seated on the board it is asked on, lazily and once**:
`agent.seat(at)`, which every ask calls first, finds the join the board already holds
(by kind, name and tier — never by an id alone, which is the board's counter) or writes
one `join`, so a board only looked at is never written and a board reopened that holds
its join gets no second. A participant's id therefore moves, and the surface keys every
map by `agentKey` (04-models.js), never by `agent.id`. **What is
kept, `mm-seats`, is a pick a seat** (`{ reader, writer, decider, any }`: where, which,
what the provider said — `pickOf`, never a key); `any` is the one model last joined
with no seat, as the single pick always was; and `off`, the seats where the person let
dyna.ink's own go, kept apart from the picks (*dyna.ink's own models*, below). An older device's `mm-model-pick` and
`mm-model-key` become the writer seat (and the reader, for a model that sees) and the
provider's key, once, the old entries let go only after the new are read back
(`migrateStored`; e2e M19). A reload rejoins every seat the way it joined (the
provider asked again what it can do); with no key kept a hosted preset says so in the
form and the seats wait for the key typed once (`rejoinPending`), a custom endpoint
rejoins keyless as it always did. **Nothing here asks a model**: who is asked, by
what act, is §6.3's, unchanged.

**dyna.ink's own models: no key in any browser** (the multiuser milestone, 23 Oct 2026; the relay's
`cloudflare/relay/src/ai.mjs` over the Workers AI binding `AI`, its protocols `Demos/decide-protocol.mjs` and
`Demos/ai-protocol.mjs`; core's `llm/decide-systemone.ts` and `participants/decide-state.ts`; the surface's
`03-seats.js`, `04-seatpane.js` and `04-models.js`; e2e `models`, M37 onward). On dyna.ink, its subdomains and the
old address (`houseDeciderFor`, `houseAiFor`), three seats need no key: dyna.ink's relay asks a Cloudflare model
through its own binding, so the page sends none and holds none. **The decider** is Cloudflare's Clef-flash
(`HOUSE_DECIDER_MODEL`), a System One decision model, asked at `/decide` by `createSystemOneDecideTransport` — a
transport beside the chat one, not a `DecideWire`: questions named `q1…qn` go in with typed criteria (a choice's
options keyed in lower snake case, `none_of_these` last; a score's levels as a list; a statement for a yes) and typed
answers come back, read against exactly the options sent — a part of a distribution no answer here either
(`partialSum`). What it is told is `decisionStateOf`'s words and never an id (`withoutIds` strips every id the board
holds, Mermaid's spelling too): what the marks are and read as, what a person wrote on and beside them (`WRITTEN` —
never Mermaid text, a page a model wrote or a file's name), each candidate's provenance, cut to the relay's limits.
Its jobs, each asked only by its deliberate act and taken only at `DECIDER_TAKE_AT`: *Which is it?*; **Which diagram
is this?** (`tools/which-notation.ts`, registered last: offered when the likeliest notation reads between
`NOTATION_OFFER_FROM` and the floor on a graph that is not a molecule, or two tie above the floor; held as a
decision, never a reading, and read by `mermaidFor` and the route tool); and **what should this brief make?**
(`participants/brief-kind.ts`), asked on a brief's Enter only of a decider the hand chose (*choose it* in its row, or
one joined), with a writer here, no prefix, no revision and nothing the library answers — the drawing's guess stands
at once, and a sure *something else* takes it back only while it is still this hand's last act. **The writer and the
reader** are a Workers AI model each (`MM_AI_WRITER`, `MM_AI_READER`, default `DEFAULT_AI_MODEL`,
`@cf/qwen/qwen3.8-27b`), asked by the short names `writer` and `reader` at `/ai/v1/chat/completions` in OpenAI's
shape, so core's transport speaks to them unchanged; the page never names an `@cf` id. **What the writer is sent** is
the prompt every model is given, scoped to the marks asked about: `describeSession` given `nodeIds`
(`participants/serialize.ts`, `serialize.test.ts`) names only this hand's own things and the things the asked marks
belong to, gives relations only among the asked marks and has no Participants line, so in a room another person's
name and the names of their things elsewhere on the board go nowhere by someone else's tap; `houseSends`
(`03-seats.js`) says it in the row. Residual: the marks' ids still carry the drawing hand's log name, so asking about
another hand's marks sends that name. **Seated only once the relay answers**: at boot the page looks once at `GET
/decide` and `GET /ai/v1/models` (`probeHouse`; neither calls a model) and seats nothing whose list does not answer
within `HOUSE_PROBE_MS`, nor in an embed; seated, a house model joins a board lazily under its own name (*dyna.ink
writer*, *dyna.ink reader*) by a join marked `seated`, which undo passes over, and is kept nowhere. **Asked last**: a
model of the person's, or Claude Code seated, is asked instead (`resolveWriters`, `resolveReaders`); only the house
*reader* reads — *none* on it sends no picture of the ink to dyna.ink — and auto-read never asks it. *none* on a
house row — the reader, the writer or the decider — is kept in `mm-seats` under `off` (each seat let go as `true`;
`houseLetGo`, `withHouse` in `03-seats.js`), apart from the seat's pick, so a model of the person's joined for that
seat (which writes the pick) and its leaving (which lets the pick go) never undo it, nor does a reload:
`houseAtBoot`, `deciderAtBoot`, `seatHouseDecider` and `leaveDecider` honour it, and only *dyna.ink's own* clears it
(e2e M55c–M55c3). A model leaving says when dyna.ink's own takes its seat (*… takes its place — let it go in its row
to keep everything on your own models*). An ask the house cannot answer just now (a 429, a 5xx, unreachable, timed
out) is said in the relay's own words (`houseCannotWords`) and kept for a model of the person's (`keepFromHouse`).
The models pane leads with *Using dyna.ink’s own models — no key needed* and what is sent where; on a public origin
Ollama and LM Studio are looked for only when *Find models on this machine* is tapped (`probesOnOpen`). **Switches
and budgets** (Worker variables, commented in `wrangler.toml`): who may ask — `MM_DECIDE`, and `MM_AI_CHAT`, which
follows it when unset: *off*, *keyed* (only the key of a room named by hand) or *limited* (the app's origins and
keyed hands; the default) — with no Origin and no key refused. **A minted room's key is no key on `/decide` and
`/ai/…`** (`askerOf` in `cloudflare/relay/src/ai.mjs`): `POST /rooms` hands one to anyone, so it is never *keyed*, is
held to its address's minute and with no Origin is refused, and `MM_DECIDE=keyed` admits only the keys of rooms named
by hand. Each route allows so many calls a minute per address (an IPv6 address by its /64, and by its /56 at
`NET56_TIMES` that, as the relay counts a caller) and per key of a room named by hand (`DECIDE_PER_MINUTE`,
`AI_CHAT_PER_MINUTE`), a share a day per address whatever key it holds — a `DAY_SHARE`-th (a thirty-second) of the
route's own budget, so a /56 asks an eighth at most (`decideShareFrom` in `Demos/decide-protocol.mjs`,
`aiChatShareFrom` in `Demos/ai-protocol.mjs`; `DECIDE_PER_DAY` and `AI_CHAT_PER_DAY` are only the shares at the
default budgets) — and a budget a day across everyone (`MM_AI_DAILY`, `MM_AI_CHAT_DAILY`). A request that will be
refused writes no row in the `Limits` object: it is counted first in memory (`prefilter`), its body is checked, and
only then are its counts taken in one hit, all or none. The relay logs a call's route, model, status, time and size
and nothing it was asked, caches nothing and uses no AI Gateway. `/extract` (Clairic) is a route with no job yet; the
Node relay answers every model route with 501. **Unverified**: every System One field name (no real reply has been
seen; `scripts/record-systemone.mjs` records them, and the reader takes every spelling written about), the binding's
call and reply shapes for both routes, whether `@cf/qwen/qwen3.8-27b` exists under that id and what it sees, whether
Workers AI keeps prompts, what the budgets cost, and whether Clef ever reaches 0.99 on a real tie. `relay.dyna.ink` is
not bound yet (`wrangler.toml`), so on the public pages no house model is seated and the page is as it was.

**The semantic seat: meaning, on this device** (PLAN-IPAD-NOTES I9, 1 Oct 2026; core `core/src/semantic/`, the
surface's `03-seats.js` rules and `03-semantic.js` adapter, `26-find.js`, `12-regions.js`; core tests `semantic/*.test.ts` and
`tools/like.test.ts`, `node --test Demos/surface/03-seats.test.mjs`, e2e `boards` N24–N24l in `e2e/semantic.mjs`). **A seat, not a
dependency**, the rule `decide.ts` set: an injectable **`EmbedTransport`** (`{ name, dimension, embed(texts, { signal }) }`,
texts in, one vector each out) with nothing in core that names a vendor, opens a socket or reads a file; the vectors are held
in memory by (transport, text) (`createEmbedCache`) and never in a log. Core holds `cosine`, a deterministic **stub**
(`createStubEmbedTransport`: each word hashed to a place, a named group's words to the SAME place, so related words score higher
with no letter in common — it measures nothing of any real model), **`semanticScorer(transport, query, entries)`** (the
function `searchBoards` takes at `options.semantic`: async, because a transport is, it embeds the query and each entry text
ONCE and then answers from memory in 0..1; a transport that answers the wrong number or size of vectors fails in words and keeps
nothing of that batch; a cancel rejects as `cancelled`), **`notesLike(transport, boards, { text, board, ids })`** (the others
ranked by cosine, the thing's own ids left out and a copy of it on another board not, under `SEMANTIC_FLOOR` not listed; each note
carries `meaning`, its score, and a `reason` that is arithmetic and says nothing the numbers do not — *is about the same thing —
0.71 by <the model>; no word in common* or *shares “pricing”*) with `groupLikes` (the shape Find's pane already shows), and
`wordsOfMarks(state, ids)` (what held marks carry: a label, read writing, a text's words, an artifact's name, a region's name
and then what it holds, through `searchEntriesOf(state, only)`). A `SearchHit` gains optional `meaning` (what the seat added,
only when a seat scored it above nothing) and `reason`. **The first real candidate is a static-embedding model**
(`semantic/static.ts`, Model2Vec's `potion` family): `parseSafetensors` (F32, F16, BF16), `wordPieceOf` (the tokenizer.json's
WordPiece with the Bert normaliser: lower case, accents off, split on space and punctuation, longest known start, `##` for the
rest), `createStaticTransport` (a text is its tokens' rows, unknown tokens left out, averaged, scaled to length 1; no known
token is the zero vector, never NaN) and `buildStaticModel` (the same format WRITTEN — a small seeded model whose groups of
words are near — for tests and the gate). It refuses in words what it cannot read: a `mapping` (a quantised vocabulary), a
vocabulary that is not the table's, a dtype it does not take, a file cut off or that is a page of HTML. **UNVERIFIED: the reading
of the real `potion-base-8M` as laid out here** (one `embeddings` F32 tensor, a Bert WordPiece tokenizer, mean with unknowns left
out, unit length) — the container cannot reach the host (the proxy answers 403), so it is the author's reading of the format,
proved against a model built by the writer; `node scripts/check-semantic-model.mjs <folder|https://…>` reads the real files with
the same code and asks whether related is nearer than unrelated. **The tool** (`tools/like.ts`, registered
after *Make it a region*): *Notes like this* is offered only when `ToolHost.semantic` (the seat's name) says a seat is held, only when the
held marks carry words, and `hidden` — typed (*notes like this*, *like*, *similar*), never a pill and never what Enter does with
nothing typed — so e2e 49's golden offers are unchanged by construction; it carries the model's dot, writes nothing and names the
host act `like`. A region reaches the field by the selection, never the summon, so its offer is **a button in its panel**
(`regionLikeHtml`, shown only with the seat held and words in the region). **On the surface** (`03-semantic.js`): the seat's row
in the models pane holds the address of a folder with `tokenizer.json` and `model.safetensors` (default `SEMANTIC_SOURCE`, the
`potion-base-8M` folder on `main` — **not pinned**) and *load it here*; **nothing loads at boot, on draw, on a hold or on opening
the field** — the model is fetched by that tap, once (the browser's Cache API, `mm-semantic`, so a later load needs no request and
the row says *from this device’s cache*), with `credentials: 'omit'` and no referrer, refused above `SEMANTIC_MAX_BYTES` before
or while it comes, read by core, and seated; a reload leaves the seat empty (the address typed last time is kept, in
`mm-semantic` = `{ source }`, and a key never — the seat holds none). An address is `https`, or `http` on this machine only, with
no user, no password and no query (`semanticSourceOf`, tested in Node). Every failure is said in words, in the row and the status
line, and the seat stays empty: a refusal (`HTTP 403`, naming the file), a missing file, a network failure, bytes that are no
model, a file too big. *Try it* embeds three tiny texts and says the milliseconds. **Find, seated**: a query typed in the pane is,
once it has rested (`FIND_SEM_MS`), also asked by meaning — the query and every entry text not yet held are embedded, the list is
drawn again, a hit nothing typed matched is said *by meaning 0.71*, the status ends *by meaning too* (*reading by meaning…*
while it waits); with nobody in the seat none of this exists and Find is exactly the lexical Find. *Notes like this*, taken, opens
the same pane on *notes like “…”*: the boards read first, the near notes grouped by board each with its reason (a tap opens the
board at the note, as a found word does), *search instead*, or typing a word, leaves it. The gate seats a **page-side stand-in**
(`mm.joinSemanticTransport`, for Find, the offer and the region's button) and then runs the page's own **loader** against a
model built by core's writer and served from `startEmbedStub` (`e2e/servers.mjs`), with failures served too; `huggingface.co` is
on the gate's guard, and the Cloudflare CSP's `connect-src` names `huggingface.co`, `*.huggingface.co` and `*.hf.co` (a redirect
to a file host counts). What it does NOT do: group notes (clustering), use the seat for the decider's choices or the field's
readings, search a board's picture, or run anything on the Claude Code seat — a *what is near* is the page's alone; the MCP
hand's `canvas_find` searches by words only.

⚠️ `Web App Skeleton/src/llm/claudeInterpreter.ts` pins `claude-3-haiku-20240307`
and `claude-sonnet-4-20250514` — **both are past retirement and return 404**.
Retarget to `claude-opus-5` before trusting that file (thinking is on by
default there, so leave `max_tokens` headroom).

## Handwriting: the one thing sent as pixels (v7 Stage E)

> `agent.read()` in `participants/agent.ts`; `transcriptsOf` / `transcriptOf` in
> `session/nodes.ts`; `inkImage` / `readWriting` in `Demos/session-engine.html`.

A mark the shape rung reads as `text` is rendered **on its own** — its ink,
dark on a light ground, nothing else on the board — and handed to every joined
model that can **see** (`ProviderConfig.vision`). The reply is held on the mark
as `transcript` reps: several when the writing is ambiguous, each attributed
and ranked, none blessed. This is the deliberate exception to "grounded, not
screenshots": the ink *is* the ground truth of what was written and no
fingerprint carries it, so the model is asked to *read*, not to interpret.

- **A model that cannot see is never asked.** The pane relays what each server
  says: Ollama lists `vision` among a model's capabilities, LM Studio types the
  model `vlm` on `/api/v0/models`. Joined models marked *sees* read
  automatically; with none present, writing stays `text` and the inspector says
  what it would take.
- **Writing reads when it is writing** (PLAN-USER-SURFACE W2; `conversionsFor`
  in `09-palette.js`, an item's `enter` in `09-field.js`). Held marks that are
  all writing, unread, are ONE option: their reading (*writing 0.75*, or
  *writing 0.65* for a word alone), with the model dot, taken by the read
  tool's own act — whichever reader is here, or the ask kept for one — and
  the line says `↵ read it`. Enter used to name the group "writing". *Read the
  writing* and *What is this?* leave the row and stay typeable; once the words
  land they lead as below. *Read as writing* on other ink (F5) is U1d's, below.
- **The word becomes the offer to name with.** A label with a transcript puts
  *Name it "Pricing"* at the top of the palette (Tier 0, since the reading is
  already held) — write a word beside a shape and it becomes that shape's name,
  which was Stage E's ship criterion. **Writing alone, taken, becomes text
  where it is** (v10 F8, `writingToText`): the group is blessed with the words
  as its parts and carries `text` code marked `from: 'writing'`, rendered as
  SVG text fitted to the ink's width and height on a clear ground in the
  ink's colour (`writingDocument`), the ink held underneath — *Show the ink*
  flips it over (`flipped`, runtime) — editable by double-click or *Edit the
  text*, and **never a definition**: the matcher skips artifacts with `text`
  code, so more writing is not offered as "another hello world". *Play* is
  offered only for what plays: a drawing's tank or a program.
- **Reading asks the smallest model that can see** (`readers()` in
  `06-handwriting.js`, the size read from the model's name), not every one:
  a 27B model takes minutes at a word a 0.8B reads in seconds. A dedicated
  handwriting model in the browser is the next step (the v10 plan, §6).
- **Text folds back from ink** (v10 F12, `19-text.js`): every word of a
  text made from writing is its own region (`w1`, `w2` …; `writingDocument`
  fits each line to the frame), so ink over a word addresses it. A scratch
  across a word **strikes** it (`strikeOnText`): a gap `…` stands where it
  was, the scratch leaves, and the strokes underneath are never scratch
  targets (`scratchTargets` skips a text's members — they are provenance).
  Writing beside the gap, read, is offered as *Fold “…” into the text*
  (`foldIntoText`): the word goes into the nearest gap, or after the nearest
  word, and the writing leaves. Every step is a version; undo walks back.
  **Runtime memory keyed by node id forgets what the log no longer holds**
  (`pruneRuntime` in `08-render.js`): ids are a counter derived on replay,
  so a fresh board reuses them, and a text flipped before a `load([])` kept
  the next text with the same id flipped.
- **The words reach the brief.** `describeReading` says *the human wrote
  "Pricing" there — use those words* instead of *handwriting you cannot read*.
- **Printed letters gather into a word** (`session/words.ts`). Small strokes
  drawn in quick succession, side by side on a shared band, become a held
  `word` node — the letters are its parts, it stands in the content plane in
  their place, and it reads as `text`, so it can be a label, be read as one
  image, and become a name. Every rule is in the hand's space (a letter is
  small *on screen*), a crossbar or a dot counts by its centre, and the
  grouping is inferred: erasing a letter shrinks the word, one letter left
  dissolves it, and the inspector's *not a word — split it* undoes it.
  **A word starts from a stroke the shape rung could not place.** Two
  confident shapes side by side never start one (a confident rectangle or
  triangle never joins one at all); an O or an l may *join* a word being
  written, and the word gathers back the letter-like strokes written just
  before it. **Letters are letters by their run, not by an absolute size**
  (v10 F1): the cap (`LETTER_MAX_HEIGHT_PX`, 150) is a ceiling, and a
  letter may stand up to `LETTER_HEIGHT_RATIO` x-heights over its
  neighbours — the old cap of 44 px threw out every ascender a real hand
  makes (John's h, l and d were 72–88 px tall), so *hello* was five
  shapes and *world* gathered only its x-height letters. Found the hard way: at hand size, three bubbles and two lines
  drawn quickly are exactly a run of small strokes on one line, and the
  earlier rule folded the whole canonical loop into one word — after which
  the lasso and the mark had nothing to act on. **A word is one hand's
  run** (V1-PLAN L2g, `absorbIntoWord`): the run is read over the marks
  the new stroke's maker made, never the board's last mark whoever made
  it, so the letters of two hands — or of a hand and a model — never
  gather into one word, and the word is made by the hand that wrote its
  letters, on every board (under *Live logs*). **Drawing is not writing**
  (V1-PLAN W1; `words.ts` holds the pure parts, `connectorNotLetter`,
  `closesFigure` and `oneDrawing` in `session.ts` read a stroke's ends against
  its neighbours, `headApartAt` in `diagram/heads.ts`): a connector that meets
  what it connects — bound, or arriving at a mark that is not writing — or that
  is long against the run's own x-height is no letter (a hand's ascender stands
  under three x-heights, John's included); two strokes whose ends pair up into
  a figure `figuresAmong` reads are halves, not letters (a diamond in two
  quick strokes); and a head drawn apart right after its connector is that
  connector's. A flowchart's *yes* written beside a vertical flow, a class
  relation's “1” and “*”, and a sequence's self-message head used to be
  gathered into words with the line they label.
- `propose()` carries `reps` as well as edges, so a transcript is held through
  the same channel as every other reading and undo drops it.
- **Writing gathers by nearness into a line** (v10 D3; the `writing`
  concept in `concepts/concept.ts`): text marks — cursive words, gathered
  words — on one band, a word's gap apart, read as *writing 0.8x* with the
  words in reading order, and no clock: letters gather by succession, words
  by nearness. *Read the writing* on a line renders the whole line as one
  image and asks once (`readLine`, `agent.read({ hold: false })`), so the
  reader has the phrase; one word per mark lands on each mark, otherwise
  the line is held on the first and the rest were read with it. The field
  then leads with the line as one name and offers *Make it text* once.
- **Reading my notes: every line, in a batch** (PLAN-IPAD-NOTES I8; core
  `participants/readlines.ts`, `agent.readLines`, the read tool's offers in
  `tools/read.ts`; the surface's side in `06-handwriting.js`, `09-palette.js`'s
  host acts; e2e `models` M24–M28). **Several lines held are ONE offer, *Read
  these*** (key `read-lines`; while the marks held are all unread writing it
  stands as the one *writing* reading, W2's, whose Enter is *read these*), a
  batch of every line of handwriting among the marks — `writingLinesIn` finds
  them with `writingLines`, **the `writing` concept's own bands and gap, one
  home** (`concepts/concept.ts`: the concept reads the fullest line, a read of
  a page reads every one, top to bottom, left to right; a word alone is a line
  of one). Each line is drawn **from its own strokes** — never a crop of the
  board — by `sheetOf`, which says where every point and numeral go: **one
  sheet of numbered rows, ink black on white at one line height** (`LINE_PX`),
  one stroke width, **the pen's pressure ignored**, the sheet capped inside
  what readers take (`SHEET_MAX_PX`); `06-handwriting.js` draws it exactly as
  said. **One image with numbered lines, not one image a line:** a small vision
  model reads one picture far better than several (many take one image a
  message, a provider may cap them, each image is tokens and a place to lose
  track of which is which), the number in the margin is a key the reply cannot
  slip, one line height gives every line the same size however it was
  written, and one image is one round trip. The reply is a JSON array, an
  object a line (`{"line":2,"text":"…","confidence":0.8}`, a second object for
  the same line a lower reading), read back line by line by `parseLineReadings`
  — tolerant of an object with `lines`, plain strings by position and numbered
  plain lines; **a line the reply leaves out has no reading, said, never
  invented**. A call asks at most `LINES_PER_CALL` lines; more are further calls
  **one after another** (a local server answers one at a time, and Esc stops
  the rest), each with its dots on its own marks and its label in the status
  line (*GLM 4.5V · reading lines 1–8 of 12*, `withWork`), a sentence between
  (*read 8 of 12 lines — 4 to go*) and one at the end (*read 2 of 3 lines —
  line 2: no reading came back for line 2*). Lines already read — a transcript
  held, or read with their line — **are skipped** unless asked again (*Read
  these again*, typed); *Read the board* is the same for the whole board, typed
  (`read the board`, offered only where the host says there is writing:
  `ToolHost.writing`, kept while the log stands); `readScopeHooks` is where a
  region's marks join what is held (I5). **`agent.readLines` holds each line
  where it was written**, attributed and never blessed: a line of several marks
  whose reading has as many words gets a word on each, any other line is held
  whole on its first mark (the rest *read with* it); a line fails by itself with
  its reason (no reading came back for it; its mark was erased while the model
  thought, STATE-1's refusal); a failed call fails every line with the
  provider's words. **One deliberate act is one batch, nothing on draw**, and a
  read with no model that sees is kept (J5) and runs when one joins. Through
  Claude Code's seat the brief is one, naming every mark of the sheet, and the
  hand that answers draws their ink. **Latency is measured**: the reader's row
  keeps the last call as *ok · 1.2 s · read 3 lines · 12 KB · 0.4 s a line*, and
  `window.__mm.lastReads()` the lines, payload bytes, ms and ms a line of each
  call; a sheet of eight lines is tens of KB. The panel says what each line
  said (`linesPanel`, *handwriting · 3 lines*) or why it was not read.
- **A picture, read** (I8; `tools/read.ts`'s *Read the picture*,
  `agent.readPicture`, `readPictureFrom` in `06-handwriting.js`): a picture held
  alone with its pixels kept is offered *Read the picture*; the pixels are read
  from the asset store, **downscaled to a long side of 1,568 px and sent as
  JPEG** to the reader seat with *what does this page say*, and the answer —
  `{"lines":[…]}`, text one line each — lands as **a text artifact BESIDE the
  picture, never over it**, made by the reader (an `import` in its name, so it
  is held as the reader's), editable like any text, named for the picture it
  came from (*notes-page.jpg, read*); the picture is untouched, and a picture
  gone before the answer lands writes nothing. **Claude Code at the desk cannot
  yet read a picture** — the log carries no pixels, so the seat's hand has
  nothing to see — and is left out of who reads one (`pictureReaders`); the
  ask is kept for a model that sees. **A spike, not the product**: `?spike=trocr`
  opens `Demos/spike-trocr.html` — TrOCR-small-handwritten through
  transformers.js loaded lazily from jsDelivr on a tap, a pad to write a line
  on, and what it measures (load time, memory where the browser says, ms a line,
  the text, the error rate against what was typed). **It is unrun**: the
  container it was written in cannot reach jsDelivr or Hugging Face (403), so
  the model id, the CDN path and every number are unseen; it fails in words.
