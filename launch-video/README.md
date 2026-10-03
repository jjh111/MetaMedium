# dyna.ink — the soft-launch film

A 97-second motion-graphics teaser for a semi-technical audience. It shows rather than tells: one
infinite canvas, panned through nine beats, each a thing only dyna.ink does, in the brand's own tokens
(`brand/tokens.css`: warm paper, sea ink, teal keyword, IBM Plex Mono; the hand's writing in Caveat).

| t (s) | Beat | What is shown |
|---|---|---|
| 0–10 | 01 read | a circle drawn, read (*circle 0.86*) and redrawn clean with the ink faint beneath; a pentagon held open (*rectangle 0.44 · circle 0.43*, nothing redrawn) |
| 10–24 | 02 name | three bubbles and two lines, press-and-hold, the field, *molecule* typed; the next molecule drawn is known (*molecule 0.92*) |
| 24–40 | 03 diagram | a flowchart drawn by hand, read as one, *Make it Mermaid* (the text beside it), *Tidy the diagram* (ranks lined up, connectors routed at right angles) |
| 40–50 | 04 run | *Run it ▸* offered at rest; a token steps the flowchart, `paid = no` round the loop, then `paid = yes` (V1-SPEC RN5) |
| 50–64 | 05 kinds | notes in ink; *it's an idea · orange*; a neighbour offered paler; *insight is a kind of idea* a step lighter; *evidence opposes assumption* across the wheel — hue, lightness, chroma (V1-SPEC §3.2–3.3) |
| 64–72 | 06 arrange | *Make it an orbit*: the notes onto rings round the task |
| 72–82 | 07 together | Claude's hand draws a said relation (*opposes? 0.71 · claude*) and a card; *keep*. One board on the desk and the pad, through the room |
| 82–88 | 08 medium | a whiteboard's toolbar, scratched three times and erased |
| 88–97 | end | *dyna.ink* written, then drawn clean in front; *the diagrammatic notebook that runs*; the address |

Beats 04–06 and the desk-and-pad shot are **v1 as specced** (V1-SPEC §5–§6), not yet built — a teaser's
promise, drawn the way the spec says it will look.

## Use

```bash
open launch-video/index.html                    # scrub it: the bar under the stage, space to play
node launch-video/render.mjs                    # → launch-video/out/dynaink-soft-launch.mp4 (about 4 min)
node launch-video/render.mjs --stills 3,35,77   # → out/still-<t>.png
node launch-video/render.mjs --from 40 --to 50 --out clip.mp4
node launch-video/render.mjs --url dyna.ink     # the end card's address (default: the live app's)
```

Every frame is `render(t)`, a pure function of time, so a render is deterministic. It needs Playwright
(the e2e's or a global install) and ffmpeg. There is no sound: a score or a voice-over goes on in an editor.
