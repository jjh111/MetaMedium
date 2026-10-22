// What a decision seat is shown of the board (the audit's S1): words, never a node id, at most DECIDE_STATE_MAX
// characters — the marks asked about counted by what they are, what they read as, the words on and beside them, and
// where each candidate came from, so two definitions named from one drawing are told apart by more than their names.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Point } from '../types';
import { decisionStateOf, definitionWords, shapesCounted, DECIDE_STATE_MAX } from './decide-state';
import { offersFor, toolScope } from '../tools/registry';
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
/** Every id the board holds — none may reach a state. */
const idsOf = (s: Session) => [...s.getState().nodes.keys()].filter((id) => /:/.test(id));

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
