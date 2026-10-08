// What the colours on a board mean, in words (V1-SPEC KN3a): because relations between kinds are kept in the
// hues, the engine can say them back — these are one family, these two are drawn as opposites, this colour
// stands by one the chrome keeps for itself, this kind needs a pattern to be told from that one. Derived from the
// lens and the palette, never logged. The sentences are the specimen's own; only a pattern that has run out is new.
import { describe, it, expect } from 'vitest';
import { emptyLens, applyAct, kindsOf } from './harmony';
import { meaning } from './meaning';
import { CHANNELS } from './access';
import { readPhrase } from './test/phrases';

function board(texts: string[]) {
  const lens = emptyLens();
  for (const t of texts) applyAct(lens, readPhrase(t)!);
  return { lens, lines: meaning(lens) };
}

describe('what the colours on a board mean', () => {
  it('says nothing when there are no kinds, and nothing of a single kind', () => {
    expect(meaning(emptyLens())).toEqual([]);
    expect(board(["it's an idea"]).lines).toEqual([]);
  });

  it('says a family is one family, and which of its kinds keep a colour the person gave', () => {
    expect(board(["it's an idea · purple", 'insight is a kind of idea', 'hunch is a kind of idea']).lines).toContain(
      "idea, insight and hunch are one family: idea's hue, each kind below it a step toward the ground");
    expect(board(["it's an idea · purple", "it's an insight · green", 'insight is a kind of idea']).lines[0]).toBe(
      "idea and insight are one family: idea's hue, each kind below it a step toward the ground (insight keeps your green)");
  });

  it('says kin stand beside each other, along the wheel', () => {
    expect(board(["it's an idea · purple", "it's a task", 'task is kin to idea']).lines).toContain('task stands beside idea, 45° along the wheel: kin');
  });

  it('says opposites are drawn as opposites, and how far apart', () => {
    expect(board(['assumption opposes evidence']).lines).toContain('assumption and evidence are drawn as opposites, 180° apart');
  });

  it('says so when kin or opposites the person coloured are not drawn so', () => {
    expect(board(["it's an a · red", "it's a b · green", 'a is kin to b']).lines).toContain('a and b are said to be kin, but your colours stand 116° apart');
    expect(board(["it's a x · red", "it's a y · orange", 'x opposes y']).lines).toContain('x and y are said to oppose, but your colours stand 33° apart');
  });

  it('says which kinds stand apart from the rest', () => {
    expect(board(["it's a task", "it's a note"]).lines).toContain('task and note stand apart from the rest');
    const lines = board(["it's a task", "it's a note", 'quote is a kind of task']).lines;
    expect(lines).toContain('note stands apart from the rest');
  });

  it('says when a colour the person gave stands by one the chrome keeps, and that the chrome’s never touch the ink', () => {
    expect(board(["it's an idea · purple", "it's a task"]).lines).toContain(
      "idea's purple stands near the chrome's colour for a model: on the ink it means idea, and the chrome's colours never touch the ink");
    expect(board(["it's an a · red", "it's a b · green"]).lines).toContain(
      "a's red stands near the chrome's colour for broken: on the ink it means a, and the chrome's colours never touch the ink");
  });

  it('says which kind is drawn in which pattern, and to whom it looks alike to the kind it is beside', () => {
    expect(board(["it's an idea · purple", "it's a thought · purple"]).lines).toContain(
      'thought is drawn dashed: beside idea it looks alike to everyone, protanopes, deuteranopes and tritanopes');
    expect(board(["it's a x · red", "it's a y · orange"]).lines).toContain(
      'y is drawn dashed: beside x it looks alike to protanopes, deuteranopes and tritanopes');
  });

  it('says the patterns have run out, and which kinds repeat one, instead of repeating one silently', () => {
    const names = ['idea', 'task', 'note', 'quote', 'risk', 'person', 'place', 'event', 'goal', 'source'];
    const { lines } = board(names.map(n => `it's a ${n} · purple`));
    expect(CHANNELS.length).toBe(8);
    const repeats = lines.filter(l => l.includes('patterns are in use'));
    expect(repeats).toHaveLength(2);
    expect(repeats[0]).toMatch(/^goal is drawn sparse, which a kind it looks alike to already holds: all 8 patterns are in use, so beside \w+ it looks alike in colour and in pattern to everyone, protanopes, deuteranopes and tritanopes$/);
    expect(repeats[1].startsWith('source is drawn sparse')).toBe(true);
    // Eight patterns hold eight kinds, and each of those is said as before.
    expect(lines.filter(l => / is drawn \w[\w-]*: beside /.test(l))).toHaveLength(7);
  });

  it('is the lines the specimen said, kind by kind, in the order it said them', () => {
    const { lens, lines } = board([
      "it's an idea · purple", "it's a task", "it's a note",
      'insight is a kind of idea', 'hunch is a kind of idea', 'question is kin to idea', 'assumption opposes evidence',
    ]);
    expect(kindsOf(lens)).toHaveLength(8);
    expect(lines).toEqual([
      "idea, insight and hunch are one family: idea's hue, each kind below it a step toward the ground",
      'question stands beside idea, 45° along the wheel: kin',
      'assumption and evidence are drawn as opposites, 180° apart',
      'task and note stand apart from the rest',
      "idea's purple stands near the chrome's colour for a model: on the ink it means idea, and the chrome's colours never touch the ink",
      'note is drawn dashed: beside task it looks alike to deuteranopes',
      'hunch is drawn dotted: beside insight it looks alike to protanopes and deuteranopes',
      'assumption is drawn dash-dot: beside note it looks alike to deuteranopes and tritanopes',
      'evidence is drawn dashed: beside question it looks alike to deuteranopes',
    ]);
  });
});
