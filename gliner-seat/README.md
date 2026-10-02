# gliner-seat — J2, the extraction seat, a spike

*26 September 2026. Unit J2 of `V1-PLAN.md` (specified in `DIRECTOR-PLAN-W2.md`
§3). An experiment whose product is an answer with numbers; nothing here lands
in `core` or `dynaink-3d`.*

## The answer: not yet

**GLiNER2 runs where dyna.ink runs, fast enough to ask without a spinner,
under a licence we can ship. But on our own text it does not pull out the spans
a seat would be there for.**

- **It runs.** One line of a pattern page takes **24 ms in a Chromium page on
  WebGPU**, **55 ms in WebKit on WebGPU**, and **23 ms in a Node process beside
  the relay** (onnxruntime-node's WebGPU provider over Metal). On the CPU it is
  57 ms in Node and 165 ms in the page (wasm). Node loads in about 1 s. A page
  that already holds the weights loads in 1.9–2.4 s.
- **It can ship.** The weights are Apache-2.0 (Fastino's `gliner2-multi-v1`),
  and so is the ONNX export (`onnx-community`). The runtimes are MIT and
  Apache-2.0. Apache-2.0 can go into this AGPL-3.0 repository.
- **It does not read our words well enough.** Across 143 hand-labelled spans,
  the kinds a seat would add are the kinds it misses:
  - **measurement names**: at most 7 of 11 found, at 35% precision;
  - **garment and part names**: at most 6 of 9;
  - **operators**: at most 8 of 26.

  It does find **units (28 of 28)** and most **quantities (up to 54 of 69)**,
  but those are tier 1's to read exactly (M1). The model takes the label
  "measurement name" to mean a measurement: it tags `38"` and `36 inch` and
  files *Bust* under garments. Every best figure above was found by trying
  phrasings and thresholds after the errors had been seen, so read it as a
  ceiling, not a result.
- **It is heavy for a page.** The first visit downloads 614 MB. On WebGPU a tab
  then holds about 2.2 GB (852 MB in the renderer, 1.35 GB in the GPU process).
  On wasm it holds 1.15 GB.
- **The smaller model is not the way out.** GLiNER2.5-small (74M parameters,
  Apache-2.0) is faster in PyTorch (20–30 ms) but worse on our words: 32% recall
  at best. GLiNER2 multi-v1 reaches 64% with the same labels and threshold, and
  68% at its best.

What would turn the answer to yes is in **What a seat would need**, below.
Briefly: names (a fine-tune on the drafter's vocabulary, or the sheet's own
names offered as labels) measured on the real pages, which stay out of the
repository; a threshold measured on those fixtures; and the Node process beside
the relay as the place it runs.

## The candidates as they stand (26 Sep 2026), each verified

| Candidate | What it is | Parameters · size | Licence of the weights | What happened |
|---|---|---|---|---|
| **`onnx-community/gliner2-multi-v1-agent-ONNX`** @ `2d0d8e4` (created 25 Sep 2026) | One ONNX graph serving extraction and classification, for Transformers.js / WebGPU. Ships no processor | 307M · fp16 614 MB, fp32 1.23 GB | **Apache-2.0** (card and tag); its conversion credits `gliner2-ultrafast` (MIT) | **Measured.** The processor was ported here (`processor.mjs`) and is token-identical to the Python library |
| `fastino/gliner2-multi-v1` | The checkpoint behind it: mDeBERTa-v3-base, multilingual | 307M · 1.23 GB safetensors | **Apache-2.0** | Measured, through the export above |
| `fastino/gliner2-base-v1`, `-large-v1` | English GLiNER2, span heads | 208M · 834 MB; 486M · 1.95 GB | Apache-2.0 | Not measured: no browser export from a publisher I could verify |
| `fastino/gliner2.5-small-v1` (also `-base-v1` 194M, `-multi-v1` 287M) | GLiNER2.5, a new "boundary" architecture | 74M · 296 MB (DeBERTa-v3-xsmall) | **Apache-2.0** | **Measured in Python.** No ONNX export of `small` exists yet (third-party exports of base and multi do: `DanKau/*`, Apache-2.0, unverified; `litert-community` has TFLite for small) |
| `gliner` on npm (GLiNER.js) 0.0.19, Mar 2025 | JS runtime (Knowledgator's GLiNER.js) | — | MIT (code) | **GLiNER v1 only.** Its last release predates GLiNER2 (July 2025), and `@lmoe/gliner-onnx` forked it as its GLiNER1 half |
| `@lmoe/gliner-onnx` 0.2.0, 22 Aug 2026 (the brief's `@lmoe/gliner-onnx.js`; that is its repository name) | JS runtime for GLiNER 1 and 2 | — | MIT (code) | **Node only** (onnxruntime-node). Expects `lmo3/*` four-graph exports: 4.3 GB listed for multi, and its fp16 data is larger than its fp32. Not used: this folder's processor over ORT covers Node and the browser both |
| `gliner2` on PyPI 2.0.0, 24 Aug 2026 | The reference library (PyTorch) | — | Apache-2.0 (code) | Used as the reference: its processor was ported; it ran GLiNER2.5-small |
| `gliner2-onnx` on PyPI 0.1.1, Feb 2026 | Python ONNX runtime for the `lmo3` exports | — | MIT (code) | Not measured: Python, and the same four-graph exports |
| `urchade/gliner_base`, `urchade/gliner_multi` (GLiNER v1) | — | — | **CC-BY-NC-4.0: non-commercial, cannot ship.** (The v2.1 ones are Apache-2.0) | Not used |
| `0riginalGandalf/gliner2-multi-v1-int8` | An int8 ONNX file | 375 MB | **No licence stated**; ships a Windows DLL | Not used |

Nothing needed an account. `fastino/gliner2-large-v2` and `-base-v2` answer as
private or missing, and were skipped.

## The numbers

Measured on this machine: Apple **M2 Max**, 12 cores, 96 GB, macOS 26.6,
Node 22.23, onnxruntime-node and onnxruntime-web **1.30.0**, all on the **fp16
graph**. The per-call figures cover every fixture item asked five times (80
calls on the page's lines). Each call is timed as a seat would see it: the
prompt built, the graph run, the spans decoded, every piece of a long text
included. The processor's own share is under a millisecond.

| Where | Load to first answer | Memory | A line of the page, bare labels: median (p95) | The same, labels described | The castle's brief, bare / described |
|---|---|---|---|---|---|
| Node · onnxruntime-node · WebGPU (Metal) | 1.6 s disk-cold, 1.0 s cache-warm | 975 MB RSS loaded, 1156 MB peak | 23 (24) ms | 29 (30) ms | 120 / 160 ms |
| Node · onnxruntime-node · CPU, default threads | 1.1 s disk-cold, 1.0 s cache-warm | 792 MB RSS loaded, 1010 MB peak | 57 (67) ms | 130 (145) ms | 624 / 866 ms |
| Node · onnxruntime-node · CPU, 4 threads | 1.2 s disk-cold, 1.1 s cache-warm | 794 MB RSS loaded, 1011 MB peak | 86 (104) ms | 180 (194) ms | 896 / 1227 ms |
| Browser pane (Chrome 152) · onnxruntime-web · WebGPU | 4.8 s first visit, 3.5 s cold page, 1.9–2.4 s from OPFS | tab 852 MB held (peak 1697 MB), GPU process +1354 MB | 24 (25) ms | 30 (32) ms | 123 / 167 ms |
| Browser pane (Chrome 152) · onnxruntime-web · wasm, 4 threads | 2.9 s (warm) | tab 1154 MB held (peak 2082 MB), GPU process +0 MB | 165 (196) ms | 350 (385) ms | 1808 / 2450 ms |
| Chromium for Testing, page in front · WebGPU | 2.0 s (cold) | — | 24 (25) ms | 30 (32) ms | 124 / 170 ms |
| Chromium for Testing, page in front · wasm, 4 threads | 1.9 s (cold) | — | 162 (195) ms | 347 (381) ms | 1792 / 2453 ms |
| WebKit 26.6 (Playwright) · WebGPU | 2.1 s (cold) | — | 55 (58) ms | 72 (81) ms | 281 / 414 ms |
| Python · gliner2 + torch · CPU — GLiNER2.5-small | 2.6 s load + 65 ms first call | 1220 MB peak RSS | 30 (133) ms, over all calls | 49 (187) ms, over all calls | — |
| Python · gliner2 + torch · MPS — GLiNER2.5-small | 2.2 s load + 3592 ms first call | 1281 MB peak RSS | 21 (442) ms, over all calls | 20 (81) ms, over all calls | — |

**What the loads mean.**

- **Node, disk-cold**: a fresh process whose weights come off the SSD. Each run
  reads a copy written with `F_NOCACHE` (`bench/nocache-copy.py`), and a probe
  confirms the trick: 6.1 GB/s on the first read against 11.4 GB/s from the
  cache.
- **Node, cache-warm**: a fresh process with the files already in the OS cache.
  Of the ~1 s, the tokenizer takes 0.29 s (a 250k-entry vocabulary parsed from
  16 MB of JSON) and building the session 0.55–0.75 s.
- **Browser, first visit**: nothing stored and no compiled shaders. The weights
  come over loopback from `bench/serve.mjs`, so **no internet time is in the
  figure**. A real first visit also downloads 614 MB.
- **Browser, cold page**: the origin's stored weights were emptied, but
  Chromium's on-disk shader cache survived.
- **Browser, from OPFS**: a reload that finds the weights in the origin-private
  file system.

**Memory, how it was read.** In the browser, memory was read from outside the
page with macOS `footprint` (`bench/web-memory.sh`), with the session held
alive. The tab's renderer and the app's GPU process were sampled every second
from an idle baseline (15–18 MB and 324–330 MB). A page cannot see its own GPU
buffers, and the pane has no `measureUserAgentSpecificMemory`.

**WebKit.** WebKit ran without storage: its OPFS refuses to open in
Playwright's ephemeral context. The first call compiles shaders, which took
1.0 s on the very first run.

**The pane was hidden.** It was hidden while it ran. A page in front
(Chromium for Testing) gave the same wasm and WebGPU figures, so hiding cost
nothing.

**Quality** is the same in every runtime above: the fp16 graph agrees with
itself to within two spans of 143 across CPU, WebGPU and wasm.

| GLiNER2 multi-v1 (fp16 graph), 143 labelled spans | Strict P / R / F1 | Overlap P / R / F1 |
|---|---|---|
| plan, bare, threshold 0.5 | 59% / 47% / 52% | 72% / 57% / 64% |
| plan, described, threshold 0.5 | 68% / 51% / 58% | 81% / 61% / 70% |
| plan, described, threshold 0.3 | 67% / 64% / 65% | 78% / 74% / 76% |
| plain, bare, threshold 0.5 | 67% / 63% / 65% | 77% / 73% / 75% |
| plain, described, threshold 0.4 | 69% / 61% / 64% | 84% / 75% / 79% |
| *GLiNER2.5-small*, plan, described, threshold 0.3 | 57% / 32% / 41% | 76% / 43% / 55% |
| *GLiNER2.5-small*, plain, described, threshold 0.3 | 64% / 30% / 41% | 85% / 40% / 54% |

| Kind (spans) | Plan labels described, 0.5 | Best of the four phrasings and seven thresholds |
|---|---|---|
| measurement name (11) | found 4, precision 33% | found 7, precision 35% (plan, described, 0.3) |
| quantity (69) | found 37, precision 66% | found 54, precision 69% (plain, bare, 0.3) |
| unit (28) | found 26, precision 100% | found 28, precision 100% (plain, bare, 0.3) |
| garment or part name (9) | found 2, precision 40% | found 6, precision 86% (plain, described, 0.7) |
| operation (26) | found 4, precision 50% | found 8, precision 47% (plain, bare, 0.3) |

| Fixture | Strict P / R, plan labels described, 0.5 |
|---|---|
| apron.sample | 75% / 53% (found 18 of 34, 6 wrong) |
| tunic.sample | 85% / 56% (found 29 of 52, 5 wrong) |
| briefs | 63% / 38% (found 5 of 13, 3 wrong) |
| castle-sketch.brief | 51% / 48% (found 21 of 44, 20 wrong) |

**How the scores are counted.**

- **Strict** means the same kind at exactly the same characters. **Overlap**
  means the same kind somewhere on the right words.
- The labels are the plan's five kinds (`fixtures/labels.json`):
  - **plan**: asked by the plan's names;
  - **plain**: *body measurement*, *number*, *unit of measurement*, *garment*
    plus *part*, and *math operator*, mapped back to the five kinds;
  - **described**: either set with a one-line description that names no word
    from any fixture.
- The phrasings were fixed before `bench/labels.mjs` first ran. But the plain
  set was chosen after the errors of the plan's labels had been seen, and there
  is no held-out set, so the best rows are a ceiling.
- 72 judgment calls are listed in the fixtures as *ignore*, each with its
  reason. A prediction inside one is neither credited nor counted wrong.
  - Step numbers are decide's question (J1: *is this number an amount or a
    step?*).
  - Letter keys and references (A, B, C, ①) are the sheet's (M2).
  - *castle* and *flowchart* are the whole thing being made, neither garment
    nor part.
  - The shard brief's words for its own machinery (hull, planes, ids) are not
    words the human wrote.

**What it gets wrong, in its own spans** (`results/*.json`, under `spans` and
`errors`):

- the model takes *measurement name* for a measurement (`36`, `38"`,
  `20 inches`);
- *Bust*, *Top to waist* and *Fist* land under *garment or part name*;
- `÷ + × − /` are almost never entities;
- *checkout* becomes an operation;
- `3–6` and `72–74` are missed as ranges;
- the castle's *towers* and *gate* are missed at 0.5, although GLiNER2.5-small
  finds them at 0.34–0.48.

## The commands that produced them

```bash
cd gliner-seat
npm install                        # onnxruntime-node, onnxruntime-web, @huggingface/tokenizers, playwright-core
node fetch.mjs                     # the fp16 graph, tokenizer and Python reference: 633 MB, pinned to 2d0d8e4, sha256-checked
node verify.mjs                    # parity with the Python library (6/6 prompts token for token; 6/6 answers, worst |Δconf| 1.1e-4)
node verify.mjs --ep webgpu        # the same on WebGPU (6/6, worst |Δconf| 3.7e-3)
node --test *.test.mjs             # 32 tests: transport, fake, processor, scorer, fixtures — nothing downloaded

node bench/node.mjs --ep webgpu    # → results/node-fp16-webgpu.json (loads in child processes, then 2 × 105 calls)
node bench/node.mjs --ep cpu       # → results/node-fp16-cpu.json
node bench/node.mjs --ep cpu --threads 4
node bench/labels.mjs              # four phrasings × seven thresholds → results/labels-webgpu.json

node bench/serve.mjs &             # 127.0.0.1:8030 only, cross-origin isolated
#   open http://127.0.0.1:8030/bench/web.html?ep=webgpu&fresh=1&load-only=1&tag=cold   (then warm1, warm2 without fresh)
#   open http://127.0.0.1:8030/bench/web.html?ep=webgpu&tag=full&hold=1  while  sh bench/web-memory.sh <renderer pid> <gpu pid> 150
#   open http://127.0.0.1:8030/bench/web.html?ep=wasm&tag=full&hold=1    (the same, for wasm)
#   open http://127.0.0.1:8030/bench/web.html?cleanup=1                  (forget the stored weights)
node bench/headless.mjs --browser chromium --ep webgpu --store none
node bench/headless.mjs --browser chromium --ep wasm --store none
node bench/headless.mjs --browser webkit --ep webgpu --store none

UV_CACHE_DIR=$PWD/.cache/uv uv venv .venv && UV_CACHE_DIR=$PWD/.cache/uv uv pip install --python .venv/bin/python "gliner2[local]==2.0.0" protobuf sentencepiece
HF_HOME=$PWD/.cache/hf .venv/bin/python bench/py-bench.py --device cpu   # and --device mps
node bench/score-python.mjs results/py-gliner2.5-small-v1-cpu.json

node bench/table.mjs               # the tables above, from results/
```

Everything this needs sits inside this folder and is ignored by
`.gitignore`: `node_modules/`, `.venv/`, `.cache/`, `models/`. That is about
2.8 GB on disk once unpacked. The downloads were well under 2 GB: 633 MB and
about 300 MB of weights, torch's wheel at 127 MB, and the smaller packages. The
browser runs used browsers already on the machine: the Claude app's pane, and
Playwright's Chromium and WebKit at the revisions `e2e/` pins. None was
downloaded.

## The files

| File | What it is |
|---|---|
| `processor.mjs` | GLiNER2's processor in JavaScript: the word splitter, the schema prompt, the marker and word positions, the span decoder, and chunking by line. A port of `gliner2` 2.0.0 (Apache-2.0), pure, the same in Node and the page |
| `runner.mjs` | One graph, a tokenizer and the processor. The ONNX Runtime module is passed in, so it runs on onnxruntime-node or onnxruntime-web |
| `node-runner.mjs` | Loads it in Node on `cpu` or `webgpu`. `coreml` is kept only to record that it does not help: the NeuralNetwork format takes **0 of 910 nodes**, and the MLProgram format **throws** while initialising |
| `transport.mjs` | **The seat's seam** (below): the question and answer types, `askExtract`, `checkAnswer`, `createRunnerTransport`, `createFakeExtractTransport` |
| `score.mjs` | Precision and recall, strict and by overlap, with ignore regions |
| `fetch.mjs`, `verify.mjs` | The pinned download, and parity with the Python library |
| `fixtures/` | `apron.sample.json`, `tunic.sample.json` (M1's sample lines verbatim, never the drafter's own numbers), `briefs.json` (the three briefs in words, plus the words typed at the shard), `castle-sketch.brief.json` (the shard's part-naming brief, verbatim), and `labels.json` (the five kinds, their descriptions, the labelling rules) |
| `bench/` | `node.mjs`, `load.mjs` and `nocache-copy.py` (Node); `web.html`, `web.mjs`, `serve.mjs`, `web-memory.sh` and `headless.mjs` (the browser); `labels.mjs`; `py-bench.py` and `score-python.mjs`; `harness.mjs` (one protocol for every runtime); `table.mjs` |
| `results/` | Every number above, with each call's spans and every error |

## The transport

`transport.mjs` is shaped like the decision seat's `DecideTransport`
(`core/src/participants/decide.ts`), so a later unit can plug it in
beside it:

```js
// A question: the text, exactly as the board holds it, and a closed list of kinds.
{ kind: 'extract', id, text, labels: [{ name, description? }], about?: [nodeIds], threshold? }
// An answer: spans, each the text's own characters at its own place, with a probability.
{ kind: 'extract', questionId, spans: [{ label, text, start, end, score }] }
// The seam: the whole batch in one call, the thing that answers injected.
type ExtractTransport = (questions, { signal }) => Promise<{ ok: true, answers, via } | { ok: false, error }>
```

`askExtract(transport, questions)` never throws, and it checks every answer
rather than trusting it:

- **Never writes.** A span whose words are not the text's own at its offsets
  is dropped and counted. So is one of a kind nobody asked for, one outside the
  text, one whose score is not a probability, and one that repeats.
- **Never computes.** A kept span is rebuilt from its five fields. `36` stays
  the characters `36`, and a `value: 36` sent alongside is not passed on;
  arithmetic is tier 1's (M1).
- **Never commits.** It touches no session.

The reason for each row is the question and what came back, and nothing more:
*asked for measurement name, quantity in “A. Bust 36” — “36” quantity 0.99 ·
“Bust” measurement name 0.93*.

`createRunnerTransport(runner)` wraps any runner. `createFakeExtractTransport`
answers from a book and is what the tests use.

## What a seat would need

**Where it would run: a Node process beside the relay.** That is 1 s to load,
23 ms a line on WebGPU or 57 ms on the CPU, and about 1 GB of RSS, on the
machine that already runs `Demos/relay.mjs` and the MCP hands.

The page is possible but costs more:

- a 614 MB first download;
- 2.2 GB a tab on WebGPU;
- Cache Storage is no home for the weights: Chromium refused the 614 MB entry
  with an "Unexpected internal error" at 17 GB of free quota. OPFS works, and
  WebKit's OPFS was unavailable in an ephemeral context;
- three seconds after the page dropped its own references to the weights,
  its JS heap still held 685 MB. Either onnxruntime-web keeps the input bytes
  reachable or they had not yet been collected; a page seat must find out
  which, and let go of them.

For v1's iPad scenario (A10), WebKit does run it on WebGPU, at 55 ms a line.
The memory is the question there, and it was not measured.

**How it would join: behind the transport, as a seat.** It would be a sibling
of `participants/decide.ts` in core, say `participants/extract.ts`, with:

- an injected `ExtractTransport`, and no HTTP client in core;
- a join at tier 1.5, local;
- `propose` of held reps (modality `extract`) whose reason is the question and
  the spans;
- the snapshot's generation pinned, so an answer never lands on a board that
  has moved (STATE-1).

The Node process would answer over the live room, the way `Demos/mcp.mjs`
joins it. The engine's own readings are never evicted. V1-PLAN §6 applies: the
question carries the Context, and the candidates arrive ranked.

**When it would be asked: by a deliberate act only.** That means the field on a
brief typed in words, *read the brief*, or the shard's part naming. Never on a
stroke.

**What it must never do:**

- **write**: it offers spans of the text, and nothing else;
- **compute**: it attaches no values, and does no arithmetic, unit
  conversion or totals;
- **commit**: everything it says is held and attributed until a human blesses
  it.

**What it needs before it earns the seat, in order:**

1. **Names, measured on real use.** The real pages become fixtures on John's
   machine and never in the repository (risk 7). Then try two ways in:
   - the **sheet's own names as the labels**, so that a brief is asked for
     *Bust*, *Top to waist* and so on, rather than for "measurement name";
   - a **LoRA fine-tune** on the drafter's vocabulary (`gliner2` ships the
     training code).
2. **A threshold chosen on those fixtures.** Here 0.3–0.4 beat the library's
   0.5; MATHS-PLAN §5 says thresholds are measured, not borrowed.
3. **Numbers, units and operators left to tier 1**, which reads them exactly.
   The seat's value would be the words around them.
4. **A smaller graph for the page, if the page matters.** GLiNER2.5-small is
   74M parameters but lost on our words. An int8 export of this graph would
   need the ONNX toolchain and a parity run like `verify.mjs`.

**One more door, not opened here.** The same graph carries GLiNER2's
classification head (`cls_logits`, a softmax over `[L]` labels). That is the
shape of decide's Choice question, answered locally. The export's reference file
has eight recorded classification calls waiting as its parity test. Porting the
`[L]` prompt is small; the Python classifier adds a full stop to the text first.

## Licence

**The weights.** `fastino/gliner2-multi-v1` is **Apache-2.0**, per its model
card and Hub tag. The export `onnx-community/gliner2-multi-v1-agent-ONNX` is
**Apache-2.0**. `fastino/gliner2.5-small-v1` is **Apache-2.0**. None is
committed here; `fetch.mjs` gets them.

**The code.**

- onnxruntime-node and onnxruntime-web: MIT.
- `@huggingface/tokenizers`: Apache-2.0.
- `gliner2`: Apache-2.0.
- `playwright-core`: Apache-2.0.

`processor.mjs` ports `gliner2`'s processor, so shipping it means carrying
Apache-2.0's notice. Apache-2.0 is compatible with this repository's AGPL-3.0.

**Not shippable.** `urchade/gliner_base` and `urchade/gliner_multi` (GLiNER v1)
are CC-BY-NC-4.0. The int8 file on the Hub states no licence at all.

## What this spike could not do

- **No truly cold browser load.** The browser loads use loopback, so a real
  first visit adds the 614 MB download. The shader-cold figure is one run.
- **No WebKit memory**, and no storage in WebKit (its OPFS refuses to open in
  an ephemeral context).
- **No quantised export.** The only int8 file for this graph has no licence.
  Making one was not attempted.
- **GLiNER2.5-small in the page.** It has no ONNX export and a different
  decoder, so it was measured in Python only.
- **The classification head** was not ported.
- **The iPad itself** was not run. WebKit on macOS stands in for it.
