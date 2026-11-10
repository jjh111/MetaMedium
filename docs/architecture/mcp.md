# The MCP hands and the seat: Claude Code on the board

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## The MCP hand: Claude Code on the board (v10 T2)

> `Demos/mcp.mjs` (the server), `Demos/live-node.mjs` (the relay as a
> transport in Node, reconnecting from its last id), `Demos/ink-png.mjs`
> (ink to PNG with no canvas API), `Demos/mcp-smoke.mjs` (the stdio test,
> run in CI), `.mcp.json` (registers it for Claude Code).

An MCP server is **a hand in a room** (SURFACE-v10-PLAN D1): it joins the
live room `claude` through the relay on this machine (starting one when
none answers), keeps a session from the merged logs exactly as a tab does,
and twelve of its fourteen tools are verbs a hand already has — `canvas_look` (the
board in words, with ids, and for notes the board's outline, the region each mark
stands in and the handwriting a line at a time with what it reads as; *The hand
organises notes*, below), `canvas_see` (the ink as a PNG: how the caller
reads handwriting or looks at a sketch — the tier 2 seat, taken by whoever
is in the conversation), `canvas_draw` (the shape rung's vocabulary or raw
strokes, declared content), `canvas_say` (a sentence beside marks),
`canvas_propose` (a reading, held), `canvas_label` (a word on its OWN ink —
below — refused on anyone else's, with the reason), `canvas_transcribe`
(what writing says, held), `canvas_write` (code for a new artifact or a new
version; where it goes is `bounds`, or `place` — `{in | under | above |
right | left: id, w?, h?}`, relative to a mark, so a caption inside a box is
not arithmetic; the notes' §F), **`canvas_import`** (a picture on the board;
*A picture in a room*, below), and **`canvas_find`**, **`canvas_region`** and
**`canvas_move`** (A2, *The hand organises notes*, below). The other two are **the canvas's seat**
(`canvas_pending`, `canvas_answer`; below).
It **proposes and never blesses**; it can write a program and **cannot
play it**; it holds no keys. MCP over stdio is newline-delimited JSON-RPC
written by hand, so the repo takes no dependency; it imports the committed
Node bundle `Demos/dynaink-core.node.mjs`. In the canvas: the *share*
tile → *more ways in* → *with Claude*, or `?live=claude&relay=http://127.0.0.1:8020` (on dyna.ink the tile defaults to `https://relay.dyna.ink`). Its
ink arrives as its own log, stamped `by` on arrival, in its own colour. It
is one sitting, named per process (`sittingName`) — a restart is a new hand
and the same person, so it may label what it drew before (L2i, the smoke) —
and `canvas_look` leads with what the room says about itself — a name two
hands share, a history older than the relay remembers (`LiveStore.notices`).
**In a session without the tools loaded** (the `.mcp.json` was added after
the session began), the hand still works from the shell: run `mcp.mjs` with
its stdin fed by `tail -f` on a command file and its stdout to an output
file, append one JSON-RPC line per call, read the reply — the same fourteen
tools, one process kept alive across turns. `QA-v10.md` is the hand test
run that way, with the hand in the room checking each step. **The gate walks its machine half** (`node e2e/run.mjs hand`, H1: the hand over stdio in a room of its own, QA-v10 §4, §6, §7, acceptance A7), and `QA-v1.md` is the hand checklist for all ten scenarios. Its `canvas_look` says who read a mark — a reading another hand proposed, or its own, is said after the number (*gate 0.70 · claude*), never the engine's own shape rung, and never a name someone gave (H1.10). A reading a hand proposes is held on the tab and attributed, and **the field's *what this is* row shows it with its author** (*gate 0.70 · claude*, `hand` H1.10b; F1): a hand is a tier 0 voice, so the row asks `isHeardReading` (by who said it) and not the tier, and the rung's own readings stay the engine's (`isShapeRungReading`).

**A picture in a room, and the agent's hand on it** (PLAN-IPAD-NOTES A1, 1 Oct 2026;
`Demos/relay-protocol.mjs`, `relay.mjs`, `cloudflare/relay/src/worker.mjs`,
`Demos/relay-assets.conformance.mjs`, `Demos/live-node.mjs`' `roomAssets`, `canvas_import` and
`canvas_see` in `Demos/mcp.mjs`, `Demos/ink-png.mjs`' `decodePNG`, the tab's side in
`17-folder.js`' relay transport and `17-assets.js`/`18-images.js`; `node e2e/run.mjs hand`, H1.22–25).
A room carries LOG LINES, and an `import` event names a picture's bytes by their SHA-256 and carries
none — so before this, another hand in a room drew only a plate with the picture's name, and an agent
could neither put a picture on the board nor see one. **The relay keeps the bytes, by their hash, per
room** — `PUT|GET|HEAD /rooms/<room>/assets/<sha256>`, under the room's own key like its lines
(`Authorization: Bearer`; a tab sends the same header, never `?key=` in an asset address). The rules
are **one file's** (`relay-protocol.mjs`, read by both servers; their cases are one file too,
`relay-assets.conformance.mjs`, run against the Node relay and the Worker): the hash is **verified on
arrival** (the bytes are the ones the address names, or nothing is kept — 422), the bytes must be **a
picture by their own header** (`sniffImage`: PNG, JPEG, WebP or GIF, the size read by hand, no image
library; the type served is the bytes', never the sender's — 415), **up to 12 MB** (`MAX_ASSET_BYTES`,
413 — what is over it is read, up to four times the cap, and kept nowhere, so a sender still sending hears the
sentence) and a room's pictures are **capped**
(`MM_RELAY_ASSET_BYTES`, 64 MiB by default, and at most `MAX_ROOM_ASSETS` pictures whatever their size; past
either a put is refused in a sentence — 507 — and no picture is ever dropped, because an event may still name it).
Every refusal is a status and a sentence (`assetCheck`); a get is `private, max-age=31536000, immutable` with
`nosniff` and a sandboxing `content-security-policy`. **Where it is kept**: the Node relay in memory, or as files
under `MM_RELAY_ASSET_DIR` a restart finds again; the Worker **in the Durable Object's own storage**, in 96 KiB pieces
with the record written last — not R2, which is a second product to enable (it asks for a payment method even on its
free tier), a second binding and a second place a room's data could outlive the room. **The tab** puts a picture on
the relay before it names it: its relay transport's `send` holds a line that names a picture this tab kept until the
bytes are there (a HEAD first, a PUT, three at a time) — or eight seconds, so a slow link never wedges the room — and
says a refusal that will not change once in the status line, in the relay's own words (`roomAssetWords`); a line
handed on for another hand is left to its writer. It **fetches** the bytes of an `import` it holds none of when the
picture is first drawn (`roomAssetFetch`, called by `decodeAsset`): by hash, verified against it, kept in `mm-assets`,
and a picture the room did not hold yet is asked for again, later each time (`roomAssetRetryMs`), then left as the
plate it was. A folder, or a room between tabs (a BroadcastChannel, where the asset store is shared already): nothing
changes — `folder.roomAssets` is null. **The hand**: `canvas_import { path | url | base64, name?, at? | place? }` puts
a PNG, JPEG or WebP on the board as the hand's own act — the size read from the header, the bytes PUT to the room's
relay by hash first (skipped when it holds them), then the `import` event in its log; `at {x, y, w?, h?}` fits the
picture in its own proportions, `place` is `canvas_write`'s, neither puts it beside what is on the board; an SVG
becomes an `svg` artifact holding its text and never touches the relay; every refusal (not a picture whatever the file
is called, a GIF, past 12 MB — said before anything is sent, an unreadable path or address, a room that would not take
it) is a sentence and places nothing. `canvas_see` draws the board's pictures **under the ink** where the room holds
their bytes: a PNG decoded in (`decodePNG`: zlib, the five filters, every colour type and depth; null for interlaced),
a JPEG or WebP — which would take a decoder this repository does not carry — as a frame in the composite **and the
picture itself as an image of its own after it, the bytes as they are with their mime**, so the caller really sees it
(a tab's photo is a JPEG or a WebP). `canvas_look` says a picture is *in the room — canvas_see draws it*, and one
whose bytes nobody put there still says this hand has none to see. EXIF orientation is not read for a picture the hand
imports (the tab turns a photo as it keeps it).

**The hand organises notes** (PLAN-IPAD-NOTES A2, 1 Oct 2026; `canvas_find`, `canvas_region`, `canvas_move` and
`canvas_look`'s outline in `Demos/mcp.mjs`, core's `session/hand-moves.ts` (`handMoves`),
`Demos/surface/24-relay.js`; `node e2e/run.mjs hand`, H1.26–28, and `Demos/mcp-smoke.mjs`). John organises hand notes
on an iPad, and an agent beside him should be able to help the way he does: find, put a place round things, put things
in place. **`canvas_find { query, limit? }`** asks core's search (`searchEntriesOf`, `searchBoards`, `describeHit` —
the same Find a tab runs) of the room's board, the hand's one board: every word typed, a half-typed word finding as
it does there, each hit with the id that holds it, what it stands on and where it stands. **`canvas_region { name,
around | bounds }`** makes a region (`makeRegion`, the field's own act — a rectangle among the marks that holds the rest
is the frame, else the box round them with a margin — or `session.region` at a box), and says what it holds; with `id`
it renames (only a region it made). **`canvas_move { ids, dx, dy | to | into }`** moves in one event anything on the board that is there.

*The ruling — John's, 2 Oct 2026 (A2b)* (asked: may Claude's hand move John's marks? *"ya claude can move marks"*).
**A hand may move anything on the board — another hand's marks, John's included — and a region it made, including one that
carries his marks; it still makes a region round anyone's marks; but it labels only its own ink and renames only a region it
made.** Moving is the only rule John changed; labelling and renaming keep the L2b/L2i rule (a label is about whose ink it is;
nothing in the docs ties renaming to moving). A2 (1 Oct) had ruled the other way — a hand moves only what it made — for the
reason that decides what has to replace it: **undo is per hand** (L2j), so a person's own undo cannot take back another
hand's move of their marks. **A2b did not touch undo.** What stands in the refusal's place is honesty and a way back:
**the hand says whose marks it moved** (`movedSaid`: *moved 3 marks — 2 of john’s by 40,30: …*, *— with what the region
holds* for a region), **the tab says it too** (below), and **the way back is not undo**: John moves them back himself, or
asks Claude, which moves them back with the opposite `dx, dy` (the MCP hand has no undo tool of its own, and its session's
undo would reach only its own log). `handMoves(board, ids)` is the rule as a pure function and still its one home: each id
stands on its own, what is on the board is allowed and what is not is *missing* (the only refusal left), and `moved` is every
thing the move moves — the ids named, a region's contents (`regionCarries`), an artifact's marks (`manipulableOf`) — each
once, for saying whose. **It is the hand's door's rule, not the board's:** the board applies a `move` from anyone, as it
always has, and a log carrying another hand's move is not dropped on replay the way another's label is. Connectors tied to a
moved mark follow it (E2), derived — including a person's arrow tied to a mark the hand moved; that follow is not counted as
a move of the person's marks.

**What John sees when Claude moves his marks** (`otherHandMoves` in core, `tellOtherMoves` in `17-folder.js`'s `mergeLive`;
`hand` H1.28). The marks move on his board — before A2b that was all, with nothing said — and **the status line says it,
once, attributed**: *claude moved 2 of your marks — your undo does not reach another hand’s move: move them back yourself, or
ask Claude* (a merge's moves summed per hand; the hand's own marks are not counted, and a move of marks that are somebody
else's says nothing to him). A merge that begins the board again — the tab's first sync after a join or reload, a load, his own
undo — says nothing of moves the room already held; their keys are kept so a later replay does not say them either. The
hand's own `canvas_look` does not mark a move of another's marks; it said whose in its reply to the move.

**`canvas_look` for notes.** The regions are listed in **the outline's reading order** (`regionOutline`: top to
bottom, left to right, a region under the smaller one that holds it — *inside “Monday”*), each with what it holds, then
a line saying how many things stand in no region; **each mark says the region it stands in** (the smallest that holds
it); and **handwriting is listed a line at a time in reading order** (`writingLinesIn`, the line `Read the board`
reads) — `writing · <ids> · reads “…” · at x,y w×h · in “Monday”`, or *unread — canvas_see these marks, then
canvas_transcribe each*, a line partly read said *(2 of 3 marks read)*. Derived each look, nothing logged.

**"With Claude" on dyna.ink** (`24-relay.js`, pure, `node --test Demos/surface/24-relay.test.mjs`): the share pane's
*with Claude* defaults to `https://relay.dyna.ink` when the page's hostname is `dyna.ink` or ends `.dyna.ink`
(`claudeRelayFor`; `notdyna.ink` and `dyna.ink.evil.com` are not), and to `http://127.0.0.1:8020` everywhere else; a
relay typed in the pane wins. The room's key is the one the page was opened with — after `#key=` in its address, an old `?key=` moved
there (`roomKeyFor` in `24-room.js`) — and is never
held, read or said by the fragment. **A hosted relay would have refused the seat** — `whyNoSeat` accepted only a relay
on this machine — so the product's own relay, exactly `https://relay.dyna.ink` and nothing a key or a login is in,
is accepted too (`ownRelay`); the seat's locality is then `hosted`, as `providerLocality` says, and any other relay
on another machine is refused as before. **John's decision, 2 Oct 2026: *"accept the hosted"*** — the briefs a seat parks are log lines of the room the
relay already carries, so this sends nothing the room did not.

## The shard's hand, and the model seat (SHARD-3D-PUSH-2 G5)

> `dynaink-3d/mcp.mjs` (the server), `dynaink-3d/src/room.ts` (the transport and
> the parked brief), `src/models.ts` (`joinHand`), `dynaink-3d/mcp-smoke.mjs`
> (the stdio test, in CI), `.mcp.json` (`dynaink-3d`).

The shard joins a live room exactly as the canvas does — nothing in the engine
changes, because the shard's log IS a core session. The same process is both
halves: **a hand** in the room (`space_look`, `space_draw`, `space_propose`,
`space_say`) and **the model seat** (`space_pending`, `space_answer`). John
types a brief in his tab; Claude Code, in a conversation, reads it and answers
in the proposal contract; the shard applies that answer exactly as it applies a
small model's. The contract gets argued about first hand before anything is
tuned against it.

**A brief is a log event, not a side channel** — an answer on the explanation
plane, where this engine has always put questions (`session.answer`). It changes
no mark and writes no version; it replays, undoes and exports; and `LiveStore`
already carries log lines, so the relay learns nothing. **The pairing is the
brief's own node id** (DIRECTOR-PLAN-W2 L2a): every hand names its log as it
joins (`joinRoom` says `setLogName(me)`, one sitting; `mcp.mjs` and `otherHand`
open their sessions named), so the id the tab gets back from `session.answer`
is the id every hand derives for the brief. A brief is an answer whose question
is `brief`; its reply is an answer whose question IS that id, about the ids the
brief node's own `about` edges name — the same ids in both sessions. Nothing is
minted. The old `brief:<key>` / `answer:<key>` spelling is only read, by
`legacySeatTraffic`, tested against a log the old pairing wrote
(`dynaink-3d/fixtures/seat-before-ids.mm.log`).

**A hull seen from one standpoint asks how deep** (L2c, `dynaink-3d/src/depth.ts`).
A plan and one other standpoint whose silhouette covers less than four fifths
of the plan across the view: along that sightline only the plan bounds the
hull, so the act that stands it also puts one question on the explanation
plane — `session.answer`, question `how deep?`, the engine's, about the hull —
naming the axis and carrying the depth it took (the plan's reach behind the
silhouette) and *as deep as it is wide*, each with its number and reason.
Whether it still stands is derived from the hull step on every read: a view
from another standpoint closes it by measuring, a word (*3 deep*, typed at the
hull) by saying — held as `HullStep.depth`, which `solid.ts` cuts the body to
— and undo reopens either. No new event type; the question is not ink.

**The seat is a model, and that is the whole of it.** A seat carries an
injectable `transport` (the `bridge.ts` pattern, which is also what the e2e's
stub is); the hand's parks the question instead of posting it and returns the
same `CompletionResult`. So the prompts, the parsing, the dropped-and-counted
rule, the work indicator and Esc are all unchanged, and `runBrief` has no case
for it. **The hand takes the front seat** — `first()` is who a brief goes to,
and sitting down in it is a deliberate act that says *ask me*.

Two things real use found at once: `space_look` must read every node carrying
ink and a plane, not `contentIds` — a mark a solid was made from leaves the
content plane, so a board with a box standing on two marks reported *0 marks*;
and a step's provenance is its `from` (stroke ids), because `profile` on a step
the engine built is the resolved outline and printed as `[object Object]`. A
third: **the `?live=` boot block must run at the END of `main.ts`**, with the
demo — up beside `createModels` it runs during module evaluation, where
`report()` reads chrome declared further down, so it threw into a promise nobody
awaited and the seat silently never took while the room joined fine.

## The canvas's seat: Claude Code as the model (V1-PLAN J4)

> `core/src/participants/seat.ts` (the seat, the brief, the plane
> read for both sides), `Demos/surface/24-seat.js` (the pane, *with Claude*),
> `canvas_pending` and `canvas_answer` in `Demos/mcp.mjs`,
> `Demos/seat-watch.mjs` (the watcher), `e2e/seat.mjs` (the gate's `seat`
> scenario), and the seat's cases in `Demos/mcp-smoke.mjs`.

John asked whether *Read the writing* and *What is this?* could come straight
back to the Claude Code session he is talking to, over MCP, instead of going
out to an HTTP endpoint. The shard answered that for 3D (above); this is the
canvas's answer, in core so the page, the hand, the watcher and the tests read
one definition of it. **The seat is a model, and that is the whole of it**
(`createSeatParticipant`): an agent participant with an injected transport, so
the same prompts, the same parsers and the same `propose` channel — held,
attributed, never blessed. The transport **parks** the question in the live
room as a brief: an answer on the explanation plane whose question is `brief`,
about the marks the call names, carrying what was asked in one line (*what is
this*, *read the writing*, *ask: …*, *build: …*), the contract (the system
message, verbatim) and the question (the user message; a picture is said to be
there and never put in the log — the hand draws the ink of the brief's marks).
**The pairing is the brief node's own id** (L2a): the reply is an answer whose
question IS that id, about the ids the brief's own `about` edges name. Every
hand derives the same id, and the hand that answers — another sitting — names
nothing it did not read off the brief. A reply settles its caller the moment
the session holds it, a merged line included; a refusal (`{"refuse": …}`) is
said, *claude would not: …*; a brief given up on — Esc, *withdraw* in the pane,
ten minutes unanswered (`SEAT_WAIT_MS`) — is taken back, undone while it is
still this hand's last act and erased after, so no hand answers a question
nobody waits on; one undone by the hand, or on a board left, settles with the
reason. `seatBriefs` and `pendingBriefs` read the plane for the page, the hand
and the watcher alike, and `isSeatTraffic` is what a surface leaves off its
cards and its minimap: the brief is a model at work, shown working beside its
marks, and the reply becomes the readings, the transcript or the answer card.
Nothing is sent to any host but the room's relay, and the seat holds no key.

**On the page** (`24-seat.js`) the models pane leads with *Claude Code* (under *more — bring your own model*
where dyna.ink's own writer or reader is seated). In a
room where a hand that answers at the seat is heard — within the minute, by
the store's presence: `LiveStoreOptions.seat` puts a flag on every line such a
hand writes about itself, never on a copy it hands on, and `LiveStore.here()`
is the beat a quiet hand sends — it is *Claude Code — in this room*, one tap.
With no room, a room between tabs, or a relay on another machine, one sentence
says what to do instead. The share pane's *with Claude* (under *more ways in*) is the room and the seat
in one act — room `claude` through the relay typed there, else `:8020` — and
says *Claude is here and will read for you*; when Claude's hand is not there
yet it says so, and takes the seat the moment the hand is heard. Seated, it
joins through `join` like any model (`join(config, pick, made)`), stands at the
front of `agents`, and is the reader while seated (`readers`, 06); a brief is
sent the moment it is parked, and Esc reaches it. The door moved under
*advanced*.

**The hand** (`Demos/mcp.mjs`): `canvas_pending` lists the briefs waiting —
each with its key, what was asked, the marks with their ids, the contract, the
brief, how to answer, and for a read the ink as a PNG, drawn as `canvas_see`
draws it; `canvas_answer {key, reply}` — the contract's JSON, an array or an
object, or prose for a question — or `{key, refuse}` answers one, by the key
exactly as printed. The reply is checked first with the parser the page will
read it with (`parseReadings`, `parseTranscripts`, `parseFill` …), and one the
page could not read is said and never sent. `canvas_look` says each waiting
brief in a line and never prints its prompt.

**Straight back to this session.** An MCP server cannot speak first: a session
learns a brief is waiting only when it asks. So `node Demos/seat-watch.mjs`
(room `claude`, relay `http://127.0.0.1:8020`; `MM_ROOM`/`MM_RELAY` or
`--room`/`--relay`) is a silent reader — no hello, no log, no presence — that
prints one line per brief parked, and nothing else — `brief <key> · what is
this · about … · from john · room claude — canvas_pending reads it,
canvas_answer answers it`. To take the seat from a Claude Code session:

1. The session's `dynaink` MCP server must be the `Demos/mcp.mjs` that has
   `canvas_pending` and `canvas_answer`. A server's tools are read when it
   starts, so after pulling this, restart it — `/mcp` → `dynaink` →
   reconnect, or a new session. Its tools are `mcp__dynaink__canvas_*` (and the
   3D hand's `mcp__dynaink-3d__space_*`); a session begun before the rename
   (RENAME-PLAN N3d) holds them under the old server names until it reconnects. Until then, run `mcp.mjs` from the shell as
   *The MCP hand* says (its stdin a `tail -f` on a command file): the same fourteen
   tools, and the page sees that process as the seat's hand.
2. Put the watcher under the Monitor tool: `node Demos/seat-watch.mjs`. Each
   line it prints is a brief waiting — the session is woken by it.
3. On each line: `canvas_pending`, then `canvas_answer` in the contract it
   printed (What is this?: `[{"label","confidence","reasoning"}]`; Read the
   writing: `[{"text","confidence"}]`; a question: prose). Or refuse.

John, meanwhile: the canvas at `?live=claude&relay=http://127.0.0.1:8020` (or
the share tile → *more ways in* → *with Claude*), and *Claude Code — in this room* in the models
pane. The gate's `seat` scenario drives all of it with no model: a relay of its
own on a free port — never `:8020`, where a room of John's may be; a request
there is refused and counted — `mcp.mjs` as the answerer over stdio, and the
watcher beside it.
