// A file of a known kind becomes an artifact where it was placed; a traced picture becomes ink.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { LOCAL_PARTICIPANT, wordOf } from './nodes';
import { rectStroke } from '../test/strokes';
import { isPictureKind, pictureOf } from '../kinds/picture';
import { kindOf } from '../kinds/kinds';

describe('import', () => {
  it('a file is an artifact of its kind at its bounds, live when it renders, with its path kept', () => {
    const s = createSession();
    const id = s.import({ kind: 'md', path: 'notes/README.md', bounds: { minX: 0, minY: 0, maxX: 300, maxY: 200 }, code: '# Notes', at: 1000 })!;
    const st = s.getState();
    expect(st.artifacts).toEqual([id]);
    expect(st.contentIds).toEqual([id]);
    expect(st.live).toEqual([id]);
    const n = st.nodes.get(id)!;
    expect(st.artifacts).toContain(n.id);
    expect(wordOf(n)).toBe('README.md');
    const code = n.reps.find((r) => r.modality === 'code')!.data as { kind: string; path: string; code: string };
    expect([code.kind, code.path, code.code]).toEqual(['md', 'notes/README.md', '# Notes']);
    const png = s.import({ kind: 'png', path: 'photo.png', name: 'photo', bounds: { minX: 400, minY: 0, maxX: 700, maxY: 200 }, code: '', at: 2000 })!;
    expect(s.getState().live).not.toContain(png);
    expect(s.getState().artifacts).toContain(png);
  });

  it('a traced picture is ink, declared content, attributed to the importer', () => {
    const s = createSession();
    const first = s.import({ kind: 'png', path: 'sketch.png', bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, strokes: [rectStroke(10, 10, 100, 60), rectStroke(150, 10, 100, 60)], at: 1000 })!;
    const st = s.getState();
    expect(st.contentIds).toHaveLength(2);
    expect(st.contentIds[0]).toBe(first);
    expect(st.artifacts).toEqual([]);
    expect(st.nodes.get(first)!.edges.some((e) => e.rel === 'made-by' && e.to === LOCAL_PARTICIPANT)).toBe(true);
    // Declared content: two boxes drawn at once never read as a lasso.
    expect(st.pendingLassoId).toBeNull();
  });

  it('replays and undoes like any event', () => {
    const s = createSession();
    s.import({ kind: 'json', path: 'a.json', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, code: '{}', at: 1000 });
    const copy = createSession();
    copy.load(s.getEvents());
    expect(copy.getState().artifacts).toHaveLength(1);
    s.undo();
    expect(s.getState().artifacts).toHaveLength(0);
  });

  // ---- A picture is kept and drawn (PLAN-IPAD-NOTES I1) ----------------------
  // The event names the asset the bytes are kept under (a SHA-256, in the browser's
  // asset store) and never carries them; an event with no asset is a version 1 log's
  // picture and is drawn as its name, as before.
  const HASH = 'sha256:' + 'ab'.repeat(32);
  const BOX = { minX: 0, minY: 0, maxX: 400, maxY: 300 };

  it('a picture names its asset, its mime and its size; the node carries them, is an artifact and is never live', () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/IMG_0001.jpg', name: 'IMG_0001.jpg', bounds: BOX, asset: HASH, mime: 'image/jpeg', w: 2560, h: 1920, at: 1000 })!;
    expect(id).toBeTruthy();
    const st = s.getState();
    expect(st.artifacts).toEqual([id]);
    expect(st.contentIds).toEqual([id]);
    expect(st.live).not.toContain(id);
    const p = pictureOf(st.nodes.get(id)!)!;
    expect(p).toMatchObject({ kind: 'jpg', asset: HASH, mime: 'image/jpeg', w: 2560, h: 1920, name: 'IMG_0001.jpg', path: 'imports/IMG_0001.jpg' });
    // The event is data: no bytes anywhere in it.
    const ev = s.getEvents().find((e) => e.type === 'import')!;
    expect(JSON.stringify(ev)).not.toMatch(/base64|data:/);
    expect(JSON.stringify(ev).length).toBeLessThan(400);
  });

  it('webp is a picture kind beside png and jpg', () => {
    expect(kindOf('a.webp')?.kind).toBe('webp');
    expect(['png', 'jpg', 'webp'].every((k) => isPictureKind(k as never))).toBe(true);
    expect(['svg', 'html', 'text', 'run'].some((k) => isPictureKind(k as never))).toBe(false);
    const s = createSession();
    const id = s.import({ kind: 'webp', path: 'imports/a.webp', name: 'a.webp', bounds: BOX, asset: HASH, mime: 'image/webp', w: 800, h: 600, at: 1 })!;
    expect(s.getState().live).not.toContain(id);
    expect(pictureOf(s.getState().nodes.get(id)!)!.kind).toBe('webp');
  });

  it('a picture replays, undoes and survives a log read back as text', () => {
    const s = createSession();
    s.import({ kind: 'png', path: 'imports/a.png', name: 'a.png', bounds: BOX, asset: HASH, mime: 'image/png', w: 10, h: 20, at: 1000 });
    const copy = createSession();
    copy.load(JSON.parse(JSON.stringify(s.getEvents())));
    const id = copy.getState().artifacts[0];
    expect(pictureOf(copy.getState().nodes.get(id)!)).toMatchObject({ asset: HASH, w: 10, h: 20 });
    s.undo();
    expect(s.getState().artifacts).toHaveLength(0);
  });

  it('an old picture event — a path and an empty code, no asset — replays as it always did: an artifact that draws its name', () => {
    const s = createSession();
    s.load([{ type: 'import', kind: 'png', path: 'imports/old.png', name: 'old.png', bounds: BOX, code: '', at: 1000 }] as never);
    const st = s.getState();
    expect(st.artifacts).toHaveLength(1);
    expect(st.live).toEqual([]);
    const p = pictureOf(st.nodes.get(st.artifacts[0])!)!;
    expect(p.asset).toBeUndefined();
    expect(p).toMatchObject({ kind: 'png', name: 'old.png', path: 'imports/old.png' });
  });

  it('what is not an asset reference is not kept, and an import of nothing is nothing', () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/x.jpg', name: 'x.jpg', bounds: BOX, asset: '../../etc/passwd', w: -3, h: Number.NaN, at: 1 })!;
    const p = pictureOf(s.getState().nodes.get(id)!)!;
    expect(p.asset).toBeUndefined();
    expect(p.w).toBeUndefined();
    expect(p.h).toBeUndefined();
    // No code, no strokes, no asset: nothing to hold.
    expect(createSession().import({ kind: 'jpg', path: 'imports/y.jpg', bounds: BOX, at: 1 })).toBeNull();
  });

  it('pictureOf is null for anything that is not a picture', () => {
    const s = createSession();
    const id = s.import({ kind: 'md', path: 'README.md', bounds: BOX, code: '# hi', at: 1 })!;
    expect(pictureOf(s.getState().nodes.get(id)!)).toBeNull();
  });
});
