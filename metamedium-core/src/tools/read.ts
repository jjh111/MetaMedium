// Reading the writing: the one thing sent as pixels (v7 Stage E; v10 D3, F5).
// Writing the shape rung found, unread, is offered to a model that can see —
// a line of it as one image, so the reader has the phrase; the rest one mark
// at a time. With no writing to read, ink can still be read as writing on
// request — the rung called John's h an arc and his o a triangle — but only
// ink the rung could not place for sure (PLAN-USER-SURFACE U1d): offered on a
// box, a line and a circle it was noise. "For sure" is the clean form's own
// rule (`snapReading`: confident and unambiguous), one definition in one home.
// Both ask a model, say so, and are never taken automatically; the asking is
// the host's.
//
// Notes (PLAN-IPAD-NOTES I8): several LINES of handwriting held together are ONE offer, *Read these*, a batch
// — every line drawn from its own strokes on one numbered sheet and asked in one call
// (`participants/readlines.ts`), the lines already read left alone unless asked again; *Read the board* is the
// same for all the writing on the board, typed; and a picture held alone offers *Read the picture* — its text
// set down beside it. The asking, the sheet and the text artifact are the host's; the offers are data.

import { isWord, strokePointsOf } from '../session/nodes';
import { snapReading } from '../session/clean';
import { headApartAt } from '../diagram/heads';
import { pictureOf } from '../kinds/picture';
import { lineIsRead, writingLinesIn } from '../participants/readlines';
import type { Offer, Tool } from './tool';
import { isWritingMark, writingLine } from './board';

export const READ: Tool = {
  id: 'read',
  name: 'reading the writing',
  describe: () => 'writing, or any ink, handed as one image to a model that can see, and what it says held on the marks; many lines in one batch; a picture’s text set down beside it',
  asks: 'model',
  offers(scope) {
    const s = scope.state;
    const sees = scope.host.models.some((m) => m.sees);
    const needs = sees ? '' : ' — needs a model that can see';
    // A picture held alone, its pixels kept: its text, asked of the reader.
    if (scope.marks.length === 1 && s.artifacts.includes(scope.marks[0])) {
      const node = s.nodes.get(scope.marks[0]);
      const pic = node && pictureOf(node);
      if (!pic || !pic.asset) return [];
      return [{
        key: 'read-picture',
        label: 'Read the picture',
        reason: 'the picture, sent to a model that can see, and the text on it set down beside it as a text of its own — the picture stays' + needs,
        base: 0.55,
        tool: 'read',
        asks: 'model',
        verbs: ['read the picture', 'read picture', 'transcribe', 'ocr'],
        data: { artifact: scope.marks[0], asset: pic.asset, name: pic.name },
      }];
    }
    const out: Offer[] = [];
    const lines = writingLinesIn(s, scope.summon.enclosedIds);
    // The whole board's writing, typed: only where the host says there is some beyond the lines held — with
    // every line on the board held, reading the board is reading these (and e2e 49's golden stands).
    const board = scope.host.writing ? scope.host.writing() : null;
    if (board && board.lines > lines.length) {
      out.push({
        key: 'read-board',
        label: 'Read the board',
        reason: 'every line of writing on the board — ' + board.lines + ' line' + (board.lines === 1 ? '' : 's') + (board.unread < board.lines ? ', ' + board.unread + ' not read yet' : '') + ' — each drawn from its own strokes, in a batch' + needs,
        base: 0,
        tool: 'read',
        asks: 'model',
        hidden: true,
        verbs: ['read the board', 'read board', 'read all', 'read everything'],
        data: { scope: 'board', force: board.unread === 0 },
      });
    }
    // Several lines held: ONE batch reads them all (the lines already read are left, unless asked again).
    if (lines.length >= 2) {
      const ids = lines.flatMap((l) => l.ids);
      const unreadLines = lines.filter((l) => !lineIsRead(l, scope.host.isRead));
      if (unreadLines.length) {
        out.unshift({
          key: 'read-lines',
          label: 'Read these',
          reason: lines.length + ' lines of writing' + (unreadLines.length < lines.length ? ', ' + unreadLines.length + ' not read yet' : '') + ', each drawn from its own strokes and read in one batch' + needs,
          base: 0.52,
          tool: 'read',
          asks: 'model',
          verbs: ['read', 'read these', 'read the writing'],
          data: { ids, force: false },
        });
      } else {
        out.unshift({
          key: 'read-lines',
          label: 'Read these again',
          reason: 'all ' + lines.length + ' lines are read — ask the reader again, each drawn from its own strokes' + needs,
          base: 0,
          tool: 'read',
          asks: 'model',
          hidden: true,
          verbs: ['read again', 'read these again', 'reread'],
          data: { ids, force: true },
        });
      }
      return out;
    }
    const unread = scope.summon.enclosedIds.filter((id) => {
      const n = s.nodes.get(id);
      return !!n && isWritingMark(n, s.nodes) && !scope.host.isRead(id);
    });
    if (unread.length) {
      const lineIds = writingLine(scope).ids;
      const line = lineIds.length >= 2 && lineIds.some((id) => unread.includes(id)) ? lineIds : [];
      const single = unread.filter((id) => !line.includes(id));
      const what = (line.length ? 'a line of ' + line.length + ' words' : '') + (line.length && single.length ? ' and ' : '') + (single.length ? single.length + ' mark' + (single.length === 1 ? '' : 's') + ' of writing' : '');
      const offer: Offer = {
        key: 'read',
        label: 'Read the writing',
        reason: what + ', unread' + (sees ? '' : ' — needs a model that can see'),
        base: 0.52,
        tool: 'read',
        asks: 'model',
        verbs: ['read'],
        data: { line, single },
      };
      return [...out, offer];
    }
    const ink = scope.marks.filter((id) => {
      const n = s.nodes.get(id);
      return !!n && !s.artifacts.includes(id) && (!!strokePointsOf(n) || isWord(n)) && !scope.host.isRead(id);
    });
    // Offered only when some of it the rung could not place for sure; the image is still all of it.
    // A head drawn apart from its connector is placed — it is that connector's head, not
    // writing the rung missed (PLAN-FIELD-PAR FP7: two boxes, a line and a chevron at its end
    // were offered *Read as writing*).
    const held = scope.marks.map((id) => s.nodes.get(id)).filter((n): n is NonNullable<typeof n> => !!n);
    const aHead = (n: NonNullable<ReturnType<typeof s.nodes.get>>) => held.some((c) => c !== n && headApartAt(c, n, s.nodes) !== null);
    if (!ink.some((id) => { const n = s.nodes.get(id)!; return isWord(n) || (!snapReading(n, s.nodes).ok && !aHead(n)); })) return out;
    return [...out, {
      key: 'read-any',
      label: 'Read as writing',
      reason: 'the ink as one image, to a model that can see — for writing the shape rung did not spot' + (sees ? '' : ' — needs a model that can see'),
      base: 0.4,
      tool: 'read',
      asks: 'model',
      verbs: ['read', 'read as writing', 'parse', 'writing'],
      data: { line: ink, single: [] },
    }];
  },
  take: (offer) => (offer.key === 'read-lines' || offer.key === 'read-board' || offer.key === 'read-picture' ? { host: offer.key, detail: offer.data } : { host: 'read' }),
};
