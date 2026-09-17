// ===== exchange =====
// **The transcript: what was sent, what came back, and what became of it.**
//
// G0's third fault (`SHARD-3D-PUSH-2.md` §0): *what was sent and what came back
// are invisible*. John joined `z-ai/glm-5.3-flash`, typed *castle with green
// tops*, the model worked, and nothing happened — the model was reached, the
// reply was dropped, and the only word about it was one sentence at the bottom
// of the screen that faded after six seconds.
//
// So every exchange with a model is recorded here: who was asked, the brief as
// sent, the human's words, the reply as received **verbatim**, what parsed,
// what was dropped and why, the outcome, and how long it took.
//
// **This is runtime, not the log.** The deliberate decision of the package, and
// it follows invariant 4 rather than bending it: what a reply *did* is already
// in the log — the version, the profiles it drew, the steps it named, each
// attributed and each undoable. The transcript is **evidence about an exchange**,
// not state of the board, and a board replayed from its log must derive the same
// drawing whether or not anyone ever saw the prompt that helped make it. Putting
// the brief in the log would also put a model's whole reply into every export,
// every merge and every other hand's copy of the board, which is a lot of text
// nobody drew. It is kept for the last few exchanges and then it is gone, the
// way a status line is gone — except that these last few are there to be read.
//
// Pure: no DOM, no network, no clock of its own beyond the one handed in.

/** What a reply turned out to be, once the shard had tried to use it. */
export type Outcome =
  /** Asked, and still waiting — the row a model at work stands as. */
  | 'asking'
  /** It landed: a version, a placement, a massing stood. */
  | 'applied'
  /** It came back and the shard would not use it, with the reason. */
  | 'refused'
  /** It never came back: the transport failed, or Esc stopped it. */
  | 'failed';

/** What the shard could read out of a reply, counted — never the reply's own claim. */
export interface ParsedFacts {
  steps: number;
  profiles: number;
  /** G3: how many parts the reply said something about — the hull contract's own count. */
  parts?: number;
  /** The model answering *the library already holds this* (v9 S5's rule). */
  reuse?: string;
}

export interface Exchange {
  id: string;
  /** The model's name, or who stood in for one when nothing was asked. */
  who: string;
  /** *the brief*, *the regen*, *what a phrase means* — the task, in the words the work label uses. */
  what: string;
  /** The human's own words, as typed. */
  words: string;
  /** The brief as SENT. Verbatim: it is the thing a model's answer is an answer to. */
  brief: string;
  /** When it was asked, and how long it took to come back (absent while asking). */
  askedAt: number;
  ms?: number;
  /** The reply as RECEIVED, before any repair. Absent when nothing came back. */
  reply?: string;
  /** What parsed out of it. */
  parsed?: ParsedFacts;
  /** What was dropped, and why — the generator's own sentences, never summarised. */
  dropped: string[];
  outcome: Outcome;
  /** Why it ended that way, in the same words the status line said. */
  reason: string;
}

/**
 * How many exchanges are kept. §5 leaves the number to John; eight is a
 * working session's worth — enough to see a brief, a regen and a retry
 * together, and few enough that the disclosure is still a list.
 */
export const KEEP = 8;

export interface Transcript {
  /**
   * Record that a model is being asked. Returns the id every later call names,
   * so an exchange that is still in flight is already a row.
   */
  asked(a: { who: string; what: string; words: string; brief: string; at?: number }): string;
  /** What came back, verbatim, and what the shard could read out of it. */
  came(id: string, a: { reply?: string; parsed?: ParsedFacts; dropped?: string[] }): void;
  /** How it ended. Every exit path calls this, with the sentence the hand was told. */
  ended(id: string, outcome: Outcome, reason: string, at?: number): void;
  /**
   * One call for an exchange that never reached a model at all — no seat, or
   * nothing on the board to fill. It is still an exchange the hand attempted,
   * and the whole point of G0 is that it leaves a trace.
   */
  refused(a: { who: string; what: string; words: string; brief?: string; reason: string; at?: number }): string;
  /** Newest first. */
  all(): Exchange[];
  clear(): void;
}

export function createTranscript(keep = KEEP): Transcript {
  const held: Exchange[] = [];
  let n = 0;

  /** Oldest first in memory; `all` reverses. The cap drops the oldest. */
  function push(ex: Exchange): string {
    held.push(ex);
    while (held.length > keep) held.shift();
    return ex.id;
  }

  const find = (id: string) => held.find((e) => e.id === id) ?? null;

  return {
    asked(a) {
      return push({
        id: `exchange:${++n}`,
        who: a.who,
        what: a.what,
        words: a.words,
        brief: a.brief,
        askedAt: a.at ?? Date.now(),
        dropped: [],
        outcome: 'asking',
        reason: 'asked; still waiting',
      });
    },
    came(id, a) {
      const ex = find(id);
      if (!ex) return;
      if (a.reply !== undefined) ex.reply = a.reply;
      if (a.parsed) ex.parsed = a.parsed;
      if (a.dropped?.length) ex.dropped = [...a.dropped];
    },
    ended(id, outcome, reason, at) {
      const ex = find(id);
      if (!ex) return;
      ex.outcome = outcome;
      ex.reason = reason;
      ex.ms = Math.max(0, (at ?? Date.now()) - ex.askedAt);
    },
    refused(a) {
      const at = a.at ?? Date.now();
      return push({
        id: `exchange:${++n}`,
        who: a.who,
        what: a.what,
        words: a.words,
        brief: a.brief ?? '',
        askedAt: at,
        ms: 0,
        dropped: [],
        outcome: 'refused',
        reason: a.reason,
      });
    },
    all: () => [...held].reverse(),
    clear: () => {
      held.length = 0;
    },
  };
}

/** The row's own line: *glm · the brief · applied · 2.4 s*. */
export function describeExchange(ex: Exchange): string {
  const when = ex.ms === undefined ? 'asking…' : ex.ms >= 1000 ? `${(ex.ms / 1000).toFixed(1)} s` : `${ex.ms} ms`;
  return `${ex.who} · ${ex.what} · ${ex.outcome} · ${when}`;
}
