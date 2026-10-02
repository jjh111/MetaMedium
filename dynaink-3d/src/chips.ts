// ===== chips =====
// A reading, standing beside the mark it is about.
//
// §2.1's runner-up, made tappable: *top of artifact:7 0.82 · view 0.41*, in
// screen space beside the stroke, and a tap FLIPS the stroke to the runner-up.
// It leaves after a few seconds or on the next stroke, the way the canvas's
// snap offer does (v10 F4: the offer stands for a moment, not forever) — an
// offer that stuck to every mark that had a close second would be wallpaper.
//
// An HTML overlay rather than a sprite: it is chrome, it must read at any
// zoom, and it is built from the same `chip` component the reference surface
// uses (`ui.ts`, ported not forked).

import type { Point } from 'metamedium-core';
import type { Vec3 } from './plane';
import { chip } from './ui';

/** The offer stands for a moment, not forever. */
export const CHIP_MS = 7000;

export interface ChipOffer {
  /** The mark it is about — one chip per mark, and a second replaces the first. */
  id: string;
  /** Where in the world it stands beside. */
  at: Vec3;
  text: string;
  why: string;
  /**
   * Which kind of offer this is. Two may stand beside one mark — the runner-up
   * PLANE (P1) and what the LIBRARY says it could be (P6) — and they are about
   * different things, so they are two chips under two ids rather than one
   * sentence about both.
   */
  cls?: string;
  onTap(): void;
}

export interface Chips {
  show(offer: ChipOffer): void;
  drop(id: string): void;
  clear(): void;
  /** What the chip beside a mark says right now, or null when none stands. */
  textFor(id: string): string | null;
  /** Re-place every chip against the camera as it stands. */
  place(): void;
}

export function createChips(host: HTMLElement, project: (world: Vec3) => Point): Chips {
  const live = new Map<string, { el: HTMLElement; at: Vec3; timer: ReturnType<typeof setTimeout> }>();

  function drop(id: string) {
    const c = live.get(id);
    if (!c) return;
    clearTimeout(c.timer);
    c.el.remove();
    live.delete(id);
  }

  function clear() {
    for (const id of [...live.keys()]) drop(id);
  }

  function place() {
    const rect = host.getBoundingClientRect();
    live.forEach((c) => {
      const p = project(c.at);
      c.el.style.left = `${p.x - rect.left}px`;
      c.el.style.top = `${p.y - rect.top}px`;
    });
  }

  function show(offer: ChipOffer) {
    drop(offer.id);
    const el = chip(offer.text, { cls: offer.cls ?? 'planeChip', why: offer.why, onclick: offer.onTap });
    el.style.position = 'absolute';
    host.appendChild(el);
    const timer = setTimeout(() => drop(offer.id), CHIP_MS);
    live.set(offer.id, { el, at: offer.at, timer });
    place();
  }

  return { show, drop, clear, place, textFor: (id) => live.get(id)?.el.textContent ?? null };
}
