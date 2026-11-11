// *Why?* — the headline loop's last step, answered by the engine alone: what the marks matched and how,
// what they are made of, and each reading's own reason. No model is asked.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { ENGINE_PARTICIPANT } from '../session/nodes';
import { circleStroke, lineStroke, rectStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, registeredTools } from './registry';
import { intentsMatching } from './intents';
import './builtin';
import { whyOf } from './why';

let clock = 1000;
const draw = (s: Session, pts: ReturnType<typeof rectStroke>) => s.addStroke(pts, (clock += 400), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 400)); };
/** Three circles and two lines joining them, as the headline loop draws a molecule. */
function molecule(s: Session, x: number, y: number): string[] {
  return [
    draw(s, circleStroke(x, y, 36)), draw(s, circleStroke(x + 160, y, 36)), draw(s, circleStroke(x + 80, y + 130, 36)),
    draw(s, lineStroke({ x: x + 34, y }, { x: x + 126, y })), draw(s, lineStroke({ x: x + 143, y: y + 30 }, { x: x + 97, y: y + 100 })),
  ];
}
const why = (s: Session) => offersFor(toolScope(s, {})).find((o) => o.key === 'why')!;

describe('why — the tool', () => {
  it('is registered last, asks no model, and describes itself', () => {
    const t = registeredTools();
    expect(t[t.length - 1].id).toBe('why');
    expect(t[t.length - 1].asks).toBeUndefined();
    expect(t[t.length - 1].describe()).toMatch(/no model asked/);
  });

  it('one circle: typed only, and the answer is every reading the shape rung holds, each with its reason', () => {
    const s = createSession();
    hold(s, [draw(s, circleStroke(300, 300, 50))]);
    const o = why(s);
    expect(o.hidden).toBe(true);
    expect(o.asks).toBeUndefined();
    const { text, grounded } = whyOf(toolScope(s, {}));
    expect(grounded).toBe(false);
    expect(text).toMatch(/a circle 0\.\d\d — /);
    expect(text).toMatch(/no model was asked/);
    expect(text).not.toMatch(/stroke:|artifact:|tier/);
  });

  it('a second molecule: a pill, and the answer says what it matched and what it is made of, in words', () => {
    const s = createSession();
    const first = molecule(s, 200, 200);
    hold(s, first);
    s.bless({ summonId: s.getState().summon!.id, name: 'molecule', at: (clock += 400) });
    const second = molecule(s, 700, 500);
    hold(s, second);
    const o = why(s);
    expect(o.hidden).toBeFalsy();
    const { text, grounded } = whyOf(toolScope(s, {}));
    expect(grounded).toBe(true);
    expect(text).toMatch(/^Reads as molecule (0\.9\d|1\.00): the same shapes and the same links between them as the molecule you named\./);
    expect(text).toMatch(/Here: three circles and two lines — a line joins a circle, four times/);
    expect(text).not.toMatch(/is near/);
    expect(text).not.toMatch(/As a diagram/); // nothing reads it as one above the floor
    expect(text.length).toBeLessThan(300);
    expect(text).not.toMatch(/stroke:|artifact:|×|>/);
  });

  it('taking it stands the answer beside the marks as the engine’s own, in one act that undo takes back', () => {
    const s = createSession();
    const ids = molecule(s, 200, 200);
    hold(s, ids);
    const before = s.getState().explanations.length;
    takeOffer(why(s), toolScope(s, {}), s, (clock += 400));
    const st = s.getState();
    expect(st.explanations.length).toBe(before + 1);
    const card = st.nodes.get(st.explanations[st.explanations.length - 1])!;
    expect(JSON.stringify(card.reps)).toMatch(/three circles and two lines/);
    expect(card.edges.some((e) => e.rel === 'made-by' && e.to === ENGINE_PARTICIPANT) || JSON.stringify(card).includes(ENGINE_PARTICIPANT)).toBe(true);
    s.undo();
    expect(s.getState().explanations.length).toBe(before);
  });

  it('a flowchart says the diagram it reads as', () => {
    const s = createSession();
    const a = draw(s, rectStroke(100, 100, 160, 90)), b = draw(s, rectStroke(100, 320, 160, 90));
    const l = draw(s, lineStroke({ x: 180, y: 190 }, { x: 180, y: 320 }));
    hold(s, [a, b, l]);
    const { text } = whyOf(toolScope(s, {}));
    expect(text).toMatch(/Here: two rectangles and one line/);
  });
});

describe('why — the words a person types', () => {
  it('*why* names Why?, never What is this?, which asks a model', () => {
    expect(intentsMatching('why')[0].intent.id).toBe('why');
    expect(intentsMatching('why').some((m) => m.intent.id === 'what')).toBe(false);
  });

  it('the names of the headline loop are never an act’s word: *bubble* and *molecule* name things', () => {
    expect(intentsMatching('bubble')).toEqual([]);
    expect(intentsMatching('molecule')).toEqual([]);
  });
});
