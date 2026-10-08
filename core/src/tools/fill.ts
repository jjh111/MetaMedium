// Fill-ins and the board's settings, as typed offers (MATHS-SPEC §8 Lane A, M16–M18).
//
// A fill-in is offered on the canvas, where the eye already is — a ghost beside the marks held, taken by a tap
// (`Demos/surface/25-ghosts.js`) — and NOT in the field's pills. What the field has is the typed way in, for the
// hand that reaches for the keyboard, and the board's two settings:
//
//   - *Write 5* / *Write all N*: the fill-ins about the marks held, written as text the maths reads back and
//     checks from then on (`writeFillIn` — the one act a tap on a ghost does too). One act, one undo.
//   - *The answer waits* / *Show the answers*: the board's `answers` setting (M18; John, 8 Oct 2026: a board's
//     setting, an event in its log). On a waiting board each answer a fill-in would give stands as a ? in its
//     colour until it is tapped; the reveal on the first tap is the page's and is never logged.
//   - *Colour the maths* / *Colour the maths when pointed at*: the board's `colour` setting (M17) — the colour of
//     a quantity shows on its figure at rest, not only while its marks are held or pointed at.
//
// Every one is `hidden`: reached by a word, never a slot in the row, and never what Enter does with nothing
// typed (Enter keeps the field's likely act, as e2e 64c has it). And every one is offered only where there is maths
// on the board — or, to put a setting back, where the board has it set — so a row of boxes, a molecule and a line
// of writing (e2e 49's golden) are offered exactly what they were. Nothing here asks a model.

import type { Point } from '../types';
import type { Session } from '../session/session';
import { boardMathsOf } from '../maths/board';
import { fillInsOfSession } from '../maths/fill';
import type { FillIn } from '../maths/fill';
import { fillTakeAt } from '../maths/fill-figure';
// The sources this tool offers from register by this import (as the tools register by `builtin.ts`).
import '../maths/fill-builtin';
import type { Offer, Tool } from './tool';

/** The one tool id a tap on a ghost and a typed *Write* are stamped with. */
export const FILL_TOOL = 'fill';

/**
 * Write a fill-in as the hand's own act: a text where it stands (or centred at `centre`, where the surface drew
 * the ghost after nudging it off what it would cover), or the ink it is, in the taker's name. Returns the id of
 * what was made, or null for a fill-in that writes nothing. A caller that wants a stamp and one undo wraps it in
 * `session.withTool('fill', …, fill.key)`; the typed offers below are taken through `takeOffer`, which does.
 */
export function writeFillIn(session: Session, fill: FillIn, at: number, centre?: Point, index = 0): string | null {
  const take = centre ? fillTakeAt(fill, centre) : fill.take;
  if (take.kind === 'text') {
    return session.import({ kind: 'text', path: `text/fill-${at}-${index}.txt`, name: take.text, bounds: take.bounds, code: take.text, at });
  }
  if (take.kind === 'strokes') {
    let first: string | null = null;
    take.strokes.forEach((points, i) => {
      const id = session.addStroke(points, at + i, undefined, 1, { content: true });
      if (first === null) first = id;
    });
    return first;
  }
  return null;
}

type Data = { act: 'setting'; key: string; value: string } | { act: 'write'; keys: string[] };

export const FILL: Tool = {
  id: FILL_TOOL,
  name: 'fill in',
  describe: () =>
    'fill-ins: what the maths implies about a drawing — a side, an angle, a result — stands faint beside it and is written as text by a tap, or by typing write; a board can be set so the answer waits, and so the maths is coloured',
  offers(scope): Offer[] {
    const settings = scope.state.settings;
    const board = boardMathsOf(scope.session);
    const maths = board !== null;
    const out: Offer[] = [];

    // The fill-ins about the marks held, strongest first, that a tap would write.
    if (maths) {
      const held = new Set(scope.summon.enclosedIds);
      const fills = fillInsOfSession(scope.session).filter((f) => f.take.kind === 'text' && f.about.some((id) => held.has(id)));
      if (fills.length) {
        const top = fills[0];
        out.push({
          key: 'fill:write',
          label: `Write ${top.text}`,
          reason: `${top.reason} — written as text beside the drawing, which the maths reads back and checks from then on`,
          base: 0.3,
          tool: FILL_TOOL,
          hidden: true,
          verbs: ['write', 'write it', 'write it in', 'fill', 'fill in', 'fill it in', 'write the answer'],
          data: { act: 'write', keys: [top.key] } satisfies Data,
        });
        if (fills.length > 1) {
          out.push({
            key: 'fill:write-all',
            label: `Write all ${fills.length}`,
            reason: `${fills.map((f) => f.text).join(', ')} — each written as text where it stands, in one act`,
            base: 0.25,
            tool: FILL_TOOL,
            hidden: true,
            verbs: ['write all', 'write them all', 'fill in all', 'fill them all in', 'fill all'],
            data: { act: 'write', keys: fills.map((f) => f.key) } satisfies Data,
          });
        }
      }
    }

    if (settings.answers === 'show' && maths) {
      out.push({
        key: 'fill:answers-wait',
        label: 'The answer waits',
        reason: 'sets this board to teach: each answer stands as a ? in its colour — the first tap shows it, the second writes it',
        base: 0.2,
        tool: FILL_TOOL,
        hidden: true,
        verbs: ['the answer waits', 'answer waits', 'the answers wait', 'hide the answers', 'hide the answer', 'hide answers', 'answers wait', 'teach'],
        data: { act: 'setting', key: 'answers', value: 'wait' } satisfies Data,
      });
    }
    if (settings.answers === 'wait') {
      out.push({
        key: 'fill:answers-show',
        label: 'Show the answers',
        reason: 'this board is set to teach, so each answer stands as a ? until it is tapped — this sets it to show them again',
        base: 0.2,
        tool: FILL_TOOL,
        hidden: true,
        verbs: ['show the answers', 'show the answer', 'show answers', 'reveal the answers', 'reveal answers', 'answers show'],
        data: { act: 'setting', key: 'answers', value: 'show' } satisfies Data,
      });
    }
    if (settings.colour === 'pointed' && maths) {
      out.push({
        key: 'fill:colour-always',
        label: 'Colour the maths',
        reason: 'sets this board to colour the maths: every quantity shows its colour on its figure at rest, not only while its marks are held or pointed at',
        base: 0.2,
        tool: FILL_TOOL,
        hidden: true,
        verbs: ['colour the maths', 'color the maths', 'colour maths', 'color maths', 'colour the figures', 'color the figures'],
        data: { act: 'setting', key: 'colour', value: 'always' } satisfies Data,
      });
    }
    if (settings.colour === 'always') {
      out.push({
        key: 'fill:colour-pointed',
        label: 'Colour the maths when pointed at',
        reason: 'this board colours the maths at rest — this sets it back to showing a quantity’s colour only while its marks are held or pointed at',
        base: 0.2,
        tool: FILL_TOOL,
        hidden: true,
        verbs: ['colour the maths when pointed at', 'color the maths when pointed at', 'stop colouring the maths', 'stop coloring the maths', 'stop colouring', 'stop coloring'],
        data: { act: 'setting', key: 'colour', value: 'pointed' } satisfies Data,
      });
    }
    return out;
  },
  take(offer, _scope, session, at) {
    const d = offer.data as Data;
    if (d.act === 'setting') {
      session.setting(d.key, d.value, at);
      return {};
    }
    const fills = fillInsOfSession(session);
    let made: string | null = null;
    d.keys.forEach((key, i) => {
      const f = fills.find((x) => x.key === key);
      if (!f) return;
      const id = writeFillIn(session, f, at + i, undefined, i);
      if (made === null) made = id;
    });
    return { made };
  },
};
