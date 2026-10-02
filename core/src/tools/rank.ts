// The field's order: the reading first, then learned use (V1-PLAN B1; the
// palette's `baseLikelihood`, moved here so the order is asked in Node).
//
// Two rules decide it, and nothing else:
//
//   - **The reading first.** Each item carries a base likelihood: what it
//     stands on sets it — a definition you named, matched again (`known`),
//     beats your own handwriting (`written`), which beats what a model read
//     (`proposed`), which beats a concept the canvas measured; a generic verb
//     states its own. Asking a model costs a little (`MODEL_DISCOUNT`): the
//     canvas answers first.
//   - **Then learned use.** How often this device took an item lifts the
//     GENERIC ones toward the hand that uses them, up to a bound
//     (`USE_LIFT_MAX`). An item specific to these marks — standing on
//     something named, written or read HERE — is never lifted, and nothing
//     learned outranks it.
//
// The use counts are the device's (`localStorage` in the surface): they are
// handed in, never read here. Ties keep the order the items came in — the
// registry's order, which is the order the field always built them in.
//
// Readings (what this IS) are not offers, but the field ranks them in the same
// list so the line under it and the reader agree on what leads; they carry a
// `base` and `grounds` exactly as offers do (`baseOn`).

import type { Grounds } from './tool';

/** What asking a model costs an item, against one the canvas does itself. */
export const MODEL_DISCOUNT = 0.85;
/** The most learned use lifts a generic item: a quarter again. */
export const USE_LIFT_MAX = 1.25;
/** How fast use lifts: 1 + this × ln(1 + uses). */
export const USE_LIFT_RATE = 0.2;

/** What an item stands on, when that makes it specific to these marks. */
export const SPECIFIC_GROUNDS: ReadonlySet<string> = new Set(['known', 'written', 'proposed']);

/** How many times this device took each item, by key. */
export type Uses = Readonly<Record<string, number>>;

/** What ranking needs of an item: an offer, or a reading carrying the same fields. */
export interface Rankable {
  key: string;
  base: number;
  asks?: 'seat' | 'model';
  grounds?: Pick<Grounds, 'on' | 'confidence'>;
}

/**
 * The base likelihood of an item standing on a reading of these marks:
 * `known` 1.4, `written` 1.35, `proposed` 1.2 + 0.1c, a notation — the whole
 * drawing read as a flowchart or a class diagram — 0.75 + 0.4c, `clean`
 * 0.6 + 0.35c, and a concept — a row, a flow, writing — 0.5 + 0.45c, for its
 * own reading and for each conversion it affords. A notation is a reading of
 * what a drawing IS, made of the concepts it holds, so from the notations'
 * floor up it stands with the firmest of them and under what a model read.
 */
export function baseOn(grounds: Pick<Grounds, 'on' | 'confidence'>): number {
  const c = grounds.confidence || 0;
  switch (grounds.on) {
    case 'known': return 1.4;
    case 'written': return 1.35;
    case 'proposed': return 1.2 + 0.1 * c;
    case 'clean': return 0.6 + 0.35 * c;
    case 'notation': return 0.75 + 0.4 * c;
    default: return 0.5 + 0.45 * c;
  }
}

/** An item specific to these marks: learned use never lifts it, and nothing learned outranks it. */
export function isSpecific(item: Pick<Rankable, 'grounds'>): boolean {
  return !!item.grounds && SPECIFIC_GROUNDS.has(item.grounds.on);
}

/** How much learned use lifts a generic item taken `n` times: 1 when never, up to `USE_LIFT_MAX`. */
export function useLift(n: number): number {
  return Math.min(USE_LIFT_MAX, 1 + USE_LIFT_RATE * Math.log1p(Math.max(0, n || 0)));
}

/** An item's likelihood: its base, less for asking a model, lifted by use when it is generic. */
export function likelihoodOf(item: Rankable, uses: Uses = {}): number {
  let l = item.base;
  if (item.asks === 'model') l *= MODEL_DISCOUNT;
  return isSpecific(item) ? l : l * useLift(uses[item.key] || 0);
}

/**
 * The items, most likely first, each with its likelihood. Stable: items of
 * equal likelihood keep the order they came in. Pure — the items are copied,
 * never changed.
 */
export function rankOffers<T extends Rankable>(items: readonly T[], uses: Uses = {}): (T & { likelihood: number })[] {
  return items
    .map((item) => ({ ...item, likelihood: likelihoodOf(item, uses) }))
    .sort((a, b) => b.likelihood - a.likelihood);
}
