# MetaMedium v7: Participants and Tiers

**Date:** August 2026
**Status:** Active design — supersedes ROADMAP's "Demo v3 Step 2"
**Builds on:** `ARCHITECTURE-v6-SESSION-ENGINE.md` (the session engine), `metamedium-core-schema.md` (the node model)
**Replaces:** `archive/PRD-v4-LLM-Grounded.md`'s tier plan, which predates the propose channel

---

## 1. The benchmark

Everything here is sequenced to pass one test:

> **The conversation benchmark.** A human and an AI hold a conversation *on the
> canvas* — both contributing marks, both building up library entries. The
> human asks a question and gets an explanation placed in the space. The human
> draws a diagram and gets it parsed into code. Handwriting is read. Nobody
> types into a chat box.

The claim that distinguishes this from every other AI whiteboard: **the board
itself is smart about relationships, and extensible in what it can know** —
because the model and the human agree on facts *implicitly, through the
canvas*, rather than restating them in prose.

### The hypothesis being tested

> An LLM operating in a structured space, where facts are agreed with the user
> implicitly through the canvas, is better scaffolded than the same LLM in a
> chat transcript.

This is falsifiable and worth stating plainly, because the whole architecture
is a bet on it. The grounded substrate — fingerprints, spatial relations,
blessed artifacts, attribution — is shared context that neither party has to
re-describe. A chat transcript has to say "the circle on the left"; a canvas
participant refers to `stroke:12` and both sides already agree what that is,
what it resembles, and who made it.

Tier 0 had to work first for exactly this reason. It does now.

---

## 2. The seam already exists

**This is the load-bearing fact of v7: bringing in LLM tiers is not a new
architecture. The engine was built for it.**

`metamedium-core` already models a non-human participant as a first-class
citizen. From `src/session/nodes.ts` and `src/session/session.ts`:

| Existing primitive | What it already does |
|---|---|
| `ParticipantKind = 'human' \| 'agent' \| 'engine'` | An agent is a kind of participant, not a special case |
| `Capability = 0 \| 1 \| 2 \| 3` | The tier ladder, already a field on every node |
| `Rep.source` | Provenance convention **already includes `'llm:<model>'`** |
| `Rep.modality` | Open set — `'stroke' \| 'word' \| 'html' \| …`; `'code'` needs no schema change |
| `Edge.reasoning` | Grounded justification — the substance behind "why?" |
| `session.join(kind, name, at)` | Registers an agent as a node in the graph |
| `session.propose({participantId, nodeId, edges, at})` | **The channel LLM tiers plug into** — that is the literal name of the test block |
| `session.bless({…, participantId})` | Agents can summon and bless too — gestures are not human-only |

The participants test suite already asserts the properties that matter: a
proposal is held as an **attributed, unblessed edge** and can re-rank the
reading; proposals from unregistered participants are ignored; undo removes a
proposal. Nothing auto-commits.

So the work is **an adapter, not a redesign**: something that reads session
state, calls a model, and turns the answer back into `propose()` calls.

`Demos/session-engine.html` already ships a second participant — but it's a
scripted echo, not a model. That button is the socket. v7 fills it.

---

## 3. One transport covers three providers

The practical finding that shrinks the MVP:

**LM Studio, Ollama, and OpenRouter all speak the OpenAI-compatible
`/v1/chat/completions` shape.** They differ only by base URL and whether a key
is required.

| Provider | Base URL | Key | Status in repo |
|---|---|---|---|
| LM Studio | `http://localhost:1234/v1` | none | **Built** — wired in `metadoodle1.html` |
| Ollama | `http://localhost:11434/v1` | none | Base-URL change away |
| OpenRouter | `https://openrouter.ai/api/v1` | `Authorization: Bearer <key>` | Base-URL + header away |
| Anthropic | `https://api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version` | Different wire shape — separate client |

So the MVP is **one adapter with a base URL, an optional key, and a model
name** — not three integrations. The local path you already built *is* the
OpenRouter path.

> ⚠️ **The existing Anthropic client is dead code.** `Web App Skeleton/src/llm/claudeInterpreter.ts`
> pins `claude-3-haiku-20240307` and `claude-sonnet-4-20250514`. Both are past
> their retirement dates as of August 2026 and return 404. Retarget to
> `claude-opus-5` (thinking on by default; `max_tokens` must leave room for it)
> before that file is trusted. Its request shape is otherwise sound.

**Bring your own key, stored locally.** No key ships in the repo, none is
proxied through a server we run, and the local paths (Ollama, LM Studio) need
no key at all — which keeps the offline-first promise honest.

---

## 4. Capability tiers, mapped to what exists

`Capability = 0 | 1 | 2 | 3` is already on every node. v7 gives the levels
meaning rather than inventing a parallel scheme:

| Tier | Who | What it may propose | Availability |
|---|---|---|---|
| **0** | `TIER0_PARTICIPANT` (the engine) | Shape readings, spatial relations, cluster candidates — all with grounded `reasoning` | Always, offline. **Never gated** |
| **1** | Local model via Ollama / LM Studio | Naming suggestions, groupings, handwriting reads | When a local server is up |
| **2** | Hosted model via OpenRouter or Anthropic | Explanations, diagram→code, composition interpretation, "why" in prose | When the user supplies a key |
| **3** | Reserved | Structural proposals (new types, schema growth) — the "extensible in what it can know" tier | Not yet built |

**The rules that make tiers safe** — all four already hold in the engine, and
v7 must not weaken any of them:

1. **Every tier proposes; no tier commits.** A model's output is an unblessed,
   attributed edge. The human blesses. Ignoring a proposal is a valid answer.
2. **Attribution is mandatory.** Every claim carries who made it and why.
   `llm:<model>` is visible in the inspector next to `tier0-heuristics`.
3. **Degrade to Tier 0, never gate on a tier.** No LLM call blocks drawing. The
   canvas is fully usable with the network off.
4. **Tiers are simultaneous, not an escalation ladder.** See below.

### 4.1 Multi-interpretation — the rule that shapes everything

**ARCHITECTURE-v6 principle 2 — *nothing wins by silencing the others* — applies
to models exactly as it applies to heuristics.** Tier 0 is already multi-parse:
every qualifying detector contributes a ranked candidate and none suppresses the
rest. The LLM tiers inherit that, in three directions at once:

- **Multiple readings *within* one model.** A model is asked for **N candidate
  interpretations with confidences and reasons**, never for "the answer". One
  arrangement can legitimately be *molecule*, *network*, and *three bubbles on
  strings* — the canvas holds all three.
- **Multiple models *within* a tier.** Two local models, or a text model and a
  VLM, can each answer and each be held. Same tier, different voices.
- **All tiers at once.** Tier 0's heuristic reading, Tier 1's local reading, and
  Tier 2's hosted reading coexist on the same node, side by side and
  distinguishable by source. **This is not an escalation ladder** — the older
  "escalate only on low confidence" policy from PRD-v4 is explicitly withdrawn,
  because escalation means suppression: it throws away a cheap reading the
  moment an expensive one arrives, and the disagreement between them is
  information the human should see.

The point isn't redundancy — **it's that disagreement is a first-class signal.**
When Tier 0 says *circle* and Tier 2 says *the letter O*, the interesting thing
is the gap. Collapsing to one answer destroys exactly what makes a grounded
substrate worth having.

**Data model: already supports this, no schema change.** `propose()` takes
`edges: ProposedEdge[]` — an array — and every edge carries its own `weight`,
`reasoning`, and `via`. Several participants can each add their own edges to the
same node. Multi-interpretation is already expressible; nothing needed writing.

**The gap is on the read side.** `topInterpretation()` returns exactly one
reading — the winner-take-all helper. It stays (surfaces need a headline), but
v7 adds a non-collapsing read path beside it:

```
interpretationsOf(node, state)  →  ranked readings, each annotated with
                                   { source, participantName, tier, weight,
                                     reasoning, blessed }
byTier(...) / bySource(...)     →  grouped views for rendering
disagreement(...)               →  where sources diverge — the signal to surface
```

Surfaces render **all** of it. A node with four readings from three sources
shows four readings from three sources.

---

## 5. What's actually missing

Honestly scoped. The engine work is small; the surface work is most of it.

| # | Gap | Where it lands |
|---|---|---|
| 1 | **An agent adapter** — session state → prompt → `propose()` calls | New: `metamedium-core/src/participants/` |
| 2 | **A serializer** — the graph as text a model can reason over (nodes, reps, edges, reasoning, attribution). This is the hypothesis's actual test surface | Core |
| 3 | **A response parser** — model output → validated `ProposedEdge[]`; malformed output is dropped, never crashes the loop | Core |
| 4 | **Transport** — one OpenAI-compatible client + the Anthropic client, both bring-your-own-key | New: `metamedium-core/src/llm/` |
| 5 | **`'code'` and `'explanation'` reps rendered** on the canvas surface | `Demos/session-engine.html` |
| 6 | **Handwriting** — strokes → text. Either a VLM (`test-vision.html`'s path) or a stroke-sequence model | Experiment first, then core |
| 7 | **Key entry + provider picker** in the surface | Surface |

Items 1–4 are the platform. 5–7 are what makes the benchmark demonstrable.

---

## 6. Staged plan

Each stage ends with something visible. No infrastructure-only weeks.

### Stage A — The agent speaks ✅ **shipped (Aug 2026)**

A model joins through `join()`/`propose()` and offers **several** readings; the
canvas holds them beside Tier 0's rather than instead of them.

What landed:

| | |
|---|---|
| `src/llm/provider.ts` | One OpenAI-compatible client (Ollama / LM Studio / OpenRouter) + an Anthropic client. Failures are **returned, never thrown** — nothing can break drawing |
| `src/participants/serialize.ts` | The graph as grounded text: geometry, relations, existing readings *and who made them*. No pixels — this is the hypothesis's test surface |
| `src/participants/agent.ts` | The adapter. Prompts for **1–N genuinely different readings**, parses tolerantly (local models fence their JSON), proposes every one |
| `src/session/interpretations.ts` | The non-collapsing read path: `interpretationsOf` / `byTier` / `bySource` / `disagreement` |
| `Demos/session-engine.html` | Provider picker, multiple models at once, readings grouped by source with a disagreement banner |

**Verified live in the browser**, two models plus the engine on one mark:

```
READS AS  3 SOURCES
  sources differ: molecule vs circle vs flowchart
  llm:qwen3                                    tier 1
    molecule 0.82   three closed shapes joined by two straight connectors
    network 0.61    nodes linked by edges
    triangle-of-bubbles 0.34
  tier0-heuristics                             tier 0
    circle 0.80     closed (overshoot), curved, smooth, aspect 1.01
  llm:hosted-model                             tier 2
    flowchart 0.75  discrete nodes with directed connectors
```

Five readings, three sources, three tiers — **nothing collapsed, nothing
committed.** 117 tests green.

**Fixed along the way:** `join()` gave every participant `capability: 0`, so
tier grouping was meaningless. It now carries a tier, derived from whether the
model runs on this machine (`providerTier`).

### Stage B — Tiers and keys

Add the provider picker: Ollama / LM Studio / OpenRouter / Anthropic, with
local-first defaults and bring-your-own-key.

**Ship criterion:** the same flow works offline on a local model and online on
a hosted one, and the inspector shows which model made each claim.

### Stage C — Ask and explain ✅ **shipped (Aug 2026)**

Circle a region, hit **Ask…**, type a question. Every model answers at once and
each answer lands **in the canvas** — a card tethered by a dashed line to the
marks it is about, labelled with who said it.

**An answer is a node**, not a chat message: attributed, positioned, erasable,
and **unblessed**. Its `about` edges are inference, so ignoring an answer is a
valid response, exactly like ignoring a summon.

New in the engine:

| | |
|---|---|
| `session.answer({participantId, question, text, aboutIds, at})` | Places an explanation node; returns its id, or `null` if the participant never joined |
| `createExplanationNode` / `isExplanation` / `explanationOf` / `aboutIdsOf` | The node shape and its readers |
| `SessionState.explanations` | **A third plane**, beside content and gesture. An answer is visible and erasable but is *not ink* — so it never joins a lasso, a cluster, or a signature |
| `agent.ask(question, nodeIds, at)` | Grounded question in, prose answer placed in the canvas |

**Verified live**, one question to two models:

> **llm:qwen3** (tier 1) — *"The two straight strokes each touch two of the
> closed shapes, which is what makes this a group rather than three separate
> marks."*
>
> **llm:hosted-model** (tier 2) — *"Every line terminates on a circle. Remove
> either line and the remaining shapes share no relation at all."*

Both cite the **relations**, not the picture — which is the ship criterion, and
the first real evidence for §1's hypothesis: neither answer would be reachable
from a screenshot without re-deriving what the canvas already knows.

**And with the model switched off**, the same flow gives
`llm:qwen3 could not answer (HTTP 503)`, places nothing, and the canonical loop
still closes to `0 loose · 1 artifact` on Tier 0 alone. Rule 3 holds under real
failure, not just in principle.

### Stage D — Diagram → code

A blessed artifact gains a `'code'` rep. Boxes and arrows become a structure;
the code is anchored to the diagram and updates when the diagram does.

**Ship criterion:** draw a flow, get runnable code, change the flow, see the
code follow.

### Stage E — Handwriting ✅ **shipped (1 Sep 2026)**

The read path landed in core without the experiment: `agent.read()` renders a
`text` mark's ink on its own and hands it to any joined model that can see
(`ProviderConfig.vision`, relayed from what Ollama and LM Studio report per
model). What comes back is held as `transcript` reps — several when ambiguous,
attributed, never blessed — through `propose()`, which now carries reps as well
as edges. The brief for generation says *the human wrote "Pricing" there* where
it used to say *handwriting you cannot read*. Verified against `qwen3.5:9b` on
Ollama; the transport's image content works on the OpenAI-compatible and
Anthropic clients alike.

**Ship criterion met:** write a word next to a shape; the palette leads with
*Name it "…"* and taking it makes the word that shape's name. Pinned in the
browser e2e (steps 13–13d). Open: one cursive stroke per word — grouping
printed letters into a word is a later step.

### Stage F — The model holds a pen ✅ **shipped (1 Sep 2026)**

The benchmark says *both contributing marks*. `agent.draw()` asks the model
what it would add, in the shape rung's vocabulary with coordinates, and draws
each shape through `addStroke` attributed to the model; its reason for each
mark is placed beside it as an answer. The vocabulary is closed on purpose —
what the model draws is exactly what the canvas can read — and `parseShapes`
drops the rest. Palette: *Ask it to draw…*. Pinned in the e2e (steps 14–14d);
verified against `qwen3:8b`.

**Where the benchmark stands.** Of its five clauses — both contributing marks,
both building library entries, questions answered in the space, a diagram
parsed into code, handwriting read — four run end to end. *Both building
library entries* is the one still open: a model can name what it reads
(`Name it "…"` comes from its transcript), but it does not yet propose a
composition as a reusable entry. That, and grouping printed letters into a
word, are the next two steps.

---

## 7. What this obsoletes

**ROADMAP's Demo v3 Step 2 — "converge doodle2-canvas + metadoodle1 into
`canvas.html`, keep doodle2's polished UI, port metadoodle1's LLM layer" — is
withdrawn.** It was written in June 2026, before v6 existed. Both monoliths
implement a mode-and-tool interaction model that v6 deliberately abandoned;
merging them would carry the old model forward and leave the no-modes engine as
the side project.

**The successor is `Demos/session-engine.html` grown up.** It is 554 lines
against their ~500KB each, it already demonstrates the canonical loop
end-to-end, and it is the only surface built on the engine. The monoliths get
archived with redirects once it reaches parity on the things they do well
(polish, touch, undo/redo).

---

## 8. Open questions

Named rather than silently assumed:

- **How much graph fits in a prompt?** A large canvas will exceed context. The
  spatial graph gives a natural answer — send the neighborhood, not the world —
  but the cutoff needs measuring, not guessing.
- **Does the hypothesis hold?** Compare the same model on the same task with
  grounded graph input vs. a rendered image (`test-vision.html` is the control).
  If pixels win, the thesis needs revisiting — that is the point of keeping the
  control case alive.
- **How does an agent's proposal decay?** Erase degrades artifacts today. An
  unblessed proposal that the human ignores should dissolve — the summon
  already does this; proposals need the same treatment.
- **Tier 3 — what may a model propose about *structure*?** Growing what the
  board can know is the most interesting claim and the least specified. It
  waits until Tiers 1–2 have produced real correction data.
