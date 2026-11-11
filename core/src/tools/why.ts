// Why? The canvas says why it reads held marks as it does, from what it
// measured: the definition they match and how, what they are made of and how
// the pieces sit, the diagram and the concepts they read as, each mark's own
// plural readings, and what another voice said. Tier 1: nothing is asked of a
// model, so the headline loop — draw, name, compose, recognise, ask why —
// closes with no model joined. (*What is this?* asks the models; this never does.)
//
// The answer stands on the canvas as the engine's own, beside the marks, and
// is erasable like any answer. It is words about readings, never a reading:
// nothing here names, blesses or changes a mark.

import type { Tool, ToolScope } from './tool';
import { ENGINE_PARTICIPANT, topInterpretation } from '../session/nodes';
import { interpretationsOf, isHeardReading, isShapeRungReading } from '../session/interpretations';
import { structuralSignature, type StructuralSignature } from '../session/signature';
import { notationsOf, sayable, describeNotation, NOTATION_FLOOR } from '../notations/notation';
import { shippedPack } from '../packs/registry';

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => (n >= 0 && n < NUMBERS.length ? NUMBERS[n] : String(n));

/** A shape rung's word as a person says it: `text` is writing, `art` a mark the canvas could not place. */
function shapeWord(type: string, n: number): string {
  if (type === 'text') return n === 1 ? 'piece of writing' : 'pieces of writing';
  if (type === 'art') return n === 1 ? 'mark it could not place' : 'marks it could not place';
  return n === 1 ? type : /(s|x|ch)$/.test(type) ? `${type}es` : `${type}s`;
}

const one = (type: string) => (type === 'text' ? 'writing' : type === 'art' ? 'an unplaced mark' : `${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}`);

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const byCount = (bag: Record<string, number>) => Object.entries(bag).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]));

/** "three circles and two lines" */
export function shapesInWords(sig: StructuralSignature): string {
  return list(byCount(sig.shapes).map(([t, n]) => `${count(n)} ${shapeWord(t, n)}`));
}

const CONNECTORS = new Set(['line', 'arrow', 'arc']);
/** Which way of sitting together says most, first. */
const LINK_ORDER = ['connects', 'points-to', 'contains', 'crossing', 'touching', 'near'];
const LINK_WORD: Record<string, string> = { touching: 'touches', near: 'is near', crossing: 'crosses', connects: 'joins', contains: 'holds', 'points-to': 'points to' };

/** "a circle touches a line, four times" — the links between the pieces, most frequent first, at most three kinds. */
export function linksInWords(sig: StructuralSignature): string {
  const parsed = byCount(sig.links).map(([key, n]) => {
    const m = /^(.+?)[>-]([a-z-]+?)[>-]([^>-]+)$/.exec(key);
    if (!m) return { a: key, rel: '', b: '', n, directed: true };
    // A symmetric link's two ends are sorted by name: say it with the connector first — "a line joins a circle".
    const directed = key.includes('>');
    const swap = !directed && CONNECTORS.has(m[3]) && !CONNECTORS.has(m[1]);
    return { a: swap ? m[3] : m[1], rel: m[2], b: swap ? m[1] : m[3], n, directed };
  });
  // Two kinds of shape are said to sit one way, the way that says most: a line that joins a circle also
  // touches it, crosses its edge and is near it, and saying all four says nothing more.
  const pair = (l: { a: string; b: string }) => [l.a, l.b].sort().join('|');
  const rank = (l: { rel: string }) => { const i = LINK_ORDER.indexOf(l.rel); return i < 0 ? LINK_ORDER.length : i; };
  const best = new Map<string, (typeof parsed)[number]>();
  for (const l of parsed) { const k = pair(l), b = best.get(k); if (!b || rank(l) < rank(b)) best.set(k, l); }
  const strongest = parsed.filter((l) => best.get(pair(l)) === l);
  // *near* alone says little; it is said only when nothing here joins, holds, crosses or touches.
  const kept = strongest.some((l) => l.rel !== 'near') ? strongest.filter((l) => l.rel !== 'near') : strongest;
  const said = kept.slice(0, 2).map((l) => {
    const words = l.rel ? `${one(l.a)} ${LINK_WORD[l.rel] ?? l.rel} ${one(l.b)}` : l.a;
    return l.n === 1 ? words : `${words}, ${l.n === 2 ? 'twice' : `${count(l.n)} times`}`;
  });
  const more = kept.length - said.length;
  return said.join('; ') + (more > 0 ? `; and ${count(more)} more kind${more === 1 ? '' : 's'} of link` : '');
}

/** The signature comparison's own reasoning (signature.ts, `compareSignatures`), in a person's words. */
function matchInWords(reasoning: string | undefined, whose: string): string {
  const r = reasoning ?? '';
  const shapes = /same shapes/.test(r) ? 'the same shapes' : (/shapes (\d+)\/(\d+) in common/.exec(r) ? RegExp.$1 + ' of ' + RegExp.$2 + ' shapes in common' : '');
  const links = /no links either side/.test(r) ? 'no links to compare' : /same links/.test(r) ? 'the same links between them' : (/links (\d+)\/(\d+) in common/.exec(r) ? RegExp.$1 + ' of ' + RegExp.$2 + ' links in common' : '');
  const against = /an accepted example/.test(r) ? 'a drawing you said was one' : whose;
  const parts = [shapes, links].filter(Boolean);
  return parts.length ? `${list(parts)} as ${against}` : `measured against ${against}`;
}

const conf = (n: number) => n.toFixed(2);

/**
 * Why the canvas reads these marks as it does — sentences a person can check
 * against the drawing — and whether there is more to say than the marks' own shapes.
 */
export function whyOf(scope: ToolScope): { text: string; grounded: boolean } {
  const { state, marks, summon, reading } = scope;
  const nodes = state.nodes;
  const lines: string[] = [];
  let grounded = false;

  // 1. What it matches, and how the match was measured.
  const matches = (summon.suggestions ?? []).filter((s) => s.kind === 'match' && typeof s.score === 'number').slice(0, 2);
  for (const m of matches) {
    const whose = m.pack ? `the ${shippedPack(m.pack)?.name ?? m.pack} pack’s ${m.label}` : `the ${m.label} you named`;
    lines.push(`Reads as ${m.label} ${conf(m.score!)}: ${matchInWords(m.reasoning, whose)}.`);
    grounded = true;
  }

  // 2. What is here: the pieces and how they sit together.
  if (marks.length > 1) {
    const sig = structuralSignature(marks, nodes, (id) => topInterpretation(nodes.get(id)!) ?? 'art');
    const links = linksInWords(sig);
    lines.push(`Here: ${shapesInWords(sig)}${links ? ` — ${links}` : ', none of them touching, crossing or holding another'}.`);
  }

  // 3. The diagram it reads as, in that notation's own words.
  if (marks.length > 1) {
    const top = sayable(notationsOf(state, marks)).filter((r) => r.confidence >= NOTATION_FLOOR)[0];
    if (top) { lines.push(`As a diagram: ${describeNotation(top)}.`); grounded = true; }
  }

  // 4. The concepts, each with what was measured.
  for (const c of (reading.concepts ?? []).slice(0, matches.length ? 1 : 2)) {
    lines.push(`${c.concept} ${conf(c.confidence)}: ${c.reasoning}.`.replace(/\.\.$/, '.'));
    grounded = true;
  }

  // 5. One mark alone: every reading the shape rung holds, with its reason — plural, as measured.
  if (marks.length === 1) {
    const node = nodes.get(marks[0]);
    const rung = node ? interpretationsOf(node, nodes).filter(isShapeRungReading).slice(0, 3) : [];
    if (rung.length) {
      lines.push(rung.map((r, i) => `${i ? 'or ' : ''}${one(r.label)} ${conf(r.weight)}${r.reasoning ? ` — ${r.reasoning}` : ''}`).join('; ') + '.');
      if (rung.length > 1) lines.push('More than one reading stands; none is settled until you choose.');
    } else {
      lines.push('The canvas could not place this mark as a shape.');
    }
  }

  // 6. What another voice said, attributed.
  const heard: string[] = [];
  for (const id of marks) {
    const node = nodes.get(id);
    if (!node) continue;
    for (const r of interpretationsOf(node, nodes).filter(isHeardReading)) {
      const line = `${scope.host.nameOf(r.source ?? '') || r.sourceName} read it as ${r.label} ${conf(r.weight)}${r.reasoning ? `: ${r.reasoning}` : ''}.`;
      if (!heard.includes(line)) heard.push(line);
    }
  }
  if (heard.length) { lines.push(...heard.slice(0, 2)); grounded = true; }

  lines.push('Measured from the ink; no model was asked.');
  return { text: lines.join('\n'), grounded };
}

export const WHY: Tool = {
  id: 'why',
  name: 'saying why',
  describe: () => 'say why the canvas reads these marks as it does, from what it measured; no model asked',
  offers(scope) {
    if (!scope.marks.length) return [];
    const { grounded } = whyOf(scope);
    return [{
      key: 'why',
      label: 'Why?',
      reason: 'what was measured, and what it was matched against — said beside the marks; no model asked',
      base: 0.2,
      tool: 'why',
      verbs: ['why', 'why?', 'how do you know', 'because', 'reason'],
      // A pill where there is a reading to explain; typed (*why*) for bare shapes.
      hidden: !grounded,
      data: { ids: scope.marks.slice() },
    }];
  },
  take(_offer, scope, session, at) {
    const { text } = whyOf(scope);
    session.answer({ participantId: ENGINE_PARTICIPANT, question: 'why', text, aboutIds: scope.marks.slice(), at });
    return { detail: { lines: text.split('\n').length } };
  },
};
