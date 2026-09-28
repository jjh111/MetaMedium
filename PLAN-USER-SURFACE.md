# dyna.ink — the user surface: a plan for the next dev agent

**28 September 2026.** Written by the director (a Claude Code session on John's
machine) for a dev agent working in the cloud. It stands on its own: read it,
then the files it names, and start. The evidence for every finding is
`UX-AUDIT-2026-09-28.md` beside this file — a walk of the app as a user who can
only do what the screen gives.

**The product is becoming dyna.ink** (copyright). The code, the repository and
the URLs still say MetaMedium; **do not rename anything** — the rename is its own
unit and John sets its scope.

---

## 0. Read first

1. `CLAUDE.md` — the architecture, the rules, the repository map. Especially:
   *The field*, *Tools*, *Context*, *Pen, finger and palm*, *Every sentence has one
   place*, *A model is asked only by a deliberate act*, *Handwriting*, *Living
   artifacts*, *Working with the Codebase*.
2. `UX-AUDIT-2026-09-28.md` — sixteen findings, seven principles.
3. `V1-PLAN.md` §0 (the ten scenarios), §9 (every unit with a dated status line;
   yours get one too).

**Hard rules** (each has bitten before):
- **Red first.** Every unit's first commit is its failing test, alone, with the
  failing lines pasted into the commit message.
- **Never a real key and never a real vendor.** The browser gate fails any
  request to a model host (`e2e/guards.mjs`); use the stubs.
- **The e2e harness wipes the saved board of the origin it runs on.** The gate
  (`node e2e/run.mjs`) starts its own servers on free ports — use it, never a
  page someone else uses.
- **Never weaken an assertion** to pass. When a golden changes *by design*
  (this plan changes some), record the new golden in its own commit and say
  exactly which lines and why.
- **Never edit `metamedium-core/src/session/session.scenario.test.ts`.**
- **Bound every long command.** If a run overruns its limit, stop it, commit
  what is done, and say what was left. (Two agents hung overnight on 28 Sep on
  unbounded runs.)
- One definition, one home; never restate a threshold in prose (cite the file).

## 1. Where things stand

- `master` has phases 0, 0b, 1 (tools, context, packs) and 2 (handles, bindings
  that follow, ports/heads/figures) of `V1-PLAN.md`, and the engine side of
  diagrams: flowchart, UML class, sequence (with dashed lines), Mermaid out and
  in, W1 (drawing a diagram never erases or swallows its own parts). The app is
  live at `https://jjh111.github.io/MetaMedium/app/`.
- **In flight on John's machine — do not start these unless John says they
  stopped** (briefs in §5 if you must take them over):
  - **J5 — a hosted model is asked, and says why when it cannot be** (branch
    `w2`). Owns `metamedium-core/src/llm/provider.ts`, the hosted join and model
    rows of `Demos/surface/04-models.js`, `askModelsAbout`/`readWriting` error
    reporting, reader choice in `Demos/surface/06-handwriting.js`, a stub model
    server in `e2e/`. Also: asking never opens the models pane, the ask waits
    and runs when a model joins; model names without `llm:`; readings in words
    not slugs; a suggested model per job.
  - **J4 — Claude Code is the canvas's seat** (branch `w2-shard`). Owns
    `Demos/mcp.mjs` (`canvas_pending`, `canvas_answer`), a new
    `Demos/surface/24-seat.js`, `Demos/seat-watch.mjs`, a small hook in
    `04-models.js`; *Claude Code — in this room* at the top of the models pane,
    *with Claude* in the Live pane joins and takes the seat, "MCP server (the
    door)" moves under *advanced*.
  - Both will be merged to `master` by the director. **Start your units from
    `master`; before U1b and U1e, rebase onto `master` once J5 has landed**
    (they touch the same status sentences and field lines).
- **Not needed:** John confirmed the taught *your mark* gesture already survives
  a refresh (it is kept in `localStorage`, `mm-command-mark`, and re-taught at
  every open, live rooms included). Keeping it with an account is future work.

## 2. Setup on a fresh machine

Node 22, as CI (`.github/workflows/ci.yml`):

```bash
(cd metamedium-core && npm ci)
(cd shard-3d && npm ci)
(cd e2e && npm ci && npx playwright install --with-deps chromium webkit)
(cd "Web App Skeleton" && npm ci)
```

**The whole suite** — run it before your last commit of every unit and put each
command's last line in your PR:

```bash
cd metamedium-core && npm run typecheck && npm test
node --test Demos/relay.test.mjs Demos/build-surface.test.mjs Demos/surface/*.test.mjs scripts/*.test.mjs
node Demos/build-surface.mjs --check && node scripts/build-app.mjs --check
node Demos/mcp-smoke.mjs
cd shard-3d && npm run typecheck && npm test && node mcp-smoke.mjs
node e2e/run.mjs && node e2e/run.mjs --browser webkit smoke pencil
```

**Built files are committed and checked**: after changing
`metamedium-core/src`, `cd metamedium-core && npm run build:browser && npm run
build:node && cp dist/metamedium-core.browser.js dist/metamedium-core.node.mjs
../Demos/`; after changing a `Demos/surface/*.js` fragment, `node
Demos/build-surface.mjs` (commit `Demos/session-engine.js`); after changing
`Demos/session-engine.html`, `Demos/sw.js` or the manifest, `node
scripts/build-app.mjs` (commit `app/`). CI fails on any drift.

**The surface is one closure**: `Demos/surface/*.js` fragments are concatenated
in name order; no imports; each fragment's header says what it provides and
uses. The pure fragments (`07-hand.js`, `09-field.js`, `17-board.js`,
`17-boards.js`) are tested in Node — put new pure rules there.

**To look at it**: `python3 -m http.server 8000` at the repo root, then
`http://127.0.0.1:8000/app/?fresh=1&nosw=1` (a board that starts empty).

## 3. How to work

- One branch per unit from `master` (`ux/w3-tap`, `ux/w2-writing`,
  `ux/u1a-panel` …), one PR per unit, CI green before asking for review. Never
  push to `master`, never force-push a shared branch.
- Each PR: the red commit first; the fix; the docs (`CLAUDE.md` where it
  describes what you changed — cite files; a dated status line for the unit in
  `V1-PLAN.md` §9); the suite's last lines; screenshots of the before and after
  from the headless browser.
- End every commit message with the co-author line your harness gives you.
- If a finding turns out wrong, or a fix pulls against a rule in `CLAUDE.md`, say
  so in the PR and stop there rather than bending the rule.

## 4. The units, in order

### W3 — a tap never leaves a dot

**Finding** (audit row 15; John: *fix the dot being left behind when clicking off
the open context dialog*). With the field open, a click on empty ground that
moves 3 px or more becomes a stroke — a four-point dot — and the field stays
open. A still click closes it cleanly. **Cause**: `Demos/surface/07-input.js`
decides a tap by point count — `const tiny = points.length < 3;` (≈ line 405) —
so any pointer that reports a few moves is ink.

**Done**: a tap is judged by how far the pointer travelled **on screen**, as a
pure rule in `Demos/surface/07-hand.js` beside `PAN_SLOP_PX` (with its
reasoning): while something is dismissable (a summon/the field, a selection, a
loop that waits), a press that stays inside the tap slop is the dismissal —
never a stroke in the log, never a dot, for the mouse, the pen and the finger;
with nothing to dismiss, a deliberately drawn dot is still a dot.
**Red first**: `07-hand.test.mjs` cases for the rule; an e2e record in
`Demos/session-engine.e2e.js` that opens the field (press and hold a mark) and
clicks off with 1, 3 and 6 px of travel (the 3 and 6 px cases leave a dot today);
the pen and finger variants in `e2e/pencil.mjs`.
**Trap**: a small deliberate stroke while the field is open (a dot on an i)
should dismiss first — that is the dead state's rule — say it in the header.

### W2 — writing reads when it is writing

**Finding** (audit row 4; John: *the "writing" option that gets correctly
assessed should parse the writing; the options should be consolidated*). For a
line of writing that has not been read, the field says `↵ writing 0.75 — take it
as the name` (Enter **names the group "writing"**) and offers three pills:
`writing 0.75`, *Read the writing* (asks a model) and *What is this?* (asks a
model). See e2e 49's golden, `window.__FIELD_GOLDEN["line of writing"]` in
`Demos/session-engine.e2e.js`.

**Done**: when the held scope reads as writing (the `writing` concept, a word,
text marks), the reading is taken by **reading it** — the same act as *Read the
writing* (`readLine`/`readWriting` in `06-handwriting.js`, whichever reader is
joined: a model that can see, or Claude's seat once J4 lands) — never by naming;
the line under the input says `↵ read it` with the model dot; *Read the writing*
and *What is this?* are not offered separately for a pure writing scope (one
option); when the words land, they lead as today (*Make it text*, *Label it*,
*Name it*); with no reader, the reading says what would read it — **inline, in
the field** — and keeps the ask (J5's kept-ask flow; if J5 has not landed, open
nothing and say it in the line). Files: `Demos/surface/09-palette.js`
(`readingItem`, the concept readings' "take it as the name", ≈ lines 120–180),
`Demos/surface/09-field.js` (`readFieldCommand`: the `take`/`name` commands and
the line), `metamedium-core/src/tools/read.ts` and `what.ts`.
**Red first**: e2e records for a written word and a written line: the reading's
line says "read it", Enter reads (the stub model answers), one option not three.
Then record the new golden for the **writing scopes only** in its own commit;
every other scope's golden is unchanged.
**Trap**: v10 F5 deliberately offers *Read as writing* on ANY ink because the
shape rung reads real letters as arcs and triangles — keep a way to read ink the
engine did not call writing (U1d decides when it is offered).

### U1 — the surface speaks the user's language

Seven sub-units, each its own PR, in this order. They answer audit rows 1–5, 9
and 12–14 and the principles *your words, not the engine's*, *the default is the
likely act*, *the field stays by the hand and whole*, *offers are relevant or
absent*, *help teaches the loop*.

**U1a — the panel for the user, the inspector behind *details*.** Today the side
panel opens itself after the first stroke as an inspector: `id stroke:3`, `tier 0
· shape`, `held touching stroke:1`, heading and slope (`Demos/surface/10-inspector.js`).
Done: by default the panel says, in two or three plain lines, what the held or
last mark is and what it can become (the *becomes* row already has the words);
ids, tiers, relations, measures and read-as tables stay available behind
*details*, closed by default, remembered per device. The empty-board guide (UI-2)
stays. Red first: e2e records that the default panel after a stroke and after a
hold contains no id, no tier and no coordinate.

**U1b — the status line in words.** Today: `0 loose`, `bound — the west of the
circle at (749, 370)`, and a run-on of every task in flight truncated with `…`.
Done: one sentence at a time (the CLAUDE.md rule *every sentence has one place*);
counts in words (*3 marks*, not *3 loose*); no ids, no coordinates (*the line is
tied to the circle*); work in flight summarised (*qwen is reading 2 things · Esc
stops it*) with the detail on the marks' own dots. Files: `say`/`flash` and the
standing line in `07-input.js`/`08-render.js`, the bind message (`05-snap.js` /
`07-input.js`), `folderStatus` in `17-folder.js`. Rebase on J5 first (it changes
the model names and the work labels). Red first: e2e records of each sentence
above.

**U1c — the field by the hand, whole.** Today the field opened once beside the
drawing and once in the bottom-right corner over the minimap, far from the held
marks; after a model answered, its pills ran off the right edge, cut mid-word.
Done: the field opens beside the hand's last press on the held marks, on the
hand's side, never over the minimap, the bar or the panel, and never clipped —
its pill list scrolls when it must (the keyboard rule UI-1/R6 already fits it to
the visible viewport); long labels wrap or ellipsise inside the pill. Files:
`fieldBox`/`placeField` in `09-palette.js` (≈ line 546), the minimap's rect in
`21-minimap.js`. Red first: e2e records holding marks at each corner of the
screen and after a model's long readings arrive: every pill fully on screen and
off the minimap.

**U1d — offers relevant or absent.** Today *Read as writing* is offered on a box,
a line and a circle, and *Show it in 3D* on almost any two shapes joined by a
line. Done: *Read as writing* is offered when the held marks include ink the
rung could not place confidently or that reads as text/letters (keep F5's point:
misread letters must still be readable); *Show it in 3D* only for what its tool
says it builds (circles joined by lines, `tools/graph3d.ts`). Update
`metamedium-core/src/tools/builtin.test.ts`'s pill goldens deliberately. Red
first: the offer lists for a box+line+circle and for a molecule.

**U1e — Enter does the likely act.** Today Enter on held shapes takes the top
*reading* as a name (`↵ flow 0.90 — take it as the name`; after a model answers,
`↵ state-transformation … — take it as the name`). Done: with the input empty,
Enter takes the top **offer** (the act ranked first by B2's context — *Draw them
clean*, *Line up across*, *read it* for writing); a reading becomes a name only
by tapping it or typing `name:`; the line under the input always says which. Files:
`09-field.js` (`readFieldCommand`), `09-palette.js`. e2e 49's golden lines change
by design — record them in their own commit. Red first: the lines and Enter's act
for the three golden scopes.

**U1f — the control centre, grouped.** Today sixteen tiles of equal weight mix
settings, one-off acts and connections, with *Reset* beside *Help*. Done: three
labelled groups — **Board** (boards, folder, import, export, reset), **View**
(zoom, view, theme, hand, snap, snap now), **Helpers** (models, live, auto-read,
packs, your mark, help) — with *Reset* away from *Help*; every tile keeps its id
(e2e 51 checks `packsBtn` is last in the grid — update deliberately). Files:
`Demos/surface/20-controls.js`, `00-ui.js`, `surface.css`.

**U1g — help teaches the loop; your mark says what it is.** Today *Help* loads
`QA-v8.md` — a developer test plan dated 6 September with server commands, whose
*Reset* step describes the old behaviour (`20-controls.js` ≈ line 114). *Your mark*
says only *Draw your mark five times*, and the bar's chip just says *check*.
Done: `HELP.md` at the root — one page for a user: draw, hold, choose; the field's
four core buttons; what a model adds and how to ask one (and Claude, once J4
lands); boards; live rooms; your mark; undo; the shortcuts — loaded by the help
tile (keep `QA-v8.md` as a test plan, linked from `HELP.md`'s foot). The *your mark*
pane and the chip say what a mark does: *circle some marks, then draw your mark
across them to see what they can become; the built-in mark is a check ✓ — teach
your own by drawing it five times.* (`03-teach.js`, the chip in the bar.)

### U2 — the audit walked again

When W3, W2, U1 and J5/J4 have landed: walk the sixteen rows of
`UX-AUDIT-2026-09-28.md` again in the headless browser, as a user, and add a
column: *resolved* (with a screenshot) or *deferred* (with why and the unit that
owns it). That table is the acceptance; John then walks it by hand.

## 5. If you must take over J5 or J4

Only if John says the local lanes stopped. Their full briefs are summarised
here; the director's notes on what they found are in `V1-PLAN.md` §9 when they
land.

- **J5 — a hosted model is asked, and says why.** OpenRouter's GLM Flash is
  `z-ai/glm-5.3-flash` (or `~z-ai/glm-flash-latest`); it takes images and answers
  with reasoning. The pane guesses vision from the id (`04-models.js`, a regex
  without *glm*), so *Read the writing* never asks it; `provider.ts` reads only
  `message.content` (a reasoning-only reply fails as *no completion text*); a
  failure is one fleeting status sentence. Done: ask the provider what a model can
  do (OpenRouter's public `GET /api/v1/models`: existence, `input_modalities`,
  context), read replies the way providers send them (content parts;
  reasoning-only said plainly; `max_tokens`; a quick `reasoning` setting), keep each
  model's last call in the pane with a *try it* button, asking never opens the
  pane (the ask waits and runs when a model joins), names without `llm:`,
  readings in words, a suggested model per job — tested against a stub
  OpenAI-compatible server the gate starts, never a real vendor.
- **J4 — Claude Code is the canvas's seat.** The 3D shard already works this way
  (`SHARD-3D-PUSH-2.md` G5; `shard-3d/src/room.ts`, `src/models.ts` `joinHand`,
  `shard-3d/mcp.mjs` `space_pending`/`space_answer`): a brief is a log event in
  the live room, paired by the brief node's own id (L2a). Bring it to the canvas:
  a *Claude Code — in this room* seat (sees; `interpret`, `read`, `ask` through a
  parked transport, `participants/bridge.ts` pattern), `canvas_pending` /
  `canvas_answer` in `Demos/mcp.mjs`, `Demos/seat-watch.mjs` printing one line per
  parked brief (so a Claude Code session can watch and be woken), *with Claude*
  joining and taking the seat in one act, the old door under *advanced* — tested
  with the gate starting a relay and a scripted answerer.

## 6. After this plan

The rest of `V1-PLAN.md`'s ladder, in the order the director would take it:
D2's surface (a `mermaid` kind that stands the engine's Mermaid on the board) and
D3's surface (*Draw it* from Mermaid, labels inside symbols); M5 maths on the
board (A4); S2 (an arrow read where its ink points — five findings in §9); D5's
state half; D6 ER and mind map; R5 first run (with U1g); H1 the hand in the gate;
then the review of use and v1.0.0. `boards/story/` (on branch `w2`, landing on
`master` with J5) holds the board that explained the platform in its own medium
and the thirteen gaps it found (region 8) — the
library it wanted (mermaid/table/chart kinds, sections, comment threads, named
views, architecture and status packs) is the backlog after v1's units.
