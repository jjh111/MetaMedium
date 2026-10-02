// Trace into ink (PLAN-IPAD-NOTES I1): a picture held alone is offered to be traced — the shape
// rung's strokes drawn over it, which only a surface with pixels can do, so taking the offer names
// the host act. Tracing used to happen on every import; now it is an offer, never a default.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { rectStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, getTool, registeredTools } from './registry';
import { rankOffers } from './rank';
import { BUILTIN_TOOLS } from './builtin';
import { TRACE } from './trace';

const HASH = 'sha256:' + 'cd'.repeat(32);
const BOX = { minX: 100, minY: 100, maxX: 500, maxY: 400 };
const hold = (s: Session, ids: string[], at = 900_000) => { s.summonMarks(ids, at); };
const offered = (s: Session) => rankOffers(offersFor(toolScope(s))).map((o) => o.key);

describe('the trace tool', () => {
  it('is a built-in, registered last of the tools that stood before it', () => {
    // After Which is it?, and before whatever is appended after it (a later tool is one line at the end).
    const at = BUILTIN_TOOLS.indexOf(TRACE);
    expect(BUILTIN_TOOLS[at - 1].id).toBe('which');
    expect(getTool('trace')).toBe(TRACE);
    expect(registeredTools().map((t) => t.id).indexOf('trace')).toBe(at);
    expect(TRACE.describe().length).toBeGreaterThan(20);
  });

  it('a picture held alone is offered Trace into ink, asking no model, and taking it names the host act with the picture', () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/a.jpg', name: 'a.jpg', bounds: BOX, asset: HASH, mime: 'image/jpeg', w: 1000, h: 750, at: 1000 })!;
    hold(s, [id]);
    expect(offered(s)).toContain('trace');
    const scope = toolScope(s);
    const o = rankOffers(offersFor(scope)).find((x) => x.key === 'trace')!;
    expect(o).toMatchObject({ label: 'Trace into ink', tool: 'trace' });
    expect(o.asks).toBeUndefined();
    expect(o.reason).toMatch(/ink/);
    const taken = takeOffer(o, scope, s, 2000);
    expect(taken.host).toBe('trace');
    expect(taken.detail).toMatchObject({ artifact: id, asset: HASH });
  });

  it('is offered for nothing else: ink, a text, a picture with no asset, two pictures', () => {
    const ink = createSession();
    hold(ink, [ink.addStroke(rectStroke(100, 100, 200, 100), 1000, undefined, 1)]);
    expect(offered(ink)).not.toContain('trace');
    const txt = createSession();
    hold(txt, [txt.import({ kind: 'md', path: 'a.md', bounds: BOX, code: '# hi', at: 1 })!]);
    expect(offered(txt)).not.toContain('trace');
    const old = createSession();
    hold(old, [old.import({ kind: 'png', path: 'imports/old.png', bounds: BOX, code: '', at: 1 })!]);
    expect(offered(old)).not.toContain('trace');
    const two = createSession();
    const a = two.import({ kind: 'jpg', path: 'imports/a.jpg', bounds: BOX, asset: HASH, mime: 'image/jpeg', w: 1, h: 1, at: 1 })!;
    const b = two.import({ kind: 'jpg', path: 'imports/b.jpg', bounds: { minX: 600, minY: 100, maxX: 900, maxY: 400 }, asset: 'sha256:' + 'ef'.repeat(32), mime: 'image/jpeg', w: 1, h: 1, at: 2 })!;
    hold(two, [a, b]);
    expect(offered(two)).not.toContain('trace');
  });
});
