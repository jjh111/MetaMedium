// Colour for relations (MATHS-SPEC §5, M17): one quantity, one hue. Pinned here, each as a property of the hues and
// not of a snapshot of them:
//   - the roles of a right triangle are ONE table, checked for every eye on both grounds and for distance from the
//     chrome's signal colours — and the table is the one chosen (a change to it is deliberate);
//   - on a board with nothing near them the roles hold their table, and beside a kind that looks like one it is
//     nudged the least that clears it, and the nudge is said;
//   - distinct quantities are told apart for all four visions on both grounds — by colour, or where colour cannot,
//     by a second channel — and the same keys give the same hues, whatever order they are asked in, and after a replay;
//   - a quantity placed later never moves one placed before it.

import { describe, it, expect } from 'vitest';
import { DEFAULT_PALETTE, LOOK_ALIKE, GROUND_NAMES, colourOf, hueDistance } from '../colour';
import {
  ROLES,
  ROLE_HUES,
  ROLE_SIGNAL_MARGIN,
  ROLE_FLOOR,
  CLASH,
  NUDGE_MAX,
  roleHue,
  roleChannels,
  roleKey,
  quantityHues,
  quantityColour,
  apartness,
  typicalApartness,
  naturalCompare,
  boardKinds,
} from './hues';
import type { HueKind, Role } from './hues';

const pairs = <T,>(xs: readonly T[]): [T, T][] => xs.flatMap((a, i) => xs.slice(i + 1).map((b): [T, T] => [a, b]));

describe('the roles of a right triangle are one table', () => {
  it('opposite, adjacent, hypotenuse and the angle: four hues, as chosen', () => {
    expect(ROLES).toEqual(['opposite', 'adjacent', 'hypotenuse', 'angle']);
    expect({ ...ROLE_HUES }).toEqual({ opposite: 191, adjacent: 111, hypotenuse: 8, angle: 314 });
  });

  it('they stand apart for every eye on both grounds: typical sight clearly, and no pair below the table’s floor under any eye', () => {
    for (const [a, b] of pairs(ROLES)) {
      expect(typicalApartness({ hue: ROLE_HUES[a] }, { hue: ROLE_HUES[b] }), `${a} / ${b} to typical sight`).toBeGreaterThanOrEqual(0.1);
      expect(apartness({ hue: ROLE_HUES[a] }, { hue: ROLE_HUES[b] }), `${a} / ${b} to the least eye`).toBeGreaterThanOrEqual(ROLE_FLOOR);
    }
  });

  it('none stands near a colour the chrome keeps for itself, so a role never reads as a state', () => {
    for (const role of ROLES) {
      for (const sig of DEFAULT_PALETTE.signals) {
        expect(hueDistance(ROLE_HUES[role], sig.hue), `${role} / ${sig.name}`).toBeGreaterThanOrEqual(ROLE_SIGNAL_MARGIN);
      }
    }
  });

  it('every role reads on both grounds, as drawn, in words', () => {
    for (const role of ROLES) {
      for (const g of GROUND_NAMES) {
        const c = quantityColour({ hue: ROLE_HUES[role], depth: 0 }, g, 'said');
        expect(c.contrast, `${role} on ${g}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('the closest pair, which colour alone cannot tell for some eye, is given a second channel; every other pair differs by colour', () => {
    const ch = roleChannels();
    for (const [a, b] of pairs(ROLES)) {
      const near = apartness({ hue: ROLE_HUES[a] }, { hue: ROLE_HUES[b] }) < LOOK_ALIKE;
      if (near) expect(ch.get(a), `${a} / ${b}`).not.toBe(ch.get(b));
    }
    expect([...ch.values()].filter((c) => c !== 'solid').length).toBeGreaterThan(0);
  });
});

describe('a role on a board', () => {
  it('holds its table on a board with nothing near it', () => {
    for (const role of ROLES) {
      const r = roleHue(role, []);
      expect(r.hue).toBe(ROLE_HUES[role]);
      expect(r.nudged).toBeUndefined();
    }
    // …and so with kinds that look nothing like it.
    const far: HueKind[] = [{ name: 'water', hue: normalise(ROLE_HUES.opposite + 100) }];
    expect(roleHue('opposite', far).nudged).toBeUndefined();
    expect(roleHue('opposite', far).hue).toBe(ROLE_HUES.opposite);
  });

  it('a board has no kinds yet (KN1 is queued), so no real board nudges one', () => {
    expect(boardKinds({})).toEqual([]);
  });

  it('is nudged the least that clears it beside a kind that looks like one, and the nudge is said', () => {
    const water: HueKind = { name: 'water', hue: normalise(ROLE_HUES.opposite + 3) };
    const r = roleHue('opposite', [water]);
    expect(r.nudged).toBeDefined();
    expect(r.hue).not.toBe(ROLE_HUES.opposite);
    expect(r.nudged!.beside).toBe('water');
    expect(r.nudged!.said).toBe('opposite, moved from its usual hue beside “water”');
    // It clears the kind to typical sight…
    expect(typicalApartness({ hue: r.hue }, water)).toBeGreaterThanOrEqual(CLASH);
    // …and no nearer hue does: the move is the least one.
    const by = Math.abs(r.nudged!.by);
    expect(by).toBeGreaterThan(0);
    expect(by).toBeLessThanOrEqual(NUDGE_MAX);
    for (let d = 1; d < by; d++) {
      for (const sign of [1, -1]) {
        const h = normalise(ROLE_HUES.opposite + sign * d);
        const clears = typicalApartness({ hue: h }, water) >= CLASH && ROLES.filter((o) => o !== 'opposite').every((o) => typicalApartness({ hue: h }, { hue: ROLE_HUES[o] }) >= CLASH);
        expect(clears, `${d} degrees ${sign > 0 ? 'up' : 'down'} should not clear`).toBe(false);
      }
    }
  });

  it('a nudged role never lands on another role’s hue', () => {
    for (const role of ROLES) {
      const kind: HueKind = { name: 'the sea', hue: normalise(ROLE_HUES[role] - 2) };
      const r = roleHue(role, [kind]);
      for (const other of ROLES.filter((o) => o !== role)) {
        expect(typicalApartness({ hue: r.hue }, { hue: ROLE_HUES[other] }), `${role} (nudged) / ${other}`).toBeGreaterThanOrEqual(CLASH);
      }
    }
  });

  it('names the kind it stood nearest when several are there', () => {
    const kinds: HueKind[] = [{ name: 'far', hue: normalise(ROLE_HUES.hypotenuse + 100) }, { name: 'rose', hue: normalise(ROLE_HUES.hypotenuse + 5) }];
    const r = roleHue('hypotenuse', kinds);
    expect(r.nudged?.beside).toBe('rose');
  });

  it('where nothing within reach clears, the role stays and the sentence says so, never silent', () => {
    // A ring of kinds all round the wheel leaves nowhere to go.
    const ring: HueKind[] = [];
    for (let h = 0; h < 360; h += 6) ring.push({ name: `ring ${h}`, hue: h });
    const r = roleHue('angle', ring);
    expect(r.hue).toBe(ROLE_HUES.angle);
    expect(r.nudged?.by).toBe(0);
    expect(r.nudged?.said).toMatch(/could not be moved clear/);
  });
});

describe('every other quantity is placed for the board', () => {
  const keys = ['fig:stroke:1+stroke:2+stroke:3:side0', 'fig:stroke:1+stroke:2+stroke:3:side1', 'fig:stroke:1+stroke:2+stroke:3:side2', 'fig:stroke:1+stroke:2+stroke:3:angle0', 'fig:stroke:1+stroke:2+stroke:3:angle1', 'fig:stroke:1+stroke:2+stroke:3:area', 'fig:stroke:1+stroke:2+stroke:3:perimeter', 'name:θ'];

  it('distinct quantities stay distinct for all four visions on both grounds: by colour, or by a second channel where colour cannot', () => {
    const hues = quantityHues(keys);
    expect(hues.size).toBe(keys.length);
    for (const [a, b] of pairs(keys)) {
      const qa = hues.get(a)!, qb = hues.get(b)!;
      const byColour = apartness(qa, qb) >= LOOK_ALIKE;
      expect(byColour || qa.channel !== qb.channel, `${a} / ${b}: ${apartness(qa, qb).toFixed(3)} apart, ${qa.channel} / ${qb.channel}`).toBe(true);
      // To the commonest eye every pair is told apart outright.
      expect(typicalApartness(qa, qb), `${a} / ${b} to typical sight`).toBeGreaterThan(0.04);
    }
  });

  it('no quantity looks like a role, which a student has learned, under any eye', () => {
    const hues = quantityHues(keys);
    for (const k of keys) {
      for (const role of ROLES) {
        const q = hues.get(k)!;
        const byColour = apartness(q, { hue: ROLE_HUES[role] }) >= LOOK_ALIKE;
        expect(byColour || q.channel !== roleChannels().get(role), `${k} / ${role}`).toBe(true);
      }
    }
  });

  it('is the same hues for the same keys, whatever order they are asked in, and asked again', () => {
    const a = quantityHues(keys);
    const b = quantityHues([...keys].reverse());
    const c = quantityHues(keys);
    for (const k of keys) {
      expect(b.get(k)).toEqual(a.get(k));
      expect(c.get(k)).toEqual(a.get(k));
    }
  });

  it('a quantity arriving later does not move the ones before it: a figure drawn later sorts later', () => {
    const figures = keys.filter((k) => k.startsWith('fig:'));
    const before = quantityHues(figures);
    const later = 'fig:stroke:9+stroke:10+stroke:11:side0';
    const after = quantityHues([...figures, later]);
    for (const k of figures) expect(after.get(k)!.hue, k).toBe(before.get(k)!.hue);
    expect(after.has(later)).toBe(true);
    // …and a name written later (sorting after the rest) moves nothing either.
    const named = quantityHues([...keys, 'name:φ']);
    for (const k of keys) expect(named.get(k)!.hue, k).toBe(quantityHues(keys).get(k)!.hue);
  });

  it('past the search’s reach a quantity takes the hue its name leans toward, deterministically, and the channel says what colour cannot', () => {
    const many = Array.from({ length: 40 }, (_, i) => `fig:stroke:${i + 1}:side0`);
    const a = quantityHues(many), b = quantityHues([...many].reverse());
    for (const k of many) expect(b.get(k)).toEqual(a.get(k));
    expect(a.size).toBe(40);
  });

  it('takes a role’s fixed hue for a quantity that plays one, nudged only where a kind is near, and says which', () => {
    const roles = new Map<string, Role>([['fig:a:side0', 'hypotenuse']]);
    const plain = quantityHues(['fig:a:side0', 'fig:a:side1'], { roles });
    expect(plain.get('fig:a:side0')).toMatchObject({ source: 'role', role: 'hypotenuse', hue: ROLE_HUES.hypotenuse });
    expect(plain.get('fig:a:side0')!.nudged).toBeUndefined();
    expect(plain.get('fig:a:side1')!.source).toBe('placed');
    const near = quantityHues(['fig:a:side0'], { roles, kinds: [{ name: 'water', hue: normalise(ROLE_HUES.hypotenuse + 4) }] });
    expect(near.get('fig:a:side0')!.nudged?.said).toMatch(/moved from its usual hue beside “water”/);
    // A key that names a role stands for it too.
    expect(quantityHues([roleKey('adjacent')]).get(roleKey('adjacent'))).toMatchObject({ role: 'adjacent', hue: ROLE_HUES.adjacent });
  });

  it('places nothing for no keys, and each key once', () => {
    expect(quantityHues([]).size).toBe(0);
    expect(quantityHues(['a', 'a', 'a']).size).toBe(1);
  });

  it('keys sort as a person made them: numbers as numbers', () => {
    expect(['stroke:10', 'stroke:2', 'stroke:1'].sort(naturalCompare)).toEqual(['stroke:1', 'stroke:2', 'stroke:10']);
  });

  it('a ghost is muted and a written value is full: the same hue, more chroma', () => {
    const q = { hue: ROLE_HUES.opposite, depth: 0 };
    const ghost = quantityColour(q, 'paper', 'offered');
    const said = quantityColour(q, 'paper', 'said');
    expect(ghost.h).toBe(said.h);
    expect(ghost.C).toBeLessThan(said.C);
    expect(said.hex).toBe(colourOf(q, 'paper', 'said').hex);
  });
});

function normalise(h: number): number {
  return ((h % 360) + 360) % 360;
}
