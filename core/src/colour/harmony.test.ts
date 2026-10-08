// Where a hue is placed (V1-SPEC KN3a). Hue is the kind and its kin: a kind takes the hue its person names, or goes
// where it is easiest to tell from every kind held; kin stand beside what they are kin to, opposites across the
// wheel, a kind of something keeps its hue and goes a step toward the ground. The hue is kept by the act that
// chose it — a kind made later never moves an older one, and a relation moves only the later kind and what
// follows it. The invariant: hue means kind, and nothing but the person, or a relation between kinds, moves it.
import { describe, it, expect } from 'vitest';
import {
  emptyLens,
  kindsOf,
  applyAct,
  holdKind,
  holdRelation,
  familyOf,
  nameHue,
  signalPenalty,
  type Lens,
  type KindAct,
  type KindHold,
  type Relation,
} from './harmony';
import { colourOf, makePalette, GROUND_NAMES, DEFAULT_PALETTE, WORDS_CONTRAST } from './scale';
import { distinctness, channels, LOOK_ALIKE, CHANNELS } from './access';
import { hexToLinear, linearToHex, oklabToLinear, lchToOklab, linearToOklab, oklabToLch, hueDistance, normHue } from './oklch';
import { readPhrase } from './test/phrases';
import GOLDEN from './fixtures/specimen.golden.json';

const SEED = [
  "it's an idea · purple", "it's a task", "it's a note",
  'insight is a kind of idea', 'hunch is a kind of idea', 'question is kin to idea', 'assumption opposes evidence',
];

/** Say each sentence on a board in turn; what each answered comes with the board. */
function play(texts: string[], palette = DEFAULT_PALETTE) {
  const lens = emptyLens();
  const said = texts.map(t => applyAct(lens, readPhrase(t)!, palette).said);
  return { lens, said };
}
const hueOf = (lens: Lens, name: string) => lens.kinds.get(name)!.hue;
const hues = (lens: Lens) => Object.fromEntries(kindsOf(lens).map(k => [k.name, k.hue]));
const hexHue = (hex: string) => oklabToLch(linearToOklab(hexToLinear(hex)))[2];
/** A chrome signal colour standing at a hue, for a palette that wants one there. */
const signalAt = (name: string, hue: number) => ({ name, hex: linearToHex(oklabToLinear(lchToOklab(0.6, 0.12, hue))) });

describe('a kind made by its first use', () => {
  it('takes the hue its person names: purple is 305°', () => {
    const { lens, said } = play(["it's an idea · purple"]);
    const idea = lens.kinds.get('idea')!;
    expect(idea.hue).toBe(305);
    expect(idea.source).toBe('said');
    expect(idea.word).toBe('purple');
    expect(idea.depth).toBe(0);
    expect(said[0]).toBe("idea → 305°, your purple; it stands by the chrome's colour for a model (9° away) — on ink it means idea");
  });

  it('takes a hex for its hue alone', () => {
    const { lens } = play(["it's an idea · #7b2cbf"]);
    expect(lens.kinds.get('idea')!.hue).toBeCloseTo(hexHue('#7b2cbf'), 9);
    expect(lens.kinds.get('idea')!.word).toBe('#7b2cbf');
  });

  it('goes, with no colour named, where it is easiest to tell from every kind held', () => {
    const { lens, said } = play(["it's an idea · purple", "it's a task", "it's a note"]);
    expect(hueDistance(hueOf(lens, 'task'), hueOf(lens, 'idea'))).toBeGreaterThan(120);
    for (const name of ['idea', 'task']) expect(hueDistance(hueOf(lens, 'note'), hueOf(lens, name))).toBeGreaterThan(60);
    expect(lens.kinds.get('task')!.source).toBe('placed');
    expect(said[1]).toBe('task → 140°, the most distinct place left (165° from idea)');
  });

  it('leans on its name for the first kind, and away from the chrome’s own hues', () => {
    const seen = new Set<number>();
    for (const name of ['idea', 'task', 'note', 'quote', 'risk', 'person', 'place', 'goal']) {
      const { lens, said } = play([`it's a ${name}`]);
      const hue = hueOf(lens, name);
      seen.add(hue);
      expect(signalPenalty(hue)).toBeLessThan(0.002);
      expect(hueDistance(hue, nameHue(name))).toBeLessThan(25);
      expect(said[0]).toBe(`${name} → ${Math.round(hue)}°, the first kind; its name leans it there`);
      expect(play([`it's a ${name}`]).lens.kinds.get(name)!.hue).toBe(hue);        // the same name leans the same way
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);                                    // and names lean different ways
  });

  it('is already a kind when said again with no colour, and nothing moves', () => {
    const { lens } = play(SEED);
    const before = hues(lens);
    expect(applyAct(lens, { act: 'say', a: 'idea' }).said).toBe('idea is already a kind');
    expect(hues(lens)).toEqual(before);
  });

  it('is made, and the colour refused in words, when the word is no colour — grey, black and white have no hue to take', () => {
    const { lens, said } = play(["it's an idea · banana", "it's a task · grey"]);
    expect(lens.kinds.has('idea')).toBe(true);
    expect(lens.kinds.get('idea')!.source).toBe('placed');
    expect(said[0]).toBe('idea → 146°, the first kind; its name leans it there; “banana” is no colour this space knows');
    expect(said[1]).toContain('“grey” is no colour this space knows — a kind takes a hue, and grey, black and white have none');
  });

  it('keeps a pale yellow’s hue and says it is drawn as dark as words need — it is never refused', () => {
    const { lens, said } = play(["it's an idea · #fff176"]);
    const idea = lens.kinds.get('idea')!;
    expect(idea.source).toBe('said');
    expect(idea.hue).toBeCloseTo(hexHue('#fff176'), 9);
    expect(said[0]).toBe('idea → 103°, your #fff176; on paper a yellow is drawn as dark as words need, ochre or olive, and on the dark ground it is yellow');
    const paper = colourOf(idea, 'paper');
    expect(paper.contrast).toBeGreaterThanOrEqual(WORDS_CONTRAST);
    expect(hueDistance(hexHue(paper.hex), idea.hue)).toBeLessThan(1.5);
  });

  it('says so when the colour a person names stands beside one the chrome keeps: John’s purple, 9° from a model’s', () => {
    const { said } = play(["it's an idea · purple"]);
    expect(said[0]).toContain("it stands by the chrome's colour for a model (9° away) — on ink it means idea");
  });
});

describe('what a hue is placed against', () => {
  it('names the chrome’s hues as a penalty that fades over a few degrees', () => {
    const model = DEFAULT_PALETTE.signals.find(s => s.name === 'a model')!;
    expect(signalPenalty(model.hue)).toBeCloseTo(0.02, 12);
    expect(signalPenalty(model.hue + 6)).toBeCloseTo(0.01, 12);
    expect(signalPenalty(model.hue + 12)).toBe(0);
    expect(signalPenalty(model.hue - 40)).toBe(0);
  });

  it('hashes a name to a degree by FNV-1a, so the same name leans the same way everywhere', () => {
    expect(nameHue('a')).toBe(340);              // 0xe40c292c % 360
    expect(nameHue('foobar')).toBe(160);         // 0xbf9cf968 % 360
    expect(nameHue('')).toBe(0x811c9dc5 % 360);
    expect(nameHue('idea')).toBe(nameHue('idea'));
  });
});

describe('kin, opposites and a kind of', () => {
  it('insight, a kind of idea, keeps idea’s hue and goes a step toward the ground', () => {
    const { lens, said } = play(SEED);
    const idea = lens.kinds.get('idea')!, insight = lens.kinds.get('insight')!;
    expect(insight.hue).toBe(idea.hue);
    expect(insight).toMatchObject({ depth: 1, source: 'relative', anchor: 'idea', rel: 'sub', offset: 0, parent: 'idea' });
    expect(said[3]).toBe("insight is a kind of idea: idea's hue, a step toward the ground");
    // Toward the ground: lighter on paper, darker in the dark room.
    expect(colourOf(insight, 'paper').L).toBeGreaterThan(colourOf(idea, 'paper').L);
    expect(colourOf(insight, 'dark').L).toBeLessThan(colourOf(idea, 'dark').L);
  });

  it('fans siblings a little either side of the parent’s hue', () => {
    const { lens, said } = play(["it's an idea · purple", 'a is a kind of idea', 'b is a kind of idea', 'c is a kind of idea', 'd is a kind of idea']);
    expect(['a', 'b', 'c', 'd'].map(n => lens.kinds.get(n)!.offset)).toEqual([0, 28, -28, 56]);
    expect(['a', 'b', 'c', 'd'].map(n => hueOf(lens, n))).toEqual([305, 333, 277, 1]);
    expect(said[3]).toBe("c is a kind of idea: idea's hue −28°, a step toward the ground");
  });

  it('lets a kind of something keep the colour it was given', () => {
    const { lens, said } = play(["it's an idea · purple", "it's an insight · green", 'insight is a kind of idea']);
    expect(hueOf(lens, 'insight')).toBe(145);
    expect(lens.kinds.get('insight')).toMatchObject({ source: 'said', parent: 'idea', depth: 1 });
    expect(said[2]).toBe('insight keeps your green; as a kind of idea it is drawn a step toward the ground');
  });

  it('puts kin beside what they are kin to', () => {
    const { lens, said } = play(SEED);
    const q = lens.kinds.get('question')!;
    expect(q).toMatchObject({ source: 'relative', anchor: 'idea', rel: 'kin' });
    const d = hueDistance(q.hue, hueOf(lens, 'idea'));
    expect(d).toBeGreaterThanOrEqual(26);
    expect(d).toBeLessThanOrEqual(45);
    expect(said[5]).toBe('question is kin to idea: question 45° beside idea, on the side that stays most distinct');
  });

  it('puts opposites across the wheel: assumption and evidence 160–200° apart, placed together', () => {
    const { lens, said } = play(SEED);
    const d = hueDistance(hueOf(lens, 'assumption'), hueOf(lens, 'evidence'));
    expect(d).toBeGreaterThanOrEqual(160);
    expect(d).toBeLessThanOrEqual(200);
    expect(said[6]).toBe('assumption opposes evidence: placed together across the wheel, 180° apart');
    expect(lens.rels).toEqual([{ a: 'question', b: 'idea', rel: 'kin' }, { a: 'assumption', b: 'evidence', rel: 'opposes' }]);
  });

  it('places a new pair together, where both stand most apart from the rest — kin 26–40° apart', () => {
    const { lens, said } = play(SEED.slice(0, 3).concat(['frame is kin to lens']));
    const d = hueDistance(hueOf(lens, 'frame'), hueOf(lens, 'lens'));
    expect(d).toBeGreaterThanOrEqual(26);
    expect(d).toBeLessThanOrEqual(40);
    expect(said[3]).toMatch(/^frame is kin to lens: placed together, \d+° apart, where both stand most distinct$/);
  });

  it('moves the later kind, and never a hue its person said', () => {
    // The kin a person has coloured stays; the kind with no colour is the one that moves to it.
    const a = play(["it's an idea · purple", "it's a task", 'task is kin to idea']);
    expect(hueOf(a.lens, 'idea')).toBe(305);
    expect(a.lens.kinds.get('task')).toMatchObject({ source: 'relative', anchor: 'idea' });
    const b = play(["it's a task", "it's an idea · purple", 'idea is kin to task']);
    expect(hueOf(b.lens, 'idea')).toBe(305);
    expect(b.lens.kinds.get('task')).toMatchObject({ source: 'relative', anchor: 'idea' });
    // Neither coloured: the later one moves, whichever way the sentence is said.
    const c = play(["it's a task", "it's an idea", 'idea opposes task']);
    const d = play(["it's a task", "it's an idea", 'task opposes idea']);
    for (const board of [c, d]) {
      expect(board.lens.kinds.get('task')!.source).toBe('placed');
      expect(board.lens.kinds.get('idea')).toMatchObject({ source: 'relative', anchor: 'task', rel: 'opposes' });
    }
  });

  it('leaves both hues alone when the person has coloured both, and says how they stand', () => {
    const { lens, said } = play(["it's a task · green", "it's an idea · purple", 'task is kin to idea']);
    expect([hueOf(lens, 'task'), hueOf(lens, 'idea')]).toEqual([145, 305]);
    expect(said[2]).toBe('you gave task and idea their colours; they stand 160° apart, so they read as opposites');
  });

  it('refuses a relation that would make a hue follow itself, and says nothing moved', () => {
    const a = play(["it's a task", "it's an idea", 'task is a kind of idea', 'idea is kin to task']);
    expect(a.said[3]).toBe("task's hue already follows idea's; nothing moved");
    expect(hueOf(a.lens, 'task')).toBe(hueOf(a.lens, 'idea'));
    const b = play(["it's an idea", 'insight is a kind of idea', 'idea is a kind of insight']);
    expect(b.said[2]).toBe('insight already hangs from idea');
    expect(b.lens.kinds.get('idea')!.parent).toBeNull();
  });

  it('makes the kind and refuses to relate it to itself', () => {
    const { lens, said } = play(["it's an idea", 'idea is kin to idea']);
    expect(said[1]).toBe('idea cannot be related to itself');
    expect(lens.rels).toEqual([]);
  });

  it('says a relation again by replacing it, not by adding another', () => {
    const { lens } = play(["it's a task", "it's an idea", 'idea is kin to task', 'task is kin to idea']);
    expect(lens.rels).toHaveLength(1);
  });

  it('reads the depth of a chain, and draws it as two', () => {
    const { lens } = play(["it's an idea · purple", 'insight is a kind of idea', 'detail is a kind of insight', 'footnote is a kind of detail']);
    expect(['idea', 'insight', 'detail', 'footnote'].map(n => lens.kinds.get(n)!.depth)).toEqual([0, 1, 2, 3]);
    expect(colourOf(lens.kinds.get('footnote')!, 'paper').hex).toBe(colourOf(lens.kinds.get('detail')!, 'paper').hex);
  });
});

describe('the act keeps the hue', () => {
  it('never moves an older kind’s hue when a kind is made later', () => {
    const lens = emptyLens();
    let before: Record<string, number> = {};
    for (const text of [...SEED, "it's a quote · teal", 'risk opposes opportunity', "it's a feeling"]) {
      const r = applyAct(lens, readPhrase(text)!);
      const now = hues(lens);
      for (const [name, hue] of Object.entries(before)) {
        if (r.moved.includes(name)) continue;
        expect(now[name], `${name} after “${text}”`).toBe(hue);
      }
      before = now;
    }
    // The ones made last are the only ones the later acts could have touched, and no older kind was.
    expect(hues(lens).idea).toBe(305);
    expect(hues(lens).task).toBe(140);
    expect(hues(lens).note).toBe(51);
  });

  it('moves, in a relation, only the later kind and what follows it — over the acts of ten seeded boards', () => {
    let acts = 0;
    for (const sc of GOLDEN.scenarios.filter(s => s.name.startsWith('random')).slice(0, 10)) {
      const lens = emptyLens();
      for (const { act } of sc.acts) {
        const before = hues(lens);
        const families = (names: string[]) => new Set(names.flatMap(n => familyOf(lens, n).map(k => k.name)));
        const named = [(act as KindAct).a, ...('b' in (act as KindAct) ? [(act as { b: string }).b] : [])];
        const allowed = families(named);
        const r = applyAct(lens, act as KindAct);
        for (const n of families(named)) allowed.add(n);
        for (const [name, hue] of Object.entries(before)) {
          if (allowed.has(name)) continue;
          expect(hues(lens)[name], `${name} after ${JSON.stringify(act)}`).toBe(hue);
        }
        expect(r.moved.every(n => allowed.has(n))).toBe(true);
        acts++;
      }
    }
    expect(acts).toBeGreaterThan(60);
  });

  it('moves, when a kind is recoloured, its sub-kinds and the kinds placed against it — and nothing else', () => {
    const { lens } = play(SEED);
    const before = hues(lens);
    const r = applyAct(lens, readPhrase('make idea green')!);
    expect(r.said).toBe('idea → 145°, your green');
    expect([...r.moved].sort()).toEqual(['hunch', 'idea', 'insight', 'question']);
    const now = hues(lens);
    expect(now.idea).toBe(145);
    expect(now.insight).toBe(145);
    expect(now.hunch).toBe(normHue(145 + 28));
    expect(now.question).toBe(normHue(145 + 45));
    for (const name of ['task', 'note', 'assumption', 'evidence']) expect(now[name], name).toBe(before[name]);
  });

  it('lets a recoloured kind go its own way: it no longer follows what it was placed against', () => {
    const { lens } = play(SEED);
    applyAct(lens, readPhrase('make question orange')!);
    expect(lens.kinds.get('question')).toMatchObject({ source: 'said', anchor: null, offset: 0 });
    const q = hueOf(lens, 'question');
    applyAct(lens, readPhrase('make idea green')!);
    expect(hueOf(lens, 'question')).toBe(q);
  });

  it('follows its anchor through a chain of anchors', () => {
    const { lens } = play(["it's an idea · purple", 'insight is a kind of idea', 'detail is a kind of insight', 'hunch is a kind of idea']);
    applyAct(lens, readPhrase('make idea red')!);
    expect(hueOf(lens, 'insight')).toBe(29);
    expect(hueOf(lens, 'detail')).toBe(29);
    expect(hueOf(lens, 'hunch')).toBe(57);
    expect(familyOf(lens, 'idea').map(k => k.name).sort()).toEqual(['detail', 'hunch', 'idea', 'insight']);
  });

  it('hands back what each act decided, enough to rebuild the board without placing a thing again', () => {
    const live = emptyLens();
    const holds: KindHold[][] = [];
    const related: Relation[] = [];
    const sequence = [...SEED, "it's a quote · teal", 'risk opposes opportunity', 'make idea yellow'];
    for (const text of sequence) {
      const r = applyAct(live, readPhrase(text)!);
      holds.push(r.held);
      if (r.related) related.push(r.related);
    }
    const replayed = emptyLens();
    for (const hs of holds) for (const h of hs) holdKind(replayed, h);
    for (const rel of related) holdRelation(replayed, rel);
    expect(hues(replayed)).toEqual(hues(live));
    expect(kindsOf(replayed).map(k => [k.name, k.source, k.depth, k.order, k.parent, k.anchor, k.offset, k.rel, k.word]))
      .toEqual(kindsOf(live).map(k => [k.name, k.source, k.depth, k.order, k.parent, k.anchor, k.offset, k.rel, k.word]));
    expect(replayed.rels).toEqual(live.rels);
    expect(replayed.order).toBe(live.order);
    for (const k of kindsOf(live)) for (const g of GROUND_NAMES) expect(colourOf(replayed.kinds.get(k.name)!, g).hex).toBe(colourOf(k, g).hex);
  });

  it('keeps a hue chosen under one palette when the board is opened under another', () => {
    const live = emptyLens();
    const holds: KindHold[][] = [];
    for (const text of SEED) holds.push(applyAct(live, readPhrase(text)!).held);
    // A palette that keeps its own colours where the board’s kinds stand: placing afresh would lean away from them.
    const elsewhere = makePalette({ signals: [signalAt('x', 140), signalAt('y', 51), signalAt('z', 198), signalAt('w', 18)] });
    expect(hues(play(SEED, elsewhere).lens)).not.toEqual(hues(live));
    const reopened = emptyLens();
    for (const hs of holds) for (const h of hs) holdKind(reopened, h);
    expect(hues(reopened)).toEqual(hues(live));
  });

  it('holds a kind in the order it was made, and rebuilds depth and followers from what it holds', () => {
    const lens = emptyLens();
    holdKind(lens, { name: 'idea', source: 'said', hue: 305, word: 'purple', parent: null, anchor: null, offset: 0, rel: null, order: 0 });
    holdKind(lens, { name: 'insight', source: 'relative', hue: 0, parent: 'idea', anchor: 'idea', offset: 28, rel: 'sub', order: 1 });
    expect(hueOf(lens, 'insight')).toBe(333);                              // the hue it held is not read: it follows
    expect(lens.kinds.get('insight')!.depth).toBe(1);
    expect(lens.order).toBe(2);
    holdKind(lens, { name: 'idea', source: 'said', hue: 145, word: 'green', parent: null, anchor: null, offset: 0, rel: null, order: 0 });
    expect(hueOf(lens, 'insight')).toBe(normHue(145 + 28));
  });
});

describe('colour that reads, on both grounds, for any number of kinds', () => {
  const TWELVE = ['idea', 'task', 'note', 'quote', 'risk', 'person', 'place', 'event', 'goal', 'source', 'claim', 'question'];

  function check(lens: Lens) {
    const ks = kindsOf(lens);
    for (const k of ks) for (const g of GROUND_NAMES) for (const certainty of ['said', 'offered'] as const) {
      expect(colourOf(k, g, certainty).contrast, `${k.name} ${g} ${certainty}`).toBeGreaterThanOrEqual(WORDS_CONTRAST);
    }
    const pairs = distinctness(ks);
    const ch = channels(ks, pairs);
    let alike = 0;
    for (const p of pairs) {
      if (p.min >= LOOK_ALIKE) continue;                                   // tells apart under every way of seeing
      alike++;
      expect(ch.get(p.a)!.channel, `${p.a} and ${p.b} look alike`).not.toBe(ch.get(p.b)!.channel);
    }
    expect([...ch.values()].some(c => c.repeats)).toBe(false);
    return alike;
  }

  it('holds twelve kinds: every colour reads, and every pair is told apart or carries a second channel', () => {
    const { lens } = play(TWELVE.map(n => `it's a ${n}`));
    expect(kindsOf(lens)).toHaveLength(12);
    // Past about eight kinds colour alone cannot do it for a dichromat, so patterns have to.
    expect(check(lens)).toBeGreaterThan(0);
    const used = new Set([...channels(kindsOf(lens)).values()].map(c => c.channel));
    expect(used.size).toBeGreaterThan(1);
  });

  it('holds the seed with every example, fourteen kinds, which the specimen’s five patterns could not', () => {
    const { lens } = play([...SEED, "it's a quote · teal", 'risk opposes opportunity', 'todo is a kind of task', 'method is kin to note', 'make idea yellow', "it's a feeling"]);
    expect(kindsOf(lens)).toHaveLength(14);
    check(lens);
    const used = new Set([...channels(kindsOf(lens)).values()].map(c => c.channel));
    expect(used.size).toBeGreaterThan(5);
    for (const c of used) expect(CHANNELS).toContain(c);
  });

  it('spends no lightness on it: the hue and the colour of a kind are what they were before a pattern was needed', () => {
    const { lens } = play(TWELVE.map(n => `it's a ${n}`));
    const before = kindsOf(lens).map(k => [k.name, k.hue, colourOf(k, 'paper').hex, colourOf(k, 'dark').hex]);
    channels(kindsOf(lens));
    expect(kindsOf(lens).map(k => [k.name, k.hue, colourOf(k, 'paper').hex, colourOf(k, 'dark').hex])).toEqual(before);
  });
});

describe('the dark theme', () => {
  it('keeps every hue, and moves only lightness and chroma', () => {
    const { lens } = play([...SEED, "it's a quote · teal", 'make idea yellow']);
    const before = hues(lens);
    let chromaMoved = 0;
    for (const k of kindsOf(lens)) {
      for (const certainty of ['said', 'offered'] as const) {
        const paper = colourOf(k, 'paper', certainty), dark = colourOf(k, 'dark', certainty);
        const tolerance = certainty === 'said' ? 1.5 : 3.5;                // what a byte can say of a hue
        expect(paper.h).toBe(k.hue);
        expect(dark.h).toBe(k.hue);
        expect(hueDistance(hexHue(paper.hex), k.hue)).toBeLessThan(tolerance);
        expect(hueDistance(hexHue(dark.hex), k.hue)).toBeLessThan(tolerance);
        expect(dark.L).not.toBe(paper.L);                                  // lightness moves …
        if (dark.C !== paper.C) chromaMoved++;                             // … and chroma …
      }
    }
    expect(chromaMoved).toBeGreaterThan(0);
    expect(hues(lens)).toEqual(before);                                    // … but no hue in the lens does
  });
});
