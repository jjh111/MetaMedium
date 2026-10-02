// UI-3: the panel is a description card, and it is down until this hand says
// otherwise. Two rules are worth pinning, and both are pure: what the device
// preference defaults to, and what the status line says in the panel's place.
//
// The toggle itself is DOM — a class on the body and a label on a button — and
// it is tested through the real UI in `e2e.js`, where a real click really
// hides the real panel. Asserting on a stub of it here would only test the
// stub. What is here is what a wrong answer would be silent about.

import { describe, expect, it } from 'vitest';
import { panelShown, selectionLine, setPanelShown, type PrefStore } from './panel';

/** A device's store, in the shape the preference reads. */
function store(initial: Record<string, string> = {}): PrefStore & { seen: Record<string, string> } {
  const seen = { ...initial };
  return {
    seen,
    getItem: (k) => (k in seen ? seen[k] : null),
    setItem: (k, v) => {
      seen[k] = v;
    },
  };
}

describe('the panel is hidden by default', () => {
  it('is down on a device that has never been asked', () => {
    expect(panelShown(store())).toBe(false);
  });

  it('is down at every width — there is no width in the rule at all', () => {
    // The canvas defaults by `innerWidth > 820`; the shard does not, because
    // the field carries the acts and the status line carries the selection.
    // Nothing here can read a viewport, which is the point.
    expect(panelShown(store())).toBe(false);
  });

  it('is down when there is no store to remember with', () => {
    // A private window, or blocked site data. The toggle still works for the
    // session; it just has nowhere to write.
    expect(panelShown(null)).toBe(false);
  });

  it('is down when the store throws on read', () => {
    const angry: PrefStore = {
      getItem() {
        throw new Error('site data is blocked');
      },
      setItem() {
        throw new Error('site data is blocked');
      },
    };
    expect(panelShown(angry)).toBe(false);
    expect(() => setPanelShown(true, angry)).not.toThrow();
  });

  it('is down for a value some older build left behind', () => {
    // Only the word this toggle writes turns it on. `true`, `open`, `1` and
    // the canvas's own `open`/`closed` pair all read as *not shown*, so a
    // preference from anywhere else can never open it by accident.
    for (const stale of ['true', 'open', '1', 'yes', 'closed', '']) {
      expect(panelShown(store({ 'shard.panel': stale }))).toBe(false);
    }
  });
});

describe('and it is remembered per device', () => {
  it('stays up once this hand has put it up', () => {
    const s = store();
    setPanelShown(true, s);
    expect(panelShown(s)).toBe(true);
  });

  it('goes back down, and stays down', () => {
    const s = store();
    setPanelShown(true, s);
    setPanelShown(false, s);
    expect(panelShown(s)).toBe(false);
  });

  it('writes one key, and it is the shard’s own', () => {
    const s = store();
    setPanelShown(true, s);
    expect(Object.keys(s.seen)).toEqual(['shard.panel']);
  });

  it('leaves the evidence disclosure alone — they are two preferences', () => {
    const s = store({ 'shard.evidence': 'open' });
    setPanelShown(false, s);
    expect(s.seen['shard.evidence']).toBe('open');
  });
});

describe('the status line carries the selection while the panel is down', () => {
  const next = (over: Partial<{ label: string; why: string; enabled: boolean; asks: boolean }> = {}) => ({
    label: 'Extrude',
    why: 'a line off its edge says how far',
    enabled: true,
    ...over,
  });

  it('says the name and what Enter will do', () => {
    expect(selectionLine('castle', next())).toBe('castle · ↵ Extrude');
  });

  it('says a blocked offer by name, and that it is not yet', () => {
    // The same rule the panel's *next* row follows: *nothing to do here* is
    // the least useful thing to say to a hand holding its first profile.
    expect(selectionLine('rectangle 0.86', next({ enabled: false, label: 'Extrude' }))).toBe(
      'rectangle 0.86 · Extrude — not yet'
    );
  });

  it('says when the act would ask a model', () => {
    expect(selectionLine('castle', next({ label: 'Regen', asks: true }))).toBe('castle · ↵ Regen · asks a model');
  });

  it('is the name alone when nothing is afforded', () => {
    expect(selectionLine('castle', null)).toBe('castle');
  });

  it('is nothing at all when nothing is selected', () => {
    // Nothing selected means the board's own standing line stands — the
    // ladder of the next move — and this must not overwrite it.
    expect(selectionLine(null, next())).toBe(null);
    expect(selectionLine(null, null)).toBe(null);
  });
});
