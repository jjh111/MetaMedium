// score.mjs — precision and recall of predicted spans against hand labels.
//
// Pure. Two ways of matching, both reported:
//
//   strict   same type, same start, same end. "Top to waist 20" is not "Top to waist".
//   overlap  same type and at least one character shared, one-to-one. It says
//            whether the seat pointed at the right place, which is most of what
//            a candidate for `decide` needs.
//
// A prediction that matches no label but lies wholly inside an IGNORE region
// (a judgment call the fixture names, with its reason) is neither credited nor
// counted wrong. An ignore region is never required.

/**
 * @typedef {{ label: string, text: string, start: number, end: number }} Gold
 * @typedef {{ text: string, start: number, end: number, why?: string }} Ignore
 * @typedef {{ label: string, text: string, start: number, end: number, score?: number }} Predicted
 * @typedef {{ id: string, text: string, spans: Gold[], ignore?: Ignore[] }} Item
 */

const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const inside = (p, r) => p.start >= r.start && p.end <= r.end;
const shared = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

/**
 * Match one item's predictions to its labels.
 *
 * @param {Item} item
 * @param {Predicted[]} predicted
 * @param {'strict' | 'overlap'} mode
 */
export function matchItem(item, predicted, mode = 'strict') {
  const gold = item.spans;
  const used = new Set();
  const tp = [];
  const fp = [];
  const ignored = [];
  // Strongest first, so a confident exact span claims its label before a weak
  // overlapping one does.
  const order = [...predicted].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const p of order) {
    let hit = -1;
    if (mode === 'strict') {
      hit = gold.findIndex((g, i) => !used.has(i) && g.label === p.label && g.start === p.start && g.end === p.end);
    } else {
      let best = 0;
      gold.forEach((g, i) => {
        if (used.has(i) || g.label !== p.label || !overlaps(g, p)) return;
        const n = shared(g, p);
        if (n > best) (best = n), (hit = i);
      });
    }
    if (hit >= 0) {
      used.add(hit);
      tp.push({ predicted: p, gold: gold[hit] });
    } else if ((item.ignore ?? []).some((r) => inside(p, r))) {
      ignored.push(p);
    } else {
      fp.push(p);
    }
  }
  const fn = gold.filter((_, i) => !used.has(i));
  return { tp, fp, fn, ignored };
}

const ratio = (a, b) => (b === 0 ? null : a / b);

function tally(counts) {
  const precision = ratio(counts.tp, counts.tp + counts.fp);
  const recall = ratio(counts.tp, counts.tp + counts.fn);
  const f1 = precision === null || recall === null || precision + recall === 0 ? null : (2 * precision * recall) / (precision + recall);
  return { ...counts, precision, recall, f1 };
}

/**
 * Score a set of items.
 *
 * @param {Item[]} items
 * @param {Map<string, Predicted[]> | Record<string, Predicted[]>} predictions  by item id
 * @param {{ mode?: 'strict' | 'overlap', types?: string[] }} [o]
 */
export function scoreItems(items, predictions, o = {}) {
  const mode = o.mode ?? 'strict';
  const get = (id) => (predictions instanceof Map ? predictions.get(id) : predictions[id]) ?? [];
  const types = o.types ?? [...new Set(items.flatMap((i) => i.spans.map((s) => s.label)))];
  const byType = Object.fromEntries(types.map((t) => [t, { tp: 0, fp: 0, fn: 0 }]));
  const all = { tp: 0, fp: 0, fn: 0 };
  const errors = [];
  let ignored = 0;
  for (const item of items) {
    const m = matchItem(item, get(item.id), mode);
    ignored += m.ignored.length;
    for (const { gold } of m.tp) {
      all.tp++;
      (byType[gold.label] ??= { tp: 0, fp: 0, fn: 0 }).tp++;
    }
    for (const p of m.fp) {
      all.fp++;
      (byType[p.label] ??= { tp: 0, fp: 0, fn: 0 }).fp++;
      errors.push({ item: item.id, kind: 'false positive', label: p.label, text: p.text, start: p.start, score: p.score });
    }
    for (const g of m.fn) {
      all.fn++;
      (byType[g.label] ??= { tp: 0, fp: 0, fn: 0 }).fn++;
      errors.push({ item: item.id, kind: 'missed', label: g.label, text: g.text, start: g.start });
    }
  }
  return {
    mode,
    overall: tally(all),
    byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, tally(v)])),
    ignored,
    errors,
  };
}
