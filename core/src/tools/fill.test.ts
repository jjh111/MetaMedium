// The fill tool (MATHS-SPEC §8 Lane A, M16–M18): typed, hidden offers over the fill-ins and the board's settings.
//
//   - *The answer waits* / *Show the answers*: the board's `answers` setting, taken as a `setting` event (M18).
//   - *Colour the maths* / *Colour the maths when pointed at*: the board's `colour` setting (M17).
//   - *Write 5* / *Write all N*: the fill-ins about the marks held, written as text the maths reads back — the
//     same act a tap on a ghost does (`writeFillIn`), reached by typing.
//
// They are TYPED, never a slot (`hidden`): the ghost on the canvas is where a fill-in is offered, and Enter with
// nothing typed still takes the field's likely act. And they are offered only where there is maths (or a setting
// to put back), so e2e 49's golden — a row of boxes, a molecule, a line of writing — is unchanged by construction.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession, type Session } from '../session/session';
import { lineStroke, rectStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, getTool } from './registry';
import './builtin';
import { fillInsOf } from '../maths/fill';
import { boardMaths } from '../maths/board';
import { FILL, writeFillIn } from './fill';

const R = { x: 100, y: 300 }, L = { x: 340, y: 300 }, T = { x: 100, y: 120 };
let clock = 1000;
const box = (cx: number, cy: number, w = 40, h = 17): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });
const text = (s: Session, code: string, b: Bounds) => s.import({ kind: 'text', path: `text/${(clock += 10)}.txt`, name: code, bounds: b, code, at: clock })!;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 4000), undefined, 1);

function triangle345(long = '4', hyp?: string) {
  const s = createSession();
  const marks = [lineStroke(R, L), lineStroke(T, R), lineStroke(L, T)].map((p) => draw(s, p));
  marks.push(draw(s, rectStroke(100, 285, 15, 15, 12)));
  text(s, long, box(220, 322));
  text(s, '3', box(76, 210));
  if (hyp) text(s, hyp, box(238, 186));
  return { s, marks };
}
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const offers = (s: Session) => offersFor(toolScope(s, {})).filter((o) => o.tool === 'fill');

describe('the fill tool', () => {
  it('is registered, and says what it does', () => {
    const t = getTool('fill');
    expect(t).toBe(FILL);
    expect(t!.describe()).toMatch(/fill/i);
  });

  it('offers nothing for what e2e 49’s golden scopes hold: boxes, a molecule, a line of writing', () => {
    const s = createSession();
    const ids = [200, 360, 520].map((x) => draw(s, rectStroke(x, 200, 120, 80)));
    hold(s, ids);
    expect(offers(s)).toEqual([]);
    const m = createSession();
    const ring = [[300, 300], [500, 300], [400, 460]].map(([x, y]) => m.addStroke(Array.from({ length: 80 }, (_, i) => ({ x: x + 40 * Math.cos((i / 79) * Math.PI * 2), y: y + 40 * Math.sin((i / 79) * Math.PI * 2) })), (clock += 4000), undefined, 1));
    hold(m, ring);
    expect(offers(m)).toEqual([]);
  });

  it('on a board with maths, offers the settings and the fill-ins held — every one typed, none a slot', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    const got = offers(s);
    expect(got.map((o) => o.key).sort()).toEqual(['fill:answers-wait', 'fill:colour-always', 'fill:write', 'fill:write-all']);
    for (const o of got) {
      expect(o.hidden).toBe(true);
      expect(o.asks).toBeUndefined();
      expect(o.tool).toBe('fill');
      expect(o.verbs!.length).toBeGreaterThan(0);
    }
    const write = got.find((o) => o.key === 'fill:write')!;
    expect(write.label).toBe('Write 5');
    expect(write.reason).toMatch(/√\(4² \+ 3²\) = 5/);
    expect(got.find((o) => o.key === 'fill:write-all')!.label).toMatch(/^Write all \d/);
  });

  it('is found by what a teacher says', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    const by = (k: string) => offers(s).find((o) => o.key === k)!;
    expect(by('fill:answers-wait').verbs).toEqual(expect.arrayContaining(['the answer waits', 'hide the answers']));
    expect(by('fill:colour-always').verbs).toEqual(expect.arrayContaining(['colour the maths']));
    expect(by('fill:write').verbs).toEqual(expect.arrayContaining(['fill it in', 'write it']));
  });

  it('the answer waits: taking it is one setting event stamped with the tool, and the offer turns to its opposite', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    const wait = offers(s).find((o) => o.key === 'fill:answers-wait')!;
    const before = s.getEvents().length;
    takeOffer(wait, toolScope(s, {}), s, (clock += 100));
    const wrote = s.getEvents().slice(before);
    expect(wrote).toHaveLength(1);
    expect(wrote[0]).toMatchObject({ type: 'setting', key: 'answers', value: 'wait', tool: 'fill', offer: 'fill:answers-wait' });
    expect(s.getState().settings.answers).toBe('wait');
    expect(offers(s).map((o) => o.key)).toContain('fill:answers-show');
    expect(offers(s).map((o) => o.key)).not.toContain('fill:answers-wait');
    // Showing them again is the opposite event; one undo takes each back.
    takeOffer(offers(s).find((o) => o.key === 'fill:answers-show')!, toolScope(s, {}), s, (clock += 100));
    expect(s.getState().settings.answers).toBe('show');
    s.undo();
    expect(s.getState().settings.answers).toBe('wait');
    s.undo();
    expect(s.getState().settings.answers).toBe('show');
  });

  it('colour the maths: the board colours the quantities at rest, and can be put back', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    takeOffer(offers(s).find((o) => o.key === 'fill:colour-always')!, toolScope(s, {}), s, (clock += 100));
    expect(s.getState().settings.colour).toBe('always');
    const back = offers(s).find((o) => o.key === 'fill:colour-pointed')!;
    expect(back).toBeDefined();
    takeOffer(back, toolScope(s, {}), s, (clock += 100));
    expect(s.getState().settings.colour).toBe('pointed');
  });

  it('a setting put back is offered even where the board has no maths, so it can always be undone from the field', () => {
    const s = createSession();
    const ids = [200, 360].map((x) => draw(s, rectStroke(x, 200, 120, 80)));
    s.setting('answers', 'wait', (clock += 100));
    hold(s, ids);
    expect(offers(s).map((o) => o.key)).toEqual(['fill:answers-show']);
  });

  it('Write 5 writes the strongest fill-in about the held marks as one text, one act, in the taker’s name', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    const write = offers(s).find((o) => o.key === 'fill:write')!;
    const before = s.getEvents().length;
    takeOffer(write, toolScope(s, {}), s, (clock += 100));
    const wrote = s.getEvents().slice(before);
    // The field closes first, as every tool's does; then one text.
    const texts = wrote.filter((e) => e.type === 'import');
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatchObject({ kind: 'text', code: '5', tool: 'fill', offer: 'fill:write' });
    // Read back: the long side is labelled 5 and the fill-in is gone.
    const board = boardMaths(s.getState())!;
    expect(board.figures[0].labels.some((l) => l.key === 'side0' && l.text === '5')).toBe(true);
    expect(fillInsOf(s.getState()).some((f) => f.text === '5')).toBe(false);
    // One undo takes the text away (the act), then the field’s own close.
    s.undo();
    expect(s.getEvents().filter((e) => e.type === 'import' && e.code === '5')).toHaveLength(0);
  });

  it('Write all writes every text fill-in about the held marks in one act', () => {
    const { s, marks } = triangle345();
    hold(s, marks);
    const n = fillInsOf(s.getState()).filter((f) => f.take.kind === 'text').length;
    expect(n).toBeGreaterThan(3);
    const all = offers(s).find((o) => o.key === 'fill:write-all')!;
    expect(all.label).toBe(`Write all ${n}`);
    const before = s.getEvents().length;
    takeOffer(all, toolScope(s, {}), s, (clock += 100));
    expect(s.getEvents().slice(before).filter((e) => e.type === 'import')).toHaveLength(n);
    expect(fillInsOf(s.getState()).filter((f) => f.take.kind === 'text')).toEqual([]);
    // One act: the texts go together.
    const acts = new Set(s.getEvents().slice(before).filter((e) => e.type === 'import').map((e) => e.act));
    expect(acts.size).toBe(1);
  });

  it('writes nothing for a fill-in that writes nothing: a label that cannot hold is changed by the hand', () => {
    const { s, marks } = triangle345('5', '5'); // legs of 5 and 3 and a written long side of 5: the 5 cannot hold
    hold(s, marks);
    const fix = fillInsOf(s.getState()).find((f) => f.text === '5.83');
    expect(fix?.take.kind).toBe('none');
    const before = s.getEvents().length;
    expect(writeFillIn(s, fix!, (clock += 100))).toBeNull();
    expect(s.getEvents().length).toBe(before);
  });

  it('writeFillIn centres a text where the ghost was drawn when it is told', () => {
    const { s } = triangle345();
    const f = fillInsOf(s.getState())[0];
    const moved = { x: f.at.x + 12, y: f.at.y + 5 };
    const id = writeFillIn(s, f, (clock += 100), moved)!;
    const b = s.getState().nodes.get(id)!;
    expect(b).toBeDefined();
    const ev = s.getEvents().filter((e) => e.type === 'import').pop()!;
    if (ev.type !== 'import') throw new Error('no import');
    expect((ev.bounds.minX + ev.bounds.maxX) / 2).toBeCloseTo(moved.x, 6);
    expect((ev.bounds.minY + ev.bounds.maxY) / 2).toBeCloseTo(moved.y, 6);
  });
});
