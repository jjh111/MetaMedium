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
// Written by hand, not generated. Ids avoid the words Mermaid's lexer reads
// as keywords at the start of an id (`end…`, `style…`, `class…`).

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
