# The story board — dyna.ink, 28 September 2026

A board that explains the platform in its own medium, drawn by the MCP hand
(Claude) for John to read and answer on. Nine regions in reading order:

0. **read me first** — what dyna.ink is, the colours, how to comment, a map of the board
1. **architecture** — surfaces, doors, the engine (the log → READ → DO → ASK), quality
2. **a stroke's life** — a sequence diagram drawn in *ink*, read back by the engine
   (*a sequence diagram 0.55 — five participants, six calls*) with the Mermaid it wrote
3. **the plan** — V1-PLAN.md's 59 units by phase: done, in the engine only, next
4. **true use** — the ten acceptance scenarios, engine · surface · gate · by hand
5. **numbers** — tests at each landing; the 2,000-mark board before → after
6. **the code** — the engine as a treemap by module, with what this push added
7. **notations, live** — a flowchart and a UML class diagram in ink, each beside
   what the engine read and the Mermaid it wrote
8. **gaps** — thirteen things building this board showed dyna.ink still lacks,
   each with the unit that would close it, and the library it wanted
9. **your turn** — draw or write anywhere; the hand reads it and answers

Every panel is an `svg` figure whose parts are top-level groups, so ink over a
box addresses that box (`kinds/address.ts`). The three diagrams are real ink:
the engine reads them, and the panels beside them quote its output verbatim
(`engine.json`, checked by checksum against the page).

## Open it

In the app, the control centre's **boards** tile → **from a file…** →
`board.jsonl` (one event per line, as *export* writes it). It opens as its own
board; its marks and figures are the hand `claude`'s.

## How it was made (and how to make the next one)

A current MCP hand is run from the shell, fed one JSON-RPC line per call
(`hand.mjs`), in a live room the app joins as a reader:

```bash
node Demos/relay.mjs                                              # if none is running
tail -n +1 -f boards/story/hand.cmd.jsonl | MM_ROOM=dyna MM_NAME=claude node Demos/mcp.mjs > boards/story/hand.out.jsonl
node boards/story/hand.mjs init
node boards/story/gen.mjs                                         # the panels from code.json
node boards/story/build.mjs                                       # panels, then the ink and its labels
# open /app/?live=dyna&relay=http://127.0.0.1:8020, read the notations there into engine.json
node boards/story/gen2.mjs && node boards/story/put.mjs a4p.svg …  # the panels that quote the engine
node boards/story/archive.mjs dyna boards/story/board.jsonl       # keep it
```

`code.json` is the engine's lines per module (tests, fixtures and test helpers
left out) and how many are in files added since 24 September. Generated SVGs
and the hand's command files are not kept (`.gitignore`); `node gen.mjs` makes
the SVGs again.

What this took by hand is itself the list of gaps in region 8: no `mermaid`,
`table` or `chart` kind, no sections, labels only above a mark at the hand's
scale, no comment threads, no named views — the next units to make dyna.ink
the tool this work is done in.
