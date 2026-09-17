# Director's view — 17 September 2026

*Where the whole thing stands after the week of 10–16 September, what the
15 September review got right and what it missed, where a decision-only
model like Jev would and would not fit, and the next steps in order. Written
on `master` at the tip that carries everything; the numbers below were run
on that tip this morning.*

## 1. Where we stand

**One engine, two surfaces, three doors.** `metamedium-core` reads ink
(the shape rung), says what it plays (the diagram rung), what it means
(concepts), and what it can become (the instant library) with no model;
models contribute through one constrained channel (`propose`); the log is
the source and state is a pure function of it. The **canvas** is the
reference surface; the **3D shard** is a bounded MetaMedium for making
things in space, importing the engine from source. The three doors are the
pen, a model (local or hosted, asked only by a deliberate act), and MCP in
both directions — a hand in a room (`Demos/mcp.mjs`, `shard-3d/mcp.mjs`),
the canvas as a client of other servers, and the shard's *seat*, where
Claude Code answers a brief exactly as a small model would.

| Proof | Today |
|---|---|
| Core tests | 617 across 54 files |
| Shard tests | 555 across 29 files |
| The field's reader, in Node | 18 |
| Browser gate, headless in CI | 4 scenarios, 342 records, one honest skip, ~110 s |
| Surface build | in sync |
| Branches | everything on `master`; 21 merged agent worktrees removed |

**What the week landed, by lane.** Canvas: v10 T1–T6 (the MCP hand, a
playing frame takes the pointer, writing by nearness, hold by long-press,
the map of becoming, the graph in 3D) and the foundations F1–F13 that
John's own hand exposed (letters at any size, an arrow that draws back,
a mark that fires on what it crosses, ghosts that go, readings that stay,
a minimap, text in place that folds back from ink, every prompt grounded
in what can be made here). Control points: magnets P0–P1 and the binding
contract BIND-1. The shard: P0–P6 to the MVP line, the compass, push 2
G0–G5 (geometry from the drawing, the seat). The review: all nine
packages, each with its regression. The whitepaper: the loop, running, is
the lede.

**What using it taught** (`NOTES-DRAWING-WITH-THE-HAND.md`), biggest
first, all still open: **node ids do not survive the merge**, so a hand's
`say` and `propose` land on the wrong marks in any room with another hand's
work; a hand cannot name its own ink; a new tab does not reliably catch up
(the relay replays stale `full` snapshots and caps at 5,000 lines); there is
no lightweight label primitive; `fitAll` fits where cards were logged, not
where they are placed; writing a figure through the hand is arithmetic.

## 2. The consult, reviewed

The document is `DIRECTOR-REVIEW-2026-09-15.md`: an audit from another
director-level perspective, run against a real browser with a stubbed model,
that turned findings into nine bounded packages, each with a failing
regression, an owner and exact verification. Everything it asked for landed
on 16 September.

**What it got right, and should keep steering.** *Make the existing loops
trustworthy and easy to discover before adding another rung* — that was the
correct call and it held: no rung was added, the gate exists, the erased-
target hole is closed at the session's own door, undo is an act, trees are
validated, the field's reader is a pure fragment. *Separate delivery lanes
for the canvas and the shard* — right, and it is now visibly true: the shard
moved faster than the canvas this week precisely because it did not wait
for the canvas. *Bounded fixes with a regression each, one implementer, one
reviewer, no competing implementations* — the discipline that made twenty
agent worktrees mergeable in a day. Its preservation list (log as source,
plural readings with reasons, tier 1 before a model, one field with stable
slots, tokens and URLs, drift checks) is the constitution and should be
copied into every future handoff unchanged.

**What it under-weighted.** It audited single-hand boards, so it never
reached the defect that real use hit within minutes: **ids per hand** (v10
D8). Every mark's id is a counter over the merged log, so the same event
carries different ids in different sessions, and the whole point of the MCP
hand — saying and proposing about another hand's marks — is unsafe until it
is fixed. It is the biggest open item in the repo and it is not in the
review. Second, the review's models were stubs; the shard's push 2 then found
that John's castle failed not on geometry but on the brief (a model reached,
a reply dropped, one sentence at the bottom of the screen). A review of a
system whose product is a conversation has to include one real conversation.
Third, it left three lower-confidence items unpromoted: silhouette-cache
growth, local credential storage, duplicate-Enter concurrency. Duplicate
Enter is real in a slow-model world (two Enters on one loop bless two
artifacts and ask twice) and cheap to close; the credential tradeoff is a
documented rule (keys never leave the device, remembered only when asked) and
should stay; the cache should be measured, not guessed at.

**Verdict.** Sound, cheap to follow, and followed. The next review should be
of *use*, not code: `QA-v10.md` run with the hand in the room on John's own
boards, and the shard's castle through his own key. The faults that come out
of that are the next plan; a second code audit now would find less.

## 3. Jev, and where it fits

**What it is.** Jev is TypeSafe AI's first "System One" model, in early
access since 15 September 2026 behind a waitlist, hosted only (`POST
https://api.typesafe.ai/v1/systemone`). It generates no text. A request is a
*state* (unstructured text or program state) plus typed *questions* — a
**Choice** among up to 255 options, a **Score** against ordered levels, or a
yes/no — and the reply is a typed value that cannot fall outside the schema,
with per-option probabilities and a confidence, in 70–500 ms. Input is
$0.042 per million tokens; output is free. On the vendor's own workflow
benchmark it agrees with frontier models within a point or two (67.8% against
GPT-5.6 Terra's 67.9%; Opus 5 at 73.1%) at hundreds to thousands of times
lower cost. Every number is the vendor's; there are no independent
benchmarks yet, and it has no vision and gives no rationale.

**Why it rhymes with this system.** MetaMedium already separates *deciding*
from *writing*. Tiers 0 and 1 decide instantly with measured confidence; tier
2 writes. Its briefs are typed states already — `describeReading`, the
field's `FieldContext` record, the shard's `describeSpace`, the `HERE`
paragraph — and its readings are plural with numbers. A decision-only model
with calibrated probabilities is a **tier 1.5 seat**: faster than any local
LLM, structured by construction, and honest about uncertainty in the one
currency the engine already uses.

**Where it would fit, in order of value.**

1. **Which name, from the human's words.** The shard's part-naming brief
   asks a model to name each part *from the words the human typed*, never to
   invent. That is a Choice per part over the words in the brief — no
   generation needed. qwen3:8b takes 42 s; this would take a tenth of a
   second, and the fixtures in `shard-3d/fixtures/exchanges/` are the
   measurement.
2. **Questions as strokes (T7).** *Does this line join A, B, or nothing?*
   is a Choice over the candidates the engine already ranks; the engine asks
   the seat before it asks the human, and asks the human only when the
   probabilities are flat. Same for *is this closed stroke a loop or a
   drawing* on the rare ambiguous case.
3. **Plural readings, ranked.** Definition matches, concept readings and a
   model's proposals all carry numbers; a Score over them against the
   grounded facts is a second opinion at tier-1 speed. It never evicts the
   engine's reading — it is one more attributed row in the certainty column.
4. **A guardrail on what a model wrote.** *Does this page honour the
   drawing?* as a yes/no before rendering, cheaper than `validateRegions`
   when the question is about content rather than geometry.
5. **Routing.** Which participant should take a brief. Low value today; the
   router is rules and they work.

**Where it does not fit, and the rule that keeps it honest.** It cannot
write a page or a program, cannot read handwriting, and cannot explain
itself — and every reading here carries a reason. So a decision seat's
*reason* must be the question it was asked and the distribution it returned,
shown as such, never a sentence invented for it. It is hosted only, so it
sits where hosted models already sit: the user's own key, held on the
device, remembered only when asked. And it is one vendor in early access, so
it must be a **seat, not a dependency**: a `decide` participant with an
injectable transport (the `bridge.ts` pattern the shard's seat already uses),
so the seat can be Jev, a local classifier, or a hand, and the engine never
knows which. Build the seat against fixture 1, measure, and only then let it
near a live board.

## 4. Next steps, in order

1. **Ids per hand (T8).** An id becomes a function of the event — the
   writing log's name and a sequence number in that log — so every replay
   everywhere derives the same id; a one-time migration for held logs; the
   relay's catch-up fixed with it (replay no stale `full`; a room that
   outlives its buffer says so). It unblocks the hand's `say` and `propose`,
   the shard's pairing workaround, and every two-hand demo. Both surfaces,
   one contract, first.
2. **A review of use.** `QA-v10.md` with the hand in the room, on John's own
   boards; the castle through his own key. Faults written up the way
   `NOTES-DRAWING-WITH-THE-HAND.md` did it, and that is the next plan.
3. **A hand may label its own ink.** A *label* is a word placed on a mark by
   whoever made the mark — not a bless, not a file. Closes B and D from the
   notes, and lets `canvas_write` place a figure relative to a mark (F).
4. **The shard asks.** A part seen once is a question on the board (*how
   deep is this?*), answered by a second view or a word — T7's first case, in
   3D, where the ambiguity is real and measured.
5. **The decision seat**, as a bounded experiment on fixture 1 above, with
   the transport injectable and the vendor replaceable.
6. **The whitepaper's next figures** — the molecule to 3D, the castle — only
   after step 1, because the paper must never show what breaks with two hands.
7. **Housekeeping the review deferred:** duplicate Enter closed, the
   silhouette cache measured, `fitAll` fitting content and letting cards place
   themselves, a WebKit smoke in the gate.

**And what to stop doing.** No new rung until ids per hand land. No third
surface. Nothing promotes from the shard to core until it has been reused
and replayed (`SHARD-3D-PLAN.md` §11). No dependency on a vendor's decision
model; a seat, behind a transport, or nothing.
