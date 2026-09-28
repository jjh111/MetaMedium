// Text from writing: writing read becomes text, and text folds back from ink
// (v8 WP-13; v10 F8, F12). Editing a text, and turning it over to its ink, is
// the `text-edit` tool's.
//
// What it offers:
//   - *Fold “…” into the text* — written words beside a text made from
//     writing go into it: in place of a struck word's gap, else after the
//     nearest word. It stands with the readings (`lead`): an act as
//     particular to these marks as reading them is.
//   - *Make it text “…”* — a read line, or a read word, as a file of words
//     where the writing is (writing alone, taken, is text fitted to the ink).
//
// The acts are the host's: where a text stands and where its words fall on
// the board are the surface's. The tool decides what is offered; taking an
// offer closes the field where it closed before and names the act (`text`,
// `fold`) the host performs.

import { boundsOf, transcriptOf } from '../session/nodes';
import type { Offer, Tool } from './tool';
import { baseOn } from './rank';
import { allWriting, unionOf, writingLine } from './board';

export const TEXT: Tool = {
  id: 'text',
  name: 'text',
  describe: () => 'writing read becomes text where it is, and new writing folds into a text in place of a struck word',
  offers(scope) {
    const out: Offer[] = [];
    const s = scope.state;
    const line = writingLine(scope);
    const writingOnly = allWriting(scope);

    // Written words on or beside a text made from writing fold into it.
    const saidAll = writingOnly ? scope.marks.map((id) => transcriptOf(s.nodes.get(id)!)).filter(Boolean) : [];
    const folding = line.read ? line.text : saidAll.length === scope.marks.length && scope.marks.length ? saidAll.join(' ') : '';
    const box = unionOf(scope.marks.map((id) => boundsOf(s.nodes.get(id)!)).filter((b): b is NonNullable<typeof b> => !!b));
    const nearText = folding && box ? scope.host.textNear(box) : null;
    if (nearText) {
      const grounds = { on: 'written', confidence: 0.95, why: 'the text it sits beside' };
      out.push({
        key: 'fold:' + nearText,
        label: 'Fold “' + folding + '” into the text',
        reason: 'in place of the struck word, or after the nearest one; the writing leaves, the text keeps every version',
        base: baseOn(grounds),
        tool: 'text',
        grounds,
        lead: true,
        name: folding,
        data: { act: 'fold', text: nearText, words: folding, ids: scope.marks.slice() },
      });
    }

    // A read line, as text: fitted to the ink when the line is all there is.
    if (line.read) {
      out.push({
        key: 'line-text:' + line.ids.join(','),
        label: 'Make it text “' + line.text + '”',
        reason: writingOnly ? 'text where the line is, fitted to the ink; flip it to see the writing' : 'a file of words where the line is; the ink stays',
        base: 0.4,
        tool: 'text',
        verbs: ['text'],
        data: { act: writingOnly ? 'writing' : 'line', text: line.text, ids: line.ids.slice() },
      });
    }
    // Each read word off the line, as text.
    for (const id of scope.summon.enclosedIds) {
      const n = s.nodes.get(id);
      const said = n && !s.artifacts.includes(id) && !(line.read && line.ids.includes(id)) && transcriptOf(n);
      if (!said) continue;
      out.push({
        key: 'word-text:' + id,
        label: 'Make it text “' + said + '”',
        reason: 'a file of words where the writing is; the ink stays',
        base: 0.4,
        tool: 'text',
        verbs: ['text'],
        data: { act: 'word', text: said, ids: [id] },
      });
    }
    return out;
  },
  take(offer, scope, session, at) {
    const data = offer.data as { act: string };
    const sum = scope.summon;
    switch (data.act) {
      // The field closes first, where it always did; the host does the rest.
      case 'fold':
        session.dismiss(sum.id, at);
        session.deselect(at);
        return { host: 'fold' };
      case 'line':
      case 'word':
        session.dismiss(sum.id, at);
        return { host: 'text' };
      case 'writing':
        return { host: 'text' };
    }
    return {};
  },
};
