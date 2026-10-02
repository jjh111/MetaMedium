// Read these, Read the board, Read the picture (PLAN-IPAD-NOTES I8): the offers of the read tool for
// notes — several lines of handwriting held together, the whole board's writing, a picture held alone.
// Offers are data; asking the reader is the host's, named by the act each take returns.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { handText, circleStroke, lineStroke as fp7Line, rectStroke as fp7Rect } from '../test/strokes';
import type { ToolHost } from './tool';
import { offersFor, toolScope, takeOffer } from './registry';
import './builtin';

const HASH = 'sha256:' + 'ef'.repeat(32);
let at = 10_000;
const word = (s: Session, x: number, y: number, w = 160, seed = 1) => s.addStroke(handText(x, y, w, 40, { seed }), (at += 10_000), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (at += 10_000)); };
const SEES: Partial<ToolHost> = { models: [{ name: 'reader', sees: true }] };
const offers = (s: Session, host: Partial<ToolHost> = SEES) => offersFor(toolScope(s, { host }));
const keys = (s: Session, host?: Partial<ToolHost>) => offers(s, host).filter((o) => o.tool === 'read').map((o) => o.key);

describe('Read these', () => {
  it('several lines of writing held: ONE offer reads them all, in place of Read the writing, asking a model and saying how many lines', () => {
    const s = createSession();
    const ids = [word(s, 100, 100), word(s, 100, 260, 220, 2), word(s, 100, 420, 120, 3)];
    hold(s, ids);
    expect(keys(s)).toEqual(['read-lines']);
    const o = offers(s).find((x) => x.key === 'read-lines')!;
    expect(o).toMatchObject({ label: 'Read these', asks: 'model', tool: 'read' });
    expect(o.reason).toMatch(/3 lines/);
    expect(o.hidden).toBeFalsy();
    expect(takeOffer(o, toolScope(s, { host: SEES }), s, 99_000_000).host).toBe('read-lines');
    expect(o.data).toMatchObject({ ids, force: false });
  });

  it('one line, even of two words, is Read the writing as it was; a circle among the lines is not read', () => {
    const s = createSession();
    const a = word(s, 100, 100), b = word(s, 290, 100, 120, 2);
    hold(s, [a, b]);
    expect(keys(s)).toEqual(['read']);
    const t = createSession();
    const ring = t.addStroke(circleStroke(600, 300, 40), 5000, undefined, 1);
    hold(t, [word(t, 100, 100), word(t, 100, 260, 220, 2), ring]);
    expect((offers(t).find((x) => x.key === 'read-lines')!.data as { ids: string[] }).ids).not.toContain(ring);
  });

  it('lines already read are skipped by default, said so; with every line read it is offered again, typed only', () => {
    const s = createSession();
    const ids = [word(s, 100, 100), word(s, 100, 260, 220, 2), word(s, 100, 420, 120, 3)];
    hold(s, ids);
    const someRead: Partial<ToolHost> = { ...SEES, isRead: (id) => id === ids[0] };
    const o = offers(s, someRead).find((x) => x.key === 'read-lines')!;
    expect(o.reason).toMatch(/2 not read yet|2 unread|2 of 3/);
    expect(o.data).toMatchObject({ force: false });
    const allRead: Partial<ToolHost> = { ...SEES, isRead: () => true };
    const again = offers(s, allRead).find((x) => x.key === 'read-lines')!;
    expect(again.label).toBe('Read these again');
    expect(again.hidden).toBe(true);
    expect(again.data).toMatchObject({ force: true });
  });

  it('with no model that sees, the offer says what it needs', () => {
    const s = createSession();
    hold(s, [word(s, 100, 100), word(s, 100, 260, 220, 2)]);
    expect(offers(s, { models: [] }).find((x) => x.key === 'read-lines')!.reason).toMatch(/needs a model that can see/);
  });
});

describe('Read the board', () => {
  it('is a typed offer, there when the host says the board holds lines of writing, reading the whole board — never the held marks', () => {
    const s = createSession();
    hold(s, [word(s, 100, 100)]);
    expect(offers(s).some((o) => o.key === 'read-board')).toBe(false);
    const o = offers(s, { ...SEES, writing: () => ({ lines: 5, unread: 3 }) }).find((x) => x.key === 'read-board')!;
    expect(o).toMatchObject({ label: 'Read the board', asks: 'model', tool: 'read', hidden: true });
    expect(o.verbs).toContain('read the board');
    expect(o.reason).toMatch(/5 lines/);
    expect(takeOffer(o, toolScope(s, { host: SEES }), s, 99_000_000).host).toBe('read-board');
    expect(offers(s, { ...SEES, writing: () => ({ lines: 0, unread: 0 }) }).some((x) => x.key === 'read-board')).toBe(false);
  });

  it('is not offered when every line on the board is already held — reading the board would be reading these (e2e 49\'s golden: a line held alone on its board)', () => {
    const s = createSession();
    hold(s, [word(s, 100, 100)]);
    expect(offers(s, { ...SEES, writing: () => ({ lines: 1, unread: 1 }) }).some((x) => x.key === 'read-board')).toBe(false);
    const s2 = createSession();
    hold(s2, [word(s2, 100, 100), word(s2, 100, 260, 220, 2)]);
    expect(offers(s2, { ...SEES, writing: () => ({ lines: 2, unread: 2 }) }).some((x) => x.key === 'read-board')).toBe(false);
    expect(offers(s2, { ...SEES, writing: () => ({ lines: 3, unread: 3 }) }).some((x) => x.key === 'read-board')).toBe(true);
  });
});

describe('Read the picture', () => {
  const BOX = { minX: 100, minY: 100, maxX: 500, maxY: 400 };
  it('a picture held alone, with its pixels kept, is offered; taking it names the host act with the picture and its name', () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/notes.jpg', name: 'notes.jpg', bounds: BOX, asset: HASH, mime: 'image/jpeg', w: 1000, h: 750, at: 1000 })!;
    hold(s, [id]);
    const o = offers(s).find((x) => x.key === 'read-picture')!;
    expect(o).toMatchObject({ label: 'Read the picture', asks: 'model', tool: 'read' });
    expect(o.reason).toMatch(/text/);
    const taken = takeOffer(o, toolScope(s, { host: SEES }), s, 99_000_000);
    expect(taken.host).toBe('read-picture');
    expect(taken.detail).toMatchObject({ artifact: id, asset: HASH, name: 'notes.jpg' });
  });
  it('is offered for nothing else: ink, a text, a picture with no pixels kept, two pictures', () => {
    const ink = createSession();
    hold(ink, [word(ink, 100, 100)]);
    expect(offers(ink).some((o) => o.key === 'read-picture')).toBe(false);
    const txt = createSession();
    hold(txt, [txt.import({ kind: 'md', path: 'a.md', bounds: BOX, code: '# hi', at: 1 })!]);
    expect(offers(txt).some((o) => o.key === 'read-picture')).toBe(false);
    const old = createSession();
    hold(old, [old.import({ kind: 'png', path: 'imports/old.png', bounds: BOX, code: '', at: 1 })!]);
    expect(offers(old).some((o) => o.key === 'read-picture')).toBe(false);
    const two = createSession();
    const a = two.import({ kind: 'jpg', path: 'a.jpg', bounds: BOX, asset: HASH, at: 1 })!;
    const b = two.import({ kind: 'jpg', path: 'b.jpg', bounds: BOX, asset: 'sha256:' + '01'.repeat(32), at: 2 })!;
    hold(two, [a, b]);
    expect(offers(two).some((o) => o.key === 'read-picture')).toBe(false);
  });
});

// PLAN-FIELD-PAR FP7: a head drawn apart from its connector is that connector's head, not
// writing the rung missed — two boxes, a line and a chevron at its end are not offered *Read as writing*.
describe('read as writing is not offered on a head drawn apart', () => {
  it('two boxes, a line between them and a chevron at its end: no Read as writing', () => {
    const s = createSession();
    const a = s.addStroke(fp7Rect(100, 100, 160, 110), 1000);
    const b = s.addStroke(fp7Rect(460, 100, 160, 110), 2000);
    const l = s.addStroke(fp7Line({ x: 262, y: 155 }, { x: 458, y: 155 }), 3000);
    const h = s.addStroke([...fp7Line({ x: 438, y: 143 }, { x: 458, y: 155 }, 12), ...fp7Line({ x: 458, y: 155 }, { x: 438, y: 167 }, 12).slice(1)], 3400);
    s.summonMarks([a, b, l, h], 900_000);
    const keys = offersFor(toolScope(s, { host: { models: [{ name: 'm', sees: true }] } as never })).map((o) => o.key);
    expect(keys).not.toContain('read-any');
  });
});
