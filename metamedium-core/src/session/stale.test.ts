// STATE-1: a late result must not resurrect a deleted target.
//
// A model is asked, the human erases the target while it thinks, and the reply
// lands. The reply is not wrong — it is about a board that no longer exists.
// It must be refused, with a reason the surface can say, and it must not enter
// the log: an event that sits in the log is replayed when the human undoes
// their erase, and the discarded answer comes back to life.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { getRep } from './nodes';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';

/** A blessed artifact of two boxes, and a joined model that can answer about it. */
function board() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(rectStroke(340, 100, 200, 120), 1100);
  s.addStroke(circleStroke(320, 160, 300), 2000);
  s.addStroke(checkStroke(650, 160), 2500);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'landing page', at: 3000 })!;
  const pid = s.join('agent', 'llm:test', 3100, 2);
  return { s, id, pid };
}

describe('a late result and an erased target', () => {
  it('refuses code attached to an artifact the human erased', () => {
    const { s, id, pid } = board();
    s.erase(id, 3400);
    expect(s.getState().live).toEqual([]);

    const accepted = s.attachCode({ participantId: pid, nodeId: id, code: '<h1>late</h1>', at: 3500 });

    expect(accepted).toBeNull();
    expect(s.getState().live).toEqual([]);
    const node = s.getState().nodes.get(id)!;
    expect(getRep(node, 'erased')).toBeTruthy();
    expect(node.reps.filter((r) => r.modality === 'code')).toHaveLength(0);
  });

  it('says why, instead of dropping it silently', () => {
    const { s, id, pid } = board();
    s.erase(id, 3400);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>late</h1>', at: 3500 });

    const stale = s.getState().staleResult;
    expect(stale).not.toBeNull();
    expect(stale!.reason).toBe('erased');
    expect(stale!.nodeId).toBe(id);
    expect(stale!.participantId).toBe(pid);
    expect(stale!.detail).toMatch(/erased/i);
  });

  it('keeps the refused result out of the log, so undo of the erase does not activate it', () => {
    const { s, id, pid } = board();
    const before = s.getEvents().length;
    s.erase(id, 3400);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>late</h1>', at: 3500 });
    // The erase is logged; the refused code is not.
    expect(s.getEvents().length).toBe(before + 1);

    // Undo puts the artifact back — the legitimate one, with no code on it.
    s.undo();
    expect(s.getState().artifacts).toContain(id);
    expect(s.getState().live).toEqual([]);
    expect(s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code')).toHaveLength(0);
  });

  it('undo of the erase restores the artifact that was there, code and all', () => {
    // The other half of the same rule: what the human erased comes BACK when
    // they take the erase back — with the version it legitimately had, not the
    // one that was refused while it was gone.
    const { s, id, pid } = board();
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>real</h1>', at: 3200 });
    expect(s.getState().live).toEqual([id]);

    s.erase(id, 3400);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>late</h1>', at: 3500 });
    expect(s.getState().live).toEqual([]);

    s.undo();
    expect(s.getState().live).toEqual([id]);
    const codes = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(1);
    expect((codes[0].data as { code: string }).code).toBe('<h1>real</h1>');
  });
});

describe('a late result and a board that was replaced', () => {
  it('refuses a result pinned to the generation before a load', () => {
    const { s, id, pid } = board();
    const asked = s.getState().generation;

    // The human opened another folder, or reset. Ids are a counter derived on
    // replay, so a fresh board hands out the same ids again — which is exactly
    // why the generation, not the id, is what says this is the same board.
    s.load([]);
    expect(s.getState().generation).toBe(asked + 1);

    const accepted = s.attachCode({
      participantId: pid, nodeId: id, code: '<h1>late</h1>', at: 3500,
      expect: { generation: asked },
    });
    expect(accepted).toBeNull();
    expect(s.getState().staleResult!.reason).toBe('replaced');
    expect(s.getState().staleResult!.detail).toMatch(/board was replaced/);
    expect(s.getState().live).toEqual([]);
  });

  it('a result pinned to the board it was asked about still lands', () => {
    const { s, id, pid } = board();
    const accepted = s.attachCode({
      participantId: pid, nodeId: id, code: '<h1>in time</h1>', at: 3500,
      expect: { generation: s.getState().generation },
    });
    expect(accepted).toBe(id);
    expect(s.getState().live).toEqual([id]);
    expect(s.getState().staleResult).toBeNull();
  });

  it('a reset by load([]) does not survive as a stale notice', () => {
    const { s, id, pid } = board();
    s.erase(id, 3400);
    s.attachCode({ participantId: pid, nodeId: id, code: 'x', at: 3500 });
    expect(s.getState().staleResult).not.toBeNull();
    s.load([]);
    expect(s.getState().staleResult).toBeNull();
  });
});

describe('a late revision and a version that moved on', () => {
  // The conflict policy: THE STANDING NEWER VERSION WINS. A revision is
  // written FROM one particular version, so once the artifact has moved past
  // it the revision is about content the artifact no longer holds, and it is
  // refused rather than silently overwriting the newer one. Only a caller that
  // pins its version gets this — an unpinned attachment stays plural, because
  // several participants may each offer code and no tier commits.
  it('refuses a revision pinned to a version a newer one has replaced', () => {
    const { s, id, pid } = board();
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>v1</h1>', at: 3200 });
    const wrote = s.codeVersion(id); // 1 — what the slow model was handed

    // Someone else revised while the slow model was thinking.
    const other = s.join('agent', 'llm:quick', 3250, 2);
    s.attachCode({ participantId: other, nodeId: id, code: '<h1>v2</h1>', at: 3300 });

    const accepted = s.attachCode({
      participantId: pid, nodeId: id, code: '<h1>v1 revised</h1>', at: 3400,
      expect: { version: wrote },
    });
    expect(accepted).toBeNull();
    expect(s.getState().staleResult!.reason).toBe('superseded');
    expect(s.getState().staleResult!.detail).toMatch(/older version/);

    // The newer version stands, untouched.
    const codes = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(2);
    expect((codes[codes.length - 1].data as { code: string }).code).toBe('<h1>v2</h1>');
  });

  it('accepts a revision pinned to the version that is still standing', () => {
    const { s, id, pid } = board();
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>v1</h1>', at: 3200 });
    const accepted = s.attachCode({
      participantId: pid, nodeId: id, code: '<h1>v2</h1>', at: 3400,
      expect: { version: s.codeVersion(id) },
    });
    expect(accepted).toBe(id);
    expect(s.codeVersion(id)).toBe(2);
  });

  it('leaves unpinned attachments plural — several participants may each offer code', () => {
    const { s, id } = board();
    const a = s.join('agent', 'llm:one', 3100, 1);
    const b = s.join('agent', 'llm:two', 3100, 2);
    s.attachCode({ participantId: a, nodeId: id, code: '<p>A</p>', at: 3200 });
    s.attachCode({ participantId: b, nodeId: id, code: '<p>B</p>', at: 3300 });
    const codes = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(2);
    expect(codes.map((r) => r.source).sort()).toEqual([a, b].sort());
    expect(s.getState().staleResult).toBeNull();
  });
});

describe('the other late paths', () => {
  it('refuses a reading proposed onto ink that was erased', () => {
    const { s, pid } = board();
    const mark = s.addStroke(rectStroke(700, 400, 90, 60), 4000);
    s.erase(mark, 4100);

    s.propose({
      participantId: pid, nodeId: mark, edges: [],
      reps: [{ modality: 'transcript', data: { text: 'Pricing' }, confidence: 0.9 }],
      at: 4200,
    });
    expect(s.getState().staleResult!.reason).toBe('erased');
    expect(s.getState().staleResult!.what).toBe('propose');
    expect(s.getState().nodes.get(mark)!.reps.filter((r) => r.modality === 'transcript')).toHaveLength(0);
  });

  it('refuses an answer whose every mark is gone, and says whose answer it was', () => {
    const { s, pid } = board();
    const mark = s.addStroke(rectStroke(700, 400, 90, 60), 4000);
    s.erase(mark, 4100);

    const explanationId = s.answer({
      participantId: pid, question: 'why?', text: 'because', aboutIds: [mark], at: 4200,
    });
    expect(explanationId).toBeNull();
    expect(s.getState().explanations).toEqual([]);
    expect(s.getState().staleResult!.reason).toBe('erased');
    // The sentence names the model, so the status line can say who was late.
    expect(s.getState().staleResult!.detail).toContain('llm:test');
  });

  it('anchors an answer to the marks that survive when only some were erased', () => {
    const { s, pid } = board();
    const gone = s.addStroke(rectStroke(700, 400, 90, 60), 4000);
    const here = s.addStroke(rectStroke(820, 400, 90, 60), 4050);
    s.erase(gone, 4100);

    const explanationId = s.answer({
      participantId: pid, question: 'why?', text: 'because', aboutIds: [gone, here], at: 4200,
    });
    expect(explanationId).not.toBeNull();
    expect(s.getState().staleResult).toBeNull();
    const about = s.getState().nodes.get(explanationId!)!.edges.filter((e) => e.rel === 'about').map((e) => e.to);
    expect(about).toEqual([here]);
  });

  it('a loaded log that erases before it codes never lights the artifact up', () => {
    // A merged log can arrive with the erase first — another hand's events,
    // ordered by their clock. State is a pure function of the log either way.
    const { s, id, pid } = board();
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>x</h1>', at: 3200 });
    const log = s.getEvents();
    const code = log.find((e) => e.type === 'code')!;
    const reordered = [...log.filter((e) => e !== code), { ...code, at: 9000 }];

    const t = createSession();
    t.load([...reordered.slice(0, -1), { type: 'erase', nodeId: id, at: 8000 }, reordered[reordered.length - 1]]);
    expect(t.getState().live).toEqual([]);
  });
});
