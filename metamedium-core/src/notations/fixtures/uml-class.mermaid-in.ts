// classDiagram texts to draw (V1-PLAN §3, §9 D4), beside the goldens
// (uml-class.mermaid.ts), which are the first inputs.
//
// Each text below is written the way D4's writer writes one — `toMermaid` of
// a class-diagram reading: the header, `direction LR` when the relations run
// across, every class in the drawing's reading order with its members
// (attributes, then methods), then the relations by the classes they join,
// each from the class at its marked end. Drawn with `drawMermaid` and exported
// again, each must come back as it is, but for the ids, which are the marks'
// own on the way back (the test renames both by first appearance).
//
// Written by hand, not generated — but for the last, a seeded generator of
// random class diagrams in the same form.

import { mermaidString } from '../mermaid';
import { memberLine } from '../uml-class-mermaid';
import { rng } from '../../test/strokes';

/** Across: a customer places orders, an order is made of items. */
export const CLASS_LR = `classDiagram
    direction LR
    class c1["Customer"] {
        +name: String
    }
    class c2["Order"] {
        +date: Date
        +total() Money
    }
    class c3["Item"]
    c1 "1" --> "*" c2 : places
    c2 "1" *-- "1..*" c3
`;

/** Every relation a class diagram reads: composition, aggregation and inheritance from one class — three ends spread along its side — then an association and a plain link. */
export const CLASS_EVERY_RELATION = `classDiagram
    class a1["Vehicle"] {
        +start()
    }
    class a2["Engine"]
    class a3["Wheel"]
    class a4["Car"] {
        -seats: int
    }
    class a5["Driver"]
    class a6["Garage"]
    a1 *-- a2
    a1 o-- a3
    a1 <|-- a4
    a4 --> a5
    a4 -- a6
`;

/** A relation that skips a rank: the whole reaches past its child to its grandchild, bowing around the child. */
export const CLASS_AROUND = `classDiagram
    class t1["Document"]
    class t2["Section"]
    class t3["Paragraph"]
    t1 <|-- t2
    t1 "1" *-- "*" t3
    t2 <|-- t3
`;

/** Words that break Mermaid unwritten: quotes, a hash, angle brackets, braces, brackets, a tilde, a colon on a line with "style", a semicolon. */
export const CLASS_ESCAPED = [
  'classDiagram',
  `    class e1[${mermaidString('Say "hi" & <go>')}] {`,
  `        ${memberLine('+map: Map<K, V>', 'attribute')}`,
  `        ${memberLine('-items[] {cached}', 'attribute')}`,
  `        ${memberLine('~pkg: a~b', 'attribute')}`,
  `        ${memberLine('+style: #fff;', 'attribute', { colons: true })}`,
  `        ${memberLine('+get(key) V', 'method')}`,
  '    }',
  `    class e2[${mermaidString('Store (50%)')}]`,
  `    e1 --> e2 : ${'uses #58; sometimes'}`,
  '',
].join('\n');

/**
 * A text a hand wrote: `class` with no label, members as statements, a body,
 * the triangle written on the right, a dashed dependency, a comment, a note.
 * Drawn back it is said the way D4 writes it: `CLASS_WRITTEN_SAID`.
 */
export const CLASS_WRITTEN = `classDiagram
    %% a hand wrote this
    note "an animal kingdom"
    class Animal
    Animal : +int age
    Animal : +isMammal()
    class Duck{
        +String beakColor
        +swim()
    }
    Duck --|> Animal
    Duck ..> Water : drinks
`;

/** A random class diagram in the writer's form: each class after the first joined to one before it. */
export function randomClassText(seed: number, max = 8): string {
  const r = rng(seed * 7717 + 3);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const n = 2 + Math.floor(r() * (max - 1));
  const names = ['Account', 'Ledger', 'Entry', 'Payee', 'Budget', 'Report', 'Rule', 'Tag', 'Card', 'Bank', 'Rate', 'Goal'];
  const attrs = ['+id: int', '-name: String', '#total: Money', '+open: bool', '-due: Date'];
  const methods = ['+post()', '+close() bool', '-audit(x)', '+sum() Money'];
  const cards = ['1', '*', '0..1', '1..*'];
  const lines = ['classDiagram'];
  for (let i = 0; i < n; i++) {
    const a = attrs.filter(() => r() < 0.3), m = methods.filter(() => r() < 0.25);
    const head = `    class x${i}[${mermaidString(names[i % names.length])}]`;
    if (a.length + m.length) lines.push(`${head} {`, ...a.map((x) => `        ${memberLine(x, 'attribute')}`), ...m.map((x) => `        ${memberLine(x, 'method')}`), '    }');
    else lines.push(head);
  }
  // A tree: each class joined to one written before it, from the earlier one — the writer's order is then the text's.
  const rels: { p: number; i: number; line: string }[] = [];
  for (let i = 1; i < n; i++) {
    const p = Math.floor(r() * i);
    const kind = pick(['<|--', '*--', 'o--', '-->', '--'] as const);
    const cp = r() < 0.3 && kind !== '<|--' ? ` ${mermaidString(pick(cards))}` : '';
    const ci = r() < 0.3 && kind !== '<|--' ? `${mermaidString(pick(cards))} ` : '';
    rels.push({ p, i, line: `    x${p}${cp} ${kind} ${ci}x${i}` });
  }
  rels.sort((a, b) => a.p - b.p || a.i - b.i);
  return [...lines, ...rels.map((x) => x.line), ''].join('\n');
}
