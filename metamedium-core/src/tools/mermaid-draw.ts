// Draw it: a Mermaid text stood as marks (V1-PLAN §3, D3's surface).
//
// A held `mermaid` artifact whose text a reader can read — `readMermaid`'s
// `notation` is set — is offered *Draw it*: the diagram as ink the engine reads
// exactly as a hand's, so it reads back as the same notation (`drawMermaid`,
// the round trip D3 tests). The offer is the tool's; the act needs what only a
// surface knows — the zoom the hand works at, and where the board is free —
// so taking it names the host act (`mermaid-draw`) and the surface calls
// `drawMermaid` inside the same stamp, one act. What is not read, or cannot be
// drawn as written, is said by the surface, never thrown.
//
// It is offered for one artifact of the mermaid kind held alone, and for
// nothing else: a text file, an unknown diagram and a drawing are not it.

import { readMermaid } from '../notations/mermaid-in';
import { notationById } from '../notations/notation';
import '../notations/uml-class-mermaid';
import '../notations/sequence-mermaid';
import type { Tool } from './tool';
import { codeRepOf } from './board';

/** What a notation's things are called in a count: nodes, unless the notation has a better word. */
const THINGS: Record<string, [string, string]> = { sequence: ['participant', 'participants'], 'uml-class': ['class', 'classes'] };
const LINKS: Record<string, [string, string]> = { sequence: ['message', 'messages'] };
const counted = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

/** *a flowchart*, *an X*, *a UML class diagram*: a name with its article, an acronym keeping its capitals. */
function withArticle(name: string): string {
  const acronym = /^[A-Z]{2,}\b/.test(name);
  const said = acronym ? name : name.toLowerCase();
  return `${!acronym && /^[aeio]/.test(said) ? 'an' : 'a'} ${said}`;
}

export const MERMAID_DRAW: Tool = {
  id: 'mermaid-draw',
  name: 'drawing from Mermaid',
  describe: () => 'a Mermaid text, read as a flowchart, a class diagram or a sequence diagram, drawn as marks that read back as the same diagram; the text stays',
  offers(scope) {
    if (scope.marks.length !== 1) return [];
    const id = scope.marks[0];
    if (!scope.state.artifacts.includes(id)) return [];
    const node = scope.state.nodes.get(id);
    const rep = node && codeRepOf(node);
    if (!rep || rep.data.kind !== 'mermaid' || !rep.data.code) return [];
    const read = readMermaid(rep.data.code);
    if (!read.notation) return [];
    const name = notationById(read.notation)?.name ?? read.notation;
    const what = `${counted(read.nodes.length, THINGS[read.notation] ?? ['node', 'nodes'])} and ${counted(read.links.length, LINKS[read.notation] ?? ['link', 'links'])} read as ${withArticle(name)}`;
    return [{
      key: 'mermaid-draw',
      label: 'Draw it',
      reason: `${what} — drawn as marks the canvas reads back as the same diagram; the text stays`,
      base: 0.95,
      tool: 'mermaid-draw',
      verbs: ['draw it', 'ink it'],
      data: { artifact: id, notation: read.notation },
    }];
  },
  take(offer) {
    return { host: 'mermaid-draw', detail: offer.data };
  },
};
