// What a hand may move (PLAN-IPAD-NOTES A2): the marks it made, and the regions it made that carry only those.
//
// A hand labels only its OWN ink (L2b, L2i) and proposes but never blesses; moving is the same trust. Undo is per
// hand (L2j), so a person's own undo cannot take back another hand's move of their marks — which is the reason,
// not a nicety. A region holds by geometry and moves nothing when it is made, so a hand may make one round
// anyone's marks; but a region MOVED carries what it holds (I5), so moving one is moving every one of those marks,
// and the rule asks about all of them.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { mergeLogs } from '../store/merge';
import { rectStroke } from '../test/strokes';
import { handMoves } from './hand-moves';

const hand = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });
const R = (x: number, y: number, w: number, h: number) => ({ minX: x, minY: y, maxX: x + w, maxY: y + h });
const HASH = 'sha256:' + 'ab'.repeat(32);
const picture = (s: Session, x: number, y: number, at: number) =>
  s.import({ kind: 'jpg', path: 'imports/p.jpg', name: 'p.jpg', bounds: R(x, y, 160, 120), asset: HASH, mime: 'image/jpeg', w: 1600, h: 1200, at })!;

/** The hand `claude`, on a board that already holds Ann's marks: a box, a note, a picture and a region of hers. */
function room() {
  const ann = hand('ann');
  const annBox = ann.addStroke(rectStroke(50, 50, 100, 80), 1000, undefined, 1, { content: true });
  const annNote = ann.import({ kind: 'text', path: 'note.txt', name: 'note', bounds: R(60, 160, 140, 60), code: 'Call Ada', at: 1001 })!;
  const annPic = picture(ann, 300, 50, 1002);
  const annRegion = ann.region({ name: 'Ann’s place', bounds: R(900, 900, 300, 300), at: 1003 })!;
  const me = hand('claude');
  me.load(mergeLogs({ ann: ann.getEvents().slice(), claude: [] }, { me: 'claude' }));
  const verdict = (ids: string[]) => handMoves(me.getState(), ids, (id) => me.isMine(id));
  return { me, ann, annBox, annNote, annPic, annRegion, verdict };
}

describe('handMoves — a hand moves what it made', () => {
  it('lets its own mark move and refuses another hand\'s, naming whose it is', () => {
    const { me, annBox, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    expect(verdict([mine])).toEqual({ allowed: [mine], refused: [] });
    expect(verdict([annBox])).toEqual({ allowed: [], refused: [{ id: annBox, why: 'not-yours', of: annBox }] });
  });

  it('a mixed list moves what it may and refuses the rest, each by itself', () => {
    const { me, annNote, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    const got = verdict([annNote, mine]);
    expect(got.allowed).toEqual([mine]);
    expect(got.refused).toEqual([{ id: annNote, why: 'not-yours', of: annNote }]);
  });

  it('a picture or a text another hand imported is hers; one this hand imported is its own', () => {
    const { me, annPic, annNote, verdict } = room();
    const mineText = me.import({ kind: 'text', path: 'claude/n.txt', name: 'n', bounds: R(500, 500, 100, 40), code: 'x', at: 2000 })!;
    const minePic = picture(me, 700, 500, 2001);
    expect(verdict([annPic, annNote]).allowed).toEqual([]);
    expect(verdict([mineText, minePic])).toEqual({ allowed: [mineText, minePic], refused: [] });
  });

  it('a region it made round marks of another hand may not be moved: it would carry them', () => {
    const { me, annBox, annNote, verdict } = room();
    const region = me.region({ name: 'Notes', bounds: R(0, 0, 400, 300), at: 2000 })!;
    // The region holds Ann's box and note by where they stand; it moved nothing when it was made.
    const got = verdict([region]);
    expect(got.allowed).toEqual([]);
    expect(got.refused).toHaveLength(1);
    expect(got.refused[0]).toMatchObject({ id: region, why: 'carries-not-yours' });
    expect([annBox, annNote]).toContain(got.refused[0].of);
  });

  it('a region it made that holds only its own marks may move, and one that holds nothing', () => {
    const { me, verdict } = room();
    const mine = me.addStroke(rectStroke(2000, 2000, 80, 60), 2000, undefined, 1, { content: true });
    const held = me.region({ name: 'Mine', bounds: R(1950, 1950, 200, 150), at: 2001 })!;
    const empty = me.region({ name: 'Nothing', bounds: R(5000, 5000, 100, 100), at: 2002 })!;
    expect(me.isMine(held)).toBe(true);
    expect(verdict([held, empty])).toEqual({ allowed: [held, empty], refused: [] });
    expect(verdict([mine]).allowed).toEqual([mine]);
  });

  it('a region another hand made is hers, empty or not', () => {
    const { annRegion, verdict } = room();
    expect(verdict([annRegion])).toEqual({ allowed: [], refused: [{ id: annRegion, why: 'not-yours', of: annRegion }] });
  });

  it('a region of its own holding a region of another hand carries it, and is refused for it', () => {
    const { me, annRegion, verdict } = room();
    const outer = me.region({ name: 'Everything out here', bounds: R(850, 850, 400, 400), at: 2000 })!;
    expect(verdict([outer])).toEqual({ allowed: [], refused: [{ id: outer, why: 'carries-not-yours', of: annRegion }] });
  });

  it('says a mark that is not on the board, or was erased, is missing', () => {
    const { me, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    me.erase(mine, 2001);
    expect(verdict(['nope'])).toEqual({ allowed: [], refused: [{ id: 'nope', why: 'missing', of: 'nope' }] });
    expect(verdict([mine]).refused).toEqual([{ id: mine, why: 'missing', of: mine }]);
  });

  it('is pure: it writes nothing', () => {
    const { me, annBox, verdict } = room();
    const before = me.getEvents().length;
    verdict([annBox]);
    expect(me.getEvents().length).toBe(before);
  });
});
