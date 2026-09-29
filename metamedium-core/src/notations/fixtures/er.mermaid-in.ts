// erDiagram texts to draw (V1-PLAN §3, §9 D6), beside the goldens
// (er.mermaid.ts), which are the first inputs.
//
// Each text below but the hand's is written the way the ER writer writes one —
// `toMermaid` of an ER reading: the header, `direction LR` when it runs
// across, every entity declared in reading order with its name, then every
// relationship by the entities it joins, each end the crow's-foot token its
// writing says and its verb quoted. Drawn with `drawMermaid` and exported
// again, each must come back as it is, but for the ids, which are the marks'
// own on the way back (the test renames both by first appearance).
//
// Written by hand, not generated — but for the last, a seeded generator of
// random ER diagrams whose only promise is that what it says comes back: the
// same entities, the same relationships, the same cardinalities and verbs.

import { mermaidString } from '../mermaid';
import { rng } from '../../test/strokes';

/** Every cardinality the writer writes, at both sides of a line, running down the page: one, zero or one, zero or more, one or more. */
export const ER_EVERY = `erDiagram
    a1["Author"]
    a2["Book"]
    a3["Review"]
    a4["Shelf"]
    a1 ||--o{ a2 : "writes"
    a2 ||--|{ a3 : "gets"
    a2 |o--o| a4 : "sits on"
`;

/** The same running across the page, a chain. */
export const ER_LR = `erDiagram
    direction LR
    c1["Team"]
    c2["Player"]
    c3["Contract"]
    c4["Sponsor"]
    c1 ||--|{ c2 : "signs"
    c2 ||--o| c3 : "holds"
    c3 }o--o{ c4 : "funded by"
`;

/** Words that break Mermaid unwritten: quotes, a hash, a semicolon, markup, a percent, a backtick, a colon on a line with "style", a line break. */
export const ER_ESCAPED = [
  'erDiagram',
  `    e1[${mermaidString('Say "hi" & <go>')}]`,
  `    e2[${mermaidString('50% #done; `x`')}]`,
  `    e3[${mermaidString('style: two\nlines', { colons: true })}]`,
  `    e1 ||--o{ e2 : ${mermaidString('item #3; then `next`')}`,
  `    e1 ||--o{ e3 : ${mermaidString('a: b')}`,
  `    e2 }o--o{ e3 : ${mermaidString('<br> & more')}`,
  '',
].join('\n');

/** No verbs, the writer's bare form: `""`. */
export const ER_BARE = `erDiagram
    b1["One"]
    b2["Two"]
    b3["Three"]
    b1 ||--o{ b2 : ""
    b1 ||--o{ b3 : ""
`;

/**
 * A text a hand wrote: names only in relationships, an alias, an attribute
 * block and a one-line block, a non-identifying `..` relationship, the words
 * Mermaid takes for a cardinality, a comment. Drawn back it is said the way
 * the ER writer writes it.
 */
export const ER_WRITTEN = `erDiagram
    %% a hand wrote this
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email PK
    }
    ORDER }|..|{ PRODUCT : "ordered in"
    INVOICE one or more to zero or more PRODUCT : billed
    PRODUCT { int id }
    LINE-ITEM["Line item"]
    title Orders
`;

/** A random ER diagram in the writer's form: each entity joined to one before it, a cardinality at each end, most with a verb. */
export function randomErText(seed: number, max = 6): string {
  const r = rng(seed * 6007 + 5);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const n = 2 + Math.floor(r() * (max - 1));
  const names = ['Customer', 'Order', 'Line item', 'Invoice', 'Product', 'Supplier', 'Shipment', 'Address'];
  const verbs = ['places', 'contains', 'bills', 'ships to #2', 'supplies; often', 'lives at', 'refers: to'];
  const cards = [['||', '||'], ['|o', 'o|'], ['}o', 'o{'], ['}|', '|{']] as const;
  const across = r() < 0.4;
  const lines = ['erDiagram', ...(across ? ['    direction LR'] : [])];
  for (let i = 0; i < n; i++) lines.push(`    e${i}[${mermaidString(names[i % names.length])}]`);
  const rels: { from: number; to: number }[] = [];
  for (let i = 1; i < n; i++) rels.push({ from: across ? Math.floor(r() * i) : i - 1 - Math.floor(r() * Math.min(i, 1)), to: i });
  for (const x of rels) {
    const [left] = pick(cards), [, right] = pick(cards);
    lines.push(`    e${x.from} ${left}--${right} e${x.to} : ${r() < 0.8 ? mermaidString(pick(verbs)) : '""'}`);
  }
  return [...lines, ''].join('\n');
}
