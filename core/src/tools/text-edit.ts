// Editing a text (v8 WP-13; v10 F8): a text in the loop is edited — a new
// version of its words, every version kept — and one made from writing can be
// flipped over to show the writing it came from. The editor and the flip are
// the host's (the flip is runtime, never in the log); taking *Edit the text*
// closes the field first, where it always did.

import type { Offer, Tool } from './tool';
import { codeRepOf } from './board';

export const TEXT_EDIT: Tool = {
  id: 'text-edit',
  name: 'editing text',
  describe: () => 'a text is edited in place, every version kept, or flipped over to the writing it came from',
  offers(scope) {
    const out: Offer[] = [];
    const s = scope.state;
    // A text in the loop is edited; one made from writing can be flipped to the ink.
    for (const id of scope.summon.enclosedIds.filter((x) => s.artifacts.includes(x))) {
      const n = s.nodes.get(id);
      const rep = n && codeRepOf(n);
      // A text, and a Mermaid text — a diagram said in words (D2) — are edited the same way.
      if (!rep || (rep.data.kind !== 'text' && rep.data.kind !== 'mermaid')) continue;
      out.push({
        key: 'edit-text:' + id,
        label: 'Edit the text',
        reason: rep.data.kind === 'mermaid' ? 'a new version of the Mermaid; every version kept' : 'a new version of the words; every version kept',
        base: 0.4,
        tool: 'text-edit',
        verbs: ['edit', 'edit the text', 'retype'],
        data: { act: 'edit', id },
      });
      if (rep.data.from === 'writing') {
        const over = scope.host.isFlipped(id);
        out.push({
          key: 'flip:' + id,
          label: over ? 'Show the text' : 'Show the ink',
          reason: over ? 'the text in front again' : 'flip it over: the writing it came from',
          base: 0.4,
          tool: 'text-edit',
          verbs: ['flip', 'ink', 'show the ink', 'show the text'],
          data: { act: 'flip', id },
        });
      }
    }
    return out;
  },
  take(offer, scope, session, at) {
    const { act } = offer.data as { act: 'edit' | 'flip' };
    if (act === 'flip') return { host: 'flip' };
    session.dismiss(scope.summon.id, at);
    session.deselect(at);
    return { host: 'edit-text' };
  },
};
