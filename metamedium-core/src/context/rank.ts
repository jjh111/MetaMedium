// Rank — the field's order with the context applied, and the steady top
// (V1-PLAN §2.2, B2). RED: the contract only — B1's order, nothing lifted,
// nothing held. The tests beside this file say what it must do.

import type { Context, Grounds } from '../tools/tool';
import { NO_CONTEXT } from '../tools/tool';
import type { Rankable, Uses } from '../tools/rank';
import { likelihoodOf } from '../tools/rank';

export const CONTEXT_LIFT_MAX = 1.25;
export const RECENT_SAME_TOOL = 0.5;
export const STEADY_MARGIN = 0.1;
export const STEADY_MS = 120_000;
export const AFFINITY: Readonly<Record<string, readonly string[]>> = {};

export function liftTargets(_kind: string): string[] {
  return [];
}
export interface RankItem extends Rankable {
  tool?: string;
  grounds?: Pick<Grounds, 'on' | 'confidence'> & { why?: string };
}
export type Ranked<T> = T & { likelihood: number; lift: number; score: number; because: string[]; steady?: boolean };
export function standsOn(_item: RankItem): Set<string> {
  return new Set();
}
export function liftOf(_item: RankItem, _ctx: Context = NO_CONTEXT): { factor: number; because: string[] } {
  return { factor: 1, because: [] };
}
export function canLift(_items: readonly RankItem[]): boolean {
  return false;
}
export interface RankOptions {
  uses?: Uses;
  usesHere?: Uses;
}
export function rank<T extends RankItem>(items: readonly T[], _ctx: Context = NO_CONTEXT, opts: RankOptions = {}): Ranked<T>[] {
  const uses = opts.uses ?? {};
  return items
    .map((item) => { const likelihood = likelihoodOf(item, uses); return { ...item, likelihood, lift: 1, score: likelihood, because: [] as string[] } as Ranked<T>; })
    .sort((a, b) => b.score - a.score);
}
export interface HeldTop {
  key: string;
  at: number;
}
export interface SteadyOptions<T extends RankItem> {
  margin?: number;
  eligible?: (item: Ranked<T>) => boolean;
  now?: number;
}
export function steadyTop<T extends RankItem>(ranked: readonly Ranked<T>[], _held: HeldTop | string | null | undefined, _opts: SteadyOptions<T> = {}): Ranked<T>[] {
  return ranked.slice();
}
export function topOf<T extends RankItem>(ranked: readonly Ranked<T>[], eligible: (item: Ranked<T>) => boolean = () => true): Ranked<T> | undefined {
  return ranked.find((x) => eligible(x));
}
