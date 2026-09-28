// A live room held to the full merge (V1-PLAN §9 R4d): whatever a reader
// does to take a line quickly, after every merge its board is `mergeLogs` of
// the logs it holds and its own events, replayed from zero — for every order
// of arrival the seeded rooms generate (src/test/room.ts: clocks that disagree,
// lines interleaved and heard again, hands that undo, leave, arrive late with
// unnamed marks, and come back under another name).
//
//     npx vitest run src/store/room.oracle.test.ts
//     MM_ROOM_SEEDS=400 npx vitest run src/store/room.oracle.test.ts   # a deeper run
//
// The path under test is compared line by line with the reference — the whole
// log merged and replayed on every line, as the surface did before R4d — and
// both are checked against the oracle after every merge.

import { describe, it, expect } from 'vitest';
import { runRoom, fullReplayPath, type RoomPath } from '../test/room';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEEDS = Number(env.MM_ROOM_SEEDS || 16);
const FIRST = Number(env.MM_ROOM_FIRST_SEED || 1);

/** The path held to the oracle. */
const UNDER: RoomPath = fullReplayPath;

describe('a live room, held to the full merge', () => {
  it(`${SEEDS} seeded rooms: after every line, the reader's board is the full merge replayed, and matches the reference`, async () => {
    const totals: Record<string, number> = {};
    const failures: string[] = [];
    for (let seed = FIRST; seed < FIRST + SEEDS; seed++) {
      const r = await runRoom({ seed, under: UNDER, reference: fullReplayPath });
      failures.push(...r.failures);
      for (const [k, v] of Object.entries(r.counts)) totals[k] = (totals[k] ?? 0) + v;
    }
    // What the rooms covered, so a run says what it held the path to.
    console.log(`room oracle — ${UNDER.label}, seeds ${FIRST}–${FIRST + SEEDS - 1}:\n  ` +
      Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
    expect(failures).toEqual([]);
    expect(totals['check'] ?? 0).toBeGreaterThan(SEEDS * 10);
  }, 600_000);
});
