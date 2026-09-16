# fixtures — the boards this plan is settled on

John's own boards, so that `SHARD-3D-PUSH-2.md`'s claims are argued about
against a real drawing rather than a synthetic one. Load one at boot:

```
http://localhost:5174/?fixture=john-2026-09-16-massing
```

`__shard.loadFixture(name)` is the same path, for the e2e.

## Two kinds of file, and which one supersedes which

**A log (`.mm.log`, `.log`, `.jsonl`) is the board.** One JSON event per line —
core's own `encodeLog` (`metamedium-core/src/store/seam.ts`), the format the
canvas writes too — replayed straight into the session. State is a pure function
of the log, so a log fixture stands up *exactly* the drawing it came from,
readings, planes, solids, names and all. **This is the kind to add**: the bar's
*Export…* writes one.

**A view (`.json`) is a picture of a board, and a reconstruction of it.** The
`.json` fixtures here were captured through `__shard.state()` **before there was
an export**, so they hold each mark's plane, bounds and readings and **no stroke
points at all**. `boardFromFixture` (`src/export.ts`) rebuilds circles and
rectangles from the boxes they filled, on their own planes, and the status line
says so every time: *a reconstruction, not a replay: an exported log supersedes
it*. Marks on a **view plane are not rebuilt** — a view holds the camera pose a
stroke was drawn from but not the (u, v) frame the shard built from it, and
guessing at that frame would be calling the guess John's drawing. They are
dropped and counted.

So: when one of these boards can be captured again from a live tab, export the
**log** and let it replace the `.json`.

## What is here

| File | What it is |
|---|---|
| `john-2026-09-16-massing.json` | **John's second board, 16 Sep 2026**, captured from the live tab. Four loops from free views, three profiles on the tiles, and a massing standing. Ten marks; four rebuild (the three profiles and one line on the foundation), six were view-plane ink. Its `reading` field is the capture's own analysis of the fault — worth reading before G1. Rebuilt, its three profiles stand the massing at **y ∈ [0.97, 3.09]**: floating where the profiles are, not on the floor (`shard-3d/README.md`, *G0*) |

`src/export.test.ts` reads this fixture as a module and pins both halves: what
rebuilds, and that the three profiles stand a massing.
