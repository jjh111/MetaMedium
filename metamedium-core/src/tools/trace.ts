// Trace into ink: a picture's lines become strokes (PLAN-IPAD-NOTES I1).
//
// A picture used to be traced the moment it came in, whatever it was — a camera photo of a page came out
// as some four thousand strokes, every one a mark on the board. Tracing is an offer now, on a picture held
// alone and made of the asset the surface keeps: a scan or a photographed drawing becomes ink the engine
// reads exactly as a hand's, over the picture, which stays. The act needs the picture's pixels, which only
// a surface has, so taking the offer names the host act (`trace`) and the surface traces inside the
// same stamp — one act, one undo.
//
// TODO (a later unit): trace only what the shape rung reads with confidence, and offer it by default for
// a picture that reads as a line drawing (PLAN-IPAD-NOTES §5.5: an offer, never a default, for a photo).

import type { Tool } from './tool';
import { pictureOf } from '../kinds/picture';

export const TRACE: Tool = {
  id: 'trace',
  name: 'tracing a picture',
  describe: () => 'a picture held alone, traced into ink the engine reads as a hand’s drawing, over the picture, which stays',
  offers(scope) {
    if (scope.marks.length !== 1) return [];
    const id = scope.marks[0];
    if (!scope.state.artifacts.includes(id)) return [];
    const node = scope.state.nodes.get(id);
    const p = node && pictureOf(node);
    if (!p || !p.asset) return [];
    return [{
      key: 'trace',
      label: 'Trace into ink',
      reason: 'the lines of the picture as strokes of ink over it, which the canvas reads as a hand’s own — the picture stays, and one undo takes the ink away',
      base: 0.6,
      tool: 'trace',
      verbs: ['trace', 'trace it', 'ink it'],
      data: { artifact: id, asset: p.asset },
    }];
  },
  take(offer) {
    return { host: 'trace', detail: offer.data };
  },
};
