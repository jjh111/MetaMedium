// sequenceDiagram texts to draw (V1-PLAN §3, §9 D5), beside the goldens
// (sequence.mermaid.ts), which are the first inputs.
//
// Each text below but the hand's is written the way D5's writer writes one —
// `toMermaid` of a sequence reading: the header, every participant left to
// right with its name, then every message down the page with its arrow and
// its words. Drawn with `drawMermaid` and exported again, each must come back
// as it is, but for the ids, which are the marks' own on the way back (the
// test renames both by first appearance).
//
// Written by hand, not generated — but for the last, a seeded generator of
// random sequence diagrams in the same form.

import { sequenceText } from '../sequence-mermaid';
import { rng } from '../../test/strokes';

/** Every arrow the writer writes, between neighbours and across one, and a loop each way. */
export const SEQ_EVERY_ARROW = `sequenceDiagram
    participant a1 as Client
    participant a2 as Server
    participant a3 as Store
    a1->>a2: call
    a2-->>a1: return
    a1->a2: no head
    a2-->a1: dashed, no head
    a1<<->>a3: both ways, across the server
    a3<<-->>a2: both ways, dashed
    a2->>a2: think
    a3->a3: idle
`;

/** Actors and participants mixed: a stick figure at each end, a box between. */
export const SEQ_ACTORS = `sequenceDiagram
    actor u1 as Customer
    participant u2 as Shop
    actor u3 as Courier
    u1->>u2: order
    u2->>u3: ship
    u3-->>u1: deliver
`;

/** Words that break Mermaid unwritten: a hash, a semicolon, markup, quotes, a percent, a backtick, a leading wrap:, a line break. */
export const SEQ_ESCAPED = [
  'sequenceDiagram',
  `    participant e1 as ${sequenceText('A & B <team>')}`,
  `    participant e2 as ${sequenceText('50% "done"')}`,
  `    e1->>e2: ${sequenceText('item #3; then `next`')}`,
  `    e2-->>e1: ${sequenceText('wrap: this')}`,
  `    e1->>e1: ${sequenceText('two\nlines')}`,
  '',
].join('\n');

/**
 * A text a hand wrote: participants named only in the messages, an
 * activation, a note, a loop, numbering, a cross and an async head. Drawn back
 * it is said the way D5 writes it.
 */
export const SEQ_WRITTEN = `sequenceDiagram
    autonumber
    Alice->>+John: Hello John, how are you?
    Note right of John: thinking
    loop Every minute
        John-->>Alice: Great!
    end
    John-)Alice: See you later
    Alice-xJohn: bye
    deactivate John
`;

/** A random sequence diagram in the writer's form: participants left to right, messages down the page. */
export function randomSequenceText(seed: number, max = 8): string {
  const r = rng(seed * 6007 + 11);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const n = 2 + Math.floor(r() * 4);
  const names = ['Browser', 'Gateway', 'Auth', 'Orders', 'Ledger', 'Queue', 'Mailer', 'Cache'];
  const words = ['GET /cart', 'token?', 'ok', 'place order', 'debit 12.50', 'enqueue', 'sent', 'miss', 'hit; stale', 'retry #2', 'done'];
  const lines = ['sequenceDiagram'];
  for (let i = 0; i < n; i++) lines.push(`    ${r() < 0.25 ? 'actor' : 'participant'} p${i} as ${sequenceText(names[i])}`);
  const m = 1 + Math.floor(r() * max);
  let crossed = false;
  for (let k = 0; k < m; k++) {
    const a = Math.floor(r() * n);
    let b = Math.floor(r() * n);
    const self = r() < 0.15;
    if (self) b = a;
    else if (b === a) b = (a + 1) % n;
    if (!self && Math.abs(a - b) > 1) crossed = true;
    const arrow = self ? pick(['->>', '->']) : pick(['->>', '->>', '-->>', '->', '-->', '<<->>']);
    lines.push(`    p${a}${arrow}p${b}: ${sequenceText(pick(words))}`);
  }
  void crossed;
  return [...lines, ''].join('\n');
}
