# Rooms: live logs, hands and people, undo per hand, labels

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Live logs: multiplayer as a transport (v9 S6)

> `core/src/store/live.ts` (`LiveStore`, `LocalHub`),
> `session/hands.ts` (`sittingName`, `handLabel`), `store/merge.ts`
> (`mergeLogs(logs, { me })`), `store/livemerge.ts` (`LiveMerge`, R4d),
> `Demos/surface/17-folder.js` (`openLive`, `mergeLive`), `Demos/relay.mjs`,
> `dynaink-3d/src/room.ts`.

Nothing in the engine changes: a second person on the canvas is a second
log arriving live instead of after a pull. `LiveStore` is a `Store` with
`watch: true` whose transport carries lines — a participant's appended
events — between hands: a `BroadcastChannel` between tabs on one machine
(`?live=<room>`, or the *share* tile), or a relay between machines
(`?live=<room>&relay=http://host:8020`; `node Demos/relay.mjs` is a page
of Server-Sent Events in and POST out, with no truth of its own). **Across the internet the relay is a Worker** (CF1, `cloudflare/relay`; `cloudflare/README.md`): the same protocol over https (`Demos/relay-protocol.mjs` is the one definition of it), a Durable Object a room, and **a key per room** — the HMAC of the room's name under a secret only the relay holds, sent by a Node hand as `Authorization: Bearer` (`MM_RELAY_KEY`, or `--key`, on `Demos/mcp.mjs` and `seat-watch.mjs`; `live-node.mjs`' `relayTransport(url, room, { key })`) and by a tab the same way, its stream read with `fetch` (an `EventSource`, with `?key=` in its address, only where `fetch` cannot stream; the page's own address holds the key after `#` — `17-folder.js`, *Rooms anyone can open*), never in the log, the board, an export, a cache (`sw.js` keeps no request with a key in its address), another board's address (`boardSearch`) or the base a program's frame reads (`pinBase`, *Living artifacts*). A relay that refuses a hand says so once as `{ relay: 'refused', status }`, which `LiveStore.refusal()` turns into a sentence in every hand's `notices()` — *the relay does not take this key for this room* — and the hand stops asking; `mcp.mjs` and `seat-watch.mjs` ask the relay once at start (`checkRelay`) and exit 1 with the reason. **A room also keeps the bytes of its pictures** (A1: `PUT|GET|HEAD /rooms/<room>/assets/<sha256>` under the same key, kept per room by their hash; *A picture in a room*, under *The MCP hand*) — the lines stay the only log, and an `import` still names a picture and carries none. A
newcomer says hello and is answered **once per log** (V1-PLAN R4d): every
hand answers for its own log, at once; a copy of another hand's — marked
`via` the hand that holds it — goes only when its writer cannot answer:
at once when it said goodbye (`LiveStore.close()` sends a `bye`), after
`COVER_WAIT_MS` (1.5 s) when it stayed silent, and only from the first of
the hands holding one, by name, `COVER_STAGGER_MS` apart, each skipping a
log its writer or another hand has answered for since the hello. So
history is caught up the way a pull would, even for a hand that has left
the room, and a room of six sends the newcomer each log once, not five
times; presence is the sender's, never the absent writer's. **Whose
hand:** `mergeLogs(logs, { me })` stamps every event from another log with
`by: <log name>`, and the session attributes such an event to a
participant of that name — made on first sight, id
`participant:hand:<name>`, no join event anyone had to write — so another
hand's ink draws in its own colour (a hue from the name) and is never
yours. The merge runs as each line lands (on a microtask — a hidden tab
throttles timers), my unsent events kept. Presence is who was heard in the
last minute, in the status line.

**A room merges a line, not the board** (V1-PLAN R4d; `LiveMerge`,
`Session.rebase`). The merge stands between lines — every log's events in
`mergeLogs`' order, one event per authorship, the reader's own copy
standing — and a line's events find their places in it: when they fall
after everything the board holds they are **applied**, as a stroke is, with
no replay; when one falls before events already applied the board goes back
to the nearest checkpoint at or before it and replays from there, never from
zero. `rebase` leaves a checkpoint where it ended, and a checkpoint keeps the
index as it stood (where the marks are, what is within reach of what, the
components and what they match — the last four do), so the commonest such
line, one crossing a mark this hand drew a moment before, goes back a few
events. It does not replace the board — `generation` stands, so a model's
answer about a mark still lands after another hand's line — unless the
stretch replayed holds an event with no authorship, whose counter ids may
now name other marks. The store tells a reader when to merge
(`revision()`, which moves only when a log another hand wrote changes, read
through `heldLogs()`, the arrays as held): **a line that changes no log — a
hello, a goodbye, the relay's word, a whole log already held — does no
work**, no merge, no replay, no paint. Between lines the board holds this
hand's marks where they were drawn, and the next line that changes a log
puts them in the merge's order. A room's log is `store.ownLog(events)` —
what was sent less what the session no longer holds, then what it never
sent, in the order written — found by identity and authorship, with no
event serialised. On the 2,000-mark board a line costs 1.65 ms (it was
0.3 s after R4b, 3 minutes before); `PERF.md` has the rest. **The full merge
is the oracle**: `src/store/room.oracle.test.ts` generates rooms — clocks
seconds apart, lines interleaved and heard again, undos, leavers, newcomers
with unnamed marks, hands renamed — and holds the path to `mergeLogs` and a
replay from zero after every merge, and to a reference that merges the whole
log whenever one changed; `MM_ROOM_SEEDS=500` for a deep run. The canvas, the
MCP hand and the oracle's reference share the path; the shard still merges
its (small) room whole on every notify.

**A log name is reused only when its whole history was loaded first**
(`session/hands.ts`; DIRECTOR-PLAN-W2 L1). Every id an event mints comes
from its log's name and its number there, so this rule is what keeps a
number from being issued twice. A folder's history is its file, loaded
before anything is minted, so a folder board keeps one name (the device's,
`mm-participant`); a board in browser storage restores its whole log
first. A live hand has no history to load — a tab keeps no log of its own
in a room and never hears its own lines back — so **a live hand's log is
one sitting**: a tab's page load, an MCP process. `sittingName(person,
suffix)` mints `john~a1b2` once per sitting, and nothing keeps the suffix
where a reload would find it; the name shown, and the colour, come from
`handLabel` — the name without its suffix — so a reload is a new log and
the same hand (*john*, in john's hue). Within a sitting the session's
high-water mark (`session.ts`) only rises: an undo, a merge that no longer
carries a dropped event, and `load([])` never lower it. A tab opened on
`?live=` does not restore the device's board into the room, since every
reload would carry it in again under a new name; *Share this board* brings
the board you are on, and joining by a link or a room's name never does (*Rooms anyone can open*).

**A person is the same person across sittings** (V1-PLAN L2i; `personOf`,
`samePerson` and `Session.isMine` in `session.ts`, `session/label.test.ts`,
e2e 47). A sitting is still a participant of its own
(`participant:hand:<log name>`), so what a person drew before a reload is
the earlier sitting's, as the panel and the card say. But **the rules that
ask "is this mine?" compare the person** — the log name without its
sitting's suffix (`handLabel`) — so every sitting of one person may label
that person's marks, on every board: the reloaded tab labels what it drew
before the reload, the earlier tab (still open) what the later one drew, a
restarted MCP hand its own circle. Another person's marks are refused as
before, with the reason. Before this, the rule compared the exact log name,
and after a reload core told john *that mark was made by john*. This
board's own hand is the person its log is written under (`logName`) — the
same fact every other board reads off that log's name when it merges it —
so every board agrees; a board never told its log's name is no sitting of
anyone and compares hands exactly, as it always did. A model or the engine
is no person and only ever itself. **What stays per sitting:** log names,
ids and numbering (L1 — never reuse a number), gestures (L2h — two tabs of
one person are two hands drawing independently) and a word's run of
letters (L2g); the logs are never merged into one participant, or
numbering could collide. **The trust
model, plainly:** a name is self-asserted — there are no accounts — so
treating one person's name as one person is the same trust the name and
the colour already carry. It is not authentication: anyone who types
*john* is john to the rules, as they already are in name and colour, and
two hands that never gave a name are both *hand*.

**A hand sends its log as it stands** (`LiveStore.publish`): the new tail
as an append when the log only grew, the whole of it as a `full` when it
did not — an undo, a reset — so **an undo reaches every peer**. A store's
first send is whole, so joining the same room again within a sitting
replaces what the room holds of you instead of doubling it. An event
already held by its authorship is held once, and lines leave in the order
they were written (an asynchronous transport's POST is waited for before
the next).

**Undo is per hand** (V1-PLAN L2j; `undo` / `lastAct` in `session.ts`,
`session/undo-hands.test.ts`). The board is every log merged by time, so its
last event is whoever acted last by the clocks, and undo used to drop it —
another hand's as readily as this one's, nothing sent (this hand's log had
not changed), the mark back at the next line. **Undo takes back this hand's
own last act**, wherever the merge put it, and every other hand's event
stays. This hand's events are its own log's — the ones no merge stamped
`by`, whoever they name (a model's reading in its log is its act, as
`handOf` reads it) — and the last is the one it WROTE last, never the last
on the board: the highest `seq` under the name this sitting writes (a
number only rises in a sitting, and a merge that interleaves by time changes
none); with none, the highest under the name of its last named event in the
log; with no names at all, the last of its own in the log — a board of one
hand undoes exactly as it always did, one event at a time, ticks never taken
back. A mark with no authorship has no number, so among those the log's
order stands for the order written. **An act is one dispatched event, or
everything written inside one outermost `withTool`**: those events carry
`act`, one number per act, one past the highest this sitting has seen (it
only rises; provenance like `tool`, which replay ignores), so a tool's act —
two labels, a text and its code, the duplicates — is one undo. **The field a
tool closes before it writes anything** (a `dismiss` or `deselect` first,
L2e's order) is an event of its own, not the act: one undo takes a label's
words off and the field stays closed (e2e 42b). The act is dropped where it
stands, the replay goes back to the nearest checkpoint before its first event
(none taken with it), and `generation` moves only when an event left after it
mints ids off the counter. Nothing else is new: the log shrank, so `publish`
sends it whole, and every other hand's `LiveMerge` cuts the act out. The
shard reads its acts off its own events too (`undo` in `dynaink-3d/src/log.ts`),
and a failed brief's bless is dropped when it is still this hand's last act
(`dropFailedBless`). There is no redo. The room's oracle holds every undo —
the reader's and every other hand's, tool acts among them — to a record of
each hand's writing kept beside it (`Writing` in `src/test/room.ts`), and
follows it to every board that holds the log.

**Two hands under one name are said — to the room and to both of them.**
On a relay, a line under a name another hand claimed is refused outright (409, said; *Rooms anyone can
open*); what follows holds for a hand that sends no secret and for a room between tabs.
Every line carries its store's sitting id (`sid`, never shown); a second
sitting under a name already heard is a collision: what was heard first is
kept and the other's lines are refused. A store checks its OWN name before
discarding any line, so the two hands that share it are told too (a hello
from a hand under my name is still answered, which is how that hand
learns). A line from before sittings is judged by the old rule: a `full`
that diverges from what is held. **A room older than the relay remembers
says so:** the relay keeps `maxLines` lines a room (`startRelay(port, {
maxLines })`, else `MM_RELAY_MAX_LINES`, else 5000) and tells a client
that connects after it forgot some, and the store makes that a sentence.
**A room the relay forgot whole is filled again**: a hand reconnecting with a
`Last-Event-ID` past every id a room holds — a room the Worker forgot after its
idle days, a relay that restarted, ids begun again at 1 — is sent
`{ relay: 'forgotten' }` (`forgottenNotice` in `relay-protocol.mjs`, both
relays) and the room from its beginning, and `LiveStore` answers that word by
sending its own log whole (with a copy of any departed hand's it holds) and
saying hello, as a newcomer would. Residual: a hand whose old id is below the
new room's last id is not told. The truncation and the collision
land in `LiveStore.notices()`, which all three hands say: the
canvas's status line (`folderStatus`), the MCP hand's `canvas_look`, and
the shard's status line (`Room.notices`) and `space_look`.

**One event, applied once** (`mergeLogs`, V1-PLAN L1b). An event's authorship
— `origin` and `seq` — is its identity, and the same stamped event does reach
a reader in two logs: a tab that joins again under another person's name
hands its log on under the new name while the room still holds the old; two
hands that opened one folder carry the same file into one room. Merged as
two, the one mark was applied twice — one node, its id listed twice on the
board. So the merge keeps **one event per `(origin, seq)`**: the first
occurrence in merge order, except that the reader's own log (`me`) always
keeps its own copy (an event of mine dropped there would drop out of what I
send next). Copies compare as written — `by` and key order aside — and an
event with no authorship has no identity and is never folded. **Two
different events under one authorship** are two writers under one name: the
first is kept and `onCollision` is told; a room says it through
`LiveStore.misnumberings()`, one sentence per name, which `notices()`
carries to all three hands, and a folder says it in its own status line.

**"Local" in another hand's log means that hand**: an event stamped `by`
whose `participantId` is the local participant, or none, is attributed to
the hand — its answers, proposals and code arrive in its name, never in
the reader's. **My log is the session's own unstamped events**, sent or
not, never the room's copy of it: a line landing between a send and the
next merge would otherwise count every sent mark twice (found by the MCP
smoke test; e2e 28c2). **A model joined in another hand's log is that
log's participant**: when the hand says its log's name, the model's `join`
mints `participant:<log>:<n>` from that log, so its proposals name the
same participant in every reader however the logs were merged
(`ids.test.ts`). A log written with no name — one from before ids per
hand, or what a shard tab drew before it joined a room (the shard names its
log as it joins, `dynaink-3d/src/room.ts`) — keeps counter ids
(`participant:N`), which a merge can renumber; nothing translates them.

**An artifact is made by whoever blessed it** (V1-PLAN L2f; `applyBless`
and `authorOf` in core, `session/label.test.ts` and `held.test.ts`, e2e 43).
A bless used to write no maker, so every board read an artifact as its own
reader's: the maker's label on her artifact was dropped on every other
hand's replay, and any other hand could label it at its own door. Now a
`bless` gets the attribution a stroke gets — "local" in another hand's log
means that hand — so the label rule holds for things as it does for ink, on
every board; the MCP hand's look says *by tab*; the panel's *by* row reads
`authorOf` for every node. **Not who drew its marks**: a hand may bless a
group several hands drew — the thing is the blesser's, and each mark stays
its drawer's, drawn inside it in its drawer's colour (`inkOf`'s `byMaker`;
a live page's gold is the one colour laid over all of them). **A bless is a
person's act**: one in the engine's name — the shard stands a hull at tier
1 inside its hand's act — is the hand's whose log holds it, and the engine
keeps its name on the word. The `made-by` edge is written only for a maker
other than the board's own hand, which `authorOf` reads from no edge at
all, so a board's own blesses — every held log — replay node for node.

**A word is made by whoever wrote its letters** (V1-PLAN L2g;
`absorbIntoWord` in core, `session/label.test.ts`, e2e 44). The gathering
wrote every word `made-by` the local participant, whoever wrote its
letters, so on another hand's board her word read as the reader's: her
label on it was dropped on every replay but her own, and that board could
label it — while its letters were hers. Now a word names the maker its
letters already carry, so the label rule holds for words as for ink, and
the MCP hand's look says *by tab*. **A word is one hand's run**: the merge
interleaves the hands' events by time, so the mark just before her next
letter on the board may be his — taken for the last letter of her run, it
joined her word (his letter printed beside hers) or broke it in two (his
mark set between two of hers). The run is read over the marks the new
stroke's maker made, so her letters gather into her word whoever drew in
between, and the letters of two hands — or of a hand and a model — never
gather into one. A board's own words name its own hand as they always did,
so every held log replays node for node.

**Gestures are per hand** (V1-PLAN L2h; under *Gestures*, e2e 45–46). The
gesture state was one for the board while the merge interleaves the hands'
events by time: another hand's stroke landing between a hand's summon and
its bless dissolved the summon at the next merge, and the bless made
nothing on any board — the blesser's own included, once her live board
merged the room; set between a loop and its check, the loop was left
untaken and the check read backwards, holding the loop's own ink; and one
hand's loop and check opened every other board's field. Now each hand's
gestures are keyed as authorship is, so the same hand keys alike from its
own board (the local participant) and from every other
(`participant:hand:<name>`). **A folder opened with no reader** stamps no
`by`, so every log in it is the reader's own there — one hand's gestures,
as its authorship already was.

**Rooms anyone can open** (the multiuser milestone, 23 Oct 2026; `cloudflare/relay/src/mint.mjs`,
`Demos/relay-protocol.mjs`, `core/src/store/live.ts`, `Demos/surface/24-room.js` and `24-relay.js`; e2e `room`).
**Sharing is one tap**: *Share this board* asks the relay for a room (`POST /rooms`: a name of `r-` and 128 random
bits, never one a person chose, and that room's key, which the relay keeps nowhere), joins it and carries the board
on screen in — the marks other hands made on it go in as copies this hand holds and hands on (`LiveStore.carry`),
still theirs; a board over `CARRY_MAX_CHARS` is said before anything is sent. *Copy invite link* hands on
`?live=<room>` with **the key after `#key=`** (`inviteLink`), which no browser sends to a server; a guest who came by
an invite with no name kept is asked one; joining by a link, a room's name or a pasted invite never carries the
guest's board in (*with Claude* still does, since the seat is there to read it). The bar shows the room and a dot per
hand heard in the last minute — each hand says it is here every `ROOM_BEAT_MS` on a line the relays pass on and never
store, and presence is never read from a replay, which the relays mark; **a beat moves no clock** (`applied`, `ownAt`
in `live.ts` move only for a line that carries events or a whole log), because a beat that passed a slow whole of its
writer's on the way, stamped after it, made every peer drop that whole as older, for good — and *Save a copy to my
boards* keeps the room's board as one of this browser's. **Who opens, and who writes**: anyone on the app's origins
may open a room, an address so many an hour and a share of the relay's day, the relay so many a day
(`MM_RELAY_MINT_PER_HOUR`, 10; a `MINT_SHARE`-th, a twentieth, of `MM_RELAY_MINT_PER_DAY`, 500; counted in
`src/limits.mjs` in one hit, all or none, so a refused request writes no row; `MM_RELAY_MINT=0` opens none). In every
room **a name is claimed by the hand that first writes under it** (`x-dyna-hand`, a secret of its sitting, kept as a
hash; `live-node.mjs` sends one for a Node hand), and a line under a name another hand claimed is refused (409,
said); what a copy may change is the store's to judge — **a copy handed on may only add** to what is held
(`accountsFor`). The Worker's **floodgate** holds a hand, an address and the room to so many lines and UTF-8 bytes
(`FLOOD`, `FLOOD_ADDRESS`, `FLOOD_ROOM`; 429), a room keeps at most `MAX_CLAIMS` names and `MAX_ROOM_ASSETS`
pictures, and before it lets go of history to stay under its caps (`MM_RELAY_MAX_LINES`, and `MM_RELAY_MAX_BYTES` in
UTF-8 bytes) it lets go of what replay would never send (`compact`: a hand's newest whole log stands for its own lines
before it). **What is kept is counted across rooms, in what it costs** (`cloudflare/relay/src/store.mjs`), because a
bound per room is none when anyone may open rooms: an item — a line or a picture — costs its UTF-8 bytes and
`ROW_COST` (4 KiB) for every storage row it is kept in (a line's record, its pieces, the room's meta row and a name it
claims; a picture's record, its pieces and the meta row), so a row is never free however small the item, and holds
its bytes and `ROW_HELD` a row. What one address keeps a day in every room is `MM_RELAY_STORE_PER_DAY` (unset, a
`STORE_SHARE`-th of the rooms' day: 64 MiB at the defaults; 429 with `retry-after`), drawn by a room `STORE_GRANT` at
a time with what it has not used kept in its meta row; what every room the relay opened holds at once is a gauge in
the `Limits` object's `minted` scope that its alarm never clears (`MM_RELAY_MINTED_HELD`, 2 GiB: past it such a room
keeps nothing more, 507, and `POST /rooms` answers 503, *opens no new room until older ones are let go of*), reserved
`MINTED_QUANTUM` at a time — each quantum charged to the reserving caller's day, never more than one ahead of what
the room holds — and given back once when the room is forgotten; and what they keep in a day together
(`MM_RELAY_MINTED_PER_DAY`, 2 GiB; 429), since a room at its caps keeps writing as it lets its oldest lines go. A
picture goes through the address's and the room's floodgates as a line does; a beat writes nothing and costs nothing
(a name it claims is held in memory until a kept line of that name writes it down); a model request that will be
refused writes no row (counted in the isolate's memory first, `prefilter` in `limits.mjs`, its body checked, then one
hit all or none); a room named by hand is outside both minted counts; with no `LIMITS` binding nothing is kept (503).
These are an operating ceiling set below a plan's limits, not a bill (`cloudflare/README.md`, *Costs*, which says
what they come to in rows written a day and what to lower on the free plan). **Every limit counts an IPv6 caller by
its /64** (`callerKey`, `callerOf` in `src/http.mjs`, one home): minting, a room's floodgates and new names, the store
count and the model routes — **and minting, the store count and the model routes by the /56 that holds it too**, at
`NET56_TIMES` an address's allowance (`callerBuckets`), so the 256 /64s of one home are a few callers' worth. **What
the counts do not stop** (`store.mjs`'s header; `cloudflare/README.md`, *Rooms anyone opens from the app*): many
addresses, or the /56s of one /48, are many callers and together can still fill a relay-wide ceiling with real data
until accounts exist; and a day's count bounds a day, not what an address holds over the days its rooms are kept.
**Nothing sent is lost in silence**: a transport says what became of a line (`SendResult`); a hand's own lines go one
at a time and one unanswered for `OWN_WAIT_MS` is sent again; a failed send is tried again from `RETRY_FIRST_MS`,
backing off to `RETRY_MAX_MS`, after a `retry-after` and at once on the browser's `online`; a whole log over
`LINE_CHARS` goes as pieces of one set that a receiver takes only whole; and *Leave* refuses, in words, while what
this hand drew has not reached the room (*Leave anyway* beside it). **Expiry and retention**: a room the Worker opened
is forgotten `MM_RELAY_ROOM_IDLE_DAYS` (30) days after it was last used — a line, a stream opened or a picture put;
its alarm moves at most once a day, so it may go up to a day sooner — when the alarm closes its streams, deletes
everything it holds (lines, pictures, the claims' hashes) and only then gives the gauge back what it reserved, once,
answering 503 in words while it is let go of (`alarm` in `worker.mjs`); a room named by hand (`claude`, a table) never
expires and is bounded by its caps and by what its writers' addresses may keep a day. **Unverified**: only the
Worker's logic in Node and under `wrangler dev --local` has run, never the hosted relay, so the plan's own storage and
rows written a day stand unchecked against the store's ceilings; Chromium only (WebKit's fetch stream, a keepalive
goodbye with a preflight and an iPad's share sheet are untried); and an event forged inside a copy that only adds is
still taken — proving who wrote an event needs signatures, left to the new repository.

## A label: a hand's word on its own ink (V1-PLAN L2b, L2e)

> `session.label` / `session.isMine` / `labelOf` / `labelsOf` in core
> (`session/label.test.ts`); `renderLabels` in `Demos/surface/08-render.js`;
> `canvas_label` in `Demos/mcp.mjs`; the person's door — `readLabel` and
> `typedWord` in `Demos/surface/09-field.js`, `labelMarks`, `labelItem` and
> `whoseInk` in `09-palette.js` (e2e 42, 47).

**Whoever made a mark may put a word on it; nobody else may.** Naming a mark
someone else made is blessing it, the human's act; labelling your own ink is
not (the notes, §B). A `label` event holds the word as a rep on the mark,
attributed; it replays and undoes; an empty word takes it off; another
person's label on my mark is refused at the door (`not-your-ink`) and dropped
on replay. A mark's maker is the hand that drew it; an artifact's is whoever
blessed it, and a word's the hand that wrote its letters, on every board (L2f
and L2g, under *Live logs*). **"Whoever" is the person, not the sitting**
(L2i): a reload is a new hand and the same person, so the marks drawn before
it are still the person's to label — `session.isMine(id)` is the door's
question, and the field asks it too, so the line before Enter and the door
never disagree.
**It is not a bless and not a file** (§D): no `word` rep, no artifact, no
library entry, no card in the grid, never a name the matcher learns.

**On the board it is a caption** — inside the mark when the mark is a closed
form the words fit in (D3, words inside symbols, 29 Sep 2026; `labelInside` in
`08-render.js`: centred, the whole box the words fill inside the clean form the
mark holds or its own closed ink, so a diamond and a circle take fewer words
than a box), else beside it. Beside: the word is drawn above
the top edge, above an artifact's name when that shows — in the ink's own
colour (the maker's, from the same tokens in either theme), at a size in the
board's units: the caption rule of `13-kinds.js`, so it scales with the
drawing it names, never held at screen size (`LABEL_PX` on the screen the mark
was drawn on — its stroke's scale). Who put it there shows only while the hand
points at the mark; erasing the mark takes the label, and undo brings both.

**A person labels from the field** (V1-PLAN L2e). With marks held, `label:
word` is a prefix of the pure reader, and the line says before Enter what the
word will go on — `↵ write “inlet” on it`, *on each of your 3 marks*, *on
yours, not the mark fern made*, or, quietly, *no words written — fern made this
mark*. The row offers it too, as *Write “…” on it* beside the naming offer:
under writing that has been read (the reading that takes the word as the name
stands above it; the label goes on the marks held with the writing, or, with
nothing else held, on the writing itself as a caption), and for a word typed
(`typedWord`: *Name it “…”* and *Write “…” on it*, the pair together where both act and differ; `label:`
and `name:` mark one). Taking it is `labelMarks`: one `label` event per held
mark the person made, each through the session's door, and every mark said in
the status line — labelled, already saying the word, or refused with whose it
is (*not on the mark fern made — a label goes on your own ink*) — never passed
over in silence. The field closes **before** the word is written, as an
event of its own, and the labels are one act (L2j): one undo takes every
label it wrote off and the field stays closed; a mark already saying
the word writes nothing, so a second Enter or a held pill is not a second
event. Naming and labelling one word side by side read as one thing twice,
so the difference is said in words the field already has — each pill's
tooltip says what it does and what it does not (naming makes one thing, a
definition the library keeps, and writes no word on the ink; labelling makes
nothing), and the reading line says what a pill of the pair will do while it
is pointed at or chosen by the arrows — never a badge, a row, or a fifth core
button. No model is asked.

**Every reading says what it is based on** (`Interpretation.basis`: `name`,
`label` or `resemblance`). A label is one named reading among the engine's,
at its maker's tier and weight 1 — so it led every "the tier-0 reading" list
and the panel's shape row read the label. Anything asking what the shape rung
measured asks for a reading that is not a label; the panel shows a `label` row
beside the shape.
