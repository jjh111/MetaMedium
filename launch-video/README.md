# dyna.ink — the soft-launch film

A 156-second motion-graphics teaser for a semi-technical audience, in three acts on one infinite canvas, in the
brand's own tokens (`brand/tokens.css`: warm paper, sea ink, teal keyword, IBM Plex Mono; the hand's writing in Caveat).
It shows rather than tells, and the story is the whitepaper's: why a drawing should mean something to the computer.

**Act I — where it comes from** (0–58 s): a timeline the camera travels along.

| t (s) | Beat | What is shown |
|---|---|---|
| 0–7 | 1945 | Bush, *As We May Think*: pages, and a trail drawn between them |
| 7–14.5 | 1963 | Sketchpad: a truss drawn by light pen, its constraints satisfied |
| 14.5–21.5 | 1977 | Kay & Goldberg, *Personal Dynamic Media*: a Dynabook sketched, every medium inside it — *metamedium* |
| 21.5–28.5 | 1980 | Put-That-There: “put that… there.” and the box moves where the speech points |
| 28.5–40 | then / so | *dead drawing on a living medium*: a whiteboard's toolbar and a flowchart whose arrows do not flow; the toolbar scratched three times and erased; the arrows start to flow |
| 40–47 | 2016 | *As We May Sketch*: a hand curve fitted to a function, and the thesis's line on a truly metamedium |
| 47–53 | 2026 | AI as a meta-word: language → computation, then meaning put back in the loop |
| 53–58 | title | dyna.ink — beyond chat |

**Act II — the demo** (58–148.5 s), v1's beats on a warped clock so each has room: 01 read, 02 name, 03 diagram (Mermaid,
tidy), 04 run, 05 kinds (colour follows meaning), 06 arrange (orbit), 07 together (Claude's hand; the desk and the pad).
Beats 04–07 are **v1 as specced** (V1-SPEC §5–§6), not yet built — a teaser's promise, drawn as the spec says it will look.

**Act III** (148.5–156 s): *dyna.ink* written by hand, then drawn clean in front; *the diagrammatic notebook that runs*; the address.

## Use

```bash
open launch-video/index.html                    # scrub it: the bar under the stage, space to play
node launch-video/render.mjs                    # → launch-video/out/dynaink-soft-launch.mp4 (about 6 min)
node launch-video/check.mjs                     # the layout check: text clipped, spilling out of its box, covered, overlapping
node launch-video/render.mjs --stills 3,35,77   # → out/still-<t>.png
node launch-video/render.mjs --from 40 --to 50 --out clip.mp4
node launch-video/render.mjs --url dyna.ink     # the end card's address (default: the live app's)
```

Every frame is `render(t)`, a pure function of time, so a render is deterministic. It needs Playwright
(the e2e's or a global install) and ffmpeg. There is no sound: a score or a voice-over goes on in an editor.
