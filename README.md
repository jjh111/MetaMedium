# dyna.ink

**A drawing canvas that reads what you draw.** Every mark is read as you make it — a box, a
circle, an arrow, writing — and what you draw can become a diagram, a sum that checks itself,
a page or a program, on a board you can share with a link. A model is asked only when you ask
one.

dyna.ink was formerly MetaMedium: the repository and the addresses below still carry that name,
and [RENAME-PLAN.md](RENAME-PLAN.md) says what changes and when.

## Use it

- **The app: [jjh111.github.io/MetaMedium/app/](https://jjh111.github.io/MetaMedium/app/)** —
  pen, finger or mouse; installable, and it opens with no network after one visit. Its help is
  [HELP.md](HELP.md), the same page the app's *help* tile shows. Once John deploys dyna.ink
  ([cloudflare/README.md](cloudflare/README.md)), the app is also at
  [dyna.ink/app/](https://dyna.ink/app/); the old address keeps working.
- **The whitepaper: [dyna.ink: AI Beyond Chat](https://jjh111.github.io/MetaMedium/)** — the
  argument, with the launch film and figures that run.

## What it does

*As of 23 October 2026: `master` once the milestone branch `claude/loving-maxwell-zagdqy`
merges.*

**Draw, and the engine reads it.** Each stroke is measured — its corners, how closed it is, how
much of its own box it fills — and read as one of a closed set of shapes, with how sure the
reading is and why. No model is involved. Press and hold a mark: it is held with what it hangs
together with, and the field opens beside your hand, saying what the marks are and what they
can become — drawn clean, lined up, named, made into a page or a program. Name a group once
(three circles and two lines as *molecule*) and the next one you draw is recognised.

**Diagrams, to Mermaid and back.** A drawing that reads as a flowchart, a UML class diagram, a
sequence diagram, a state diagram, an ER diagram or a mind map says so, and *Make it Mermaid*
writes the Mermaid text beside it. *Draw it* puts a Mermaid text on the board as marks that read
back as the same diagram. Lines and arrows tie to what they join and follow it when it moves;
*Tidy the diagram* lines it up and routes the tied lines at right angles.

**Maths.** A number written beside a side is its length. A right triangle with its legs labelled
says its long side, a page of steps shows a check at the end of each line, a garment pattern piece
says what it is cut at and sewn at, and a figure with a unit prints at its true size. The canvas
does the arithmetic itself; no model computes a number.

**Boards, on your device.** Every board is kept in the browser as you draw, pictures included:
several boards, a trash, *find* across all of them, and export as one `.dyna.zip`, an SVG, a PNG,
a PDF or Mermaid text. A folder on your computer (Chrome or Edge), a GitHub repository
(`?git=owner/repo`) or a published site (`?folder=…`) can be the board too, with your ink kept
beside the files as a log of your own.

**Rooms anyone can share by a link.** *Share this board* puts the board into a room on dyna.ink's
relay, and *Copy invite link* gives you a link with the room's key after the `#`, which a browser
never sends to the site's server. Anyone with the link opens it in any browser, gives a name and
draws with you, each person in their own colour, and undo takes back only your own last act. A room
the relay opened is forgotten 30 days after it was last used; *Save a copy to my boards* keeps it.
A program another person put on the board does not run in your tab until you tap *Play it here*.

**dyna.ink's own models, with no key.** On dyna.ink and the old address, dyna.ink's relay asks
Cloudflare's models for you, so the browser holds no key: a **writer** (*What is this?*, a page
or a program from a brief), a **reader** (handwriting, a picture of a page) and a **decider**,
Cloudflare's Clef-flash decision model, which settles a close call between answers the canvas
already holds — *Which is it?*, *Which diagram is this?*, and, once you choose it, what a brief
should make — and is taken only when it is 99% sure. Each is asked only by something you do, and
only when no model of your own would be: a model on your machine (Ollama, LM Studio), a hosted
one with your key, or Claude Code. Each internet address has a daily share of them.

**Claude as a hand.** Claude Code joins a room through an MCP server of its own
(`Demos/mcp.mjs`, registered in [.mcp.json](.mcp.json)). It looks at the board, sees the ink,
draws, says a sentence beside marks, proposes a reading, labels its own ink, finds words, makes
regions, moves marks and puts pictures on the board. It can also be the model the canvas asks.
Everything it does is attributed to it and held for you to take or leave.

**Not yet deployed (23 October 2026).** `dyna.ink` and its relay, `relay.dyna.ink`, wait on
John's Cloudflare steps ([cloudflare/README.md](cloudflare/README.md)). Until then the public app
cannot reach the relay: *Share this board* says the relay did not answer, and dyna.ink's own
models are not offered. Rooms still work between tabs in one browser, and across a network with
`node Demos/relay.mjs` running on the machine that serves the page (open the app there with
`?live=<room>&relay=http://<that host>:8020`). The relay's model routes are tested against a
stand-in; how Cloudflare's models answer, and how fast, has not been seen yet. Nothing has been
run on a real iPad in this cycle, and WebKit runs in CI only.

## Develop

The engine is [`core/`](core/) (TypeScript, no runtime dependencies), and every recognition or
engine change lands there with its tests. The app is `Demos/session-engine.html` and its surface,
`Demos/surface/*.js`, built into one script and copied into `app/`. [CLAUDE.md](CLAUDE.md) is the
map: what each file is, the invariants, and the traps.

```bash
cd core && npm ci && npm test && npm run typecheck   # the engine
npm run build:browser && npm run build:node          # then copy both bundles from core/dist/ to Demos/
node Demos/build-surface.mjs           # after editing Demos/surface/*.js; commit Demos/session-engine.js too
node scripts/build-app.mjs             # after editing the page, Demos/sw.js or the manifest; makes app/
python3 -m http.server 8000            # from the root; open http://127.0.0.1:8000/app/
cd e2e && npm ci && npx playwright install chromium   # once, for the browser gate
node e2e/run.mjs                       # the gate; name scenarios to run a few (node e2e/run.mjs app room)
node e2e/run.mjs prod                  # the app under the headers dyna.ink will send
cd cloudflare/relay && npm test        # the relay as a Worker: rooms, limits, the model routes
node scripts/release.mjs 0.2.0 --dry-run   # a release, printed; the real run commits and tags, never pushes
```

CI runs the engine's tests and builds, the surface's and the app's drift checks, the relay's
tests, the gate on Chromium and a WebKit set on every push. The deploy to Cloudflare runs only
after CI has passed on `master`'s tip.

## Docs

- [V1-SPEC.md](V1-SPEC.md) — v1 as specced on 2 October 2026: the promises, the units, and the
  ladder of releases
- [CLAUDE.md](CLAUDE.md) — the codebase guide and the repository's one inventory
- [HELP.md](HELP.md) — the app's help, for a person using it
- [QA-v1.md](QA-v1.md) — the checklist walked by hand for the acceptance scenarios
- [NEW-REPO-PLAN.md](NEW-REPO-PLAN.md) — starting the dyna.ink repository from this milestone
- [RENAME-PLAN.md](RENAME-PLAN.md) — MetaMedium becomes dyna.ink: the spellings, what keeps the old
  name, and the units
- [cloudflare/README.md](cloudflare/README.md) — deploying the site and the relay on Cloudflare,
  once
- [PERF.md](PERF.md) — the performance baseline and the budgets the gate holds
- [CHANGELOG.md](CHANGELOG.md) — what each release holds
- [GUIDE-2026-10-02.md](GUIDE-2026-10-02.md) — the hand-over of 2 October 2026, a snapshot
- [EXPERIMENTS.md](EXPERIMENTS.md) — the side tier: what each experiment probes and feeds back
- The design behind the engine: [MVP.md](MVP.md), [KEYFRAMES.md](KEYFRAMES.md),
  [ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md](ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md),
  [ARCHITECTURE-v6-SESSION-ENGINE.md](ARCHITECTURE-v6-SESSION-ENGINE.md),
  [metamedium-core-schema.md](metamedium-core-schema.md); [ROADMAP.md](ROADMAP.md) is the August
  and September 2026 accounting and is not kept current

## Previous versions

- [The app at its first address](https://jjh111.github.io/MetaMedium/Demos/session-engine.html)
  — the same app; the whitepaper embeds it from here
- [Canvas demo (2025)](https://jjh111.github.io/MetaMedium/doodle2-canvas.html) — the first
  prototype: heuristic recognition, a spatial graph, a visual vocabulary, live "why" reasoning
- [MetaDoodle (2025)](https://jjh111.github.io/MetaMedium/metadoodle1.html) — the prototype with
  tiered AI interpretation: in-browser WebLLM (WebGPU), then LM Studio, and voice input. In both
  2025 prototypes `Ctrl+Z` undoes, `Ctrl+Shift+Z` redoes, `Enter` accepts the top suggestion and
  `Escape` clears the selection
- [Drawing-responsive text](https://jjh111.github.io/MetaMedium/v2-poc/) — the whitepaper's text
  reflowing around shapes you draw
- [Micro demos](https://github.com/jjh111/MetaMedium/tree/master/Demos) — the fish vocabulary,
  composition diagrams, the no-modes graph and other small experiments
- [Whitepaper v4](https://jjh111.github.io/MetaMedium/archive/MetaMedium_Whitepaper_v4.html),
  superseded by v5; earlier iterations are in [`archive/`](archive/)
- `Web App Skeleton/` — a React rebuild from before the engine moved to `core/`; CI still builds
  it, and no new work lands there
- Supplemental resources: [jhanacek.net/metamedium-resources-65](https://jhanacek.net/metamedium-resources-65)

## License

The code is open source under the GNU AGPL-3.0 (`AGPL-3.0-only`,
[LICENSE](LICENSE)), and the whitepaper's prose and figures are
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [NOTICE](NOTICE)
says who holds the copyright and lists the third-party pieces;
[TRADEMARKS.md](TRADEMARKS.md) says how the names may be used, and
[CONTRIBUTING.md](CONTRIBUTING.md) how to take part.
