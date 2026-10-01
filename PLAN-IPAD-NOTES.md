# dyna.ink on the iPad — hand notes, pictures and the seats that read them

**1 October 2026.** John: *I want to bring in many images, SVGs and freehand,
and have all of it conserved well. On an iPad Pro with a Pencil I want to test a
real workflow of organising my hand-drawn notes — the iPad is a major target for
actually using this. We need little semantic and OCR models and a persistent API
key for the higher level; OCR cannot be sent to the same model, it needs its own
level, and so does parsing. Look at options like Jev for the library and at OCR
models. Are we ready? Map the gaps and propose an MVP.*

Written by the director from three surveys run the same day: a reading of the
code (every claim below has its file and line in the survey; the main ones are
cited here), a probe that drove `/app/` headless at iPad size with real
pictures, SVGs and 300 pen strokes (scripts and numbers kept outside the repo),
and a search of the model and platform options. **WebFetch was blocked for most
hosts during the search, so many platform and vendor facts come from search
summaries; each is marked (unverified) where it matters, and §6 lists what must
be checked on the real iPad before a unit leans on it.** The product is becoming
dyna.ink; nothing here renames anything.

---

## 1. The answer: not yet

**What is ready.** The pen: pressure kept per point, a finger pans, a palm is
nothing, hover, the field above the keyboard (R6, `07-hand.js`, the `pencil`
scenario on WebKit). Ink is conserved: 300 pen strokes, saved, reloaded, the log
identical. Boards, the trash, the journal that survives a killed tab (R1, R3),
the versioned log (R2), examples (R5), the offline shell (R7). SVG files come in,
several at a time, as live figures whose scripts never run.

**What is not — and the first two lose work or hide it:**

1. **A picture is not kept.** Its pixels never enter the log or the journal: the
   raster lives in an in-memory `blob:` URL (`folder.urls`, `18-images.js:55`)
   and is gone on reload. A folder would keep the file, but Safari has no folder
   access (`17-folder.js:89`), and even a folder's images lose their URL on
   reopen (`17-folder.js:344`). The probe: 10 of 10 picture artifacts came back
   after a reload, with no pixels.
2. **A picture is never drawn on the board** — not even right after it came in.
   An image artifact is not live (`session.ts:3567`, pinned by
   `import.test.ts:22`), so the board shows brackets and a filename; the pixels
   appear only in the grid view, until the reload.
3. **Every picture is traced into ink, always** (`18-images.js:82-89`; no
   confidence filter, though `BUILD-PLAN-v8.md:358` planned one). A paper sketch
   photographed gave ~110 strokes; a 12 MP camera photo gave **3,923 strokes,
   50,607 points, a 2.1 MB event**. Every traced stroke is a mark.
4. **Many traced strokes on a board with any artifact are very slow, on import
   and on every open.** With one SVG on the board, a traced import of 1,000
   strokes took 5.9 s and of 2,000 took 27.6 s (0.28 and 0.43 s with no
   artifact); one camera photo beside one SVG took 125 s to import and 120 s to
   open. Likely cause, read and not profiled: `recomputeClusterCandidates`
   (`session.ts:1413`) runs per stroke once any artifact or library exists.
   Paper sketches spread across the board: 10 open in 6.7 s, 50 in 134 s, a
   stroke's reading at 87 ms (p50) beside 50 of them.
5. **A multi-pick stacks on one point** and decodes every file at once on the
   main thread (no Worker; `ImageBitmap`s never closed, blob URLs never revoked):
   20 files peaked at 1.1 GB, 30 at 2 GB — past what a Safari tab on an iPad is
   likely to be given (unverified; reports range from about 3 GB down).
6. **Exports drop what was brought in.** The log carries no pixels; `board.svg`
   carries stroke paths only (no SVG figures, no pictures); `board.png` is the
   visible ink canvas only.
7. **Installed and kept.** No `apple-touch-icon` (the manifest's one icon is an
   SVG, which iOS likely ignores), no `navigator.storage.persist()`, nothing that
   says how much space a board takes. Safari clears a site's storage after seven
   days without a visit unless it is on the Home Screen (unverified; installed
   web apps are exempt), and an installed app does not see the boards kept in a
   Safari tab — they move by export and import.
8. **Organising.** No search (across boards, labels, names, read text or SVG
   text), no thumbnails in the boards list, no page or region that holds ink and
   pictures together (frames wire ports; they do not group), no layout for a
   multi-import.
9. **Reading notes.** *Read the writing* sends one word or one line, as a
   picture, to the single smallest joined model that sees (`readers()`,
   `06-handwriting.js:24`). There is one list of models, no role per model, and
   one remembered key and pick for all of them (`mm-model-key`, `04-models.js`).
   Points carry no time (`t` is never set, `07-input.js:48-52`), and Pencil's
   240 Hz samples are not read (`getCoalescedEvents`), so three of four are
   dropped. The decision seat (`decide.ts`, Jev) is built in core and on no
   surface.

---

## 2. The workflow the MVP must carry

Walked by John on the iPad Pro, installed to the Home Screen, and checked by the
MCP hand in the room (`QA-v1.md` gains a section, §6 of this plan):

1. **Capture** — write and draw notes with the Pencil on a board per topic.
2. **Bring in** — ten photos of paper notes and a whiteboard from Photos, two
   SVG diagrams from Files, a screenshot pasted: they land laid out, drawn as
   pictures, and are there after a reload, a week away and an export and import.
3. **Arrange** — put notes and pictures into named regions (*Monday*,
   *Pricing*), move a region and what it holds goes with it.
4. **Read** — *read this region*: every line of handwriting is read by the
   reader seat, held as a transcript beside the ink, never replacing it.
5. **Find** — type a word and see every board and region where it is written,
   typed, labelled or read; *notes like this one* finds the near ones.
6. **Out** — export the board with its pictures, as a file that opens again
   whole, and as a picture or PDF of a region.

---

## 3. Seats: a model per job, each with its own key

John's rule: reading, parsing and the higher level are separate levels. The
engine already has the shape — a participant with an injectable transport, held
readings, nothing committed — so this is a **role per seat**, not a new kind of
participant.

| Seat | Job | First, for the MVP | Local / fallback | Not yet |
|---|---|---|---|---|
| **reader** | handwriting → text, held as transcripts | a vision model the hand picks for this seat alone: the Claude Code seat at the desk (built), else a small hosted vision model through OpenRouter. The engine renders each **line from its own strokes**, clean and tight — better input than any photo | TrOCR-small/base-handwritten in the browser (transformers.js; 62M/334M, one line a call, English; IAM CER about 4.2 / 3.4 by its paper), lazy-loaded — a spike first. On a Mac: Ollama with a vision model | MyScript iink (strokes in, the best recogniser, but cloud only from a web page, a key, pricing to confirm, probably a proxy). No stroke recogniser runs in a web page on iPad: ML Kit is native only; the browser Handwriting Recognition API is ChromeOS only |
| **reader of pictures** | a photo of paper → text and lines | the reader seat, asked about the picture (a photo is not ink) | — | Mistral OCR 3 hosted (handwriting claims are the vendor's; CORS unverified); PaddleOCR-VL / olmOCR on a Mac with a GPU |
| **parser** | text → names, dates, quantities, entities | tier 1 first — the maths reads quantities and units, dates are a grammar — then the higher model returning JSON the engine checks | NuExtract on a Mac | GLiNER2 (already measured *not yet*: weak and 614 MB) |
| **semantic** | *notes like this*, search beyond the word typed, grouping | Model2Vec static embeddings (potion, 8–32 MB, plain JS, no GPU; about 85–95% of MiniLM on its benchmark) | MiniLM-L6 / bge-small quantised (~25–35 MB); EmbeddingGemma-300M on WebGPU (168 MB) as an optional download | — |
| **decider** (Jev) | choose among candidates the engine already ranks: which library entry, which name from the words, which side a number labels | Jev through OpenRouter (listed there as `typesafe/jev-*`, unverified) — its own API refuses browser origins (one test, 20 Sep, unverified) — always with a *none of these* option, taken only at 0.99, else the engine's ranking stands | none: the engine's ranking is already the answer | a small proxy to `api.typesafe.ai` |
| **writer** | briefs, pages, programs, *What is this?* | as today: the Claude Code seat, or a hosted model | Ollama on a Mac — **but an https page calling a plain-http LAN address is mixed content and blocked** (to verify on the iPad); a Mac model needs https or a tunnel | — |

**Keys.** One key per seat, never in the log (as today), remembered per seat on
the device when the hand ticks *remember*, with the provider's own spend cap
named in the pane. Three things make a remembered key safer, in order: **a
domain of its own** — on `jjh111.github.io` every project page shares one origin
and one storage, so any other page there could read the key (John's decision:
dyna.ink); **OpenRouter's sign-in** (PKCE), which hands the app a key the person
controls and can revoke, with no key typed; and later a key store encrypted by a
passkey (WebAuthn PRF, Safari 18+, unlocked by Face ID; it protects the copy at
rest, not a page that is already compromised).

**Budgets on the iPad.** Every in-browser model is a lazy download the hand
asks for, cached by the service worker, all of them together under about 500 MB;
nothing loads at boot. GitHub Pages cannot send the headers that give WASM
threads, so a browser model runs on WebGPU or one thread (unverified on iPad).

---

## 4. The MVP, in order

Each unit as the repo works: red first, the gate green, a dated status line in
`V1-PLAN.md` §9 (a new block, *The iPad*), `CLAUDE.md` where it describes what
changed. I1–I3 are the floor — without them the iPad loses work.

**I1 — a picture is kept and drawn.** An asset store in IndexedDB beside the
journal (`mm-assets`), keyed by the bytes' SHA-256, so the same photo brought in
twice is stored once; the `import` event carries `{ asset, mime, w, h }` and
never the bytes. On the way in a picture is decoded in a Worker, oriented,
downscaled to a long side of 2,560 px and kept as JPEG (WebP where it is
smaller), the original kept only when the hand asks. **An image artifact is
drawn on the board** — on the canvas under the ink, culled and cached like the
rest (R4c), never an iframe — and survives reload, board duplication and the
trash. **Tracing becomes an offer**, *Trace into ink*, on a held picture (and
the default for a picture under a threshold that reads as a line drawing),
filtered to what the shape rung reads with confidence (the plan
`BUILD-PLAN-v8.md:358` already made). A multi-pick lands **laid out**, in a grid
beside the view, one file at a time, each `ImageBitmap` closed. An asset no event
references is collected when the trash is emptied. *Red first:* a board with three
pictures reloads with three pictures drawn (pixels compared); a duplicated board
holds them; the kill test with a picture mid-import.

**I2 — many marks stay fast.** Profile the probe's case and fix it:
`recomputeClusterCandidates` per stroke once an artifact exists; an import's
strokes applied as one batch with one recompute; the budgets scenario gains a
board of 50 pictures and 5,000 traced strokes beside SVGs. *Red first:* a core
test that an `import` of 2,000 strokes beside an artifact replays within the
R4b budget.

**I3 — kept on the iPad.** A PNG `apple-touch-icon` and the iOS meta; the app
asks `navigator.storage.persist()` once a board holds something, and the boards
pane says how much each board and its pictures take and how much room is left
(`navigator.storage.estimate()`); the help says *add to Home Screen* and why
(seven days; a Safari tab's boards do not follow — export and import); two
inputs, *photos* (`multiple`, no `capture`) and *camera* (`capture`), since one
input with both may open the camera alone; paste of a picture from anywhere on
the page, not only the body. Points get `t`, and the Pencil's coalesced samples
are read.

**I4 — out and back whole.** *Export* writes a board bundle: the log and its
assets in one file (a zip, or a folder where the browser can) that *from a file…*
opens whole; `board.svg` embeds the pictures and the SVG figures; `board.png`
and a PDF of a region or the whole board, pictures included. The log format
(R2) gains the asset reference without breaking a version 1 reader (a reader
that does not know an asset draws its name, as today).

**I5 — regions.** A region is a named rectangle the hand draws or takes from the
field (*Make it a region*), holding whatever stands inside it — ink, pictures,
texts, figures. Moving or scaling it moves what it holds, one act. It has a
title, a colour from the tokens, and an entry in a board's outline (the panel)
that pans to it. Derived membership (what stands inside), never copied.

**I6 — find.** Search across every board (an index kept beside the journal,
derived, rebuilt when missing): labels, names, typed text, SVG text, Mermaid,
transcripts. Lexical first; a hit opens the board at the region. Thumbnails in
the boards list, made when a board is left.

**I7 — seats per job.** The models pane becomes seats: *reader*, *writer*,
*decider*, *semantic* (and *parser* when it has a job), each with its own
provider, model and key, remembered per seat. `readers()` asks the reader seat
only; the router asks the writer. The decider seat wires `decide.ts` to a
transport (OpenRouter first) with its first job: *which library entry*, when the
engine's top two definitions are within a margin — the answer one more held,
attributed row, taken only at 0.99 and never evicting the engine's. The models
scenario drives each seat against the stub.

*Status, 1 Oct 2026: built on `unit/i7-seats` (`V1-PLAN.md` §9, Phase 5, has the
unit's line).* Four seats in the pane (reader, writer, decider, *semantic* as a
row that says it is coming — *parser* has no job yet); one key a provider, typed
once; a seat chosen narrows who is asked and one left alone changes nothing;
the decider is `llm/decide-openrouter.ts` over a chat completion with *Which is
it?* as its first job, asked only by that tap. Open: the exact ids John wants
per seat, and whether `typesafe/jev-1.13` is what OpenRouter lists.

**I8 — read my notes.** *Read this region* / *Read the board*: every line of
handwriting rendered from its own strokes and sent to the reader seat in a
batch, with progress on the marks and Esc to stop; transcripts held, searchable
(I6), and said in the panel; a picture held asks the reader about the picture. A
spike beside it: TrOCR in the browser on the real iPad, measured — speed,
memory, and its reading of John's hand against the reader seat's — before it
becomes a fallback.

**I9 — notes like this.** Model2Vec embeddings of each region's words (typed,
labelled, read), derived and cached, never in the log; *notes like this* in the
field and in search. Lazy, under 32 MB.

**I10 — the walk.** John's workflow (§2) on the iPad Pro, by hand, with the MCP
hand in the room checking each step — `QA-v1.md` §A11 — and the faults written
up, the V1 review's pattern.

Cut order if time runs short: I9, then I8's spike, then I5's outline. Never cut
I1–I4.

---

## 5. John's decisions

1. **A domain of its own (dyna.ink)** before any key is remembered. [Yes — the
   shared `github.io` origin is the biggest key risk.]
2. **Which hosted provider for each seat.** [OpenRouter for the reader, the
   decider (Jev) and the writer away from the desk; the Claude Code seat at it.]
3. **MyScript** — a cloud stroke recogniser, likely the best reading of
   handwriting, at a cost and with a proxy. [Not in the MVP; try it on John's
   hand after I8 if the reader seat reads it poorly.]
4. **Pictures kept at 2,560 px or as they came.** [2,560, the original on
   request.]
5. **Tracing by default** for a picture that reads as a line drawing. [Offer,
   never default, for photos; default only for a scan of a drawing.]

---

## 6. To check on the iPad before leaning on it

Each was found by search, not seen: Safari's tab memory on an iPad Pro; WebGPU
in Safari on iPadOS 26 running a transformers.js model without a reload loop;
storage exemption for a Home Screen app and the size it may use; dragging from
Photos and Files giving the page real files; paste of a picture with no field
focused; `capture` with `multiple` opening the camera alone; an https page
reaching a Mac on the LAN; OpenRouter's Jev listing and Jev's CORS refusal;
Mistral's CORS.

The probe's own limits: Chromium headless on a 4-core container, not an iPad;
no WebKit; no real Pencil or photo library. Its timings are relative, and the
order of magnitude is the finding.
