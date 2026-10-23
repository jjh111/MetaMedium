// What a decision seat is shown of the board (the audit's S1): words, never a node id, at most DECIDE_STATE_MAX
// characters — the marks asked about counted by what they are, what they read as, the words on and beside them, and
// where each candidate came from, so two definitions named from one drawing are told apart by more than their names.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Point } from '../types';
import { decisionStateOf, definitionWords, shapesCounted, withoutIds, DECIDE_STATE_MAX, CANDIDATE_WORDS_SAID } from './decide-state';
import { offersFor, takeOffer, toolScope } from '../tools/registry';
import { buildSystemOne, SYSTEMONE_WORDS_MAX } from '../llm/decide-systemone';
import { briefQuestion } from './brief-kind';
import { whichQuestion } from '../tools/which';
import '../tools/builtin';

const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

let clock = 1000;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 100), undefined, 1);
const molecule = (s: Session, ox: number) => [
  ...[[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(s, circle(ox + x, y, 40))),
  draw(s, line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)),
  draw(s, line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30)),
];
const nameIt = (s: Session, ids: string[], name: string) => {
  s.summonMarks(ids, (clock += 100));
  return s.bless({ summonId: s.getState().summon!.id, name, at: (clock += 100) })!;
};
/** Every id the board holds, as it is and as Mermaid writes it (`stroke_john_a1b2_1`) — none may reach a state. */
const idsOf = (s: Session) => [...s.getState().nodes.keys()].filter((id) => /:/.test(id)).flatMap((id) => [id, id.replace(/[^A-Za-z0-9]+/g, '_')]);

function tie() {
  const s = createSession();
  const a = molecule(s, 0);
  const molId = nameIt(s, a, 'molecule');
  s.label({ nodeId: a[0], text: 'water', at: (clock += 100) });
  const compId = nameIt(s, molecule(s, 1200), 'compound');
  const held = molecule(s, 2400);
  s.label({ nodeId: held[1], text: 'oxygen', at: (clock += 100) });
  return { s, molId, compId, held };
}

describe('the state a decision is asked with', () => {
  it('says the marks counted by what they are, the words on them — and no node id, under the cap', () => {
    const { s, molId, compId, held } = tie();
    const st = decisionStateOf(s.getState(), held, { candidates: [{ name: 'molecule', artifactId: molId }, { name: 'compound', artifactId: compId }] });
    expect(st.text).toMatch(/five marks — three circles, two lines/);
    expect(st.text).toMatch(/Written on them: “oxygen”/);
    expect(st.text).toMatch(/- molecule: this board's definition, the first of two/);
    expect(st.text).toMatch(/- compound: this board's definition, the second of two/);
    expect(st.text).toMatch(/written on its drawing: “water”/);
    expect(st.text.length).toBeLessThanOrEqual(DECIDE_STATE_MAX);
    for (const id of idsOf(s)) expect(st.text).not.toContain(id);
    expect(st).not.toHaveProperty('images');
  });

  it('what the marks play is said when the engine’s reading is handed in', () => {
    const { s, held } = tie();
    const st = decisionStateOf(s.getState(), held, { reading: s.read(held) });
    expect(st.text).toMatch(/They play: /);
    expect(st.text).toMatch(/reads as a /);
  });

  it('a board of a thousand words is cut at the cap, whole lines, and says so', () => {
    const s = createSession();
    const ids: string[] = [];
    for (let i = 0; i < 400; i++) {
      const id = draw(s, circle(100 + (i % 20) * 90, 100 + Math.floor(i / 20) * 90, 30));
      s.label({ nodeId: id, text: `label number ${i} of a very wordy board`, at: (clock += 10) });
      ids.push(id);
    }
    const st = decisionStateOf(s.getState(), ids.slice(0, 200), { lead: ['A brief: '.padEnd(200, 'x')] });
    expect(st.text.length).toBeLessThanOrEqual(DECIDE_STATE_MAX);
    for (const id of idsOf(s)) expect(st.text).not.toContain(id);
  });

  it('shapesCounted says nothing for nothing, and a thing made as one', () => {
    const { s, molId } = tie();
    expect(shapesCounted(s.getState(), [])).toBe('nothing');
    expect(shapesCounted(s.getState(), [molId])).toBe('one thing made');
  });

  it('a definition gone from the board is said so', () => {
    const { s } = tie();
    expect(definitionWords(s.getState(), { name: 'x', artifactId: 'nowhere' })).toBe('a definition this board no longer holds');
  });
});

describe('Which is it? asks between candidates that differ (S1)', () => {
  it('two definitions named from one drawing: their words differ beyond the name — where each came from', () => {
    const { s, held } = tie();
    s.summonMarks(held, (clock += 100));
    const offer = offersFor(toolScope(s, { host: { decider: { name: 'Clef-flash' } } })).find((o) => o.tool === 'which')!;
    expect(offer).toBeDefined();
    const cands = (offer.data as { candidates: { id: string; text: string }[] }).candidates;
    const strip = (c: { id: string; text: string }) => c.text.replace(c.id, '');
    expect(strip(cands[0])).not.toBe(strip(cands[1]));
    expect(cands.map((c) => c.text).join('\n')).toMatch(/first of two[\s\S]*second of two|second of two[\s\S]*first of two/);
    for (const id of idsOf(s)) for (const c of cands) expect(c.text).not.toContain(id);
  });
});

describe('only what a person wrote is said as written — never an id, a Mermaid text or a thing’s name', () => {
  const box = (s: Session, x: number, y: number) =>
    draw(s, [...line({ x, y }, { x: x + 160, y }), ...line({ x: x + 160, y }, { x: x + 160, y: y + 100 }), ...line({ x: x + 160, y: y + 100 }, { x, y: y + 100 }), ...line({ x, y: y + 100 }, { x, y })]);
  const arrow = (s: Session, a: Point, b: Point) => { const pts = line(a, b); const t = pts[pts.length - 1]; return draw(s, [...pts, { x: t.x - 14, y: t.y - 10 }, t, { x: t.x - 14, y: t.y + 10 }]); };

  it('Make it Mermaid beside a flowchart: its text — the marks’ ids made safe, and the hand’s name — never reaches the state or the wire', () => {
    const s = createSession();
    s.setLogName('john~a1b2');
    const ids = [box(s, 100, 100), box(s, 400, 100), box(s, 700, 100), arrow(s, { x: 262, y: 150 }, { x: 398, y: 150 }), arrow(s, { x: 562, y: 150 }, { x: 698, y: 150 })];
    s.summonMarks(ids, (clock += 100));
    const scope = toolScope(s, { host: { decider: { name: 'Clef-flash' } } });
    const mermaid = offersFor(scope).find((o) => o.tool === 'mermaid')!;
    expect(mermaid).toBeDefined();
    takeOffer(mermaid, scope, s, (clock += 100));
    const st = s.getState();
    expect(st.artifacts.length).toBe(1);
    const state = decisionStateOf(st, ids, { reading: s.read(ids), lead: ['The brief typed: “a page about orders”'] });
    expect(state.text).toMatch(/Written beside them: nothing\./);
    const wire = JSON.stringify(buildSystemOne([briefQuestion({})], state, { model: 'clef-flash' }).body);
    for (const id of idsOf(s)) { expect(state.text).not.toContain(id); expect(wire).not.toContain(id); }
    expect(wire).not.toMatch(/john~a1b2|john_a1b2|flowchart\.mmd/);
  });

  it('withoutIds takes out every id the board holds, as it is and as Mermaid writes it', () => {
    const s = createSession();
    s.setLogName('john~a1b2');
    const id = box(s, 0, 0);
    const safe = id.replace(/[^A-Za-z0-9]+/g, '_');
    expect(withoutIds(`see ${id} and ${safe}_k3 here`, s.getState())).toBe('see … and …_k3 here');
  });

  it('nothing written anywhere: a neighbour’s name is not said as written beside the marks, and both lines say nothing', () => {
    const s = createSession();
    const molId = nameIt(s, molecule(s, 0), 'molecule');
    const compId = nameIt(s, molecule(s, 4000), 'compound');
    const held = molecule(s, 4400);
    const st = decisionStateOf(s.getState(), held, { candidates: [{ name: 'molecule', artifactId: molId }, { name: 'compound', artifactId: compId }] });
    expect(st.text).toMatch(/Written on them: nothing\./);
    expect(st.text).toMatch(/Written beside them: nothing\./);
    expect(st.text).not.toMatch(/beside them: “compound”/);
    // Each candidate's own "beside" leaves out the group held and the other's drawing.
    for (const w of st.text.split('\n').filter((l) => /^- /.test(l))) expect(w).toMatch(/written beside it: nothing/);
  });

  it('the group’s own label is not said as written beside a definition', () => {
    const s = createSession();
    const molId = nameIt(s, molecule(s, 0), 'molecule');
    const compId = nameIt(s, molecule(s, 2400), 'compound');
    const held = molecule(s, 400);
    s.label({ nodeId: held[0], text: 'oxygen', at: (clock += 100) });
    const st = decisionStateOf(s.getState(), held, { candidates: [{ name: 'molecule', artifactId: molId }, { name: 'compound', artifactId: compId }] });
    expect(st.text).toMatch(/Written on them: “oxygen”/);
    expect(st.text).not.toMatch(/written beside it: “oxygen”/);
  });

  it('a long note beside a definition: Which is it?’s options stay short, and the wire never sends an option past the relay’s limit', () => {
    const s = createSession();
    const a = molecule(s, 0);
    const molId = nameIt(s, a, 'molecule');
    const note = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
    // A typed note standing just right of the molecule's drawing — a paragraph, as notes are.
    s.import({ kind: 'text', path: 'note.txt', name: 'note', bounds: { minX: 560, minY: 280, maxX: 900, maxY: 480 }, code: note, at: (clock += 100) });
    nameIt(s, molecule(s, 4000), 'compound');
    const held = molecule(s, 8000);
    void molId;
    s.summonMarks(held, (clock += 100));
    const offer = offersFor(toolScope(s, { host: { decider: { name: 'Clef-flash' } } })).find((o) => o.tool === 'which')!;
    expect(offer).toBeDefined();
    const cands = (offer.data as { candidates: { id: string; text: string }[] }).candidates;
    const mol = cands.find((c) => c.id === 'molecule')!;
    expect(mol.text).toMatch(/written beside it: “word0 word1/);
    expect(mol.text).toMatch(/…”/);
    for (const c of cands) expect(c.text.length).toBeLessThan(SYSTEMONE_WORDS_MAX);
    expect(CANDIDATE_WORDS_SAID * 2 + 300).toBeLessThan(SYSTEMONE_WORDS_MAX);
    const body = buildSystemOne([whichQuestion(held, cands)], decisionStateOf(s.getState(), held), { model: 'clef-flash' }).body;
    for (const words of Object.values(body.questions.q1.criteria as Record<string, string>)) expect(words.length).toBeLessThanOrEqual(SYSTEMONE_WORDS_MAX);
  });

  it('the wire cuts what it sends at the relay’s limits, at a space, the cut said', () => {
    const long = 'x '.repeat(900);
    const q = whichQuestion(['a'], [{ id: 'one', text: long }, { id: 'two', text: 'short' }]);
    const body = buildSystemOne([{ ...q, ask: long }], { text: 'y '.repeat(9000) }).body;
    const crit = body.questions.q1.criteria as Record<string, string>;
    expect(crit.one.length).toBeLessThanOrEqual(SYSTEMONE_WORDS_MAX);
    expect(crit.one.endsWith('…')).toBe(true);
    expect(body.questions.q1.instructions.length).toBeLessThanOrEqual(SYSTEMONE_WORDS_MAX);
    expect(body.state.length).toBeLessThanOrEqual(16000);
  });
});
