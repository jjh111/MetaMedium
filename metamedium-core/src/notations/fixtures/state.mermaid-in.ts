// stateDiagram texts to draw (V1-PLAN §3, §9 D5's state half), beside the
// goldens (state.mermaid.ts), which are the first inputs.
//
// Each text below but the hand's is written the way the state writer writes
// one — `toMermaid` of a state reading: the header, `direction LR` when it
// runs across, every state declared in reading order with its name, then
// every transition by the states it leaves and arrives at, the initial dot
// and the final ring both `[*]`. Drawn with `drawMermaid` and exported again,
// each must come back as it is, but for the ids, which are the marks' own on
// the way back (the test renames both by first appearance).
//
// Written by hand, not generated — but for the last, a seeded generator of
// random state diagrams in the same form.

import { stateText } from '../state-mermaid';
import { rng } from '../../test/strokes';

/** Every kind of thing the writer writes, running down the page: an initial, a final, loops, a way back, a fork in the road. */
export const STATE_EVERY = `stateDiagram-v2
    state "Idle" as a1
    state "Working" as a2
    state "Blocked" as a3
    state "Done" as a4
    [*] --> a1
    a1 --> a2: start
    a2 --> a2: tick
    a2 --> a3: wait
    a2 --> a4: finish
    a3 --> a2: resume
    a4 --> [*]
`;

/** The same running across the page, and loops on two states. */
export const STATE_LR = `stateDiagram-v2
    direction LR
    state "Closed" as c1
    state "Open" as c2
    state "Locked" as c3
    [*] --> c1
    c1 --> c2: open
    c1 --> c3: lock
    c2 --> c1: close
    c2 --> c2: swing
    c3 --> c1: unlock
    c3 --> c3: rattle
`;

/** Words that break Mermaid unwritten: quotes, a hash, a semicolon, markup, a percent, a backtick, a colon on a line with "style", a line break. */
export const STATE_ESCAPED = [
  'stateDiagram-v2',
  `    state "${stateText('Say "hi" & <go>')}" as e1`,
  `    state "${stateText('50% #done; `x`')}" as e2`,
  `    state "${stateText('style: two\nlines', { colons: true })}" as e3`,
  '    [*] --> e1',
  `    e1 --> e2: ${stateText('item #3; then `next`')}`,
  `    e2 --> e3: ${stateText('a: b')}`,
  `    e3 --> [*]: ${stateText('<br> & more')}`,
  '',
].join('\n');

/** No writing on the transitions, and a state with none of its own: the writer's bare forms. */
export const STATE_BARE = `stateDiagram-v2
    state "One" as b1
    state "Two" as b2
    [*] --> b1
    b1 --> b2
    b2 --> b1
    b2 --> [*]
`;

/**
 * A text a hand wrote: the old `stateDiagram` header, states named only in
 * transitions, a description as a statement, a composite with a state in it,
 * a choice, a note, a comment. Drawn back it is said the way the state writer
 * writes it.
 */
export const STATE_WRITTEN = `stateDiagram
    %% a hand wrote this
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
    Moving : on the road
    state Crash {
        Wreck --> Tow
    }
    state Fork <<choice>>
    note right of Crash : it hurt
`;

/** A random state diagram in the writer's form: an initial, each state joined to one before it, loops and a way back now and then, a final. */
export function randomStateText(seed: number, max = 6): string {
  const r = rng(seed * 5003 + 9);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const n = 2 + Math.floor(r() * (max - 1));
  const names = ['Idle', 'Loading', 'Ready', 'Running', 'Paused', 'Failed', 'Closing', 'Closed'];
  const events = ['go', 'ok', 'retry #2', 'timeout', 'stop; now', 'tick', 'error: bad', 'done', 'reset'];
  const across = r() < 0.4;
  const lines = ['stateDiagram-v2', ...(across ? ['    direction LR'] : [])];
  for (let i = 0; i < n; i++) lines.push(`    state "${stateText(names[i % names.length])}" as s${i}`);
  // Places, as the writer counts them: the initial first, the states after it in order, the final last.
  const place = (id: string) => (id === '[*]' ? 0 : id === '[*]:end' ? n + 1 : Number(id.slice(1)) + 1);
  const rels: { from: string; to: string; words: string | null }[] = [{ from: '[*]', to: 's0', words: r() < 0.3 ? pick(events) : null }];
  for (let i = 1; i < n; i++) rels.push({ from: `s${Math.floor(r() * i)}`, to: `s${i}`, words: r() < 0.8 ? pick(events) : null });
  for (let i = 0; i < n; i++) if (r() < 0.2) rels.push({ from: `s${i}`, to: `s${i}`, words: pick(events) });
  if (n > 2 && r() < 0.4) rels.push({ from: `s${n - 1}`, to: `s${Math.floor(r() * (n - 2))}`, words: pick(events) });
  if (r() < 0.7) rels.push({ from: `s${Math.floor(r() * n)}`, to: '[*]:end', words: r() < 0.5 ? pick(events) : null });
  rels.sort((a, b) => place(a.from) - place(b.from) || place(a.to) - place(b.to));
  for (const x of rels) lines.push(`    ${x.from === '[*]' ? '[*]' : x.from} --> ${x.to === '[*]:end' ? '[*]' : x.to}${x.words === null ? '' : `: ${stateText(x.words)}`}`);
  return [...lines, ''].join('\n');
}
