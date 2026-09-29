// mindmap texts to draw (V1-PLAN §3, §9 D6), beside the goldens
// (mindmap.mermaid.ts), which are the first inputs.
//
// Each text below but the hand's is written the way the mind-map writer writes
// one — `toMermaid` of a mind-map reading: the header, the tree as
// indentation, each node its id and its quoted words in its shape's brackets,
// the branches in the order a hand reads round a node. Drawn with `drawMermaid`
// and exported again, each must come back as it says, but for the ids, which
// are the marks' own on the way back (the test compares what each text says:
// the root, and every node with its words, its shape and its place among its
// parent's branches).
//
// A tree drawn round its root reads back rooted at its most central node, so
// each text here has its root as central as the tree allows: no branch of it
// holds half the nodes.
//
// Written by hand, not generated — but for the last, a seeded generator of
// random mind maps whose only promise is that what it says comes back.

import { mermaidString } from '../mermaid';
import { rng } from '../../test/strokes';

/** Every kind of thing the writer writes: a circle and boxes, three levels, a branch with leaves and a leaf alone. */
export const MINDMAP_EVERY = `mindmap
    a1(("Plan"))
        a2["Read"]
            a4["Books"]
            a5["Papers"]
        a3(("Write"))
            a6["Draft"]
        a7["Ship"]
`;

/** A wide one: a root with five branches, each a leaf. */
export const MINDMAP_WIDE = `mindmap
    w1(("Week"))
        w2["Mon"]
        w3["Tue"]
        w4(("Wed"))
        w5["Thu"]
        w6["Fri"]
`;

/** Words that break Mermaid unwritten: quotes, a hash, a semicolon, markup, a percent, a backtick, a colon on a line with "style", a line break. */
export const MINDMAP_ESCAPED = [
  'mindmap',
  `    e1((${mermaidString('Say "hi" & <go>')}))`,
  `        e2[${mermaidString('50% #done; `x`')}]`,
  `        e3[${mermaidString('style: two\nlines', { colons: true })}]`,
  `        e4[${mermaidString('a: b')}]`,
  '',
].join('\n');

/**
 * A text a hand wrote: the header on its own line and the indentation two
 * spaces, words with no shape, an id and a rounded box, an icon, a class, a
 * second root and what is under it, a comment. Drawn back it is said the way
 * the mind-map writer writes it.
 */
export const MINDMAP_WRITTEN = `mindmap
  %% a hand wrote this
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
    Research
      On effectiveness<br/>and features
      On Automatic creation:::urgent
    Tools
      id1[Pen and paper]
      id2(Mermaid)
  Second root
    Inside it
`;

/** A random mind map in the writer's form: a root with at least two branches, none of them half the tree, circles and boxes, every word its own. */
export function randomMindMapText(seed: number, max = 8): string {
  const r = rng(seed * 7001 + 3);
  const words = ['Plan', 'Read', 'Write', 'Ship', 'Books', 'Papers', 'Draft', 'Notes #2', 'Talk; slowly', 'Ideas: new', 'Budget', 'Team'];
  for (let attempt = 0; attempt < 200; attempt++) {
    const n = 4 + Math.floor(r() * (max - 3));
    const parent: number[] = [-1];
    for (let i = 1; i < n; i++) parent.push(r() < 0.35 ? 0 : Math.floor(r() * i));
    const kids = (i: number) => parent.map((p, k) => (p === i ? k : -1)).filter((k) => k >= 0);
    const size = (i: number): number => 1 + kids(i).reduce((a, k) => a + size(k), 0);
    // The root is the tree's centroid: no branch holds half of it; and nothing fans wider than four.
    if (kids(0).length < 2 || kids(0).some((k) => size(k) * 2 >= n) || parent.some((_, i) => kids(i).length > 4)) continue;
    const order = [...Array(n).keys()].sort(() => r() - 0.5);
    const shape = () => (r() < 0.4 ? (['((', '))'] as const) : (['[', ']'] as const));
    const lines = ['mindmap'];
    const walk = (i: number, level: number) => {
      const [open, close] = shape();
      lines.push(`${'    '.repeat(level)}m${i}${open}${mermaidString(words[order[i] % words.length] + (order[i] >= words.length ? ` ${order[i]}` : ''))}${close}`);
      kids(i).forEach((k) => walk(k, level + 1));
    };
    walk(0, 1);
    return [...lines, ''].join('\n');
  }
  throw new Error(`no balanced tree for seed ${seed}`);
}
