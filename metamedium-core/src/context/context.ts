// Context — conceptual adjacency, read from the board and the log (V1-PLAN
// §2.2, B2). RED: the contract only — every context is empty, so every scope
// ranks exactly as B1 ranked it. The tests beside this file say what it must do.

import type { Bounds, Point } from '../types';
import type { SessionEvent, SessionState } from '../session/session';
import type { Context, ScopeReading } from '../tools/tool';

export type { Context } from '../tools/tool';
export { NO_CONTEXT } from '../tools/tool';

export const CONTEXT_FADE = 2.5;
export const RECENT_MS = 120_000;
export const NEIGHBOURHOOD_MAX = 80;
export const RECENT_EVENTS_MAX = 400;

export interface ContextSource {
  getState(): SessionState;
  read(ids: string[]): ScopeReading;
  getEvents(): readonly SessionEvent[];
}
export interface ContextOptions {
  now?: number;
}
export interface ContextNotation { id: string; name: string; weight: number; confidence: number; nearness: number; summary: string; reason: string; anchor: string }
export interface ContextConcept { name: string; weight: number; confidence: number; nearness: number; reason: string; anchor: string }
export interface ContextAct { tool: string; offer: string; at: number; weight: number; reason: string }
export interface ReadContext extends Context {
  notations: ContextNotation[];
  concepts: ContextConcept[];
  recent: ContextAct[];
  kind: string | null;
  key: string | null;
  at: number;
}

export function nearnessOf(_a: Bounds, _b: Bounds): number {
  return 0;
}
export function pointNearnessOf(_p: Point, _b: Bounds): number {
  return 0;
}
export const conceptNoun = (name: string): string => 'a ' + name;
export function isEmptyContext(ctx: Context | null | undefined): boolean {
  return !ctx || (!ctx.notations.length && !ctx.concepts.length && !ctx.recent.length);
}
export function contextAt(board: ContextSource, at: readonly string[] | Point, opts: ContextOptions = {}): ReadContext {
  const scopeIds = Array.isArray(at) ? [...(at as readonly string[])] : [];
  const events = board.getEvents();
  return { scopeIds, notations: [], concepts: [], recent: [], kind: null, key: null, at: opts.now ?? (events.length ? events[events.length - 1].at : 0) };
}
export function describeContext(_ctx: Context): string[] {
  return [];
}
