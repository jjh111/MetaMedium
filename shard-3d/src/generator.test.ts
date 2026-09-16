// The generator seat: the prompt, and the reply read (SHARD-3D-PLAN §6).
//
// **Strict JSON first, always.** The repairs below only run on text that has
// already failed, and each exists because a real local model produced it —
// core's own two (`parseFill`), for core's own two reasons. Nothing here
// guesses at intent: a reply that still will not read is reported as unusable,
// and the brief leaves nothing behind.

import { describe, it, expect } from 'vitest';
import {
  MAX_STEPS,
  messagesFor,
  meaningMessages,
  parseMeaning,
  parseProposal,
  propose,
  PROPOSABLE,
} from './generator';

const CONFIG = { kind: 'openai-compatible' as const, baseUrl: 'http://localhost:11434/v1', model: 'stub' };

const CASTLE_REPLY = JSON.stringify({
  steps: [
    { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 3, name: 'castle', why: 'the plan, to the height the front says' },
    { id: 's2', op: 'boss', on: 's1', profile: 'p1', depth: 1.1, name: 'turret', why: 'a tower at each corner' },
    { id: 's3', op: 'boss', on: 's2', profile: 'p1', depth: 0.4, name: 'top', material: { colour: 'green' }, why: 'its cap' },
  ],
  profiles: [{ id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.4, y: 1 }, r: 0.4 }],
});

describe('strict JSON, then repaired, then reported', () => {
  it('reads a clean reply', () => {
    const p = parseProposal(CASTLE_REPLY);
    expect(p.steps.map((s) => s.name)).toEqual(['castle', 'turret', 'top']);
    expect(p.steps[2].material).toEqual({ colour: 'green' });
    expect(p.profiles).toHaveLength(1);
    expect(p.dropped).toBe(0);
  });

  it('reads one wrapped in prose and code fences, and thought out loud first', () => {
    const p = parseProposal(
      `<think>a castle is a box with towers</think>Sure! Here you go:\n\n\`\`\`json\n${CASTLE_REPLY}\n\`\`\`\n\nLet me know.`
    );
    expect(p.steps.map((s) => s.name)).toEqual(['castle', 'turret', 'top']);
  });

  it('repairs a JavaScript template literal where a JSON string was asked for', () => {
    const p = parseProposal('{"steps":[{"id":"s1","op":"extrude","profile":"stroke:1","depth":2,"why":`the "plan", grown`}]}');
    expect(p.steps).toHaveLength(1);
    expect(p.steps[0].why).toBe('the "plan", grown');
  });

  it('repairs a trailing comma, which is written by everything and meant by nothing', () => {
    const p = parseProposal('{"steps":[{"id":"s1","op":"extrude","profile":"stroke:1","depth":2,},],}');
    expect(p.steps).toHaveLength(1);
  });

  it('reports a reply it cannot read rather than half-understanding it', () => {
    expect(parseProposal('I would rather not.').reasoning).toMatch(/no JSON object/);
    expect(parseProposal('{"steps": [oh dear').reasoning).toMatch(/not JSON, even repaired|no JSON object/);
    expect(parseProposal('').reasoning).toMatch(/replied with nothing/);
  });
});

describe('everything outside the closed vocabulary is dropped AND COUNTED', () => {
  it('a step whose op is not one of the five', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [
          { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 2 },
          { id: 's2', op: 'loft', profile: 'stroke:1' },
          { id: 's3', op: 'bevel', profile: 'stroke:1' },
        ],
      })
    );
    expect(p.steps).toHaveLength(1);
    expect(p.dropped).toBe(2);
    expect(p.reasoning).toMatch(/2 things outside it were dropped/);
    expect(PROPOSABLE).toEqual(['extrude', 'revolve', 'cut', 'boss', 'mirror']);
  });

  it('a profile shaped like nothing the shape rung reads', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [{ id: 's1', op: 'extrude', profile: 'p1', depth: 2 }],
        profiles: [
          { id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 0, y: 0 }, r: 1 },
          { id: 'p2', shape: 'bezier', plane: 'foundation', points: [{ x: 0, y: 0 }] },
          { id: 'p3', shape: 'nurbs', plane: 'height' },
        ],
      })
    );
    expect(p.profiles.map((x) => x.id)).toEqual(['p1']);
    expect(p.droppedWhy.join(' ')).toMatch(/bezier/);
    expect(p.droppedWhy.join(' ')).toMatch(/nurbs/);
  });

  it('a colour word the shard cannot paint is dropped, and the step stays', () => {
    const p = parseProposal(
      JSON.stringify({ steps: [{ id: 's1', op: 'extrude', profile: 'stroke:1', depth: 2, name: 'castle', material: { colour: 'iridescent' } }] })
    );
    expect(p.steps).toHaveLength(1);
    expect(p.steps[0].material).toBeUndefined();
    expect(p.droppedWhy.join(' ')).toMatch(/“iridescent” is not one the shard can paint/);
  });

  it('a step that acts on one below it, or on nothing, is dropped', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [
          { id: 's1', op: 'boss', on: 's2', profile: 'stroke:1', depth: 1 },
          { id: 's2', op: 'extrude', profile: 'stroke:1', depth: 2 },
        ],
      })
    );
    expect(p.steps.map((s) => s.id)).toEqual(['s2']);
    expect(p.droppedWhy.join(' ')).toMatch(/s1 acts on s2, which is not a step above it/);
  });

  it('caps the size of a reply and says how much it dropped', () => {
    const many = Array.from({ length: MAX_STEPS + 5 }, (_, i) => ({ id: `s${i}`, op: 'extrude', profile: 'stroke:1', depth: 1 }));
    const p = parseProposal(JSON.stringify({ steps: many }));
    expect(p.steps).toHaveLength(MAX_STEPS);
    expect(p.droppedWhy.join(' ')).toMatch(new RegExp(`more than ${MAX_STEPS} steps`));
  });

  it('a bare {"reuse": name} is the library answering, and no steps are wanted', () => {
    const p = parseProposal('{"reuse":"turret"}');
    expect(p.reuse).toBe('turret');
    expect(p.steps).toHaveLength(0);
    expect(p.reasoning).toMatch(/already holds “turret” — reused, not written/);
  });
});

describe('the prompt says what may be proposed, and nothing else', () => {
  it('names the five ops, the shapes, the colours and the reply shape', () => {
    const [system] = messagesFor('THE BRIEF', 'a castle');
    const text = String(system.content);
    expect(text).toMatch(/extrude, revolve, cut, boss, mirror/);
    expect(text).toMatch(/"shape":"rectangle"/);
    expect(text).toMatch(/must be one of: green, red, blue/);
    expect(text).toMatch(/intersected with it before it is shown/);
    expect(text).toMatch(/ONLY a JSON object/);
  });

  it('a regen prompt says the rest of the tree is fixed, and names are kept', () => {
    const [system] = messagesFor('THE BRIEF', 'make the turrets taller', { regen: true });
    const text = String(system.content);
    expect(text).toMatch(/Every other step in the tree is fixed/);
    expect(text).toMatch(/a step named "turret" that gets taller is still named "turret"/);
  });

  it('carries the brief and the words as the user message', () => {
    const [, user] = messagesFor('THE BRIEF', 'a castle with green turret tops');
    expect(String(user.content)).toMatch(/THE BRIEF/);
    expect(String(user.content)).toMatch(/“a castle with green turret tops”/);
  });
});

describe('propose never throws into the drawing loop', () => {
  it('a transport that rejects comes back as a value', async () => {
    const r = await propose({
      config: CONFIG,
      brief: 'b',
      words: 'w',
      transport: async () => { throw new Error('the socket went away'); },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('the socket went away');
  });

  it('a reply with nothing usable in it is a failure, with the raw text kept', async () => {
    const r = await propose({ config: CONFIG, brief: 'b', words: 'w', transport: async () => ({ ok: true, text: '{"steps":[]}', model: 'stub' }) });
    expect(r.ok).toBe(false);
    expect(r.raw).toBe('{"steps":[]}');
  });

  it('a good reply comes back as a proposal', async () => {
    const r = await propose({ config: CONFIG, brief: 'b', words: 'w', transport: async () => ({ ok: true, text: CASTLE_REPLY, model: 'stub' }) });
    expect(r.ok).toBe(true);
    expect(r.proposal!.steps.map((s) => s.name)).toEqual(['castle', 'turret', 'top']);
  });
});

describe('asking what a phrase means — against the closed list, never for an action', () => {
  it('the prompt offers only the verbs and only the names in play', () => {
    const [system] = meaningMessages('beef up the turrets', ['regen', 'drop', 'paint'], ['castle', 'turret']);
    const text = String(system.content);
    expect(text).toMatch(/The verbs, and there are no others: regen, drop, paint/);
    expect(text).toMatch(/The names in play, and there are no others: castle, turret/);
    expect(text).toMatch(/You are NOT doing anything/);
  });

  it('an answer inside the list is taken; one outside it is not', () => {
    const ok = parseMeaning('{"verb":"regen","target":"turret","why":"bigger"}', ['regen', 'drop'], ['turret']);
    expect(ok).toEqual({ ok: true, verb: 'regen', target: 'turret', why: 'bigger' });

    const out = parseMeaning('{"verb":"sculpt","target":"turret"}', ['regen', 'drop'], ['turret']);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/not one of the verbs this space has/);

    const none = parseMeaning('{"verb":"none","why":"it is a mood, not an instruction"}', ['regen'], []);
    expect(none.ok).toBe(false);
    expect(none.why).toMatch(/a mood/);
  });

  it('a target that names nothing here is dropped, and the verb still stands', () => {
    const r = parseMeaning('{"verb":"drop","target":"moat"}', ['drop'], ['turret']);
    expect(r.ok).toBe(true);
    expect(r.target).toBeUndefined();
  });
});
