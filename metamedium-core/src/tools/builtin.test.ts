// The built-in tools (V1-PLAN B1): every affordance the field shows comes from
// a registered tool. These are the e2e's golden fixtures (e2e 49) in Node — a
// row of three boxes, a molecule and the second one drawn after naming the
// first, a line of writing unread and read, a text made from it — drawn with
// the same strokes the harness draws, asked for their offers and ranked the
// way the field ranks them. The readings the field shows beside them (what
// the marks ARE) are not offers and are not here.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { LOCAL_PARTICIPANT, labelOf, transcriptOf } from '../session/nodes';
import type { Point } from '../types';
import type { Offer, ToolHost } from './tool';
import { offersFor, completionsFor, toolScope, takeOffer, describeTools, registeredTools, getTool } from './registry';
import { rankOffers } from './rank';
import { BUILTIN_TOOLS } from './builtin';
import { standStructure } from './structure';

// The harness's own strokes (Demos/session-engine.e2e.js, window.__helpers).
const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
function rect(x: number, y: number, w: number, h: number): Point[] {
  const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  const path = [mid, v[1], v[2], v[3], v[0], mid];
  let p: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) p = p.concat(line(path[i], path[i + 1], 26).slice(i ? 1 : 0));
  return p;
}
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
function word(x: number, y: number, w: number, h: number, humps = 7): Point[] {
  const p: Point[] = [];
  const n = humps * 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * humps * Math.PI;
    p.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) });
  }
  return p;
}

let clock = 1000;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 100), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const molecule = (s: Session, ox: number) => [
  ...[[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(s, circle(ox + x, y, 40))),
  draw(s, line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)),
  draw(s, line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30)),
];
const threeWords = (s: Session) => ([[200, 300, 90, 28, 6], [320, 302, 110, 26, 7], [460, 300, 80, 28, 5]] as const).map(([x, y, w, h, humps]) => draw(s, word(x, y, w, h, humps)));
const readAs = (s: Session, ids: string[], words: string[]) => {
  const reader = s.join('agent', 'e2e-stub', (clock += 100), 2, 'local');
  ids.forEach((id, i) => s.propose({ participantId: reader, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text: words[i] }, confidence: 0.9 }], at: (clock += 1) }));
};

/** A host as the surface's is in the golden run: the stub joined, and it can see. */
const HOST: Partial<ToolHost> = { models: [{ name: 'llm:e2e-stub', sees: true }] };

/** What the field would show: every offer, ranked with no learned use. */
const ranked = (s: Session, host = HOST) => rankOffers(offersFor(toolScope(s, { host })));
const keys = (offers: Offer[]) => offers.map((o) => o.key);
const pills = (offers: Offer[]) => offers.filter((o) => !o.hidden && !o.lead).map((o) => [o.label, !!o.asks]);

describe('the built-in tools', () => {
  it('are registered in the field’s order, each once, and every one says what it does', () => {
    const ids = registeredTools().map((t) => t.id);
    expect(ids.slice(0, BUILTIN_TOOLS.length)).toEqual(BUILTIN_TOOLS.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BUILTIN_TOOLS) {
      expect(getTool(t.id)).toBe(t);
      expect(t.describe().length).toBeGreaterThan(20);
    }
    const lines = describeTools().split('\n');
    expect(lines).toHaveLength(registeredTools().length);
    expect(lines).toContain('tidy — line marks up and space them evenly, or match their sizes; the ink untouched');
  });

  it('a row of three boxes: draw them clean, line up, match sizes; read as writing and what is this ask a model', () => {
    const s = createSession();
    const row = [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(s, rect(x, y, 120, 80)));
    hold(s, row);
    const offers = ranked(s);
    expect(keys(offers)).toEqual(['snap', 'row:tidy-row', 'row:equalize', 'read-any', 'what', 'duplicate', 'keep']);
    expect(pills(offers)).toEqual([['Draw them clean', false], ['Line up across', false], ['Match sizes', false], ['Read as writing', true], ['What is this?', true]]);
    // A concept's conversion stands on the concept's reading, and says it.
    const tidy = offers.find((o) => o.key === 'row:tidy-row')!;
    expect(tidy).toMatchObject({ tool: 'tidy', reason: 'align and space them evenly', grounds: { on: 'row' } });
    expect(tidy.grounds!.why).toMatch(/3 comparable marks sitting side by side/);
    // The core four are slots, never offers.
    expect(offers.some((o) => ['name', 'copy', 'paste', 'erase'].includes(o.key))).toBe(false);
  });

  it('a molecule: draw them clean, show it in 3D; named and drawn again, the second can be refused', () => {
    const s = createSession();
    const first = molecule(s, 0);
    hold(s, first);
    expect(keys(ranked(s))).toEqual(['snap', '3d', 'read-any', 'what', 'duplicate', 'keep']);
    expect(ranked(s).find((o) => o.key === '3d')!.reason).toMatch(/^3 spheres and 2 bonds in the frame, turning/);
    s.bless({ summonId: s.getState().summon!.id, name: 'molecule', at: (clock += 100) });
    const second = molecule(s, 560);
    hold(s, second);
    const sug = s.getState().summon!.suggestions.find((x) => x.kind === 'match')!;
    expect(keys(ranked(s))).toEqual(['snap', 'not:' + sug.id, '3d', 'read-any', 'what', 'duplicate', 'keep']);
    expect(ranked(s).find((o) => o.key === 'not:' + sug.id)!.label).toBe('Not a molecule');
  });

  it('a line of writing: read the writing, a model’s act; once read, label it and make it text', () => {
    const s = createSession();
    const words = threeWords(s);
    hold(s, words);
    expect(keys(ranked(s))).toEqual(['read', 'what', 'duplicate', 'keep']);
    expect(ranked(s)[0]).toMatchObject({ label: 'Read the writing', reason: 'a line of 3 words, unread', asks: 'model' });
    // With no model that can see, it says what it would take.
    expect(ranked(s, { models: [] })[0].reason).toBe('a line of 3 words, unread — needs a model that can see');
    readAs(s, words, ['hello', 'wide', 'world']);
    const offers = ranked(s);
    expect(keys(offers)).toEqual(['label:hello wide world', 'line-text:' + words.join(','), 'what', 'duplicate', 'keep']);
    expect(offers[0]).toMatchObject({
      label: 'Label it “hello wide world”',
      grounds: { on: 'written', confidence: 0.9, why: 'read from your handwriting by e2e-stub' },
      line: '↵ label it “hello wide world” — on your ink; makes nothing',
    });
    expect(offers[0].reason).toMatch(/^“hello wide world” on the writing itself, as a caption, in your ink/);
    expect(offers[1]).toMatchObject({ label: 'Make it text “hello wide world”', reason: 'text where the line is, fitted to the ink; flip it to see the writing' });
  });

  it('a text made from writing: edit the text, show the ink — the flip is the host’s, and says which way it faces', () => {
    const s = createSession();
    const words = threeWords(s);
    readAs(s, words, ['hello', 'wide', 'world']);
    hold(s, words);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'hello wide world', at: (clock += 100) })!;
    s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: 'hello wide world', from: 'writing', at: (clock += 1) });
    s.deselect((clock += 1));
    hold(s, [id]);
    expect(keys(ranked(s))).toEqual(['edit-text:' + id, 'flip:' + id, 'what', 'duplicate', 'keep']);
    expect(ranked(s).find((o) => o.key === 'flip:' + id)!.label).toBe('Show the ink');
    expect(ranked(s, { ...HOST, isFlipped: (x) => x === id }).find((o) => o.key === 'flip:' + id)!.label).toBe('Show the text');
  });

  it('what is typed completes: Name it and Label it for a word, each placed at the head of what the field affords', () => {
    const s = createSession();
    const row = [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(s, rect(x, y, 120, 80)));
    hold(s, row);
    const done = completionsFor(toolScope(s, { text: 'nav', word: 'nav', host: HOST }));
    expect(done.map((o) => [o.key, o.label, o.place])).toEqual([['name-word', 'Name it “nav”', 'head'], ['label-word', 'Label it “nav”', 'head']]);
    expect(done[1].reason).toMatch(/^“nav” on each of the 3 marks you made, in your ink/);
    // No word, nothing completes.
    expect(completionsFor(toolScope(s, { text: 'website about dolphins', host: HOST }))).toEqual([]);
  });
});

describe('taking a built-in offer writes events carrying the tool', () => {
  it('line up: the marks move by a transform, the ink untouched, the event stamped tidy', () => {
    const s = createSession();
    const row = [[200, 200], [360, 230], [520, 190]].map(([x, y]) => draw(s, rect(x, y, 120, 80)));
    hold(s, row);
    const scope = toolScope(s, { host: HOST });
    const offer = offersFor(scope).find((o) => o.key === 'row:tidy-row')!;
    takeOffer(offer, scope, s, (clock += 100));
    const last = s.getEvents()[s.getEvents().length - 1];
    expect(last).toMatchObject({ type: 'tidy', mode: 'align', axis: 'row', tool: 'tidy' });
    expect(s.getState().nodes.get(row[1])!.reps.some((r) => r.modality === 'transform')).toBe(true);
  });

  it('show it in 3D: blessed, the engine’s program attached and playing — three events, each stamped graph3d', () => {
    const s = createSession();
    const ids = molecule(s, 0);
    hold(s, ids);
    const scope = toolScope(s, { host: HOST });
    const n = s.getEvents().length;
    const taken = takeOffer(offersFor(scope).find((o) => o.key === '3d')!, scope, s, (clock += 100));
    const evs = s.getEvents().slice(n);
    expect(evs.map((e) => [e.type, e.tool])).toEqual([['bless', 'graph3d'], ['code', 'graph3d'], ['clock', 'graph3d']]);
    expect(taken.made).toBeTruthy();
    expect(s.getState().clocks[taken.made!].playing).toBe(true);
  });

  it('label it: the field closes first, then the word goes on the ink — every event stamped label', () => {
    const s = createSession();
    const words = threeWords(s);
    readAs(s, words, ['hello', 'wide', 'world']);
    hold(s, words);
    const scope = toolScope(s, { host: HOST });
    const n = s.getEvents().length;
    const taken = takeOffer(offersFor(scope).find((o) => o.key === 'label:hello wide world')!, scope, s, (clock += 100));
    expect(s.getEvents().slice(n).map((e) => [e.type, e.tool])).toEqual([['dismiss', 'label'], ['deselect', 'label'], ['label', 'label']]);
    expect(labelOf(s.getState().nodes.get(words[0])!)!.text).toBe('hello wide world');
    expect(taken.detail).toMatchObject({ done: [words[0]], saying: [], refused: [] });
  });

  it('an act only the host can perform is named, and nothing is written for it', () => {
    const s = createSession();
    const words = threeWords(s);
    hold(s, words);
    const scope = toolScope(s, { host: HOST });
    const n = s.getEvents().length;
    expect(takeOffer(offersFor(scope).find((o) => o.key === 'read')!, scope, s, (clock += 100))).toEqual({ host: 'read' });
    expect(takeOffer(offersFor(scope).find((o) => o.key === 'what')!, scope, s, (clock += 100))).toEqual({ host: 'what' });
    expect(s.getEvents().length).toBe(n);
    expect(transcriptOf(s.getState().nodes.get(words[0])!)).toBeUndefined();
  });

  it('the structure stands in the engine’s name, stamped structure', () => {
    const s = createSession();
    const row = [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(s, rect(x, y, 120, 80)));
    hold(s, row);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'nav', at: (clock += 100) })!;
    const built = standStructure(s, id, 'a nav bar', (clock += 1));
    expect(built.ok).toBe(true);
    expect(s.getEvents()[s.getEvents().length - 1]).toMatchObject({ type: 'code', kind: 'html', tool: 'structure' });
  });
});

// PLAN-USER-SURFACE U1d (audit row 5): an offer with no relation to what is held is noise that
// hides the ones that matter. Read as writing stays for ink the shape rung could not place for
// sure — the point of v10 F5, John's h read as an arc — and Show it in 3D for what its tool
// builds: circles joined by lines.
describe('offers relevant or absent', () => {
  // A hand's h, in one stroke: down the stem, back up half way, over the shoulder and down.
  const h = (x: number, y: number): Point[] => [
    ...line({ x, y }, { x, y: y + 60 }, 20),
    ...line({ x, y: y + 60 }, { x, y: y + 32 }, 10).slice(1),
    ...Array.from({ length: 14 }, (_, i) => { const a = Math.PI + (i / 13) * Math.PI; return { x: x + 11 + 11 * Math.cos(a), y: y + 34 + 9 * Math.sin(a) }; }).slice(1),
    ...line({ x: x + 22, y: y + 34 }, { x: x + 22, y: y + 60 }, 10).slice(1),
  ];

  it('a box, a line and a circle: nothing offers to read them as writing, nor to stand them in 3D — a box is no sphere', () => {
    const s = createSession();
    const ids = [draw(s, rect(200, 200, 120, 80)), draw(s, line({ x: 320, y: 240 }, { x: 420, y: 240 }, 30)), draw(s, circle(460, 240, 40))];
    hold(s, ids);
    const k = keys(ranked(s));
    expect(k).not.toContain('read-any');
    expect(k).not.toContain('3d');
    expect(k).toContain('what');
  });

  it('two boxes joined by a line are a graph, but no molecule: no 3D', () => {
    const s = createSession();
    const ids = [draw(s, rect(200, 200, 120, 80)), draw(s, line({ x: 322, y: 240 }, { x: 478, y: 240 }, 30)), draw(s, rect(480, 200, 120, 80))];
    hold(s, ids);
    expect(keys(ranked(s))).not.toContain('3d');
    // …nor with an arrow between them, a flowchart's flow.
    const t = createSession();
    const arrow = [...line({ x: 322, y: 240 }, { x: 476, y: 240 }, 30), ...line({ x: 476, y: 240 }, { x: 460, y: 228 }, 8).slice(1)];
    hold(t, [draw(t, rect(200, 200, 120, 80)), draw(t, arrow), draw(t, rect(480, 200, 120, 80))]);
    expect(keys(ranked(t))).not.toContain('3d');
  });

  it('a graph whose nodes are not all circles — one atom drawn as a box — is not stood in 3D', () => {
    const s = createSession();
    const ids = [draw(s, circle(300, 300, 40)), draw(s, circle(500, 300, 40)), draw(s, rect(360, 420, 80, 80)),
      draw(s, line({ x: 340, y: 300 }, { x: 460, y: 300 }, 30)), draw(s, line({ x: 328, y: 328 }, { x: 372, y: 422 }, 30))];
    hold(s, ids);
    const scope = toolScope(s, { host: HOST });
    expect(scope.reading.genre.genre).toBe('graph');
    expect(keys(ranked(s))).not.toContain('3d');
  });

  it('a molecule stands in 3D, and is not offered as writing', () => {
    const s = createSession();
    hold(s, molecule(s, 0));
    const k = keys(ranked(s));
    expect(k).toContain('3d');
    expect(k).not.toContain('read-any');
  });

  it('ink the rung could not place for sure is still offered to read as writing (v10 F5)', () => {
    const s = createSession();
    const id = draw(s, h(300, 300));
    hold(s, [id, draw(s, rect(360, 290, 60, 70))]);
    const k = keys(ranked(s));
    expect(k).toContain('read-any');
  });
});
