// Maths (DIRECTOR-PLAN-W2 M5; V1-PLAN §5 "Maths is a tool"): what the solver
// can do with the marks held, offered as the field offers everything, with no
// model and no wait.
//
//   - *Show the sizes* — a drawing whose numbers fix a side or cannot all
//     hold: the answer in the status line, and the chips beside the figure
//     kept showing (the sizes are derived, never written — the ink stays).
//   - *Check the steps* — a page of steps: how many agree, which do not.
//   - *Print at true size* — a figure whose labels speak a unit goes out
//     tiled onto pages at 100%, a measured test square on each (the export
//     pane has the same, and the SVG at true size).
//
// The numbers were written on these marks, so the first two stand on
// `written` — specific to them, and the act Enter takes with nothing typed.
// Nothing is offered for a board with no numbers on it and no page: a row of
// boxes, a molecule and a line of writing never see it (e2e 49's golden).
// Nothing here writes: every offer is a host act.

import { boardMathsOf, marksOfFigure } from '../maths/board';
import type { FigureMaths } from '../maths/solve';
import { trueSize } from '../maths/truesize';
import { baseOn } from './rank';
import type { Grounds, Offer, Tool } from './tool';

const GROUNDS: Grounds = { on: 'written', confidence: 0.9, why: 'the numbers you wrote here' };

/** A figure the numbers say something about: a side they fix, or a label that cannot hold. */
function saysSomething(fm: FigureMaths): boolean {
  const top = fm.solution.readings[0];
  return !!top && (top.conflicts.length > 0 || top.values.some((v) => v.from === 'derived'));
}

export const MATHS: Tool = {
  id: 'maths',
  name: 'maths',
  describe: () => 'a drawing with numbers written on it is solved figure by figure with no model — the sides they fix, with their formula, and what cannot hold; a page of steps is checked; a figure in a unit goes out at true size',
  offers(scope) {
    const board = boardMathsOf(scope.session);
    if (!board) return [];
    const marks = new Set(scope.marks);
    if (!marks.size) return [];
    const out: Offer[] = [];

    // The figures these marks belong to, and the numbers written on them.
    const held = board.figures.filter((fm) => marksOfFigure(fm).some((id) => marks.has(id)));
    const saying = held.filter(saysSomething);
    if (saying.length) {
      const said = saying.flatMap((fm) => {
        const top = fm.solution.readings[0];
        return [top.sentence, ...top.conflicts.map((c) => c.reason)];
      });
      out.push({
        key: 'maths:sizes',
        label: 'Show the sizes',
        reason: said.join(' — '),
        base: baseOn(GROUNDS),
        tool: 'maths',
        grounds: GROUNDS,
        verbs: ['sizes', 'show the sizes', 'solve', 'solve it', 'maths'],
        data: { act: 'sizes', ids: [...new Set(saying.flatMap(marksOfFigure))], say: said[0] },
      });
    }

    // A page of steps, when the marks held are lines of it.
    const steps = board.sheet.entries.filter((e) => e.kind === 'step' && !e.conflict && (e.ids ?? []).some((id) => marks.has(id)));
    if (steps.length) {
      const off = steps.filter((e) => e.kind === 'step' && (!e.readings[0]?.value || e.readings[0].checks.some((c) => c.status === 'off')));
      const reason = `${steps.length} step${steps.length === 1 ? '' : 's'} — ${off.length ? `${steps.length - off.length} agree, ${off.length} ${off.length === 1 ? 'does' : 'do'} not (${off.map((e) => (e.kind === 'step' ? e.key : '')).join(', ')})` : steps.length === 1 ? 'it agrees' : 'every one agrees'}`;
      out.push({
        key: 'maths:steps',
        label: 'Check the steps',
        reason,
        base: baseOn(GROUNDS),
        tool: 'maths',
        grounds: { ...GROUNDS, why: 'the steps you wrote here' },
        verbs: ['steps', 'check', 'check the steps', 'maths'],
        data: { act: 'steps', ids: [...new Set(steps.flatMap((e) => e.ids ?? []))], say: reason },
      });
    }

    // A figure in a unit can be printed at its real size.
    const inUnit = held.filter((fm) => fm.drawing?.unit && fm.solution.readings.length);
    if (inUnit.length) {
      const ts = trueSize(board);
      if (ts.figures.some((f) => inUnit.some((fm) => fm.figure.ids.some((id) => f.ids.includes(id))))) {
        out.push({
          key: 'maths:print',
          label: 'Print at true size',
          reason: 'the drawing at its real size, tiled onto pages at 100% with a test square on each — a printer scales without saying so',
          base: 0.4,
          tool: 'maths',
          verbs: ['print', 'print at true size', 'true size', 'full size'],
          data: { act: 'print' },
        });
      }
    }
    return out;
  },
  take(offer) {
    const { act } = offer.data as { act: 'sizes' | 'steps' | 'print' };
    if (act === 'print') return { host: 'maths-print' };
    return { host: 'maths-show', detail: offer.data };
  },
};
