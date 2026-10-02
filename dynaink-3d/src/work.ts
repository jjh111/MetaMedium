// ===== work =====
// A model at work is shown WHERE IT WORKS (SHARD-3D-PLAN §8; the canvas's
// `withWork` in `Demos/surface/04-models.js`, ported).
//
// Every call to a model is registered while it runs and drawn as a breathing
// dot with the model's name and its task, above the solid it is about — and in
// the status line. It leaves when the call ends, however it ends.
//
// Two things the canvas learned and this keeps:
//
//   * **After a few seconds the label carries the elapsed time, after thirty it
//     says *Esc stops it*.** A spinner that says nothing about how long it has
//     been is a spinner nobody trusts.
//   * **Esc with nothing held stops every call in flight**, through the
//     transport's own `AbortSignal` — which core's `complete` already honours
//     and reports as `cancelled` rather than as a failure.
//
// The dot is `--sig-model`, the token that means *a model contributed this*.
// Colour is signal, not decoration.

import type { Point } from 'metamedium-core';
import type { Vec3 } from './plane';

/** When the label starts carrying the elapsed time. */
export const ELAPSED_AFTER_MS = 4000;
/** When it starts saying how to stop. */
export const SAY_ESC_AFTER_MS = 30000;

export interface WorkItem {
  key: string;
  label: string;
  /** Where it stands: the solid it is about, in world space. Null puts it in the status line only. */
  at: Vec3 | null;
  started: number;
  controller: AbortController;
}

export interface Work {
  /** Register a call. The signal it returns is the one to hand the transport. */
  start(key: string, label: string, at: Vec3 | null): AbortSignal;
  end(key: string): void;
  /** Stop everything in flight. Returns how many were stopped. */
  cancelAll(): number;
  running(): WorkItem[];
  /** The one sentence for the status line, or null when nothing is running. */
  sentence(): string | null;
  /** Re-place the labels against the camera as it stands. */
  place(): void;
}

export function createWork(host: HTMLElement, project: (world: Vec3) => Point, onTick: () => void): Work {
  const live = new Map<string, { item: WorkItem; el: HTMLElement }>();
  let timer: ReturnType<typeof setInterval> | null = null;

  /** Scheduled by the work, not by a background interval that ticks forever. */
  function beat() {
    if (!live.size) {
      if (timer) clearInterval(timer);
      timer = null;
      return;
    }
    if (!timer) timer = setInterval(() => { paint(); onTick(); }, 1000);
  }

  function textFor(item: WorkItem): string {
    const ms = Date.now() - item.started;
    if (ms >= SAY_ESC_AFTER_MS) return `${item.label} · ${Math.round(ms / 1000)}s · Esc stops it`;
    if (ms >= ELAPSED_AFTER_MS) return `${item.label} · ${Math.round(ms / 1000)}s`;
    return item.label;
  }

  function paint() {
    live.forEach(({ item, el }) => {
      const dot = el.querySelector('.workText');
      if (dot) dot.textContent = textFor(item);
    });
    place();
  }

  function place() {
    const rect = host.getBoundingClientRect();
    live.forEach(({ item, el }) => {
      if (!item.at) return;
      const p = project(item.at);
      el.style.left = `${p.x - rect.left}px`;
      el.style.top = `${p.y - rect.top}px`;
    });
  }

  function start(key: string, label: string, at: Vec3 | null): AbortSignal {
    end(key);
    const controller = new AbortController();
    const item: WorkItem = { key, label, at, started: Date.now(), controller };
    const el = document.createElement('div');
    el.className = 'work';
    el.innerHTML = '<i class="workDot"></i><span class="workText"></span>';
    (el.querySelector('.workText') as HTMLElement).textContent = label;
    if (!at) el.classList.add('workLoose');
    host.appendChild(el);
    live.set(key, { item, el });
    place();
    beat();
    return controller.signal;
  }

  function end(key: string) {
    const held = live.get(key);
    if (!held) return;
    held.el.remove();
    live.delete(key);
    beat();
  }

  function cancelAll(): number {
    const n = live.size;
    live.forEach(({ item }) => item.controller.abort());
    [...live.keys()].forEach(end);
    return n;
  }

  return {
    start,
    end,
    cancelAll,
    running: () => [...live.values()].map((v) => v.item),
    sentence: () => {
      const items = [...live.values()].map((v) => v.item);
      if (!items.length) return null;
      return items.map((i) => textFor(i)).join(' · ');
    },
    place,
  };
}
