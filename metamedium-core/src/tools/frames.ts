// Frames: artifacts wired by reference (ARCHITECTURE-v8 §15; WP-10). The
// field offers to frame the artifacts a loop holds — one connection per
// input port, best first, by type and by name — and to frame them again like
// a frame built once, found by the name written beside them or by
// resemblance. Nothing is copied or moved: the frame is a new artifact
// holding their ids and the connections between their ports.

import type { MMNode } from '../session/nodes';
import { frameOfNode, isFrame, transcriptOf, wordOf, blessedBehaviourOf } from '../session/nodes';
import { connectionsFor, interfacesOf } from '../frames/frame';
import type { Connection } from '../frames/frame';
import type { SessionState } from '../session/session';
import type { Offer, Tool } from './tool';
import { baseOn } from './rank';
import { artifactsIn, codeRepOf } from './board';

type Wiring = { from: { id: string; port: string }; to: { id: string; port: string }; reasoning?: string };

/** One connection per input port, best first, so a value feeds each place it fits without fighting. */
export function bestWiring(ids: readonly string[], nodes: ReadonlyMap<string, MMNode>): Wiring[] {
  const taken = new Set<string>();
  const out: Wiring[] = [];
  for (const c of connectionsFor(ids, nodes)) {
    const key = c.to.id + '|' + c.to.port;
    if (taken.has(key)) continue;
    taken.add(key);
    out.push({ from: c.from, to: c.to, reasoning: c.reasoning });
  }
  return out;
}

/**
 * The frames this loop could be again: by name, when writing in the loop
 * says a frame's name; by resemblance, when a frame's members are the same
 * kinds of thing.
 */
export function frameTemplatesFor(s: Pick<SessionState, 'nodes' | 'artifacts'>, ids: readonly string[]): { frame: MMNode; how: 'name' | 'resemblance'; why: string }[] {
  const members = artifactsIn(s, ids);
  if (!members.length) return [];
  const kindsOf = (list: readonly string[]) => list.map((id) => {
    const n = s.nodes.get(id);
    const r = n && codeRepOf(n);
    return (r && r.data.kind) || (n && blessedBehaviourOf(n) ? 'behaviour' : 'ink');
  }).sort().join(',');
  const mine = kindsOf(members);
  const said = ids.map((id) => { const n = s.nodes.get(id); return n && transcriptOf(n); }).filter((w): w is string => !!w).map((w) => w.toLowerCase().trim());
  const out: { frame: MMNode; how: 'name' | 'resemblance'; why: string }[] = [];
  for (const aid of s.artifacts) {
    const n = s.nodes.get(aid);
    if (!n || !isFrame(n) || members.includes(aid)) continue;
    const name = (wordOf(n) || '').toLowerCase();
    if (name && said.includes(name)) { out.push({ frame: n, how: 'name', why: 'you wrote “' + name + '” beside them' }); continue; }
    if (kindsOf(frameOfNode(n)!.members) === mine) out.push({ frame: n, how: 'resemblance', why: 'the same kinds of thing, wired the same way' });
  }
  return out;
}

export const FRAMES: Tool = {
  id: 'frames',
  name: 'wiring',
  describe: () => 'artifacts wired into a frame by their ports — connections offered by type and ranked by name — and a frame built once, offered again',
  offers(scope) {
    const s = scope.state;
    const arts = artifactsIn(s, scope.summon.enclosedIds);
    if (!arts.length) return [];
    const out: Offer[] = [];
    const wiring = bestWiring(arts, s.nodes);
    if (arts.length >= 2 || wiring.length) {
      out.push({
        key: 'frame',
        label: 'Frame these',
        reason: wiring.length
          ? wiring.length + ' connection' + (wiring.length === 1 ? '' : 's') + ': ' + wiring.map((c) => c.from.port + ' → ' + c.to.port).join(', ')
          : arts.length + ' artifacts, nothing to wire yet',
        base: 0.5,
        tool: 'frames',
        verbs: ['frame', 'wire'],
        data: { act: 'frame' },
      });
    }
    for (const tpl of frameTemplatesFor(s, scope.summon.enclosedIds)) {
      const name = wordOf(tpl.frame) || tpl.frame.id;
      const grounds = tpl.how === 'name'
        ? { on: 'written', confidence: 0.95, why: tpl.why }
        : { on: 'known', confidence: 0.8, why: tpl.why };
      out.push({
        key: 'frame-like:' + tpl.frame.id,
        label: 'Frame these like “' + name + '”',
        reason: 'the same wiring, on these',
        base: baseOn(grounds),
        tool: 'frames',
        grounds,
        data: { act: 'like', template: tpl.frame.id },
      });
    }
    return out;
  },
  take(offer, scope, session, at) {
    const s = session.getState();
    const members = artifactsIn(s, scope.summon.enclosedIds);
    const data = offer.data as { act: 'frame' | 'like'; template?: string };
    if (data.act === 'frame') {
      if (!members.length) return { made: null };
      // A name typed in the field names the frame: `frame: rig`, or just `rig`.
      const name = scope.text.replace(/^frame\s*:?\s*/i, '');
      const connections = bestWiring(members, s.nodes);
      session.dismiss(scope.summon.id, at);
      const made = session.frame({ ids: members, name: name || 'frame', connections, at: at + 1 });
      return { made, detail: { members: members.length } };
    }
    const template = s.nodes.get(data.template!);
    if (!template) return { made: null };
    const tf = frameOfNode(template)!;
    const ifaces = new Map(members.map((id) => [id, interfacesOf(s.nodes.get(id)!, s.nodes)]));
    const connections: Connection[] = [];
    for (const c of tf.connections) {
      const src = members.find((id) => ifaces.get(id)!.offers.some((o) => o.id === c.from.port));
      const dst = members.find((id) => id !== src && ifaces.get(id)!.accepts.some((a) => a.id === c.to.port));
      if (src && dst) connections.push({ from: { id: src, port: c.from.port }, to: { id: dst, port: c.to.port }, reasoning: 'as in ' + (wordOf(template) || template.id) });
    }
    session.dismiss(scope.summon.id, at);
    return { made: session.frame({ ids: members, name: wordOf(template) || 'frame', connections, at: at + 1 }) };
  },
};
