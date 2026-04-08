// Lens Registry — MoE matching for data visualization
// Each lens votes on whether it can render a data type (0-1 confidence)

import type { Rect } from './types';

export interface LensRenderOptions {
  isDark: boolean;
  selected: boolean;
  source: string;
  descriptor?: string;
  meaning?: string;
  abstractionLevel: string;
  dataType: string;
}

export interface Lens {
  id: string;
  name: string;
  matches(dataType: string, data: unknown): number;
  render(ctx: CanvasRenderingContext2D, data: unknown, bounds: Rect, options: LensRenderOptions): void;
}

const registry: Lens[] = [];

export function registerLens(lens: Lens) {
  registry.push(lens);
}

export function matchLens(dataType: string, data: unknown): Lens {
  let best: Lens | null = null;
  let bestScore = -1;
  for (const lens of registry) {
    const score = lens.matches(dataType, data);
    if (score > bestScore) {
      bestScore = score;
      best = lens;
    }
  }
  return best!; // RawLens always matches at 0.01
}

export function allMatches(dataType: string, data: unknown): Array<{ lens: Lens; score: number }> {
  return registry
    .map(lens => ({ lens, score: lens.matches(dataType, data) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
