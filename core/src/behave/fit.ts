// Acting it out: a demonstrated path fitted onto the verb basis.
//
// The verb table is a BASIS. A path the hand drags a body along, sampled
// against where the named things were at each moment, gives an acceleration
// at each step; the weights that best reproduce those accelerations from the
// basis are a least-squares fit, and the fit IS the behaviour — with each
// term's share as its reasoning, and the residual, the part no verb
// explains, as "what is missing". Biased hard toward the FEWEST terms that
// explain the demonstration (v8 §21.1): an L1 penalty, swept, and the
// sparsest fit within 10% of the best residual wins. Rules, not keyframes.
//
// Wander draws on randomness and cannot be fitted; whatever it would have
// explained shows up in the residual.

import type { Body, Term, Verb, World } from './verbs';
import { TARGETED, force } from './verbs';

export interface Sample { x: number; y: number; t: number }

export interface FitResult {
  terms: Term[];
  /** Residual acceleration as a fraction of the demonstration's: 0 is a perfect fit, 1 explains nothing. */
  residual: number;
  /** Each fitted term's share of what was explained, by key `verb` or `verb:target`. */
  explained: Record<string, number>;
  reasoning: string;
}

const key = (t: Term) => (t.target ? `${t.verb}:${t.target}` : t.verb);

/**
 * @param demo     the dragged path, at least three samples
 * @param basis    which verbs to consider (wander is ignored)
 * @param worldAt  the world as it was at time t, with `me` at the sample
 * @param speed    the speed the verbs steer toward
 * @param body     the body that was dragged — its size sets every range-relative verb's reach
 */
export function fit(demo: Sample[], basis: Verb[], worldAt: (t: number, me: Body) => World, speed = 120, body: Partial<Body> = {}): FitResult {
  if (demo.length < 3) return { terms: [], residual: 1, explained: {}, reasoning: 'too short to fit' };

  // Velocities and accelerations by finite differences.
  const v: { x: number; y: number }[] = [];
  for (let i = 0; i < demo.length - 1; i++) {
    const dt = Math.max(1e-3, demo[i + 1].t - demo[i].t);
    v.push({ x: (demo[i + 1].x - demo[i].x) / dt, y: (demo[i + 1].y - demo[i].y) / dt });
  }
  const rows: { a: [number, number]; t: number; me: Body }[] = [];
  for (let i = 0; i < v.length - 1; i++) {
    const dt = Math.max(1e-3, demo[i + 1].t - demo[i].t);
    const a: [number, number] = [(v[i + 1].x - v[i].x) / dt, (v[i + 1].y - v[i].y) / dt];
    // The demonstrating body at its real size: flee's range, avoid's reach and
    // school's spacing are ratios of it, and a stand-in the size of a thumbnail
    // saw nothing within reach.
    const me: Body = { id: body.id ?? 'demo', name: body.name ?? 'demo', x: demo[i + 1].x, y: demo[i + 1].y, vx: v[i].x, vy: v[i].y, w: body.w ?? 20, h: body.h ?? 12, heading: Math.atan2(v[i].y, v[i].x), age: demo[i + 1].t - demo[0].t, origin: { x: demo[0].x, y: demo[0].y } };
    rows.push({ a, t: demo[i + 1].t, me });
  }

  // Candidate terms: every targeted verb against every name present, every untargeted verb once.
  const names = new Set<string>();
  for (const r of rows) for (const o of worldAt(r.t, r.me).others) names.add(o.name);
  // `home` is `seek` until the body gets close, so on a path that never
  // arrives the two are one column and a fit could split their weight
  // arbitrarily. Fit `seek`; the human can refine it to `home` by hand or by
  // word — the fit's job is the fewest verbs that explain the motion.
  const candidates: Term[] = [];
  for (const verb of basis) {
    if (verb === 'wander' || verb === 'avoid' || verb === 'consume' || verb === 'spawn' || verb === 'expire') continue;
    if (verb === 'home' && basis.includes('seek')) continue;
    if (TARGETED.has(verb)) for (const n of names) candidates.push({ verb, target: n, weight: 1 });
    else candidates.push({ verb, weight: 1 });
  }
  if (!candidates.length) return { terms: [], residual: 1, explained: {}, reasoning: 'no verb explains this motion' };

  // Design matrix: each candidate's force (weight 1) at each row.
  const F = rows.map((r) => candidates.map((c) => { const f = force(c, worldAt(r.t, r.me), speed); return [f.fx, f.fy] as [number, number]; }));
  const target = rows.map((r) => r.a);
  const norm = Math.sqrt(target.reduce((s, a) => s + a[0] * a[0] + a[1] * a[1], 0)) || 1;

  const residualOf = (w: number[]) => {
    let s = 0;
    for (let i = 0; i < rows.length; i++) {
      let px = 0, py = 0;
      for (let j = 0; j < w.length; j++) { px += F[i][j][0] * w[j]; py += F[i][j][1] * w[j]; }
      s += (px - target[i][0]) ** 2 + (py - target[i][1]) ** 2;
    }
    return Math.sqrt(s) / norm;
  };

  // Non-negative least squares with an L1 penalty, by coordinate descent on
  // the Gram matrix: each weight is minimised exactly in turn (soft-
  // thresholded, clamped at zero), which converges fast even when two
  // columns are correlated — as seek and flee are, both carrying the body's
  // own velocity. `mask` restricts the fit to a support (the relaxed refit).
  const k = candidates.length;
  const G: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const bvec = new Array(k).fill(0);
  for (let i = 0; i < rows.length; i++) {
    for (let p = 0; p < k; p++) {
      bvec[p] += F[i][p][0] * target[i][0] + F[i][p][1] * target[i][1];
      for (let q = p; q < k; q++) {
        const v = F[i][p][0] * F[i][q][0] + F[i][p][1] * F[i][q][1];
        G[p][q] += v; if (q !== p) G[q][p] += v;
      }
    }
  }
  const solve = (lambda: number, mask?: boolean[]) => {
    const w = new Array(k).fill(0);
    const shrink = lambda * norm * norm;
    for (let sweep = 0; sweep < 400; sweep++) {
      let moved = 0;
      for (let j = 0; j < k; j++) {
        if (mask && !mask[j]) { w[j] = 0; continue; }
        if (G[j][j] <= 1e-12) continue;
        let r = bvec[j];
        for (let i = 0; i < k; i++) if (i !== j) r -= G[j][i] * w[i];
        const next = Math.max(0, (r - shrink) / G[j][j]);
        moved = Math.max(moved, Math.abs(next - w[j]));
        w[j] = next;
      }
      if (moved < 1e-9) break;
    }
    return w;
  };

  const sweep = [0, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3];
  const significant = (w: number[]) => { const m = Math.max(...w, 1e-9); return w.filter((x) => x > 0.05 && x > m * 0.1).length; };
  const fits = sweep.map((l) => { const w = solve(l); return { w, residual: residualOf(w), count: significant(w) }; });
  const best = Math.min(...fits.map((f) => f.residual));
  const sparse = fits.filter((f) => f.residual <= best * 1.1 + 1e-9).sort((a, b) => a.count - b.count || a.residual - b.residual)[0];
  // The penalty picks WHICH verbs; it also shrinks their weights, hardest on
  // a verb that acted for only part of the path. So refit the chosen support
  // with no penalty: the verbs the sweep chose, at the weights the path says.
  const mask = sparse.w.map((x) => x > 0.05 && x > Math.max(...sparse.w, 1e-9) * 0.1);
  const refit = solve(0, mask);
  const chosen = { w: refit, residual: residualOf(refit), count: significant(refit) };

  const terms: Term[] = [];
  const explained: Record<string, number> = {};
  let totalForce = 0;
  const forces = candidates.map((_, j) => Math.sqrt(F.reduce((s, row) => s + (row[j][0] * chosen.w[j]) ** 2 + (row[j][1] * chosen.w[j]) ** 2, 0)));
  for (const f of forces) totalForce += f;
  const maxW = Math.max(...chosen.w, 1e-9);
  candidates.forEach((c, j) => {
    if (chosen.w[j] <= 0.05 || chosen.w[j] <= maxW * 0.1) return;
    const share = totalForce ? forces[j] / totalForce : 0;
    const t: Term = { ...c, weight: Math.round(chosen.w[j] * 100) / 100, reasoning: `explains ${Math.round(share * 100)}% of what was shown` };
    terms.push(t);
    explained[key(t)] = share;
  });
  terms.sort((a, b) => b.weight - a.weight);
  const missing = Math.round(chosen.residual * 100);
  return {
    terms,
    residual: chosen.residual,
    explained,
    reasoning: terms.length
      ? `${terms.map((t) => `${t.verb}${t.target ? ' ' + t.target : ''} ${t.weight}`).join(', ')}; ${missing}% of the motion is unexplained${missing > 35 ? ' — something is missing' : ''}`
      : 'no verb explains this motion',
  };
}
