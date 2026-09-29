// A pack is read, not trusted (V1-PLAN §2.3; the DATA-1 manner): the shipped
// packs read whole; a pack that cannot be read at all says where and why; a
// malformed entry is refused with its path and reason while the rest stands;
// nothing any input can be makes the validator throw; what comes out is frozen.

import { describe, it, expect } from 'vitest';
import { validatePack, PACK_LIMITS } from './validate';
import { listedPacks, packRefusals, shippedPack, shippedPacks, affinityOf } from './registry';
import { packRef, parsePackRef, packOfId, isTestPack } from './pack';
import { ROLES } from '../diagram/roles';

const GOOD = {
  id: 'demo',
  version: 2,
  name: 'Demo',
  describes: 'a pack for this test',
  definitions: [
    { name: 'blob', samples: [[{ shape: 'circle', x: 0, y: 0, w: 40, h: 40 }]], role: 'node' },
    { name: 'pair', samples: [[{ shape: 'rectangle', x: 0, y: 0, w: 60, h: 40 }, { shape: 'arrow', from: { x: 70, y: 20 }, to: { x: 140, y: 20 } }]] },
  ],
  connectors: [{ name: 'link', head: 'triangle', filled: true, role: 'edge', export: { mermaid: '-->' } }],
  affinities: { 'notation:flowchart': ['on:clean'], 'concept:row': ['tool:tidy', 'key:snap'] },
};

describe('the shipped packs', () => {
  it('read whole: nothing refused, each under its own name, a test pack never listed', () => {
    expect(packRefusals()).toEqual([]);
    expect(shippedPacks().map(packRef)).toEqual(['basics@1', 'flowchart@1', 'uml-class@1', 'sequence@1', 'state@1', 'er@1', 'test-molecule@1']);
    expect(listedPacks().map(packRef)).toEqual(['basics@1', 'flowchart@1', 'uml-class@1', 'sequence@1', 'state@1', 'er@1']);
    for (const p of shippedPacks()) {
      expect(shippedPack(packRef(p))).toBe(p);
      expect(Object.isFrozen(p)).toBe(true);
      expect(isTestPack(p)).toBe(p.id.startsWith('test-'));
    }
    expect(shippedPack('basics@2')).toBeUndefined();
  });

  it('affinities: what the packs in use say, merged in the order they are used, each target once', () => {
    expect(affinityOf([])).toEqual({});
    expect(affinityOf(['basics@1'])).toEqual({});
    expect(affinityOf(['flowchart@1'])).toEqual({ 'notation:flowchart': ['on:flow', 'on:clean'] });
    expect(affinityOf(['uml-class@1', 'flowchart@1'])).toEqual({ 'notation:uml-class': ['on:clean', 'tool:tidy'], 'notation:flowchart': ['on:flow', 'on:clean'] });
    expect(affinityOf(['sequence@1'])).toEqual({ 'notation:sequence': ['on:clean', 'tool:tidy'] });
    expect(affinityOf(['state@1'])).toEqual({ 'notation:state': ['on:clean', 'tool:tidy'] });
    expect(affinityOf(['er@1'])).toEqual({ 'notation:er': ['on:clean', 'tool:tidy'] });
    expect(affinityOf(['flowchart@1', 'test-molecule@1', 'flowchart@1', 'nope@1'])).toEqual({ 'notation:flowchart': ['on:flow', 'on:clean'], 'concept:row': ['key:snap'] });
  });

  it('a pack is named id@version, and a library node names its pack', () => {
    expect(parsePackRef('basics@1')).toEqual({ id: 'basics', version: 1 });
    expect(parsePackRef('garment-pieces@12')).toEqual({ id: 'garment-pieces', version: 12 });
    for (const bad of ['basics', '@1', 'Basics@1', 'basics@0', 'basics@01', 'basics@1.5', 'basics@-1', '1basics@1', 'bas ics@1', 42, null, undefined, {}]) {
      expect(parsePackRef(bad), String(bad)).toBeNull();
    }
    expect(packOfId('library:basics@1:molecule')).toBe('basics@1');
    expect(packOfId('library:basics@1')).toBe('basics@1');
    expect(packOfId('artifact:ada:3')).toBeNull();
    expect(packOfId('library:nonsense')).toBeNull();
  });
});

describe('validatePack — read, not trusted', () => {
  it('a sound pack reads whole, copied and frozen, with nothing refused', () => {
    const check = validatePack(GOOD);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.refused).toEqual([]);
    expect(check.pack).toEqual(GOOD);
    expect(check.pack).not.toBe(GOOD);
    expect(Object.isFrozen(check.pack.definitions[0].samples![0][0])).toBe(true);
  });

  it('a pack that cannot be read at all says where and why, and nothing of it is used', () => {
    const cases: [unknown, string, RegExp][] = [
      [null, '', /the pack is null, not an object/],
      [[GOOD], '', /the pack is a list, not an object/],
      ['basics@1', '', /not an object/],
      [{ ...GOOD, id: undefined }, 'id', /its id is missing/],
      [{ ...GOOD, id: 'Demo' }, 'id', /not a pack's id/],
      [{ ...GOOD, version: 0 }, 'version', /whole number from 1/],
      [{ ...GOOD, version: 1.5 }, 'version', /whole number from 1/],
      [{ ...GOOD, version: '1' }, 'version', /whole number from 1/],
      [{ ...GOOD, name: '  ' }, 'name', /its name is empty/],
      [{ ...GOOD, describes: 7 }, 'describes', /not text/],
      [{ ...GOOD, notation: 'Flow Chart' }, 'notation', /not a notation's id/],
      [{ ...GOOD, definitions: {} }, 'definitions', /not a list/],
      [{ ...GOOD, definitions: Array.from({ length: PACK_LIMITS.definitions + 1 }, () => GOOD.definitions[0]) }, 'definitions', /past the 64/],
      [{ ...GOOD, connectors: 'link' }, 'connectors', /not a list/],
      [{ ...GOOD, affinities: [] }, 'affinities', /not an object/],
    ];
    for (const [value, at, reason] of cases) {
      const check = validatePack(value);
      expect(check.ok, JSON.stringify(value)?.slice(0, 80)).toBe(false);
      if (check.ok) continue;
      expect(check.at).toBe(at);
      expect(check.reason).toMatch(reason);
    }
  });

  it('a malformed entry is refused with its path and reason; the rest of the pack stands', () => {
    const check = validatePack({
      ...GOOD,
      definitions: [
        GOOD.definitions[0],
        { name: 'hexagon', samples: [[{ shape: 'hexagon', x: 0, y: 0, w: 10, h: 10 }]] },
        { name: 'nothing', describes: 'no drawing at all' },
        { name: 'flat', samples: [[{ shape: 'rectangle', x: 0, y: 0, w: 0, h: 10 }]] },
        { name: 'nowhere', samples: [[{ shape: 'line', from: { x: 5, y: 5 }, to: { x: 5, y: 5 } }]] },
        { name: 'far', samples: [[{ shape: 'circle', x: 1e9, y: 0, w: 10, h: 10 }]] },
        { name: 'nan', samples: [[{ shape: 'circle', x: NaN, y: 0, w: 10, h: 10 }]] },
        { name: 'seventh', samples: GOOD.definitions[0].samples, role: 'decoration' },
        { name: 'short', strokes: [[[{ x: 0, y: 0 }]]] },
        { name: 'blob', samples: GOOD.definitions[0].samples },
        { samples: GOOD.definitions[0].samples },
        GOOD.definitions[1],
      ],
      connectors: [{ name: 'star', head: 'star' }, { name: 'link' }, { name: 'link' }, { name: 'fill', filled: 'yes' }],
      affinities: { 'notation:flowchart': ['on:clean'], 'whatever': ['on:x'], 'concept:row': ['lift everything'], 'concept:flow': [] },
    });
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.pack.definitions.map((d) => d.name)).toEqual(['blob', 'pair']);
    expect(check.pack.connectors!.map((c) => c.name)).toEqual(['link']);
    expect(check.pack.affinities).toEqual({ 'notation:flowchart': ['on:clean'] });
    const said = check.refused.map((r) => `${r.at}: ${r.reason}`);
    expect(said).toEqual([
      'definitions[1].samples[0][0].shape: “hexagon” is not a shape the rung reads — rectangle, circle, triangle, line or arrow',
      'definitions[2]: “nothing” has no drawing to be matched by — a definition needs a sample or a recorded drawing',
      'definitions[3].samples[0][0]: a rectangle 0 by 10 has no size to draw',
      'definitions[4].samples[0][0]: a line that starts where it ends has no length to draw',
      'definitions[5].samples[0][0].x: its x is 1000000000, further than 1000000 from the origin',
      'definitions[6].samples[0][0].x: its x is NaN — a measurement has to be a finite number',
      `definitions[7].role: the role “decoration” is not one of the six — ${ROLES.join(', ')} — and a pack adds none`,
      'definitions[8].strokes[0][0]: a recorded stroke holds 1, and needs at least 2',
      'definitions[9].name: “blob” is already a definition of this pack — a name means one thing in it',
      'definitions[10].name: its name is missing, not text',
      'connectors[0].head: “star” is not a head — arrow, triangle, diamond, circle, none',
      'connectors[2].name: “link” is already a connector of this pack',
      'connectors[3].filled: whether its head is filled is string, not yes or no',
      'affinities.whatever: “whatever” is not a context\'s entry — a notation:<id> or a concept:<name>',
      'affinities.concept:row[0]: “lift everything” lifts nothing a context names — on:<grounds>, tool:<id> or key:<offer>',
      'affinities.concept:flow: what concept:flow lifts holds 0, and needs at least 1',
    ]);
  });

  it('keys the format does not know are not copied, and nothing any input can be makes it throw', () => {
    const check = validatePack({ ...GOOD, extra: { run: 'rm -rf' }, definitions: [{ ...GOOD.definitions[0], script: 'alert(1)' }] });
    expect(check.ok && 'extra' in check.pack).toBe(false);
    expect(check.ok && 'script' in check.pack.definitions[0]).toBe(false);
    const junk: unknown[] = [undefined, 0, -1, NaN, Infinity, '', 'x', true, [], [[]], {}, { definitions: null }, { id: {}, version: {} }, Symbol('s'), () => 1];
    let deep: unknown = GOOD;
    for (let i = 0; i < 50; i++) deep = { definitions: [deep] };
    junk.push(deep, { ...GOOD, definitions: [null, 3, 'x', [], { name: 1 }] }, { ...GOOD, affinities: { 'notation:flowchart': 'on:clean' } });
    for (const j of junk) expect(() => validatePack(j)).not.toThrow();
  });
});
