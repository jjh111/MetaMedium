<dynaink-doors>

# dyna.ink Doors Skill

This skill is the walk: how a dev session takes **every door of dyna.ink first-hand**, on a scratch board, in a
room of its own, so it understands the pipeline by using it and reasons about each format as it actually flows
(V1-SPEC §3.13, CG7; the rule that a unit walks the doors it touches before it starts is §12).

> **Provenance — a walk, not a reference.** Every contract has one home, the code, and `canvas_doors` reads it live
> from the running hand: the shapes the pen draws, each seat's contract verbatim, each format's writer and reader,
> what is and is not built. So this file says *how to walk*, never *what a contract says*. Where a sentence here
> disagrees with `canvas_doors`, `canvas_doors` is right and this file is stale — say so in your report.

---

## The rules of the walk

1. **A scratch room on a relay of your own, on a free port.** Never John's room (`claude`, on a relay at port
   `8020`, which may be running), never his origin, never the `mcp__dynaink__*` tools a session may already have
   loaded — those join *his* room. Run the hand yourself, as below.
2. **Everything you write goes to the scratch room.** Exports go to the OS temp directory (or a folder you name
   outside the repository). Nothing from a walk is ever written into the repository.
3. **The board is synthetic.** John's notebooks, drawings and recordings never enter the repository, a fixture or a
   room you walk (V1-SPEC §12). Draw boxes, arrows, a labelled triangle; use the examples under `boards/examples/`.
4. **Kill what you start**: the relay, the hand, its `tail -f`, any stand-in page. Check with `ps`.
5. **Write down what was unclear.** That is the point of the walk (the last section).

---

## Set up

```bash
# a scratch directory of your own — its path is what makes your processes yours and no one else's
export WALK="${TMPDIR:-/tmp}/dynaink-walk-$$" && mkdir -p "$WALK" && : > "$WALK/cmd.jsonl" && : > "$WALK/out.jsonl"

# a free port — and never 8020
PORT=$(node -e "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")
[ "$PORT" = 8020 ] && echo "that is John's port — pick again"

# a relay of your own, in the background (PORT, MM_RELAY_MAX_LINES and MM_RELAY_ASSET_DIR are its settings)
PORT=$PORT node Demos/relay.mjs & echo $! > "$WALK/relay.pid"

# the hand, from the shell: its stdin is a command file, its stdout a reply file, one JSON-RPC line per call
tail -f "$WALK/cmd.jsonl" | MM_ROOM=walk-mine MM_RELAY=http://127.0.0.1:$PORT MM_NAME=walker \
  node Demos/mcp.mjs > "$WALK/out.jsonl" 2> "$WALK/err.log" &
```

A call is one line appended to the command file; the reply is the line with the same `id` in the reply file. Keep a
tiny helper beside them (not in the repository):

```js
// send.mjs — node send.mjs call canvas_look '{}'   |   node send.mjs tools/list '{}'
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
const dir = process.env.WALK, idf = dir + '/id';
const id = (existsSync(idf) ? +readFileSync(idf, 'utf8') : 0) + 1; writeFileSync(idf, String(id));
let [m, a, b] = process.argv.slice(2), params = a ? JSON.parse(a) : {};
if (m === 'call') { params = { name: a, arguments: b ? JSON.parse(b) : {} }; m = 'tools/call'; }
appendFileSync(dir + '/cmd.jsonl', JSON.stringify({ jsonrpc: '2.0', id, method: m, params }) + '\n');
for (let i = 0; i < 300; i++) {
  const hit = readFileSync(dir + '/out.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((r) => r.id === id);
  if (hit) { for (const c of (hit.result && hit.result.content) || []) console.log(c.type === 'text' ? c.text : '[' + c.type + ']'); if (!hit.result) console.log(JSON.stringify(hit.error)); process.exit(0); }
  await new Promise((r) => setTimeout(r, 100));
}
```

Say hello once — `initialize` (with `{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"walker","version":"0"}}`),
then the line `{"jsonrpc":"2.0","method":"notifications/initialized"}` — and `tools/list`. **A session keeps the tool list it
started with**: after a change that adds a tool, reconnect the server (`/mcp`), or run the hand from the shell as here.

---

## The walk, door by door

Use each door once. For each, read what it says, do it, and read what came back.

1. **`canvas_doors` — read it first.** It lists every way in and out from the running code. Narrow it with
   `{"door":"pen"}` (or `seats`, `mcp`, `room`, `formats`, `gaps`) and `{"seat":"draw"}` for one brief kind. It says what
   Node cannot make (`board.png` and `board.pdf` are the page's) and what is not built yet — do not try to take a door it
   says is not built.
2. **`canvas_look`** — the board in words, with the ids every other tool takes. `{"detail":"full"}` is the brief a model
   is given. **`canvas_see`** — the ink as a PNG (and a picture's pixels under it, where the room holds them).
3. **The pen: `canvas_draw`** — shapes in the vocabulary `canvas_doors` lists, and raw `strokes`. Draw a flowchart: three
   boxes and two arrows. Look again: what did the engine read each mark as, and with what confidence?
4. **Speaking: `canvas_say`** (a sentence beside marks), **`canvas_propose`** (a reading, held, never blessed),
   **`canvas_label`** (a word on *your own* ink — try it on someone else's and read the refusal), **`canvas_transcribe`**
   (what handwriting says).
5. **Writing code: `canvas_write`** — a text, an `svg`, an `html` page, a `run` program (it waits for a person to play it).
   Place it with `place: {under: id}` instead of arithmetic.
6. **Pictures: `canvas_import`** — a PNG, JPEG or WebP (its bytes go to the relay by their SHA-256 first) or an SVG.
7. **Organising: `canvas_find`, `canvas_region`, `canvas_move`.** A hand may move anything and says whose marks it moved; it
   labels only its own ink and renames only a region it made.
8. **The seat, as far as it goes without a page.** With no page in the room, `canvas_pending` says none is parked. To walk
   it, stand a page in: a short script (kept in your scratch directory) that joins the room as a hand with a session and
   seats `MM.createSeatParticipant(session, …, { baseUrl: relay })`, then calls `seat.interpret`, `seat.read`, `seat.ask`,
   `seat.generate`, `seat.program`, `seat.draw` — exactly as `seatCases` in `Demos/mcp-smoke.mjs` does. Each call parks a
   brief in the room. Then, from the hand: **`canvas_pending`** (the key, the contract, the question, the ink as a PNG for a
   read), and **`canvas_answer`** `{key, reply}` in the contract it printed — or `{key, refuse}`. Send a reply the page's
   parser cannot read and read the refusal; send a good one and watch what the stand-in page holds. **What needs a tab**:
   what the page *does* with a reading (the chip, the field, *Name it*), the models pane, press-and-hold, the pen's pressure,
   a picture decoded on a canvas. That half is the gate's (`node e2e/run.mjs hand seat`).
9. **Every format out, and back in.** `canvas_export` with each of `log`, `bundle`, `svg`, `mermaid` and `truesize`:
   - `log` — a header line, then one event a line; it comes back inline (or, if big, in a file the reply names).
   - `bundle` — a zip, always a file: read the path, size and entries it says. Unzip it and look at `board.jsonl`.
   - `svg` — the whole board, then `ids` for one mark; open the file in a browser *outside* John's origin.
   - `mermaid` — draw a flowchart and name its ids; then name a lone box and read what it says.
   - `truesize` — draw a right triangle as three lines with a small square in its corner, and write `24″` and `8″` beside the
     legs (`canvas_write`, kind `text`); then ask for it.

   Then **`canvas_import`** the log and the bundle back: it reads them into a **scratch session** and says so — the board in
   words, the events, marks and pictures, and *whatever reads differently* from the room's board. Check that nothing was
   written to the room (`canvas_look` is as it was). Import `boards/examples/flowchart.jsonl` to see a board you did not make.
   Try a log with a newer version in its header, a log with a broken line, and a bundle with one byte of a picture flipped:
   each should be a sentence and not a crash.
10. **MCP the other ways.** Read what `canvas_doors` says of the 3D hand (`space_*`, in `dynaink-3d/mcp.mjs`: run it in a room
    of its own the same way) and of the canvas's client door (`Demos/mcp-client.mjs`, which bridges a stdio MCP server to the
    page; run it on a free port with `MM_ROOM` and `MM_RELAY` set so the server it spawns joins *your* room).

---

## What to write down

A walk that leaves no notes has taught the next session nothing. In your report, for each door:

- **What it was**: the format or contract as you met it, in a line (a header, an entry name, a reply's shape).
- **What surprised you** — a tool that did less than its description, a refusal with no reason, a sentence that does not say
  what happened, a contract that is told in two places and differs.
- **What was unclear** — anything you had to guess, or read the code to learn.
- **What the spec should say** that it does not.

And say plainly which doors you did **not** walk, and why.

---

## Clean up

```bash
pkill -f "tail -f $WALK/cmd.jsonl"    # the hand's stdin ends, and it shuts itself down
kill "$(cat "$WALK/relay.pid")"       # the relay, by the pid you kept
pgrep -fl "$WALK"                     # nothing of yours should answer; a stand-in page you started: kill it by its pid
rm -rf "$WALK"                        # the scratch directory — and the folders an export made in the OS temp directory
```

Never `pkill` by a name like `mcp.mjs` or `relay.mjs`: other sessions have hands and relays of their own running, John's
among them. Only what carries your scratch path is yours.

---

## Summary

1. **Scratch room, own relay, free port** — never John's room, port or origin.
2. **`canvas_doors` first** — the contracts are read live; this file is only the route.
3. **Use every door once**: pen, seats, MCP, the room, every format out and back in.
4. **Writes go to the scratch room; exports go to the temp directory** — never into the repository.
5. **Write down what was unclear** — it is the output of the walk.

</dynaink-doors>
