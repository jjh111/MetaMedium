// A board's setting (MATHS-SPEC §8 Lane A, M18; John, 8 Oct 2026: "the answer waits" is the board's, an event in
// its log). `{ type: 'setting', key, value }` over a closed set — `answers` ('show' | 'wait') and `colour`
// ('pointed' | 'always') — gives `SessionState.settings`. A board-wide fact like `use`: whichever hand set it, every
// merged board has it; undone per hand; carried by a replay, a checkpoint and a room's line; a key or a value
// outside the set refused at the door and ignored on replay.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from './session';
import type { SessionEvent } from './session';
import { mergeLogs } from '../store/merge';
import { LiveMerge } from '../store/livemerge';
import { circleStroke } from '../test/strokes';

const named = (logName: string, extra: Partial<typeof DEFAULT_SESSION_CONFIG> = {}) => createSession({ ...DEFAULT_SESSION_CONFIG, logName, ...extra });
let clock = 1000;
const next = () => (clock += 1000);

describe('a board’s setting is an event over a closed set', () => {
  it('a board is set to show its answers and colour them when pointed at, until its log says otherwise', () => {
    const s = createSession();
    expect(s.getState().settings).toEqual({ answers: 'show', colour: 'pointed' });
  });

  it('answers: wait is one event, replays, and says nothing when it is already so', () => {
    const s = named('ada~a1');
    expect(s.setting('answers', 'wait', next())).toBeNull();
    expect(s.getState().settings.answers).toBe('wait');
    expect(s.getEvents().filter((e) => e.type === 'setting')).toHaveLength(1);
    // Said again, it is already so: nothing is written, so one undo takes it back.
    expect(s.setting('answers', 'wait', next())).toBeNull();
    expect(s.getEvents().filter((e) => e.type === 'setting')).toHaveLength(1);
    // A replay from the log has it.
    const again = createSession();
    again.load(s.getEvents().slice());
    expect(again.getState().settings).toEqual({ answers: 'wait', colour: 'pointed' });
    // And it can be set back.
    expect(s.setting('answers', 'show', next())).toBeNull();
    expect(s.getState().settings.answers).toBe('show');
  });

  it('colour: always is the second key', () => {
    const s = createSession();
    expect(s.setting('colour', 'always', next())).toBeNull();
    expect(s.getState().settings).toEqual({ answers: 'show', colour: 'always' });
  });

  it('a key or a value outside the set is refused at the door, with the reason, and writes nothing', () => {
    const s = createSession();
    const refused = s.setting('teacher', 'on', next());
    expect(refused).toMatch(/teacher/);
    expect(s.setting('answers', 'maybe', next())).toMatch(/maybe/);
    expect(s.setting('colour', 'wait', next())).toMatch(/wait/);
    expect(s.getEvents()).toEqual([]);
    expect(s.getState().settings).toEqual({ answers: 'show', colour: 'pointed' });
  });

  it('a bad key or value in a log is ignored on replay, never thrown, and the good ones stand', () => {
    const log: SessionEvent[] = [
      { type: 'setting', key: 'answers', value: 'wait', at: 1 },
      { type: 'setting', key: 'teacher', value: 'on', at: 2 },
      { type: 'setting', key: 'colour', value: 'neon', at: 3 },
      { type: 'setting', key: 7 as unknown as string, value: {} as unknown as string, at: 4 },
    ];
    const s = createSession();
    expect(() => s.load(log)).not.toThrow();
    expect(s.getState().settings).toEqual({ answers: 'wait', colour: 'pointed' });
  });

  it('the latest word in the log is the board’s', () => {
    const s = createSession();
    s.load([
      { type: 'setting', key: 'answers', value: 'wait', at: 1 },
      { type: 'setting', key: 'answers', value: 'show', at: 2 },
      { type: 'setting', key: 'answers', value: 'wait', at: 3 },
    ]);
    expect(s.getState().settings.answers).toBe('wait');
  });
});

describe('a setting is the board’s, whichever hand said it', () => {
  it('undo is per hand: a hand takes back its own setting, never another’s, and every board follows the logs', () => {
    const ada = named('ada~a1');
    const fern = named('fern~f1');
    ada.setting('answers', 'wait', next());
    fern.addStroke(circleStroke(200, 200, 40), next(), undefined, 1);
    const logs = () => ({ 'ada~a1': ada.getEvents().filter((e) => !e.by), 'fern~f1': fern.getEvents().filter((e) => !e.by) });
    // Fern's board merges ada's log: it waits for answers too.
    fern.load(mergeLogs(logs(), { me: 'fern~f1' }));
    expect(fern.getState().settings.answers).toBe('wait');
    // Fern's undo takes back her own stroke, not ada's setting.
    fern.undo();
    expect(fern.getState().settings.answers).toBe('wait');
    // Ada's undo takes back her setting; fern's board, merged again, shows its answers.
    ada.undo();
    expect(ada.getEvents()).toEqual([]);
    fern.load(mergeLogs(logs(), { me: 'fern~f1' }));
    expect(fern.getState().settings.answers).toBe('show');
  });

  it('a room’s line carries a setting: applied as it lands, the board is the merge’s', () => {
    const ada = named('ada~a1');
    const fern = named('fern~f1');
    fern.addStroke(circleStroke(200, 200, 40), next(), undefined, 1);
    const merge = new LiveMerge(fern, 'fern~f1');
    ada.setting('colour', 'always', next());
    merge.sync({ 'fern~f1': fern.getEvents().filter((e) => !e.by), 'ada~a1': ada.getEvents().slice() });
    expect(fern.getState().settings.colour).toBe('always');
    const oracle = named('fern~f1');
    oracle.load(mergeLogs({ 'fern~f1': fern.getEvents().filter((e) => !e.by), 'ada~a1': ada.getEvents() }, { me: 'fern~f1' }));
    expect(fern.getState().settings).toEqual(oracle.getState().settings);
  });

  it('a setting is one act with its own undo, and undo of it restores what the log said before', () => {
    const s = named('ada~a1');
    s.setting('answers', 'wait', next());
    s.setting('answers', 'show', next());
    s.undo();
    expect(s.getState().settings.answers).toBe('wait');
    s.undo();
    expect(s.getState().settings.answers).toBe('show');
  });
});

describe('a setting is kept by checkpoints', () => {
  it('survives an undo and a replay that start from a checkpoint taken after it', () => {
    const s = named('ada~a1', { checkpointEvery: 3 });
    s.setting('answers', 'wait', next());
    s.setting('colour', 'always', next());
    for (let i = 0; i < 7; i++) s.addStroke(circleStroke(100 + i * 90, 100, 30), next(), undefined, 1);
    s.undo();
    s.undo();
    expect(s.getState().settings).toEqual({ answers: 'wait', colour: 'always' });
    // A load of the same log through checkpoints reads the same.
    const again = createSession({ ...DEFAULT_SESSION_CONFIG, checkpointEvery: 3 });
    again.load(s.getEvents().slice());
    expect(again.getState().settings).toEqual({ answers: 'wait', colour: 'always' });
    // And an undo that goes back past the setting takes it off.
    for (let i = 0; i < 5; i++) s.undo();
    s.undo();
    s.undo();
    expect(s.getState().settings).toEqual({ answers: 'show', colour: 'pointed' });
  });
});
