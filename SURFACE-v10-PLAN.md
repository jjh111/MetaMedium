# Surface v10 — the canvas reaches out

*Proposed 14 September 2026, on `next-phases`. v9 (one field, one frame,
muscle memory) has landed in full; this is what trying it for a week
showed, and the order to close it.*

The board reads, holds, names, builds and runs. What it still does badly
is **let anyone in**, **show what it can do before you ask**, and **go
deep** — from a drawing to a thing to a better thing, with the hand on it
the whole way. Three complaints from John, in his words:

- *"I'd love to have MCP support so I could call you and you can write to
  the canvas."* Every way into the board today is a pen or a model the
  board itself asked. A model that is *already in a conversation* — Claude
  Code at the terminal, with the repo open — has no hand on the canvas.
- *"It still is hiding its affordances from the user flow, and the depth
  of transformations is still not mapped well."* Nothing lights up until a
  loop is drawn and taken. And a pill says one verb; it does not say where
  the verb leads (a drawing → *molecule* → a 3D thing → *which* molecule →
  refined by ink on it).
- *"Keeping the doodling working atop things like live 3D or web frames."*
  A running program cannot be touched: the ink layer takes every pointer,
  so a three.js scene turns for nobody.

Plus two quieter ones: handwriting is only a model away (a scribbled phrase
is three unrelated `text` marks until a vision model is joined), and when
the engine is unsure — where an edge ends, which box a line joins — it
guesses silently instead of asking.

## 0. Foundations first (14 September, evening)

John stepped back after trying T1–T6: *"we need to get foundational so the
core stuff works — still not seeing it come together in the UI."* He drew a
circle and wrote *hello world* in his own hand, circled it, and asked
*What is this?*. What the engine saw, read from his tab:

| He drew | The engine read | Why |
|---|---|---|
| **h** (34×72 px on screen) | arc 0.41, not a letter | a letter had to be under 44 px tall |
| **e** (21×36) | arc 0.63, letter-like | |
| **l**, **l** (8×73, 9×88) | line 0.82 **· arrow 0.64** | the liftoff hook is a barb to the arrow detector; too tall to be letters |
| **o** (19×31) | triangle 0.68 | |
| **w o r** (129×40) | one word, text 0.63 | x-height letters gather; ascenders did not |
| **l**, **d** of world | line · arrow 0.67; unread | too tall |
| the loop and *What is this?* | the 27B model read for minutes | the reading, when it lands, shows only while the field is open |

Six foundations, in the order they block the flow:

- **F1 Letters at any size.** Ascenders and descenders are two to three
  x-heights tall; the letter cap (44 px) and the size-match rule (2.2×)
  were written for x-height letters. Letters are letters by their run — on
  a band, a word's gap apart, similar in height to *the run's x-height* —
  and the cap is a generous ceiling, not the rule. The canonical loop
  stays protected by what it always was: confident shapes side by side
  never start a word.
- **F2 An arrow draws back on itself.** A barb is a wing that turns past
  ninety degrees and is long enough to be meant — at least a sixteenth of
  the stroke. A liftoff hook is neither.
- **F3 The mark crosses what it means.** With no loop, the command mark
  fires only on marks it actually crosses — not marks it merely sits near,
  which every letter of a word does. A taught mark's band may widen the
  designed generosity at most two-and-a-half-fold, and the teach pane says
  when five samples disagree enough that the mark will fire on more than
  you mean.
- **F4 An assessment is offered, not stuck.** The clean-form ghost shows
  for the mark just drawn, for a few seconds, and for what is hovered or
  held — not forever over every mark that reads clean. The offer still
  stands (the snap tile, the panel); the dashes do not.
- **F5 The field has every option, and falls back to the brief.** *Read as
  writing* is offered for any ink, not only what the rung called text (the
  rung missed *hello*); typing matches the direct commands first, and when
  nothing matches the reading line says it is the brief. Plus F6 below for
  what a model answered.
- **F6 A reading anchors on the canvas.** What a model read a group as is
  a chip beside the group — *greeting 0.80 · qwen* — the moment it lands,
  whether or not the field is still open, said once in the status line,
  and a tap on it opens the field on those marks again. A reading that
  fails or times out is said too.
- **F7 A minimap.** The whole board in a corner, with the viewport on it;
  a tap or a drag there pans.

These come before T7 and T8. Everything below stands as written.

## 1. Decisions

**D1 — An MCP server is a hand in a room.** No new channel into the
engine. `Demos/mcp.mjs` is a participant: it joins a live room through the
relay (`Demos/relay.mjs`, started in-process when none is listening),
keeps a session from the merged logs exactly as a tab does, and its tools
are the verbs a hand already has — look, see, draw, say, propose,
transcribe, write. Its events land in the room as its own log, stamped
`by` on arrival like any other hand's, drawn in its colour. A `.mcp.json`
at the repo root registers it for Claude Code; the tab joins the room with
one tap (*live* → *with Claude*). The MCP hand proposes and never blesses:
what it reads lands as attributed readings and transcripts, what it draws
is declared content, what it writes is a version — the human decides, as
with every other participant.

*Why a room, not an API:* the per-participant log is already the one seam
between hands (v9 D10). A second transport would be a second truth. And an
MCP hand *sees*: it can ask for the ink as an image, which makes Claude a
reader of handwriting with no vision model joined — the tier 2 seat, taken
by whoever is in the conversation.

**D2 — A frame takes the pointer while it plays; ink that starts outside
goes over it.** John's rule, exactly: *if drawing starts outside the frame
it goes over continually, but clicks inside the frame are captured.* The
canvas keeps every pointer (ink is never covered; the stage stays under
it). A pointer-down inside a **playing** program's frame is forwarded to
that frame — the harness dispatches it inside as real pointer and mouse
events at the point, and hands it to `mm.onPointer` — and every move and
release until the hand lifts goes the same way, nothing drawn. A
pointer-down anywhere else is ink, and stays ink across any frame it
crosses. A page (no scripts) and a still program (its source card) take
ink from anywhere, as before: there is nothing in them to click. Hover
over a playing frame changes the cursor, so the hand knows before it
lands. *Doodling on the 3D thing* is a stroke begun beside it.

**D3 — Writing gathers by nearness, and is read as one line.** Letters
already gather into a word by succession (`words.ts`). Words and cursive
marks now gather into a **line of writing** by nearness alone — on a
shared band, a gap under a couple of x-heights, no clock — as a tier 1
concept, `writing`, over a summoned group. *Read the writing* on a line
renders the whole line as one image and asks for the line, so a model gets
the context a phrase needs; one word per mark lands on each mark, else the
line is held on the leftmost mark and the rest are marked as read with it,
so the offer to name and *Make it text* appear once. An MCP hand that sees
is a reader.

**D4 — A question is a drawn candidate.** When the engine is unsure it
asks with ink: a dashed candidate where it thinks the thing is (a wire's
end on the box it probably joins; the corner a scratch nearly closed) and
one sentence beside it. A stroke that follows the candidate takes it up
(the same test a snap ghost passes); a scratch across it refuses; anything
else leaves it held and out of the way. Questions live on the explanation
plane — visible, erasable, never ink. First case: a wire whose end lands
inside twice the joining tolerance but outside it.

**D5 — Affordances at rest.** Three ways the board says what it can do
before anything is typed. **Press and hold a mark** to hold it with what
it touches — the field opens with no loop drawn, which is what a
newcomer tries first. **The standing line is a ladder**: the next move,
in a few words, keyed to the board's state (empty → draw; marks → hold
one, or circle some; a loop → double-tap inside it; a selection → the
field). And **a pill says where it leads** — its tooltip carries the next
rung (*Show it in 3D → then ask which molecule*), so depth is legible one
step at a time.

**D6 — Transformations are a map.** What a drawing can become is a table,
not a scattering of verbs: ink → shape (tier 0) → concept or definition
(tier 1) → structure (tier 1) → artifact — page, program, 3D (tier 1 from
the library, tier 2 for words) → refined by ink on the artifact (tier 2).
The inspector shows a selection's place on it as *becomes*; the field's
pills are the next rung. The map is §4 of this plan and the help pane
reads it.

**D7 — The molecule chain is the demo.** The whitepaper's promise —
*spheres joined by lines → the parse offers* molecule *→ a 3D
representation → which molecule → refined by doodling on it* — runs on
the rungs above: circles joined by lines read as a `graph`; *Show it in
3D* (tier 1, the library) puts spheres and bonds in the ink's frame as a
`run` program, each sphere named for the mark it stands for so ink over
it lands on that atom; *What is this?* asks every model with the graph as
the brief and their answers join the certainty row; naming one holds a
definition that carries the program, so the next drawing like it is one
tap from 3D. Refinement is ink over the running frame: circle an atom,
type `what: oxygen`.

**D8 — Ids are a debt.** Every node id is `prefix:counter`, derived on
replay. Two hands writing at once can produce the same id in different
logs, and a merge that reorders by time shifts what a later event refers
to. Not fixed here; noted so no package below builds on ids being stable
across hands. The fix is participant-scoped ids (`stroke:john:7`) with a
one-time migration of held logs.

## 2. Packages, in order

| # | Package | Owns | Done when |
|---|---|---|---|
| T1 | **The frame takes the pointer** (D2) | `07-input.js` (`pointerFrameAt`, the forward), `13-kinds.js` (the harness receives pointer messages, `mm.onPointer`), `surface.css` (cursor), e2e 29 | A program that records `mm.onPointer` reports a part where a tap landed; a stroke begun outside the frame and dragged across it is ink; the cursor changes over a playing frame |
| T2 | **The MCP hand** (D1) | `Demos/mcp.mjs`, `Demos/relay.mjs` (exports `startRelay`), `Demos/ink-png.mjs` (ink to PNG in Node), `.mcp.json`, the live pane's *with Claude* button, docs | From a terminal, `tools/call canvas_draw` puts a circle on a tab in the room in Claude's colour; `canvas_see` returns a PNG of the ink; `canvas_look` describes the board; a smoke test drives it over stdio |
| T3 | **Writing by nearness** (D3) | `concepts/concept.ts` (`writing`), `06-handwriting.js` (read a line as one image), `09-palette.js` | Three scribbled words circled read as *writing 0.8*; *Read the writing* makes one call and one transcript; *Name it "…"* appears once |
| T4 | **Hold by long-press, and the ladder** (D5) | `07-input.js`, `08-render.js` (the standing ladder), help | Press-and-hold on a mark opens the field on it and what it touches; the standing line names the next move at each state |
| T5 | **The map of becoming** (D6) | `10-inspector.js` (*becomes*), pills' tooltips, help | A selection's row says its rung and the next |
| T6 | **Molecule in 3D** (D7) | `tier1/library.ts` (`graph3d`), `09-palette.js` (*Show it in 3D*), e2e | Three circles and two lines → *Show it in 3D* → spheres and bonds turning in the ink's frame; ink over a sphere addresses that mark's id |
| T7 | **Questions as strokes** (D4) | `session.ts` (`question`/`accept`), `diagram/roles.ts` (the uncertain wire), `08-render.js`, `07-input.js` | A line ending near a box draws a dashed end on it and asks; a stroke that follows takes it; a scratch refuses |
| T8 | **Ids per hand** (D8) | `session.ts`, `store/merge.ts`, a migration | Two hands drawing at once never collide; every held log still loads |

T1–T4 are this week's; T5–T6 follow; T7–T8 are designed here and built
when the first five have been used.

## 3. What no package may break

- **Ink is never covered.** The stage stays under the canvas. A frame that
  takes the pointer does not rise above the ink to do it.
- **Nothing runs unblessed.** An MCP hand can *write* a program; it cannot
  play it. Play stays the human's event.
- **A model is asked only by a deliberate act.** An MCP hand is not a
  model the board asks; it is a hand that acts. Its arrival triggers no
  reading.
- **Every tier proposes; the human blesses.** The MCP hand's readings,
  transcripts and names are held and attributed, never blessed by it.
- **Keys never leave the device.** The MCP server holds no keys; the relay
  carries lines, not secrets.
- **The e2e never runs in John's tab or origin.** The MCP smoke test runs
  in its own room (`mcp-test`) and its own tab on `127.0.0.1`.

## 4. The map of becoming

What a thing on the board can become, by rung. Each row is a place the
field can stand; each arrow is a pill.

| Rung | What stands | Who | Becomes |
|---|---|---|---|
| ink | strokes | hand | → a shape (always, at once) |
| shape | rectangle 0.86 · text · arrow | tier 0 | → clean form · → a word (letters) · → a line (words) · → a role |
| role | container · node · edge · label | tier 1 | → a concept · → a genre |
| concept | row · frame · flow · slider · writing | tier 1 | → line up · match sizes · a control · read the line |
| definition | *molecule 0.92* | the library | → another molecule · → its program · → its tank |
| structure | the page with no words · the graph | tier 1 | → a model's words (tier 2) |
| artifact | a page · a program · a 3D thing · text · a picture | tier 1/2 | → ink over it addresses its parts · → a version · → wired in a frame |
| refined | *oxygen* on a sphere · a changed region | tier 2 | → held on the artifact as a reading |

The rule for a pill's tooltip: the verb, its reason, then `→ then …` with
the next rung, when there is one.

## 5. The MCP hand's tools

All events go through the same session a tab runs; nothing here is
special-cased in the engine.

| Tool | Does | Engine call |
|---|---|---|
| `canvas_look` | The board in words: every mark with its shape and number, names, artifacts and their kinds, the selection, who is here | `describeSession`, `read` |
| `canvas_see` | The ink as a PNG (all of it, some ids, or a region) — so the caller can *see* the sketch and read the writing | rasterised in Node |
| `canvas_draw` | Marks in the shape rung's vocabulary (rectangle, circle, triangle, line, arrow, dot) or raw strokes, declared content | `addStroke(…, { content: true })` |
| `canvas_say` | A sentence beside marks | `answer` |
| `canvas_propose` | A reading of a mark or group, with a number and a reason — an offer to name | `propose` (`resembles`) |
| `canvas_transcribe` | What some writing says | `propose` (`transcript` rep) |
| `canvas_write` | Code for a new artifact in a frame, or a new version of one | `import` / `attachCode` |

The server speaks MCP over stdio with no dependency (newline-delimited
JSON-RPC: `initialize`, `tools/list`, `tools/call`); it imports the built
engine from `metamedium-core/dist`. Room, relay and name come from the
environment (`MM_ROOM`, `MM_RELAY`, `MM_NAME`; defaults `claude`,
`http://127.0.0.1:8020`, `claude`).

## 6. Open, John's

- **Interactive pages.** D2 forwards pointers only to a playing program.
  A page with a form or a link would need scripts, which the page sandbox
  refuses on purpose. If pages should be clickable, it is a third kind
  (`app`: scripts, opaque origin, no ink hit-testing), not a change to D2.
- **What the MCP hand may bless.** Nothing, in this plan. If a session
  with Claude should be able to *name* things outright, that is a
  capability on the participant, and the log would show it.
- **The 3D program's look.** Spheres and bonds in the ink's colour on a
  clear frame, turning slowly. Whether atoms get element colours once
  named is a design call.
- **Where questions go when ignored.** Held on the explanation plane until
  the next stroke on the same marks, or forever? The first cut holds
  them until erased.

## 7. Where we are

| # | Package | Status |
|---|---|---|
| T1 | The frame takes the pointer | ✅ 14 Sep — `pointerFrameAt`/`postPointer`, the harness's `mm.onPointer`, a waiting loop stays the hand's; e2e 29–29b, 27d begun outside |
| T2 | The MCP hand | ✅ 14 Sep — `Demos/mcp.mjs` over `relay.mjs`/`live-node.mjs`, `ink-png.mjs`, `.mcp.json`, *with Claude* in the live pane, the Node bundle in CI; smoke test 18 checks. Found on the way: "local" in another hand's log is that hand (`applyEvent`), and a merge must take my log from the session, not the room (e2e 28c2) |
| T3 | Writing by nearness | ✅ 14 Sep — the `writing` concept (bands first, then a word's gap), `readLine` as one image, `agent.read({ hold: false })`, the line as one name and one text; e2e 30–30c |
| T4 | Hold by long-press, and the ladder | ✅ 14 Sep — `holdAround` over `MM.clusters`, the standing line's `nextMove`; e2e 31–31b |
| T5 | The map of becoming | ✅ 14 Sep (first cut) — the panel's *becomes* row (`becomesOf` in `10-inspector.js`): the selection's rung and the next; pills' tooltips carry *→ then …* where a next rung exists (the 3D pill); e2e 32z. *Still to do:* the map in the help pane, and *→ then* on every pill that has a next |
| T6 | Molecule in 3D | ✅ 14 Sep — `buildGraph3D` in the tier 1 library (spheres for nodes, bonds for edges, from the drawing; turns on its own and under a pressed hand; the 2D fallback reports its parts), *Show it in 3D* in the field with its tooltip's next rung, a 3D entry rebuilt for the next drawing; e2e 32–32c. *Still to do:* which molecule — *What is this?* with the graph as the brief, and the answer's name on the artifact |
| T7 | Questions as strokes | designed |
| T8 | Ids per hand | designed |
| F1 | Letters at any size | ✅ 14 Sep — the cap is a ceiling (150 px), an ascender may stand 3.2 x-heights over its neighbours; core test, e2e 33 |
| F2 | An arrow draws back on itself | ✅ 14 Sep — the barb turns past 95° (full credit at 140°) and is at least a sixteenth of the stroke; the bench corpus still passes |
| F3 | The mark crosses what it means | ✅ 14 Sep — an open stroke is engaged only by a crossing, a closed mark by a crossing, a landing inside, or nearness; a taught band widens at most 2.5 floors; the teach pane warns below consistency 0.5; e2e 33a. *Open:* a closed letter (o, a) beside a mark-shaped stroke can still engage |
| F4 | An assessment is offered, not stuck | ✅ 14 Sep — the ghost shows on the mark just drawn for six seconds, and on what is hovered or held |
| F5 | The field has every option | ✅ 14 Sep — *Read as writing* on any ink (e2e 33b); typing already matches the direct commands first and falls back to the brief |
| F6 | A reading anchors on the canvas | ✅ 14 Sep — a chip beside the group when the reading lands, a tap reopens the field on it; e2e 33c–33d |
| F7 | A minimap | ✅ 14 Sep — `21-minimap.js`; e2e 33e–33f |
