/// <reference types="vite/client" />
// Every held log — the canvas's recordings and the shard's boards, the logs
// people will open again — replays with each artifact made by whoever blessed
// it (V1-PLAN L2f): the participant its bless names, else the hand whose log
// it is. Read here as it would be read in each place a log is opened: bare,
// by a named session, merged as the reader's own, and merged as another
// hand's. Only the last is new — as another hand's log, its blesses are that
// hand's, as its ink always was; loaded as the reader's own, every artifact
// is what it always was, with nothing new written on the node.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type SessionEvent } from './session';
import { LOCAL_PARTICIPANT, authorOf } from './nodes';
import { mergeLogs } from '../store/merge';
import { decodeLog } from '../store/seam';

const RECORDINGS = import.meta.glob('../../../Demos/recordings/*.json', { eager: true, import: 'default' }) as Record<
  string,
  { events?: SessionEvent[] } | SessionEvent[]
>;
const BOARDS = import.meta.glob('../../../shard-3d/fixtures/*.mm.log', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>;

const held: [string, SessionEvent[]][] = [
  ...Object.entries(RECORDINGS).map(([path, raw]): [string, SessionEvent[]] => [path, Array.isArray(raw) ? raw : raw.events ?? []]),
  ...Object.entries(BOARDS).map(([path, text]): [string, SessionEvent[]] => [path, decodeLog(text).events]),
];
const copy = (log: SessionEvent[]) => JSON.parse(JSON.stringify(log)) as SessionEvent[];

/** Who each bless in the log names, in log order: its participant, or none. */
const blessers = (log: SessionEvent[]) =>
  log.filter((e) => e.type === 'bless').map((e) => ('participantId' in e ? e.participantId : undefined));

describe('held logs: every artifact is made by whoever blessed it (V1-PLAN L2f)', () => {
  it('finds every held log', () => {
    // Three recordings on the canvas, three boards in the shard: a log moved
    // or renamed is said here rather than silently checked no more.
    expect(held.filter(([p]) => p.includes('/Demos/recordings/'))).toHaveLength(3);
    expect(held.filter(([p]) => p.includes('/shard-3d/fixtures/'))).toHaveLength(3);
    expect(held.flatMap(([, log]) => blessers(log))).toHaveLength(6);
  });

  for (const [path, log] of held) {
    const name = path.replace(/^.*\/(Demos|shard-3d)\//, '$1/');
    const named = blessers(log);

    it(`${name}: as the reader's own log, each artifact is the participant its bless names, else the reader's, and the node is unchanged`, () => {
      const boards = [createSession(), createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'held' })];
      boards[0].load(copy(log));
      boards[1].load(mergeLogs({ held: copy(log) }, { me: 'held' }));
      for (const board of boards) {
        const s = board.getState();
        expect(s.artifacts).toHaveLength(named.length);
        s.artifacts.forEach((id, i) => {
          const node = s.nodes.get(id)!;
          const maker = named[i] ?? LOCAL_PARTICIPANT;
          expect(authorOf(node)).toBe(maker);
          // A board's own bless writes nothing new: no edge a held log's artifact never had.
          if (maker === LOCAL_PARTICIPANT) expect(node.edges.some((e) => e.rel === 'made-by')).toBe(false);
        });
      }
    });

    it(`${name}: as another hand's log, each artifact is that hand's — or the participant its bless names`, () => {
      const board = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'reader~r1' });
      board.load(mergeLogs({ 'ann~a1': copy(log), 'reader~r1': [] }, { me: 'reader~r1' }));
      const s = board.getState();
      expect(s.artifacts).toHaveLength(named.length);
      s.artifacts.forEach((id, i) => {
        const maker = named[i] && named[i] !== LOCAL_PARTICIPANT ? named[i] : 'participant:hand:ann_a1';
        expect(authorOf(s.nodes.get(id)!)).toBe(maker);
      });
    });
  }
});
