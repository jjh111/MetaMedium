// A participant answered by hand takes part exactly as one behind a URL does.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { createBridgeParticipant } from './bridge';
import { route, describeRoute } from './router';
import { interpretationsOf } from '../session/interpretations';
import { handRect, circleStroke, checkStroke, rectStroke } from '../test/strokes';

function boardWithBridge() {
  const s = createSession();
  const ids = [
    s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), 1000),
    s.addStroke(handRect(290, 100, 150, 120, { seed: 2 }), 1100),
  ];
  const bridge = createBridgeParticipant(s, 1200, { name: 'claude' });
  return { s, ids, bridge };
}

describe('the bridge', () => {
  it('joins as an ordinary agent participant', () => {
    const { s, bridge } = boardWithBridge();
    expect(s.getState().participants).toContain(bridge.id);
    expect(bridge.name).toBe('claude');
  });

  it('parks the question instead of posting it, prompt and all', async () => {
    const { ids, bridge } = boardWithBridge();
    expect(bridge.pending()).toBeNull();

    const inFlight = bridge.interpret(ids, 2000);
    const req = bridge.pending()!;
    expect(req).not.toBeNull();
    // It is the ordinary agent prompt — not a special path.
    expect(req.system).toMatch(/INTERPRETATIONS, not answers/);
    expect(req.user).toMatch(/geometry:/);

    bridge.deliver(req.id, '[{"label":"pair","confidence":0.8,"reasoning":"two boxes side by side"}]');
    const result = await inFlight;
    expect(result.ok).toBe(true);
    expect(result.readings[0].label).toBe('pair');
    expect(bridge.pending()).toBeNull();
  });

  it('proposes what it is told, through the same channel a model uses', async () => {
    const { s, ids, bridge } = boardWithBridge();
    const inFlight = bridge.interpret(ids, 2000);
    bridge.deliver(bridge.pending()!.id, '[{"label":"pair","confidence":0.9,"reasoning":"two boxes"}]');
    await inFlight;

    const reads = interpretationsOf(s.getState().nodes.get(ids[0])!, s.getState().nodes);
    const mine = reads.find((r) => r.label === 'pair')!;
    expect(mine).toBeDefined();
    expect(mine.sourceName).toBe('claude');
    expect(mine.blessed).toBe(false); // a proposal, like every other reading
  });

  it('answers a question into the canvas', async () => {
    const { s, ids, bridge } = boardWithBridge();
    const inFlight = bridge.ask('why are these one thing?', ids, 2000);
    bridge.deliver(bridge.pending()!.id, 'They sit side by side at the same height and are the same size.');
    const r = await inFlight;
    expect(r.ok).toBe(true);
    expect(s.getState().explanations).toHaveLength(1);
  });

  it('takes one question at a time, and says so', async () => {
    const { ids, bridge } = boardWithBridge();
    const first = bridge.interpret(ids, 2000);
    const second = await bridge.interpret(ids, 2100);
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already waiting/);
    bridge.deliver(bridge.pending()!.id, '[{"label":"x","confidence":0.5,"reasoning":"y"}]');
    await first;
  });

  it('refuses an answer to a question that is no longer waiting', async () => {
    const { ids, bridge } = boardWithBridge();
    const inFlight = bridge.interpret(ids, 2000);
    const req = bridge.pending()!;
    bridge.deliver(req.id, '[{"label":"a","confidence":0.5,"reasoning":"b"}]');
    await inFlight;
    expect(bridge.deliver(req.id, 'too late')).toBe(false);
  });

  it('can be given up on, and reports failure rather than hanging', async () => {
    const { ids, bridge } = boardWithBridge();
    const inFlight = bridge.interpret(ids, 2000);
    expect(bridge.cancel(bridge.pending()!.id, 'not now')).toBe(true);
    const r = await inFlight;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('not now');
  });

  it('tells a surface when a question starts and stops waiting', async () => {
    const { ids, bridge } = boardWithBridge();
    const seen: (string | null)[] = [];
    bridge.subscribe((req) => seen.push(req ? req.id : null));
    const inFlight = bridge.interpret(ids, 2000);
    bridge.deliver(bridge.pending()!.id, '[{"label":"a","confidence":0.5,"reasoning":"b"}]');
    await inFlight;
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatch(/^bridge:/);
    expect(seen[1]).toBeNull();
  });

  it('builds a page from a drawing, like any other participant', async () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(rectStroke(340, 100, 200, 120), 1100);
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    const artifactId = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;
    const bridge = createBridgeParticipant(s, 3100, { name: 'claude' });

    const inFlight = bridge.generate({ prompt: 'a landing page', artifactId, at: 3200 });
    const req = bridge.pending()!;
    expect(req.system).toMatch(/THE LAYOUT IS ALREADY DECIDED/);
    expect(req.user).toMatch(/LAYOUT the drawing describes/);

    bridge.deliver(req.id, JSON.stringify({
      regions: { r1: { tag: 'header', html: '<h1>Hello</h1>' }, r2: { html: '<p>World</p>' } },
    }));
    const r = await inFlight;
    expect(r.ok).toBe(true);
    expect(s.getState().live).toEqual([artifactId]);
    expect(r.code).toContain('<h1>Hello</h1>');
  });
});

describe('routing', () => {
  it('does not send a question Tier 0 already answered', () => {
    const { s, ids } = boardWithBridge();
    const concepts = s.read(ids).concepts;
    const r = route('read', s.getState(), { concepts });
    expect(r.settledLocally).toBe(true);
    expect(describeRoute(r)).toMatch(/Tier 0 has this/);
  });

  it('does send one it cannot', () => {
    const { s, ids, bridge } = boardWithBridge();
    const r = route('build', s.getState(), { concepts: s.read(ids).concepts });
    expect(r.settledLocally).toBe(false);
    expect(r.candidates.map((c) => c.participantId)).toContain(bridge.id);
  });

  it('offers the cheapest first — local before hosted', () => {
    const s = createSession();
    const hosted = createBridgeParticipant(s, 1000, { name: 'hosted', tier: 2 });
    const local = createBridgeParticipant(s, 1000, { name: 'local', tier: 1 });
    const r = route('build', s.getState());
    expect(r.candidates.map((c) => c.name)).toEqual(['local', 'hosted']);
    expect(r.candidates[0].why).toMatch(/this machine/);
    expect([hosted.id, local.id]).toHaveLength(2);
  });

  it('says plainly when nobody can answer, instead of going quiet', () => {
    const s = createSession();
    const r = route('build', s.getState());
    expect(r.candidates).toEqual([]);
    expect(describeRoute(r)).toMatch(/add a model, or bridge one in/);
  });

  it('never routes humans or the engine as things to ask', () => {
    const { s } = boardWithBridge();
    const r = route('answer', s.getState());
    expect(r.candidates.map((c) => c.name)).not.toContain('you');
    expect(r.candidates.map((c) => c.name)).not.toContain('tier0-heuristics');
  });
});
