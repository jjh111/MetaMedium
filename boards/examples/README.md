# Example boards

A first-time hand opens these from the app's **boards** pane, under *Examples* —
or, on an empty board, with the panel's *start from an example* (the molecule).
Opening one makes a **new board of your own** from it, named for it
(*Flowchart example*, then *Flowchart example 2*): a copy, so you can draw on it
at once, and the example itself is never written.

| File | What it shows |
|---|---|
| `flowchart.jsonl` | boxes and arrows read as a flowchart (D1), with the Mermaid the engine says of it standing beside it (D2) |
| `class-diagram.jsonl` | three classes, a composition and an association, read as a UML class diagram (D4) |
| `molecule.jsonl` | the Basics pack in use (`basics@1`): two molecules and a lone bubble, matched by the pack with nothing taught (B3) |
| `pattern-page.jsonl` | a right triangle with 24 and 8 on its legs, whose long side the maths says, and a page of steps that check themselves (M5) |
| `index.json` | what the pane lists — name, what it shows, file, marks — and the starter |

Each file is a **log**, one event per line, as the app's *export* writes it and
*from a file…* opens it.

## They are made, never drawn

`node scripts/examples.mjs` writes them from the engine — the committed Node
bundle the MCP hand runs (`Demos/metamedium-core.node.mjs`): a Mermaid text drawn
with `drawMermaid`, shapes from `strokeFor` given a seeded tremor (`handLike`),
a pack taken by `use`, texts as the surface's `typeText` writes them. The clock
and the seeds are fixed, so the same engine makes the same bytes.

So an example shows what the engine reads **today**. When a change to the engine
changes what one of these reads as, the committed file is no longer what the
script makes, and CI (`node scripts/examples.mjs --check`, the `core` job) says
which. The remedy is to run the script and commit the result. The Node test
(`node --test scripts/examples.test.mjs`) replays each file and asks the engine
what it makes of it: the flowchart reads as a flowchart, the molecule is matched
by the pack, the pattern page says 25.30″.

To add one: write its function in `scripts/examples.mjs`, list it in `EXAMPLES`,
name its file in `Demos/sw.js`' `EXTRA` (so it opens offline — the test checks),
run the script and `node scripts/build-app.mjs`.

Notes on a board are written without digits or colons: a number written near a
drawing is a measurement to the maths, and a line that reads as a step is
checked — a note must not be either.
