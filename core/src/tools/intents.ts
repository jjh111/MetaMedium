// Intent words: what a person says for each act the canvas has, in one home
// (PLAN-FIELD-PAR FP1 and FP8, 2 Oct 2026).
//
// John drew two boxes and a line, held them and typed *diagram*, and met only
// *Name it* and *Label it*: the field found an act by the first letters of its
// label or by its own few verbs, and only among the acts offered right then.
// So *tidy*, *line up*, *connect* and *export* found nothing, and an act one
// change away never said what it was missing.
//
// This table is the words. The surface adds an act's words to its pill's
// verbs (`intentWordsFor`), so the field's own reader finds it; for an act not
// offered it says what is missing (`missingFor`); and the board's own acts —
// export, find, print, examples, help — are reached from the field too
// (`hostIntentOf`), where before they lived only in the control centre.
//
// Pure and derived: nothing here writes, asks a model or reads storage. The
// words are content, not a reading — a word in two intents names both, and the
// field ranks the offers as it always has.

import type { ToolScope } from './tool';
import { mermaidFor } from './mermaid';
import { diagramOf } from './route';
import { notationsOf, NOTATION_FLOOR } from '../notations/notation';
import { cosine } from '../semantic/embed';
import { SEMANTIC_FLOOR } from '../search/query';

/** One act a person may name: the offers it is (by key), what it is called, the words for it, and why it is not offered. */
export interface Intent {
  /** Stable id, for tests and the semantic seat's cache. */
  id: string;
  /** Does an offer of this key do this act? */
  is: (key: string) => boolean;
  /** What it is called — the pill's own label when it is offered. */
  label: string;
  /** What a person says for it, lower case. */
  words: readonly string[];
  /** Why it is not offered for these marks, in the person's words — what one change would make it so — or null when it says nothing. */
  missing?: (scope: ToolScope) => string | null;
}

const NO_DIAGRAM = 'these read as no diagram yet — join boxes with lines tied at both ends: draw each line from one box onto the other';

/** Why a diagram's tools are not offered here, from what the notations read. */
function whyNoDiagram(scope: ToolScope): string {
  if (scope.marks.length < 2) return 'hold the boxes and the lines between them — one mark is no diagram';
  const rs = notationsOf(scope.state, scope.marks).filter((r) => r.confidence >= NOTATION_FLOOR);
  if (rs.some((r) => r.notation === 'sequence')) return 'a sequence diagram is left as drawn — its messages run level between their lifelines';
  if (rs.some((r) => r.connectors.length)) return 'a line or an arrow is not tied at both ends — draw its ends onto the boxes it joins';
  return NO_DIAGRAM;
}

/** Every act a person may name at held marks, the likeliest reading of a shared word first. */
export const INTENTS: readonly Intent[] = [
  {
    id: 'mermaid',
    is: (k) => k === 'mermaid',
    label: 'Make it Mermaid',
    words: ['diagram', 'mermaid', 'flowchart', 'flow chart', 'chart', 'as a diagram', 'diagram code', 'mermaid code', 'mmd', 'as text'],
    missing: (scope) => (mermaidFor(scope.state, scope.marks, scope.host.isRead) ? null : (scope.marks.length < 2 ? 'hold two marks or more — one mark is no diagram' : NO_DIAGRAM)),
  },
  {
    id: 'tidy-diagram',
    is: (k) => k === 'tidy-diagram',
    label: 'Tidy the diagram',
    words: ['tidy', 'tidy up', 'tidy it', 'neaten', 'line up', 'align', 'arrange', 'lay out', 'layout', 'straighten', 'clean up', 'diagram', 'organise', 'organize'],
    missing: (scope) => (diagramOf(scope.state, scope.marks) ? null : whyNoDiagram(scope)),
  },
  {
    id: 'route',
    is: (k) => k === 'route',
    label: 'Route the connectors',
    words: ['route', 'connect', 'connectors', 'connections', 'wires', 'elbows', 'right angles', 'orthogonal', 'square the lines'],
    missing: (scope) => (diagramOf(scope.state, scope.marks) ? null : whyNoDiagram(scope)),
  },
  {
    id: 'line-up',
    is: (k) => /:tidy-/.test(k),
    label: 'Line up',
    words: ['line up', 'align', 'line them up', 'even out', 'space evenly', 'arrange', 'tidy'],
    missing: () => 'line up needs a row or a column of like marks, side by side',
  },
  {
    id: 'equalize',
    is: (k) => /:equalize$/.test(k),
    label: 'Match sizes',
    words: ['same size', 'match sizes', 'equal', 'equalize', 'resize'],
    missing: () => 'matching sizes needs a row or a column of like marks',
  },
  {
    id: 'clean',
    is: (k) => k === 'snap',
    label: 'Draw them clean',
    words: ['clean', 'neat', 'neaten', 'snap', 'redraw', 'straighten', 'tidy shapes', 'perfect'],
    missing: () => 'nothing held reads clearly enough as one shape to redraw it',
  },
  {
    id: '3d',
    is: (k) => k === '3d',
    label: 'Show it in 3D',
    words: ['3d', '3 d', 'three d', 'spheres', 'in 3d', 'molecule model', 'spin'],
    missing: () => 'only circles joined by lines stand in 3D',
  },
  {
    id: 'region',
    is: (k) => k === 'region',
    label: 'Make it a region',
    words: ['region', 'make a region', 'place', 'section', 'area', 'group them'],
    missing: () => 'type region: and a name to put a named place round what is held',
  },
  {
    id: 'sizes',
    is: (k) => k === 'maths:sizes',
    label: 'Show the sizes',
    words: ['sizes', 'measure', 'measurements', 'dimensions', 'solve', 'size'],
    missing: () => 'write a number beside a side first — the sizes follow from what is written',
  },
  {
    id: 'read',
    is: (k) => k === 'read' || k === 'read-lines' || k === 'read-any' || k === 'read-picture',
    label: 'Read the writing',
    words: ['read', 'transcribe', 'what does it say', 'ocr', 'handwriting'],
    missing: () => 'nothing held reads as writing',
  },
  {
    id: 'what',
    is: (k) => k === 'what',
    label: 'What is this?',
    words: ['what', 'what is this', 'what is it', 'explain', 'identify', 'why'],
  },
  {
    id: 'duplicate',
    is: (k) => k === 'duplicate',
    label: 'Duplicate these',
    words: ['duplicate', 'clone', 'another', 'again', 'repeat'],
  },
  {
    id: 'trace',
    is: (k) => k === 'trace',
    label: 'Trace into ink',
    words: ['trace', 'trace it', 'vectorise', 'vectorize'],
    missing: () => 'tracing is for a picture held alone',
  },
  {
    id: 'frame',
    is: (k) => k === 'frame',
    label: 'Frame these',
    words: ['frame', 'wire', 'wire up'],
  },
];

/** The board's own acts, reached from the field (FP8): what each is called, and the words that open it. */
export type HostAct = 'export' | 'find' | 'print' | 'examples' | 'help';
export interface HostIntent {
  act: HostAct;
  label: string;
  words: readonly string[];
}
export const HOST_INTENTS: readonly HostIntent[] = [
  { act: 'export', label: 'export the board', words: ['export', 'save as', 'download', 'svg', 'png', 'pdf', 'zip', 'save a file'] },
  { act: 'find', label: 'find on every board', words: ['find', 'search', 'look for'] },
  { act: 'print', label: 'print at true size', words: ['print', 'true size', 'full size'] },
  { act: 'examples', label: 'open the examples', words: ['examples', 'example', 'sample boards'] },
  { act: 'help', label: 'open the help', words: ['help', 'how do i', 'shortcuts', 'guide'] },
];

/** Typed text as words: lower case, spaces collapsed, punctuation but `?` dropped. */
export function intentText(text: string): string {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}?\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * How well typed text names a word: 3 the word itself; 2.5 the word then more
 * (*tidy it up*); 2 a word it is the start of, three letters or more (*conn*);
 * 1.5 the word inside it, whole (*please tidy*); 0 not at all.
 */
export function wordScore(text: string, word: string): number {
  const t = intentText(text);
  if (!t || !word) return 0;
  if (t === word) return 3;
  if (t.startsWith(word + ' ')) return 2.5;
  if (t.length >= 3 && word.startsWith(t)) return 2;
  if ((' ' + t + ' ').includes(' ' + word + ' ')) return 1.5;
  return 0;
}

/** The intents typed text names, best first, each with its score; a tie keeps the table's order. */
export function intentsMatching(text: string): { intent: Intent; score: number }[] {
  const out: { intent: Intent; score: number; i: number }[] = [];
  INTENTS.forEach((intent, i) => {
    const score = Math.max(0, ...intent.words.map((w) => wordScore(text, w)), wordScore(text, intent.label.toLowerCase()));
    if (score > 0) out.push({ intent, score, i });
  });
  return out.sort((a, b) => b.score - a.score || a.i - b.i).map(({ intent, score }) => ({ intent, score }));
}

/** The words a person says for the act an offer of `key` does: what the field's pill answers to besides its own verbs. */
export function intentWordsFor(key: string): string[] {
  const out: string[] = [];
  for (const intent of INTENTS) if (intent.is(key)) for (const w of intent.words) if (!out.includes(w)) out.push(w);
  return out;
}

/** Words past this many are a sentence — a brief — and never taken for a board act or an act that is missing. */
export const INTENT_MAX_WORDS = 3;
const wordsIn = (text: string) => intentText(text).split(' ').filter(Boolean).length;

/**
 * What typed text names that is NOT offered for these marks, and what it is
 * missing: the best such intent (one whose act no offered key does), or null.
 * Only for a few words that ARE the act's word, or lead with it (*tidy it up*):
 * an act's word inside a sentence (*a torus in 3d*) is a brief. `offered` is
 * the keys the field holds now.
 */
export function missingFor(text: string, scope: ToolScope, offered: readonly string[]): { id: string; label: string; why: string } | null {
  if (wordsIn(text) > INTENT_MAX_WORDS) return null;
  for (const { intent, score } of intentsMatching(text)) {
    if (score < 2) continue;
    if (offered.some((k) => intent.is(k))) return null; // an act it names is here: the field shows that, not a lack
    const why = intent.missing ? intent.missing(scope) : null;
    if (why) return { id: intent.id, label: intent.label, why };
  }
  return null;
}

/** A board act typed at the field (*export svg*, *find pricing*, *help*), with what follows its word; or null. */
export function hostIntentOf(text: string): { act: HostAct; label: string; rest: string } | null {
  const t = intentText(text);
  if (!t || wordsIn(t) > INTENT_MAX_WORDS) return null;
  let best: { act: HostAct; label: string; rest: string; score: number } | null = null;
  for (const h of HOST_INTENTS) {
    for (const w of h.words) {
      const exact = t === w, lead = t.startsWith(w + ' ');
      if (!exact && !lead) continue;
      const score = exact ? 3 : 2;
      if (!best || score > best.score) best = { act: h.act, label: h.label, rest: lead ? t.slice(w.length + 1) : '', score };
    }
  }
  return best ? { act: best.act, label: best.label, rest: best.rest } : null;
}

/** What an intent is, as one text for a meaning seat to embed: its label and its words (D1). */
export const intentGloss = (i: Intent) => i.label + ' — ' + i.words.join(', ');

// ===== By meaning (PLAN-FIELD-PAR D1): typed words no table holds, matched on this device =====
// John, 2 Oct 2026: *meaning model match while typing, but careful to rate limit so it doesn't get
// spammy.* The surface asks the semantic seat — on the device, nothing sent — once the typing rests,
// only when no word here matched, with these texts embedded once and kept; this is the arithmetic.

/** Every text an intent is known by — its words and its label, lower case, each once: what a meaning seat embeds, once. */
export function intentTexts(): string[] {
  const out: string[] = [];
  for (const i of INTENTS) for (const t of [...i.words, i.label.toLowerCase()]) if (!out.includes(t)) out.push(t);
  return out;
}

/**
 * The intent nearest typed words by meaning: each intent scored by the nearest of its own texts
 * (a word is near a word, not near a list of them), among those `allow` lets in, the best at or
 * above `floor`; null when none is. `vecOf` gives a text's vector from what was embedded.
 */
export function nearestIntent(
  vecOf: (text: string) => ArrayLike<number> | undefined,
  query: ArrayLike<number> | undefined,
  allow: (i: Intent) => boolean = () => true,
  floor = SEMANTIC_FLOOR,
): { intent: Intent; score: number } | null {
  if (!query) return null;
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    if (!allow(intent)) continue;
    let score = -1;
    for (const t of [...intent.words, intent.label.toLowerCase()]) {
      const v = vecOf(t);
      if (v) score = Math.max(score, cosine(query, v));
    }
    if (score >= floor && (!best || score > best.score)) best = { intent, score };
  }
  return best;
}
