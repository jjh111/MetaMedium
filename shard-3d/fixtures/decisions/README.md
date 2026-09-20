# decisions — what a decision seat was asked, and what it said

The third kind of fixture. A **board** fixture stands a drawing up; an
**exchange** fixture pins the contract a model writes in; a **decision** fixture
pins what a *decision-only* seat was asked and what came back — typed questions
in, a typed value out, with no prose anywhere in it.

The seat is `metamedium-core/src/participants/decide.ts`; the questions and the
harness are `shard-3d/src/decide.ts`; `src/decide.test.ts` reads this directory
and holds the rendered table against the file, so neither can drift quietly.

## The shape of a file

```json
{
  "board":   "castle-sketch",
  "how":     "how to stand that board up again",
  "words":   "what the human typed",
  "seat":    "who answered — and whether it was a stub",
  "book":    { "<question id>": { "pick": "…", "p": 0.0 } },
  "batchMs": 1,
  "table":   ["the measurement, line by line, without the timing line"],
  "why":     "what this fixture is evidence of"
}
```

`book` is the **stub's** written-down answers, one per question id. Three forms,
one per question type, and a fourth that says nothing led:

| entry | means |
|---|---|
| `{"pick":"green","p":0.74}` | a **Choice**: that candidate leads at that probability, the rest share the remainder |
| `{"level":"most of them","p":0.6}` | a **Score**: that level leads, and the expectation follows from the distribution |
| `{"yes":0.88}` | a **Noul**: probability-of-yes, and nothing beside it |
| `{"flat":true}`, or simply no entry at all | nothing led — the ask-the-human path |

`table` holds every line the harness printed **except the timing one**, because
a batch takes however long it takes and a number that changes on every run is
not evidence of anything. `batchMs` is what one run measured, for scale only.

## What is here

| File | Board | Seat | What it shows |
|---|---|---|---|
| `castle-sketch.stub.json` | `fixtures/john-2026-09-16-castle-sketch.mm.log` | the stub | Sixteen questions over John's first board: a shape and a role for each of the four marks, and a name, a material, a score and a noul for each of the two parts. Four come back flat and are held nowhere. The engine has a reading of its own for seven of them |

## The one thing that must be said about these numbers

**They are stub numbers.** The stub answers from the book above; it is a table
on a piece of paper with a `Promise` around it. The measurement therefore says
what the harness measures, what the batching costs, and where the flat path
runs — and **nothing whatever** about how well any decision model would answer
these questions. Nobody may quote a row here as a model's performance, and the
table says `answered by the stub` at the top so that it cannot be quoted by
accident.

## Adding a seat's own file

A real seat is a `DecideTransport` — one function, questions in, typed answers
out. When there is one, run the same harness against it, keep what it said
verbatim, and write the file with `seat` naming it and `book` left out (a book
is the stub's, not a seat's). Nothing in this directory reaches the network and
nothing added to it may.
