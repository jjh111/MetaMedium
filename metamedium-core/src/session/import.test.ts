// A file of a known kind becomes an artifact where it was placed; a traced picture becomes ink.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { LOCAL_PARTICIPANT, wordOf } from './nodes';
import { rectStroke } from '../test/strokes';

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
});
