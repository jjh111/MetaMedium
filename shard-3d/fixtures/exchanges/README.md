# exchanges — the brief as sent, and the reply as received

One file per **model per board**: what the shard actually sent, what actually
came back, verbatim and unrepaired, and what became of it.

They exist because a contract argued about in prose is a contract nobody has
tested. `src/namedparts.test.ts` reads **every** file in this directory and pins
that its reply still parses into the contract it claims, that what it says
landed is what lands, and that nothing here quietly drifts when the prompt is
edited. The e2e drives the loop with the **stub** and the **ideal**.

They are read as **modules**, not off the disk — `import.meta.glob('../fixtures/exchanges/*.json', { eager: true })`,
the same rule `export.test.ts` follows and the reason `resolveJsonModule` is on:
the shard's tests carry no node types, so a fixture travels with the bundle it is
imported into. A new file here is covered the moment it lands; nothing has to be
added to the test.

They are the same evidence the panel's *model* section shows on a live board
(`src/exchange.ts`, G0's transcript) — kept, rather than dropped after eight.

## What is here

| File | Board | Contract | What it shows |
|---|---|---|---|
| `castle-sketch.stub.json` | `?demo=castle-sketch` | parts | The e2e's own reply, deliberately imperfect: a colour outside the closed list, a part id the hull does not have, an op outside the part vocabulary. All three dropped and counted; what could be used still lands |
| `castle-sketch.ideal.json` | `?demo=castle-sketch` | parts | Written by hand — what a perfect answer looks like. Every part named from the human's own words, one colour word each, two small ops by part id. Show this to a model that is drifting |
| `castle-sketch.qwen3-8b.json` | `?demo=castle-sketch` | parts | **The real thing**, through Ollama on this machine: strict JSON first time in 42 s, both parts named and painted, nothing repaired, nothing dropped — and two honest faults worth reading, in the file's own `why` |
| `john-2026-09-16-massing.qwen3-8b.json` | `?fixture=john-2026-09-16-massing` | steps-and-profiles | The **other** contract, same model, same day: a board with a massing and no parts takes the long brief, and the answer is 610 characters of geometry against the castle's 187 of names. The case for G3, measured |

## The shape of a file

```json
{
  "board":    "castle-sketch",
  "how":      "how to stand that board up again",
  "contract": "parts" | "steps-and-profiles",
  "words":    "what the human typed",
  "partsOffered": ["part:1", "part:2"],
  "model":    "qwen3:8b",
  "through":  "where it was asked",
  "at":       "2026-09-16",
  "ms":       42400,
  "system":   "the system prompt, as sent",
  "brief":    "the brief, as sent",
  "reply":    "the reply, AS RECEIVED — before any repair",
  "repaired": false,
  "landed":   { "named": [], "painted": [], "steps": 0, "dropped": [] },
  "why":      "what this exchange is evidence of"
}
```

`reply` is a **string**, never an object: a reply is text until it parses, and
half the value of keeping one is the text that did not.

## Adding a model's exchange

1. Stand the board up in a tab — `?demo=castle-sketch` or `?fixture=<name>` —
   and wait for the hull to stand.
2. Take the brief and the system prompt the shard would send, in the console:

   ```js
   const S = window.__shard;
   const id = S.solids()[0].id;
   const parts = S.parts(id).map((p) => p.id);
   const brief = S.brief('castle with green tops');
   const { messagesFor } = await import('/src/generator.ts');
   const [sys, user] = messagesFor(brief, 'castle with green tops', { parts: parts.length > 0 });
   copy(JSON.stringify({ brief, parts, system: sys.content, user: user.content }));
   ```

3. Ask the model those two messages and keep the reply **verbatim**. A local one
   through Ollama's `/v1/chat/completions`; a hosted one however it is reached.
   Do not tidy the text — the repairs are the parser's business and whether one
   was needed is exactly what the fixture records.
4. Land it, to see what it does: `S.joinStub([raw], '<model>')`, select the
   solid, type the words, and read `S.parts(id)` and `S.exchanges()[0]`.
5. Write the file as above. `repaired` is true when the reply needed core's own
   repairs (a template literal, a trailing comma) to read at all.

**John will add `z-ai/glm-5.3-flash`** through OpenRouter, which joins by key in
the model pane — a key never leaves the device, so no agent can add that one.
