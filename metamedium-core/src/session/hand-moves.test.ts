// What a hand may move (PLAN-IPAD-NOTES A2, changed by John's answer of 2 Oct 2026 — A2b): ANYTHING that is on the board.
//
// A2 first ruled that a hand moves only what it made, as it labels only its own ink — the reason being that undo is per
// hand (L2j), so a person's own undo cannot take back another hand's move of their marks. John chose otherwise: *"ya
// claude can move marks"*. So the rule no longer refuses another hand's marks, nor a region that carries them; it still
// refuses what is not there. What replaces the refusal is honesty — the reply and the tab say WHOSE marks moved — and a
// way back that is not undo: the person moves them back, or asks the hand to. Labels and renames keep their rule.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { mergeLogs } from '../store/merge';
import { rectStroke } from '../test/strokes';
import { handMoves, movedSaid, otherHandMoves } from './hand-moves';

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

describe('handMoves — a hand moves what is on the board, and says whose it was', () => {
  it('lets its own mark move and another hand\'s too: nothing is refused for whose it is', () => {
    const { me, annBox, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    expect(verdict([mine])).toMatchObject({ allowed: [mine], refused: [] });
    expect(verdict([annBox])).toMatchObject({ allowed: [annBox], refused: [] });
    expect(verdict([mine, annBox]).allowed).toEqual([mine, annBox]);
  });

  it('a picture, a text, or a region another hand made may move too', () => {
    const { annPic, annNote, annRegion, verdict } = room();
    expect(verdict([annPic, annNote, annRegion])).toMatchObject({ allowed: [annPic, annNote, annRegion], refused: [] });
  });

  it('a region of its own round marks of another hand may be moved: it carries them, and `moved` says so', () => {
    const { me, annBox, annNote, verdict } = room();
    const region = me.region({ name: 'Notes', bounds: R(0, 0, 400, 300), at: 2000 })!;
    const got = verdict([region]);
    expect(got.allowed).toEqual([region]);
    expect(got.refused).toEqual([]);
    expect(got.moved).toEqual(expect.arrayContaining([region, annBox, annNote]));
  });

  it('what is not there is still refused: missing, or erased', () => {
    const { me, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    me.erase(mine, 2001);
    expect(verdict(['nope'])).toMatchObject({ allowed: [], refused: [{ id: 'nope', why: 'missing', of: 'nope' }] });
    expect(verdict([mine]).refused).toEqual([{ id: mine, why: 'missing', of: mine }]);
  });

  it('a mixed list moves what is there and refuses what is not, each by itself', () => {
    const { annBox, verdict } = room();
    const got = verdict([annBox, 'nope']);
    expect(got.allowed).toEqual([annBox]);
    expect(got.refused).toEqual([{ id: 'nope', why: 'missing', of: 'nope' }]);
  });

  it('is pure: it writes nothing', () => {
    const { me, annBox, verdict } = room();
    const before = me.getEvents().length;
    verdict([annBox]);
    expect(me.getEvents().length).toBe(before);
  });

  it('`moved` is every thing a move moves, each once: the named ids, a region\'s contents, an artifact\'s marks', () => {
    const { me, annBox, annNote, verdict } = room();
    const mine = me.addStroke(rectStroke(2000, 2000, 80, 60), 2000, undefined, 1, { content: true });
    const region = me.region({ name: 'Mixed', bounds: R(0, 0, 400, 300), at: 2001 })!;
    const got = verdict([region, mine]);
    expect(new Set(got.moved).size).toBe(got.moved.length);
    expect(got.moved).toEqual(expect.arrayContaining([region, mine, annBox, annNote]));
  });
});

describe('movedSaid — honest about whose marks moved', () => {
  it('says how many marks, and how many of whose', () => {
    const { me, annBox, annNote, verdict } = room();
    const mine = me.addStroke(rectStroke(400, 400, 80, 60), 2000, undefined, 1, { content: true });
    const name = (id: string) => (me.isMine(id) ? 'claude' : 'ann');
    const board = me.getState();
    const isMine = (id: string) => me.isMine(id);
    expect(movedSaid(board, verdict([mine]).moved, isMine, name)).toBe('1 mark');
    expect(movedSaid(board, verdict([annBox]).moved, isMine, name)).toBe('1 mark — 1 of ann’s');
    expect(movedSaid(board, verdict([mine, annBox, annNote]).moved, isMine, name)).toBe('3 marks — 2 of ann’s');
  });

  it('counts a region\'s contents, not the region, and says a lone region is a region', () => {
    const { me, verdict } = room();
    const name = (id: string) => (me.isMine(id) ? 'claude' : 'ann');
    const isMine = (id: string) => me.isMine(id);
    const empty = me.region({ name: 'Nothing', bounds: R(5000, 5000, 100, 100), at: 2000 })!;
    expect(movedSaid(me.getState(), verdict([empty]).moved, isMine, name)).toBe('1 region');
    const notes = me.region({ name: 'Notes', bounds: R(0, 0, 400, 300), at: 2001 })!;
    expect(movedSaid(me.getState(), verdict([notes]).moved, isMine, name)).toMatch(/^\d+ marks — \d+ of ann’s$/);
  });

  it('names each other hand it moved marks of', () => {
    const { me, annBox, annPic, verdict } = room();
    const board = me.getState();
    const name = (id: string) => (id === annBox ? 'ann’s-friend' : me.isMine(id) ? 'claude' : 'ann');
    expect(movedSaid(board, verdict([annBox, annPic]).moved, (id) => me.isMine(id), name)).toBe('2 marks — 1 of ann’s, 1 of ann’s-friend’s');
  });
});

describe('otherHandMoves — what another hand moved of the reader\'s own marks, for the reader to be told', () => {
  /** Ann's board after claude, loaded with her marks, moved them. */
  function moved() {
    const ann = hand('ann');
    const annBox = ann.addStroke(rectStroke(50, 50, 100, 80), 1000, undefined, 1, { content: true });
    const annNote = ann.import({ kind: 'text', path: 'note.txt', name: 'note', bounds: R(60, 160, 140, 60), code: 'x', at: 1001 })!;
    const claude = hand('claude');
    claude.load(mergeLogs({ ann: ann.getEvents().slice(), claude: [] }, { me: 'claude' }));
    const own = claude.addStroke(rectStroke(600, 600, 60, 40), 2000, undefined, 1, { content: true });
    claude.move({ ids: [annBox, annNote, own], dx: 30, dy: 0, at: 2001 });
    claude.move({ ids: [own], dx: 0, dy: 5, at: 2002 });
    const board = hand('ann');
    board.load(mergeLogs({ ann: ann.getEvents().slice(), claude: claude.getEvents().slice() }, { me: 'ann' }));
    return { board, annBox, annNote, own };
  }

  it('lists a move by another hand that moved some of the reader\'s marks: who, which of theirs', () => {
    const { board, annBox, annNote, own } = moved();
    const got = otherHandMoves(board.getState(), board.getEvents(), (id) => board.isMine(id));
    expect(got).toHaveLength(1);
    expect(got[0].by).toBe('claude');
    expect(got[0].mine.sort()).toEqual([annBox, annNote].sort());
    expect(got[0].mine).not.toContain(own);
    expect(typeof got[0].key).toBe('string');
  });

  it('is silent for the reader\'s own moves: only the other hand\'s move is listed', () => {
    const { board, annBox } = moved();
    board.move({ ids: [annBox], dx: 5, dy: 5, at: 3000 });
    const got = otherHandMoves(board.getState(), board.getEvents(), (id) => board.isMine(id));
    expect(got).toHaveLength(1);
    expect(got[0].by).toBe('claude');
  });

  it('gives each event one key, the same on every read, so a surface says it once', () => {
    const { board } = moved();
    const a = otherHandMoves(board.getState(), board.getEvents(), (id) => board.isMine(id));
    const b = otherHandMoves(board.getState(), board.getEvents(), (id) => board.isMine(id));
    expect(a.map((x) => x.key)).toEqual(b.map((x) => x.key));
  });
});
