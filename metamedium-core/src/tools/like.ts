// *Notes like this* (PLAN-IPAD-NOTES I9, the semantic seat's job in the field): held marks or a held region that
// carry words are offered the others nearest in meaning, across every board, listed in Find's pane.
//
// Three rules keep it from touching what the field already does:
//   - **Only with the seat held.** Offered only when the host says a semantic seat is seated
//     (`ToolHost.semantic`), so on a device with nobody in it the field offers exactly what it did — e2e 49's
//     golden record of the field's offers is unchanged by construction.
//   - **Typed, never a slot.** The offer is `hidden`: reached by a word (*notes like this*, *like*, *similar*),
//     never a pill in the row and never what Enter does with nothing typed.
//   - **Only a deliberate act asks.** It carries the model's dot; embedding happens when the offer is taken, and
//     never on draw, on hold or on opening the field. What it asks runs on this device and sends nothing anywhere.
//
// The tool decides whether the marks have words (`wordsOfMarks`, from the board's state) and writes nothing; the
// asking, the list and the pane are the host's (`Taken.host`).
import { wordsOfMarks } from '../semantic/words';
import type { Offer, Tool } from './tool';

export const LIKE: Tool = {
  id: 'like',
  name: 'notes like this',
  describe: () => 'list the notes nearest in meaning to the marks held, across every board, by the small model that runs on this device — when one is seated',
  asks: 'model',
  offers(scope): Offer[] {
    const seat = scope.host.semantic;
    if (!seat) return [];
    const held = scope.summon.enclosedIds ?? [];
    if (!held.length) return [];
    const text = wordsOfMarks(scope.state, held);
    if (!text) return [];
    return [{
      key: 'like',
      label: 'Notes like this',
      reason: `lists the notes nearest in meaning to “${text.length > 60 ? text.slice(0, 60) + '…' : text}” across every board, by ${seat.name} on this device — nothing is sent anywhere`,
      base: 0.5,
      tool: 'like',
      asks: 'model',
      hidden: true,
      verbs: ['like', 'notes like this', 'notes like', 'similar', 'similar notes', 'near'],
      data: { text, ids: held.slice() },
    }];
  },
  take: () => ({ host: 'like' }),
};
