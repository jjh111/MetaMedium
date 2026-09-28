// Labelling: a word on your own ink (V1-PLAN L2b, L2e).
//
// A word the hand wrote, once read, or a word it typed at the field, is
// offered two ways side by side — *Name it* (the name tool: one thing, a
// definition) and *Label it* (this tool: the word on each held mark the
// person made, and nothing made). Labelling blesses nothing, makes no
// definition and no file, and never asks a model; it goes on the person's
// own marks only, and says whose marks it will not go on before it is taken.
//
// `labelInk` is the act itself — one `label` event per mark, through the
// session's door, which refuses another hand's mark and says whose it is. It
// is also what the field's `label: word` comes through, so every label a
// hand puts on carries this tool's id.

import type { Session } from '../session/session';
import type { MMNode } from '../session/nodes';
import { authorOf, getRep, isWord, labelOf, transcriptOf, transcriptsOf } from '../session/nodes';
import type { Offer, Tool, ToolScope } from './tool';
import { baseOn } from './rank';
import { isWritingMark, writingLine } from './board';

/** What labelling is, said wherever the two acts stand side by side. */
export const LABELLING_IS = 'it makes nothing: no definition, no name the library learns, no file; undo takes it off';

/** Who made the marks a label will not go on, in a few words: each name once, however many marks. */
export function makersOf(others: readonly string[]): { who: string; count: number } {
  const names: string[] = [];
  for (const n of others || []) if (names.indexOf(n) < 0) names.push(n);
  const who = names.length <= 1 ? names[0] || 'another hand' : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  return { who, count: (others || []).length };
}
/** "the mark fern made", "the 2 marks fern and qwen3 made". The field's reader says it the same way. */
export function theirMarks(others: readonly string[]): string {
  const m = makersOf(others);
  return (m.count === 1 ? 'the mark ' : 'the ' + m.count + ' marks ') + m.who + ' made';
}
/** "fern made this mark", "fern made these 3 marks" — when none of the held marks is yours. */
export function madeThese(others: readonly string[]): string {
  const m = makersOf(others);
  return m.who + (m.count === 1 ? ' made this mark' : ' made these ' + m.count + ' marks');
}

/** The held marks' ink: how many the person made, and who made each of the rest. */
export function whoseInk(
  scope: { session: Pick<ToolScope['session'], 'isMine'>; state: Pick<ToolScope['state'], 'nodes'>; host: Pick<ToolScope['host'], 'nameOf'> },
  ids: readonly string[]
): { mine: number; others: string[] } {
  const out = { mine: 0, others: [] as string[] };
  for (const id of ids) {
    const n = scope.state.nodes.get(id);
    if (!n) continue;
    if (scope.session.isMine(id)) out.mine++;
    else out.others.push(scope.host.nameOf(authorOf(n)));
  }
  return out;
}

/**
 * The Label pill: the word on each of `targets` the person made. Its reason
 * says where the word goes, whose marks it will not go on, and that it makes
 * nothing; its `line` is what the reading line says while it is pointed at.
 * `where` is said after the marks (", held with the writing"), or `itself`
 * for writing that captions itself.
 */
function labelOffer(scope: ToolScope, targets: string[], word: string, o: { key: string; verbs: string[]; where?: string; grounds?: { on: string; confidence: number; why: string } }): Offer {
  const ink = whoseInk(scope, targets);
  const q = '“' + word + '”';
  const onto = o.where === 'itself' ? 'the writing itself, as a caption'
    : (ink.mine === 1 ? 'the mark you made' : 'each of the ' + ink.mine + ' marks you made') + (o.where || '');
  const reason = ink.mine
    ? q + ' on ' + onto + ', in your ink at the board\'s scale' + (ink.others.length ? ' — not on ' + theirMarks(ink.others) + ', which is theirs to label' : '') + ' — ' + LABELLING_IS
    : 'no label here — ' + madeThese(ink.others) + ', and a label is a word on your own ink; taking it says so';
  return {
    key: o.key,
    label: 'Label it ' + q,
    reason,
    base: o.grounds ? baseOn(o.grounds) : 0.4,
    tool: 'label',
    ...(o.grounds ? { grounds: o.grounds } : {}),
    verbs: o.verbs,
    line: ink.mine ? '↵ label it ' + q + ' — on your ink; makes nothing' : '↵ no label — ' + madeThese(ink.others) + '; a label goes on your own ink',
    data: { word, targets },
  };
}

/** A label refused, and why: another hand's ink, or the reason the door gave. */
export interface LabelRefusal { id: string; reason: string; detail: string; maker: string }

/**
 * A word on the person's own ink: one `label` event per mark they made, each
 * through the session's door, which refuses another hand's mark. Every mark
 * is accounted for — labelled, already saying the word, or refused with the
 * reason — never silently skipped. When a word is written the field closes
 * FIRST, so the labels are the last events and undo takes them off, not the
 * close; a mark already saying the word writes nothing, so a second Enter is
 * not a second event. Stamped as this tool's act.
 */
export function labelInk(
  session: Session,
  args: { summonId?: string | null; ids: readonly string[]; word: string; at: number; nameOf?: (participantId: string) => string; offer?: string }
): { done: string[]; saying: string[]; refused: LabelRefusal[] } {
  const text = String(args.word || '').trim();
  const s = session.getState();
  const held = (args.ids || []).filter((id) => { const n = s.nodes.get(id); return !!n && !getRep(n, 'erased'); });
  if (!text || !held.length) return { done: [], saying: [], refused: [] };
  return session.withTool(LABEL.id, () => {
    const mine = (id: string) => session.isMine(id);
    const saying = held.filter((id) => { const l = mine(id) && labelOf(s.nodes.get(id)!); return !!l && l.text === text; });
    const asks = held.filter((id) => !saying.includes(id));
    if (asks.some(mine)) {
      if (args.summonId && s.summon && s.summon.id === args.summonId) session.dismiss(args.summonId, args.at);
      if (session.getState().selection.length) session.deselect(args.at);
    }
    const done: string[] = [], refused: LabelRefusal[] = [];
    for (const id of asks) {
      if (session.label({ nodeId: id, text, at: args.at })) { done.push(id); continue; }
      const st = session.getState().staleResult;
      const node = s.nodes.get(id);
      const maker = node ? (args.nameOf ? args.nameOf(authorOf(node)) : authorOf(node)) : 'another hand';
      refused.push({ id, reason: st && st.what === 'label' ? st.reason : 'refused', detail: st && st.what === 'label' ? st.detail : '', maker });
    }
    return { done, saying, refused };
  }, args.offer ?? 'label-word');
}

const isWritingOrRead = (n: MMNode, nodes: ReadonlyMap<string, MMNode>) => isWritingMark(n, nodes) || isWord(n) || !!transcriptOf(n);

export const LABEL: Tool = {
  id: 'label',
  name: 'labels',
  describe: () => 'a word written or typed goes on your own ink as a label — nothing is made, and another hand\'s ink is left to them',
  offers(scope) {
    const s = scope.state;
    const line = writingLine(scope);
    const writingIds = scope.marks.filter((id) => { const n = s.nodes.get(id); return !!n && !s.artifacts.includes(id) && isWritingOrRead(n, s.nodes); });
    const besides = scope.marks.filter((id) => !writingIds.includes(id)); // held besides the writing
    const words: { word: string; from: string[]; conf: number; source?: string }[] = [];
    if (line.read) words.push({ word: line.text, from: line.ids.filter((id) => scope.marks.includes(id)), conf: line.confidence, source: line.said[0]!.source });
    for (const id of writingIds) {
      if (line.read && line.ids.includes(id)) continue;
      const t = transcriptsOf(s.nodes.get(id)!)[0];
      if (t && t.text && !words.some((w) => w.word === t.text)) words.push({ word: t.text, from: [id], conf: t.confidence, source: t.source });
    }
    const out: Offer[] = [];
    for (const w of words) {
      const targets = besides.length ? besides : w.from.slice(0, 1);
      if (!targets.length) continue;
      out.push(labelOffer(scope, targets, w.word, {
        key: 'label:' + w.word,
        verbs: ['label', 'label it'],
        where: besides.length ? ', held with the writing' : 'itself',
        grounds: { on: 'written', confidence: w.conf, why: 'read from your handwriting by ' + scope.host.nameOf(w.source!) },
      }));
    }
    return out;
  },
  /** A word typed at marks: Label it, beside the name tool's Name it, at the head of what the field affords. */
  completes(scope) {
    if (!scope.word) return [];
    return [{ ...labelOffer(scope, scope.marks.slice(), scope.word, { key: 'label-word', verbs: [] }), place: 'head' as const }];
  },
  take(offer, scope, session, at) {
    const { word, targets } = offer.data as { word: string; targets: string[] };
    return { detail: labelInk(session, { summonId: scope.summon.id, ids: targets, word, at, nameOf: scope.host.nameOf, offer: offer.key }) };
  },
};
