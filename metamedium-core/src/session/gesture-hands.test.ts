// Gestures are per hand (V1-PLAN L2h).
//
// The gesture state — a loop waiting to be taken up, a summon, the selection,
// the command mark's look-back over "what you were just doing", the mark a
// hand taught — was one for the whole board, while a merged log interleaves
// the hands' events by time. So another hand's stroke landing between a
// hand's summon and its bless dissolved the summon on replay, and the bless
// was lost on every board, the blesser's own included once the room's logs
// merged; set between a loop and its check, the loop was not taken up, and
// the check read backwards instead, holding the loop's own ink as a member.
//
// Each hand's gestures are its own, keyed by the hand exactly as authorship
// is keyed — "local" in another hand's log means that hand — so every board
// keys them the same way on replay, and the board's own state is its reader's.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from './session';
import { LOCAL_PARTICIPANT, ENGINE_PARTICIPANT, authorOf, getRep, isGesture } from './nodes';
import { learnCommandMark } from './commandmark';
import { mergeLogs } from '../store/merge';
import { rectStroke, circleStroke, checkStroke, caretStroke } from '../test/strokes';

/** A session that knows what its log is called, so its ids are its own (D8). */
const hand = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** The board a reader sees: every log merged, the reader's own unstamped. */
function board(me: string, logs: Record<string, readonly SessionEvent[]>): Session {
  const s = hand(me);
  s.load(mergeLogs(logs, { me }));
  return s;
}

/** Whose a hand is on a board: its own reader's, or a hand of that name. */
const handOn = (reader: string, writer: string) => (reader === writer ? LOCAL_PARTICIPANT : `participant:hand:${writer}`);

/** The marks an artifact holds, sorted. */
function membersOf(s: Session, artifactId: string): string[] {
  const n = s.getState().nodes.get(artifactId);
  return n ? n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to).sort() : [];
}

/** What a gesture node says it was: its role, and how a mark decided its scope. */
function gestureOf(s: Session, id: string): { role?: string; scope?: string } | undefined {
  const n = s.getState().nodes.get(id);
  return n ? (getRep(n, 'gesture')?.data as { role?: string; scope?: string } | undefined) : undefined;
}

/** Three boxes in a row, 40 apart: near one another, so a look-back gathers them. */
const ROW = [rectStroke(100, 100, 150, 120), rectStroke(290, 100, 150, 120), rectStroke(480, 100, 150, 120)];
/** A loop around the row, and a check across its right edge. */
const LOOP = circleStroke(365, 160, 300);
const CHECK = checkStroke(630, 150);

/**
 * Ann draws the row, circles it, takes the loop up with a check and names it,
 * on her own board. The other hand draws twice meanwhile: once at the very
 * moment of her check — so the tie between the two logs' names decides which
 * of the two comes first in the merge — and once between her check and her
 * bless. Both are well away from her marks.
 */
function annNamesTheRow(other: string) {
  const ann = hand('ann');
  const boxes = ROW.map((pts, i) => ann.addStroke(pts, 1000 + 400 * i));
  const loop = ann.addStroke(LOOP, 3000);
  const check = ann.addStroke(CHECK, 3500);
  const summon = ann.getState().summon!;
  const artifact = ann.bless({ summonId: summon.id, name: 'row', at: 6000 })!;
  const bob = hand(other);
  const his = [bob.addStroke(rectStroke(1200, 900, 100, 60), 3500), bob.addStroke(rectStroke(1400, 900, 100, 60), 4500)];
  return { annLog: ann.getEvents().slice(), bobLog: bob.getEvents().slice(), boxes, loop, check, summon, artifact, his };
}

describe('gestures are per hand (V1-PLAN L2h)', () => {
  it('guard: with the other hand drawing only after her bless, the row stands on every board — as it always did', () => {
    const ann = hand('ann');
    const boxes = ROW.map((pts, i) => ann.addStroke(pts, 1000 + 400 * i));
    ann.addStroke(LOOP, 3000);
    ann.addStroke(CHECK, 3500);
    const artifact = ann.bless({ summonId: ann.getState().summon!.id, name: 'row', at: 6000 })!;
    const bob = hand('bob');
    bob.addStroke(rectStroke(1200, 900, 100, 60), 7000);
    for (const me of ['ann', 'bob', 'cleo']) {
      const s = board(me, { ann: ann.getEvents().slice(), bob: bob.getEvents().slice() });
      expect(s.getState().artifacts).toEqual([artifact]);
      expect(membersOf(s, artifact)).toEqual([...boxes].sort());
    }
  });

  for (const other of ['bob', 'abe']) {
    // 'bob' sorts after 'ann' and 'abe' before her, so the stroke drawn at the
    // moment of her check lands after it in one merge and before it in the
    // other — between her loop and her check.
    it(`a hand's summon survives another hand's strokes before its bless: the row stands on her board, his and a third's (${other} ${other < 'ann' ? 'before' : 'after'} her on the tie)`, () => {
      const run = annNamesTheRow(other);
      // On her own board as she drew it, the row stood.
      const boards: [string, Record<string, readonly SessionEvent[]>][] = [
        ['ann', { ann: run.annLog, [other]: run.bobLog }],
        [other, { ann: run.annLog, [other]: run.bobLog }],
        ['cleo', { ann: run.annLog, [other]: run.bobLog }],
        ['cleo', { [other]: run.bobLog, ann: run.annLog }],
      ];
      for (const [me, logs] of boards) {
        const s = board(me, logs);
        const st = s.getState();
        // The bless applied to her own summon: the artifact stands, holding her row and nothing else.
        expect(st.artifacts).toEqual([run.artifact]);
        expect(membersOf(s, run.artifact)).toEqual([...run.boxes].sort());
        expect(authorOf(st.nodes.get(run.artifact)!)).toBe(handOn(me, 'ann'));
        // Her loop was taken up by her check: both are gestures, neither is ink on the board.
        expect(gestureOf(s, run.loop)).toEqual({ role: 'lasso' });
        expect(gestureOf(s, run.check)).toEqual({ role: 'check' });
        expect(st.contentIds).not.toContain(run.loop);
        // His marks stand loose, his own.
        for (const id of run.his) {
          expect(st.contentIds).toContain(id);
          expect(authorOf(st.nodes.get(id)!)).toBe(handOn(me, other));
        }
        // Nobody's field is left open on any board.
        expect(st.summon).toBeNull();
        expect(st.selection).toEqual([]);
      }
    });
  }

  it('a hand\'s loop is taken up by its own check whatever another hand drew in between, on every board', () => {
    const ann = hand('ann');
    const boxes = ROW.map((pts, i) => ann.addStroke(pts, 1000 + 400 * i));
    const loop = ann.addStroke(LOOP, 3000);
    const bob = hand('bob');
    const his = bob.addStroke(rectStroke(1200, 900, 100, 60), 3200);
    const check = ann.addStroke(CHECK, 3500);
    const logs = { ann: ann.getEvents().slice(), bob: bob.getEvents().slice() };
    for (const me of ['ann', 'bob', 'cleo']) {
      const s = board(me, logs);
      const st = s.getState();
      // Taken up, not read backwards: the check resolved her loop, and the loop is no member.
      expect(gestureOf(s, loop)).toEqual({ role: 'lasso' });
      expect(gestureOf(s, check)).toEqual({ role: 'check' });
      expect(st.contentIds).not.toContain(loop);
      expect(st.contentIds).toContain(his);
    }
    // On her board her field is open on exactly what the loop holds.
    const hers = board('ann', logs).getState();
    expect(hers.summon!.scopeSource).toBe('lasso');
    expect([...hers.summon!.enclosedIds].sort()).toEqual([...boxes].sort());
    expect(hers.summon!.gestureIds).toEqual([loop, check]);
    expect([...hers.selection].sort()).toEqual([...boxes].sort());
  });

  it('the command mark\'s look-back counts only its own hand\'s marks: a box another hand drew beside her row in the same breath does not come along', () => {
    const ann = hand('ann');
    const boxes = ROW.map((pts, i) => ann.addStroke(pts, 1000 + 400 * i));
    const bob = hand('bob');
    // His box continues her row, 40 from her last box, drawn just after it.
    const his = bob.addStroke(rectStroke(670, 100, 150, 120), 2000);
    // A check across her middle box, nothing circled: the mark reads backwards.
    const check = ann.addStroke(checkStroke(300, 130), 2200);
    const artifact = ann.bless({ summonId: ann.getState().summon!.id, name: 'row', at: 2600 })!;
    const logs = { ann: ann.getEvents().slice(), bob: bob.getEvents().slice() };
    for (const me of ['ann', 'bob', 'cleo']) {
      const s = board(me, logs);
      expect(gestureOf(s, check)).toEqual({ role: 'check', scope: 'recent' });
      expect(membersOf(s, artifact)).toEqual([...boxes].sort());
      expect(s.getState().contentIds).toContain(his);
    }
    // Before the bless, on her board: her field holds her row, and says it grew by her own marks.
    const before = board('ann', { ann: ann.getEvents().slice(0, -1), bob: bob.getEvents().slice() });
    const summon = before.getState().summon!;
    expect([...summon.enclosedIds].sort()).toEqual([...boxes].sort());
    expect(summon.scopeReasoning).toMatch(/crossed 1, and 2 more you drew alongside/);
    // What she was just doing is hers alone; his board's is his.
    expect(before.getState().recentIds).not.toContain(his);
    expect(board('bob', logs).getState().recentIds).toEqual([his]);
  });

  it('another hand\'s pending loop, summon and selection never open, close or change the reader\'s', () => {
    const ann = hand('ann'), bob = hand('bob');
    const a = ann.addStroke(rectStroke(100, 100, 150, 120), 1000);
    const b = bob.addStroke(rectStroke(900, 100, 150, 120), 1500);
    const annLoop = ann.addStroke(circleStroke(175, 160, 150), 2000); // hers, waiting
    bob.addStroke(circleStroke(975, 160, 150), 2500); // his loop…
    bob.addStroke(checkStroke(1105, 150), 3000); // …taken up: his field opens on his box
    const logs = () => ({ ann: ann.getEvents().slice(), bob: bob.getEvents().slice() });

    let hers = board('ann', logs()).getState();
    // Her loop still waits for her; his summon and his selection are not hers.
    expect(hers.pendingLassoId).toBe(annLoop);
    expect(hers.summon).toBeNull();
    expect(hers.selection).toEqual([]);
    let his = board('bob', logs()).getState();
    // His board: his field on his box, and her loop is not his to take up.
    expect(his.summon!.enclosedIds).toEqual([b]);
    expect(his.selection).toEqual([b]);
    expect(his.pendingLassoId).toBeNull();

    // She takes her own loop up; he selects outright, then lets it go.
    ann.addStroke(checkStroke(290, 150), 3500);
    bob.select([b], 3600);
    bob.deselect(3700);
    hers = board('ann', logs()).getState();
    expect(hers.summon!.scopeSource).toBe('lasso');
    expect(hers.summon!.enclosedIds).toEqual([a]);
    expect(hers.selection).toEqual([a]);
    his = board('bob', logs()).getState();
    expect(his.selection).toEqual([]);
    // Dismissing his own field closes his, never hers.
    bob.dismiss(bob.getState().summon!.id, 3800);
    hers = board('ann', logs()).getState();
    expect(hers.summon!.enclosedIds).toEqual([a]);
    expect(board('bob', logs()).getState().summon).toBeNull();
    // A third reader has no field open: neither hand's is the reader's.
    const third = board('cleo', logs()).getState();
    expect(third.summon).toBeNull();
    expect(third.selection).toEqual([]);
    expect(third.pendingLassoId).toBeNull();
  });

  it('a taught mark is its own hand\'s: hers never decides what takes his loop up, on any board', () => {
    // The carets mvp.test.ts teaches with.
    const caret = learnCommandMark(
      [caretStroke(0, 0, 60, 40), caretStroke(10, 5, 66, 44), caretStroke(0, 0, 54, 38), caretStroke(20, 20, 62, 46), caretStroke(5, 5, 58, 36)],
      'caret'
    );
    const ann = hand('ann'), bob = hand('bob');
    ann.teachCommandMark(caret, 500);
    const a = ann.addStroke(rectStroke(100, 100, 100, 80), 1000);
    const b = bob.addStroke(rectStroke(900, 100, 100, 80), 1200);
    const annLoop = ann.addStroke(circleStroke(150, 140, 140), 1500);
    const bobLoop = bob.addStroke(circleStroke(950, 140, 140), 1700);
    // She crosses hers with her caret; he crosses his with the check he was never taught out of.
    ann.addStroke(caretStroke(250, 120, 80, 50), 2000);
    bob.addStroke(checkStroke(1100, 140), 2200);
    const annArtifact = ann.bless({ summonId: ann.getState().summon!.id, name: 'hers', at: 3000 })!;
    const bobArtifact = bob.bless({ summonId: bob.getState().summon!.id, name: 'his', at: 3100 })!;
    const logs = { ann: ann.getEvents().slice(), bob: bob.getEvents().slice() };
    for (const me of ['ann', 'bob', 'cleo']) {
      const s = board(me, logs);
      const st = s.getState();
      expect([...st.artifacts].sort()).toEqual([annArtifact, bobArtifact].sort());
      expect(membersOf(s, annArtifact)).toEqual([a]);
      expect(membersOf(s, bobArtifact)).toEqual([b]);
      expect(isGesture(st.nodes.get(annLoop)!)).toBe(true);
      expect(isGesture(st.nodes.get(bobLoop)!)).toBe(true);
    }
    // The mark a board shows is its reader's own.
    expect(board('ann', logs).getState().commandMark?.name).toBe('caret');
    expect(board('bob', logs).getState().commandMark).toBeNull();
  });

  it('the trap: one hand\'s gesture keys alike on every board — a bless in the engine\'s name inside her act, and her model\'s gesture blessed in hers', () => {
    const ann = hand('ann'), bob = hand('bob');
    const model = ann.join('agent', 'llm:drawer', 900, 2);
    // The shard's pattern: summon outright, bless in the ENGINE's name — one act of hers.
    const a = ann.addStroke(rectStroke(100, 100, 150, 120), 1000);
    const sid = ann.summonMarks([a], 1100)!;
    bob.addStroke(rectStroke(1200, 900, 100, 60), 1150); // his stroke between her summon and her bless
    const hull = ann.bless({ summonId: sid, name: 'hull', at: 1200, participantId: ENGINE_PARTICIPANT })!;
    // Her model circles a box and checks it — a gesture made in her log — and she names what it held.
    const m = ann.addStroke(rectStroke(100, 400, 150, 120), 2000, model, 1, { content: true });
    ann.addStroke(circleStroke(175, 460, 150), 2500, model);
    bob.addStroke(rectStroke(1400, 900, 100, 60), 2700); // his stroke between the model's loop and its check
    ann.addStroke(checkStroke(290, 450), 3000, model);
    bob.addStroke(rectStroke(1600, 900, 100, 60), 3200); // and between the check and her bless
    const named = ann.bless({ summonId: ann.getState().summon!.id, name: 'drawn', at: 3500 })!;
    const logs = { ann: ann.getEvents().slice(), bob: bob.getEvents().slice() };
    for (const me of ['ann', 'bob', 'cleo']) {
      const s = board(me, logs);
      const st = s.getState();
      expect([...st.artifacts].sort()).toEqual([hull, named].sort());
      expect(membersOf(s, hull)).toEqual([a]);
      expect(membersOf(s, named)).toEqual([m]);
      expect(authorOf(st.nodes.get(hull)!)).toBe(handOn(me, 'ann'));
      expect(authorOf(st.nodes.get(named)!)).toBe(handOn(me, 'ann'));
      expect(authorOf(st.nodes.get(m)!)).toBe(model);
    }
  });
});
