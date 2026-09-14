// Tier 1 is a registry of instant modules, and the structure it builds says
// what the engine knows and nothing it does not.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { rectStroke, circleStroke, lineStroke } from '../test/strokes';
import { TIER1_LIBRARY, describeTier1, buildStructure, buildGraph3D, GRAPH3D_MARK } from './library';
import { regionsOf } from '../session/regions';
import { route, describeRoute, instantFor } from '../participants/router';
import { ENGINE_PARTICIPANT, ENGINE_NAME, wordOf } from '../session/nodes';
import { createAgentParticipant } from '../participants/agent';
import { PRESETS } from '../llm/provider';

function fourBoxes() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 100), 1000);
  s.addStroke(rectStroke(340, 100, 200, 100), 1100);
  s.addStroke(rectStroke(100, 240, 200, 100), 1200);
  s.addStroke(rectStroke(340, 240, 200, 100), 1300);
  s.addStroke(circleStroke(320, 220, 340), 2000);
  const sum = s.summonHeld(2500)!;
  const id = s.bless({ summonId: sum, name: 'page', at: 3000 })!;
  return { s, id };
}

describe('the tier 1 library', () => {
  it('is a registry: every module names what it does and where it lives, and none needs a model', () => {
    expect(TIER1_LIBRARY.length).toBeGreaterThanOrEqual(12);
    for (const m of TIER1_LIBRARY) {
      expect(m.id).toBeTruthy();
      expect(m.does.length).toBeGreaterThan(10);
      expect(m.source).toMatch(/\.ts|\//);
    }
    expect(new Set(TIER1_LIBRARY.map((m) => m.id)).size).toBe(TIER1_LIBRARY.length);
    expect(describeTier1().split('\n')).toHaveLength(TIER1_LIBRARY.length);
  });

  it('the router names the module that answers at once, and asks nobody for what tier 1 settles', () => {
    const { s, id } = fourBoxes();
    const members = s.getState().nodes.get(id)!.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
    const r = route('read', s.getState(), { concepts: s.read(members).concepts });
    expect(r.instant?.id).toBe('concepts');
    expect(instantFor('build')?.id).toBe('structure');
    expect(instantFor('answer')).toBeUndefined();
    const b = route('build', s.getState());
    expect(b.candidates).toEqual([]);
    expect(describeRoute(b)).toMatch(/Tier 1 can/);
  });

  it('every model is tier 2; the router asks the local one first because it is cheaper, not higher', () => {
    const s = createSession();
    const hosted = createAgentParticipant(s, { ...PRESETS.openRouter, model: 'big', apiKey: 'k' }, 1000);
    const local = createAgentParticipant(s, { ...PRESETS.ollama, model: 'small' }, 1001);
    const r = route('build', s.getState());
    expect(r.candidates.map((c) => c.tier)).toEqual([2, 2]);
    expect(r.candidates.map((c) => c.participantId)).toEqual([local.id, hosted.id]);
    expect(r.candidates.map((c) => c.locality)).toEqual(['local', 'hosted']);
    expect(describeRoute(r)).toMatch(/tier 2, local/);
  });

  it('builds the structure of a layout with no words: every region in place, labelled with its id and role', () => {
    const { s, id } = fourBoxes();
    const res = buildStructure(s, id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.genre).toBe('layout');
    expect(res.ids.length).toBe(4);
    for (const rid of res.ids) {
      expect(res.code).toContain(`data-region="${rid}"`);
      expect(res.code).toContain(`${rid} · `);
    }
    expect(res.code).toMatch(/display:flex/);
    expect(res.code).not.toMatch(/lorem|ipsum/i);
    expect(res.participantId).toBe(ENGINE_PARTICIPANT);
    expect(wordOf(s.getState().nodes.get(ENGINE_PARTICIPANT)!)).toBe(ENGINE_NAME);
    // Attached in the engine's name, it is a living page like any other.
    const ok = s.attachCode({ participantId: ENGINE_PARTICIPANT, nodeId: id, kind: 'html', code: res.code, prompt: 'structure', at: 4000 });
    expect(ok).toBeTruthy();
    expect(s.getState().live).toContain(id);
  });

  it('builds a diagram from nodes and an arrow: positioned nodes, the edge as svg', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 150, 90), 1000);
    s.addStroke(rectStroke(460, 100, 150, 90), 1100);
    s.addStroke(lineStroke({ x: 258, y: 145 }, { x: 452, y: 145 }, 40).concat(lineStroke({ x: 452, y: 145 }, { x: 426, y: 128 }, 20).slice(1)), 1200);
    s.addStroke(circleStroke(355, 145, 320), 2000);
    const sum = s.summonHeld(2500)!;
    const id = s.bless({ summonId: sum, name: 'flow', at: 3000 })!;
    const res = buildStructure(s, id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.genre).toBe('graph');
    expect(res.code).toMatch(/<svg class="mm-edges"/);
    expect(res.code).toMatch(/position:absolute/);
  });

  it('says why when there is nothing to build', () => {
    const s = createSession();
    expect(buildStructure(s, 'nope')).toEqual({ ok: false, error: 'no such artifact' });
  });
});

// A graph in 3D (SURFACE-v10-PLAN D7): spheres and bonds from the drawing, no model.
describe('a graph in 3D', () => {
  function molecule() {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 1000);
    s.addStroke(circleStroke(500, 300, 40), 1100);
    s.addStroke(circleStroke(400, 460, 40), 1200);
    s.addStroke(lineStroke({ x: 340, y: 300 }, { x: 460, y: 300 }), 1300);
    s.addStroke(lineStroke({ x: 328, y: 328 }, { x: 372, y: 432 }), 1400);
    s.addStroke(circleStroke(400, 370, 190), 2000);
    const sum = s.summonHeld(2500)!;
    const id = s.bless({ summonId: sum, name: 'molecule', at: 3000 })!;
    return { s, id };
  }
  it('stands three circles joined by two lines as three spheres and two bonds, each sphere named for its region', () => {
    const { s, id } = molecule();
    const r = buildGraph3D(s, id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.atoms).toBe(3);
    expect(r.bonds).toBe(2);
    expect(r.code.startsWith(GRAPH3D_MARK)).toBe(true);
    expect(r.participantId).toBe(ENGINE_PARTICIPANT);
    const regionIds = regionsOf(s.getState().nodes.get(id)!, s.getState().nodes).map((x) => x.id);
    for (const a of r.ids) expect(regionIds).toContain(a);
    expect(r.code).toMatch(/mm\.onPointer/); // a hand inside the playing frame turns it
    expect(r.code).toMatch(/mm\.report\(/); // and with no three.js the parts are still reported
    expect(TIER1_LIBRARY.some((m) => m.id === 'graph3d')).toBe(true);
  });
  it('refuses a layout: boxes tiling a space are a page, not a graph', () => {
    const { s, id } = fourBoxes();
    const r = buildGraph3D(s, id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not a graph/);
  });
});
