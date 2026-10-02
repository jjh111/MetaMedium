// Intent words (PLAN-FIELD-PAR FP1, FP8): the words a person says find the act,
// an act not offered says what it is missing, and the board's own acts are
// reached from the field.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import { rectStroke, lineStroke } from '../test/strokes';
import { magnetSites, nearestMagnet } from '../session/magnets';
import { offersFor, toolScope } from './registry';
import { BUILTIN_TOOLS } from './builtin';
import { intentsMatching, intentWordsFor, missingFor, hostIntentOf, wordScore, INTENTS, intentTexts, nearestIntent } from './intents';
import { createStubEmbedTransport } from '../semantic/embed';

void BUILTIN_TOOLS;

describe('intent words', () => {
  it('scores a word itself, a word leading more, a start of a word, and a word inside', () => {
    expect(wordScore('tidy', 'tidy')).toBe(3);
    expect(wordScore('Tidy it up!', 'tidy')).toBe(2.5);
    expect(wordScore('conn', 'connect')).toBe(2);
    expect(wordScore('co', 'connect')).toBe(0);
    expect(wordScore('please tidy now', 'tidy')).toBe(1.5);
    expect(wordScore('banana', 'tidy')).toBe(0);
  });

  it('the words John typed find their acts', () => {
    const ids = (t: string) => intentsMatching(t).map((m) => m.intent.id);
    expect(ids('diagram')).toEqual(expect.arrayContaining(['mermaid', 'tidy-diagram']));
    expect(ids('tidy')[0]).toBe('tidy-diagram');
    expect(ids('line up')).toEqual(expect.arrayContaining(['tidy-diagram', 'line-up']));
    expect(ids('connect')[0]).toBe('route');
    expect(ids('banana')).toEqual([]);
  });

  it('a pill answers to its act\'s words', () => {
    expect(intentWordsFor('tidy-diagram')).toEqual(expect.arrayContaining(['tidy', 'line up', 'diagram']));
    expect(intentWordsFor('row:tidy-row')).toEqual(expect.arrayContaining(['line up', 'align']));
    expect(intentWordsFor('mermaid')).toContain('diagram');
    expect(intentWordsFor('nothing-of-the-sort')).toEqual([]);
  });

  it('every intent has words, a label and an id of its own', () => {
    const seen = new Set<string>();
    for (const i of INTENTS) {
      expect(i.words.length).toBeGreaterThan(0);
      expect(i.label).toBeTruthy();
      expect(seen.has(i.id)).toBe(false);
      seen.add(i.id);
    }
  });

  it('an act not offered says what it is missing; an act offered says nothing is', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'intents~t1' });
    const a = s.addStroke(rectStroke(100, 100, 160, 110), 1000);
    s.summonMarks([a], 900_000);
    const scope = toolScope(s);
    const offered = offersFor(scope).map((o) => o.key);
    const m = missingFor('tidy', scope, offered)!;
    expect(m.label).toBe('Tidy the diagram');
    expect(m.why).toMatch(/one mark is no diagram/);

    // Two boxes and a line tied at both ends: tidy is offered, so nothing is missing.
    const t = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'intents~t2' });
    const b1 = t.addStroke(rectStroke(100, 100, 160, 110), 1000);
    const b2 = t.addStroke(rectStroke(460, 100, 160, 110), 2000);
    const l = t.addStroke(lineStroke({ x: 260, y: 155 }, { x: 460, y: 155 }), 3000);
    for (const [id, end, at] of [[b1, 'start', { x: 260, y: 155 }], [b2, 'end', { x: 460, y: 155 }]] as const) {
      const st = t.getState();
      const hit = nearestMagnet(at, magnetSites(st.nodes.get(id)!, st.nodes), 40)!;
      t.bind({ strokeId: l, nodeId: id, site: { kind: hit.site.kind, index: hit.site.index }, end, at: 3001 });
    }
    t.summonMarks([b1, b2, l], 900_000);
    const scope2 = toolScope(t);
    const offered2 = offersFor(scope2).map((o) => o.key);
    expect(offered2).toEqual(expect.arrayContaining(['tidy-diagram', 'mermaid']));
    expect(missingFor('tidy', scope2, offered2)).toBeNull();
    expect(missingFor('diagram', scope2, offered2)).toBeNull();
  });

  it('the board\'s own acts are reached from the field, with what follows their word', () => {
    expect(hostIntentOf('export')).toMatchObject({ act: 'export', rest: '' });
    expect(hostIntentOf('export svg')).toMatchObject({ act: 'export', rest: 'svg' });
    expect(hostIntentOf('find pricing')).toMatchObject({ act: 'find', rest: 'pricing' });
    expect(hostIntentOf('help')).toMatchObject({ act: 'help' });
    expect(hostIntentOf('print')).toMatchObject({ act: 'print' });
    expect(hostIntentOf('finding nemo')).toBeNull();
    expect(hostIntentOf('banana')).toBeNull();
    // A sentence is a brief, whatever words it holds.
    expect(hostIntentOf('export the menu as a page for the shop')).toBeNull();
  });

  it('an act\'s word inside a sentence is a brief, not an act that is missing', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'intents~t3' });
    const a = s.addStroke(rectStroke(100, 100, 160, 110), 1000);
    s.summonMarks([a], 900_000);
    const scope = toolScope(s);
    const offered = offersFor(scope).map((o) => o.key);
    expect(missingFor('torus in 3d', scope, offered)).toBeNull();
    expect(missingFor('3d', scope, offered)!.label).toBe('Show it in 3D');
  });
});

describe('intents by meaning (D1)', () => {
  it('a word no table holds finds its act by meaning; a word near nothing finds none', async () => {
    const t = createStubEmbedTransport({ groups: [['flowchart', 'schematic', 'blueprint']], dimension: 256 });
    const texts = ['schematic', 'zebra', ...intentTexts()];
    const vecs = await t.embed(texts);
    const of = new Map(texts.map((x, i) => [x, vecs[i]]));
    expect(nearestIntent((x) => of.get(x), of.get('schematic'))!.intent.id).toBe('mermaid');
    expect(nearestIntent((x) => of.get(x), of.get('zebra'))).toBeNull();
    // Only what is let in: with Make it Mermaid not offered, the nearest is looked for among the rest.
    expect(nearestIntent((x) => of.get(x), of.get('schematic'), (i) => i.id !== 'mermaid')?.intent.id ?? null).not.toBe('mermaid');
  });

  it('every text an intent is known by is listed once', () => {
    const all = intentTexts();
    expect(new Set(all).size).toBe(all.length);
    expect(all).toEqual(expect.arrayContaining(['diagram', 'make it mermaid', 'tidy the diagram']));
  });
});
