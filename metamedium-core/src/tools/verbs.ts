// Words into verbs, and acting it out (ARCHITECTURE-v8 §14): what a
// definition DOES. Its behaviours a model read or a hand acted out are held
// until a human gives them in their own name — offered here; words written
// beside it that the verb table reads are offered as what it does; and words
// TYPED at it complete to a behaviour the table reads, first in the field,
// with the model offered last for what the table could not.

import { LOCAL_PARTICIPANT, behavioursOf, transcriptOf, wordOf } from '../session/nodes';
import type { Behaviour } from '../behave/verbs';
import { describeBehaviour, parseBehaviour } from '../behave/words';
import type { Offer, Tool, ToolScope } from './tool';
import { baseOn } from './rank';
import { codeRepOf, definitionsIn } from './board';

/** The definitions in the loop that can play: a drawing's tank, or a program — a page, a text, a picture has no clock. */
export function playableDefinitions(scope: ToolScope): string[] {
  return definitionsIn(scope.state, scope.summon.enclosedIds).filter((defId) => {
    const n = scope.state.nodes.get(defId);
    const rep = n && codeRepOf(n);
    return !(rep && rep.data.kind !== 'run' && rep.data.kind !== 'js');
  });
}

const nameOf = (scope: ToolScope, defId: string) => {
  const n = scope.state.nodes.get(defId);
  return (n && wordOf(n)) || defId;
};

export const VERBS: Tool = {
  id: 'verbs',
  name: 'words into verbs',
  describe: () => 'what a definition does, from the words beside it, a behaviour acted out, or words typed at it — read with no model where the table can',
  offers(scope) {
    const out: Offer[] = [];
    for (const defId of playableDefinitions(scope)) {
      const dn = scope.state.nodes.get(defId)!;
      const name = nameOf(scope, defId);
      behavioursOf(dn).forEach((r, i) => {
        const b = r.data as Behaviour & { blessed?: boolean; residual?: number };
        if (b.blessed) return;
        const grounds = { on: 'proposed', confidence: typeof b.residual === 'number' ? 1 - b.residual : 0.7, why: b.source === 'demo' ? 'acted out' : 'read by ' + scope.host.nameOf(r.source!) };
        out.push({
          key: 'use-behaviour:' + defId + ':' + i,
          label: name + ': ' + describeBehaviour(b),
          reason: 'give it in your name',
          base: baseOn(grounds),
          tool: 'verbs',
          grounds,
          data: { nodeId: defId, behaviour: { terms: b.terms, source: b.source, speed: b.speed } },
        });
      });
      for (const lid of scope.summon.enclosedIds) {
        const ln = scope.state.nodes.get(lid);
        const said = ln && transcriptOf(ln);
        if (!said) continue;
        const parsed = parseBehaviour(said);
        if (!parsed.behaviour) continue;
        const grounds = { on: 'written', confidence: 0.9, why: 'read from your handwriting' };
        out.push({
          key: 'behave-said:' + defId + ':' + lid,
          label: name + ': ' + describeBehaviour(parsed.behaviour),
          reason: 'the words beside it, as what it does',
          base: baseOn(grounds),
          tool: 'verbs',
          grounds,
          data: { nodeId: defId, behaviour: parsed.behaviour },
        });
      }
    }
    return out;
  },
  /** Words typed at a definition: what the table reads, first; the model, last, for what it could not. */
  completes(scope) {
    if (scope.text.length <= 3) return [];
    const out: Offer[] = [];
    const parsed = parseBehaviour(scope.text);
    // Any definition in the loop can be told what it does — not only one that plays yet.
    for (const defId of definitionsIn(scope.state, scope.summon.enclosedIds)) {
      const name = nameOf(scope, defId);
      if (parsed.behaviour) {
        const grounds = { on: 'written', confidence: 1, why: parsed.reasoning };
        out.push({
          key: 'behave:' + defId,
          label: name + ': ' + describeBehaviour(parsed.behaviour),
          reason: parsed.unparsed.length ? 'could not read: ' + parsed.unparsed.join(', ') : 'from your words — every ' + name + ' will',
          base: baseOn(grounds),
          tool: 'verbs',
          grounds,
          place: 'first',
          data: { nodeId: defId, behaviour: parsed.behaviour },
        });
      }
      if (parsed.unparsed.length && scope.host.models.length) {
        out.push({
          key: 'behave-model:' + defId,
          label: 'Read it with the model',
          reason: 'for what the table could not: ' + parsed.unparsed.join(', '),
          base: 0.4,
          tool: 'verbs',
          asks: 'model',
          place: 'last',
          data: { nodeId: defId, words: scope.text, model: true },
        });
      }
    }
    return out;
  },
  take(offer, _scope, session, at) {
    const data = offer.data as { nodeId: string; behaviour?: Behaviour; words?: string; model?: boolean };
    if (data.model) return { host: 'behave-model' };
    session.behave({ nodeId: data.nodeId, behaviour: data.behaviour!, participantId: LOCAL_PARTICIPANT, at });
    return {};
  },
};
