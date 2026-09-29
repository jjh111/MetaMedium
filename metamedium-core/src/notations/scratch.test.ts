import { it } from 'vitest';
import { createSession } from '../index';
import { drawState, STATE_VARIANTS } from './fixtures/state';
import { readState } from './state';
import { fingerprintOf, resemblances } from '../session/nodes';

it('explore', () => {
  for (const seed of [46, 74, 12]) {
    const v = STATE_VARIANTS.find((x) => x.seed === seed)!;
    const s = createSession();
    const e = drawState(s, v);
    const st = s.getState();
    const r = readState(st)!;
    console.log('seed', seed, 'labels', r.labels.map((l) => `${l.id}:${l.where}:${l.of}`).join(' '), 'unplaced', r.unplaced.join(','), 'roles', JSON.stringify(Object.fromEntries(Object.entries(r.roles).filter(([, v2]) => v2 !== 'label' && v2 !== 'node' && v2 !== 'edge'))));
    for (const t of e.transitions) for (const l of t.label) {
      const n = st.nodes.get(l)!;
      const fp = fingerprintOf(n) as any;
      console.log('  label', t.name, l, 'closed', fp.isClosed, resemblances(n).slice(0, 2).map((x: any) => `${x.to}:${(x.weight ?? 0).toFixed(2)}`).join(' '), 'role', r.roles[l]);
    }
    for (const [k, b] of Object.entries(e.states)) for (const l of b.name) {
      const n = st.nodes.get(l)!;
      const fp = fingerprintOf(n) as any;
      console.log('  name', k, l, 'closed', fp.isClosed, resemblances(n).slice(0, 2).map((x: any) => `${x.to}:${(x.weight ?? 0).toFixed(2)}`).join(' '), 'role', r.roles[l]);
    }
  }
});
