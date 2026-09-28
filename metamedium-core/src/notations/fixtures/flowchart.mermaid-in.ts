// Mermaid texts to draw (V1-PLAN §3, §9 D3), beside D2's goldens
// (flowchart.mermaid.ts), which are the first two inputs.
//
// Each text below is written the way D2 writes one — `toMermaid` of a
// flowchart reading: the header, every node on a line of its own in the
// drawing's reading order (rows down the page, each row left to right; or
// columns across for LR), then the links grouped by the node each leaves, in
// the same order; every label quoted. Drawn with `drawMermaid` and exported
// again, each must come back as it is, but for the ids, which are the marks'
// own on the way back (the test renames both by first appearance).
//
// Written by hand, not generated — but for the last, a seeded generator of
// random charts in the same form. Ids avoid the words Mermaid's lexer reads
// as keywords at the start of an id (`end…`, `style…`, `class…`).

import { mermaidString } from '../mermaid';
import { rng } from '../../test/strokes';

/** Runs across: a decision's two branches stand one above the other in the fourth column. */
export const MERMAID_LR = `flowchart LR
    t1(["Order in"])
    p1["Check stock"]
    q1{"In stock?"}
    p2["Ship it"]
    d1[/"Backorder slip"/]
    e1(((" ")))
    t1 --> p1
    p1 --> q1
    q1 -->|"yes"| p2
    q1 -->|"no"| d1
    p2 --> e1
    d1 --> e1
`;

/**
 * Labelled links, both ways: labels written `-- … -->` and `-->|…|`, quoted
 * and not, and a pair of labelled links running both ways between two nodes.
 * Written by a hand, not by D2 — so it is `graph TB`, its labels bare, its
 * nodes declared where they are first linked — and drawn back it is said the
 * way D2 says it: `MERMAID_LABELS`.
 */
export const MERMAID_LABELS_WRITTEN = `graph TB
    %% labelled links, written both ways
    A[Ask a question] -- ask --> B{Is it clear?}
    B -->|yes| C[Answer it]
    B -- "no: say why" --> D[Ask again]
    C --- E([Done])
    D -->|again| B
`;

/** `MERMAID_LABELS_WRITTEN` as D2 writes it — and as it must come back when drawn from either. */
export const MERMAID_LABELS = `flowchart TD
    A["Ask a question"]
    B{"Is it clear?"}
    C["Answer it"]
    D["Ask again"]
    E(["Done"])
    A -->|"ask"| B
    B -->|"yes"| C
    B -->|"no: say why"| D
    C --- E
    D -->|"again"| B
`;

/** A cycle: the last flow runs back to the first node. */
export const MERMAID_CYCLE = `flowchart TD
    p1["Draw a mark"]
    q1{"Does it read?"}
    p2["Name it"]
    p3["Draw it again"]
    p1 --> q1
    q1 -->|"yes"| p2
    q1 -->|"no"| p3
    p3 --> p1
`;

/** Every shape the flowchart has, and every link it draws: `-->`, `<-->` and `---` (this one back up the page). */
export const MERMAID_EVERY_SHAPE = `flowchart TD
    s1(("go"))
    t1(["Begin"])
    d1[/"Read the input"/]
    p1["Work on it"]
    q1{"Done?"}
    e1((("stop")))
    p2["Log it"]
    s1 --> t1
    t1 --> d1
    d1 <--> p1
    p1 --> q1
    q1 -->|"yes"| e1
    q1 -->|"no"| p2
    p2 --- p1
`;

/** Labels that break Mermaid unquoted, as D2 escapes them — each must be drawn as the words it says. */
export const MERMAID_ESCAPED = `flowchart TD
    p1["Parse #quot;a|b#quot; [x] {y} (z)"]
    q1{"x #gt; 0 #amp; y #lt; 1?"}
    p2["50#37; off<br>today"]
    p3["#35;1 #96;code#96;"]
    p1 --> q1
    q1 -->|"yes | (default)"| p2
    q1 -->|"no {else}"| p3
`;

// ===== Random charts, written as D2 writes them =====


/** Words a random chart's symbols and flows say — among them every character D2 escapes, and a line break. */
const WORDS = ['Start', 'Read the order', 'In stock?', 'Ship it', 'x > 0 & y < 1?', '50% off', 'yes', 'no', 'Parse "a|b" [x]', 'a much longer label that runs on', 'one\ntwo', '#1 `code`', ''];
const CORE: [string, string][] = [['[', ']'], ['{', '}'], ['([', '])'], ['[/', '/]']];

/**
 * A seeded chart of 3 to `most` nodes as D2 would write it: every node on a
 * line of its own, in the order it is to be read, then the links sorted by
 * the nodes they join. Links run mostly forward in the text, some back (so
 * there are cycles), as -->, --- or <-->, some labelled. Every node is
 * joined; a start circle only where every link at it leaves by -->, an end
 * circle only where every link arrives by --> (a flowchart reads a circle by
 * its flows); at least one symbol is not a circle. TD, or LR one time in
 * three.
 */
export function randomFlowchartText(seed: number, most = 12): string {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const n = 3 + Math.floor(r() * (most - 2));
  const links: { a: number; b: number; arrow: string; label?: string }[] = [];
  const m = n - 1 + Math.floor(r() * n);
  for (let k = 0; k < m; k++) {
    let a = Math.floor(r() * n), b = Math.floor(r() * n);
    if (a === b) continue;
    if (r() < 0.75 && a > b) [a, b] = [b, a];
    const arrow = r() < 0.75 ? '-->' : r() < 0.6 ? '---' : '<-->';
    links.push({ a, b, arrow, ...(r() < 0.3 ? { label: pick(WORDS.filter(Boolean)) } : {}) });
  }
  for (let i = 1; i < n; i++) if (!links.some((l) => l.a === i || l.b === i)) links.push({ a: i - 1, b: i, arrow: '-->' });
  const shape = Array.from({ length: n }, (_, i) => {
    const at = links.filter((l) => l.a === i || l.b === i);
    if (at.length && at.every((l) => l.arrow === '-->' && l.a === i) && r() < 0.5) return ['((', '))'];
    if (at.length && at.every((l) => l.arrow === '-->' && l.b === i) && r() < 0.5) return ['(((', ')))'];
    return pick(CORE);
  });
  if (shape.every((s) => s[0].startsWith('(('))) shape[0] = ['[', ']'];
  const lines = [`flowchart ${r() < 0.67 ? 'TD' : 'LR'}`];
  shape.forEach(([open, close], i) => lines.push(`    n${i}${open}${mermaidString(open.startsWith('((') ? pick(['go', 'stop', '']) : pick(WORDS))}${close}`));
  links.sort((p, q) => p.a - q.a || p.b - q.b);
  for (const l of links) lines.push(`    n${l.a} ${l.arrow}${l.label ? `|${mermaidString(l.label)}|` : ''} n${l.b}`);
  return lines.join('\n') + '\n';
}
