// What a board says, as words with a place (PLAN-IPAD-NOTES I6): the labels on its marks, the names of what was
// made, typed texts, a figure's `<text>`, Mermaid, a picture's name, the words of a page, what a reader read from
// writing — each an entry that keeps the id of the mark or artifact that holds it, what it stands on in a few plain
// words, and the box it stands in, so a hit can open the board AT that place.
//
// DERIVED, never in a log: a pure function of a session's state, read again when a board changes. Nothing is
// changed, so it runs as well on a board replayed in a scratch session as on the one on screen.
//
// A SOURCE is a hook for what core does not know yet (regions, I5's): `registerSearchSource` adds a function from
// the state to entries, found with the rest, and its id is part of the index's key (plan.ts). A source that
// throws is left out, so a faulty one can never take Find down.
import type { Bounds } from '../types';
import type { SessionState } from '../session/session';
import { type MMNode, boundsOf, getRep, labelOf, transcriptsOf, topInterpretation, isWord, wordOf } from '../session/nodes';
import { pictureOf } from '../kinds/picture';
import { regionsOfBoard } from '../session/board-regions';
import { decodeEntities } from './entities';

export type SearchKind = 'label' | 'name' | 'text' | 'transcript' | 'figure' | 'mermaid' | 'picture' | 'page' | 'region' | 'board';

/** One thing a board says: where it is held (`id`), the words, what it stands on said plainly, and its box. */
export interface SearchEntry {
  /** The mark or artifact that holds the words. `null` for a board's own name. */
  id: string | null;
  kind: SearchKind;
  text: string;
  /** In the person's words: *label on a box*, *typed text*, *picture name*, *read writing*. */
  what: string;
  box?: Bounds;
}

export interface SearchSource { id: string; entries(state: SessionState): SearchEntry[] }

const sources = new Map<string, SearchSource>();
/** Add a source of entries (regions, once there are some). The same id replaces the one before. */
export function registerSearchSource(src: SearchSource): void { sources.set(src.id, src); }
export function unregisterSearchSource(id: string): void { sources.delete(id); }
/** The ids of the sources registered, sorted: part of what an index is kept under. */
export function sourceIds(): string[] { return [...sources.keys()].sort(); }

/** Most entries one board gives, and about how many characters one holds: a board is a place to look, not a corpus. */
export const MAX_ENTRIES = 800;
export const CHUNK_CHARS = 600;
const MAX_CHUNKS = 40;
const MAX_SVG_TEXTS = 60;

const NOUN: Record<string, string> = {
  rectangle: 'a box', circle: 'a circle', line: 'a line', arrow: 'an arrow', triangle: 'a triangle', arc: 'a curve', dot: 'a dot', text: 'writing',
};
const ARTIFACT_NOUN: Record<string, string> = {
  text: 'a text', md: 'a text', svg: 'a figure', mermaid: 'a Mermaid diagram', html: 'a page', png: 'a picture', jpg: 'a picture', webp: 'a picture',
  run: 'a program', js: 'a script', json: 'data', control: 'a control',
};

/** What a mark is, in a few words: what the shape rung reads it as (or a name it was given). */
function nounOf(node: MMNode): string {
  if (isWord(node)) return 'a word';
  const top = topInterpretation(node);
  if (!top) return 'a mark';
  const t = top.replace(/^type:/, '');
  return NOUN[t] || 'a ' + t;
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The words of a page: no scripts, no styles, no comments, no tags; entities read. */
export function pageWords(html: string): string {
  return squash(decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')));
}
/** A figure's words in the order the file has them: its `<text>`, `<title>` and `<desc>`, tags inside taken out. */
export function svgWords(svg: string): string[] {
  const out: string[] = [];
  const re = /<(text|title|desc)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) && out.length < MAX_SVG_TEXTS) {
    const t = squash(decodeEntities(m[2].replace(/<[^>]*>/g, '')));
    if (t) out.push(t);
  }
  return out;
}
/** A long text as pieces of about `size` characters, cut where there is a line or a space. */
export function chunksOf(text: string, size = CHUNK_CHARS): string[] {
  const out: string[] = [];
  const t = text.replace(/\r\n?/g, '\n').trim();
  let i = 0;
  while (i < t.length && out.length < MAX_CHUNKS) {
    let end = Math.min(t.length, i + size);
    if (end < t.length) {
      const cut = Math.max(t.lastIndexOf('\n', end), t.lastIndexOf(' ', end));
      if (cut > i + size / 2) end = cut;
    }
    const piece = squash(t.slice(i, end));
    if (piece) out.push(piece);
    i = end;
  }
  return out;
}

/** The `code` rep an artifact holds now (its newest version). */
function codeOf(node: MMNode): { code: string; kind?: string } | null {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    if (node.reps[i].modality === 'code') {
      const d = node.reps[i].data as { code?: unknown; kind?: unknown };
      return { code: typeof d.code === 'string' ? d.code : '', kind: typeof d.kind === 'string' ? d.kind : undefined };
    }
  }
  return null;
}

/** What one artifact says: its name, then what its kind holds. */
function artifactEntries(node: MMNode, box: Bounds | undefined, out: SearchEntry[]): void {
  const code = codeOf(node);
  const kind = code && code.kind;
  const name = wordOf(node);
  const noun = (kind && ARTIFACT_NOUN[kind]) || 'a thing';
  const pic = pictureOf(node);
  const push = (k: SearchKind, text: string, what: string) => { if (text) out.push({ id: node.id, kind: k, text, what, ...(box ? { box } : {}) }); };
  // A default name (`text 3`) says nothing; a file's name, or one a person gave, does.
  if (pic) push('picture', pic.name, 'picture name');
  else if (name && !/^text \d+$/.test(name)) push('name', name, 'name of ' + noun);
  if (!code || pic) return;
  if (kind === 'text' || kind === 'md') for (const c of chunksOf(code.code)) push('text', c, 'typed text');
  else if (kind === 'svg') for (const t of svgWords(code.code)) push('figure', t, 'text in a figure');
  else if (kind === 'mermaid') for (const c of chunksOf(code.code)) push('mermaid', c, 'Mermaid text');
  else if (kind === 'html') for (const c of chunksOf(pageWords(code.code))) push('page', c, 'words on a page');
}

/**
 * Everything a board says, in the board's own order: the labels on its marks and what each stands on, the names
 * and words of what was made, what was read from writing — and what any registered source adds. Marks erased are
 * not here; a label taken off (an empty one) is not either; a mark relabelled says its newest word.
 */
export function searchEntriesOf(state: SessionState, only?: ReadonlySet<string>): SearchEntry[] {
  const out: SearchEntry[] = [];
  const artifacts = new Set(state.artifacts);
  const answers = new Set(state.explanations);
  // `only` (I9: the words of the marks held): read just those, found by id, in the order given — never a pass over the board.
  const nodes: Iterable<MMNode> = only ? [...only].map((id) => state.nodes.get(id)).filter((n): n is MMNode => !!n) : state.nodes.values();
  for (const node of nodes) {
    if (out.length >= MAX_ENTRIES) break;
    if (answers.has(node.id) || getRep(node, 'participant') || getRep(node, 'erased')) continue;
    const box = boundsOf(node);
    const isArtifact = artifacts.has(node.id);
    if (isArtifact) artifactEntries(node, box, out);
    const lab = labelOf(node);
    if (lab) out.push({ id: node.id, kind: 'label', text: lab.text, what: 'label on ' + (isArtifact ? (ARTIFACT_NOUN[codeOf(node)?.kind || ''] || 'a thing') : nounOf(node)), ...(box ? { box } : {}) });
    if (!isArtifact) {
      const seen = new Set<string>();
      for (const t of transcriptsOf(node)) {
        if (seen.has(t.text)) continue;
        seen.add(t.text);
        out.push({ id: node.id, kind: 'transcript', text: t.text, what: 'read writing', ...(box ? { box } : {}) });
      }
    }
  }
  // A region's name (I5): the place, at its own box. Not in the loop above — a region is no content and has no ink.
  for (const r of regionsOfBoard(state)) {
    if (out.length >= MAX_ENTRIES) break;
    if (only && !only.has(r.id)) continue;
    out.push({ id: r.id, kind: 'region', text: r.name, what: 'a region', box: r.bounds });
  }
  for (const src of only ? [] : sources.values()) {
    if (out.length >= MAX_ENTRIES) break;
    try {
      for (const e of src.entries(state) || []) {
        if (e && typeof e.text === 'string' && e.text && typeof e.kind === 'string' && typeof e.what === 'string') out.push(e);
      }
    } catch (err) { /* a source that fails is left out; Find stands without it */ }
  }
  return out.slice(0, MAX_ENTRIES);
}
