// G4 — the demo and the fixtures cannot drift apart.
//
// `?demo=castle` shows a board and `__demo2()` asserts one, and both read their
// numbers from `CASTLE_DEMO`. The one thing in there that is a COPY of something
// else is the stub's reply: it is the contract's own worked example, which lives
// in `fixtures/exchanges/castle-sketch.ideal.json` because an exchange fixture
// is the evidence a contract was actually answered.
//
// A copy nothing checks is a copy that drifts — the demo would go on showing a
// reply the contract no longer accepts, or the fixture would be edited and the
// demo would not follow. So the two are held against each other here, and the
// reply is read the way the fixture is read everywhere else in these tests: as
// a MODULE, so it travels with the bundle it is imported into.

import { describe, expect, it } from 'vitest';
import { CASTLE_DEMO } from './demo';
import ideal from '../fixtures/exchanges/castle-sketch.ideal.json';

/** What the exchange fixtures hold — `fixtures/exchanges/README.md` says why. */
const IDEAL = ideal as unknown as {
  contract: string;
  words: string;
  partsOffered: string[];
  reply: string;
  landed: { named: string[]; painted: string[]; dropped: string[] };
};

describe('the demo’s reply IS the ideal exchange', () => {
  it('parses to the same object, field for field', () => {
    // Not a string comparison: the fixture is written for a human to read, with
    // its own indentation, and the demo's is built by `JSON.stringify`. What
    // must not drift is what the reply SAYS.
    expect(JSON.parse(CASTLE_DEMO.reply)).toEqual(JSON.parse(IDEAL.reply));
  });

  it('answers the parts contract, by the part ids the board actually has', () => {
    expect(IDEAL.contract).toBe('parts');
    const reply = JSON.parse(CASTLE_DEMO.reply) as { parts: { id: string }[]; steps: { part: string }[] };
    for (const p of reply.parts) expect(IDEAL.partsOffered).toContain(p.id);
    for (const s of reply.steps) expect(IDEAL.partsOffered).toContain(s.part);
    // The whole point of the ideal one: nothing in it is dropped.
    expect(IDEAL.landed.dropped).toEqual([]);
  });

  it('the words the demo types are the words the exchange was an answer to', () => {
    expect(CASTLE_DEMO.words.brief).toBe(IDEAL.words);
  });
});

describe('the regen reply names a part the first reply named', () => {
  it('so *make the turrets taller* has a name in play to resolve', () => {
    const first = JSON.parse(CASTLE_DEMO.reply) as { parts: { id: string; name: string }[] };
    const again = JSON.parse(CASTLE_DEMO.taller) as { parts: { id: string; name: string }[]; steps: { part: string }[] };
    const names = new Map(first.parts.map((p) => [p.id, p.name]));
    for (const p of again.parts) expect(names.get(p.id)).toBe(p.name);
    // …and the words the demo types carry that name, not a synonym for it. A
    // regen resolves a name that is IN PLAY; *make the towers taller* would
    // resolve nothing, because nothing on this board is called a tower.
    for (const p of again.parts) expect(CASTLE_DEMO.words.regen).toContain(p.name);
    // Every step it asks for is about a part it named.
    const asked = new Set(again.parts.map((p) => p.id));
    for (const s of again.steps) expect(asked.has(s.part)).toBe(true);
  });
});

describe('the board the demo draws is John’s own', () => {
  it('a 6 × 4 footprint, three ⊓ and two standpoints', () => {
    expect(CASTLE_DEMO.plan.w).toBe(6);
    expect(CASTLE_DEMO.plan.h).toBe(4);
    // Three ⊓ and two standpoints, and NOT two and two: a tower seen once has
    // no depth (G2, `parts.test.ts` §5), so two claims from two standpoints give
    // one part and the count only reaches two when one standpoint showed two
    // towers. The demo's second beat draws both from where it stands.
    expect(CASTLE_DEMO.ups).toHaveLength(3);
    expect(CASTLE_DEMO.views).toHaveLength(2);
    expect(CASTLE_DEMO.ups.filter((u) => u.from === 0)).toHaveLength(2);
    expect(CASTLE_DEMO.ups.filter((u) => u.from === 1)).toHaveLength(1);
    for (const u of CASTLE_DEMO.ups) expect(u.at.y).toBe(0); // aimed at the ground
    // Each standpoint has clear ground to shift + click, off the plan.
    for (const v of CASTLE_DEMO.views) {
      const outside = Math.abs(v.stand.x) > CASTLE_DEMO.plan.w / 2 || Math.abs(v.stand.z) > CASTLE_DEMO.plan.h / 2;
      expect(outside).toBe(true);
      expect(v.stand.y).toBe(0);
    }
  });

  it('the footprint drawn again is smaller AND less square, so the match is a measurement', () => {
    const a = CASTLE_DEMO.plan;
    const b = CASTLE_DEMO.again;
    expect(b.w).toBeLessThan(a.w);
    expect(b.h).toBeLessThan(a.h);
    // A copy of the first outline would be matched by being identical; a
    // different aspect means the library scored it.
    expect(b.w / b.h).not.toBeCloseTo(a.w / a.h, 2);
    // …and it stands clear of the first one, so the two castles do not overlap.
    expect(b.x).toBeGreaterThan(a.x + a.w / 2);
  });

  it('the free loop is drawn as an ellipse, so a conserved aspect is measurable', () => {
    // A circle would land as a circle whatever the plane did to it. The beat
    // measures conservation, so the ink has to have an aspect to conserve.
    expect(CASTLE_DEMO.loop.rx).not.toBe(CASTLE_DEMO.loop.ry);
    expect(CASTLE_DEMO.loop.raise).toBeGreaterThan(0);
  });
});
